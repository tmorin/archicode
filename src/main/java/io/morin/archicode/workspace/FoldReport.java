package io.morin.archicode.workspace;

import java.util.ArrayList;
import java.util.List;

/**
 * The text of a {@link FoldCheck.Folded} for {@code archicode plateau fold} (wave 028, runs 0207 and 0208, issue #65), in
 * its two modes: the dry run, which says what the fold would do, and the fold, which says what it did. It is a pure function
 * of the outcome: the same outcome gives the same bytes, with no clock and no path of the machine.
 */
public final class FoldReport {

    private FoldReport() {}

    /**
     * Words the outcome of a fold.
     *
     * @param folded the plan, what was compared, and whether the files were written
     * @return the lines, joined by a line feed, without a final one
     */
    public static String render(FoldCheck.Folded folded) {
        final var plan = folded.plan();
        final var out = new ArrayList<String>();
        out.add(
            "plateau fold " +
                plan.folded() +
                " into " +
                plan.into() +
                (folded.written() ? " (written)" : " (dry run: nothing was written)")
        );
        out.add("");
        out.add("after: `" + plan.into() + "` overrides `" + plan.newParent() + "`; " + stayWords(plan.stay()));
        block(
            out,
            "files rewritten (they " + (folded.written() ? "lost" : "lose") + " their comments, quotes and layout):",
            plan.rewritten().stream().toList()
        );
        block(
            out,
            "files deleted:",
            plan
                .deleted()
                .stream()
                .map(file -> file + notKept(plan))
                .toList()
        );
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
            "checked on a temporary copy before writing: the models of the " +
                folded.check().plateaus() +
                " plateaus that remain and the " +
                folded.check().comparisons() +
                " comparisons between them are the same before and after, but for the PLATEAU and PATCH columns of the cascade"
        );
        if (folded.written()) {
            out.add("Read what changed with `git diff`, and run `archicode plateau list` and `archicode diff`");
        }
        return String.join("\n", out);
    }

    /** What the deleted manifest took with it: its name and its horizon, when it had them. */
    private static String notKept(Fold.Plan plan) {
        final var parts = new ArrayList<String>();
        if (plan.foldedName() != null) {
            parts.add("name \"" + plan.foldedName() + "\"");
        }
        if (plan.foldedHorizon() != null) {
            parts.add("horizon \"" + plan.foldedHorizon() + "\"");
        }
        if (parts.isEmpty()) {
            return "";
        }
        return " (its " + String.join(" and its ", parts) + (parts.size() == 1 ? " is" : " are") + " not kept)";
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
