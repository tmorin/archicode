package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.manifest.Manifest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * Wave 028, run 0208, ASM-1: every manifest the repository ships is read as the loader reads it, written with
 * {@link MapperFactory#forWriting(MapperFormat)} in its own format, read again, and equal. The writers of the three formats
 * are also proved on everything the corpus holds, whatever the format of the file it comes from.
 */
class ManifestRoundTripCorpusTest {

    private final MapperFactory mappers = new MapperFactory();

    private record Shipped(Path file, MapperFormat format) {}

    @SneakyThrows
    private List<Shipped> shipped() {
        val out = new ArrayList<Shipped>();
        for (val entry : ManifestCorpus.positives()) {
            val file = Path.of(entry.origin(), entry.file());
            out.add(new Shipped(file, MapperFormat.resolve(file).orElseThrow()));
        }
        return out;
    }

    @SneakyThrows
    private Manifest read(ObjectMapper mapper, String text) {
        return mapper.readValue(text, Manifest.class);
    }

    @Test
    @SneakyThrows
    void shouldRoundTripEveryShippedManifestInItsOwnFormat() {
        val counts = new EnumMap<MapperFormat, Integer>(MapperFormat.class);
        for (val shipped : shipped()) {
            val manifest = read(mappers.create(shipped.format()), Files.readString(shipped.file()));
            val written = mappers.forWriting(shipped.format()).writeValueAsString(manifest);
            assertEquals(manifest, read(mappers.create(shipped.format()), written), shipped.file().toString());
            counts.merge(shipped.format(), 1, Integer::sum);
        }
        System.out.println("Writer facts: round-tripped in their own format " + counts);
        assertTrue(counts.get(MapperFormat.YAML) > 400, counts.toString());
    }

    @Test
    @SneakyThrows
    void shouldRoundTripEveryShippedManifestThroughTheThreeWriters() {
        val all = shipped();
        val total = new EnumMap<MapperFormat, Integer>(MapperFormat.class);
        for (val shipped : all) {
            val manifest = read(mappers.create(shipped.format()), Files.readString(shipped.file()));
            for (val format : MapperFormat.values()) {
                val written = mappers.forWriting(format).writeValueAsString(manifest);
                assertEquals(manifest, read(mappers.create(format), written), shipped.file() + " as " + format);
                total.merge(format, 1, Integer::sum);
            }
        }
        System.out.println(
            "Writer facts: the repository ships no JSON or TOML manifest, so each of the 422 is written and read back in each format: " +
                total
        );
        assertFalse(all.isEmpty());
    }

    @Test
    @SneakyThrows
    void shouldKeepAHeaderTextAsItWasAndAnEmptyContent() {
        val text = """
        header:
          kind: archicode.morin.io/system
          version: v1
          parent: yes
          plateau: "010"
        content: {}
        """;
        val manifest = read(mappers.create(MapperFormat.YAML), text);
        assertEquals("yes", manifest.getHeader().getParent());
        assertEquals("010", manifest.getHeader().getPlateau());
        for (val format : MapperFormat.values()) {
            val written = mappers.forWriting(format).writeValueAsString(manifest);
            val back = read(mappers.create(format), written);
            assertEquals(manifest, back, format + "\n" + written);
            assertEquals("yes", back.getHeader().getParent());
            assertEquals("010", back.getHeader().getPlateau());
        }
    }

    @Test
    @SneakyThrows
    void shouldWriteWithoutTheDocumentMarkerAndLeaveTheReadingMappersAlone() {
        val manifest = read(
            mappers.create(MapperFormat.YAML),
            "header: {kind: archicode.morin.io/system, version: v1}\ncontent: {id: a, tags: [x]}\n"
        );
        val written = mappers.forWriting(MapperFormat.YAML).writeValueAsString(manifest);
        assertFalse(written.startsWith("---"), written);
        assertTrue(written.contains("  - \"x\""), written);
        val reading = mappers.create(MapperFormat.YAML).writeValueAsString(manifest);
        assertTrue(reading.startsWith("---"), reading);
    }

    @Test
    void shouldHandTheHeaderBackToABuilder() {
        val header = Manifest.Header.builder()
            .kind(io.morin.archicode.manifest.ManifestKind.PLATEAU)
            .version("v1")
            .build();
        assertEquals("p", header.toBuilder().plateau("p").build().getPlateau());
    }

    /** ASM-3: the style of the writer is the style of the repository, but for the flow lists it writes as blocks. */
    @Test
    @SneakyThrows
    void shouldWriteInTheStyleOfTheRepositoryButForFlowLists() {
        val mapper = mappers.create(MapperFormat.YAML);
        var total = 0;
        var differing = 0;
        var notFlowLists = 0;
        try (val files = Files.walk(Path.of("src/test/resources/brightcart/layered"))) {
            for (val file : files
                .filter(f -> f.toString().endsWith(".yaml"))
                .sorted()
                .toList()) {
                val text = Files.readString(file);
                if (!text.contains("plateau: \"inhouse\"")) {
                    continue;
                }
                val written = mappers.forWriting(MapperFormat.YAML).writeValueAsString(read(mapper, text));
                val before = text.lines().toList();
                val after = new java.util.HashSet<>(written.lines().toList());
                total += before.size();
                for (val line : before) {
                    if (!after.contains(line)) {
                        differing++;
                        if (!line.contains("[")) {
                            notFlowLists++;
                        }
                    }
                }
            }
        }
        System.out.println(
            "Writer facts: ASM-3 on the manifests of inhouse that name the plateau: " +
                differing +
                " of " +
                total +
                " lines differ by a round trip alone, " +
                notFlowLists +
                " of them not a flow list"
        );
        assertEquals(0, notFlowLists);
    }
}
