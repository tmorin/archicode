package io.morin.archicode.resource.workspace;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;
import lombok.Builder;
import lombok.NonNull;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Jacksonized
@Builder(toBuilder = true)
public class Settings {

    @Builder.Default
    Manifests manifests = Manifests.builder().build();

    @Builder.Default
    Relationships relationships = Relationships.builder().build();

    @Builder.Default
    Views views = Views.builder().build();

    @Builder.Default
    Facets facets = Facets.builder().build();

    @Value
    @Jacksonized
    @Builder(toBuilder = true)
    public static class Manifests {

        @Builder.Default
        Set<String> paths = new HashSet<>(Set.of("manifests"));
    }

    @Value
    @Jacksonized
    @Builder(toBuilder = true)
    public static class Relationships {

        @Builder.Default
        @JsonProperty("default-synthetic-label")
        String defaultSyntheticLabel = "uses";
    }

    @Value
    @Jacksonized
    @Builder(toBuilder = true)
    public static class Views {

        /**
         * The default folder for the generated views.
         */
        @Builder.Default
        String path = "views";

        /**
         * The default label.
         */
        @Builder.Default
        Map<String, String> labels = new LinkedHashMap<>();

        /**
         * The default properties.
         */
        @Builder.Default
        Map<String, ObjectNode> properties = new LinkedHashMap<>();
    }

    @Value
    @Jacksonized
    @Builder(toBuilder = true)
    public static class Facets {

        /**
         * Enable/disable the global facet.
         */
        @Builder.Default
        @JsonAlias("global-enabled")
        boolean globalEnabled = true;

        /**
         * The template of the directory name.
         * <p>
         * The format follows {@link String#format(String, Object...)}.
         */
        @NonNull
        @Builder.Default
        @JsonAlias("directory-name-template")
        String directoryNameTemplate = "%s-%s";

        /**
         * The custom facets.
         */
        @Builder.Default
        Set<Facet> customs = new HashSet<>();

        @Value
        @Jacksonized
        @Builder(toBuilder = true)
        public static class Facet {

            /**
             * The name of the facet.
             */
            @NonNull
            String name;

            /**
             * A set of expression.
             */
            @Builder.Default
            Set<Action> actions = new LinkedHashSet<>();

            @Value
            @Jacksonized
            @Builder(toBuilder = true)
            public static class Action {

                @NonNull
                Operator operator;

                @NonNull
                @JsonAlias("json-path")
                String jsonPath;

                public enum Operator {
                    REMOVE
                }
            }
        }
    }
}
