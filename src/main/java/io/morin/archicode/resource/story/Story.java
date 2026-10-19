package io.morin.archicode.resource.story;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.List;
import lombok.Builder;
import lombok.NonNull;
import lombok.Singular;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

/**
 * A story: diagrams put in order, each with the sentence that carries the reader to the next one.
 * <p>
 * A story does not draw anything on its own. Each step points at a view of the workspace, or carries its own, and the
 * editor draws it live from the model, so a story stays true as the architecture moves.
 * <p>
 * It is a manifest of its own ({@code archicode.morin.io/story}), one file per story.
 */
@Value
@Builder(toBuilder = true)
@Jacksonized
@JsonIgnoreProperties(ignoreUnknown = true)
@ToString(onlyExplicitlyIncluded = true)
public class Story {

    /**
     * The identifier of the story.
     */
    @NonNull
    @ToString.Include
    String id;

    /**
     * The human name of the story.
     */
    String name;

    /**
     * What the story is about, in a few words.
     */
    String description;

    /**
     * The steps, in the order they are told.
     */
    @Singular
    List<Step> steps;

    /**
     * A step: a view, and what to say about it. The view is either named ({@code view}, the id of a view of the
     * workspace) or written right here ({@code viewpoint}, {@code layer} and {@code properties}, as in a view).
     */
    @Value
    @Builder(toBuilder = true)
    @Jacksonized
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Step {

        /**
         * The identifier of a view of the workspace. Absent when the step carries its own view.
         */
        String view;

        /**
         * The viewpoint of the view the step carries (instead of naming one).
         */
        String viewpoint;

        /**
         * The layer of the view the step carries.
         */
        io.morin.archicode.resource.view.View.Layer layer;

        /**
         * The properties of the view the step carries.
         */
        @JsonSetter(nulls = Nulls.SET)
        com.fasterxml.jackson.databind.JsonNode properties;

        /**
         * A name for the view the step carries.
         */
        String name;

        /**
         * What to say about the view, as plain text.
         */
        String text;
    }
}
