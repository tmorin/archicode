package io.morin.archicode.viewpoint;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Component;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.Person;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import java.util.Map;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Test;

/** The kind of an item is the kind of its element, and its label is what the diagrams write in brackets. */
class ItemKindTest {

    @Test
    void shouldTellTheKindOfEachElement() {
        assertEquals(Item.Kind.PERSON, Item.Kind.from(Person.builder().id("p").build()));
        assertEquals(Item.Kind.SOLUTION, Item.Kind.from(Solution.builder().id("s").build()));
        assertEquals(Item.Kind.SYSTEM, Item.Kind.from(System.builder().id("s").build()));
        assertEquals(Item.Kind.CONTAINER, Item.Kind.from(Container.builder().id("c").build()));
        assertEquals(Item.Kind.COMPONENT, Item.Kind.from(Component.builder().id("c").build()));
        assertEquals(Item.Kind.ENVIRONMENT, Item.Kind.from(Environment.builder().id("e").build()));
        assertEquals(Item.Kind.NODE, Item.Kind.from(Node.builder().id("n").build()));
    }

    @Test
    void shouldLabelEachKindWithItsName() {
        assertEquals("Person", Item.Kind.PERSON.getLabel());
        assertEquals("Node", Item.Kind.NODE.getLabel());
    }

    @Test
    void shouldRefuseAnElementThatIsOfNoKnownKind() {
        val stranger = new Element() {
            public String getId() {
                return "x";
            }

            public String getName() {
                return null;
            }

            public String getDescription() {
                return null;
            }

            public Set<String> getQualifiers() {
                return Set.of();
            }

            public Map<String, String> getTags() {
                return Map.of();
            }

            public Set<Relationship> getRelationships() {
                return Set.of();
            }

            public Set<String> getReplaces() {
                return Set.of();
            }
        };
        assertEquals(
            "unable to find a matching for",
            assertThrows(ArchiCodeException.class, () -> Item.Kind.from(stranger)).getMessage()
        );
    }
}
