package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Generates the views of the fixture workspace (see {@code src/test/resources/viewpoint-kernel/README.md}), for the
 * workspace and for each of its facets, and checks every generated file against the committed one. The committed
 * files are the behaviour of the viewpoints: they are what the Java algorithms produced before the kernel replaced
 * them, and what the standalone editor's tests check the kernel against too.
 */
@QuarkusTest
class ViewpointKernelFixtureTest {

    private static final Path FIXTURE = Path.of("src/test/resources/viewpoint-kernel/workspace");

    @Inject
    GenerateViewsCommand generateViewsCommand;

    @SneakyThrows
    private static void copy(Path from, Path to) {
        try (Stream<Path> files = Files.walk(from)) {
            for (val file : files.toList()) {
                val target = to.resolve(from.relativize(file).toString());
                if (Files.isDirectory(file)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(file, target);
                }
            }
        }
    }

    @SneakyThrows
    private static List<Path> listFiles(Path root) {
        try (Stream<Path> files = Files.walk(root)) {
            return files.filter(Files::isRegularFile).map(root::relativize).sorted().toList();
        }
    }

    @SneakyThrows
    @Test
    void shouldGenerateTheCommittedViews(@TempDir Path workspaceDir) {
        Files.copy(FIXTURE.resolve("workspace.yaml"), workspaceDir.resolve("workspace.yaml"));
        copy(FIXTURE.resolve("manifests"), workspaceDir.resolve("manifests"));

        val archiCode = new ArchiCode();
        archiCode.workspaceFilePath = workspaceDir.resolve("workspace.yaml");
        val views = new ViewsGroup();
        views.archiCode = archiCode;
        generateViewsCommand.viewsGroup = views;
        generateViewsCommand.rendererName = "plantuml";
        generateViewsCommand.run();

        val committed = listFiles(FIXTURE)
            .stream()
            .filter(p -> p.toString().startsWith("views"))
            .toList();
        val generated = listFiles(workspaceDir)
            .stream()
            .filter(p -> p.toString().startsWith("views"))
            .toList();
        Assertions.assertTrue(
            committed.size() >= 5 * 40,
            "the fixture should hold the views of the workspace and its facets"
        );
        Assertions.assertEquals(committed, generated, "the generated views are not the committed ones");

        for (val file : committed) {
            Assertions.assertEquals(
                Files.readString(FIXTURE.resolve(file.toString())).replace("\r\n", "\n"),
                Files.readString(workspaceDir.resolve(file.toString())).replace("\r\n", "\n"),
                "view " + file + " changed"
            );
        }
    }
}
