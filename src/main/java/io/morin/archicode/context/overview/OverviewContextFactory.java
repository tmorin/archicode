package io.morin.archicode.context.overview;

import static io.morin.archicode.context.overview.GroomedLink.RelationshipKind.NATURAL;
import static io.morin.archicode.context.overview.GroomedLink.RelationshipKind.SYNTHETIC;
import static java.util.Collections.emptySet;

import io.morin.archicode.context.Context;
import io.morin.archicode.context.Item;
import io.morin.archicode.context.Link;
import io.morin.archicode.element.application.Relationship;
import io.morin.archicode.view.OverviewView;
import io.morin.archicode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class OverviewContextFactory {

    EgressMetaLinkFinder egressMetaLinkFinder;
    IngressMetaLinkFinder ingressMetaLinkFinder;
    MetaLinkGroomer metaLinkGroomer;

    public Context create(Workspace workspace, OverviewView view) {
        log.info("create context for {}", view);

        val viewReference = view.getElement();

        val egressMetaLinks = egressMetaLinkFinder.find(workspace, viewReference);
        egressMetaLinks.forEach(metaLink -> log.info("egress {}", metaLink));
        val egressGroomedLinks = metaLinkGroomer.groomEgress(workspace, viewReference, egressMetaLinks);
        egressGroomedLinks.forEach(groomedLink -> log.info("egress {}", groomedLink));

        val ingressMetaLinks = ingressMetaLinkFinder.find(workspace, viewReference);
        ingressMetaLinks.forEach(metaLink -> log.info("ingress {}", metaLink));
        val ingressGroomedLinks = metaLinkGroomer.groomIngress(workspace, viewReference, ingressMetaLinks);
        ingressGroomedLinks.forEach(groomedLink -> log.info("ingress {}", groomedLink));

        val allGroomedLinks = Stream
            .concat(egressGroomedLinks.stream(), ingressGroomedLinks.stream())
            .collect(Collectors.toSet());
        allGroomedLinks.forEach(groomedLink -> log.info("all {}", groomedLink));

        val itemByReference = new HashMap<String, Item>();

        val itemReferences = new HashSet<String>();
        itemReferences.addAll(allGroomedLinks.stream().map(GroomedLink::getFromReference).collect(Collectors.toSet()));
        itemReferences.addAll(allGroomedLinks.stream().map(GroomedLink::getToReference).collect(Collectors.toSet()));
        if (itemReferences.isEmpty()) {
            itemReferences.add(viewReference);
        }

        val items = itemReferences
            .stream()
            .flatMap(reference -> {
                val references = new HashSet<String>();
                val parts = reference.split("\\.");
                for (int i = 0; i < parts.length; i++) {
                    references.add(String.join(".", Arrays.copyOf(parts, i + 1)));
                }
                return references.stream();
            })
            .distinct()
            .sorted()
            .map(elementReference -> {
                val element = workspace.getElementByReference(elementReference);
                val item = itemByReference.computeIfAbsent(
                    elementReference,
                    s ->
                        Item
                            .builder()
                            .itemId(elementReference)
                            .reference(elementReference)
                            .element(element)
                            .kind(Item.Kind.from(element))
                            .build()
                );
                workspace
                    .findParentReference(elementReference)
                    .ifPresent(parentReference -> itemByReference.get(parentReference).getChildren().add(item));
                return item;
            })
            .filter(item -> !item.getReference().contains("."))
            .collect(Collectors.toSet());
        items.forEach(item -> log.info("item {}", item));

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

                    val defaultLabel = Optional
                        .ofNullable(workspace.getSettings().getRelationships().getDefaultSyntheticLabel())
                        .orElse("uses");
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
        links.forEach(link -> log.info("link {}", link));

        return Context.builder().workspace(workspace).view(view).items(items).links(links).build();
    }
}
