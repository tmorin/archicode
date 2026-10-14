package io.morin.archicode.viewpoint;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.resource.element.application.Container;
import java.util.LinkedHashSet;
import java.util.List;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * Two items, or two links, that differ are never tied, so that the order of a view is not left to the order of the sets
 * that hold them.
 */
class OrderTest {

    private static Item item(String id, String reference) {
        return Item.builder()
            .itemId(id)
            .reference(reference)
            .element(Container.builder().id("c").build())
            .kind(Item.Kind.CONTAINER)
            .build();
    }

    @Test
    void shouldOrderItemsByReferenceThenById() {
        assertTrue(item("b", "app:a").compareTo(item("a", "app:b")) < 0);
        assertTrue(item("a_x", "app:x").compareTo(item("b_x", "app:x")) < 0);
        assertTrue(item("b_x", "app:x").compareTo(item("a_x", "app:x")) > 0);
        assertEquals(0, item("a_x", "app:x").compareTo(item("a_x", "app:x")));
    }

    private static Link link(Item from, Item to, String label, String... qualifiers) {
        return Link.builder()
            .from(from)
            .to(to)
            .label(label)
            .qualifiers(new LinkedHashSet<>(List.of(qualifiers)))
            .build();
    }

    @Test
    void shouldKeepTheOrderByEndsAndLabelFirst() {
        val a = item("a", "app:a");
        val b = item("b", "app:b");
        assertTrue(link(a, b, "calls").compareTo(link(a, b, "reads")) < 0);
        assertTrue(link(a, b, "z").compareTo(link(b, a, "a")) < 0);
    }

    @Test
    void shouldNotTieLinksThatDifferOnlyByTheItemsTheyEndOn() {
        val from = item("backend", "app:backend");
        val first = item("first_idp", "app:idp");
        val second = item("second_idp", "app:idp");
        assertTrue(link(from, first, "renews").compareTo(link(from, second, "renews")) < 0);
        assertTrue(link(from, second, "renews").compareTo(link(from, first, "renews")) > 0);
        assertTrue(link(second, from, "renews").compareTo(link(first, from, "renews")) > 0);
    }

    @Test
    void shouldNotTieLinksThatDifferOnlyByTheirQualifiersOrTheirTags() {
        val a = item("a", "app:a");
        val b = item("b", "app:b");
        assertNotEquals(0, link(a, b, "calls", "gRPC").compareTo(link(a, b, "calls", "HTTPS")));
        assertEquals(
            -link(a, b, "calls", "gRPC").compareTo(link(a, b, "calls", "HTTPS")),
            link(a, b, "calls", "HTTPS").compareTo(link(a, b, "calls", "gRPC"))
        );
        val tagged = Link.builder().from(a).to(b).label("calls").tags(java.util.Map.of("audited", "yes")).build();
        assertNotEquals(0, tagged.compareTo(link(a, b, "calls")));
        assertEquals(0, link(a, b, "calls", "gRPC").compareTo(link(a, b, "calls", "gRPC")));
    }
}
