package io.morin.archicode.importer;

import java.util.List;

/**
 * What the importer keeps of a Structurizr workspace exported as JSON: the people, the software systems with their
 * containers and their components, and the relationships, with the count of what it ignores.
 *
 * @param name          the name of the workspace, or null when it has none
 * @param people        the people, in the order of the export
 * @param systems       the software systems, in the order of the export
 * @param links         the relationships that were written by hand, in the order of the export (an implied one is counted
 *                      in {@code dropped}, not kept)
 * @param dropped       what the reader ignored
 */
public record StructurizrModel(
    String name,
    List<Person> people,
    List<System> systems,
    List<Link> links,
    Dropped dropped
) {
    /** A person. */
    public record Person(String id, String name, String description, List<String> tags, String group) {}

    /** A software system and its containers. */
    public record System(
        String id,
        String name,
        String description,
        List<String> tags,
        String group,
        List<Container> containers
    ) {}

    /** A container of a software system and its components. */
    public record Container(
        String id,
        String name,
        String description,
        String technology,
        List<String> tags,
        String group,
        List<Component> components
    ) {}

    /** A component of a container. */
    public record Component(
        String id,
        String name,
        String description,
        String technology,
        List<String> tags,
        String group
    ) {}

    /**
     * A relationship, as the export writes it, the ids being those of Structurizr.
     *
     * @param technology the technology, or null when there is none
     */
    public record Link(
        String id,
        String sourceId,
        String destinationId,
        String description,
        String technology,
        List<String> tags
    ) {}

    /**
     * What the reader counted and did not keep. A part that is absent is 0.
     *
     * @param views                 the views of every kind
     * @param deploymentNodes       the top-level nodes of {@code model.deploymentNodes} (the nested ones are not counted)
     * @param styles                the styles of the elements and of the relationships
     * @param documentation         the documentations that are not empty, of the workspace and of its elements
     * @param properties            the {@code properties} that are not empty, of the workspace, the elements and the relationships
     * @param perspectives          the {@code perspectives} that are not empty
     * @param customElements        the custom elements of the model
     * @param configuration         1 when the {@code configuration} of the workspace is not empty, else 0
     * @param impliedRelationships  the relationships that Structurizr derived from another one ({@code linkedRelationshipId})
     */
    public record Dropped(
        int views,
        int deploymentNodes,
        int styles,
        int documentation,
        int properties,
        int perspectives,
        int customElements,
        int configuration,
        int impliedRelationships
    ) {
        /** Every count, in a fixed order. */
        public int total() {
            return (
                views +
                deploymentNodes +
                styles +
                documentation +
                properties +
                perspectives +
                customElements +
                configuration +
                impliedRelationships
            );
        }
    }

    /** The number of people, systems, containers and components together. */
    public int elementCount() {
        var count = people.size() + systems.size();
        for (var system : systems) {
            count += system.containers().size();
            for (var container : system.containers()) {
                count += container.components().size();
            }
        }
        return count;
    }
}
