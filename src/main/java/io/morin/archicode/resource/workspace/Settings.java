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
     * The id of the plateau that is drawn when none is asked for. Optional: the last plateau when the plateaus form one
     * line.
     */
    String current;

    @Builder.Default
    Relationships relationships = Relationships.builder().build();

    @Builder.Default
    Views views = Views.builder().build();

    @Builder.Default
    Facets facets = Facets.builder().build();

    /**
     * A plateau as the commands and the comparison read it: the architecture at a point of its life. It is made from the
     * tree of the layers ({@code io.morin.archicode.resource.plateau.PlateauTree}), never read from a file.
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
         * The id of the plateau this one overrides, and is compared with by default; null for {@code baseline}, the root.
         */
        String baseline;
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
