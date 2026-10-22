package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.plateau.Patch;
import io.morin.archicode.resource.story.Story;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Workspace;
import java.util.List;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * How the readers treat what is empty (issue #80, run 0092): a key with nothing after it is a key that is not there, and so
 * is an item with no value in a list; a {@code JsonNode} that is meant to hold a value keeps its null as a value. The shared
 * cases ({@code negative-cases.json}, {@code plateau-model-cases.json}) run the same inputs through the command line and the
 * editor; this holds what only the classes can say.
 */
class ReadingNullsTest {

    private static final ObjectMapper YAML = new MapperFactory().create(MapperFormat.YAML);

    @SneakyThrows
    @Test
    void shouldReadAKeyWithNothingAfterItAsAbsent() {
        val container = YAML.readValue(
            "kind: container\nid: c\nelements:\nqualifiers:\ntags:\nrelationships:\n",
            Container.class
        );
        assertTrue(container.getElements().isEmpty());
        assertTrue(container.getQualifiers().isEmpty());
        assertTrue(container.getTags().isEmpty());
        assertTrue(container.getRelationships().isEmpty());
        val settings = YAML.readValue("manifests:\nviews:\nfacets:\nrelationships:\n", Settings.class);
        assertEquals(Set.of("manifests"), settings.getManifests().getPaths());
        assertEquals("views", settings.getViews().getPath());
        assertTrue(settings.getFacets().isGlobalEnabled());
        assertEquals("%s-%s", settings.getFacets().getDirectoryNameTemplate());
    }

    @SneakyThrows
    @Test
    void shouldLeaveAnItemWithNoValueOutOfAList() {
        val settings = YAML.readValue("manifests:\n  paths: [null, a, ~, b]\n", Settings.class);
        assertEquals(Set.of("a", "b"), settings.getManifests().getPaths());
        val story = YAML.readValue("id: s\nsteps: [null]\n", Story.class);
        assertTrue(story.getSteps().isEmpty());
        assertEquals(
            1,
            YAML.readValue("kind: container\nid: c\nelements:\n  -\n  - kind: component\n    id: x\n", Container.class)
                .getElements()
                .size()
        );
    }

    @SneakyThrows
    @Test
    void shouldKeepTheNullOfAValueThatIsAJsonNode() {
        assertTrue(
            YAML.readValue("operator: SET\ntarget: a\nfield: name\nvalue: null\n", Patch.class).getValue().isNull()
        );
        assertTrue(YAML.readValue("id: v\nviewpoint: p\nproperties: ~\n", View.class).getProperties().isNull());
        assertTrue(YAML.readValue("view: v\nproperties: null\n", Story.Step.class).getProperties().isNull());
    }

    @SneakyThrows
    @Test
    void shouldNotReadAnEmptyDocumentAsAWorkspaceButSayWhy() {
        val e = org.junit.jupiter.api.Assertions.assertThrows(
            com.fasterxml.jackson.core.JsonProcessingException.class,
            () -> YAML.readValue("# nothing\n", Workspace.class)
        );
        assertTrue(ManifestParser.isEmptyDocument(e), "the factory reads this as the default workspace");
    }

    @Test
    void shouldTellAKeyAsTheManualWritesIt() {
        assertEquals("json-path", ManifestParser.documented("jsonPath"));
        assertEquals("directory-name-template", ManifestParser.documented("directoryNameTemplate"));
        assertEquals("id", ManifestParser.documented("id"));
        assertEquals("hide-unlinked", ManifestParser.documented("hideUnlinked"));
    }

    @SneakyThrows
    @Test
    void shouldReadOnlyTheKebabCaseSpellingOfAKeyOfTheFacets() {
        val facets = YAML.readValue("global-enabled: false\ndirectory-name-template: x\n", Settings.Facets.class);
        assertEquals(false, facets.isGlobalEnabled());
        assertEquals("x", facets.getDirectoryNameTemplate());
        // the camel-case spelling was removed in 0.17: the sentence says what to write (shared cases N76, N91 to N93)
        for (val key : List.of("globalEnabled", "directoryNameTemplate")) {
            val e = org.junit.jupiter.api.Assertions.assertThrows(
                com.fasterxml.jackson.core.JsonProcessingException.class,
                () -> YAML.readValue(key + ": x\n", Settings.Facets.class)
            );
            val sentence = io.morin.archicode.ArchiCodeException.unreadable(".archicode.yaml", e, false).getMessage();
            assertTrue(
                sentence.contains("unknown key `" + key + "`, write `" + ManifestParser.documented(key) + "` (known: "),
                sentence
            );
        }
        val written = YAML.writeValueAsString(YAML.readValue("customs: []\n", Settings.Facets.class));
        assertTrue(written.contains("global-enabled"), written);
    }
}
