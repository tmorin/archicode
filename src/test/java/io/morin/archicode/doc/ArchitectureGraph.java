package io.morin.archicode.doc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.cli.ArchiCode;
import io.morin.archicode.cli.ErrorOutput;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import picocli.CommandLine;

/**
 * Runs the command line on the model of ArchiCode itself and hands the parsed {@code query graph} to the tests that
 * share it (wave 029, run 0210). The command line needs the injected factory and {@code ErrorOutput}, so the test
 * classes keep their {@code @Inject} fields and pass both.
 */
final class ArchitectureGraph {

    private ArchitectureGraph() {}

    record Result(int exit, String out, String err) {}

    /** The command line the way a shell runs it (a copy of the harness of the {@code cli} package, which is not visible here). */
    static Result run(CommandLine.IFactory factory, ErrorOutput errorOutput, String... args) {
        val out = new ByteArrayOutputStream();
        val err = new ByteArrayOutputStream();
        val previousOut = System.out;
        System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));
        try {
            val commandLine = new CommandLine(ArchiCode.class, factory);
            commandLine.setErr(new PrintWriter(err, true, StandardCharsets.UTF_8));
            errorOutput.install(commandLine);
            val exit = commandLine.execute(args);
            return new Result(exit, out.toString(StandardCharsets.UTF_8), err.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(previousOut);
        }
    }

    /** {@code query graph} of the workspace file; fails unless the exit is 0 and the error output empty. */
    @SneakyThrows
    static JsonNode load(Path workspace, CommandLine.IFactory factory, ErrorOutput errorOutput) {
        val result = run(factory, errorOutput, "-w", workspace.toString(), "query", "graph");
        if (result.exit() != 0 || !result.err().isEmpty()) {
            throw new AssertionError("query graph on " + workspace + " exited " + result.exit() + ": " + result.err());
        }
        val graph = new ObjectMapper().readTree(result.out());
        for (val field : new String[] { "elements", "relationships" }) {
            if (!graph.has(field)) {
                throw new AssertionError("query graph on " + workspace + " has no `" + field + "`: " + graph);
            }
        }
        return graph;
    }
}
