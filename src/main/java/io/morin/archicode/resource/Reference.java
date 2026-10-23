package io.morin.archicode.resource;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Marks a key (or a list) that names something else: an element, a plateau or a view. The schema of
 * {@code archicode query schemas manifest} reads the mark and tells the form of the reference and what it must resolve to.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ ElementType.FIELD, ElementType.METHOD })
public @interface Reference {
    /**
     * @return what the key names
     */
    To value();

    /** What a reference names, with its form and what the loader checks of it. */
    @Getter
    @RequiredArgsConstructor
    enum To {
        /** An element of a layer: the ids of its path from the root of the layer, joined by dots. */
        ELEMENT(
            "^[^.]+(\\.[^.]+)*$",
            "A reference to an element of the same layer: the ids from the root of the layer, joined by dots (`shop.web.api`). It must exist in the plateau."
        ),
        /** A plateau, by its identifier. */
        PLATEAU("^[a-z0-9_-]+$", "The identifier of a plateau of the workspace."),
        /** A view, by its identifier. */
        VIEW(null, "The identifier of a view declared in the workspace.");

        /** The form of the reference, as a regular expression; null when any text is a reference. */
        private final String pattern;

        /** What the schema tells the author. */
        private final String description;
    }
}
