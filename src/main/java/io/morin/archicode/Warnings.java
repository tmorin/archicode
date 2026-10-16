package io.morin.archicode;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import lombok.NonNull;
import lombok.val;

/**
 * The channel of the warnings of the application: what is wrong, or odd, in what the author wrote, and that the command
 * goes on with all the same (a facet written in the old dialect, a story step on a view nobody declared, a viewpoint that
 * the command line does not generate, what the comparison of two plateaus ignored).
 *
 * <p>{@code application.properties} sets {@code quarkus.log.level=ERROR}, which hides {@code log.warn}: a warning that
 * nobody reads is no warning, and the standard output is for the files and the tables. So a warning is not logged, it is
 * kept here, and the command line prints it on its error output when the command ends ({@code ErrorOutput}), once for a
 * sentence said many times (a facet is applied to more than one workspace), in the order it was said.
 */
@ApplicationScoped
public class Warnings {

    static final String PREFIX = "warning: ";

    private final LinkedHashSet<String> pending = new LinkedHashSet<>();

    /**
     * Keep a warning for the error output.
     *
     * @param sentence what is wrong, in a sentence that stands alone, without {@code warning:} in front of it
     */
    public synchronized void warn(@NonNull String sentence) {
        pending.add(PREFIX + sentence);
    }

    /**
     * Keep a warning, whose sentence is a format.
     *
     * @param format the sentence, as {@link String#format(String, Object...)} takes it
     * @param args   what the sentence tells
     */
    public void warn(@NonNull String format, Object... args) {
        warn(String.format(format, args));
    }

    /**
     * Keep every sentence of a list.
     *
     * @param sentences the sentences, in the order they are printed
     */
    public synchronized void warnAll(@NonNull List<String> sentences) {
        sentences.forEach(this::warn);
    }

    /**
     * Take the warnings kept so far, and forget them.
     *
     * @return the lines to print, in the order they were said
     */
    public synchronized List<String> drain() {
        val lines = new ArrayList<>(pending);
        pending.clear();
        return lines;
    }
}
