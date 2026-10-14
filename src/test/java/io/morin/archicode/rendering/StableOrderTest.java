package io.morin.archicode.rendering;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ResourceFixtures;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * A view is written in an order of its own, whatever the order its items and its links come in.
 *
 * <p>The items and the links of a viewpoint are kept in sets, and the order of a set that is not a linked one is the
 * business of the JVM (the hash of an enum is the identity hash of the constant, which is not the same from one run
 * to the next). A sort that leaves two items or two links tied leaves them in that order. These tests hand the same
 * items and links to the renderer in every order, which stands for the order another JVM would give them.
 */
@QuarkusTest
class StableOrderTest {

    @Inject
    ViewRendererServiceRepository viewRendererServiceRepository;

    @Inject
    WorkspaceFactory workspaceFactory;

    /**
     * An application deployed on two nodes is two items with the same reference, and what calls it has a link to
     * each, with the same label.
     */
    private record Scene(List<Item> items, List<Link> links) {}

    private static Scene deployedTwice() {
        val idp = Container.builder()
            .id("idp")
            .qualifiers(new LinkedHashSet<>(List.of("SAML")))
            .build();
        val backend = Container.builder().id("backend").build();
        val relationship = Relationship.builder().destination("idp").label("renews passes from").build();

        val caller = item("pro_backend", "app:backend", backend);
        val onFirstNode = item("first_idp", "app:idp", idp);
        val onSecondNode = item("second_idp", "app:idp", idp);
        val onThirdNode = item("third_idp", "app:idp", idp);

        val links = new ArrayList<Link>();
        for (val target : List.of(onFirstNode, onSecondNode, onThirdNode)) {
            links.add(
                Link.builder()
                    .from(caller)
                    .to(target)
                    .label("renews passes from")
                    .qualifiers(new LinkedHashSet<>(List.of("SOAP")))
                    .relationship(relationship)
                    .build()
            );
        }
        // the same two ends and the same label, told apart by their qualifiers only
        for (val qualifier : List.of("HTTPS", "gRPC")) {
            links.add(
                Link.builder()
                    .from(caller)
                    .to(onFirstNode)
                    .label("renews passes from")
                    .qualifiers(new LinkedHashSet<>(List.of(qualifier)))
                    .relationship(relationship)
                    .build()
            );
        }
        return new Scene(List.of(caller, onFirstNode, onSecondNode, onThirdNode), links);
    }

    private static Item item(String id, String reference, io.morin.archicode.resource.element.Element element) {
        return Item.builder()
            .itemId(id)
            .reference(reference)
            .element(element)
            .kind(Item.Kind.CONTAINER)
            .stereotypes(List.of("SAML"))
            .build();
    }

    private static <T> void permutations(List<T> rest, List<T> chosen, List<List<T>> into) {
        if (rest.isEmpty()) {
            into.add(List.copyOf(chosen));
            return;
        }
        for (int i = 0; i < rest.size(); i++) {
            val remaining = new ArrayList<>(rest);
            chosen.add(remaining.remove(i));
            permutations(remaining, chosen, into);
            chosen.removeLast();
        }
    }

    @SneakyThrows
    private String render(Path outDir, List<Item> items, List<Link> links) {
        val workspace = workspaceFactory.create(
            Workspace.builder()
                .application(
                    Application.builder()
                        .elements(
                            Set.of(
                                io.morin.archicode.resource.element.application.Solution.builder()
                                    .id("solution_a")
                                    .elements(
                                        Set.of(
                                            System.builder()
                                                .id("system_a")
                                                .elements(Set.of(Container.builder().id("container_a").build()))
                                                .build()
                                        )
                                    )
                                    .build()
                            )
                        )
                        .build()
                )
                .build(),
            Map.of()
        );
        val view = ResourceFixtures.createDetailedView("solution_a.system_a", "solution_a.system_a");
        val viewpoint = Viewpoint.builder()
            .workspace(workspace)
            .view(view)
            // a linked set: the order the items and the links come in is kept, which is what the test varies
            .items(new LinkedHashSet<>(items))
            .links(new LinkedHashSet<>(links))
            .build();
        viewRendererServiceRepository.get("plantuml").createViewRenderer().render(viewpoint, outDir);
        try (val files = Files.list(outDir)) {
            return Files.readString(files.findFirst().orElseThrow());
        }
    }

    @SneakyThrows
    @Test
    void shouldWriteTheSameViewWhateverTheOrderOfItsLinks(@TempDir Path outDir) {
        val scene = deployedTwice();
        val orders = new ArrayList<List<Link>>();
        permutations(scene.links(), new ArrayList<>(), orders);
        assertEquals(120, orders.size());

        val outputs = new TreeSet<String>();
        for (val order : orders) {
            outputs.add(render(outDir, scene.items(), order));
        }

        assertEquals(1, outputs.size(), "the order of the links in the view changes the file");
        val lines = outputs
            .first()
            .lines()
            .filter(line -> line.contains("-->"))
            .toList();
        assertEquals(5, lines.size(), outputs.first());
        // first the ends, then the ids of the ends, then what the link says
        assertTrue(lines.get(0).startsWith("pro_backend --> first_idp"), lines.toString());
        assertTrue(lines.get(3).startsWith("pro_backend --> second_idp"), lines.toString());
        assertTrue(lines.get(4).startsWith("pro_backend --> third_idp"), lines.toString());
    }

    @SneakyThrows
    @Test
    void shouldWriteTheSameViewWhateverTheOrderOfItsItems(@TempDir Path outDir) {
        val scene = deployedTwice();
        val orders = new ArrayList<List<Item>>();
        permutations(scene.items(), new ArrayList<>(), orders);

        val outputs = new TreeSet<String>();
        for (val order : orders) {
            outputs.add(render(outDir, order, scene.links()));
        }

        assertEquals(1, outputs.size(), "the order of the items in the view changes the file");
        val ids = outputs
            .first()
            .lines()
            .filter(line -> line.startsWith("rectangle ") || line.startsWith("card "))
            .map(line -> line.split(" ")[1])
            .toList();
        assertEquals(List.of("pro_backend", "first_idp", "second_idp", "third_idp"), ids, outputs.first());
    }
}
