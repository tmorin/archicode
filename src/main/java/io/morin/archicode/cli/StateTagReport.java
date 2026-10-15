package io.morin.archicode.cli;

import java.io.PrintWriter;
import java.util.List;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;
import picocli.CommandLine;

/**
 * Where the warnings about the states written by hand go: the error output of the command line, not the log.
 * {@code application.properties} sets {@code quarkus.log.level=ERROR}, which hides {@code log.warn}; a warning that
 * nobody reads is no warning, and the standard output is for the files and the tables.
 */
@UtilityClass
class StateTagReport {

    /**
     * @param spec     the command that reports, or null when it is called as a plain method (its error output is then the
     *                 one of the process)
     * @param warnings the sentences, one per line
     */
    void print(CommandLine.Model.CommandSpec spec, @NonNull List<String> warnings) {
        if (warnings.isEmpty()) {
            return;
        }
        val err = spec == null ? new PrintWriter(System.err, true) : spec.commandLine().getErr();
        warnings.forEach(err::println);
        err.flush();
    }
}
