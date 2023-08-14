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

        val egressMetaLinks = metaLinkFinderForEgress.find(mainIndex, viewReference);
        egressMetaLinks.forEach(metaLink -> log.debug("egress {} {}", metaLink, metaLink.hashCode()));
        val egressGroomedLinks = metaLinkGroomer.groomEgress(mainIndex, viewReference, egressMetaLinks);
        egressGroomedLinks.forEach(groomedLink -> log.debug("egress {} {}", groomedLink, groomedLink.hashCode()));

        val ingressMetaLinks = metaLinkFinderForIngress.find(mainIndex, viewReference);
        ingressMetaLinks.forEach(metaLink -> log.debug("ingress {} {}", metaLink, metaLink.hashCode()));
        val ingressGroomedLinks = metaLinkGroomer.groomIngress(mainIndex, viewReference, ingressMetaLinks);
        ingressGroomedLinks.forEach(groomedLink -> log.debug("ingress {} {}", groomedLink, groomedLink.hashCode()));

        val allGroomedLinks = Stream
            .concat(egressGroomedLinks.stream(), ingressGroomedLinks.stream())
            .collect(Collectors.toSet());
        allGroomedLinks.forEach(groomedLink -> log.debug("all {}", groomedLink));

        val itemByReference = new HashMap<String, Item>();

        val itemReferences = collectAsSet(
            allGroomedLinks.stream().map(GroomedLink::getFromReference),
            allGroomedLinks.stream().map(GroomedLink::getToReference),
            Stream.of(viewReference)
        );

        val items = createItems(itemReferences, mainIndex, itemByReference);
        items.forEach(item -> log.debug("item {}", item));

        val links = allGroomedLinks
            .stream()
            .flatMap(groomedLink -> {
                val fromItem = itemByReference.get(groomedLink.getFromReference());
                val toItem = itemByReference.get(groomedLink.getToReference());
                val syntheticRelationships = groomedLink.getRelationships().getOrDefault(SYNTHETIC, emptySet());
                val naturalRelationships = groomedLink.getRelationships().getOrDefault(NATURAL, emptySet());
                if (!syntheticRelationships.isEmpty()) {
                    val qualifiers = syntheticRelationships
                        .stream()
                        .flatMap(l -> l.getQualifiers().stream())
                        .collect(Collectors.toSet());
                    val defaultLabel = workspace.getSettings().getRelationships().getDefaultSyntheticLabel();
                    val label = syntheticRelationships.size() == 1
                        ? syntheticRelationships
                            .stream()
                            .findFirst()
                            .map(Relationship::getLabel)
                            .filter(v -> !v.isBlank())
                            .orElse(defaultLabel)
                        : defaultLabel;
                    return Stream.of(
                        Link
                            .builder()
                            .from(fromItem)
                            .to(toItem)
                            .synthetic(true)
                            .label(label)
                            .qualifiers(qualifiers)
                            .relationships(syntheticRelationships)
                            .build()
                    );
                } else if (!naturalRelationships.isEmpty()) {
                    return naturalRelationships
                        .stream()
                        .map(relationship ->
                            Link
                                .builder()
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
