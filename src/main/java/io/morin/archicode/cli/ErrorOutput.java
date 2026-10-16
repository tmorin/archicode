package io.morin.archicode.cli;

import com.fasterxml.jackson.core.JsonProcessingException;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.Warnings;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.UncheckedIOException;
import java.net.BindException;
import java.nio.file.AccessDeniedException;
import java.nio.file.NoSuchFileException;
import java.util.List;
import lombok.AccessLevel;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;
import picocli.CommandLine;

/**
 * What the command line says on its error output, whichever command it runs: the warnings the command kept ({@link Warnings})
 * when it ends, and, when it fails, a message in place of the stack trace.
 *
 * <p>{@code application.properties} sets {@code quarkus.log.level=ERROR}, which hides {@code log.warn}, and a stack trace is
 * for the one who writes the code, not for the one who wrote a manifest. A failure the author can act on
 * ({@link ArchiCodeException}, a file that cannot be read or is not valid) is one line, {@code error: <what is wrong>}, and
 * the exit code is {@link #FAILURE}; a usage error keeps picocli's own code (2). What nobody expected (a bug) keeps its
 * stack trace, so that a report has it.
 */
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class ErrorOutput implements CommandLine.IExecutionExceptionHandler, CommandLine.IExecutionStrategy {

    /** The exit code of a command that failed. Picocli's own code for a usage error is 2; nothing else is reserved. */
    public static final int FAILURE = 1;

    private static final String PREFIX = "error: ";

    Warnings warnings;

    /**
     * Put this error path on a command line: the one of the application, and the ones the tests run.
     *
     * @param commandLine the command line
     * @return the same command line
     */
    public CommandLine install(@NonNull CommandLine commandLine) {
        return commandLine.setExecutionStrategy(this).setExecutionExceptionHandler(this);
    }

    /** Runs the command, then prints its warnings, whether it ended or failed: they come before the error, if any. */
    @Override
    public int execute(CommandLine.ParseResult parseResult) {
        // a warning that a command run in this process left behind (the commands are also called as methods) is not ours
        warnings.drain();
        try {
            return new CommandLine.RunLast().execute(parseResult);
        } finally {
            print(parseResult.commandSpec().commandLine().getErr(), warnings.drain());
        }
    }

    @Override
    public int handleExecutionException(Exception e, CommandLine commandLine, CommandLine.ParseResult parseResult) {
        val err = commandLine.getErr();
        val message = message(e);
        if (message == null) {
            // not a failure the author can act on: it is a bug, and the stack trace is what a report needs
            err.println(PREFIX + "unexpected " + e);
            e.printStackTrace(err);
        } else {
            message.lines().forEach(line -> err.println(PREFIX + line));
        }
        err.flush();
        return FAILURE;
    }

    /** The lines to print, or null for a failure that is not one the author can act on. */
    static String message(Throwable failure) {
        for (Throwable e = failure; e != null; e = e.getCause() == e ? null : e.getCause()) {
            if (e instanceof ArchiCodeException) {
                return e.getMessage();
            }
            if (e instanceof JsonProcessingException json) {
                return ArchiCodeException.unreadable("a file", json, false).getMessage();
            }
            if (e instanceof NoSuchFileException file) {
                return "`" + file.getFile() + "` does not exist";
            }
            if (e instanceof AccessDeniedException file) {
                return "`" + file.getFile() + "` cannot be accessed: permission denied";
            }
            if (e instanceof BindException bind) {
                return "the server cannot listen: " + bind.getMessage();
            }
            if (e instanceof UncheckedIOException || e instanceof IOException) {
                return "cannot read or write: " + e.getMessage();
            }
        }
        return null;
    }

    private static void print(PrintWriter err, List<String> lines) {
        if (lines.isEmpty()) {
            return;
        }
        lines.forEach(err::println);
        err.flush();
    }
}
