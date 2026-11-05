package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

@QuarkusTest
class GetViewsQueryTest {

    @Inject
    GetViewsQuery getViewsQuery;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private CliHarness.Result queryViews(String workspace, String... more) {
        val args = new ArrayList<String>(java.util.List.of("-w", workspace, "query", "views"));
        args.addAll(java.util.List.of(more));
        val result = CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
        assertEquals(0, result.exit(), result.err());
        return result;
    }

    @SneakyThrows
    private JsonNode queryViewsAsJson(String workspace, String... more) {
        val args = new ArrayList<String>(java.util.List.of("-f", "json"));
        args.addAll(java.util.List.of(more));
        return new ObjectMapper().readTree(queryViews(workspace, args.toArray(String[]::new)).out());
    }

    private static int countSaved(JsonNode views) {
        var saved = 0;
        for (val view : views) {
            assertTrue(view.has("saved") && view.get("saved").isBoolean(), "every entry has a boolean saved: " + view);
            if (view.get("saved").asBoolean()) {
                saved++;
            }
        }
        return saved;
    }

    @Test
    void shouldOutputCustom() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of("src/test/workspaces/case_a.yaml");
        val views = new QueryGroup();
        views.archiCode = archiCode;
        getViewsQuery.queryGroup = views;
        getViewsQuery.outputFormat = OutputFormat.CUSTOM;
        getViewsQuery.query = "$.[0]";
        getViewsQuery.template = """
        $d.e("$.viewpoint") : $d.e("$.id")
        """;
        Assertions.assertDoesNotThrow(getViewsQuery::run);
    }

    @Test
    void shouldOutputYaml() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of("src/test/workspaces/case_a.yaml");
        val views = new QueryGroup();
        views.archiCode = archiCode;
        getViewsQuery.queryGroup = views;
        getViewsQuery.outputFormat = OutputFormat.YAML;
        getViewsQuery.query = "$.[0]";
        Assertions.assertDoesNotThrow(getViewsQuery::run);
    }

    @Test
    void everyEntryOfTheModelSaysIfItIsSavedAndExactlyFiveAre() {
        val views = queryViewsAsJson("docs/architecture/.archicode.yaml");
        assertTrue(views.size() > 5, "the saved views and the derived ones are listed");
        assertEquals(5, countSaved(views));
        val last = new ArrayList<String>();
        views.get(0).fieldNames().forEachRemaining(last::add);
        assertEquals("saved", last.get(last.size() - 1), "saved is the last key of an entry");
    }

    @Test
    void theQueryOnSavedTrueSelectsOnlyTheSavedViews() {
        val views = queryViewsAsJson("docs/architecture/.archicode.yaml", "-q", "$[?(@.saved==true)]");
        assertEquals(5, views.size());
        assertEquals(5, countSaved(views));
    }

    @Test
    void aWorkspaceWithoutSavedViewsListsOnlyEntriesThatAreNotSaved() {
        val views = queryViewsAsJson("src/doc/examples/domain_workspace/.archicode.yaml");
        assertTrue(views.size() > 0);
        assertEquals(0, countSaved(views));
    }

    @Test
    @SneakyThrows
    void aWorkspaceMadeByInitHasOneSavedViewAndTheDerivedOnes() {
        val target = dir.resolve("made-by-init");
        val init = CliHarness.run(factory, errorOutput, "init", target.toString());
        assertEquals(0, init.exit(), init.err());
        val views = queryViewsAsJson(target.resolve(".archicode.yaml").toString());
        assertEquals(1, countSaved(views));
        for (val view : views) {
            if (view.get("saved").asBoolean()) {
                assertEquals("shop_overview", view.get("id").asText());
            }
        }
    }

    @Test
    @SneakyThrows
    void aSavedViewNamedLikeADerivedOneKeepsBothEntries() {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(
            dir.resolve(".archicode.yaml"),
            "settings:\n  manifests:\n    paths: [\"manifests\"]\n  views:\n    path: \"views\"\n"
        );
        Files.writeString(
            dir.resolve("manifests/shop.yaml"),
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: \"shop\"\n"
        );
        Files.writeString(
            dir.resolve("manifests/view.shop.yaml"),
            "header:\n  kind: \"archicode.morin.io/view\"\n  version: \"1\"\ncontent:\n  id: \"shop-overview\"\n  viewpoint: \"overview\"\n  description: \"System - shop - Overview\"\n  properties:\n    element: \"shop\"\n"
        );
        val views = queryViewsAsJson(dir.resolve(".archicode.yaml").toString());
        val markers = new ArrayList<Boolean>();
        for (val view : views) {
            if ("shop-overview".equals(view.get("id").asText()) && "overview".equals(view.get("viewpoint").asText())) {
                markers.add(view.get("saved").asBoolean());
            }
        }
        assertEquals(java.util.List.of(true, false), markers, "the saved entry first, then the derived one");
    }

    @Test
    void theMarkerIsWrittenInYamlTomlAndCustomToo() {
        val workspace = "docs/architecture/.archicode.yaml";
        val yaml = queryViews(workspace, "-f", "yaml").out();
        assertTrue(yaml.contains("\n  saved: true\n"), "yaml: " + yaml);
        assertTrue(yaml.contains("\n  saved: false\n"), "yaml: " + yaml);
        val toml = queryViews(workspace, "-f", "toml").out();
        assertTrue(toml.contains("saved = true"), "toml: " + toml);
        assertTrue(toml.contains("saved = false"), "toml: " + toml);
        val custom = queryViews(workspace, "-f", "custom", "-q", "$.[0]", "-t", "saved=$d.e(\"$.saved\")");
        assertTrue(custom.out().trim().matches("saved=(true|false)"), custom.out());
    }
}
