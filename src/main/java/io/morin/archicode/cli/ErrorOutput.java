package io.morin.archicode.cli;

import com.fasterxml.jackson.core.JsonProcessingException;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.Warnings;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.PrintWriter;
import java.net.BindException;
import java.nio.charset.CharacterCodingException;
import java.nio.file.AccessDeniedException;
import java.nio.file.FileSystemException;
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

    /** The exit code of a command that failed. Picocli's own code for a usage error is 2. */
    public static final int FAILURE = 1;

    /** The exit code of {@code archicode diff --fail-on} when the comparison holds a change of a state it was told to fail on. */
    public static final int CHANGES_FOUND = 3;

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

    /**
     * The lines to print, or null for a failure that is not one the author can act on.
     *
     * <p>The whole chain of causes is read, and the most precise cause wins over the one that wraps it: a missing file under an
     * {@link UncheckedIOException} is a missing file. Only what the author can fix is told in a line: a sentence of ours, a file
     * (or a folder) that is absent, refused, or cannot be read or written, a text that is not valid, a port already in use, a
     * file that is not valid YAML, TOML or JSON. Any other {@link IOException} is not (it may be a bug that happens to wrap one),
     * and keeps its stack trace.
     */
    static String message(Throwable failure) {
        String best = null;
        var bestRank = Integer.MAX_VALUE;
        for (Throwable e = failure; e != null; e = e.getCause() == e ? null : e.getCause()) {
            val rank = rank(e);
            if (rank < bestRank) {
                best = describe(e);
                bestRank = rank;
            }
        }
        return best;
    }

    /** How precise a cause is, the lowest first; {@link Integer#MAX_VALUE} for one that says nothing the author can act on. */
    private static int rank(Throwable e) {
        if (e instanceof ArchiCodeException) {
            return 0;
        }
        if (e instanceof NoSuchFileException || e instanceof AccessDeniedException) {
            return 1;
        }
        if (e instanceof FileSystemException) {
            return 2;
        }
        if (e instanceof BindException) {
            return 3;
        }
        if (e instanceof CharacterCodingException) {
            return 4;
        }
        if (e instanceof JsonProcessingException) {
            return 5;
        }
        return Integer.MAX_VALUE;
    }

    private static String describe(Throwable e) {
        if (e instanceof ArchiCodeException) {
            return e.getMessage();
        }
        if (e instanceof JsonProcessingException json) {
            return ArchiCodeException.unreadable(null, json, false).getMessage();
        }
        if (e instanceof FileSystemException file) {
            val name = file.getFile();
            if (name == null) {
                return "a file cannot be read or written: " + reasonOf(file);
            }
            if (e instanceof NoSuchFileException) {
                return "`" + name + "` does not exist";
            }
            if (e instanceof AccessDeniedException) {
                return "`" + name + "` cannot be accessed: permission denied";
            }
            return "`" + name + "` cannot be read or written: " + reasonOf(file);
        }
        if (e instanceof BindException bind) {
            return "the server cannot listen: " + reasonOf(bind);
        }
        // a CharacterCodingException: the text of a file is not valid in the encoding it is read in
        return "a file is not valid text (UTF-8): " + reasonOf(e);
    }

    /** What the failure says, or its name when it says nothing. */
    private static String reasonOf(Throwable e) {
        val reason =
            e instanceof FileSystemException file && file.getReason() != null ? file.getReason() : e.getMessage();
        return reason == null ? e.getClass().getSimpleName() : reason;
    }

    private static void print(PrintWriter err, List<String> lines) {
        if (lines.isEmpty()) {
            return;
        }
        lines.forEach(err::println);
        err.flush();
    }
}
