package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.util.List;
import lombok.val;

/**
 * A {@link Comparison} made by hand, from the elements a test names: the way to give a unit test a comparison without a
 * workspace and without the kernel. The counts are worked out from the elements.
 */
public final class ComparisonSketch {

    private final ObjectMapper mapper = new ObjectMapper();
    private final ArrayNode elements = mapper.createArrayNode();

    private ComparisonSketch() {}

    public static ComparisonSketch comparison() {
        return new ComparisonSketch();
    }

    /** An element of the union with its state ({@code new}, {@code changed}, {@code moved}, ...) and what it replaces. */
    public ComparisonSketch element(String layer, String reference, String change, String... replaces) {
        return element(layer, reference, change, List.of(), replaces);
    }

    public ComparisonSketch element(
        String layer,
        String reference,
        String change,
        List<String> natures,
        String... replaces
    ) {
        val node = elements.addObject();
        node.put("layer", layer);
        node.put("reference", reference);
        node.put("change", change);
        natures.forEach(node.putArray("natures")::add);
        if (natures.isEmpty()) {
            node.putArray("natures");
        }
        val replacing = node.putArray("replaces");
        for (val r : replaces) {
            replacing.add(r);
        }
        return this;
    }

    public Comparison build() {
        val answer = mapper.createObjectNode();
        answer.put("version", ViewpointKernel.CONTRACT_VERSION);
        answer.set("elements", elements);
        answer.putArray("relationships");
        answer.putArray("changes");
        answer.putArray("candidates");
        answer.putArray("warnings");
        val counts = answer.putObject("counts");
        val c = counts.putObject("elements");
        for (val word : List.of("new", "changed", "removed", "moved", "split", "merged")) {
            var n = 0;
            for (val e : elements) {
                if (word.equals(e.get("change").asText())) {
                    n++;
                }
            }
            c.put(word, n);
        }
        c.put("wording_only", 0);
        val r = counts.putObject("relationships");
        r.put("new", 0);
        r.put("changed", 0);
        r.put("removed", 0);
        return Comparison.of(answer);
    }
}
