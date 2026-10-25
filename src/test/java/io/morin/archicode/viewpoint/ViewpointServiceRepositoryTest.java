package io.morin.archicode.viewpoint;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.morin.archicode.ArchiCodeException;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ViewpointServiceRepositoryTest {

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @Test
    void shouldSayWhichViewpointsThereAreForAnUnknownOne() {
        val failure = assertThrows(ArchiCodeException.class, () -> viewpointServiceRepository.get("nope"));
        assertEquals("unknown viewpoint `nope` (known: deep, detailed, map, overview)", failure.getMessage());
    }
}
