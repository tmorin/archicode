package io.morin.archicode.resource.element.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Test;

/** What a parent holds is said once, in the model: the kinds its elements can take. */
class SolutionAndNestingTest {

    @Test
    void shouldGiveACopyOfASolutionWithOtherElements() {
        val system = System.builder().id("shop").build();
        val solution = Solution.builder().id("commerce").name("Commerce").build();

        val copy = solution.withElements(Set.of(system));

        assertEquals(Set.of(system), copy.getElements());
        assertEquals("commerce", copy.getId());
        assertEquals("Commerce", copy.getName());
        assertTrue(solution.getElements().isEmpty(), "the solution is not changed");
    }

    @Test
    void shouldListTheKindsAParentHoldsInAlphabeticalOrder() {
        assertEquals(List.of("system"), Nesting.kindsHeldBy(Solution.builder().id("s").build()));
        assertEquals(List.of("container"), Nesting.kindsHeldBy(System.builder().id("s").build()));
        assertEquals(List.of("component"), Nesting.kindsHeldBy(Container.builder().id("c").build()));
        assertEquals(List.of(), Nesting.kindsHeldBy(Person.builder().id("p").build()), "a person holds nothing");
        assertEquals(List.of(), Nesting.kindsHeldBy(Component.builder().id("c").build()), "nor does a component");
    }

    @Test
    void shouldSayWhichKindsALayerHoldsAtItsTop() {
        assertEquals(List.of("person", "solution", "system"), Nesting.kindsHeldAtTheTop(Application.builder().build()));
    }

    @Test
    void shouldHoldNoKindWhenTheTypeOfItsElementsIsNotAHierarchy() {
        // an element type with no declared subtypes: nothing can be declared under the parent
        interface Leaf extends io.morin.archicode.resource.element.Element {}
        val bare = new Parent<Leaf>() {
            public Set<Leaf> getElements() {
                return Set.of();
            }

            public Parent<Leaf> withElements(Set<Leaf> elements) {
                return this;
            }

            public Class<Leaf> elementType() {
                return Leaf.class;
            }
        };
        assertEquals(List.of(), Nesting.kindsHeldAtTheTop(bare));
    }
}
