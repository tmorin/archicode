package io.morin.archicode.rendering;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ResourceFixtures;
import io.morin.archicode.WorkspaceAFixtures;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@QuarkusTest
@Slf4j
class PlantumlViewRendererTest {

    @Inject
    ViewRendererServiceRepository viewRendererServiceRepository;

    ViewRenderer plantumlRenderer;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @Inject
    WorkspaceFactory workspaceFactory;

    @BeforeEach
    void setUp() {
        plantumlRenderer = viewRendererServiceRepository.get("plantuml").createViewRenderer();
    }

    Path prepareOutDir(String testcase, Viewpoint viewpoint) {
        val outDir = Path.of(
            "target",
            this.getClass().getSimpleName(),
            testcase,
            viewpoint.getView().getLayer().name().toLowerCase(Locale.ROOT)
        );
        if (outDir.toFile().mkdirs()) {
            log.trace("{} has been created", outDir);
        }
        plantumlRenderer.render(viewpoint, outDir);

        return Path.of(outDir.toString(), String.format("%s.puml", viewpoint.getView().getId().replace(".", "_")));
    }

    @Test
    @SneakyThrows
    void shouldRenderOverview() {
        val context = viewpointServiceRepository
            .get("overview")
            .createViewpointFactory()
            .create(
                workspaceFactory.create(WorkspaceAFixtures.createWorkspace(), Map.of()),
                WorkspaceAFixtures.view_solution_a_overview
            );

        val outFile = prepareOutDir("shouldRenderOverview", context);
        val outContent = Files.readString(outFile);
        log.info("{}", outContent);
        assertNotNull(outContent);
    }

    @Test
    @SneakyThrows
    void shouldRenderDetailed() {
        val context = viewpointServiceRepository
            .get("detailed")
            .createViewpointFactory()
            .create(
                workspaceFactory.create(WorkspaceAFixtures.createWorkspace(), Map.of()),
                WorkspaceAFixtures.view_solution_a_detailed
            );

        val outFile = prepareOutDir("shouldRenderDetailed", context);
        val outContent = Files.readString(outFile);
        log.info("{}", outContent);
        assertNotNull(outContent);
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(strings = { "solution_a", "solution_a.system_a" })
    void shouldRenderDetailedViewWithIngressAndEgress(String viewReference) {
        val view = ResourceFixtures.createDetailedView(viewReference, viewReference);

        val rawWorkspace = Workspace.builder()
            .application(ResourceFixtures.createWithIngressAndEgress().build())
            .build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val context = viewpointServiceRepository.get("detailed").createViewpointFactory().create(workspace, view);

        val outFile = prepareOutDir("shouldRenderDetailedViewWithIngressAndEgress", context);
        val outContent = Files.readString(outFile);
        log.info("{}", outContent);
        assertNotNull(outContent);
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(strings = { "sol_a.sys_aa" })
    void shouldRenderDetailedViewWithInternalEgress(String viewReference) {
        val view = ResourceFixtures.createDetailedView(viewReference, viewReference);

        val rawWorkspace = Workspace.builder().application(ResourceFixtures.createWithInternalEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val context = viewpointServiceRepository.get("detailed").createViewpointFactory().create(workspace, view);

        val outFile = prepareOutDir("shouldRenderDetailedViewWithInternalEgress", context);
        val outContent = Files.readString(outFile);
        log.info("{}", outContent);
        assertNotNull(outContent);
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(strings = { "sol_a.sys_aa" })
    void shouldRenderDetailedViewWithInternalIngress(String viewReference) {
        val view = ResourceFixtures.createDetailedView(viewReference, viewReference);

        val rawWorkspace = Workspace.builder()
            .application(ResourceFixtures.createWithInternalIngress().build())
            .build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val context = viewpointServiceRepository.get("detailed").createViewpointFactory().create(workspace, view);

        val outFile = prepareOutDir("shouldRenderDetailedViewWithInternalEgress", context);
        val outContent = Files.readString(outFile);
        log.info("{}", outContent);
        assertNotNull(outContent);
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(strings = { "sol_a.sys_aa" })
    void shouldRenderDetailedViewWithXgress(String viewReference) {
        val view = ResourceFixtures.createDetailedView(viewReference, viewReference);

        val rawWorkspace = Workspace.builder().application(ResourceFixtures.createWithInternalXgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val context = viewpointServiceRepository.get("detailed").createViewpointFactory().create(workspace, view);

        val outFile = prepareOutDir("shouldRenderDetailedViewWithInternalEgress", context);
        val outContent = Files.readString(outFile);
        log.info("{}", outContent);
        assertNotNull(outContent);
    }

    @SneakyThrows
    @Test
    void shouldRenderTheStylesInAStableOrderAndTheStereotypesLastFirst() {
        val view = ResourceFixtures.createDetailedView("solution_a.system_a", "solution_a.system_a");
        val container = Container.builder()
            .id("container_a")
            .qualifiers(Set.of("Spring Boot"))
            .tags(Map.of("rendering-stereotypes", "external changed"))
            .build();
        val system = System.builder().id("system_a").elements(Set.of(container)).build();
        val solution = Solution.builder().id("solution_a").elements(Set.of(system)).build();
        val rawWorkspace = Workspace.builder()
            .application(Application.builder().elements(Set.of(solution)).build())
            .styles(
                Styles.builder()
                    .byTag("external", Styles.Style.builder().backgroundColor("lightgray").build())
                    .byTag("changed", Styles.Style.builder().lineColor("orangered").build())
                    .byQualifier("Spring Boot", Styles.Style.builder().roundCorner(20).build())
                    .byQualifier("external", Styles.Style.builder().backgroundColor("red").lineThickness(2).build())
                    .build()
            )
            .build();
        val context = viewpointServiceRepository
            .get("detailed")
            .createViewpointFactory()
            .create(workspaceFactory.create(rawWorkspace, Map.of()), view);

        val first = Files.readString(prepareOutDir("shouldRenderTheStylesInAStableOrder1", context));
        val second = Files.readString(prepareOutDir("shouldRenderTheStylesInAStableOrder2", context));

        assertEquals(first, second);
        // the last stereotype of the box comes first, because PlantUML lets the first one win
        assertTrue(first.contains("<<changed>> <<external>> <<Spring Boot>> <<container>> <<atomic>>"), first);
        // by name; `external` is declared in both maps, and is one style, the tags over the qualifiers
        val blocks = Pattern.compile("^\\.(.+) \\{$", Pattern.MULTILINE)
            .matcher(first)
            .results()
            .map(m -> m.group(1))
            .distinct()
            .toList();
        assertEquals(List.of("composite", "Spring Boot", "changed", "external"), blocks);
        assertTrue(first.contains("BackgroundColor: lightgray"), first);
        assertTrue(first.contains("LineThickness: 2"), first);
        assertFalse(first.contains("BackgroundColor: red"), first);
    }
}
