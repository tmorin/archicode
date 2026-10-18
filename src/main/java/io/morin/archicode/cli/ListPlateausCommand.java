package io.morin.archicode.cli;

import io.morin.archicode.resource.plateau.PlateauTree;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

/**
 * List the plateaus of the workspace: each, the plateau it overrides, and where its existence comes from.
 */
@Slf4j
@CommandLine.Command(
    name = "list",
    description = {
        "List the plateaus of the workspace, in the order of the tree: baseline, then what overrides it, each plateau followed by what overrides it.",
        "One line each: the id, the plateau it overrides (- for baseline, the root), where its existence comes from (a manifest of kind plateau, or headers only: manifests whose header says plateau: <id> and no Plateau manifest, or implicit for baseline), its name and its horizon (- when it has none)."
    }
)
public class ListPlateausCommand implements Runnable {

    @CommandLine.ParentCommand
    PlateauGroup plateauGroup;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Override
    public void run() {
        val tree = workspaceFactory.plateauTree(plateauGroup.archiCode.workspaceFilePath.toAbsolutePath());
        // printed to System.out: application.properties sets quarkus.log.level=ERROR
        System.out.print(render(tree));
    }

    /**
     * The table of the plateaus, in the order of the tree, the columns aligned and no trailing space. It depends on the
     * tree only, so the same workspace gives the same bytes.
     *
     * @param tree the tree of the plateaus
     * @return the table, ending with a line end
     */
    static String render(PlateauTree tree) {
        val table = new ArrayList<List<String>>();
        table.add(List.of("PLATEAU", "PARENT", "SOURCE", "NAME", "HORIZON"));
        for (val node : tree.nodes()) {
            table.add(
                List.of(
                    node.id(),
                    node.parent() == null ? "-" : node.parent(),
                    source(node),
                    node.name() == null || node.name().isBlank() ? "-" : node.name(),
                    node.horizon() == null || node.horizon().isBlank() ? "-" : node.horizon()
                )
            );
        }
        val widths = new int[4];
        table.forEach(cells -> {
            for (int i = 0; i < widths.length; i++) {
                widths[i] = Math.max(widths[i], cells.get(i).length());
            }
        });
        val out = new StringBuilder();
        for (val cells : table) {
            val line = new StringBuilder();
            for (int i = 0; i < widths.length; i++) {
                line.append(String.format(Locale.ROOT, "%-" + widths[i] + "s  ", cells.get(i)));
            }
            line.append(cells.get(4));
            out.append(line.toString().stripTrailing()).append('\n');
        }
        return out.toString();
    }

    /** {@code manifest <file>}, {@code headers only (<files>)}, or {@code implicit} for the root nothing names. */
    private static String source(PlateauTree.Node node) {
        if (node.declared()) {
            return "manifest " + node.manifest();
        }
        if (node.headers().isEmpty()) {
            return "implicit";
        }
        val files = node.headers();
        return (
            "headers only (" +
            String.join(", ", files.subList(0, Math.min(3, files.size()))) +
            (files.size() > 3 ? " and " + (files.size() - 3) + " more" : "") +
            ")"
        );
    }
}
