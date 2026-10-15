package io.morin.archicode.viewpoint.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** The label as the viewpoint kernel compares it ({@code R::of} in {@code compare.rs}): trimmed, and empty is none. */
class RelationshipLabelTest {

    @Test
    void shouldTrimTheEdgesLikeTheKernelDoes() {
        assertEquals("calls", RelationshipLabel.normalize("calls"));
        assertEquals("calls", RelationshipLabel.normalize("  calls\t\n"));
        assertEquals("a  b", RelationshipLabel.normalize(" a  b "));
        // Rust's trim follows the Unicode White_Space property: the no-break space is trimmed, the zero-width space is not
        assertEquals("calls", RelationshipLabel.normalize(" calls　"));
        assertEquals("​calls", RelationshipLabel.normalize("​calls "));
    }

    @Test
    void shouldTreatAnEmptyLabelAsNoLabel() {
        assertNull(RelationshipLabel.normalize(null));
        assertNull(RelationshipLabel.normalize(""));
        assertNull(RelationshipLabel.normalize(" \t\r\n "));
    }

    @Test
    void shouldCompareTwoLabelsAsTheKernelDoes() {
        assertTrue(RelationshipLabel.same("calls ", "calls"));
        assertTrue(RelationshipLabel.same("", null));
        assertTrue(RelationshipLabel.same(null, "  "));
        assertFalse(RelationshipLabel.same("calls", "reads"));
        assertFalse(RelationshipLabel.same("calls", null));
    }
}
