package io.morin.archicode.viewpoint;

import java.util.Locale;
import lombok.NonNull;

/**
 * What happened to an element, a relationship or a link between two plateaus, in the words of the viewpoint kernel.
 *
 * <p>{@link #NONE} is also what a view that was not asked to compare anything says of all it draws: a renderer that
 * draws {@code NONE} as it always did draws such a view as it always did.
 */
public enum Change {
    NONE,
    NEW,
    CHANGED,
    REMOVED;

    /**
     * The change the kernel wrote ({@code none}, {@code new}, {@code changed}, {@code removed}).
     *
     * @param word what the kernel wrote
     * @return the change
     * @throws IllegalArgumentException when it is not one of the four words
     */
    public static Change of(@NonNull String word) {
        return switch (word) {
            case "none" -> NONE;
            case "new" -> NEW;
            case "changed" -> CHANGED;
            case "removed" -> REMOVED;
            default -> throw new IllegalArgumentException("unknown change: " + word);
        };
    }

    /** The word of the kernel. */
    public String word() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** New, changed or removed. */
    public boolean isChange() {
        return this != NONE;
    }
}
