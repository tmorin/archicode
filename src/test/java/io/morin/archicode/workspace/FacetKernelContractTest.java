package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.Warnings;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.kernel.ViewpointKernel;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * What a facet does with the answer of the kernel that evaluates it: the sentence of its error, the refusal of another version
 * of the contract, and the warnings it gives, each told with the name of the facet. The kernel is a double.
 */
@QuarkusTest
class FacetKernelContractTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Warnings warnings;

    private static final Settings.Facets.Facet FACET = Settings.Facets.Facet.builder()
        .name("journey")
        .actions(
            Set.of(
                Settings.Facets.Facet.Action.builder()
                    .operator(Settings.Facets.Facet.Action.Operator.REMOVE)
                    .jsonPath("$.application..elements[?(@.id == 'x')]")
                    .build()
            )
        )
        .build();

    private io.morin.archicode.workspace.Workspace workspace() {
        return workspaceFactory.create(Workspace.builder().build(), Map.of());
    }

    private <T> T withKernelAnswering(String answer, java.util.function.Supplier<T> action) {
        try (val kernels = mockStatic(ViewpointKernel.class)) {
            val kernel = mock(ViewpointKernel.class);
            kernels.when(ViewpointKernel::getInstance).thenReturn(kernel);
            when(kernel.applyFacet(anyString())).thenReturn(answer);
            return action.get();
        }
    }

    @Test
    void shouldNameTheFacetWhoseExpressionTheKernelRefuses() {
        val workspace = workspace();
        val e = assertThrows(ArchiCodeException.class, () ->
            withKernelAnswering("{\"error\":\"the path `$[` is not JSONPath\"}", () ->
                workspaceFactory.create(workspace, FACET)
            )
        );
        assertEquals("facet journey: the path `$[` is not JSONPath", e.getMessage());
    }

    @Test
    void shouldRefuseAKernelOfAnotherVersion() {
        val workspace = workspace();
        val e = assertThrows(ArchiCodeException.class, () ->
            withKernelAnswering("{\"version\":3,\"workspace\":{}}", () -> workspaceFactory.create(workspace, FACET))
        );
        assertEquals("the viewpoint kernel speaks version 3, expected 5", e.getMessage());
    }

    @Test
    void shouldTellEachWarningOfTheKernelWithTheNameOfTheFacet() {
        val workspace = workspace();
        warnings.drain();
        val faceted = withKernelAnswering(
            "{\"version\":5,\"workspace\":{},\"warnings\":[\"a facet left nothing\",\"the path selects nothing\"]}",
            () -> workspaceFactory.create(workspace, FACET)
        );
        assertEquals(
            List.of("warning: facet journey: a facet left nothing", "warning: facet journey: the path selects nothing"),
            warnings.drain()
        );
        assertTrue(faceted.isFaceted());
    }
}
