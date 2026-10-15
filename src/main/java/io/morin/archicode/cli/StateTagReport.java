package io.morin.archicode.cli;

import java.io.PrintWriter;
import java.util.List;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;
import picocli.CommandLine;

/**
 * Where the warnings of the command line go (a state written by hand that the comparison does not give the element, a
 * {@code replaces} the comparison ignored): the error output of the command line, not the log.
 * {@code application.properties} sets {@code quarkus.log.level=ERROR}, which hides {@code log.warn}; a warning that
 * nobody reads is no warning, and the standard output is for the files and the tables.
 */
@UtilityClass
class StateTagReport {

    /**
     * What the comparison ignored in the {@code replaces} of the plateau, as warnings of the same channel: the kernel
     * tells the sentence, the command line puts {@code warning: } in front of it, as the other warnings of this class do.
     *
     * @param warnings what the kernel said ({@code Comparison#getWarnings()})
     * @return the lines to print
     */
    List<String> replaces(@NonNull List<String> warnings) {
        return warnings
            .stream()
            .map(warning -> "warning: " + warning)
            .toList();
    }

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
