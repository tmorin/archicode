package io.morin.archicode.cli;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.TreeMap;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Exercises {@link WorkspaceCapture} directly — no HTTP, no subprocess, no CDI.
 * <p>
 * This class is the discard guarantee's own test. Every restore assertion compares against a checksum manifest
 * this test takes itself <em>before</em> mutating the tree, never against anything {@link WorkspaceCapture}
 * reports, so the test cannot be satisfied by a capture that is merely self-consistent (run-0007 PRD
 * {@code NFR-3}).
 */
class WorkspaceCaptureTest {

    private static final int MAX_FILES = 1000;
    private static final long MAX_BYTES = 8L * 1024 * 1024;

    Path root;

    @SneakyThrows
    @BeforeEach
    void createWorkspace() {
        root = Files.createTempDirectory("workspace_capture");
        Files.writeString(root.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths:\n      - manifests\n");
        Files.createDirectories(root.resolve("manifests"));
        Files.writeString(root.resolve("manifests/a.yaml"), "content:\n  id: \"a\"\n  name: \"A\"\n");
        Files.writeString(root.resolve("manifests/b.yaml"), "content:\n  id: \"b\"\n  name: \"B\"\n");
        Files.createDirectories(root.resolve("empty"));
    }

    /**
     * A checksum manifest of every regular file under {@code root}, keyed by relative path. This, not the
     * capture, is what the restore assertions are checked against.
     */
    @SneakyThrows
    private TreeMap<String, String> checksums() {
        val manifest = new TreeMap<String, String>();
        val digest = MessageDigest.getInstance("SHA-256");
        try (val stream = Files.walk(root)) {
            for (Path path : stream.filter(Files::isRegularFile).sorted().toList()) {
                digest.reset();
                manifest.put(
                    root.relativize(path).toString(),
                    java.util.HexFormat.of().formatHex(digest.digest(Files.readAllBytes(path)))
                );
            }
        }
        return manifest;
    }

    @SneakyThrows
    private long mtime(String relative) {
        return Files.getLastModifiedTime(root.resolve(relative)).toMillis();
    }

    // ---------- capture + diff ----------

    @Test
    void capturesEveryRegularFileIncludingTheWorkspaceFile() {
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);
        // workspace.yaml, manifests/a.yaml, manifests/b.yaml — the workspace file itself must be captured,
        // because the invocation is permitted to write it (PRD NFR-1).
        Assertions.assertEquals(3, capture.fileCount());
        Assertions.assertTrue(capture.diff(root).isEmpty(), "an untouched tree must diff to nothing");
    }

    @SneakyThrows
    @Test
    void diffClassifiesCreatedModifiedAndDeleted() {
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);

        Files.writeString(root.resolve("manifests/a.yaml"), "content:\n  id: \"a\"\n  name: \"A2\"\n");
        Files.delete(root.resolve("manifests/b.yaml"));
        Files.writeString(root.resolve("manifests/c.yaml"), "content:\n  id: \"c\"\n");

        val changes = capture.diff(root);
        Assertions.assertEquals(3, changes.size());
        val byPath = new TreeMap<String, WorkspaceCapture.ChangeType>();
        changes.forEach(change -> byPath.put(change.getPath().toString(), change.getChangeType()));
        Assertions.assertEquals(WorkspaceCapture.ChangeType.MODIFIED, byPath.get("manifests/a.yaml"));
        Assertions.assertEquals(WorkspaceCapture.ChangeType.DELETED, byPath.get("manifests/b.yaml"));
        Assertions.assertEquals(WorkspaceCapture.ChangeType.CREATED, byPath.get("manifests/c.yaml"));

        val created = changes
            .stream()
            .filter(c -> c.getPath().toString().equals("manifests/c.yaml"))
            .findFirst();
        Assertions.assertTrue(created.isPresent());
        Assertions.assertNull(created.get().getBefore(), "a created file has no before side");
        val deleted = changes
            .stream()
            .filter(c -> c.getPath().toString().equals("manifests/b.yaml"))
            .findFirst();
        Assertions.assertTrue(deleted.isPresent());
        Assertions.assertNull(deleted.get().getAfter(), "a deleted file has no after side");
    }

    // ---------- restore: the guarantee ----------

    @SneakyThrows
    @Test
    void restoreReturnsEveryFileToByteIdenticalContent() {
        val before = checksums();
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);

        Files.writeString(root.resolve("manifests/a.yaml"), "totally different\n");
        Files.writeString(root.resolve("workspace.yaml"), "clobbered\n");

        val report = capture.restore(root);

        Assertions.assertEquals(before, checksums(), "every captured file must be byte-identical after a discard");
        Assertions.assertEquals(2, report.getFilesRestored());
    }

    @SneakyThrows
    @Test
    void restoreDeletesCreatedFilesAndTheDirectoriesTheyWereCreatedIn() {
        val before = checksums();
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);

        Files.writeString(root.resolve("manifests/new.yaml"), "created\n");
        Files.createDirectories(root.resolve("nested/deeper"));
        Files.writeString(root.resolve("nested/deeper/also-new.yaml"), "created\n");

        val report = capture.restore(root);

        Assertions.assertFalse(Files.exists(root.resolve("manifests/new.yaml")));
        Assertions.assertFalse(Files.exists(root.resolve("nested/deeper/also-new.yaml")));
        Assertions.assertFalse(Files.exists(root.resolve("nested/deeper")), "a created directory must go too");
        Assertions.assertFalse(Files.exists(root.resolve("nested")));
        Assertions.assertEquals(2, report.getFilesDeleted());
        Assertions.assertEquals(2, report.getDirectoriesRemoved());
        Assertions.assertEquals(before, checksums());
    }

    @SneakyThrows
    @Test
    void restoreRecreatesDeletedFilesWithTheirOriginalBytes() {
        val before = checksums();
        val originalBytes = Files.readAllBytes(root.resolve("manifests/b.yaml"));
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);

        Files.delete(root.resolve("manifests/b.yaml"));
        capture.restore(root);

        Assertions.assertArrayEquals(originalBytes, Files.readAllBytes(root.resolve("manifests/b.yaml")));
        Assertions.assertEquals(before, checksums());
    }

    @SneakyThrows
    @Test
    void restoreRecreatesACapturedEmptyDirectory() {
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);

        Files.delete(root.resolve("empty"));
        Assertions.assertFalse(Files.exists(root.resolve("empty")));

        capture.restore(root);

        Assertions.assertTrue(Files.isDirectory(root.resolve("empty")), "an empty directory has no file to carry it");
    }

    @SneakyThrows
    @Test
    void restoreRecreatesAParentDirectoryThatWasDeletedWithItsContents() {
        val before = checksums();
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);

        deleteRecursively(root.resolve("manifests"));
        Assertions.assertFalse(Files.exists(root.resolve("manifests")));

        capture.restore(root);

        Assertions.assertEquals(before, checksums(), "a captured file's parent must be recreated before the write");
    }

    @SneakyThrows
    @Test
    void restoreResolvesAFileReplacedByADirectory() {
        val before = checksums();
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);

        Files.delete(root.resolve("manifests/a.yaml"));
        Files.createDirectories(root.resolve("manifests/a.yaml/surprise"));
        Files.writeString(root.resolve("manifests/a.yaml/surprise/x.txt"), "x\n");

        capture.restore(root);

        Assertions.assertTrue(Files.isRegularFile(root.resolve("manifests/a.yaml")));
        Assertions.assertEquals(before, checksums());
    }

    @SneakyThrows
    @Test
    void restoreIsIdempotent() {
        val before = checksums();
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);

        Files.writeString(root.resolve("manifests/a.yaml"), "changed\n");
        Files.writeString(root.resolve("manifests/new.yaml"), "created\n");

        capture.restore(root);
        val afterFirst = checksums();
        val second = capture.restore(root);

        Assertions.assertEquals(before, afterFirst);
        Assertions.assertEquals(before, checksums(), "a second restore must converge, not diverge");
        Assertions.assertEquals(0, second.getFilesRestored(), "the second restore has nothing left to write");
        Assertions.assertEquals(0, second.getFilesDeleted());
    }

    @SneakyThrows
    @Test
    void aNoOpRestoreDoesNotEvenTouchMtimes() {
        val capture = WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES);
        Files.setLastModifiedTime(
            root.resolve("manifests/a.yaml"),
            java.nio.file.attribute.FileTime.fromMillis(1_000_000_000_000L)
        );
        val mtimeBefore = mtime("manifests/a.yaml");

        val report = capture.restore(root);

        Assertions.assertEquals(0, report.getFilesRestored());
        Assertions.assertEquals(mtimeBefore, mtime("manifests/a.yaml"), "an unchanged file must be left alone");
    }

    // ---------- refusals ----------

    @SneakyThrows
    @Test
    void captureRefusesASymbolicLinkPointingOutsideTheRoot() {
        val outside = Files.createTempDirectory("workspace_capture_outside");
        val secret = Files.writeString(outside.resolve("secret.txt"), "do not touch\n");
        Files.createSymbolicLink(root.resolve("manifests/link.yaml"), secret);

        val thrown = Assertions.assertThrows(WorkspaceCapture.CaptureRefusedException.class, () ->
            WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES)
        );
        Assertions.assertTrue(thrown.getMessage().contains("symbolic link"), thrown.getMessage());
        Assertions.assertTrue(thrown.getMessage().contains("link.yaml"), thrown.getMessage());
        Assertions.assertEquals(
            "do not touch\n",
            Files.readString(secret),
            "refusing means nothing outside the root was read, written or restored"
        );
    }

    @SneakyThrows
    @Test
    void captureRefusesASymbolicLinkPointingInsideTheRoot() {
        Files.createSymbolicLink(root.resolve("manifests/alias.yaml"), root.resolve("manifests/a.yaml"));

        Assertions.assertThrows(WorkspaceCapture.CaptureRefusedException.class, () ->
            WorkspaceCapture.capture(root, MAX_FILES, MAX_BYTES)
        );
    }

    @Test
    void captureRefusesWhenTheFileCountBoundIsExceeded() {
        val thrown = Assertions.assertThrows(WorkspaceCapture.CaptureRefusedException.class, () ->
            WorkspaceCapture.capture(root, 2, MAX_BYTES)
        );
        // The refusal must quote what is actually there (3 files), not merely the bound it exceeded.
        Assertions.assertTrue(thrown.getMessage().contains("holds 3 files"), thrown.getMessage());
        Assertions.assertTrue(thrown.getMessage().contains("more than the 2"), thrown.getMessage());
        Assertions.assertTrue(thrown.getMessage().contains("--workspace"), "the refusal must name the remedy");
    }

    @Test
    void captureRefusesWhenTheByteBoundIsExceeded() {
        val thrown = Assertions.assertThrows(WorkspaceCapture.CaptureRefusedException.class, () ->
            WorkspaceCapture.capture(root, MAX_FILES, 10L)
        );
        Assertions.assertTrue(thrown.getMessage().contains("bytes of content"), thrown.getMessage());
        Assertions.assertTrue(thrown.getMessage().contains("more than the 10"), thrown.getMessage());
        // The observed total must be a real figure, not the bound echoed back.
        Assertions.assertFalse(thrown.getMessage().contains("holds 10 bytes"), thrown.getMessage());
    }

    // ---------- NFR-3 ----------

    @SneakyThrows
    @Test
    void workspaceCaptureSourceHasNoReferenceToTheDiffRenderer() {
        val source = Files.readString(
            Path.of("src/main/java/io/morin/archicode/cli/WorkspaceCapture.java"),
            StandardCharsets.UTF_8
        );
        val body = source.substring(source.indexOf("public final class WorkspaceCapture"));
        Assertions.assertFalse(
            body.contains("LineDiff"),
            "restore must be computable from the capture alone; a reference to the diff renderer in the class" +
                " body would mean the safety guarantee and the presentation share a failure mode (PRD NFR-3)"
        );
    }

    @SneakyThrows
    private static void deleteRecursively(Path target) {
        try (val stream = Files.walk(target)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }
}
