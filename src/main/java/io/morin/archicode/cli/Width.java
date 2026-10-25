package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.rendering.gap.GapReport;
import lombok.experimental.UtilityClass;

/**
 * The number of columns that {@code archicode diff --width} wraps the text table to.
 *
 * <p>The option is read as text, so that a value that is not a number is the one {@code error:} line of the other options of
 * the command and not picocli's usage error; like {@code --fail-on}, it is checked before anything is loaded.
 */
@UtilityClass
class Width {

    /**
     * @param value what was written after {@code --width}, or null
     * @return the number of columns, or {@link GapReport#NO_WIDTH} when the option is not given
     * @throws ArchiCodeException when the value is not a whole number above zero
     */
    static int parse(String value) {
        if (value == null) {
            return GapReport.NO_WIDTH;
        }
        try {
            final int columns = Integer.parseInt(value.trim());
            if (columns > 0) {
                return columns;
            }
        } catch (NumberFormatException ignored) {
            // the same sentence as for a number that is not above zero
        }
        throw new ArchiCodeException(
            "`--width` must be a whole number of columns above zero, for example 100: `%s` is not",
            value
        );
    }
}
