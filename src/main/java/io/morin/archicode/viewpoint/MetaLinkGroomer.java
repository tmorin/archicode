package io.morin.archicode.viewpoint;

import io.morin.archicode.viewpoint.GroomedLink.Direction;
import io.morin.archicode.workspace.ElementIndex;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class MetaLinkGroomer {

    private static Level resolveLocalFromLevelTarget(
        MetaLink metaLink,
        Level linkTargetFromLevel,
        Level linkTargetToLevel
    ) {
        // WHEN the parent of TO is an ancestor of FROM
        if (metaLink.getFromReference().startsWith(Level.downReference(metaLink.getToReference()))) {
            // THEN the target level of TO must be the same level as the FROM
            return linkTargetToLevel;
        }

        // WHEN the root ancestor of FROM is the root ancestor of TO
        if (
            Level
                .downReferenceTo(metaLink.getFromReference(), Level.L0)
                .equals(Level.downReferenceTo(metaLink.getToReference(), Level.L0))
        ) {
            // THEN the target level of FROM must be parent level of TO
            return Level.max(Level.down(linkTargetToLevel), Level.L1);
        }

        return linkTargetFromLevel;
    }

    private static Level resolveLocalToLevelTarget(
        MetaLink metaLink,
        Level linkTargetFromLevel,
        Level linkTargetToLevel
    ) {
        // WHEN the parent of FROM is an ancestor of TO
        if (metaLink.getToReference().startsWith(Level.downReference(metaLink.getFromReference()))) {
            // THEN the target level of TO must be the same level as the FROM
            return linkTargetFromLevel;
        }

        // WHEN the root ancestor of FROM is the root ancestor of TO
        if (
            Level
                .downReferenceTo(metaLink.getFromReference(), Level.L0)
                .equals(Level.downReferenceTo(metaLink.getToReference(), Level.L0))
        ) {
            // THEN the target level of TO must be parent level of FROM
            return Level.max(Level.down(linkTargetFromLevel), Level.L1);
        }

        return linkTargetToLevel;
    }

    private static void fillGroomedLinkRelationships(
        HashMap<String, GroomedLink> groomedLinks,
        String groomedKey,
        MetaLink metaLink,
        boolean isSynthetic
    ) {
        if (isSynthetic) {
            groomedLinks
                .get(groomedKey)
                .getRelationships()
                .putIfAbsent(GroomedLink.RelationshipKind.SYNTHETIC, new HashSet<>());
            groomedLinks
                .get(groomedKey)
                .getRelationships()
                .get(GroomedLink.RelationshipKind.SYNTHETIC)
                .add(metaLink.getRelationship());
        } else {
            groomedLinks
                .get(groomedKey)
                .getRelationships()
                .putIfAbsent(GroomedLink.RelationshipKind.NATURAL, new HashSet<>());
            groomedLinks
                .get(groomedKey)
                .getRelationships()
                .get(GroomedLink.RelationshipKind.NATURAL)
                .add(metaLink.getRelationship());
        }
    }

    public Set<GroomedLink> groomEgress(ElementIndex index, String fromReference, Set<MetaLink> metaLinks) {
        val fromLevelTarget = Level.from(fromReference);
        val toLevelTarget = Level.L0;
        return getGroomedLinks(index, metaLinks, Direction.EGRESS, fromLevelTarget, toLevelTarget);
    }

    public Set<GroomedLink> groomIngress(ElementIndex index, String toReference, Set<MetaLink> metaLinks) {
        val fromLevelTarget = Level.L0;
        val toLevelTarget = Level.from(toReference);
        return getGroomedLinks(index, metaLinks, Direction.INGRESS, fromLevelTarget, toLevelTarget);
    }

    private Set<GroomedLink> getGroomedLinks(
        ElementIndex index,
        Set<MetaLink> metaLinks,
        Direction direction,
        Level fromLevelTarget,
        Level toLevelTarget
    ) {
        val groomedLinks = new HashMap<String, GroomedLink>();

        log.trace("direction {}", direction);
        log.trace("toLevelTarget {}", toLevelTarget);
        log.trace("fromLevelTarget {}", fromLevelTarget);

        metaLinks.forEach(metaLink -> {
            log.trace("groom {}", metaLink);

            var localFromLevelTarget = fromLevelTarget;
            var localToLevelTarget = toLevelTarget;

            // when EGRESS
            if (Direction.EGRESS.equals(direction)) {
                localToLevelTarget = resolveLocalToLevelTarget(metaLink, localFromLevelTarget, localToLevelTarget);
            }
            // when INGRESS
            else if (Direction.INGRESS.equals(direction)) {
                localFromLevelTarget = resolveLocalFromLevelTarget(metaLink, localFromLevelTarget, localToLevelTarget);
            }

            var groomedFromReference = metaLink.getFromReference();
            var groomedFromElement = metaLink.getFromElement();
            val fromLevelIsUpper = metaLink.getFromLevel().isUpper().test(localFromLevelTarget);
            if (fromLevelIsUpper) {
                groomedFromReference = Level.downReferenceTo(metaLink.getFromReference(), localFromLevelTarget);
                groomedFromElement = index.getElementByReference(groomedFromReference);
            }
            val groomedFromLevel = Level.from(groomedFromReference);

            var groomedToReference = metaLink.getToReference();
            var groomedToElement = metaLink.getToElement();

            var toLevelIsUpper = false;
            toLevelIsUpper = metaLink.getToLevel().isUpper().test(localToLevelTarget);
            if (toLevelIsUpper) {
                groomedToReference = Level.downReferenceTo(metaLink.getToReference(), localToLevelTarget);
                groomedToElement = index.getElementByReference(groomedToReference);
            }
            val groomedToLevel = Level.from(groomedToReference);

            val groomedKey = String.format("%s -> %s", groomedFromReference, groomedToReference);
            log.trace("groomedKey {}", groomedKey);

            val groomedLinkBuilder = GroomedLink
                .builder()
                .direction(direction)
                .fromReference(groomedFromReference)
                .fromElement(groomedFromElement)
                .fromLevel(groomedFromLevel)
                .toReference(groomedToReference)
                .toElement(groomedToElement)
                .toLevel(groomedToLevel);

            val groomedLink = groomedLinks.computeIfAbsent(groomedKey, s -> groomedLinkBuilder.build());
            log.trace("groomedLink {} {}", groomedLinks.size(), groomedLink.hashCode());
            log.trace("groomedLinks {}", groomedLinks.size());

            val isSynthetic = fromLevelIsUpper || toLevelIsUpper;
            fillGroomedLinkRelationships(groomedLinks, groomedKey, metaLink, isSynthetic);
        });

        return new HashSet<>(groomedLinks.values());
    }
}
