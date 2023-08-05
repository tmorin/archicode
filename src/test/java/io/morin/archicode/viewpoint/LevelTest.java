package io.morin.archicode.viewpoint;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class LevelTest {

    @Test
    void isLower() {
        Assertions.assertTrue(Level.L3.isUpper().test(Level.L2));
    }

    @Test
    void isLowerOrSame() {
        Assertions.assertFalse(Level.L3.isUpper().or(Level.L3.isSame()).test(Level.L4));
    }

    @Test
    void isUpper() {
        Assertions.assertTrue(Level.L3.isLower().test(Level.L4));
    }

    @Test
    void isSame() {
        Assertions.assertTrue(Level.L3.isSame().test(Level.L3));
    }
}
