package io.morin.archicode.viewpoint;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.morin.archicode.MapperFactory;
import org.junit.jupiter.api.Test;

/**
 * A viewpoint that is not about comparing two plateaus implements one method only, and gets the others as they are: the
 * factory of its views whatever the comparison, no builder of views of its own, and no use for a mapper.
 */
class ViewpointServiceDefaultsTest {

    private static final ViewpointFactory FACTORY = (workspace, view) -> null;

    private final ViewpointService service = new ViewpointService() {
        @Override
        public String getName() {
            return "sequence";
        }

        @Override
        public ViewpointFactory createViewpointFactory() {
            return FACTORY;
        }
    };

    @Test
    void shouldGiveTheSameFactoryWhateverTheComparison() {
        assertSame(FACTORY, service.createViewpointFactory(null, false));
        assertSame(FACTORY, service.createViewpointFactory(null, true));
    }

    @Test
    void shouldBuildNoViewOfItsOwn() {
        assertEquals(
            java.util.Optional.empty(),
            service.createViewBuilder(
                "shop",
                io.morin.archicode.resource.element.application.System.builder().id("shop").build(),
                io.morin.archicode.resource.workspace.Settings.Views.builder().build(),
                null
            )
        );
    }

    @Test
    void shouldTakeAMapperWithoutUsingIt() {
        assertDoesNotThrow(() -> service.setMapperFactory(new MapperFactory()));
        assertThrows(NullPointerException.class, () -> service.setMapperFactory(null), "a mapper must be given");
        assertNotNull(service.getName());
    }
}
