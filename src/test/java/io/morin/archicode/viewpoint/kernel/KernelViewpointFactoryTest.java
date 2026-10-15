package io.morin.archicode.viewpoint.kernel;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.ResourceFixtures;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/** What {@link KernelViewpointFactory} makes of the workspaces the kernel's contract is easy to get wrong with. */
@QuarkusTest
class KernelViewpointFactoryTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    private Viewpoint create(String viewpoint, Workspace rawWorkspace, View.Layer layer, String reference) {
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());
        val view = ResourceFixtures.createDeepViewBuilder("view", reference).layer(layer).build();
        return viewpointServiceRepository.get(viewpoint).createViewpointFactory().create(workspace, view);
    }

    @Test
    void shouldFindTheRelationshipOfASecondaryLinkInTheApplicationLayer() {
        val tags = Map.of("port", "8080");
        val toB = Relationship.builder().destination("sys_b.con_bb").label("calls").tags(tags).build();
        val con_aa = Container.builder().id("con_aa").relationships(Set.of(toB)).build();
        val con_bb = Container.builder().id("con_bb").build();
        val app = Application.builder()
            .elements(
                Set.of(
                    System.builder().id("sys_a").elements(Set.of(con_aa)).build(),
                    System.builder().id("sys_b").elements(Set.of(con_bb)).build()
                )
            )
            .build();
        // the node has the very reference of the application it hosts: each index has to be searched on its own
        val node = Node.builder().id("con_aa").applications(Set.of("sys_a.con_aa", "sys_b.con_bb")).build();
        val dep = Technology.builder()
            .elements(Set.of(Environment.builder().id("sys_a").elements(Set.of(node)).build()))
            .build();

        val viewpoint = create(
            "deep",
            Workspace.builder().application(app).technology(dep).build(),
            View.Layer.TECHNOLOGY,
            "sys_a.con_aa"
        );

        Assertions.assertEquals(1, viewpoint.getLinks().size());
        val link = viewpoint.getLinks().iterator().next();
        Assertions.assertEquals("no", link.getTags().get("rendering-secondary"));
        Assertions.assertEquals(Set.of(toB), link.getRelationships());
    }

    @Test
    void shouldTellTwoRelationshipsThatDifferByTheirTagsApart() {
        val toB1 = Relationship.builder().destination("sys_b").tags(Map.of("port", "80")).build();
        val toB2 = Relationship.builder().destination("sys_b").tags(Map.of("port", "443")).build();
        val app = Application.builder()
            .elements(
                Set.of(
                    System.builder().id("sys_a").relationships(Set.of(toB1, toB2)).build(),
                    System.builder().id("sys_b").build()
                )
            )
            .build();

        val viewpoint = create(
            "overview",
            Workspace.builder().application(app).build(),
            View.Layer.APPLICATION,
            "sys_a"
        );

        Assertions.assertEquals(2, viewpoint.getLinks().size());
        val ports = new HashSet<String>();
        for (Link link : viewpoint.getLinks()) {
            Assertions.assertEquals(1, link.getRelationships().size(), "a link per relationship");
            ports.add(link.getRelationships().iterator().next().getTags().get("port"));
        }
        Assertions.assertEquals(Set.of("80", "443"), ports);
    }

    @Test
    void shouldToleratePropertiesThatAreNull() {
        val node = Node.builder().id("node_a").applications(null).relationships(null).build();
        val dep = Technology.builder()
            .elements(Set.of(Environment.builder().id("ref").elements(Set.of(node)).build()))
            .build();
        val sys_a = System.builder().id("sys_a").relationships(null).build();
        val sys_b = System.builder()
            .id("sys_b")
            .relationships(Set.of(Relationship.builder().destination("sys_a").build()))
            .build();
        val app = Application.builder().elements(Set.of(sys_a, sys_b)).build();
        val settings = Settings.builder()
            .relationships(Settings.Relationships.builder().defaultSyntheticLabel(null).build())
            .build();
        val raw = Workspace.builder().application(app).technology(dep).settings(settings).build();

        val application = create("overview", raw, View.Layer.APPLICATION, "sys_b");
        Assertions.assertEquals(1, application.getLinks().size());
        val technology = create("deep", raw, View.Layer.TECHNOLOGY, "ref");
        Assertions.assertEquals(
            1,
            technology
                .getItems()
                .stream()
                .flatMap(Item::stream)
                .filter(i -> i.getReference().equals("ref"))
                .count()
        );
    }

    @Test
    void shouldGiveAnItemTheStereotypesOfItsElementInAStableOrder() {
        // the tag is a whitespace-separated list: "external changed" is two stereotypes, after the qualifiers
        val api = Container.builder()
            .id("api")
            .qualifiers(new LinkedHashSet<>(List.of("Spring Boot", "PostgreSQL")))
            .tags(Map.of("rendering-stereotypes", "external changed"))
            .build();
        val plain = Container.builder().id("plain").build();
        val sys = System.builder().id("sys").elements(Set.of(api, plain)).build();
        val raw = Workspace.builder()
            .application(Application.builder().elements(Set.of(sys)).build())
            .build();

        val viewpoint = create("detailed", raw, View.Layer.APPLICATION, "sys");

        val stereotypes = viewpoint
            .getItems()
            .stream()
            .flatMap(Item::stream)
            .collect(Collectors.toMap(Item::getReference, Item::getStereotypes));
        Assertions.assertEquals(
            List.of("Spring Boot", "PostgreSQL", "external", "changed"),
            stereotypes.get("sys.api")
        );
        Assertions.assertEquals(List.of(), stereotypes.get("sys.plain"));
    }

    /**
     * {@code dev} hosts {@code sys_a.con_a}, which reads from {@code sys_ext.con_registry}, hosted by {@code int} and by
     * {@code prd}.
     */
    private Workspace environments(Set<String> devUses) {
        val readsFromMpi = Relationship.builder()
            .destination("sys_ext.con_registry")
            .label("reads")
            .tags(Map.of("port", "443"))
            .build();
        val app = Application.builder()
            .elements(
                Set.of(
                    System.builder()
                        .id("sys_a")
                        .elements(Set.of(Container.builder().id("con_a").relationships(Set.of(readsFromMpi)).build()))
                        .build(),
                    System.builder()
                        .id("sys_ext")
                        .elements(Set.of(Container.builder().id("con_registry").build()))
                        .build()
                )
            )
            .build();
        val dep = Technology.builder()
            .elements(
                Set.of(
                    Environment.builder()
                        .id("dev")
                        .uses(devUses)
                        .elements(Set.of(Node.builder().id("host").applications(Set.of("sys_a.con_a")).build()))
                        .build(),
                    Environment.builder()
                        .id("int")
                        .elements(
                            Set.of(Node.builder().id("host").applications(Set.of("sys_ext.con_registry")).build())
                        )
                        .build(),
                    Environment.builder()
                        .id("prd")
                        .elements(
                            Set.of(Node.builder().id("host").applications(Set.of("sys_ext.con_registry")).build())
                        )
                        .build()
                )
            )
            .build();
        return Workspace.builder().application(app).technology(dep).build();
    }

    @Test
    void shouldDeriveTheDependencyOfAnEnvironmentOnTheOnesItUses() {
        val viewpoint = create("deep", environments(Set.of("int")), View.Layer.TECHNOLOGY, "dev");

        Assertions.assertEquals(1, viewpoint.getLinks().size());
        val link = viewpoint.getLinks().iterator().next();
        Assertions.assertEquals("reads", link.getLabel());
        Assertions.assertFalse(
            link.getTags().containsKey("rendering-secondary"),
            "a dependency between environments is drawn"
        );
        Assertions.assertEquals("app:sys_a_con_a", link.getFrom().getReference());
        Assertions.assertEquals("app:sys_ext_con_registry", link.getTo().getReference());
        val relationship = link.getRelationships().iterator().next();
        Assertions.assertEquals("sys_ext.con_registry", relationship.getDestination());
        Assertions.assertEquals("443", relationship.getTags().get("port"), "the relationship of the application");
        val references = viewpoint.getItems().stream().flatMap(Item::stream).map(Item::getReference).toList();
        Assertions.assertTrue(references.contains("int.host"));
        Assertions.assertFalse(references.contains("prd.host"), "an environment that is not used stays out");
    }

    @Test
    void shouldDeriveNothingForAnEnvironmentThatUsesNothing() {
        val viewpoint = create("deep", environments(Set.of()), View.Layer.TECHNOLOGY, "dev");

        Assertions.assertTrue(viewpoint.getLinks().isEmpty());
    }

    @Test
    void shouldKeepTheDerivedDependenciesOutOfAFacetThatRemovesTheirRelationship() {
        val base = workspaceFactory.create(environments(Set.of("int")), Map.of());
        val facet = Settings.Facets.Facet.builder()
            .name("no443")
            .actions(
                Set.of(
                    Settings.Facets.Facet.Action.builder()
                        .operator(Settings.Facets.Facet.Action.Operator.REMOVE)
                        .jsonPath("$.application..relationships[?(@.tags['port'] == '443')]")
                        .build()
                )
            )
            .build();
        val view = ResourceFixtures.createDeepViewBuilder("view", "dev").layer(View.Layer.TECHNOLOGY).build();

        val viewpoint = viewpointServiceRepository
            .get("deep")
            .createViewpointFactory()
            .create(workspaceFactory.create(base, facet), view);

        Assertions.assertTrue(viewpoint.getLinks().isEmpty());
    }

    @Test
    void shouldRefuseAnEnvironmentThatUsesAnElementThatDoesNotExist() {
        val exception = Assertions.assertThrows(ArchiCodeException.class, () ->
            create("deep", environments(Set.of("nowhere")), View.Layer.TECHNOLOGY, "dev")
        );
        Assertions.assertTrue(exception.getMessage().contains("nowhere"));
    }
}
