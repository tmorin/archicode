package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * KNOWN DIFFERENCE with the editor (issue #103): a plain scalar written as a YAML 1.1 number is read as that number by the
 * command line, and its text is the number's ({@code 010} is {@code 8}, {@code 1.50} is {@code 1.5}). The editor keeps every
 * plain scalar it cannot print back as it was written as the text it was written as ({@code editor-reads-like-cli.test.js},
 * the test of the same issue). This test pins what the command line does; when the two are made equal, both change.
 */
@QuarkusTest
class YamlOneDotOneNumbersTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    @SneakyThrows
    private TreeSet<String> referencesOf(String settings, String... manifests) {
        Files.writeString(dir.resolve("workspace.yaml"), settings);
        Files.createDirectories(dir.resolve("manifests"));
        for (int i = 0; i < manifests.length; i++) {
            Files.writeString(dir.resolve("manifests").resolve("m" + i + ".yaml"), manifests[i]);
        }
        return new TreeSet<>(
            workspaceFactory.create(dir.resolve("workspace.yaml")).appIndex.elementByReferenceIndex.keySet()
        );
    }

    @ParameterizedTest(name = "id: {0} is the reference {1}")
    @CsvSource(
        delimiter = '|',
        value = { "010|8", "007|7", "0x1F|31", "0b11|3", "1_000|1000", "+5|5", "-0|0", "yes|true", "No|false" }
    )
    void shouldReadAPlainScalarAsTheYaml11NumberItIs(String written, String reference) {
        val references = referencesOf(
            "settings: {}\n",
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: " + written + "\n"
        );
        assertEquals(new TreeSet<>(java.util.List.of(reference)), references);
    }

    /** A number with a dot is an id with a dot, which is refused in both tools (issue #104, M83 of plateau-model-cases.json). */
    @ParameterizedTest(name = "id: {0} has a dot, whatever the number is")
    @CsvSource(delimiter = '|', value = { "1.50|1.5", "1e3|1000.0", ".5|0.5" })
    void shouldRefuseANumberThatHasADotAsAnId(String written, String number) {
        val error = assertThrows(ArchiCodeException.class, () ->
            referencesOf(
                "settings: {}\n",
                "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: " + written + "\n"
            )
        );
        assertEquals(
            "`manifests/m0.yaml` is not valid: the id `" +
                number +
                "` contains a dot, which separates the levels of a reference, at `content.id`",
            error.getMessage()
        );
    }

    @ParameterizedTest(name = "id: \"{0}\" is the text as written")
    @CsvSource({ "010", "0x1F", "007", "yes" })
    void shouldKeepAQuotedScalarAsWritten(String written) {
        val references = referencesOf(
            "settings: {}\n",
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: \"" + written + "\"\n"
        );
        assertEquals(new TreeSet<>(java.util.List.of(written)), references);
    }

    @ParameterizedTest(name = "header.parent: {0}")
    @CsvSource({ "0", "010", "0x1F", "yes", "On" })
    void shouldKeepTheTextAsWrittenInAFieldOfTheHeader(String written) {
        val references = referencesOf(
            "settings: {}\n",
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: \"" + written + "\"\n",
            "header:\n  kind: \"archicode.morin.io/container\"\n  version: \"1\"\n  parent: " +
                written +
                "\ncontent:\n  id: c\n"
        );
        assertEquals(new TreeSet<>(java.util.List.of(written, written + ".c")), references);
    }
}
