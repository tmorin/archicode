package io.morin.archicode.resource.plateau;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.Identifier;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;
import lombok.val;

/**
 * The plateaus of a workspace and how they stack: a tree whose root is {@code baseline}, each other plateau being a layer
 * over the one it overrides.
 * <p>
 * A plateau exists because an element says {@code plateau: <id>} in its header (a view and a story belong to no plateau), or because a manifest of
 * kind {@code plateau} declares it; the manifest is optional (a plateau that only headers name has no name, no horizon and
 * overrides {@code baseline}). {@code baseline} is the implicit root: it exists without anything naming it, and a manifest
 * without a {@code plateau} belongs to it.
 * <p>
 * Building the tree checks it, and every mistake is told, one sentence each: an id outside {@code [a-z0-9_-]} (so no dot),
 * a plateau declared by two manifests, an {@code override} that names no plateau, a {@code baseline} that overrides
 * something, a cycle. What is odd without being wrong is a warning: a plateau that only headers
 * name, two ids one letter apart when at least one of the two only has headers to name it (the typo; two plateaus with a
 * manifest each, such as {@code p1} and {@code p2}, are the author's choice, decided on 2026-10-18). The editor builds the
 * same tree with the same sentences ({@code buildPlateauTree} in {@code standalone.html}): keep them alike.
 * <p>
 * Loading a plateau is {@link #chain(String) its chain}: for each plateau from the root, the manifests that say {@code
 * plateau: <layer>} are added to the graph, then the patches of the layer are applied (the work of the loader). The tree
 * holds no element: what the manifests declare is checked against it with {@link
 * #redeclared(Map)}.
 */
public final class PlateauTree {

    private static final Pattern ID = Identifier.Of.PLATEAU.compiled();
    private static final Pattern HORIZON_YEAR = Pattern.compile("(\\d{4})");
    private static final Pattern HORIZON_MONTH = Pattern.compile("(\\d{4})-(\\d{2})");
    private static final Pattern HORIZON_DAY = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");
    private static final Pattern HORIZON_QUARTER = Pattern.compile("(\\d{4})-?Q([1-4])", Pattern.CASE_INSENSITIVE);
    private static final Pattern HORIZON_HALF = Pattern.compile("(\\d{4})-?H([12])", Pattern.CASE_INSENSITIVE);

    /**
     * One plateau of the tree.
     *
     * @param id       the id
     * @param name     the name its manifest gives it, or null
     * @param horizon  the horizon its manifest gives it, or null
     * @param parent   the id of the plateau it overrides; null for {@code baseline}, the root
     * @param patches  its patches in order; none for a plateau no manifest declares
     * @param manifest the manifest of kind {@code plateau} that declares it, or null when there is none
     * @param headers  the manifests whose header names it, sorted
     */
    public record Node(
        String id,
        String name,
        String horizon,
        String parent,
        List<Patch> patches,
        String manifest,
        List<String> headers
    ) {
        /** Whether a manifest of kind {@code plateau} declares it. */
        public boolean declared() {
            return manifest != null;
        }

        /** Whether it exists only because headers name it (never true of {@code baseline}). */
        public boolean headerOnly() {
            return manifest == null && !id.equals(Plateau.BASELINE) && !headers.isEmpty();
        }
    }

    /**
     * A manifest of kind {@code plateau}, and the file it is in.
     *
     * @param plateau the content of the manifest
     * @param source  the file, from the folder of the workspace
     */
    public record Declared(Plateau plateau, String source) {}

    private final Map<String, Node> nodes;
    private final List<String> warnings;
    private final String layeredBy;

    private PlateauTree(Map<String, Node> nodes, List<String> warnings, String layeredBy) {
        this.nodes = nodes;
        this.warnings = warnings;
        this.layeredBy = layeredBy;
    }

    /** What the manifests say, read once: the mistakes, the ids, who declares each, and the parent of each. */
    private record Analysis(
        List<String> problems,
        TreeSet<String> ids,
        Map<String, List<Declared>> declaredBy,
        Map<String, String> parents
    ) {}

    /**
     * The mistakes of the tree the manifests write, in a fixed order: the ids that are not valid, the plateaus declared more
     * than once, the overrides (a {@code baseline} that overrides, a plateau that does not exist), the cycles.
     *
     * @param declared the manifests of kind {@code plateau}, in the order they were read
     * @param headers  the plateau ids that headers name (the key {@code plateau} is written), each with the manifests that
     *                 name it
     * @return one sentence for each mistake; empty when the tree is right
     */
    public static List<String> problems(List<Declared> declared, Map<String, List<String>> headers) {
        return analyse(declared, headers).problems();
    }

    private static Analysis analyse(List<Declared> declared, Map<String, List<String>> headers) {
        val problems = new ArrayList<String>();

        // who says what: an id with the manifests of kind plateau that declare it and the headers that name it
        val declaredBy = new TreeMap<String, List<Declared>>();
        declared.forEach(d -> declaredBy.computeIfAbsent(d.plateau().getId(), id -> new ArrayList<>()).add(d));
        val ids = new TreeSet<String>(declaredBy.keySet());
        ids.addAll(headers.keySet());
        ids.add(Plateau.BASELINE);

        for (val id : ids) {
            if (!ID.matcher(id).matches()) {
                val files = new TreeSet<String>(headers.getOrDefault(id, List.of()));
                declaredBy.getOrDefault(id, List.of()).forEach(d -> files.add(d.source()));
                problems.add(
                    "the plateau id `" +
                        id +
                        "` in " +
                        listUpToThree(files) +
                        " is not valid: use lowercase letters, digits, `_` and `-`"
                );
            }
        }
        declaredBy.forEach((id, all) -> {
            if (all.size() > 1) {
                problems.add(duplicate(id, all.stream().map(Declared::source).toList()));
            }
        });

        val parents = new TreeMap<String, String>();
        for (val id : ids) {
            val first = declaredBy.getOrDefault(id, List.of()).stream().findFirst();
            val override = first.map(d -> d.plateau().getOverride()).orElse(null);
            if (id.equals(Plateau.BASELINE)) {
                if (override != null) {
                    problems.add(
                        "the plateau `baseline` (`" +
                            first.get().source() +
                            "`) is the root of the plateaus and cannot override `" +
                            override +
                            "`"
                    );
                }
                continue;
            }
            val parent = override == null ? Plateau.BASELINE : override;
            if (!ids.contains(parent)) {
                problems.add(
                    "the plateau `" +
                        id +
                        "` (`" +
                        first.get().source() +
                        "`) overrides `" +
                        parent +
                        "`, which is not a plateau of this workspace (the plateaus are " +
                        listAll(ids) +
                        ")"
                );
                continue;
            }
            parents.put(id, parent);
        }
        problems.addAll(cycles(parents));
        return new Analysis(problems, ids, declaredBy, parents);
    }

    /**
     * Build the tree and check it. A workspace that uses no plateau has {@code baseline} alone.
     *
     * @param declared  the manifests of kind {@code plateau}, in the order they were read
     * @param headers   the plateau ids that headers name (the key {@code plateau} is written), each with the manifests that
     *                  name it
     * @param layeredBy how the first manifest that uses layers does so, as a sentence that begins with its file (see {@link
     *                  #layeredBy()}), or null when none does
     * @return the tree
     * @throws ArchiCodeException with every mistake of the tree (see {@link #problems}), one sentence per line
     */
    public static PlateauTree of(List<Declared> declared, Map<String, List<String>> headers, String layeredBy) {
        val analysis = analyse(declared, headers);
        if (!analysis.problems().isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", analysis.problems()));
        }
        val declaredBy = analysis.declaredBy();
        val parents = analysis.parents();

        val nodes = new LinkedHashMap<String, Node>();
        val children = new TreeMap<String, TreeSet<String>>();
        parents.forEach((id, parent) -> children.computeIfAbsent(parent, p -> new TreeSet<>()).add(id));
        val order = new ArrayList<String>();
        preorder(Plateau.BASELINE, children, order);
        for (val id : order) {
            val own = declaredBy.getOrDefault(id, List.of()).stream().findFirst();
            nodes.put(
                id,
                new Node(
                    id,
                    own.map(d -> d.plateau().getName()).orElse(null),
                    own.map(d -> d.plateau().getHorizon()).orElse(null),
                    id.equals(Plateau.BASELINE) ? null : parents.get(id),
                    own.map(d -> d.plateau().getPatches()).orElse(List.of()),
                    own.map(Declared::source).orElse(null),
                    headers.getOrDefault(id, List.of()).stream().distinct().sorted().toList()
                )
            );
        }
        return new PlateauTree(nodes, warningsOf(nodes), layeredBy);
    }

    /** The order of the tree: a plateau, then what overrides it (each followed by what overrides it), the siblings by id. */
    private static void preorder(String id, Map<String, TreeSet<String>> children, List<String> out) {
        out.add(id);
        for (val child : children.getOrDefault(id, new TreeSet<>())) {
            preorder(child, children, out);
        }
    }

    /** The cycles of {@code parents}, each told once and starting from its smallest id. */
    private static List<String> cycles(Map<String, String> parents) {
        val out = new TreeMap<String, String>(); // by the smallest id: a cycle met from each of its plateaus is told once
        for (val start : parents.keySet()) {
            val path = new ArrayList<String>();
            String at = start;
            while (at != null && !path.contains(at)) {
                path.add(at);
                at = parents.get(at);
            }
            if (at == null) {
                continue;
            }
            val cycle = new ArrayList<>(path.subList(path.indexOf(at), path.size()));
            val smallest = cycle.stream().min(Comparator.naturalOrder()).orElseThrow();
            java.util.Collections.rotate(cycle, -cycle.indexOf(smallest));
            if (cycle.size() == 1) {
                out.put(smallest, "the plateau `" + smallest + "` overrides itself");
            } else {
                val steps = new ArrayList<String>();
                for (int i = 0; i < cycle.size(); i++) {
                    steps.add("`" + cycle.get(i) + "` overrides `" + cycle.get((i + 1) % cycle.size()) + "`");
                }
                out.put(smallest, "the plateaus " + listAll(cycle) + " form a cycle: " + String.join(", ", steps));
            }
        }
        return new ArrayList<>(out.values());
    }

    private static List<String> warningsOf(Map<String, Node> nodes) {
        val out = new ArrayList<String>();
        val sorted = new TreeMap<>(nodes);
        sorted.values().forEach(node -> {
            if (node.headerOnly()) {
                out.add(
                    "the plateau `" +
                        node.id() +
                        "` exists only through the `plateau` key of the header of " +
                        listUpToThree(node.headers()) +
                        ": it has no manifest of kind `archicode.morin.io/plateau`, so it overrides `baseline` and has no name"
                );
            }
        });
        val ids = new ArrayList<>(sorted.keySet());
        for (int i = 0; i < ids.size(); i++) {
            for (int j = i + 1; j < ids.size(); j++) {
                if (
                    oneLetterApart(ids.get(i), ids.get(j)) &&
                    (sorted.get(ids.get(i)).headerOnly() || sorted.get(ids.get(j)).headerOnly())
                ) {
                    out.add(
                        "the plateaus `" +
                            ids.get(i) +
                            "` and `" +
                            ids.get(j) +
                            "` have ids one letter apart: check that one of them is not a typo"
                    );
                }
            }
        }
        sorted.values().forEach(node -> {
            horizonWarning(node, nodes.get(node.parent())).ifPresent(out::add);
            out.addAll(repeatedSets(node));
        });
        return out;
    }

    /**
     * The warning for a horizon earlier than the one of the plateau it overrides (variant V10 of the Brightcart document). A
     * horizon is a free label that no tool interprets, except to order the siblings of the band when it reads as a date (see
     * {@link #horizonPeriod(String)}): the warning needs both to read as one, and the whole period of the plateau to end before
     * the period above begins ({@code 2026} under {@code 2026-Q4} is not earlier, {@code 2026-Q1} is).
     */
    private static Optional<String> horizonWarning(Node node, Node parent) {
        if (parent == null) {
            return Optional.empty();
        }
        val own = horizonPeriod(node.horizon());
        val above = horizonPeriod(parent.horizon());
        if (own == null || above == null || own[1] >= above[0]) {
            return Optional.empty();
        }
        return Optional.of(
            "the horizon `" +
                node.horizon() +
                "` of the plateau `" +
                node.id() +
                "` is earlier than the horizon `" +
                parent.horizon() +
                "` of the plateau it overrides, `" +
                parent.id() +
                "`"
        );
    }

    /**
     * The period a horizon label reads as, the first and the last day as numbers that sort ({@code yyyymmdd}), or null when it
     * reads as none: {@code 2026}, {@code 2026-10}, {@code 2026-10-18}, a quarter ({@code 2026-Q4}, {@code 2026Q4}) or a half
     * ({@code 2026-H2}). The editor reads labels the same way ({@code horizonPeriod} in {@code standalone.html}): keep them
     * alike.
     */
    static long[] horizonPeriod(String label) {
        if (label == null) {
            return null;
        }
        val text = label.trim();
        var m = HORIZON_YEAR.matcher(text);
        if (m.matches()) {
            return period(m.group(1), 1, 12);
        }
        m = HORIZON_MONTH.matcher(text);
        if (m.matches()) {
            return period(m.group(1), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(2)));
        }
        m = HORIZON_DAY.matcher(text);
        if (m.matches()) {
            return day(m.group(1), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)));
        }
        m = HORIZON_QUARTER.matcher(text);
        if (m.matches()) {
            val quarter = Integer.parseInt(m.group(2));
            return period(m.group(1), (quarter - 1) * 3 + 1, quarter * 3);
        }
        m = HORIZON_HALF.matcher(text);
        if (m.matches()) {
            val half = Integer.parseInt(m.group(2));
            return period(m.group(1), (half - 1) * 6 + 1, half * 6);
        }
        return null;
    }

    /** From the first day of {@code firstMonth} to the last day of {@code lastMonth}. */
    private static long[] period(String year, int firstMonth, int lastMonth) {
        try {
            if (Integer.parseInt(year) < 100) {
                return null; // the page's Date.UTC reads two-digit years as 19xx: such a label reads as none in both
            }
            val start = java.time.LocalDate.of(Integer.parseInt(year), firstMonth, 1);
            val end = java.time.YearMonth.of(Integer.parseInt(year), lastMonth).atEndOfMonth();
            return new long[] { number(start), number(end) };
        } catch (java.time.DateTimeException e) {
            return null;
        }
    }

    private static long[] day(String year, int month, int day) {
        try {
            if (Integer.parseInt(year) < 100) {
                return null;
            }
            val date = number(java.time.LocalDate.of(Integer.parseInt(year), month, day));
            return new long[] { date, date };
        } catch (java.time.DateTimeException e) {
            return null;
        }
    }

    private static long number(java.time.LocalDate date) {
        return date.getYear() * 10000L + date.getMonthValue() * 100L + date.getDayOfMonth();
    }

    /**
     * The warnings for two {@code SET} of the same field of the same element in one plateau (variant V9): the last one wins,
     * which is rarely what was meant. Only patches that name a {@code target} are compared; what a {@code json-path} selects
     * is not known before the patches are applied.
     */
    private static List<String> repeatedSets(Node node) {
        val ranks = new LinkedHashMap<String, List<Integer>>();
        val what = new LinkedHashMap<String, String>();
        var rank = 0;
        for (val patch : node.patches()) {
            rank++;
            if (patch.getOperator() != Patch.Operator.SET || !patch.hasTarget()) {
                continue;
            }
            val where = patch.getWhere();
            val field = patch.getField() != null ? patch.getField() : where != null ? "relationships" : null;
            if (field == null) {
                continue;
            }
            val layer = patch.getLayer() == Patch.Layer.TECHNOLOGY ? "technology" : "application";
            val towards =
                where == null
                    ? ""
                    : " (the relationship towards `" +
                      where.getDestination() +
                      "`" +
                      (where.getLabel() == null ? "" : " labelled `" + where.getLabel() + "`") +
                      ")";
            val key = layer + "|" + patch.getTarget() + "|" + field + towards;
            ranks.computeIfAbsent(key, k -> new ArrayList<>()).add(rank);
            what.putIfAbsent(key, "`" + field + "` of `" + patch.getTarget() + "`" + towards);
        }
        val out = new ArrayList<String>();
        ranks.forEach((key, all) -> {
            if (all.size() > 1) {
                val numbers = all.stream().map(String::valueOf).toList();
                out.add(
                    "the plateau `" +
                        node.id() +
                        "` sets " +
                        what.get(key) +
                        " in patches " +
                        listOf(numbers) +
                        ": the last one wins"
                );
            }
        });
        return out;
    }

    /** Whether two ids differ by one letter added, removed or changed. */
    static boolean oneLetterApart(String a, String b) {
        if (a.equals(b) || Math.abs(a.length() - b.length()) > 1) {
            return false;
        }
        val shorter = a.length() <= b.length() ? a : b;
        val longer = a.length() <= b.length() ? b : a;
        int i = 0;
        while (i < shorter.length() && shorter.charAt(i) == longer.charAt(i)) {
            i++;
        }
        if (shorter.length() == longer.length()) {
            return shorter.substring(i + 1).equals(longer.substring(i + 1));
        }
        return shorter.substring(i).equals(longer.substring(i + 1));
    }

    /**
     * The sentence for a plateau declared by more than one manifest.
     *
     * @param id      the id
     * @param sources the files, one entry for each manifest
     * @return the sentence, in the words of a reference declared twice
     */
    static String duplicate(String id, List<String> sources) {
        val counts = new TreeMap<String, Integer>();
        sources.forEach(source -> counts.merge(source, 1, Integer::sum));
        val times = sources.size() == 2 ? "twice" : sources.size() + " times";
        if (counts.size() == 1) {
            return "the plateau `" + id + "` is declared " + times + " in `" + sources.get(0) + "`";
        }
        val files = counts
            .keySet()
            .stream()
            .map(file -> "`" + file + "`")
            .toList();
        return (
            "the plateau `" +
            id +
            "` is declared " +
            times +
            ": in " +
            String.join(", ", files.subList(0, files.size() - 1)) +
            " and " +
            files.get(files.size() - 1)
        );
    }

    /** Some names for a sentence: `a`, `a` and `b`, `a`, `b` and `c`, and past three, the first three and how many more. */
    static String listUpToThree(Collection<String> names) {
        val all = names
            .stream()
            .map(n -> "`" + n + "`")
            .toList();
        if (all.size() <= 3) {
            return listOf(all);
        }
        return String.join(", ", all.subList(0, 3)) + " and " + (all.size() - 3) + " more";
    }

    /** Every name of a list for a sentence: `a`, `a` and `b`, `a`, `b` and `c`, `a`, `b`, `c` and `d`... */
    static String listAll(Collection<String> names) {
        return listOf(
            names
                .stream()
                .map(n -> "`" + n + "`")
                .toList()
        );
    }

    private static String listOf(List<String> all) {
        if (all.size() == 1) {
            return all.get(0);
        }
        return String.join(", ", all.subList(0, all.size() - 1)) + " and " + all.get(all.size() - 1);
    }

    /**
     * Whether the workspace uses layered plateaus: a header says {@code plateau}, or a manifest has the kind {@code plateau}.
     *
     * @return true when one does
     */
    public boolean isLayered() {
        return layeredBy != null;
    }

    /**
     * How the first manifest that uses layers does so, as a sentence that begins with its file: {@code `a.yaml` says
     * `plateau: x` in its header} or {@code `p.yaml` is a manifest of kind `archicode.morin.io/plateau`}.
     *
     * @return the sentence, or null when no manifest uses layers
     */
    public String layeredBy() {
        return layeredBy;
    }

    /**
     * The plateaus in the order of the tree: {@code baseline}, then what overrides it, each plateau followed by what
     * overrides it, the siblings by id.
     *
     * @return the plateaus
     */
    public List<Node> nodes() {
        return List.copyOf(nodes.values());
    }

    /**
     * The ids of the plateaus, in the order of {@link #nodes()}.
     *
     * @return the ids
     */
    public List<String> ids() {
        return List.copyOf(nodes.keySet());
    }

    /**
     * Whether a plateau exists.
     *
     * @param id the id
     * @return true when it does
     */
    public boolean contains(String id) {
        return nodes.containsKey(id);
    }

    /**
     * A plateau.
     *
     * @param id the id
     * @return the plateau
     * @throws ArchiCodeException when there is none
     */
    public Node node(String id) {
        val node = nodes.get(id);
        if (node == null) {
            throw new ArchiCodeException(
                "unknown plateau `%s`: the plateaus of this workspace are %s",
                id,
                listAll(nodes.keySet())
            );
        }
        return node;
    }

    /**
     * What a plateau is loaded from: the plateaus from the root down to it, itself last. The loader adds the manifests of
     * each, then applies its patches, in that order.
     *
     * @param id the id of the plateau
     * @return the chain, {@code baseline} first
     * @throws ArchiCodeException when there is no such plateau
     */
    public List<Node> chain(String id) {
        val chain = new ArrayList<Node>();
        for (Node at = node(id); at != null; at = at.parent() == null ? null : nodes.get(at.parent())) {
            chain.add(0, at);
        }
        return chain;
    }

    /**
     * The plateaus a plateau is a layer over, the root first, itself not included.
     *
     * @param id the id of the plateau
     * @return the ancestors; none for {@code baseline}
     */
    public List<Node> ancestors(String id) {
        val chain = chain(id);
        return chain.subList(0, chain.size() - 1);
    }

    /**
     * Whether two plateaus are on one chain: they are the same, or one is an ancestor of the other, so that one is the past of the
     * other. Two plateaus that override the same one without one overriding the other are siblings, two alternatives.
     *
     * @param first the id of a plateau
     * @param second the id of another
     * @return true when one is the past of the other
     * @throws ArchiCodeException when there is no such plateau
     */
    public boolean onOneChain(String first, String second) {
        return (
            chain(first)
                .stream()
                .anyMatch(n -> n.id().equals(second)) ||
            chain(second)
                .stream()
                .anyMatch(n -> n.id().equals(first))
        );
    }

    /**
     * The plateaus a plateau is built on that no other plateau shares with it, for composing the {@code replaces} of the layers
     * between two plateaus (wave 017, issue #89): from the plateau {@code target} has in common with {@code other} (the deepest
     * ancestor of both, either of them included) up to the plateau {@code target} overrides, the root side first, {@code target}
     * itself not included. None when {@code target} is that common plateau (it is the past of {@code other}, or the same).
     * {@code other} is the base when {@code target} is a descendant of it; between two siblings it is their last common plateau.
     *
     * @param target the plateau that is compared
     * @param other  the plateau it is compared with
     * @return the plateaus the target stands on, oldest first
     * @throws ArchiCodeException when there is no such plateau
     */
    public List<Node> standsOn(String target, String other) {
        val chain = chain(target);
        val shared = chain(other).stream().map(Node::id).collect(java.util.stream.Collectors.toSet());
        var common = -1;
        for (var i = 0; i < chain.size(); i++) {
            if (shared.contains(chain.get(i).id())) {
                common = i;
            }
        }
        return common < 0 ? List.of() : List.copyOf(chain.subList(common, chain.size() - 1));
    }

    /**
     * The plateaus that override a plateau directly, sorted by id.
     *
     * @param id the id of the plateau
     * @return the children
     */
    public List<Node> children(String id) {
        node(id);
        return nodes
            .values()
            .stream()
            .filter(n -> id.equals(n.parent()))
            .sorted(Comparator.comparing(Node::id))
            .toList();
    }

    /**
     * What is odd without being wrong: a plateau that only headers name, two ids one letter apart.
     *
     * @return the sentences, without {@code warning:} in front
     */
    public List<String> warnings() {
        return warnings;
    }

    /**
     * Check that what the manifests declare is declared once in a chain of plateaus: a reference declared in a plateau and
     * again in one of its ancestors is an error, since the plateau would have two answers for it. Two plateaus that do not
     * stack (two alternatives) may each declare the same reference. A reference declared twice in one plateau is not told
     * here (the parser does). A view and a story are not concerned: they belong to no plateau (wave 015, run 0100).
     *
     * @param declarations where each thing is declared: by plateau, by layer ({@code application}, {@code technology}), by
     *                     reference, the files; an entry of a key that is no plateau of the tree is not looked at
     * @return the redeclarations, one sentence each, by reference; empty when there is none
     */
    public List<String> redeclared(Map<String, Map<String, Map<String, List<String>>>> declarations) {
        val messages = new TreeMap<String, TreeSet<String>>(); // by reference, then by message
        for (val node : nodes.values()) {
            val own = declarations.getOrDefault(node.id(), Map.of());
            for (val ancestor : ancestors(node.id())) {
                val above = declarations.getOrDefault(ancestor.id(), Map.of());
                own.forEach((namespace, references) ->
                    references.forEach((reference, sources) -> {
                        val ancestorSources = above.getOrDefault(namespace, Map.of()).get(reference);
                        if (ancestorSources == null) {
                            return;
                        }
                        messages
                            .computeIfAbsent(reference, r -> new TreeSet<>())
                            .add(
                                "the reference `" +
                                    reference +
                                    "` is declared in the plateau `" +
                                    node.id() +
                                    "` (" +
                                    listUpToThree(new TreeSet<>(new HashSet<>(sources))) +
                                    ") and again in its ancestor `" +
                                    ancestor.id() +
                                    "` (" +
                                    listUpToThree(new TreeSet<>(new HashSet<>(ancestorSources))) +
                                    ")"
                            );
                    })
                );
            }
        }
        return messages.values().stream().flatMap(Set::stream).toList();
    }
}
