package io.morin.archcode.rendering;

import io.morin.archcode.Fixtures;
import io.morin.archcode.context.detailed.DetailedContextFactory;
import io.morin.archcode.context.overview.OverviewContextFactory;
import io.morin.archcode.view.DetailedView;
import io.morin.archcode.workspace.RawWorkspace;
import io.morin.archcode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@QuarkusTest
@Slf4j
class PlantumlEngineRendererTest {

    @Inject
    PlantumlEngineRenderer plantumlRenderer;

    @Inject
    DetailedContextFactory detailedContextFactory;

    @Inject
    OverviewContextFactory overviewContextFactory;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Test
    @SneakyThrows
    void shouldRenderOverview() {
        val context = overviewContextFactory.create(
            workspaceFactory.create(Fixtures.workspace_a),
            Fixtures.view_solution_a_overview
        );

        val tmpFile = new File("target/view_solution_a_overview.puml");
        try (val os = new FileOutputStream(tmpFile)) {
            plantumlRenderer.render(context, os);
        } finally {
            log.info("{}", tmpFile.toPath());
            log.info("{}", Files.readString(tmpFile.toPath()));
        }
    }

    @Test
    @SneakyThrows
    void shouldRenderDetailed() {
        val context = detailedContextFactory.create(
            workspaceFactory.create(Fixtures.workspace_a),
            Fixtures.view_solution_a_detailed
        );

        val tmpFile = new File("target/view_solution_a_detailed.puml");
        try (val os = new FileOutputStream(tmpFile)) {
            plantumlRenderer.render(context, os);
        } finally {
            log.info("{}", tmpFile.toPath());
            log.info("{}", Files.readString(tmpFile.toPath()));
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(strings = { "solution_a", "solution_a.system_a" })
    void shouldRenderDetailedViewWithIngressAndEgress(String viewReference) {
        val view = DetailedView.builder().viewId(viewReference).element(viewReference).build();

        val rawWorkspace = RawWorkspace.builder().model(Fixtures.createWithIngressAndEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val context = detailedContextFactory.create(workspace, view);

        val tmpFile = new File(String.format("target/ing-eg__%s.puml", viewReference));
        try (val os = new FileOutputStream(tmpFile)) {
            plantumlRenderer.render(context, os);
        } finally {
            log.info("{}", tmpFile.toPath());
            log.info("{}", Files.readString(tmpFile.toPath()));
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(strings = { "sol_a.sys_aa" })
    void shouldRenderDetailedViewWithInternalEgress(String viewReference) {
        val view = DetailedView.builder().viewId(viewReference).element(viewReference).build();

        val rawWorkspace = RawWorkspace.builder().model(Fixtures.createWithInternalEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val context = detailedContextFactory.create(workspace, view);

        val tmpFile = new File(String.format("target/int-eg_%s.puml", viewReference));
        try (val os = new FileOutputStream(tmpFile)) {
            plantumlRenderer.render(context, os);
        } finally {
            log.info("{}", tmpFile.toPath());
            log.info("{}", Files.readString(tmpFile.toPath()));
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(strings = { "sol_a.sys_aa" })
    void shouldRenderDetailedViewWithInternalIngress(String viewReference) {
        val view = DetailedView.builder().viewId(viewReference).element(viewReference).build();

        val rawWorkspace = RawWorkspace.builder().model(Fixtures.createWithInternalIngress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val context = detailedContextFactory.create(workspace, view);

        val tmpFile = new File(String.format("target/int-ing_%s.puml", viewReference));
        try (val os = new FileOutputStream(tmpFile)) {
            plantumlRenderer.render(context, os);
        } finally {
            log.info("{}", tmpFile.toPath());
            log.info("{}", Files.readString(tmpFile.toPath()));
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(strings = { "sol_a.sys_aa" })
    void shouldRenderDetailedViewWithXgress(String viewReference) {
        val view = DetailedView.builder().viewId(viewReference).element(viewReference).build();

        val rawWorkspace = RawWorkspace.builder().model(Fixtures.createWithInternalXgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val context = detailedContextFactory.create(workspace, view);

        val tmpFile = new File(String.format("target/int-x_%s.puml", viewReference));
        try (val os = new FileOutputStream(tmpFile)) {
            plantumlRenderer.render(context, os);
        } finally {
            log.info("{}", tmpFile.toPath());
            log.info("{}", Files.readString(tmpFile.toPath()));
        }
    }
}
