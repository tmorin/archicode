package io.morin.archicode.viewpoint.overview;

import io.morin.archicode.viewpoint.Level;
import io.morin.archicode.viewpoint.metalink.MetaLink;
import io.morin.archicode.viewpoint.overview.GroomedLink.Direction;
import io.morin.archicode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;

@ApplicationScoped
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

    public Set<GroomedLink> groomEgress(Workspace workspace, String fromReference, Set<MetaLink> metaLinks) {
        val fromLevelTarget = Level.from(fromReference);
        val toLevelTarget = Level.L0;
        return getGroomedLinks(workspace, metaLinks, Direction.EGRESS, fromLevelTarget, toLevelTarget);
    }

    public Set<GroomedLink> groomIngress(Workspace workspace, String toReference, Set<MetaLink> metaLinks) {
        val fromLevelTarget = Level.L0;
        val toLevelTarget = Level.from(toReference);
        return getGroomedLinks(workspace, metaLinks, Direction.INGRESS, fromLevelTarget, toLevelTarget);
    }

    private Set<GroomedLink> getGroomedLinks(
        Workspace workspace,
        Set<MetaLink> metaLinks,
        Direction direction,
        Level fromLevelTarget,
        Level toLevelTarget
    ) {
        val groomedLinks = new HashMap<String, GroomedLink>();

        metaLinks.forEach(metaLink -> {
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
                groomedFromElement = workspace.appIndex.getElementByReference(groomedFromReference);
            }
            val groomedFromLevel = Level.from(groomedFromReference);

            var groomedToReference = metaLink.getToReference();
            var groomedToElement = metaLink.getToElement();

            var toLevelIsUpper = false;
            toLevelIsUpper = metaLink.getToLevel().isUpper().test(localToLevelTarget);
            if (toLevelIsUpper) {
                groomedToReference = Level.downReferenceTo(metaLink.getToReference(), localToLevelTarget);
                groomedToElement = workspace.appIndex.getElementByReference(groomedToReference);
            }
            val groomedToLevel = Level.from(groomedToReference);

            val groomedKey = String.format("%s -> %s", groomedFromReference, groomedToReference);
            val groomedLinkBuilder = GroomedLink
                .builder()
                .direction(direction)
                .fromReference(groomedFromReference)
                .fromElement(groomedFromElement)
                .fromLevel(groomedFromLevel)
                .toReference(groomedToReference)
                .toElement(groomedToElement)
                .toLevel(groomedToLevel);

            groomedLinks.computeIfAbsent(groomedKey, s -> groomedLinkBuilder.build());

            val isSynthetic = fromLevelIsUpper || toLevelIsUpper;
            fillGroomedLinkRelationships(groomedLinks, groomedKey, metaLink, isSynthetic);
        });

        return new HashSet<>(groomedLinks.values());
    }
}
