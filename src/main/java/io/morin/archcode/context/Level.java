package io.morin.archcode.context;

import java.util.Arrays;
import java.util.function.Predicate;
import lombok.NonNull;
import lombok.val;

public enum Level {
    L0,
    L1,
    L2,
    L3,
    L4;

    public static Level from(@NonNull String reference) {
        val parts = reference.split("\\.");
        return Level.values()[parts.length - 1];
    }

    public static String downReferenceTo(@NonNull String reference, @NonNull Level level) {
        val lowerParts = Arrays.copyOf(reference.split("\\."), level.ordinal() + 1);
        return String.join(".", lowerParts);
    }

    public static String downReference(@NonNull String reference) {
        val lastIndex = reference.lastIndexOf(".");
        if (lastIndex > -1) {
            return reference.substring(0, lastIndex);
        }
        return reference;
    }

    public static Level down(@NonNull Level targetFromLevel) {
        return Level.values()[Math.max(targetFromLevel.ordinal() - 1, 0)];
    }

    public static Level max(@NonNull Level a, @NonNull Level b) {
        return Level.values()[Math.max(a.ordinal(), b.ordinal())];
    }

    public Predicate<Level> isUpper() {
        return itemLevel -> this.ordinal() > itemLevel.ordinal();
    }

    public Predicate<Level> isLower() {
        return itemLevel -> this.ordinal() < itemLevel.ordinal();
    }

    public Predicate<Level> isSame() {
        return itemLevel -> this.ordinal() == itemLevel.ordinal();
    }
}
