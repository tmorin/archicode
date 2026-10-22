package io.morin.archicode.it;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.LaunchResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;

/**
 * What the integration tests share: the shipped examples and fixtures, copied to a temporary folder (the commands write
 * the views next to {@code .archicode.yaml}, and no test writes in the repository), and the assertions on a run of the
 * packaged application.
 *
 * <p>The packaged application is a process of its own, the jar under the JVM and the native runner under {@code -Dnative}:
 * a test talks to it through its command line, its output, its exit code and its HTTP port, and never through anything
 * only the JVM has.
 */
final class Shipped {

    /** The examples of the manual, the ones its text quotes. */
    static final Path EXAMPLES = Path.of("src/doc/examples");

    /** Four plateaus as layers, with {@code replaces}, a {@code REMOVE} and facets. */
    static final Path BRIGHTCART = Path.of("src/test/resources/brightcart/layered");

    /** An invented bookshop of the unit tests: new, changed and removed elements, and none moved, split or merged. */
    static final Path BOOKSHOP = Path.of("src/test/resources/plateau-comparison");

    private static final Pattern LOG_LINE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2},\\d{3} .*$");

    private Shipped() {}

    /**
     * What the application printed, without the lines of the Quarkus log that the integration test launcher turns on (the
     * application itself logs nothing below ERROR, see {@code application.properties}).
     */
    static String payload(LaunchResult result) {
        return result
            .getOutputStream()
            .stream()
            .filter(line -> !LOG_LINE.matcher(line).matches())
            .collect(Collectors.joining("\n"));
    }

    /** A copy of a shipped folder under {@code dir}, the folder that holds the copy of {@code .archicode.yaml}. */
    @SneakyThrows
    static Path copy(Path source, Path dir, String name) {
        val target = dir.resolve(name);
        try (Stream<Path> files = Files.walk(source)) {
            for (val file : files.toList()) {
                val to = target.resolve(source.relativize(file).toString());
                if (Files.isDirectory(file)) {
                    Files.createDirectories(to);
                } else {
                    Files.copy(file, to);
                }
            }
        }
        return target;
    }

    static String workspace(Path folder) {
        return folder.resolve(".archicode.yaml").toString();
    }

    /** Everything a run said, for the message of a failed assertion. */
    static String said(LaunchResult result) {
        return (
            "exit code " +
            result.exitCode() +
            "\n--- output\n" +
            result.getOutput() +
            "\n--- error output\n" +
            result.getErrorOutput()
        );
    }

    static LaunchResult succeeded(LaunchResult result) {
        assertEquals(0, result.exitCode(), () -> said(result));
        return result;
    }

    static void hasLine(String pattern, String text, LaunchResult result) {
        assertTrue(
            Pattern.compile(pattern, Pattern.MULTILINE).matcher(text).find(),
            () -> "no line matches /" + pattern + "/\n" + said(result)
        );
    }

    static void notEmpty(Path file) {
        assertTrue(Files.isRegularFile(file), () -> file + " is not written");
        assertTrue(file.toFile().length() > 0, () -> file + " is empty");
    }
}
