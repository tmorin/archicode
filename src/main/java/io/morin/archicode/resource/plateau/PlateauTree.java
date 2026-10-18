package io.morin.archicode.resource.plateau;

import io.morin.archicode.ArchiCodeException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;
import lombok.val;

/**
 * The plateaus of a workspace and how they stack: a tree whose root is {@code baseline}, each other plateau being a layer
 * over the one it overrides.
 * <p>
 * A plateau exists because an element, a view or a story says {@code plateau: <id>} in its header, or because a manifest of
 * kind {@code plateau} declares it; the manifest is optional (a plateau that only headers name has no name, no horizon and
 * overrides {@code baseline}). {@code baseline} is the implicit root: it exists without anything naming it, and a manifest
 * without a {@code plateau} belongs to it.
 * <p>
 * Building the tree checks it, and every mistake is told, one sentence each: an id outside {@code [a-z0-9_-]} (so no dot),
 * a plateau declared by two manifests, an {@code override} that names no plateau, a {@code baseline} that overrides
 * something, a cycle. What is odd without being wrong is a warning: a plateau that only headers
 * name, two ids one letter apart. The editor builds the same tree with the same sentences ({@code buildPlateauTree} in
 * {@code standalone.html}): keep them alike.
 * <p>
 * Loading a plateau is {@link #chain(String) its chain}: for each plateau from the root, the manifests that say {@code
 * plateau: <layer>} are added to the graph, then the patches of the layer are applied (the work of the loader). The tree
 * holds no element, no view and no story: what the manifests declare is checked against it with {@link
 * #redeclared(Map)}.
 */
public final class PlateauTree {

    private static final Pattern ID = Pattern.compile("[a-z0-9_-]+");

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
                if (oneLetterApart(ids.get(i), ids.get(j))) {
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
     * Check that what the manifests declare is declared once in a chain of plateaus: a reference (a view, a story) declared in
     * a plateau and again in one of its ancestors is an error, since the plateau would have two answers for it. Two plateaus
     * that do not stack (two alternatives) may each declare the same reference. A reference declared twice in one plateau is
     * not told here (the parser does).
     *
     * @param declarations where each thing is declared: by plateau, by the kind of thing ({@code application}, {@code
     *                     technology}, {@code view}, {@code story}), by reference (by id for a view and a story), the files
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
                        val noun = namespace.equals("view") || namespace.equals("story") ? namespace : "reference";
                        messages
                            .computeIfAbsent(reference, r -> new TreeSet<>())
                            .add(
                                "the " +
                                    noun +
                                    " `" +
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
