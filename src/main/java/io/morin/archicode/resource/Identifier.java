package io.morin.archicode.resource;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.regex.Pattern;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Marks a key that holds the identifier of an element or of a plateau, and says the rule the loader holds it to. The schema of
 * {@code archicode query schemas manifest} reads the mark, so the rule is written once, here, and not in the schema.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ ElementType.FIELD, ElementType.METHOD })
public @interface Identifier {
    /**
     * @return what the key identifies
     */
    Of value();

    /** What an identifier identifies, with the rule the loader enforces and what the author is advised to write. */
    @Getter
    @RequiredArgsConstructor
    enum Of {
        /**
         * An element: one level of a reference, so it holds no dot (a dot separates the levels, see {@code ManifestParser#dottedId}).
         */
        ELEMENT(
            "^[^.]+$",
            "The identifier of the element: one level of its reference, so it holds no dot. Write lowercase letters, digits, `_` and `-`."
        ),
        /** A plateau: the characters {@code PlateauTree} accepts. */
        PLATEAU(
            "^[a-z0-9_-]+$",
            "The identifier of the plateau: lowercase letters, digits, `_` and `-`, declared once. `baseline` is the implicit root."
        );

        /** The regular expression the loader holds the identifier to. */
        private final String pattern;

        /** What the schema tells the author. */
        private final String description;

        /**
         * @return the compiled rule, as the loader applies it to the whole text
         */
        public Pattern compiled() {
            return Pattern.compile(pattern);
        }
    }
}
