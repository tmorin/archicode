package io.morin.archicode.importer;

import java.util.List;

/**
 * What the importer keeps of a LikeC4 JSON export: the elements with their kinds and the relationships, with the count of
 * what it ignores.
 *
 * @param projectId     the id of the project, or null when the export has none
 * @param title         the title of the project, else its name, or null when it has neither
 * @param elements      the elements, in the order of the export
 * @param links         the relationships between elements, in the order of the export
 * @param dropped       what the reader ignored
 */
public record LikeC4Model(String projectId, String title, List<Element> elements, List<Link> links, Dropped dropped) {
    /**
     * An element.
     *
     * @param id          the dotted path, whose prefix is the id of the parent
     * @param kind        the kind, as the export names it
     * @param title       the title, or null
     * @param description the description (a text, or the {@code txt} or {@code md} of an object), else the summary, or null
     * @param technology  the technology, or null
     * @param tags        the names of the tags
     */
    public record Element(
        String id,
        String kind,
        String title,
        String description,
        String technology,
        List<String> tags
    ) {}

    /**
     * A relationship.
     *
     * @param id            the opaque id
     * @param source        the id of the source element, or null when the end is not a reference to a model element
     * @param target        the id of the target element, or null when the end is not a reference to a model element
     * @param title         the title, else the description, or null
     * @param technology    the technology, or null
     * @param kind          the kind of the relationship, or null
     * @param tags          the names of the tags
     * @param bidirectional true when the relationship is flagged {@code isBidirectional}
     */
    public record Link(
        String id,
        String source,
        String target,
        String title,
        String technology,
        String kind,
        List<String> tags,
        boolean bidirectional
    ) {}

    /**
     * The parts present in the export and not carried; each is a count of the things that hold the part.
     *
     * @param views                    the views
     * @param deploymentElements       the elements of {@code deployments}
     * @param deploymentRelationships  the relationships of {@code deployments}
     * @param styles                   the elements and relationships with a non-empty style, color, line, head or tail
     * @param metadata                 the elements and relationships with a non-empty metadata
     * @param links                    the elements and relationships with links
     * @param navigateTo               the elements and relationships with a navigateTo
     * @param notation                 the elements with a notation
     * @param globals                  the entries of the maps of globals
     * @param imports                  the entries of imports
     * @param diffs                    the entries of diffs
     * @param manualLayouts            the entries of manualLayouts
     */
    public record Dropped(
        int views,
        int deploymentElements,
        int deploymentRelationships,
        int styles,
        int metadata,
        int links,
        int navigateTo,
        int notation,
        int globals,
        int imports,
        int diffs,
        int manualLayouts
    ) {}
}
