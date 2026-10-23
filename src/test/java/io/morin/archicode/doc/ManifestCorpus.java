package io.morin.archicode.doc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.brightcart.Brightcart;
import io.morin.archicode.brightcart.BrightcartNegativeCasesTest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.TreeMap;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;

/**
 * Every file the repository ships (or generates) that a schema of manifests is held to, with the verdict it is expected to
 * have, so that a schema is checked against the loader's own examples and not against the words of the run that wrote it
 * (wave 022, validation architecture).
 * <ul>
 *   <li>C1, the positives: every manifest of every workspace the repository ships, in the manual ({@code src/doc/examples}) and
 *       as fixtures ({@code src/test/resources}); {@code ShippedFilesTest} loads every one of those workspaces.</li>
 *   <li>C2, the cases of {@code negative-cases.json}: each is the layered Brightcart altered. A case whose first command
 *       succeeds adds positives (the manifests it writes load); a case whose first command fails on a manifest with a reason
 *       about the shape of the file ({@code unknown key}, {@code wrong shape}, {@code unrecognized}, {@code Missing}...) is a
 *       <em>structural</em> negative: the file it names is rejected; every other case is <em>semantic</em> (or about
 *       {@code .archicode.yaml}), and is listed in {@code schemas/not-expressible.json} with the reason a schema cannot say it.</li>
 *   <li>C3, the output of {@code init}, and C4, the manifests of the guide: added by the runs that build them.</li>
 * </ul>
 */
final class ManifestCorpus {

    /** A manifest file: where it is (from the root of the repository, or of the altered copy) and what it holds. */
    record Entry(String origin, String file, JsonNode document) {}

    /** A case of {@code negative-cases.json} after its alteration. */
    record Case(
        String id,
        String title,
        Verdict verdict,
        /** The file the error names, from the root of the workspace; null unless the verdict is STRUCTURAL. */
        String named,
        List<Entry> manifests,
        String error,
        Path root
    ) {}

    enum Verdict {
        /** The command succeeds: the manifests of the case load, so the schema accepts them. */
        LOADS,
        /** The command fails on the shape of a manifest: the schema rejects the file the error names. */
        STRUCTURAL,
        /** The command fails for another reason (a reference, a plateau, {@code .archicode.yaml}...): see {@code not-expressible.json}. */
        OTHER
    }

    private static final String STRUCTURAL =
        "^error: `([^`]+)` is not valid: (unknown key|the value has the wrong shape|unrecognized|Missing|unknown kind|missing `kind`).*$";

    private ManifestCorpus() {}

    static ObjectMapper mapperOf(Path file) {
        val name = file.getFileName().toString();
        for (val format : MapperFormat.values()) {
            if (format.getExtensions().stream().anyMatch(name::endsWith)) {
                return new MapperFactory().create(format);
            }
        }
        throw new IllegalArgumentException(name);
    }

    /** Whether a file is read as a manifest by its name: a YAML, JSON or TOML file that is not the workspace file. */
    private static boolean candidate(Path file) {
        val name = file.getFileName().toString();
        return (
            !name.equals(".archicode.yaml") &&
            Arrays.stream(MapperFormat.values()).anyMatch(f -> f.getExtensions().stream().anyMatch(name::endsWith))
        );
    }

    /** The manifests under a folder: the files that read as a document with a {@code header}. */
    @SneakyThrows
    static List<Entry> manifestsUnder(Path folder, String origin) {
        val out = new ArrayList<Entry>();
        try (Stream<Path> files = Files.walk(folder)) {
            for (val file : files.filter(Files::isRegularFile).filter(ManifestCorpus::candidate).sorted().toList()) {
                val relative = folder.relativize(file).toString().replace('\\', '/');
                if (relative.startsWith("views")) {
                    continue; // the files the commands generate
                }
                JsonNode document;
                try {
                    document = mapperOf(file).readTree(Files.readString(file));
                } catch (Exception e) {
                    continue; // a file the reader of manifests does not read as a document: not a manifest
                }
                if (document != null && document.isObject() && document.has("header")) {
                    out.add(new Entry(origin, relative, document));
                }
            }
        }
        return out;
    }

    /** C1: the manifests of the workspaces the repository ships. */
    @SneakyThrows
    static List<Entry> positives() {
        val out = new ArrayList<Entry>();
        for (val workspace : ShippedFilesTest.workspaces()) {
            val folder = Path.of(workspace).getParent();
            out.addAll(manifestsUnder(folder, folder.toString().replace('\\', '/')));
        }
        return out;
    }

    /**
     * C4: the manifests of the small workspace that {@code archicode guide} ends with (wave 022, run 0159): the {@code yaml}
     * blocks of the guide that are files under {@code manifests/}, read as the loader reads them. They are positives.
     */
    static List<Entry> guide(String guide) {
        val out = new ArrayList<Entry>();
        GuideBlocks.files(guide).forEach((path, text) -> {
            if (path.startsWith("manifests/")) {
                out.add(new Entry("guide", path, parse(path, text)));
            }
        });
        return out;
    }

    @SneakyThrows
    private static JsonNode parse(String path, String text) {
        return mapperOf(Path.of(path)).readTree(text);
    }

    /** The ids of the cases of {@code negative-cases.json}, in the order of the file. */
    @SneakyThrows
    static List<JsonNode> caseNodes() {
        val out = new ArrayList<JsonNode>();
        Brightcart.MAPPER.readTree(Files.readString(Brightcart.ROOT.resolve("negative-cases.json")))
            .get("cases")
            .forEach(out::add);
        return out;
    }

    /** C2: a case altered in {@code dir} (an empty folder), with the verdict its first command gives. */
    static Case altered(JsonNode node, Path dir) {
        Brightcart.copy(dir);
        BrightcartNegativeCasesTest.alter(dir, node.get("ops"));
        val manifests = manifestsUnder(dir, node.get("id").asText());
        val first = node.path("cli").path(0);
        val lines = first.path("stderr");
        val last = lines.isEmpty() ? "" : lines.get(lines.size() - 1).asText();
        if (first.path("exit").asInt(1) == 0) {
            return new Case(
                node.get("id").asText(),
                node.get("title").asText(),
                Verdict.LOADS,
                null,
                manifests,
                last,
                dir
            );
        }
        val matcher = java.util.regex.Pattern.compile(STRUCTURAL).matcher(last);
        if (
            matcher.matches() &&
            !matcher.group(1).equals(".archicode.yaml") &&
            !last.contains("with no `header.parent`")
        ) {
            return new Case(
                node.get("id").asText(),
                node.get("title").asText(),
                Verdict.STRUCTURAL,
                matcher.group(1),
                manifests,
                last,
                dir
            );
        }
        return new Case(node.get("id").asText(), node.get("title").asText(), Verdict.OTHER, null, manifests, last, dir);
    }

    /**
     * The document of the file an error names, in the altered copy: {@code null} for a file that holds nothing, or only {@code null}
     * (it is no manifest, and the schema must refuse it all the same).
     */
    @SneakyThrows
    static JsonNode named(Case c) {
        val file = c.root().resolve(c.named());
        return mapperOf(file).readTree(Files.readString(file));
    }

    /** The files the cases list by id, as {@code id -> category}, from {@code schemas/not-expressible.json}. */
    @SneakyThrows
    static TreeMap<String, String> notExpressible() {
        val out = new TreeMap<String, String>();
        val file = Brightcart.MAPPER.readTree(
            Files.readString(Path.of("src/test/resources/schemas/not-expressible.json"))
        );
        for (val limit : file.get("limits")) {
            for (val id : limit.get("cases")) {
                out.put(id.asText(), limit.get("id").asText());
            }
        }
        return out;
    }
}
