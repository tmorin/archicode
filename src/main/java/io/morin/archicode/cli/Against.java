package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.Workspace;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The plateau a plateau is compared with: the one {@code --against} names, else the plateau it overrides.
 */
@UtilityClass
class Against {

    /**
     * The plateau a plateau is compared with: the one asked for, else the plateau it overrides.
     *
     * @param target  the plateau that is compared
     * @param against the value of {@code --against}, or null
     * @return the id, or null for {@code baseline} (the root) when nothing was asked: it overrides nothing
     * @throws ArchiCodeException when the plateau asked for does not exist, or is the target
     */
    static String of(Workspace target, String against) {
        val tree = target.getPlateauTree();
        val id = target.getPlateau().getId();
        if (against == null) {
            return tree.node(id).parent();
        }
        tree.node(against);
        if (against.equals(id)) {
            throw new ArchiCodeException(
                "`--against %s` is the plateau that is compared: choose another plateau to compare it with",
                against
            );
        }
        return against;
    }
}
