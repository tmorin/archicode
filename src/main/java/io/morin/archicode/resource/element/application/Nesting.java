package io.morin.archicode.resource.element.application;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import io.morin.archicode.resource.element.Element;
import java.util.Arrays;
import java.util.List;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * Which kind of element a parent holds. The model says it once: a parent is a {@link Parent} of an interface
 * ({@link Parent#elementType()}), and the kinds that implement the interface are the kinds that can be declared under it. The
 * reader of the files (Jackson) and the check made when an element is declared under a parent with {@code header.parent} both
 * read it here. The editor keeps a table of the same rule ({@code READ_SCHEMA} in {@code standalone.html}), which
 * {@code EditorReadSchemaTest} compares with these classes.
 */
@UtilityClass
public class Nesting {

    /**
     * Whether an element can be a child of another one.
     *
     * @param parent the element that would hold it
     * @param child  the element
     * @return true when {@code parent} is a {@link Parent} whose children can be a {@code child}
     */
    public boolean holds(Element parent, Element child) {
        return parent instanceof Parent<?> holder && holder.elementType().isInstance(child);
    }

    /**
     * The kinds an element can hold, in alphabetical order; none for an element that cannot hold any (a person, a component).
     *
     * @param parent the element
     * @return the names of the kinds, as a manifest or a nested element writes them
     */
    public List<String> kindsHeldBy(Element parent) {
        if (!(parent instanceof Parent<?> holder)) {
            return List.of();
        }
        val annotation = holder.elementType().getAnnotation(JsonSubTypes.class);
        return annotation == null
            ? List.of()
            : Arrays.stream(annotation.value()).map(JsonSubTypes.Type::name).sorted().toList();
    }
}
