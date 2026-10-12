package io.morin.archicode.resource.story;

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
 * A story does not draw anything on its own. Each step points at a view of the workspace ({@code views}), which the
 * editor draws live from the model, so a story stays true as the architecture moves.
 */
@Value
@Builder(toBuilder = true)
@Jacksonized
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

    @Value
    @Builder(toBuilder = true)
    @Jacksonized
    public static class Step {

        /**
         * The identifier of a view of the workspace.
         */
        @NonNull
        String view;

        /**
         * What to say about the view, as plain text.
         */
        String text;
    }
}
