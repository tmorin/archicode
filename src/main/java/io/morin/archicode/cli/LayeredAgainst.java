package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.Workspace;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * Which of {@code --baseline} and {@code --against} a workspace takes, and the plateau a layered plateau is compared with.
 * The old mechanism ({@code settings.plateaus}) has {@code --baseline}, layered plateaus have {@code --against}; each refuses
 * the other with one line that says so, until the old one is removed.
 */
@UtilityClass
class LayeredAgainst {

    /** Whether the workspace of the plateau that was read has layered plateaus. */
    static boolean isLayered(Workspace workspace) {
        return workspace.getPlateauTree() != null;
    }

    /**
     * Refuse the option of the other mechanism.
     *
     * @param workspace the plateau that was read (it has a plateau)
     * @param baseline  the value of {@code --baseline}, or null
     * @param against   the value of {@code --against}, or null
     * @throws ArchiCodeException when the workspace takes the other option
     */
    static void refuseTheOtherOption(Workspace workspace, String baseline, String against) {
        if (isLayered(workspace) && baseline != null) {
            throw new ArchiCodeException(
                "`--baseline %s` cannot be used: the plateaus of this workspace are layers (`plateau:` in a header, a manifest of kind `archicode.morin.io/plateau`): compare with `--against`",
                baseline
            );
        }
        if (!isLayered(workspace) && against != null) {
            throw new ArchiCodeException(
                "`--against %s` cannot be used: the plateaus of this workspace are listed in `settings.plateaus`: compare with `--baseline`",
                against
            );
        }
    }

    /**
     * The plateau a layered plateau is compared with: the one asked for, else the plateau it overrides.
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
