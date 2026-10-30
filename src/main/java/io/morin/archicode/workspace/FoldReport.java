package io.morin.archicode.workspace;

import java.util.ArrayList;
import java.util.List;

/**
 * The text of a {@link Fold.Plan} for the dry run of {@code archicode plateau fold} (wave 028, run 0207, issue #65). It is
 * a pure function of the plan: the same plan gives the same bytes, with no clock and no path of the machine.
 */
public final class FoldReport {

    private FoldReport() {}

    /**
     * Words a plan.
     *
     * @param plan what the fold would do
     * @return the lines, joined by a line feed, without a final one
     */
    public static String render(Fold.Plan plan) {
        final var out = new ArrayList<String>();
        out.add("plateau fold " + plan.folded() + " into " + plan.into() + " (dry run: nothing was written)");
        out.add("");
        out.add("after: `" + plan.into() + "` overrides `" + plan.newParent() + "`; " + stayWords(plan.stay()));
        block(
            out,
            "files rewritten (they lose their comments, quotes and layout):",
            plan.rewritten().stream().toList()
        );
        block(out, "files deleted:", plan.deleted());
        if (plan.foldedPatches() + plan.intoPatches() > 0) {
            block(
                out,
                "patches:",
                List.of(
                    "the " +
                        plan.foldedPatches() +
                        " patches of `" +
                        plan.folded() +
                        "` go in front of the " +
                        plan.intoPatches() +
                        " of `" +
                        plan.into() +
                        "`: " +
                        (plan.foldedPatches() + plan.intoPatches())
                )
            );
        }
        block(
            out,
            "replaces to compose:",
            plan
                .replaces()
                .stream()
                .map(
                    c ->
                        c.element() +
                        " (" +
                        c.where() +
                        "): " +
                        String.join(", ", c.from()) +
                        " -> " +
                        (c.to().isEmpty() ? "(none)" : String.join(", ", c.to()))
                )
                .toList()
        );
        block(
            out,
            "plateaus removed:",
            List.of(
                plan.folded() + ": a command line or a CI file that names it will fail",
                "the default --against of `" +
                    plan.into() +
                    "` changes from `" +
                    plan.folded() +
                    "` to `" +
                    plan.newParent() +
                    "`"
            )
        );
        out.add("");
        out.add(
            "The result is not checked here: the plateaus that stay are compared before and after when the fold is written"
        );
        return String.join("\n", out);
    }

    private static void block(List<String> out, String title, List<String> lines) {
        if (lines.isEmpty()) {
            return;
        }
        out.add("");
        out.add(title);
        lines.forEach(l -> out.add("  " + l));
    }

    private static String stayWords(List<String> stay) {
        if (stay.isEmpty()) {
            return "no other plateau stays";
        }
        final var names = stay
            .stream()
            .map(n -> "`" + n + "`")
            .toList();
        return (stay.size() == 1 ? "the plateau that stays is " : "the plateaus that stay are ") + Fold.listOf(names);
    }
}
