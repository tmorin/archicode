package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.sun.net.httpserver.HttpServer;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.TreeMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Exercises the Claude editing bridge end to end over real HTTP, through {@link EditorHttpServer}'s four
 * {@code /api/claude/} routes, against a temp-directory copy of a fixture workspace per server.
 * <p>
 * <strong>No test here ever runs the real {@code claude} binary.</strong> Every invocation drives a generated
 * {@code #!/bin/sh} stand-in whose absolute path is handed to the bridge through
 * {@link ClaudeBridge.Settings#getExecutable()}. Each stand-in answers {@code --version} with a success exit so
 * {@link ClaudeCliInvoker#probe(String)} considers it available, and otherwise behaves as the test needs: it runs
 * with the workspace directory as its working directory and the prompt on stdin, and whatever it prints on stdout
 * is what the invoker parses.
 * <p>
 * Two shared-state hazards are designed around rather than worked around:
 * <ul>
 *   <li>{@link ClaudeBridge} is {@code @ApplicationScoped}, so its pending-change slot and its busy reservation
 *       are shared by every test method in this class. {@link #discardAnyPendingChangeAndStopServers()} therefore
 *       clears any leftover pending change unconditionally before stopping the servers.</li>
 *   <li>{@link ClaudeCliInvoker} caches availability per executable path for the process's lifetime, so every
 *       stand-in gets a unique path (a per-test temp directory plus a counter).</li>
 * </ul>
 */
@QuarkusTest
class ClaudeBridgeTest {

    /**
     * The JSON a "successful" stand-in prints — exactly the fields {@link ClaudeCliInvoker} consumes.
     */
    private static final String SUCCESS_JSON =
        "{\"subtype\":\"success\",\"is_error\":false,\"result\":\"the stand-in summary\",\"num_turns\":3," +
        "\"total_cost_usd\":0.01,\"duration_ms\":1200,\"permission_denials\":[]}";

    private static final String DENIAL_JSON =
        "{\"subtype\":\"success\",\"is_error\":false,\"result\":\"a write was blocked\",\"num_turns\":2," +
        "\"total_cost_usd\":0.02,\"duration_ms\":900,\"permission_denials\":[{\"tool_name\":\"Write\"," +
        "\"tool_input\":{\"file_path\":\"/outside/notes.md\",\"content\":\"blocked content\"}}]}";

    private static final String FIXTURE = "src/test/workspaces/editor_manifests";
    private static final String OUTSIDE_FIXTURE = "src/test/workspaces/editor_outside_manifests";
    private static final String SOL_A = "manifests/sol_a.yaml";
    private static final String PER_A = "manifests/per_a.yaml";
    private static final String OLD_NAME_LINE = "-  name: \"Solution A\"";
    private static final String NEW_NAME_LINE = "+  name: \"Solution A (edited by the stand-in)\"";

    /**
     * Makes every generated stand-in path unique across the whole class, so one test's cached availability can
     * never be served to another.
     */
    private static final AtomicInteger STAND_IN_COUNTER = new AtomicInteger();

    @Inject
    EditorHttpServer editorHttpServer;

    @Inject
    MapperFactory mapperFactory;

    final List<HttpServer> servers = new ArrayList<>();
    final HttpClient client = HttpClient.newHttpClient();
    Path scriptDir;

    @SneakyThrows
    @BeforeEach
    void createScriptDirectory() {
        scriptDir = Files.createTempDirectory("claude_stand_in");
    }

    /**
     * Unconditional, robust cleanup of the shared bridge state: ask each still-running server for its status and,
     * if a change is pending, discard it. Only then are the servers stopped.
     */
    @AfterEach
    void discardAnyPendingChangeAndStopServers() {
        for (HttpServer server : servers) {
            try {
                val status = send(server, "GET", "/api/claude/status", null);
                if (status.statusCode() != 200) {
                    continue;
                }
                val pending = json(status.body()).get("pending");
                if (pending == null || pending.isNull()) {
                    break;
                }
                send(server, "POST", "/api/claude/discard/" + pending.get("sessionId").asText(), "");
            } catch (Exception e) {
                // best effort: the next server, or the next test's own cleanup, gets another chance
            }
        }
        for (HttpServer server : servers) {
            try {
                editorHttpServer.stop(server);
            } catch (Exception e) {
                // nothing useful to do while tearing down
            }
        }
        servers.clear();
    }

    // ---------------------------------------------------------------------------------------------------------
    // tests
    // ---------------------------------------------------------------------------------------------------------

    /**
     * PRD {@code AC-2}: a stand-in that modifies exactly one manifest yields one pending change naming it.
     */
    @SneakyThrows
    @Test
    void shouldReportTheSingleModifiedManifest_AC2() {
        val harness = start(modifyStandIn());

        val response = post(harness, "/api/claude/invoke", "rename solution A");

        assertEquals(200, response.statusCode(), response.body());
        val result = json(response.body());
        assertTrue(result.get("changed").asBoolean(), "the stand-in modified a manifest, so changed must be true");
        val changes = result.get("pending").get("changes");
        assertEquals(1, changes.size(), "exactly one file was modified: " + changes);
        assertEquals(SOL_A, changes.get(0).get("path").asText());
    }

    /**
     * PRD {@code AC-3}: each change carries an accurate {@code changeType}, and a modification carries a unified
     * diff showing the old line removed and the new line added.
     */
    @SneakyThrows
    @Test
    void shouldClassifyModifiedCreatedAndDeletedChanges_AC3() {
        val modified = invokeAndDiscard(modifyStandIn(), "rename solution A");
        assertEquals(1, modified.get("pending").get("changes").size());
        val modifiedChange = modified.get("pending").get("changes").get(0);
        assertEquals("modified", modifiedChange.get("changeType").asText());
        val diff = modifiedChange.get("diff").asText();
        assertTrue(diff.contains(OLD_NAME_LINE), "expected a '-' line with the old text, got:\n" + diff);
        assertTrue(diff.contains(NEW_NAME_LINE), "expected a '+' line with the new text, got:\n" + diff);

        val created = invokeAndDiscard(
            standIn("printf '%s\\n' 'a note' > notes.md\n" + emit(SUCCESS_JSON)),
            "add a note"
        );
        val createdChanges = created.get("pending").get("changes");
        assertEquals(1, createdChanges.size(), "" + createdChanges);
        assertEquals("notes.md", createdChanges.get(0).get("path").asText());
        assertEquals("created", createdChanges.get(0).get("changeType").asText());

        val deleted = invokeAndDiscard(standIn("rm " + PER_A + "\n" + emit(SUCCESS_JSON)), "drop person A");
        val deletedChanges = deleted.get("pending").get("changes");
        assertEquals(1, deletedChanges.size(), "" + deletedChanges);
        assertEquals(PER_A, deletedChanges.get(0).get("path").asText());
        assertEquals("deleted", deletedChanges.get(0).get("changeType").asText());
    }

    /**
     * PRD {@code AC-4}: an invocation that changes nothing is reported as such and leaves nothing under review.
     */
    @SneakyThrows
    @Test
    void shouldReportNoChangeForANoOpInvocation_AC4() {
        val harness = start(standIn(emit(SUCCESS_JSON)));

        val response = post(harness, "/api/claude/invoke", "do nothing at all");

        assertEquals(200, response.statusCode(), response.body());
        val result = json(response.body());
        assertFalse(result.get("changed").asBoolean(), "nothing was changed");
        assertTrue(result.get("pending").isNull(), "a no-op invocation must leave no change under review");
        assertTrue(json(get(harness, "/api/claude/status").body()).get("pending").isNull());
    }

    /**
     * PRD {@code AC-6}: a discard restores every file byte-for-byte. The assertion compares a checksum manifest
     * this test took itself <em>before</em> the invocation against a freshly computed one — never against
     * anything the bridge reported, which is the whole point of the criterion.
     */
    @SneakyThrows
    @Test
    void shouldRestoreEveryFileOnDiscard_AC6() {
        val harness = start(
            standIn(
                "printf '%s\\n' '# touched' >> " +
                    SOL_A +
                    "\nprintf '%s\\n' '# touched' >> " +
                    PER_A +
                    "\nprintf '%s\\n' '# touched' >> workspace.yaml\n" +
                    emit(SUCCESS_JSON)
            )
        );
        val before = checksums(harness.workspaceDir());

        val response = post(harness, "/api/claude/invoke", "touch every file");
        assertEquals(200, response.statusCode(), response.body());
        val result = json(response.body());
        assertTrue(result.get("changed").asBoolean());
        assertEquals(3, result.get("pending").get("changes").size());

        assertEquals(200, post(harness, "/api/claude/discard/" + sessionId(result), "").statusCode());

        assertEquals(before, checksums(harness.workspaceDir()), "every file must be back to its own checksum");
    }

    /**
     * PRD {@code AC-7}: a discard removes files the invocation created, including a new subdirectory it created
     * them in.
     */
    @SneakyThrows
    @Test
    void shouldRemoveCreatedFilesAndDirectoriesOnDiscard_AC7() {
        val harness = start(
            standIn(
                "printf '%s\\n' 'top level' > created.txt\n" +
                    "mkdir -p nested/deeper\n" +
                    "printf '%s\\n' 'nested' > nested/deeper/created.txt\n" +
                    emit(SUCCESS_JSON)
            )
        );
        val before = checksums(harness.workspaceDir());

        val result = json(post(harness, "/api/claude/invoke", "create some files").body());
        assertTrue(Files.isRegularFile(harness.workspaceDir().resolve("created.txt")));
        assertTrue(Files.isRegularFile(harness.workspaceDir().resolve("nested/deeper/created.txt")));

        assertEquals(200, post(harness, "/api/claude/discard/" + sessionId(result), "").statusCode());

        assertTrue(Files.notExists(harness.workspaceDir().resolve("created.txt")), "the created file must be gone");
        assertTrue(
            Files.notExists(harness.workspaceDir().resolve("nested/deeper/created.txt")),
            "the nested created file must be gone"
        );
        assertTrue(Files.notExists(harness.workspaceDir().resolve("nested/deeper")), "the subdirectory must be gone");
        assertTrue(Files.notExists(harness.workspaceDir().resolve("nested")), "its parent must be gone too");
        assertEquals(before, checksums(harness.workspaceDir()));
    }

    /**
     * PRD {@code AC-8}: a discard brings a deleted manifest back, byte-identical to the bytes this test read
     * before the invocation.
     */
    @SneakyThrows
    @Test
    void shouldRestoreADeletedManifestByteForByte_AC8() {
        val harness = start(standIn("rm " + PER_A + "\n" + emit(SUCCESS_JSON)));
        val target = harness.workspaceDir().resolve(PER_A);
        val before = Files.readAllBytes(target);

        val result = json(post(harness, "/api/claude/invoke", "delete person A").body());
        assertTrue(Files.notExists(target), "the stand-in was supposed to delete the manifest");

        assertEquals(200, post(harness, "/api/claude/discard/" + sessionId(result), "").statusCode());

        assertTrue(Files.isRegularFile(target), "the manifest must exist again after a discard");
        assertArrayEquals(before, Files.readAllBytes(target), "the restored manifest must be byte-identical");
    }

    /**
     * PRD {@code AC-9}: the restore uses no version-control facility. The fixture workspace — and every temp copy
     * of it — holds no {@code .git} (or {@code .hg}/{@code .svn}) directory at all, so the discard assertions in
     * the other tests are demonstrably not git's work.
     */
    @SneakyThrows
    @Test
    void shouldRestoreWithoutAnyVersionControlDirectory_AC9() {
        for (String vcs : List.of(".git", ".hg", ".svn")) {
            assertTrue(Files.notExists(Path.of(FIXTURE, vcs)), "the committed fixture must hold no " + vcs);
        }

        val harness = start(modifyStandIn());
        for (String vcs : List.of(".git", ".hg", ".svn")) {
            assertTrue(Files.notExists(harness.workspaceDir().resolve(vcs)), "the served copy must hold no " + vcs);
        }
        assertFalse(
            json(get(harness, "/api/claude/status").body()).get("workspaceContainsVcsDirectory").asBoolean(),
            "the bridge must agree there is no VCS directory to fall back on"
        );

        val before = checksums(harness.workspaceDir());
        val result = json(post(harness, "/api/claude/invoke", "rename solution A").body());
        assertEquals(200, post(harness, "/api/claude/discard/" + sessionId(result), "").statusCode());
        assertEquals(before, checksums(harness.workspaceDir()));
    }

    /**
     * PRD {@code AC-10}: accepting a pending change keeps it on disk, so the manifest read route then serves the
     * changed content.
     */
    @SneakyThrows
    @Test
    void shouldKeepTheChangeOnAccept_AC10() {
        val harness = start(modifyStandIn());

        val result = json(post(harness, "/api/claude/invoke", "rename solution A").body());
        val accept = post(harness, "/api/claude/accept/" + sessionId(result), "");
        assertEquals(200, accept.statusCode(), accept.body());
        assertTrue(json(accept.body()).get("accepted").asBoolean());

        val served = get(harness, "/api/manifests/" + SOL_A);
        assertEquals(200, served.statusCode());
        assertTrue(
            served.body().contains("Solution A (edited by the stand-in)"),
            "the accepted change must be what the editor now serves, got:\n" + served.body()
        );
        assertTrue(json(get(harness, "/api/claude/status").body()).get("pending").isNull());
    }

    /**
     * PRD {@code AC-11}: a session id can be decided exactly once — a second accept, or a discard after an
     * accept, is a {@code 404}.
     */
    @SneakyThrows
    @Test
    void shouldRefuseASecondDecisionOnTheSameSession_AC11() {
        val first = start(modifyStandIn());
        val firstSession = sessionId(json(post(first, "/api/claude/invoke", "rename solution A").body()));
        assertEquals(200, post(first, "/api/claude/accept/" + firstSession, "").statusCode());
        assertEquals(404, post(first, "/api/claude/accept/" + firstSession, "").statusCode());

        val second = start(modifyStandIn());
        val secondSession = sessionId(json(post(second, "/api/claude/invoke", "rename solution A").body()));
        assertEquals(200, post(second, "/api/claude/accept/" + secondSession, "").statusCode());
        assertEquals(404, post(second, "/api/claude/discard/" + secondSession, "").statusCode());
    }

    /**
     * PRD {@code AC-13}: the request body is the prompt and nothing else. A body that is itself JSON carrying a
     * {@code path} field is handed to the CLI verbatim — proven by having the stand-in write its own stdin into
     * the workspace and then reading that file's diff back out of the pending change.
     */
    @SneakyThrows
    @Test
    void shouldTreatTheWholeRequestBodyAsPromptText_AC13() {
        val harness = start(standIn("cat > received-prompt.txt\n" + emit(SUCCESS_JSON)));
        val body = "{\"prompt\":\"x\",\"path\":\"/etc/passwd\"}";

        val response = post(harness, "/api/claude/invoke", body);

        assertEquals(200, response.statusCode(), response.body());
        val changes = json(response.body()).get("pending").get("changes");
        JsonNode promptChange = null;
        for (JsonNode change : changes) {
            if ("received-prompt.txt".equals(change.get("path").asText())) {
                promptChange = change;
            }
        }
        assertNotNull(promptChange, "expected the stand-in's record of its own stdin, got: " + changes);
        assertEquals("created", promptChange.get("changeType").asText());
        val diff = promptChange.get("diff").asText();
        assertTrue(
            diff.contains("+" + body),
            "the prompt must reach the CLI verbatim, with no field extracted, got:\n" + diff
        );
        assertEquals(body, Files.readString(harness.workspaceDir().resolve("received-prompt.txt")));
    }

    /**
     * PRD {@code AC-14}: a workspace whose configured manifests directory resolves outside the workspace
     * directory is refused before anything is invoked.
     */
    @SneakyThrows
    @Test
    void shouldRefuseAWorkspaceWhoseManifestsDirectoryIsOutside_AC14() {
        val executable = writeStandIn(standIn("printf '%s\\n' 'ran' > marker.txt\n" + emit(SUCCESS_JSON)));
        val workspaceFilePath = copyOutsideFixture();
        val harness = startServer(
            workspaceFilePath,
            ClaudeBridge.Settings.builder().executable(executable.toString()).build()
        );

        val response = post(harness, "/api/claude/invoke", "rename solution A");

        assertEquals(409, response.statusCode(), response.body());
        assertTrue(
            response.body().contains("outside_manifests"),
            "the refusal must name the offending directory, got: " + response.body()
        );
        assertTrue(
            response.body().contains("outside the workspace directory"),
            "the refusal must say why, got: " + response.body()
        );
        assertTrue(
            Files.notExists(harness.workspaceDir().resolve("marker.txt")),
            "a refused request must not have invoked anything"
        );
        assertTrue(json(get(harness, "/api/claude/status").body()).get("pending").isNull());
    }

    /**
     * PRD {@code AC-14}, the case that depends on configuration rather than on filesystem state: a configured
     * manifests directory that points outside the workspace is refused even when it does not currently exist.
     * <p>
     * Skipping an absent directory would make the refusal blink in and out with the filesystem — silence until
     * someone happens to create {@code ../outside_manifests}, then a {@code 409} — which teaches the operator
     * the wrong rule about where this capability can reach (TDD {@code DEC-8}).
     */
    @SneakyThrows
    @Test
    void shouldRefuseAnOutsideManifestsDirectoryThatDoesNotExistYet_AC14() {
        val executable = writeStandIn(standIn("printf '%s\\n' 'ran' > marker.txt\n" + emit(SUCCESS_JSON)));
        val tempDir = Files.createTempDirectory("editor_outside_absent");
        val workspaceDir = tempDir.resolve("workspace");
        Files.createDirectories(workspaceDir);
        copyDirectory(Path.of(OUTSIDE_FIXTURE), workspaceDir);
        // Deliberately do NOT create tempDir/outside_manifests.
        assertTrue(Files.notExists(tempDir.resolve("outside_manifests")));

        val harness = startServer(
            workspaceDir.resolve("workspace.yaml"),
            ClaudeBridge.Settings.builder().executable(executable.toString()).build()
        );

        val response = post(harness, "/api/claude/invoke", "rename solution A");

        assertEquals(409, response.statusCode(), response.body());
        assertTrue(
            response.body().contains("outside_manifests"),
            "the refusal must name the offending directory, got: " + response.body()
        );
        assertTrue(
            response.body().contains("does not currently exist"),
            "the refusal must say the directory is absent and the configuration still points outside, got: " +
                response.body()
        );
        assertTrue(
            Files.notExists(harness.workspaceDir().resolve("marker.txt")),
            "a refused request must not have invoked anything"
        );
    }

    /**
     * PRD {@code AC-15}: an unavailable CLI, and a bridge switched off, are both reported as {@code 503} with a
     * plain-text reason.
     */
    @SneakyThrows
    @Test
    void shouldReportAnUnavailableOrDisabledBridge_AC15() {
        val missing = startServer(
            copyFixture(),
            ClaudeBridge.Settings.builder()
                .executable("/nonexistent/claude-" + STAND_IN_COUNTER.incrementAndGet())
                .build()
        );
        val missingResponse = post(missing, "/api/claude/invoke", "rename solution A");
        assertEquals(503, missingResponse.statusCode(), missingResponse.body());
        assertTrue(
            missingResponse.headers().firstValue("Content-Type").orElse("").contains("text/plain"),
            "a refusal body is plain text"
        );
        assertTrue(
            missingResponse.body().contains("CLI"),
            "the reason must mention the CLI, got: " + missingResponse.body()
        );

        val disabled = start(modifyStandIn(), builder -> builder.enabled(false));
        val disabledResponse = post(disabled, "/api/claude/invoke", "rename solution A");
        assertEquals(503, disabledResponse.statusCode(), disabledResponse.body());
        assertTrue(
            disabledResponse.body().contains("disabled"),
            "the reason must say the bridge is disabled, got: " + disabledResponse.body()
        );
        assertFalse(json(get(disabled, "/api/claude/status").body()).get("enabled").asBoolean());
    }

    /**
     * PRD {@code NFR-2}: an invocation that exceeds its wall-clock bound is terminated, but whatever it had
     * already written stays reviewable and fully discardable.
     */
    @SneakyThrows
    @Test
    void shouldLeaveATimedOutChangeReviewableAndDiscardable_NFR2() {
        val harness = start(
            standIn("printf '%s\\n' '# touched before sleeping' >> " + SOL_A + "\nsleep 10\n" + emit(SUCCESS_JSON)),
            builder -> builder.timeout(Duration.ofSeconds(1))
        );
        val before = checksums(harness.workspaceDir());

        val response = post(harness, "/api/claude/invoke", "take far too long");

        assertEquals(200, response.statusCode(), response.body());
        val result = json(response.body());
        assertEquals("timeout", result.get("outcome").asText());
        assertTrue(result.get("changed").asBoolean(), "the partial edit is a real change");
        assertFalse(result.get("pending").isNull(), "a timed-out change must still be under review");

        assertEquals(200, post(harness, "/api/claude/discard/" + sessionId(result), "").statusCode());
        assertEquals(before, checksums(harness.workspaceDir()), "a timed-out change must be fully restorable");
    }

    /**
     * PRD {@code FR-10}: exactly one invocation at a time. Two genuinely concurrent requests race the bridge's
     * reservation; the loser is refused with {@code 409} and never reaches the subprocess at all.
     */
    @SneakyThrows
    @Test
    void shouldAllowOnlyOneInvocationAtATime_FR10() {
        val harness = start(
            standIn(
                "name=$(cat)\n" + "printf '%s\\n' 'ran' > \"marker-$name.txt\"\n" + "sleep 3\n" + emit(SUCCESS_JSON)
            )
        );

        val gate = new CountDownLatch(1);
        val pool = Executors.newFixedThreadPool(2);
        try {
            val alpha = pool.submit(() -> {
                gate.await();
                return post(harness, "/api/claude/invoke", "alpha");
            });
            val bravo = pool.submit(() -> {
                gate.await();
                return post(harness, "/api/claude/invoke", "bravo");
            });
            gate.countDown();

            val alphaResponse = alpha.get();
            val bravoResponse = bravo.get();

            val statuses = List.of(alphaResponse.statusCode(), bravoResponse.statusCode());
            assertTrue(
                statuses.contains(200) && statuses.contains(409),
                "exactly one request must win, got: " +
                    statuses +
                    " / " +
                    alphaResponse.body() +
                    " / " +
                    bravoResponse.body()
            );

            val winner = alphaResponse.statusCode() == 200 ? "alpha" : "bravo";
            val loser = alphaResponse.statusCode() == 200 ? "bravo" : "alpha";
            val refusal = alphaResponse.statusCode() == 409 ? alphaResponse.body() : bravoResponse.body();
            assertTrue(refusal.contains("already"), "the 409 must name the blocker, got: " + refusal);
            assertTrue(
                Files.isRegularFile(harness.workspaceDir().resolve("marker-" + winner + ".txt")),
                "the winner's stand-in must have run"
            );
            assertTrue(
                Files.notExists(harness.workspaceDir().resolve("marker-" + loser + ".txt")),
                "the loser must never have reached the subprocess"
            );
        } finally {
            pool.shutdownNow();
        }
    }

    /**
     * TDD {@code DEC-10}: a failed invocation is still reviewable. Whether the stand-in exits non-zero or prints
     * output that is not parseable JSON at all, whatever it wrote is on disk, under review, and discardable.
     */
    @SneakyThrows
    @Test
    void shouldLeaveAFailedInvocationReviewable_DEC10() {
        val failing = start(
            standIn("printf '%s\\n' '# touched before failing' >> " + SOL_A + "\n" + emit(SUCCESS_JSON) + "\nexit 1")
        );
        val failingBefore = checksums(failing.workspaceDir());
        val failingResult = json(post(failing, "/api/claude/invoke", "fail after editing").body());
        assertEquals("failed", failingResult.get("outcome").asText());
        assertTrue(failingResult.get("changed").asBoolean());
        assertFalse(failingResult.get("pending").isNull());
        val failureMessage = failingResult.get("pending").get("message");
        assertFalse(failureMessage.isNull(), "the failure must be explained");
        assertFalse(failureMessage.asText().isBlank(), "the failure must be explained");
        assertEquals(200, post(failing, "/api/claude/discard/" + sessionId(failingResult), "").statusCode());
        assertEquals(failingBefore, checksums(failing.workspaceDir()));

        val garbled = start(
            standIn(
                "printf '%s\\n' '# touched before garbling' >> " +
                    SOL_A +
                    "\nprintf '%s\\n' '>>> this is not JSON at all <<<'"
            )
        );
        val garbledBefore = checksums(garbled.workspaceDir());
        val garbledResponse = post(garbled, "/api/claude/invoke", "print garbage after editing");
        assertEquals(200, garbledResponse.statusCode(), "unparseable output is a reported outcome, not an exception");
        val garbledResult = json(garbledResponse.body());
        assertEquals("failed", garbledResult.get("outcome").asText());
        assertTrue(garbledResult.get("changed").asBoolean());
        assertFalse(garbledResult.get("pending").isNull());
        assertEquals(200, post(garbled, "/api/claude/discard/" + sessionId(garbledResult), "").statusCode());
        assertEquals(garbledBefore, checksums(garbled.workspaceDir()));
    }

    /**
     * PRD {@code FR-11}: the CLI's own {@code permission_denials} are surfaced on the pending change.
     */
    @SneakyThrows
    @Test
    void shouldSurfacePermissionDenials_FR11() {
        val harness = start(standIn("printf '%s\\n' '# touched' >> " + SOL_A + "\n" + emit(DENIAL_JSON)));

        val response = post(harness, "/api/claude/invoke", "write outside the workspace");

        assertEquals(200, response.statusCode(), response.body());
        val denials = json(response.body()).get("pending").get("permissionDenials");
        assertEquals(1, denials.size(), "" + denials);
        assertEquals("Write", denials.get(0).get("toolName").asText());
        assertEquals("/outside/notes.md", denials.get(0).get("filePath").asText());
        assertEquals("blocked content", denials.get(0).get("detail").asText());
        // Also present at the top level, which is the only place it can be when nothing changed.
        assertEquals(1, json(response.body()).get("permissionDenials").size());
    }

    /**
     * PRD {@code FR-11} / {@code AC-12}, the case that matters most and was missing: an invocation that tried
     * to write outside the workspace is denied and therefore usually changes <em>nothing</em>, so there is no
     * pending change to carry the denial record. It must still be reported.
     * <p>
     * This was found by live verification against the real CLI, not by this suite: the first version of the
     * bridge put {@code permissionDenials} only inside {@code pending}, so the containment guarantee became
     * unobservable in exactly the situation where it had just done its job.
     */
    @SneakyThrows
    @Test
    void shouldSurfacePermissionDenialsEvenWhenNothingChanged_FR11() {
        // Reports a denial and touches no file at all.
        val harness = start(standIn(emit(DENIAL_JSON)));

        val response = post(harness, "/api/claude/invoke", "write a note one level up from this workspace");

        assertEquals(200, response.statusCode(), response.body());
        val body = json(response.body());
        assertFalse(body.get("changed").asBoolean(), "the denied invocation changed nothing");
        assertTrue(body.get("pending").isNull(), "so there is no pending change to hang the denial off");

        val denials = body.get("permissionDenials");
        assertEquals(1, denials.size(), "the denial must still be reported: " + response.body());
        assertEquals("Write", denials.get(0).get("toolName").asText());
        assertEquals("/outside/notes.md", denials.get(0).get("filePath").asText());
        assertEquals("blocked content", denials.get(0).get("detail").asText());
    }

    /**
     * TDD {@code CON-4}: the prompt and the CLI's captured output are spooled outside the workspace, so none of
     * them is left behind under it — where they would show up in the bridge's own diff.
     */
    @SneakyThrows
    @Test
    void shouldLeaveNoSpoolFileUnderTheWorkspace_CON4() {
        val harness = start(modifyStandIn());

        assertEquals(200, post(harness, "/api/claude/invoke", "rename solution A").statusCode());

        try (val stream = Files.walk(harness.workspaceDir())) {
            for (Path path : stream.toList()) {
                val name = path.getFileName().toString();
                assertFalse(
                    List.of("prompt.txt", "stdout.json", "stderr.txt").contains(name),
                    "a spool file was left under the workspace: " + path
                );
            }
        }
    }

    @SneakyThrows
    @Test
    void shouldRejectWrongMethodsOnTheClaudeRoutes() {
        val harness = startServer(
            copyFixture(),
            ClaudeBridge.Settings.builder()
                .executable("/nonexistent/claude-" + STAND_IN_COUNTER.incrementAndGet())
                .build()
        );

        assertEquals(405, get(harness, "/api/claude/invoke").statusCode());
        assertEquals(405, send(harness.server(), "POST", "/api/claude/status", "").statusCode());
    }

    @SneakyThrows
    @Test
    void shouldRejectAnEmptyPrompt() {
        val harness = startServer(
            copyFixture(),
            ClaudeBridge.Settings.builder()
                .executable("/nonexistent/claude-" + STAND_IN_COUNTER.incrementAndGet())
                .build()
        );

        val response = post(harness, "/api/claude/invoke", "");

        assertEquals(400, response.statusCode(), response.body());
        assertTrue(json(get(harness, "/api/claude/status").body()).get("pending").isNull());
    }

    // ---------------------------------------------------------------------------------------------------------
    // harness
    // ---------------------------------------------------------------------------------------------------------

    /**
     * One started server and the temp-directory workspace copy it serves.
     */
    record Harness(HttpServer server, Path workspaceFilePath, Path workspaceDir) {}

    private Harness start(String scriptBody) {
        return start(scriptBody, builder -> {});
    }

    @SneakyThrows
    private Harness start(String scriptBody, Consumer<ClaudeBridge.Settings.SettingsBuilder> tune) {
        val executable = writeStandIn(scriptBody);
        val builder = ClaudeBridge.Settings.builder().executable(executable.toString());
        tune.accept(builder);
        return startServer(copyFixture(), builder.build());
    }

    private Harness startServer(Path workspaceFilePath, ClaudeBridge.Settings settings) {
        val server = editorHttpServer.start("127.0.0.1", 0, workspaceFilePath, settings);
        servers.add(server);
        return new Harness(server, workspaceFilePath, workspaceFilePath.getParent());
    }

    /**
     * Run one stand-in against its own fresh workspace copy and release the bridge again, so the next invocation
     * in the same test is not refused by the shared busy reservation.
     */
    @SneakyThrows
    private JsonNode invokeAndDiscard(String scriptBody, String prompt) {
        val harness = start(scriptBody);
        val response = post(harness, "/api/claude/invoke", prompt);
        assertEquals(200, response.statusCode(), response.body());
        val result = json(response.body());
        assertFalse(result.get("pending").isNull(), "expected a change under review: " + response.body());
        assertEquals(200, post(harness, "/api/claude/discard/" + sessionId(result), "").statusCode());
        return result;
    }

    @SneakyThrows
    private Path copyFixture() {
        val tempDir = Files.createTempDirectory("editor_manifests");
        copyDirectory(Path.of(FIXTURE), tempDir);
        return tempDir.resolve("workspace.yaml");
    }

    /**
     * Lay out {@code editor_outside_manifests} so that its configured {@code ../outside_manifests} really does
     * resolve to an existing directory outside the served workspace — which is what the bridge's containment
     * pre-flight inspects.
     */
    @SneakyThrows
    private Path copyOutsideFixture() {
        val tempDir = Files.createTempDirectory("editor_outside");
        val workspaceDir = tempDir.resolve("workspace");
        Files.createDirectories(workspaceDir);
        copyDirectory(Path.of(OUTSIDE_FIXTURE), workspaceDir);
        Files.createDirectories(tempDir.resolve("outside_manifests"));
        return workspaceDir.resolve("workspace.yaml");
    }

    @SneakyThrows
    private static void copyDirectory(Path source, Path target) {
        try (val stream = Files.walk(source)) {
            for (Path path : stream.sorted().toList()) {
                val destination = target.resolve(source.relativize(path));
                if (Files.isDirectory(path)) {
                    Files.createDirectories(destination);
                } else {
                    Files.copy(path, destination, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
    }

    // ---------------------------------------------------------------------------------------------------------
    // stand-ins
    // ---------------------------------------------------------------------------------------------------------

    /**
     * Wrap a stand-in's body in the boilerplate every one of them needs: a {@code /bin/sh} shebang and a
     * {@code --version} short-circuit, so {@link ClaudeCliInvoker#probe(String)} sees an available CLI without
     * the body running (the probe inherits this JVM's stdin, which no stand-in may read).
     */
    private static String standIn(String body) {
        return (
            "#!/bin/sh\n" +
            "if [ \"$1\" = \"--version\" ]; then echo 'archicode stand-in 0.0.1'; exit 0; fi\n" +
            body +
            "\n"
        );
    }

    private static String emit(String json) {
        return "printf '%s\\n' '" + json + "'";
    }

    /**
     * A stand-in that rewrites exactly one line of {@code manifests/sol_a.yaml}. It spools through a scratch file
     * outside the workspace so the edit shows up as a single modified file and nothing else.
     */
    private String modifyStandIn() {
        val scratch = scriptDir.resolve("sed-" + STAND_IN_COUNTER.incrementAndGet() + ".tmp");
        return standIn(
            "sed 's/Solution A/Solution A (edited by the stand-in)/' " +
                SOL_A +
                " > '" +
                scratch +
                "'\ncp '" +
                scratch +
                "' " +
                SOL_A +
                "\n" +
                emit(SUCCESS_JSON)
        );
    }

    @SneakyThrows
    private Path writeStandIn(String body) {
        val path = scriptDir.resolve("claude-" + STAND_IN_COUNTER.incrementAndGet() + ".sh");
        Files.writeString(path, body, StandardCharsets.UTF_8);
        try {
            Files.setPosixFilePermissions(path, PosixFilePermissions.fromString("rwx------"));
        } catch (UnsupportedOperationException e) {
            assertTrue(path.toFile().setExecutable(true), "the stand-in must be executable");
        }
        return path;
    }

    // ---------------------------------------------------------------------------------------------------------
    // http + assertions support
    // ---------------------------------------------------------------------------------------------------------

    private HttpResponse<String> get(Harness harness, String path) {
        return send(harness.server(), "GET", path, null);
    }

    private HttpResponse<String> post(Harness harness, String path, String body) {
        return send(harness.server(), "POST", path, body);
    }

    @SneakyThrows
    private HttpResponse<String> send(HttpServer server, String method, String path, String body) {
        val uri = URI.create("http://127.0.0.1:" + server.getAddress().getPort() + path);
        val publisher =
            body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8);
        val request = HttpRequest.newBuilder(uri).method(method, publisher).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    @SneakyThrows
    private JsonNode json(String body) {
        return mapperFactory.create(MapperFormat.JSON).readTree(body);
    }

    private static String sessionId(JsonNode invokeResult) {
        return invokeResult.get("pending").get("sessionId").asText();
    }

    /**
     * A SHA-256 checksum manifest of every regular file under {@code root}, keyed by relative path. The restore
     * assertions compare one of these taken before an invocation against one taken after the discard, so nothing
     * the bridge itself reports takes part in the check.
     */
    @SneakyThrows
    private static TreeMap<String, String> checksums(Path root) {
        val manifest = new TreeMap<String, String>();
        val digest = MessageDigest.getInstance("SHA-256");
        try (val stream = Files.walk(root)) {
            for (Path path : stream.filter(Files::isRegularFile).sorted().toList()) {
                digest.reset();
                manifest.put(
                    root.relativize(path).toString(),
                    HexFormat.of().formatHex(digest.digest(Files.readAllBytes(path)))
                );
            }
        }
        return manifest;
    }
}
