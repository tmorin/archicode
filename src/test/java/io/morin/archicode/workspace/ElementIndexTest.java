package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.Person;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Test;

/** The index of a layer: the element of a reference, the reference of an element, and what is asked of a reference that is none. */
class ElementIndexTest {

    private final Person customer = Person.builder().id("customer").build();
    private final Container web = Container.builder().id("web").build();

    private ElementIndex index() {
        val index = ElementIndex.builder().build();
        index.elementByReferenceIndex.put("customer", customer);
        index.elementByReferenceIndex.put("shop.web", web);
        index.referenceByElementIndex.put(customer, "customer");
        index.referenceByElementIndex.put(web, "shop.web");
        return index;
    }

    @Test
    void shouldFindTheElementOfAReference() {
        assertSame(web, index().getElementByReference("shop.web"));
        assertSame(customer, index().searchElement("customer").orElseThrow());
        assertEquals("shop.web", index().getReferenceByElement(web));
    }

    @Test
    void shouldSayWhichReferenceIsUnknown() {
        assertTrue(index().searchElement("shop").isEmpty());
        assertEquals(
            "unable to find the element shop",
            assertThrows(ArchiCodeException.class, () -> index().getElementByReference("shop")).getMessage()
        );
    }

    @Test
    void shouldListTheReferencesOfTheElementsThatMatch() {
        assertEquals(Set.of("shop.web"), index().listAllElementReferences(element -> element instanceof Container));
        assertEquals(Set.of("customer", "shop.web"), index().listAllElementReferences(element -> true));
        assertEquals(Set.of(), index().listAllElementReferences(element -> false));
    }
}
