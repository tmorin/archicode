package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.Warnings;
import io.morin.archicode.viewpoint.kernel.ViewpointKernel;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.mockito.InjectSpy;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.AdditionalAnswers;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

/**
 * The cases of {@code fold-cases.json} that are whole workspaces, run through the service (wave 028, runs 0207 and 0208,
 * #65): the sentence of a refusal, the report of a dry run, the files of a fold, and the proof that a refusal and a dry run
 * leave the folder as it was, byte for byte.
 */
@QuarkusTest
class PlateauFoldServiceTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/fold-cases.json");

    @Inject
    PlateauFoldService service;

    @Inject
    Warnings warnings;

    @InjectSpy
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    /** The operations of a dry run: none may be called. */
    private static final FoldFiles NEVER = new FoldFiles() {
        @Override
        public byte[] read(Path file) {
            return fail("a dry run or a refusal reads through the writer: " + file);
        }

        @Override
        public Path stage(Path target, byte[] bytes) {
            return fail("a dry run or a refusal stages a file: " + target);
        }

        @Override
        public void move(Path staged, Path target) {
            fail("a dry run or a refusal moves a file: " + target);
        }

        @Override
        public void delete(Path file) {
            fail("a dry run or a refusal deletes a file: " + file);
        }

        @Override
        public void restore(Path file, byte[] bytes) {
            fail("a dry run or a refusal restores a file: " + file);
        }
    };

    @TestFactory
    @SneakyThrows
    Stream<DynamicTest> shouldRunEveryCaseOfTheFile() {
        val cases = new ObjectMapper().readTree(CASES.toFile()).get("cases");
        val tests = new ArrayList<DynamicTest>();
        for (JsonNode c : cases) {
            if (c.has("scope") && "command".equals(c.get("scope").asText())) {
                continue;
            }
            tests.add(DynamicTest.dynamicTest(c.get("id").asText() + " " + c.get("what").asText(), () -> run(c)));
        }
        return tests.stream();
    }

    @SneakyThrows
    private void run(JsonNode c) {
        val folder = dir.resolve(c.get("id").asText());
        prepare(c, folder);
        val args = new ArrayList<String>();
        c.get("args").forEach(a -> args.add(a.asText()));
        val id = args.get(0);
        val write = !args.contains("--dry-run");
        val workspace = folder.resolve(".archicode.yaml");
        val expect = c.get("expect");
        val before = snapshot(folder);
        warnings.drain();

        if (expect.has("error")) {
            val thrown = assertThrows(ArchiCodeException.class, () -> service.fold(workspace, id, write, NEVER));
            assertEquals(expect.get("error").asText(), "error: " + thrown.getMessage());
            assertEquals(before, snapshot(folder), "a refusal leaves the folder as it was");
            return;
        }
        val files = write ? FoldFiles.disk() : NEVER;
        val folded = service.fold(workspace, id, write, files);
        assertEquals(write, folded.written());
        if (!c.get("base").isNull()) {
            // the Brightcart says nothing as it is, so whatever the loads of the temporary copy said would be theirs
            assertEquals(List.of(), warnings.drain(), "the loads of the copy say nothing to the user");
        }
        if (expect.has("output")) {
            val lines = new ArrayList<String>();
            expect.get("output").forEach(line -> lines.add(line.asText()));
            assertEquals(String.join("\n", lines), FoldReport.render(folded));
        }
        if (!write) {
            assertEquals(before, snapshot(folder), "a dry run leaves the folder as it was");
            // the same workspace, the same bytes
            assertEquals(FoldReport.render(folded), FoldReport.render(service.fold(workspace, id, false, NEVER)));
        }
        if (expect.has("files")) {
            assertFiles(expect.get("files"), folder, before);
        }
    }

    /** Every file the case names is as it says, and every other file is byte for byte what it was. */
    @SneakyThrows
    private static void assertFiles(JsonNode expected, Path folder, Map<String, String> before) {
        val after = snapshot(folder);
        for (val path : (Iterable<String>) expected::fieldNames) {
            val said = expected.get(path);
            if (said.isNull()) {
                assertFalse(after.containsKey(path), path + " is deleted");
            } else if ("changed".equals(said.asText())) {
                assertTrue(after.containsKey(path), path + " is written");
                assertNotEquals(before.get(path), after.get(path), path + " changed");
            } else {
                assertTrue(after.containsKey(path), path + " is written");
                assertEquals(said.asText(), after.get(path), path);
            }
        }
        for (val entry : before.entrySet()) {
            if (!expected.has(entry.getKey())) {
                assertEquals(entry.getValue(), after.get(entry.getKey()), entry.getKey() + " is untouched");
            }
        }
        for (val path : after.keySet()) {
            assertTrue(before.containsKey(path) || expected.has(path), path + " was not there and is not expected");
        }
    }

    /** The case of {@code fold-cases.json} with this id. */
    @SneakyThrows
    private static JsonNode caseOf(String id) {
        for (JsonNode c : new ObjectMapper().readTree(CASES.toFile()).get("cases")) {
            if (id.equals(c.get("id").asText())) {
                return c;
            }
        }
        return fail("no case " + id);
    }

    /** The production operations, failing at the nth call of one of them, never on the removal of a staged file. */
    private static final class FailingAt implements FoldFiles {

        private final FoldFiles real = FoldFiles.disk();
        private final String operation;
        private final int at;
        private final AtomicInteger count = new AtomicInteger();

        FailingAt(String operation, int at) {
            this.operation = operation;
            this.at = at;
        }

        private void maybe(String op, Path file) throws java.io.IOException {
            val staged = file.getFileName().toString().endsWith(".archicode-fold");
            if (op.equals(operation) && !staged && count.incrementAndGet() == at) {
                throw new java.io.IOException("disk full at " + file.getFileName());
            }
        }

        @Override
        public byte[] read(Path file) throws java.io.IOException {
            return real.read(file);
        }

        @Override
        public Path stage(Path target, byte[] bytes) throws java.io.IOException {
            maybe("stage", target);
            return real.stage(target, bytes);
        }

        @Override
        public void move(Path staged, Path target) throws java.io.IOException {
            maybe("move", target);
            real.move(staged, target);
        }

        @Override
        public void delete(Path file) throws java.io.IOException {
            maybe("delete", file);
            real.delete(file);
        }

        @Override
        public void restore(Path file, byte[] bytes) throws java.io.IOException {
            real.restore(file, bytes);
        }
    }

    @Test
    @SneakyThrows
    void shouldLeaveTheBrightcartAsItWasWhenTheWriteFailsAtAnyOperation() {
        val c = caseOf("F07");
        // 13 files are rewritten, then the folded manifest is deleted
        for (val failure : List.of("stage 1", "stage 13", "move 1", "move 7", "move 13", "delete 1")) {
            val parts = failure.split(" ");
            val folder = dir.resolve("failing-" + failure.replace(' ', '-'));
            prepare(c, folder);
            val before = snapshot(folder);

            val thrown = assertThrows(ArchiCodeException.class, () ->
                service.fold(
                    folder.resolve(".archicode.yaml"),
                    "inhouse",
                    true,
                    new FailingAt(parts[0], Integer.parseInt(parts[1]))
                )
            );

            assertTrue(thrown.getMessage().startsWith("the fold stopped at `"), thrown.getMessage());
            assertTrue(thrown.getMessage().endsWith("): every file is as it was"), thrown.getMessage());
            assertEquals(before, snapshot(folder), failure + " leaves the folder as it was, staged files included");
        }
    }

    @Test
    @SneakyThrows
    void shouldRefuseASecondFoldOfTheBrightcartWithTheSentenceOfAnUnknownPlateau() {
        val c = caseOf("F07");
        val folder = dir.resolve("twice");
        prepare(c, folder);
        val workspace = folder.resolve(".archicode.yaml");

        val folded = service.fold(workspace, "inhouse", true, FoldFiles.disk());
        assertTrue(folded.written());
        val after = snapshot(folder);
        assertFalse(after.containsKey("inhouse/plateau.yaml"));

        val thrown = assertThrows(ArchiCodeException.class, () -> service.fold(workspace, "inhouse", true, NEVER));
        // the sentence of F01, with the plateaus that are left
        assertEquals(
            "unknown plateau `inhouse`: the plateaus of this workspace are `baseline`, `marketplace` and `saas`",
            thrown.getMessage()
        );
        assertEquals(after, snapshot(folder), "the second fold changes nothing");
    }

    @Test
    @SneakyThrows
    void shouldLeaveNoStagedFileAndNoTemporaryFolderBehind() {
        val folder = dir.resolve("clean");
        prepareSmall(folder);
        val temporary = Path.of(System.getProperty("java.io.tmpdir"));
        val before = names(temporary, "archicode-fold-");

        service.fold(folder.resolve(".archicode.yaml"), "a", true, FoldFiles.disk());

        assertEquals(before, names(temporary, "archicode-fold-"));
        assertFalse(
            snapshot(folder)
                .keySet()
                .stream()
                .anyMatch(name -> name.endsWith(".archicode-fold"))
        );
    }

    @Test
    @SneakyThrows
    void shouldTellAPlateauThatDoesNotLoadOnTheCopyAndWriteNothing() {
        val folder = dir.resolve("unreadable");
        prepareSmall(folder);
        val before = snapshot(folder);
        // the plateau `b` loads where the workspace is, and not on the temporary copy
        Mockito.doThrow(new ArchiCodeException("a patch selects nothing"))
            .when(workspaceFactory)
            .create(
                ArgumentMatchers.argThat((Path path) -> path.toString().contains("archicode-fold-")),
                ArgumentMatchers.<Path>isNull(),
                ArgumentMatchers.eq("b")
            );

        val thrown = assertThrows(ArchiCodeException.class, () ->
            service.fold(folder.resolve(".archicode.yaml"), "a", true, NEVER)
        );

        assertEquals(
            "the fold of `a` into `b` would leave the plateau `b` unreadable: a patch selects nothing: no file is written",
            thrown.getMessage()
        );
        assertEquals(before, snapshot(folder));
        Mockito.reset(workspaceFactory);
    }

    @Test
    @SneakyThrows
    void shouldTellAComparisonThatFailsOnTheCopyAsADifferenceAndOnTheOriginalAsItIs() {
        val folder = dir.resolve("incomparable");
        prepareSmall(folder);
        val before = snapshot(folder);
        val real = ViewpointKernel.getInstance();
        for (val failFrom : List.of(2, 0)) {
            val compares = new AtomicInteger();
            try (val kernels = Mockito.mockStatic(ViewpointKernel.class)) {
                val kernel = Mockito.mock(ViewpointKernel.class, invocation -> {
                    if ("compare".equals(invocation.getMethod().getName()) && compares.incrementAndGet() > failFrom) {
                        throw new ArchiCodeException("the kernel refuses these plateaus");
                    }
                    return AdditionalAnswers.delegatesTo(real).answer(invocation);
                });
                kernels.when(ViewpointKernel::getInstance).thenReturn(kernel);

                val thrown = assertThrows(ArchiCodeException.class, () ->
                    service.fold(folder.resolve(".archicode.yaml"), "a", true, NEVER)
                );

                // two plateaus remain, so the original is compared twice and the copy twice after it
                assertEquals(
                    failFrom == 0
                        ? "the kernel refuses these plateaus"
                        : "the fold of `a` into `b` would change how the plateau `b` compares with `baseline`: " +
                              "the table { \"plateau\": { \"id\": \"b\" }, \"baseline\": { \"id\": \"baseline\" }, \"counts\": " +
                              "{ \"elements\": { \"new\": 0, \"changed\": 0, \"removed\": 0, \"wording_only\": 0 }, " +
                              "\"relationships\": { \"new\": 0, \"changed\": 0, \"removed\": 0 } }, " +
                              "\"hidden_wording_only\": 0, \"changes\": [ ] } becomes it cannot be compared: the kernel refuses " +
                              "these plateaus: no file is written",
                    thrown.getMessage()
                );
                assertEquals(before, snapshot(folder));
            }
        }
    }

    @SneakyThrows
    private static List<String> names(Path folder, String prefix) {
        try (val stream = Files.list(folder)) {
            return stream
                .map(p -> p.getFileName().toString())
                .filter(n -> n.startsWith(prefix))
                .sorted()
                .toList();
        }
    }

    /** The workspace file and the manifests of a plateau `a` folded into `b`, written in the folder. */
    @SneakyThrows
    private static void prepareSmall(Path folder) {
        Files.createDirectories(folder.resolve("a"));
        Files.writeString(folder.resolve(".archicode.yaml"), "settings:\n  manifests:\n    paths: [\"./**\"]\n");
        Files.writeString(
            folder.resolve("a/plateau.yaml"),
            "header:\n  kind: \"archicode.morin.io/plateau\"\n  version: \"1\"\ncontent:\n  id: \"a\"\n"
        );
        Files.writeString(
            folder.resolve("a/plateau-b.yaml"),
            "header:\n  kind: \"archicode.morin.io/plateau\"\n  version: \"1\"\ncontent:\n  id: \"b\"\n  override: \"a\"\n"
        );
    }

    @SneakyThrows
    private static void prepare(JsonNode c, Path folder) {
        Files.createDirectories(folder);
        if (!c.get("base").isNull()) {
            copy(Path.of("src/test/resources").resolve(c.get("base").asText()), folder);
        }
        val files = c.get("files");
        for (val name : (Iterable<String>) files::fieldNames) {
            val file = folder.resolve(name);
            Files.createDirectories(file.getParent());
            Files.writeString(file, files.get(name).asText());
        }
    }

    /** Every file, hidden ones too, by its path from the folder, with its bytes. */
    @SneakyThrows
    private static Map<String, String> snapshot(Path root) {
        val out = new TreeMap<String, String>();
        try (Stream<Path> walk = Files.walk(root)) {
            for (val p : (Iterable<Path>) walk.filter(Files::isRegularFile)::iterator) {
                out.put(root.relativize(p).toString().replace('\\', '/'), Files.readString(p));
            }
        }
        return out;
    }

    @SneakyThrows
    private static void copy(Path from, Path to) {
        try (val walk = Files.walk(from)) {
            for (val source : (Iterable<Path>) walk::iterator) {
                val target = to.resolve(from.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
    }
}
