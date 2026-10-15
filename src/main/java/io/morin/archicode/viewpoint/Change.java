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
    REMOVED,
    /** An element of the more recent plateau that replaces one other ({@code replaces}): it moved or was renamed. */
    MOVED,
    /** An element that replaces one that others replace too. */
    SPLIT,
    /** An element that replaces several. */
    MERGED;

    /**
     * The change the kernel wrote ({@code none}, {@code new}, {@code changed}, {@code removed}, {@code moved}, {@code split},
     * {@code merged}).
     *
     * @param word what the kernel wrote
     * @return the change
     * @throws IllegalArgumentException when it is not one of the words of the kernel
     */
    public static Change of(@NonNull String word) {
        return switch (word) {
            case "none" -> NONE;
            case "new" -> NEW;
            case "changed" -> CHANGED;
            case "removed" -> REMOVED;
            case "moved" -> MOVED;
            case "split" -> SPLIT;
            case "merged" -> MERGED;
            default -> throw new IllegalArgumentException("unknown change: " + word);
        };
    }

    /** The word of the kernel. */
    public String word() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Anything but none: new, changed, removed, moved, split or merged. */
    public boolean isChange() {
        return this != NONE;
    }
}
