package io.morin.archicode.viewpoint;

import java.util.Arrays;
import java.util.function.Predicate;
import lombok.Builder;
import lombok.NonNull;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;
import lombok.val;

@Value
@Builder(toBuilder = true)
@Jacksonized
public class Level {

    public static final Level L0 = Level.builder().build();
    public static final Level L1 = Level.builder().value(1).build();
    public static final Level L2 = Level.builder().value(2).build();
    public static final Level L3 = Level.builder().value(3).build();
    public static final Level L4 = Level.builder().value(4).build();

    @Builder.Default
    int value = 0;

    public static Level from(@NonNull String reference) {
        val parts = reference.split("\\.");
        return Level.builder().value(parts.length - 1).build();
    }

    public static String downReferenceTo(@NonNull String reference, @NonNull Level level) {
        val lowerParts = Arrays.copyOf(reference.split("\\."), level.value + 1);
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
        return Level.builder().value(Math.max(targetFromLevel.value - 1, 0)).build();
    }

    public static Level max(@NonNull Level a, @NonNull Level b) {
        return Level.builder().value(Math.max(a.value, b.value)).build();
    }

    public Predicate<Level> isUpper() {
        return itemLevel -> this.value > itemLevel.value;
    }

    public Predicate<Level> isLower() {
        return itemLevel -> this.value < itemLevel.value;
    }

    public Predicate<Level> isSame() {
        return itemLevel -> this.value == itemLevel.value;
    }
}
