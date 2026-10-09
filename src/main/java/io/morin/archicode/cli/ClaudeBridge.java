package io.morin.archicode.cli;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import lombok.Builder;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * The Claude editing bridge: takes a prose change request, applies it to the served workspace through the
 * {@code claude} CLI, and holds the result as a pending change that must be explicitly accepted or discarded.
 * <p>
 * Two sequencing rules in {@link #invoke(Path, Settings, String)} are the whole safety design, and both are
 * worth reading the code for rather than assuming (run-0007 TDD {@code FLOW-1}, {@code DEC-7}):
 * <ol>
 *   <li><strong>Every refusal happens before the capture</strong> — a blank prompt, a change already pending,
 *       an unavailable CLI, a manifests directory outside the workspace, a workspace the capture will not take
 *       custody of. A refused request therefore touches no file and leaves nothing reserved.</li>
 *   <li><strong>Once the capture has succeeded, a session is installed no matter what.</strong> By that point
 *       the agent may have edited files, so a failure in the diff or in rendering it must still yield a session
 *       id the operator can discard — otherwise the reservation would be held with no way to release it, no way
 *       to undo, and a restart would drop the capture. That was a reachable state in this design's first draft
 *       and it is the one unrecoverable state the whole feature exists to prevent.</li>
 * </ol>
 * Reversibility lives entirely in {@link WorkspaceCapture}: {@link #discard(String)} restores from the capture
 * alone and never from the diff this class renders, so a diff bug can mislead a human but cannot cost them
 * their files (PRD {@code NFR-3}).
 */
@Slf4j
@ApplicationScoped
public class ClaudeBridge {

    private static final List<String> VCS_DIRECTORIES = List.of(".git", ".hg", ".svn");

    @Inject
    WorkspaceLayout workspaceLayout;

    @Inject
    ClaudeCliInvoker invoker;

    /**
     * Held from the moment a request is accepted until its change is accepted or discarded. Separate from
     * {@link #pending} because the slot must be reserved <em>before</em> the capture — that is what makes two
     * concurrent requests safe without holding a lock across a multi-minute invocation — while the session
     * itself only exists afterwards.
     */
    private final AtomicBoolean busy = new AtomicBoolean(false);

    private final AtomicReference<Session> pending = new AtomicReference<>();

    /**
     * Report whether this capability can run here, and surface any change currently under review.
     *
     * @param workspaceFilePath the served workspace file
     * @param settings          this server's bridge settings
     * @return the status payload (TDD {@code CTR-1})
     */
    public Status status(@NonNull Path workspaceFilePath, @NonNull Settings settings) {
        val availability = availability(settings);
        return Status.builder()
            .enabled(settings.isEnabled())
            .available(availability.isAvailable())
            .reason(availability.getReason())
            .model(settings.getModel())
            .timeoutSeconds((int) settings.getTimeout().toSeconds())
            .workspaceContainsVcsDirectory(containsVcsDirectory(workspaceLayout.workspaceDir(workspaceFilePath)))
            .pending(Optional.ofNullable(pending.get()).map(Session::getPending).orElse(null))
            .build();
    }

    /**
     * Apply one prose change request to the served workspace.
     *
     * @param workspaceFilePath the served workspace file — fixed by how {@code editor serve} was started, never
     *                          supplied by the client (PRD {@code AC-13})
     * @param settings          this server's bridge settings
     * @param prompt            the operator's prompt, verbatim
     * @return the result (TDD {@code CTR-2})
     * @throws BridgeRefusal for every pre-capture refusal; when it is thrown, nothing ran and nothing is held
     */
    public InvokeResult invoke(@NonNull Path workspaceFilePath, @NonNull Settings settings, String prompt) {
        if (prompt == null || prompt.isBlank()) {
            throw new BridgeRefusal(400, "the request body must carry the change you want made, as plain text");
        }

        if (!busy.compareAndSet(false, true)) {
            throw new BridgeRefusal(409, describeBlockingChange());
        }

        val workspaceDir = workspaceLayout.workspaceDir(workspaceFilePath);
        final WorkspaceCapture capture;
        try {
            requireAvailable(settings);
            requireManifestsDirsInsideWorkspace(workspaceFilePath, workspaceDir);
            capture = WorkspaceCapture.capture(
                workspaceDir,
                settings.getMaxCaptureFiles(),
                settings.getMaxCaptureBytes()
            );
        } catch (WorkspaceCapture.CaptureRefusedException e) {
            busy.set(false);
            throw new BridgeRefusal(409, e.getMessage());
        } catch (RuntimeException e) {
            busy.set(false);
            throw e;
        }

        // ---- Past this line a session is installed unconditionally (TDD DEC-7). ----

        val sessionId = UUID.randomUUID().toString();
        val vcs = containsVcsDirectory(workspaceDir);
        ClaudeCliInvoker.Invocation invocation = null;
        try {
            invocation = invoker.run(
                workspaceDir,
                prompt,
                settings.getExecutable(),
                settings.getModel(),
                settings.getTimeout()
            );

            val changes = capture.diff(workspaceDir);
            if (changes.isEmpty()) {
                pending.set(null);
                busy.set(false);
                log.info("the invocation changed nothing; capture released");
                return result(invocation, false, null);
            }

            val pendingChange = pendingChange(sessionId, invocation, capture, vcs, render(changes), null);
            pending.set(new Session(sessionId, workspaceDir, capture, pendingChange));
            log.info("change {} is pending review across {} file(s)", sessionId, changes.size());
            return result(invocation, true, pendingChange);
        } catch (RuntimeException e) {
            // The invocation has already run, so files may be changed. Install a session with no diff rather
            // than leaving the operator with a change they cannot see and cannot undo.
            log.error("could not summarise the change; installing a discardable session anyway", e);
            val message =
                "the change could not be summarised (" +
                e +
                "), but whatever it did is on disk and can still be discarded";
            val pendingChange = pendingChange(sessionId, invocation, capture, vcs, List.of(), message);
            pending.set(new Session(sessionId, workspaceDir, capture, pendingChange));
            return result(invocation, true, pendingChange);
        }
    }

    /**
     * Keep the pending change: release the capture and leave the files exactly as the invocation produced them.
     *
     * @param sessionId the pending change's id
     * @return what was accepted (TDD {@code CTR-3})
     * @throws BridgeRefusal {@code 404} when {@code sessionId} is not the pending change's id
     */
    public AcceptResult accept(String sessionId) {
        val session = requireSession(sessionId);
        val files = session.getPending().getChanges().size();
        pending.set(null);
        busy.set(false);
        log.info("change {} accepted; {} file(s) left as produced", sessionId, files);
        return AcceptResult.builder().accepted(true).sessionId(sessionId).files(files).build();
    }

    /**
     * Undo the pending change, from the capture alone.
     *
     * @param sessionId the pending change's id
     * @return what was restored (TDD {@code CTR-4})
     * @throws BridgeRefusal {@code 404} when {@code sessionId} is not the pending change's id, or {@code 500}
     *                       when the restore itself failed — in which case the session is deliberately
     *                       <strong>kept</strong> pending, so the operator can retry. That is safe because the
     *                       capture is immutable and the restore is idempotent.
     */
    public DiscardResult discard(String sessionId) {
        val session = requireSession(sessionId);
        final WorkspaceCapture.RestoreReport report;
        try {
            report = session.getCapture().restore(session.getWorkspaceDir());
        } catch (WorkspaceCapture.RestoreFailedException e) {
            log.error("restore failed for change {}; keeping it pending so it can be retried", sessionId);
            throw new BridgeRefusal(
                500,
                e.getMessage() + ". The change is still pending, so this discard can be retried."
            );
        }
        pending.set(null);
        busy.set(false);
        log.info(
            "change {} discarded: {} file(s) restored, {} deleted, {} directory/ies removed",
            sessionId,
            report.getFilesRestored(),
            report.getFilesDeleted(),
            report.getDirectoriesRemoved()
        );
        return DiscardResult.builder()
            .discarded(true)
            .sessionId(sessionId)
            .filesRestored(report.getFilesRestored())
            .filesDeleted(report.getFilesDeleted())
            .directoriesRemoved(report.getDirectoriesRemoved())
            .build();
    }

    /**
     * The change currently under review, if any. Used by {@code editor serve}'s shutdown hook to warn that the
     * files stay changed, naming each one — there is deliberately no auto-discard on shutdown (TDD
     * {@code DEC-6}): silently reverting work the operator may already have decided to keep is the more
     * dangerous default of the two.
     *
     * @return the pending change, or empty
     */
    public Optional<PendingChange> pendingChange() {
        return Optional.ofNullable(pending.get()).map(Session::getPending);
    }

    private Session requireSession(String sessionId) {
        val session = pending.get();
        if (sessionId == null || session == null || !session.getId().equals(sessionId)) {
            throw new BridgeRefusal(
                404,
                "no change is pending under that id — it has already been accepted or discarded, or the server" +
                    " has been restarted since"
            );
        }
        return session;
    }

    private String describeBlockingChange() {
        val session = pending.get();
        if (session == null) {
            return "an invocation is already running; wait for it to finish, then review its result";
        }
        return (
            "the change " +
            session.getId() +
            " is already pending review across " +
            session.getPending().getChanges().size() +
            " file(s); accept or discard it before requesting another"
        );
    }

    private ClaudeCliInvoker.Availability availability(Settings settings) {
        if (!settings.isEnabled()) {
            return new ClaudeCliInvoker.Availability(
                false,
                "the Claude editing bridge is disabled on this server (it was started with `--no-claude`)"
            );
        }
        return invoker.probe(settings.getExecutable());
    }

    private void requireAvailable(Settings settings) {
        val availability = availability(settings);
        if (!availability.isAvailable()) {
            throw new BridgeRefusal(503, availability.getReason());
        }
    }

    /**
     * Refuse a workspace whose configured manifests directories are not all inside the workspace directory
     * (PRD {@code FR-8}, {@code AC-14}).
     * <p>
     * The resolution rule is TDD {@code DEC-8}'s, and it deliberately depends on the workspace's
     * <em>configuration</em> rather than on current filesystem state. A configured directory that exists is
     * compared by real path, so a symlinked manifests directory cannot pass a textual check. One that does
     * <em>not</em> exist is compared lexically instead of being skipped: skipping it would mean an operator who
     * configures {@code ../shared/manifests} gets a refusal only once that directory happens to exist, and
     * silence until then — a refusal that blinks in and out with the filesystem is worse than no refusal,
     * because it teaches the operator the wrong rule. Either way an absent directory that resolves
     * <em>inside</em> the workspace stays acceptable, which is the ordinary fresh-workspace case every other
     * caller already tolerates.
     */
    @SneakyThrows
    private void requireManifestsDirsInsideWorkspace(Path workspaceFilePath, Path workspaceDir) {
        val workspaceReal = workspaceDir.toRealPath();
        for (Path manifestsDir : workspaceLayout.manifestsDirs(workspaceFilePath)) {
            val exists = Files.isDirectory(manifestsDir);
            val resolved = exists ? manifestsDir.toRealPath() : manifestsDir.toAbsolutePath().normalize();
            val comparedAgainst = exists ? workspaceReal : workspaceDir.toAbsolutePath().normalize();
            if (!resolved.startsWith(comparedAgainst)) {
                throw new BridgeRefusal(
                    409,
                    "the configured manifests directory " +
                        manifestsDir +
                        " resolves to " +
                        resolved +
                        ", outside the workspace directory " +
                        workspaceReal +
                        (exists
                            ? ""
                            : " (that directory does not currently exist, but the configuration still" +
                              " points outside the workspace)") +
                        ". This capability can neither reach it nor restore it, so it will not run against this" +
                        " workspace; the rest of the editor still serves it normally."
                );
            }
        }
    }

    private boolean containsVcsDirectory(Path workspaceDir) {
        return VCS_DIRECTORIES.stream().anyMatch(name -> Files.isDirectory(workspaceDir.resolve(name)));
    }

    private List<Change> render(List<WorkspaceCapture.FileChange> changes) {
        val rendered = new ArrayList<Change>();
        for (WorkspaceCapture.FileChange change : changes) {
            val path = change.getPath().toString().replace(File.separatorChar, '/');
            val before = change.getBefore() == null ? "" : new String(change.getBefore(), StandardCharsets.UTF_8);
            val after = change.getAfter() == null ? "" : new String(change.getAfter(), StandardCharsets.UTF_8);
            val binary = LineDiff.isBinary(before) || LineDiff.isBinary(after);
            val truncated = !binary && LineDiff.isTooLarge(before, after);
            rendered.add(
                Change.builder()
                    .path(path)
                    .changeType(change.getChangeType().getId())
                    .binary(binary)
                    .truncated(truncated)
                    .diff(binary || truncated ? null : LineDiff.unified(path, path, before, after))
                    .build()
            );
        }
        return List.copyOf(rendered);
    }

    private PendingChange pendingChange(
        String sessionId,
        ClaudeCliInvoker.Invocation invocation,
        WorkspaceCapture capture,
        boolean vcs,
        List<Change> changes,
        String overrideMessage
    ) {
        return PendingChange.builder()
            .sessionId(sessionId)
            .outcome(invocation == null ? ClaudeCliInvoker.Outcome.FAILED.getId() : invocation.getOutcome().getId())
            .message(overrideMessage != null ? overrideMessage : invocation == null ? null : invocation.getMessage())
            .workspaceContainsVcsDirectory(vcs)
            .filesCaptured(capture.fileCount())
            .permissionDenials(invocation == null ? List.of() : invocation.getPermissionDenials())
            .changes(changes)
            .build();
    }

    private InvokeResult result(ClaudeCliInvoker.Invocation invocation, boolean changed, PendingChange pendingChange) {
        return InvokeResult.builder()
            .outcome(invocation == null ? ClaudeCliInvoker.Outcome.FAILED.getId() : invocation.getOutcome().getId())
            .changed(changed)
            .agentSummary(invocation == null ? null : invocation.getAgentSummary())
            .numTurns(invocation == null ? null : invocation.getNumTurns())
            .costUsd(invocation == null ? null : invocation.getCostUsd())
            .durationMs(invocation == null ? null : invocation.getDurationMs())
            // Reported at the top level, not only inside `pending`, because the most interesting denial is the
            // one where the invocation tried to leave the workspace and therefore changed nothing — in which
            // case there is no pending change to hang it off. Found by live verification: the first version of
            // this method put denials only on `pending` and so dropped exactly that case (PRD FR-11, AC-12).
            .permissionDenials(invocation == null ? List.of() : invocation.getPermissionDenials())
            .pending(pendingChange)
            .build();
    }

    /**
     * A change under review: its capture, the directory it was taken from, and the payload the webapp renders.
     * Fully constructed before it is published, so a concurrent reader never sees a half-built session.
     */
    @Value
    private static class Session {

        String id;
        Path workspaceDir;
        WorkspaceCapture capture;
        PendingChange pending;
    }

    /**
     * Everything about this capability that is fixed when {@code editor serve} starts. Nothing here can be
     * influenced by a client (PRD Section 3: no client-chosen model, tool set or permission mode).
     */
    @Value
    @Builder
    public static class Settings {

        @Builder.Default
        boolean enabled = true;

        @Builder.Default
        String executable = "claude";

        @Builder.Default
        String model = "sonnet";

        @Builder.Default
        Duration timeout = Duration.ofSeconds(300);

        /**
         * Bounds on what the bridge will take custody of. Deliberately not high enough for a whole project
         * root: a tool whose discard restores everything under the served directory should refuse that rather
         * than quietly accept it (TDD {@code DEC-5}).
         */
        @Builder.Default
        int maxCaptureFiles = 5000;

        @Builder.Default
        long maxCaptureBytes = 64L * 1024 * 1024;

        /**
         * @return the defaults the three-argument {@code EditorHttpServer.start} uses, so run-0005's and
         *         run-0006's existing callers and tests keep working untouched (TDD {@code CON-2})
         */
        public static Settings defaults() {
            return Settings.builder().build();
        }
    }

    /**
     * {@code GET /api/claude/status} (TDD {@code CTR-1}).
     */
    @Value
    @Builder
    public static class Status {

        boolean enabled;
        boolean available;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        String reason;

        String model;
        int timeoutSeconds;
        boolean workspaceContainsVcsDirectory;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        PendingChange pending;
    }

    /**
     * A change under review, as the webapp sees it. {@code CTR-1} owns this shape and {@code CTR-2} embeds the
     * same object, so one client parser serves both — including after a page reload, which is what stops a
     * refresh orphaning a change under review.
     * <p>
     * {@code changes} may legitimately be empty while this object exists: that is the post-invocation-failure
     * case, a change that must still be discardable even though no diff could be computed, with {@code message}
     * saying why.
     */
    @Value
    @Builder
    public static class PendingChange {

        String sessionId;
        String outcome;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        String message;

        boolean workspaceContainsVcsDirectory;
        int filesCaptured;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        List<ClaudeCliInvoker.PermissionDenial> permissionDenials;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        List<Change> changes;
    }

    /**
     * One changed file in a pending change. {@code binary} or {@code truncated} mean the change is real but no
     * diff text is supplied; {@code changeType} is accurate either way.
     */
    @Value
    @Builder
    public static class Change {

        String path;
        String changeType;
        boolean binary;
        boolean truncated;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        String diff;
    }

    /**
     * {@code POST /api/claude/invoke} (TDD {@code CTR-2}). A {@code 2xx} with this body means the subprocess
     * ran and {@code outcome} says how it went; a non-{@code 2xx} means no invocation ran against the
     * workspace, no capture is held and no file was touched.
     */
    @Value
    @Builder
    public static class InvokeResult {

        String outcome;
        boolean changed;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        String agentSummary;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        Integer numTurns;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        Double costUsd;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        Long durationMs;

        /**
         * Every action the invocation attempted and its own permission machinery denied — present whether or
         * not anything changed, and whether or not there is a {@code pending} change to review. An invocation
         * that tried to write outside the workspace and was stopped typically changes nothing, so reporting
         * denials only inside {@code pending} would hide the containment guarantee precisely when it had just
         * done its job (PRD {@code FR-11}, {@code AC-12}).
         */
        @JsonInclude(JsonInclude.Include.ALWAYS)
        List<ClaudeCliInvoker.PermissionDenial> permissionDenials;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        PendingChange pending;
    }

    /**
     * {@code POST /api/claude/accept/{sessionId}} (TDD {@code CTR-3}).
     */
    @Value
    @Builder
    public static class AcceptResult {

        boolean accepted;
        String sessionId;
        int files;
    }

    /**
     * {@code POST /api/claude/discard/{sessionId}} (TDD {@code CTR-4}).
     */
    @Value
    @Builder
    public static class DiscardResult {

        boolean discarded;
        String sessionId;
        int filesRestored;
        int filesDeleted;
        int directoriesRemoved;
    }

    /**
     * A request this bridge declined, carrying the HTTP status the route should answer with and a message
     * written for the operator.
     */
    public static class BridgeRefusal extends RuntimeException {

        private final int status;

        public BridgeRefusal(int status, String message) {
            super(message);
            this.status = status;
        }

        public int getStatus() {
            return status;
        }
    }
}
