package io.morin.archicode.resource.element;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.morin.archicode.resource.element.application.Relationship;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Getter
@EqualsAndHashCode
@SuperBuilder(toBuilder = true)
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public abstract class AbstractElement implements Element {

    /**
     * The identifier of the element.
     * <p>
     * Its format should match the variable name in Java or Javascript.
     */
    @NonNull
    @JsonProperty(required = true)
    String id;

    /**
     * The human name of the element.
     */
    String name;

    /**
     * A short description of the element, usually between 25 and 75 words.
     */
    String description;

    /**
     * A list of specific characteristics that helps define or categorize the element.
     * <p>
     * They are usually rendered in views.
     * It can be the name of the main framework used to implement a container: Spring Boot.
     * Or it can be the name of the RDMS for a database Container : PostgreSQL.
     */
    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<String> qualifiers = new LinkedHashSet<>();

    /**
     * A list of key/value pairs that helps to drive the rendering of views.
     * <p>
     * For instance, to assign a predefined shape to the element or to categorize the element during a threat modeling process.
     */
    @Builder.Default
    @JsonDeserialize(as = LinkedHashMap.class)
    Map<String, String> tags = new LinkedHashMap<>();

    /**
     * The list relationships where the current element is the source.
     */
    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<Relationship> relationships = new LinkedHashSet<>();

    @Override
    public String toString() {
        return "id='" + id + '\'';
    }
}
