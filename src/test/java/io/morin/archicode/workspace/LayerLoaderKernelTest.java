package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.viewpoint.kernel.ViewpointKernel;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * How a plateau is loaded when the kernel, which applies its patches, breaks its contract or says it cannot: the kernel is a
 * double that answers the text each case needs, the workspace is the manual's {@code domain_plateaus} (the plateau {@code to-be}
 * has patches). Each case is one sentence for the author.
 */
@QuarkusTest
class LayerLoaderKernelTest {

    private static final Path WORKSPACE = Path.of("src/doc/examples/domain_plateaus/.archicode.yaml");

    @Inject
    WorkspaceFactory workspaceFactory;

    /** The message of the failure to load {@code to-be} when the kernel answers {@code answer} to the patches. */
    private String failure(String answer) {
        try (val kernels = mockStatic(ViewpointKernel.class)) {
            val kernel = mock(ViewpointKernel.class);
            kernels.when(ViewpointKernel::getInstance).thenReturn(kernel);
            when(kernel.applyPatches(anyString())).thenReturn(answer);
            return assertThrows(ArchiCodeException.class, () ->
                workspaceFactory.create(WORKSPACE, null, "to-be")
            ).getMessage();
        }
    }

    @Test
    void shouldTellTheErrorTheKernelFindsInAPatch() {
        assertEquals("the patch selects nothing", failure("{\"error\":\"the patch selects nothing\"}"));
    }

    @Test
    void shouldRefuseAKernelOfAnotherVersion() {
        assertEquals(
            "the viewpoint kernel speaks version 4, expected 5",
            failure("{\"version\":4,\"workspace\":{},\"removed\":[],\"dropped\":[]}")
        );
    }

    @Test
    void shouldSayWhichPlateauHoldsElementsTheModelCannotRead() {
        val message = failure(
            "{\"version\":5,\"workspace\":{\"application\":{\"elements\":[{\"kind\":\"nonsense\",\"id\":\"x\"}]}}," +
                "\"removed\":[],\"dropped\":[]}"
        );
        assertTrue(
            message.startsWith("in the plateau `to-be`, the elements cannot be read once the patches are applied: "),
            message
        );
        assertTrue(message.contains("unknown kind `nonsense`"), message);
        assertTrue(!message.contains("a file is not valid"), "the sentence is about the plateau, not about a file");
    }
}
