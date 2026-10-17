package io.morin.archicode.cli;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import lombok.Builder;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

/**
 * Print the resolved element/relationship graph of the workspace as JSON.
 * <p>
 * This builds both the application and technology {@link ElementIndex}es the
 * same way {@code views generate}/{@code query views} already do, and forces
 * resolution of every relationship's destination via
 * {@link ElementIndex#getElementByReference(String)} — the same method the
 * existing viewpoint-building path already calls. A dangling destination
 * throws {@link io.morin.archicode.ArchiCodeException}, uncaught, exactly as
 * it already does for every other command that builds a view.
 */
@Slf4j
@CommandLine.Command(
    name = "graph",
    description = "Print the resolved element/relationship graph of the workspace as JSON."
)
public class GetGraphQuery implements Runnable {

    @CommandLine.ParentCommand
    QueryGroup queryGroup;

    @CommandLine.Mixin
    PlateauOption plateauOption = new PlateauOption();

    @Inject
    QueryOutputWriter queryOutputWriter;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    WorkspaceFactory workspaceFactory;

    @SneakyThrows
    @Override
    public void run() {
        val workspace = workspaceFactory.create(
            queryGroup.archiCode.workspaceFilePath.toAbsolutePath(),
            null,
            plateauOption.plateauId
        );

        val graph = buildGraph(workspace);

        val jsonMapper = mapperFactory.create(MapperFormat.JSON);
        queryOutputWriter.write(jsonMapper.writeValueAsString(graph));
    }

    /**
     * Build the resolved element/relationship {@link Graph} for the given, already-indexed workspace.
     * <p>
     * Kept apart from the command so that the graph can be built without writing it out.
     *
     * @param workspace the already-indexed workspace ({@link io.morin.archicode.workspace.WorkspaceFactory}'s output)
     * @return the resolved graph
     */
    public Graph buildGraph(@NonNull Workspace workspace) {
        val elements = new ArrayList<ElementEntry>();
        val relationships = new ArrayList<RelationshipEntry>();

        collect(workspace.appIndex, View.Layer.APPLICATION, elements, relationships);
        collect(workspace.techIndex, View.Layer.TECHNOLOGY, elements, relationships);

        return Graph.builder().elements(elements).relationships(relationships).build();
    }

    /**
     * Walk every element of the given index, in the order of their references, and force resolution of every one of
     * its relationships.
     * <p>
     * The index hands out its references in the hash order of a set, which is a function of the references alone but
     * moves with the order the manifests were read in (a collision bucket) and with the JDK (the hash table). The
     * references are therefore sorted here (the natural order of the text), so that the elements come in the order of
     * their references, layer by layer (application, then technology), and the relationships follow their source: by
     * source, then, for one source, as the author wrote them.
     *
     * @param index         the index to walk
     * @param layer         the layer the index belongs to
     * @param elements      the collected element entries, appended in place
     * @param relationships the collected relationship entries, appended in place
     */
    private void collect(
        @NonNull ElementIndex index,
        @NonNull View.Layer layer,
        @NonNull List<ElementEntry> elements,
        @NonNull List<RelationshipEntry> relationships
    ) {
        for (val reference : new TreeSet<>(index.listAllElementReferences(element -> true))) {
            val element = index.getElementByReference(reference);
            elements.add(ElementEntry.builder().reference(reference).layer(layer).element(element).build());

            for (Relationship relationship : Optional.ofNullable(element.getRelationships()).orElseGet(Set::of)) {
                // Force resolution the same way MetaLinkFinderForEgress/MetaLinkFinderForIngress already do:
                // this throws ArchiCodeException, uncaught, if the destination is dangling.
                index.getElementByReference(relationship.getDestination());
                relationships.add(
                    RelationshipEntry.builder().source(reference).layer(layer).relationship(relationship).build()
                );
            }
        }
    }

    @Value
    @Builder
    public static class Graph {

        List<ElementEntry> elements;

        List<RelationshipEntry> relationships;
    }

    @Value
    @Builder
    public static class ElementEntry {

        String reference;

        View.Layer layer;

        Element element;
    }

    @Value
    @Builder
    public static class RelationshipEntry {

        String source;

        View.Layer layer;

        Relationship relationship;
    }
}
