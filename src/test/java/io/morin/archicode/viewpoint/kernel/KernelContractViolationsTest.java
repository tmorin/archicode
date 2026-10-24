package io.morin.archicode.viewpoint.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.ResourceFixtures;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * What {@link KernelViewpointFactory} does when the kernel breaks its contract or fails: the kernel is a double that answers
 * the text each case needs (the real one cannot be made to say these), and every case is a sentence for the author, never a
 * stack trace. The workspace is the real one: a system {@code sys_a} that calls {@code sys_b}.
 */
@QuarkusTest
class KernelContractViolationsTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    private io.morin.archicode.workspace.Workspace workspace() {
        val calls = Relationship.builder().destination("sys_b").label("calls").build();
        val app = Application.builder()
            .elements(
                Set.of(
                    System.builder().id("sys_a").relationships(Set.of(calls)).build(),
                    System.builder().id("sys_b").build()
                )
            )
            .build();
        return workspaceFactory.create(Workspace.builder().application(app).build(), Map.of());
    }

    /** What {@code create} makes of the view when the kernel answers {@code answer}. */
    private String failure(String viewpoint, String answer) {
        val workspace = workspace();
        val view = ResourceFixtures.createDeepViewBuilder("v", "sys_a")
            .viewpoint(viewpoint)
            .layer(View.Layer.APPLICATION)
            .build();
        val factory = viewpointServiceRepository.get(viewpoint).createViewpointFactory();
        try (val kernels = mockStatic(ViewpointKernel.class)) {
            val kernel = mock(ViewpointKernel.class);
            kernels.when(ViewpointKernel::getInstance).thenReturn(kernel);
            when(kernel.compute(org.mockito.ArgumentMatchers.anyString())).thenReturn(answer);
            return assertThrows(ArchiCodeException.class, () -> factory.create(workspace, view)).getMessage();
        }
    }

    private static final String ITEMS_A_AND_B =
        "[{\"id\":\"a\",\"reference\":\"sys_a\",\"parent\":null},{\"id\":\"b\",\"reference\":\"sys_b\",\"parent\":null}]";

    private static String linkAB(String relationships) {
        return (
            "[{\"from\":\"a\",\"to\":\"b\",\"label\":\"calls\",\"synthetic\":false,\"secondary\":false," +
            "\"qualifiers\":[],\"relationships\":" +
            relationships +
            "}]"
        );
    }

    private static String relationship(String from, String destination, String change) {
        return (
            "{\"from\":\"" +
            from +
            "\",\"destination\":\"" +
            destination +
            "\",\"label\":\"calls\",\"qualifiers\":[],\"tags\":{}" +
            (change == null ? "" : ",\"change\":\"" + change + "\"") +
            "}"
        );
    }

    private static String answer(int version, String items, String links) {
        return "{\"version\":" + version + ",\"items\":" + items + ",\"links\":" + links + "}";
    }

    @Test
    void shouldTellTheErrorOfTheKernelAsItIs() {
        assertEquals(
            "the focal element is nowhere",
            failure("overview", "{\"error\":\"the focal element is nowhere\"}")
        );
    }

    @Test
    void shouldNameTheViewWhenAMapFails() {
        assertEquals("the view v: the layer is empty", failure("map", "{\"error\":\"the layer is empty\"}"));
    }

    @Test
    void shouldKeepTheWordsOfTheKernelForADanglingReferenceNoElementDeclares() {
        assertEquals(
            "dangling reference: nowhere",
            failure("overview", "{\"error\":\"dangling reference: nowhere\"}"),
            "only a view names it: there is no file to point at"
        );
    }

    @Test
    void shouldRefuseAKernelOfAnotherVersion() {
        assertEquals("the viewpoint kernel speaks version 4, expected 5", failure("overview", answer(4, "[]", "[]")));
        assertEquals(
            "the viewpoint kernel speaks version , expected 5",
            failure("overview", "{\"items\":[],\"links\":[]}"),
            "an answer with no version"
        );
    }

    @Test
    void shouldRefuseTwoItemsWithTheSameId() {
        val twice =
            "[{\"id\":\"a\",\"reference\":\"sys_a\",\"parent\":null},{\"id\":\"a\",\"reference\":\"sys_b\",\"parent\":null}]";
        assertEquals(
            "the viewpoint kernel gave the same id a to app:sys_a and to app:sys_b",
            failure("overview", answer(5, twice, "[]"))
        );
    }

    @Test
    void shouldRefuseALinkBetweenItemsItDidNotDraw() {
        val onlyA = "[{\"id\":\"a\",\"reference\":\"sys_a\",\"parent\":null}]";
        assertEquals(
            "the kernel linked unknown items \"a\" and \"b\"",
            failure("overview", answer(5, onlyA, linkAB("[]")))
        );
    }

    @Test
    void shouldRefuseALinkWhoseRelationshipHasNoOwner() {
        assertEquals(
            "unable to find the element nobody",
            failure("overview", answer(5, ITEMS_A_AND_B, linkAB("[" + relationship("nobody", "sys_b", null) + "]")))
        );
    }

    @Test
    void shouldRefuseALinkWhoseRelationshipNobodyDeclares() {
        assertEquals(
            "unable to find the relationship from sys_a to sys_c",
            failure("overview", answer(5, ITEMS_A_AND_B, linkAB("[" + relationship("sys_a", "sys_c", null) + "]")))
        );
    }

    @Test
    void shouldDrawTheRelationshipOnlyTheBaseDeclaredAsTheComparisonSaysIt() {
        val workspace = workspace();
        val view = ResourceFixtures.createDeepViewBuilder("v", "sys_a").layer(View.Layer.APPLICATION).build();
        val factory = viewpointServiceRepository.get("overview").createViewpointFactory();
        try (val kernels = mockStatic(ViewpointKernel.class)) {
            val kernel = mock(ViewpointKernel.class);
            kernels.when(ViewpointKernel::getInstance).thenReturn(kernel);
            when(kernel.compute(org.mockito.ArgumentMatchers.anyString())).thenReturn(
                answer(5, ITEMS_A_AND_B, linkAB("[" + relationship("sys_a", "sys_c", "removed") + "]"))
            );
            val viewpoint = factory.create(workspace, view);
            assertEquals(2, viewpoint.getItems().size());
            val link = viewpoint.getLinks().iterator().next();
            val relationship = link.getRelationships().iterator().next();
            assertEquals("sys_c", relationship.getDestination());
            assertEquals("calls", relationship.getLabel());
        }
    }
}
