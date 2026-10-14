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

    /**
     * The name of the workspace, shown by the editor in place of the name of the folder. Optional: a workspace without
     * one is still valid.
     */
    String name;

    @Builder.Default
    Manifests manifests = Manifests.builder().build();

    /**
     * The plateaus of the architecture: the states it goes through, each one a complete folder of manifests. An ordered
     * list (the order is the one of the author, the last is the latest), never a set. Empty for a workspace that has
     * one set of manifests, which is {@link Manifests#getPaths()}.
     */
    @Builder.Default
    List<Plateau> plateaus = new ArrayList<>();

    /**
     * The id of the plateau that is drawn when none is asked for. Optional: the last plateau of the list when absent.
     */
    String current;

    @Builder.Default
    Relationships relationships = Relationships.builder().build();

    @Builder.Default
    Views views = Views.builder().build();

    @Builder.Default
    Facets facets = Facets.builder().build();

    /**
     * A plateau: the architecture at a point of its life, as a folder of manifests below the folder of the workspace.
     * The key {@code from} is reserved (a plateau built as an increment on top of another one) and refused for now.
     */
    @Value
    @Jacksonized
    @Builder(toBuilder = true)
    public static class Plateau {

        /**
         * The identifier, unique among the plateaus: what {@code --plateau} and {@code current} name.
         */
        String id;

        /**
         * The name shown to people. Optional: the id when absent.
         */
        String name;

        /**
         * A free-text label for when the plateau is meant to hold, such as {@code 2027-Q1}. Optional, never parsed nor
         * interpreted.
         */
        String horizon;

        /**
         * The folder of the manifests, relative to the folder of the workspace file, below it.
         */
        String path;
    }

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

            /**
             * Leave out, from the views of the technology layer, the elements none of the links of the facet goes through.
             */
            @Builder.Default
            @JsonAlias("hide-unlinked")
            boolean hideUnlinked = false;

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
