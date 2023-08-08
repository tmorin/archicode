package io.morin.archicode.resource.workspace;

import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
public class Formatters {

    @Builder.Default
    AtomicFormatter atomic = AtomicFormatter.builder().build();

    @Builder.Default
    CompositeFormatter composite = CompositeFormatter.builder().build();

    @Builder.Default
    LinkFormatter link = LinkFormatter.builder().build();

    @Value
    @Builder
    @Jacksonized
    public static class AtomicFormatter {

        /**
         * The template of the {@link String#format(String, Object...)}
         */
        @Builder.Default
        String name = "%s";

        /**
         * The template of the {@link String#format(String, Object...)}
         */
        @Builder.Default
        String qualifiers = "%s";

        /**
         * The template of the {@link String#format(String, Object...)}
         */
        @Builder.Default
        String description = "%s";
    }

    @Value
    @Builder
    @Jacksonized
    public static class CompositeFormatter {

        /**
         * The template of the {@link String#format(String, Object...)}
         */
        @Builder.Default
        String name = "%s";

        /**
         * The template of the {@link String#format(String, Object...)}
         */
        @Builder.Default
        String qualifiers = "%s";
    }

    @Value
    @Builder
    @Jacksonized
    public static class LinkFormatter {

        /**
         * The template of the {@link String#format(String, Object...)}
         */
        @Builder.Default
        String label = "%s";

        /**
         * The template of the {@link String#format(String, Object...)}
         */
        @Builder.Default
        String qualifiers = "%s";
    }
}
