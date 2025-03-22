package io.morin.archicode.viewpoint.overview;

import static io.morin.archicode.viewpoint.GroomedLink.RelationshipKind.NATURAL;
import static io.morin.archicode.viewpoint.GroomedLink.RelationshipKind.SYNTHETIC;
import static java.util.Collections.emptySet;

import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.*;
import io.morin.archicode.workspace.Workspace;
import java.util.HashMap;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@SuperBuilder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class OverviewViewpointFactory extends AbstractViewpointFactory implements ViewpointFactory {

    @NonNull
    MetaLinkFinderForEgress metaLinkFinderForEgress;

    @NonNull
    MetaLinkFinderForIngress metaLinkFinderForIngress;

    @NonNull
    MetaLinkGroomer metaLinkGroomer;

    @SneakyThrows
    @Override
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        log.debug("create viewpoint for {}", view);

        val mainIndex = workspace.resolveMainIndexForView(view);

        val properties = objectMapper.readValue(
            Objects.requireNonNull(view.getProperties().toString()),
            OverviewViewProperties.class
        );

        val viewReference = properties.getElement();

        // resolve all natural egress relationships
        val egressMetaLinks = metaLinkFinderForEgress.find(mainIndex, viewReference);
        egressMetaLinks.forEach(metaLink -> log.debug("egress {} {}", metaLink, metaLink.hashCode()));

        // groom all natural egress relationships and resolve synthetic egress relationships
        val egressGroomedLinks = metaLinkGroomer.groomEgress(mainIndex, viewReference, egressMetaLinks);
        egressGroomedLinks.forEach(groomedLink -> log.debug("egress {} {}", groomedLink, groomedLink.hashCode()));

        // resolve all natural ingress relationships
        val ingressMetaLinks = metaLinkFinderForIngress.find(mainIndex, viewReference);
        ingressMetaLinks.forEach(metaLink -> log.debug("ingress {} {}", metaLink, metaLink.hashCode()));

        // groom all natural ingress relationships and resolve synthetic ingress relationships
        val ingressGroomedLinks = metaLinkGroomer.groomIngress(mainIndex, viewReference, ingressMetaLinks);
        ingressGroomedLinks.forEach(groomedLink -> log.debug("ingress {} {}", groomedLink, groomedLink.hashCode()));

        // merge all groomed links
        val allGroomedLinks = Stream.concat(egressGroomedLinks.stream(), ingressGroomedLinks.stream()).collect(
            Collectors.toSet()
        );
        allGroomedLinks.forEach(groomedLink -> log.debug("all {}", groomedLink));

        val itemByReference = new HashMap<String, Item>();

        // collect all item references from groomed links and append the view reference
        val itemReferences = collectAsSet(
            allGroomedLinks.stream().map(GroomedLink::getFromReference),
            allGroomedLinks.stream().map(GroomedLink::getToReference),
            Stream.of(viewReference)
        );

        // create all items based on the collected item references
        val items = createItems(itemReferences, mainIndex, itemByReference);
        items.forEach(item -> log.debug("item {}", item));

        // create all links based on the groomed links
        val links = allGroomedLinks
            .stream()
            .flatMap(groomedLink -> {
                val fromItem = itemByReference.get(groomedLink.getFromReference());
                val toItem = itemByReference.get(groomedLink.getToReference());
                val syntheticRelationships = groomedLink.getRelationships().getOrDefault(SYNTHETIC, emptySet());
                val naturalRelationships = groomedLink.getRelationships().getOrDefault(NATURAL, emptySet());
                // if there are synthetic relationships, create a single link for all synthetic relationships
                if (!syntheticRelationships.isEmpty()) {
                    // collect all qualifiers from synthetic relationships
                    val qualifiers = syntheticRelationships
                        .stream()
                        .flatMap(l -> l.getQualifiers().stream())
                        .collect(Collectors.toSet());
                    // resolve the synthetic label
                    val defaultLabel = workspace.getSettings().getRelationships().getDefaultSyntheticLabel();
                    // if there is only one synthetic relationship, use its label
                    val label = syntheticRelationships.size() == 1
                        ? syntheticRelationships
                            .stream()
                            .findFirst()
                            .map(Relationship::getLabel)
                            .filter(v -> !v.isBlank())
                            .orElse(defaultLabel)
                        : defaultLabel;
                    // create a single link for all synthetic relationships
                    return Stream.of(
                        Link.builder()
                            .from(fromItem)
                            .to(toItem)
                            .synthetic(true)
                            .label(label)
                            .qualifiers(qualifiers)
                            .relationships(syntheticRelationships)
                            .build()
                    );
                } else if (!naturalRelationships.isEmpty()) {
                    // create a link for each natural relationship
                    return naturalRelationships
                        .stream()
                        .map(relationship ->
                            Link.builder()
                                .from(fromItem)
                                .to(toItem)
                                .label(relationship.getLabel())
                                .qualifiers(relationship.getQualifiers())
                                .relationship(relationship)
                                .build()
                        );
                }
                return Stream.empty();
            })
            .collect(Collectors.toSet());
        links.forEach(link -> log.debug("link {}", link));

        return Viewpoint.builder().workspace(workspace).view(view).items(items).links(links).build();
    }
}
