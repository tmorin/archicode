package io.morin.archicode.rendering.gap;

import java.util.Locale;

/**
 * The formats of the table of changes between two plateaus.
 */
public enum GapFormat {
    TEXT("txt"),
    MARKDOWN("md"),
    JSON("json");

    private final String extension;

    GapFormat(String extension) {
        this.extension = extension;
    }

    /** The extension of a file in that format. */
    public String extension() {
        return extension;
    }

    /**
     * @param value {@code text}, {@code markdown} or {@code json}, in any case
     * @return the format
     * @throws IllegalArgumentException for any other word
     */
    public static GapFormat of(String value) {
        return GapFormat.valueOf(value.toUpperCase(Locale.ROOT));
    }
}
