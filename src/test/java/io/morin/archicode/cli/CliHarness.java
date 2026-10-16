package io.morin.archicode.cli;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import lombok.val;
import picocli.CommandLine;

/**
 * Runs the command line of the application the way a shell does: the error path of {@link ErrorOutput} installed, the
 * standard output and the error output captured, and the exit code returned.
 */
final class CliHarness {

    record Result(int exit, String out, String err) {}

    private CliHarness() {}

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
}
