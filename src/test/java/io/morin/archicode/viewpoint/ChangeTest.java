package io.morin.archicode.viewpoint;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import lombok.val;
import org.junit.jupiter.api.Test;

/** A change is one of the words of the kernel, and no other. */
class ChangeTest {

    @Test
    void shouldReadEachWordOfTheKernelBack() {
        for (val change : Change.values()) {
            assertEquals(change, Change.of(change.word()), change.name());
        }
        assertEquals(Change.MERGED, Change.of("merged"));
    }

    @Test
    void shouldRefuseAWordTheKernelDoesNotSay() {
        assertEquals(
            "unknown change: renamed",
            assertThrows(IllegalArgumentException.class, () -> Change.of("renamed")).getMessage()
        );
    }
}
