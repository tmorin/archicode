package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.workspace.Workspace;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * What a {@code REMOVE} took besides what it selected, kept to what the plateau compared with has: an element that left with
 * the selected one, an entry taken out of an element that stays. The plateau is a small invented one: two systems, one of them
 * calling the other twice (with and without a label), an environment that uses another and holds a node that hosts a system.
 */
@QuarkusTest
class RemovalTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    private io.morin.archicode.workspace.Workspace base() {
        val calls = Relationship.builder().destination("sys_b").label("calls").build();
        val unlabeled = Relationship.builder().destination("sys_b").build();
        val app = Application.builder()
            .elements(
                Set.of(
                    System.builder().id("sys_a").relationships(Set.of(calls, unlabeled)).build(),
                    System.builder().id("sys_b").build()
                )
            )
            .build();
        val node = Node.builder().id("node_a").applications(Set.of("sys_a")).build();
        val technology = Technology.builder()
            .elements(
                Set.of(
                    Environment.builder().id("env_a").uses(Set.of("env_b")).elements(Set.of(node)).build(),
                    Environment.builder().id("env_b").build()
                )
            )
            .build();
        return workspaceFactory.create(Workspace.builder().application(app).technology(technology).build(), Map.of());
    }

    private static Removal removal(List<Removal.Ref> removed, List<Removal.Dropped> dropped) {
        return new Removal(
            "p",
            2,
            "REMOVE",
            "target sys_c",
            List.of(new Removal.Ref("application", "sys_c")),
            removed,
            dropped
        );
    }

    @Test
    void shouldListTheElementsThatLeftWithTheSelectedOneAndThatThePlateauHas() {
        val removal = removal(
            List.of(
                new Removal.Ref("application", "sys_c"),
                new Removal.Ref("technology", "env_b"),
                new Removal.Ref("application", "sys_b"),
                new Removal.Ref("application", "sys_unknown")
            ),
            List.of()
        );
        assertEquals(
            List.of(
                new Removal.Effect("p", 2, "REMOVE target sys_c", "removed", "application", "sys_b", ""),
                new Removal.Effect("p", 2, "REMOVE target sys_c", "removed", "technology", "env_b", "")
            ),
            removal.effects(base()),
            "the selected element is the patch's own, an element the plateau lacks is no part of the difference"
        );
    }

    @Test
    void shouldListTheEntriesTakenOutOfTheElementsThatStayInTheOrderOfTheTable() {
        val removal = removal(
            List.of(),
            List.of(
                new Removal.Dropped("technology", "env_a.node_a", "applications", "sys_a", null),
                new Removal.Dropped("technology", "env_a", "uses", "env_b", null),
                new Removal.Dropped("application", "sys_a", "relationships", "sys_b", null),
                new Removal.Dropped("application", "sys_a", "relationships", "sys_b", "calls")
            )
        );
        assertEquals(
            List.of(
                new Removal.Effect(
                    "p",
                    2,
                    "REMOVE target sys_c",
                    "dropped",
                    "application",
                    "sys_a",
                    "relationships: sys_b"
                ),
                new Removal.Effect(
                    "p",
                    2,
                    "REMOVE target sys_c",
                    "dropped",
                    "application",
                    "sys_a",
                    "relationships: sys_b (calls)"
                ),
                new Removal.Effect("p", 2, "REMOVE target sys_c", "dropped", "technology", "env_a", "uses: env_b"),
                new Removal.Effect(
                    "p",
                    2,
                    "REMOVE target sys_c",
                    "dropped",
                    "technology",
                    "env_a.node_a",
                    "applications: sys_a"
                )
            ),
            removal.effects(base())
        );
    }

    @Test
    void shouldLeaveOutAnEntryThePlateauDidNotHold() {
        val removal = removal(
            List.of(),
            List.of(
                // the holder is not in the plateau
                new Removal.Dropped("application", "nobody", "relationships", "sys_b", null),
                // the holder has no such relationship (a label it never had, a destination it never had) or no relationships at all
                new Removal.Dropped("application", "sys_a", "relationships", "sys_b", "other label"),
                new Removal.Dropped("application", "sys_a", "relationships", "sys_zzz", null),
                new Removal.Dropped("application", "sys_b", "relationships", "sys_a", null),
                // a field the holder does not have: uses on a system, applications on an environment, uses it never held
                new Removal.Dropped("application", "sys_a", "uses", "env_b", null),
                new Removal.Dropped("technology", "env_a", "applications", "sys_a", null),
                new Removal.Dropped("technology", "env_a", "uses", "env_zzz", null),
                new Removal.Dropped("technology", "env_b", "uses", "env_a", null),
                new Removal.Dropped("technology", "env_a.node_a", "applications", "sys_b", null),
                new Removal.Dropped("technology", "env_a", "elements", "x", null)
            )
        );
        assertTrue(removal.effects(base()).isEmpty(), String.valueOf(removal.effects(base())));
    }

    @Test
    void shouldSayTheEntryWithItsLabelOnlyWhenItHasOne() {
        assertEquals("sys_b", new Removal.Dropped("application", "sys_a", "relationships", "sys_b", null).text());
        assertEquals(
            "sys_b (calls)",
            new Removal.Dropped("application", "sys_a", "relationships", "sys_b", "calls").text()
        );
    }

    @Test
    void shouldHaveNoCascadeWithoutRemovals() {
        assertTrue(Removal.cascade(List.of(), base()).isEmpty());
        val removal = removal(List.of(new Removal.Ref("application", "sys_b")), List.of());
        assertEquals(1, Removal.cascade(List.of(removal, removal(List.of(), List.of())), base()).size());
    }
}
