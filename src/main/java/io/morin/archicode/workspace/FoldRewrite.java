package io.morin.archicode.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import io.morin.archicode.manifest.Manifest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.val;

/**
 * The manifests of a workspace after a plateau is folded into the plateau above it (wave 028, run 0208, issue #65). It is
 * pure: it is given the {@link Fold.Plan} and the manifests the plan names, read by the caller, and returns the manifests to
 * write and the files to delete. It reads and writes no file, knows no command line and changes none of its arguments.
 * <p>
 * It makes five edits and nothing else: the header of each file of {@code plan.headers()} names the plateau above; the
 * manifest of the plateau above overrides the parent of the folded plateau (or nothing when that is the root); its patches
 * become the patches of the folded plateau followed by its own; each {@code replaces} entry of the plan is carried out where
 * it lives; the manifest of the folded plateau is deleted.
 */
public final class FoldRewrite {

    private FoldRewrite() {}

    /**
     * The result of the rewrite.
     *
     * @param written the manifests to write, by their path relative to the workspace folder: the files of
     *                {@code plan.rewritten()}
     * @param deleted the files to delete, relative to the workspace folder: {@code plan.deleted()}
     */
    public record Rewritten(Map<String, Manifest> written, List<String> deleted) {}

    /**
     * Rewrites the manifests the plan names.
     *
     * @param plan      what the fold does
     * @param manifests the manifests of every file of {@code plan.rewritten()} and {@code plan.deleted()}, by path
     * @return the manifests to write and the files to delete
     */
    public static Rewritten apply(Fold.Plan plan, Map<String, Manifest> manifests) {
        val written = new LinkedHashMap<String, Manifest>();
        for (val path : plan.rewritten()) {
            val original = manifests.get(path);
            written.put(path, original.toBuilder().content(original.getContent().deepCopy()).build());
        }
        for (val path : plan.headers()) {
            val manifest = written.get(path);
            written.put(
                path,
                manifest.toBuilder().header(manifest.getHeader().toBuilder().plateau(plan.into()).build()).build()
            );
        }
        val above = plan.intoManifest() == null ? null : written.get(plan.intoManifest());
        val folded = plan.deleted().isEmpty() ? null : manifests.get(plan.deleted().get(0));
        val foldedPatches = folded == null ? 0 : patchesOf(folded.getContent()).size();
        for (val change : plan.replaces()) {
            if (change.where().startsWith("patch ")) {
                composePatch(above, change, patchNumber(change.where()) - 1);
            } else {
                composeElement(written.get(change.where()), change);
            }
        }
        if (above != null) {
            if ("baseline".equals(plan.newParent())) {
                above.getContent().remove("override");
            } else {
                above.getContent().put("override", plan.newParent());
            }
            if (folded != null && foldedPatches > 0) {
                val patches = JsonNodeFactory.instance.arrayNode();
                patchesOf(folded.getContent()).forEach(p -> patches.add(p.deepCopy()));
                patchesOf(above.getContent()).forEach(patches::add);
                above.getContent().set("patches", patches);
            }
        }
        return new Rewritten(written, List.copyOf(plan.deleted()));
    }

    private static int patchNumber(String where) {
        val digits = where.substring("patch ".length());
        return Integer.parseInt(digits.substring(0, digits.indexOf(' ')));
    }

    private static List<JsonNode> patchesOf(ObjectNode content) {
        val out = new ArrayList<JsonNode>();
        val patches = content.get("patches");
        if (patches != null && patches.isArray()) {
            patches.forEach(out::add);
        }
        return out;
    }

    private static void composePatch(Manifest above, Fold.ReplacesChange change, int index) {
        val patch = above.getContent().get("patches").get(index);
        val value = patch.get("value");
        val references = compose(value.isArray() ? texts(value) : List.of(value.asText()), change);
        val replaced =
            value.isTextual() && references.size() == 1 ? new TextNode(references.get(0)) : array(references);
        ((ObjectNode) patch).set("value", replaced);
    }

    private static void composeElement(Manifest manifest, Fold.ReplacesChange change) {
        val header = manifest.getHeader();
        val content = manifest.getContent();
        val prefix = header.getParent() == null ? "" : header.getParent() + ".";
        val element = find(content, prefix, change.element());
        if (element == null) {
            return;
        }
        val references = compose(texts(element.get("replaces")), change);
        if (references.isEmpty()) {
            element.remove("replaces");
        } else {
            element.set("replaces", array(references));
        }
    }

    private static ObjectNode find(ObjectNode node, String prefix, String reference) {
        val id = node.get("id");
        if (id == null) {
            return null;
        }
        val own = prefix + id.asText();
        if (own.equals(reference)) {
            return node;
        }
        val children = node.get("elements");
        if (children != null && children.isArray()) {
            for (val child : children) {
                if (child instanceof ObjectNode object) {
                    val found = find(object, own + ".", reference);
                    if (found != null) {
                        return found;
                    }
                }
            }
        }
        return null;
    }

    private static List<String> compose(List<String> entries, Fold.ReplacesChange change) {
        Set<String> out = new LinkedHashSet<>();
        for (val entry : entries) {
            if (change.from().contains(entry)) {
                out.addAll(change.to());
            } else {
                out.add(entry);
            }
        }
        return List.copyOf(out);
    }

    private static List<String> texts(JsonNode array) {
        val out = new ArrayList<String>();
        if (array != null) {
            array.forEach(n -> out.add(n.asText()));
        }
        return out;
    }

    private static ArrayNode array(List<String> values) {
        val out = JsonNodeFactory.instance.arrayNode();
        values.forEach(out::add);
        return out;
    }
}
