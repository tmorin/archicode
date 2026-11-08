package io.morin.archicode.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import lombok.val;
import org.junit.jupiter.api.Test;

class ImportIdsTest {

    @Test
    void camelCaseIsLowercasedAndNotRewritten() {
        assertEquals("paymentservice", ImportIds.slug("PaymentService"));
        assertFalse(ImportIds.rewritesCharacter("PaymentService", false));
    }

    @Test
    void oddCharactersBecomeOneUnderscoreAndAreARewrite() {
        assertEquals("a_b_c", ImportIds.slug("  a!!b @ c  "));
        assertTrue(ImportIds.rewritesCharacter("a!b", false));
    }

    @Test
    void aSpaceIsARewriteOnlyWhenAsked() {
        assertEquals("web_app", ImportIds.slug("Web App"));
        assertFalse(ImportIds.rewritesCharacter("Web App", false));
        assertTrue(ImportIds.rewritesCharacter("Web App", true));
    }

    @Test
    void aSegmentCannotBeDotsOrSlashes() {
        assertEquals("", ImportIds.slug(".."));
        assertFalse(ImportIds.hasAlphanumeric(ImportIds.slug("..")));
        assertEquals("x_y", ImportIds.slug("x/y"));
        assertTrue(ImportIds.rewritesCharacter("x/y", false));
    }

    @Test
    void aNameWithoutLetterOrDigitHasNoAlphanumeric() {
        assertFalse(ImportIds.hasAlphanumeric(""));
        assertTrue(ImportIds.hasAlphanumeric("a"));
    }

    @Test
    void aCollisionTakesTheFirstFreeSuffix() {
        val assigned = ImportIds.assign(List.of("x", "x", "x"), List.of(false, false, false));
        assertEquals(List.of("x", "x_2", "x_3"), assigned.ids());
        assertEquals(List.of(false, true, true), assigned.rewritten());
    }

    @Test
    void aSuffixSkipsASiblingAlreadyNamedX2() {
        val assigned = ImportIds.assign(List.of("x", "x", "x_2"), List.of(false, false, false));
        assertEquals(List.of("x", "x_3", "x_2"), assigned.ids());
        assertEquals(List.of(false, true, false), assigned.rewritten());
    }
}
