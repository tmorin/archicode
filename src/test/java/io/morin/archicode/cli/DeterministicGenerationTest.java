package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The same workspace gives the same files, byte for byte, wherever it lives and however it is laid out.
 *
 * <p>The workspace is invented (a portal, an identity provider deployed on two nodes, boxes with several
 * stereotypes). It is written twice: in two folders with different names, the manifests under different names, the
 * elements of a list, the relationships of an element and the tags of an element in the reverse order, and a facet
 * that drops some relationships. Everything the author writes in a given order stays in that order: the qualifiers of
 * an element and the words of {@code rendering-stereotypes} are the order of its stereotypes, and they are the same in
 * both layouts.
 *
 * <p>What this test cannot vary is the JVM: the identity hash of an enum, which orders a {@code HashSet} of items or of
 * links, is the same during the whole test. {@code StableOrderTest} covers that, by giving the renderer the same items
 * and links in every order.
 */
@QuarkusTest
class DeterministicGenerationTest {

    @Inject
    GenerateViewsCommand generateViewsCommand;

    private static final String WORKSPACE = """
    styles:
      by-tags:
        external:
          background-color: "lightgray"
        new:
          background-color: "#DAF2E6"
          line-color: "#2A6A4B"
        changed:
          background-color: "#FAECDD"
          line-color: "#A2501C"
      by-qualifiers:
        SAML:
          round-corner: 20
    settings:
      facets:
        customs:
          - name: "audited"
            actions:
              - operator: "REMOVE"
                json-path: "$..relationships[?(@.tags['audited'] == 'yes')]"
          - name: "quiet"
            hide-unlinked: true
            actions:
              - operator: "REMOVE"
                json-path: "$.technology..relationships[*]"
    """;

    private static String lines(int indent, String... lines) {
        return Stream.of(lines)
            .map(line -> " ".repeat(indent) + line + "\n")
            .collect(Collectors.joining());
    }

    private static String inOrder(boolean reversed, List<String> blocks) {
        val ordered = new ArrayList<>(blocks);
        if (reversed) {
            Collections.reverse(ordered);
        }
        return String.join("", ordered);
    }

    /** A relationship, as an item of the list of an element that is itself an item of a list of {@code elements}. */
    private static String relationship(String destination, String label, String qualifier, String... tags) {
        return (
            lines(8, "- destination: \"%s\"".formatted(destination), "  label: \"%s\"".formatted(label)) +
            (qualifier == null ? "" : lines(10, "qualifiers:", "  - \"%s\"".formatted(qualifier))) +
            (tags.length == 0 ? "" : lines(10, "tags:") + lines(12, tags))
        );
    }

    /**
     * An element of a list of {@code elements}. The qualifiers and the words of {@code rendering-stereotypes} keep their
     * order, because it is the order of the stereotypes of the box; the tags and the relationships may come in any order.
     */
    private static String element(
        boolean reversed,
        String kind,
        String id,
        List<String> qualifiers,
        String stereotypes,
        List<String> relationships,
        String... more
    ) {
        val buf = new StringBuilder(
            lines(
                4,
                "- kind: \"%s\"".formatted(kind),
                "  id: \"%s\"".formatted(id),
                "  name: \"Name of %s\"".formatted(id)
            )
        );
        if (!qualifiers.isEmpty()) {
            buf.append(lines(6, "qualifiers:"));
            qualifiers.forEach(q -> buf.append(lines(8, "- \"%s\"".formatted(q))));
        }
        val tags = new ArrayList<>(
            List.of("rendering-stereotypes: \"%s\"".formatted(stereotypes), "owner: \"someone\"")
        );
        if (reversed) {
            Collections.reverse(tags);
        }
        buf.append(lines(6, "tags:")).append(lines(8, tags.toArray(String[]::new)));
        if (!relationships.isEmpty()) {
            buf.append(lines(6, "relationships:")).append(inOrder(reversed, relationships));
        }
        buf.append(String.join("", more));
        return buf.toString();
    }

    /** A manifest: its header and the {@code elements} of its content, which may come in any order. */
    private record Manifest(String name, String kind, String parent, List<String> elements) {
        String render(boolean reversed) {
            return (
                lines(0, "header:", "  kind: \"archicode.morin.io/%s\"".formatted(kind), "  version: \"1\"") +
                (parent == null ? "" : lines(2, "parent: \"%s\"".formatted(parent))) +
                lines(
                    0,
                    "content:",
                    "  id: \"%s\"".formatted(name),
                    "  name: \"Name of %s\"".formatted(name),
                    "  elements:"
                ) +
                inOrder(reversed, elements)
            );
        }
    }

    private static List<Manifest> manifests(boolean reversed) {
        val store = new Manifest(
            "store",
            "solution",
            null,
            List.of(
                element(reversed, "system", "idp", List.of("SAML"), "external changed", List.of()),
                element(reversed, "system", "audit", List.of(), "external", List.of())
            )
        );
        val front = new Manifest(
            "front",
            "system",
            "store",
            List.of(
                element(
                    reversed,
                    "container",
                    "ui",
                    List.of("Angular", "Nginx"),
                    "new external",
                    List.of(
                        relationship("store.front.api", "calls", "REST"),
                        relationship("store.front.api", "calls", "gRPC")
                    )
                ),
                element(
                    reversed,
                    "container",
                    "api",
                    List.of("Spring Boot", "PostgreSQL"),
                    "changed new",
                    List.of(
                        relationship("store.idp", "renews passes from", "SOAP"),
                        relationship("store.audit", "publishes events to", "AMQP", "audited: \"yes\""),
                        relationship("store.front.session", "stores sessions in", null)
                    )
                ),
                element(reversed, "container", "session", List.of("Redis"), "external", List.of())
            )
        );
        val dev = new Manifest(
            "dev",
            "environment",
            null,
            List.of(
                node("north", "store.idp"),
                node("south", "store.idp"),
                node("aks", "store.front.api", "store.front.ui", "store.front.session")
            )
        );
        return List.of(store, front, dev);
    }

    private static String node(String id, String... applications) {
        return (
            lines(
                4,
                "- kind: \"node\"",
                "  id: \"%s\"".formatted(id),
                "  name: \"Node %s\"".formatted(id),
                "  applications:"
            ) +
            lines(
                8,
                Stream.of(applications)
                    .map(a -> "- \"" + a + "\"")
                    .toArray(String[]::new)
            )
        );
    }

    @SneakyThrows
    private void write(Path folder, boolean reversed) {
        Files.writeString(folder.resolve(".archicode.yaml"), WORKSPACE);
        Files.createDirectories(folder.resolve("manifests"));
        val manifests = manifests(reversed);
        for (int i = 0; i < manifests.size(); i++) {
            val manifest = manifests.get(i);
            // the names of the files, and so the order a file system lists them in, are not the same
            val name = reversed
                ? "z%d.%s.yaml".formatted(manifests.size() - i, manifest.name())
                : "app.%s.yaml".formatted(manifest.name());
            Files.writeString(folder.resolve("manifests").resolve(name), manifest.render(reversed));
        }
    }

    @SneakyThrows
    private void generate(Path folder) {
        val archiCode = new ArchiCode();
        archiCode.workspaceFilePath = folder.resolve(".archicode.yaml");
        val views = new ViewsGroup();
        views.archiCode = archiCode;
        generateViewsCommand.viewsGroup = views;
        generateViewsCommand.rendererName = "plantuml";
        generateViewsCommand.run();
    }

    @SneakyThrows
    private static List<Path> views(Path folder) {
        try (Stream<Path> files = Files.walk(folder)) {
            return files
                .filter(Files::isRegularFile)
                .map(folder::relativize)
                .filter(p -> p.toString().endsWith(".puml"))
                .sorted()
                .toList();
        }
    }

    @SneakyThrows
    @Test
    void shouldGenerateTheSameFilesWhateverTheOrderTheWorkspaceIsDeclaredIn(@TempDir Path temp) {
        val forward = Files.createDirectories(temp.resolve("forward"));
        val backward = Files.createDirectories(temp.resolve("another").resolve("place").resolve("backward"));
        write(forward, false);
        write(backward, true);

        generate(forward);
        generate(backward);
        // and again, in the folder where the views are already
        generate(forward);

        val expected = views(forward);
        assertTrue(expected.size() > 30, "the workspace should give many views: " + expected.size());
        assertTrue(
            expected.stream().anyMatch(p -> p.toString().startsWith("views-audited")),
            "the views of the facets are part of it"
        );
        assertEquals(expected, views(backward), "the same files are generated");
        for (val file : expected) {
            assertEquals(
                Files.readString(forward.resolve(file)),
                Files.readString(backward.resolve(file)),
                "the file " + file + " differs"
            );
        }

        // the check is not empty: boxes with several stereotypes (last first), the same application on two nodes
        val deep = Files.readString(
            forward.resolve("views").resolve("plantuml").resolve("technology").resolve("dev-deep.puml")
        );
        assertTrue(deep.contains("<<new>> <<changed>> <<PostgreSQL>> <<Spring Boot>> <<container>>"), deep);
        // the facet that keeps the calls between applications: the caller has a link to each node of the provider
        val quiet = Files.readString(
            forward.resolve("views-quiet").resolve("plantuml").resolve("technology").resolve("dev-deep.puml")
        );
        assertTrue(quiet.contains("--> north_store_idp") && quiet.contains("--> south_store_idp"), quiet);
    }
}
