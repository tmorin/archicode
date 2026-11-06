package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.plateau.PlateauTree;
import io.morin.archicode.workspace.WorkspaceFactory;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The columns of the matrix of plateaus: a path of one chain of the tree, oldest first. The path is the ids the author
 * names, or the chain from the root to the plateau {@code --plateau} names (else {@code settings.current}, else the last
 * plateau of a tree that is one line). It reads the tree and nothing else: every mistake is told here, before a plateau is
 * loaded or two of them are compared.
 */
@UtilityClass
class MatrixPath {

    /**
     * @param tree the plateaus of the workspace
     * @param ids the plateaus the author names, oldest first; empty to derive the path
     * @param plateauId {@code --plateau}, or null
     * @param current {@code settings.current}, or null
     * @return the ids of the columns, at least two, each one an ancestor of the next
     * @throws ArchiCodeException for every path that is not a path of one chain
     */
    List<String> of(PlateauTree tree, List<String> ids, String plateauId, String current) {
        if (!tree.isLayered()) {
            throw new ArchiCodeException(
                "the workspace declares no plateau: there is nothing to compare. A plateau is a layer: write `plateau: <id>` in the header of its manifests and declare it in a manifest of kind `archicode.morin.io/plateau`"
            );
        }
        if (!ids.isEmpty() && plateauId != null) {
            throw new ArchiCodeException(
                "name the plateaus of the path or give `--plateau`, not both: `--plateau` stands for the chain from `baseline` to that plateau"
            );
        }
        val path = ids.isEmpty() ? derived(tree, plateauId, current) : named(tree, ids);
        if (path.size() < 2) {
            val only = path.getFirst();
            throw new ArchiCodeException(
                "the matrix needs a path of at least two plateaus: %s",
                tree.node(only).parent() == null
                    ? "`" + only + "` is the root and nothing is before it"
                    : "`" + only + "` is the only one named"
            );
        }
        return path;
    }

    private static List<String> derived(PlateauTree tree, String plateauId, String current) {
        val last = WorkspaceFactory.chosen(current, tree, plateauId);
        return tree.chain(last).stream().map(PlateauTree.Node::id).toList();
    }

    private static List<String> named(PlateauTree tree, List<String> ids) {
        // an unknown id is told with the plateaus of the workspace, whatever its place in the list
        ids.forEach(tree::node);
        if (ids.size() < 2) {
            return List.copyOf(ids);
        }
        val seen = new HashSet<String>();
        for (val id : ids) {
            if (!seen.add(id)) {
                throw new ArchiCodeException(
                    "the plateau `%s` is named twice: name each plateau of the path once, oldest first",
                    id
                );
            }
        }
        for (var i = 1; i < ids.size(); i++) {
            val before = ids.get(i - 1);
            val after = ids.get(i);
            val stands = tree
                .ancestors(after)
                .stream()
                .anyMatch(n -> n.id().equals(before));
            if (!stands) {
                throw new ArchiCodeException("%s", notAnOverride(tree, before, after));
            }
        }
        return new ArrayList<>(ids);
    }

    private static String notAnOverride(PlateauTree tree, String before, String after) {
        if (tree.onOneChain(before, after)) {
            return String.format(
                "`%s` comes before `%s` in the tree, not after it: name the plateaus of one path, oldest first",
                after,
                before
            );
        }
        val shared = tree
            .chain(before)
            .stream()
            .map(PlateauTree.Node::id)
            .filter(id ->
                tree
                    .chain(after)
                    .stream()
                    .anyMatch(n -> n.id().equals(id))
            )
            .reduce((first, second) -> second)
            .orElse(null);
        return String.format(
            "the plateaus `%s` and `%s` are not on one chain: `%s` is not a plateau that overrides `%s`%s. Name the plateaus of one path, oldest first",
            before,
            after,
            after,
            before,
            shared == null ? "" : " (they are alternatives, both override `" + shared + "`)"
        );
    }
}
