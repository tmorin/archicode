package io.morin.archicode.cli;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import lombok.Builder;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * The only class in this repository that starts a subprocess, and the only one that knows the {@code claude}
 * CLI's flag grammar (run-0007 TDD {@code DEC-4}, {@code CTR-6}).
 * <p>
 * Four invariants here are load-bearing, and a reviewer should check them against the code rather than infer
 * them:
 * <ol>
 *   <li>The working directory is the served workspace directory and {@code --add-dir} is never passed, so the
 *       CLI's own {@code --restricted} confinement is the containment boundary (TDD {@code DEC-2}).</li>
 *   <li>Every spool file — the prompt on stdin, stdout, stderr — lives in a dedicated temp directory
 *       <em>outside</em> the workspace, with owner-only permissions, deleted afterwards. The constructor-time
 *       check in {@link #spoolDirectory(Path)} makes that a verified precondition rather than a convention
 *       (TDD {@code CON-4}): a spool file inside the workspace would appear in the bridge's own diff and be
 *       deleted by its own discard, and these files carry the prompt and a denied write's content.</li>
 *   <li>The environment is inherited minus {@link #SCRUBBED_ENVIRONMENT_VARIABLES}, applied to the availability
 *       probe as well as to the invocation (TDD {@code DEC-12}). Credential-bearing variables are deliberately
 *       kept, and are never logged or returned.</li>
 *   <li>The permitted tool list contains no command-execution tool, so file confinement cannot be bypassed by
 *       shelling out — and, as a side effect, none of the permitted tools can delete a file, which is why
 *       {@code deleted} is defence-in-depth throughout this design rather than a reachable case today.</li>
 * </ol>
 * The flag set below was verified against {@code claude 2.1.280} as a whole, with the prompt delivered on
 * stdin, before it was written down (run-0007 {@code prg} finding {@code F-6}).
 */
@Slf4j
@ApplicationScoped
public class ClaudeCliInvoker {

    /**
     * Claude Code session-coupling variables removed from the subprocess's environment. A server started from
     * inside a Claude Code session would otherwise hand its child that session's id and messaging socket
     * (run-0007 {@code prg} finding {@code F-7}). Credential-bearing variables are not in this list.
     */
    public static final List<String> SCRUBBED_ENVIRONMENT_VARIABLES = List.of(
        "CLAUDECODE",
        "CLAUDE_CODE_ENTRYPOINT",
        "CLAUDE_CODE_SESSION_ID",
        "CLAUDE_CODE_HOST_SESSION_ID",
        "CLAUDE_CODE_CHILD_SESSION",
        "CLAUDE_CODE_MESSAGING_SOCKET",
        "CLAUDE_CODE_MESSAGING_TOKEN",
        "CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH",
        "CLAUDE_AGENT_SDK_VERSION"
    );

    /**
     * Fixed context handed to the invocation. Quoted in full in run-0007 TDD {@code DEC-4} precisely so a
     * reviewer can confirm it adds knowledge of the manifest format and no authority.
     */
    public static final String SYSTEM_PROMPT_PREAMBLE =
        "You are editing an ArchiCode architecture-as-code workspace. A manifest is a YAML, TOML or JSON" +
        " document with a top-level `header` (keys: `kind`, `version`, and optionally `parent`) and a top-level" +
        " `content` mapping whose shape depends on `header.kind`; `content.id` is the element's local id and" +
        " `content.relationships[].destination` holds dotted references to other elements. The workspace file" +
        " at the root of the current working directory declares where manifests live. Only read and edit files" +
        " inside the current working directory. Make the smallest change that satisfies the request, preserve" +
        " existing formatting and comments, and do not create new files unless the request requires it.";

    /**
     * The tools the invocation may use. Deliberately excludes every command-execution tool.
     */
    private static final String PERMITTED_TOOLS = "Read,Edit,Write,Glob,Grep";

    private static final int DETAIL_MAX_CHARS = 2000;
    private static final Duration PROBE_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration KILL_GRACE = Duration.ofSeconds(5);

    @Inject
    MapperFactory mapperFactory;

    /**
     * Availability per executable, resolved once per process (TDD {@code DEC-11}): installing {@code claude}
     * while the server runs is a restart-worthy event, not a poll-worthy one.
     */
    private final Map<String, Availability> availabilityCache = new ConcurrentHashMap<>();

    /**
     * Is the given executable runnable at all?
     * <p>
     * Probes with {@code <executable> --version} — cheaper than any alternative and, unlike a {@code PATH}
     * lookup, it also catches a present-but-broken binary. The probe runs in its own temp working directory,
     * never the workspace and never the server's own working directory, with the same environment scrubbing the
     * real invocation gets.
     *
     * @param executable the configured executable
     * @return whether it is runnable, with an operator-readable reason when it is not
     */
    public Availability probe(@NonNull String executable) {
        return availabilityCache.computeIfAbsent(executable, this::doProbe);
    }

    @SneakyThrows
    private Availability doProbe(String executable) {
        Path probeDirectory = null;
        try {
            probeDirectory = createOwnerOnlyTempDirectory("archicode-claude-probe-");
            val builder = new ProcessBuilder(executable, "--version");
            builder.directory(probeDirectory.toFile());
            builder.redirectOutput(ProcessBuilder.Redirect.DISCARD);
            builder.redirectError(ProcessBuilder.Redirect.DISCARD);
            scrubEnvironment(builder);
            val process = builder.start();
            if (!process.waitFor(PROBE_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                return new Availability(
                    false,
                    "the `" +
                        executable +
                        "` CLI did not respond to `--version` within " +
                        PROBE_TIMEOUT.toSeconds() +
                        "s, so this capability is unavailable"
                );
            }
            if (process.exitValue() != 0) {
                return new Availability(
                    false,
                    "the `" +
                        executable +
                        "` CLI exited with status " +
                        process.exitValue() +
                        " when asked for its version, so this capability is unavailable"
                );
            }
            return new Availability(true, null);
        } catch (IOException e) {
            log.info("the claude CLI `{}` is not runnable: {}", executable, e.toString());
            return new Availability(
                false,
                "the `" +
                    executable +
                    "` CLI was not found or could not be started. This capability requires the" +
                    " Claude Code CLI on the host running `editor serve`; the published ArchiCode container image" +
                    " does not include it."
            );
        } finally {
            deleteRecursivelyQuietly(probeDirectory);
        }
    }

    /**
     * Run one invocation against {@code workspaceDir}.
     * <p>
     * Never throws for a subprocess-level failure: a missing executable, a non-zero exit, unparseable output or
     * a timeout all come back as an {@link Invocation} with the matching {@link Outcome}. That is deliberate —
     * by the time this method is called the capture already exists, and the caller must be able to install a
     * discardable session whatever happened (TDD {@code DEC-7}, {@code DEC-10}).
     *
     * @param workspaceDir the served workspace directory; becomes the subprocess's working directory
     * @param prompt       the operator's prompt, delivered on stdin
     * @param executable   the configured executable
     * @param model        the configured model
     * @param timeout      the wall-clock bound
     * @return what happened
     */
    public Invocation run(
        @NonNull Path workspaceDir,
        @NonNull String prompt,
        @NonNull String executable,
        @NonNull String model,
        @NonNull Duration timeout
    ) {
        Path spool = null;
        val startedAt = System.currentTimeMillis();
        try {
            spool = spoolDirectory(workspaceDir);
            val promptFile = writeOwnerOnly(spool.resolve("prompt.txt"), prompt);
            val stdoutFile = writeOwnerOnly(spool.resolve("stdout.json"), "");
            val stderrFile = writeOwnerOnly(spool.resolve("stderr.txt"), "");

            val builder = new ProcessBuilder(command(executable, model));
            builder.directory(workspaceDir.toFile());
            builder.redirectInput(promptFile.toFile());
            builder.redirectOutput(stdoutFile.toFile());
            builder.redirectError(stderrFile.toFile());
            scrubEnvironment(builder);

            log.info("invoking the claude CLI in {} (model {}, bound {}s)", workspaceDir, model, timeout.toSeconds());
            val process = builder.start();

            if (!process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                process.waitFor(KILL_GRACE.toMillis(), TimeUnit.MILLISECONDS);
                log.warn("the claude CLI exceeded its {}s bound and was terminated", timeout.toSeconds());
                return Invocation.builder()
                    .outcome(Outcome.TIMEOUT)
                    .message(
                        "the invocation exceeded its " +
                            timeout.toSeconds() +
                            "s bound and was terminated. Any change it had already made is below and can be" +
                            " discarded."
                    )
                    .permissionDenials(List.of())
                    .durationMs(System.currentTimeMillis() - startedAt)
                    .build();
            }

            return parse(
                Files.readString(stdoutFile, StandardCharsets.UTF_8),
                Files.readString(stderrFile, StandardCharsets.UTF_8),
                process.exitValue(),
                System.currentTimeMillis() - startedAt
            );
        } catch (IOException e) {
            log.warn("failed to run the claude CLI", e);
            return Invocation.builder()
                .outcome(Outcome.FAILED)
                .message("the `" + executable + "` CLI could not be started: " + e)
                .permissionDenials(List.of())
                .durationMs(System.currentTimeMillis() - startedAt)
                .build();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Invocation.builder()
                .outcome(Outcome.FAILED)
                .message("the invocation was interrupted")
                .permissionDenials(List.of())
                .durationMs(System.currentTimeMillis() - startedAt)
                .build();
        } finally {
            deleteRecursivelyQuietly(spool);
        }
    }

    /**
     * The exact command. Nothing here is derived from client input: the prompt travels on stdin and every flag
     * is either fixed or comes from {@code editor serve}'s own options.
     */
    private List<String> command(String executable, String model) {
        return List.of(
            executable,
            "-p",
            "--output-format",
            "json",
            "--model",
            model,
            // the containment primitive: confines the file tools to the working directory, refuses
            // bypassPermissions, and keeps authentication working (unlike --bare)
            "--restricted",
            "--tools",
            PERMITTED_TOOLS,
            // applies edits with no TTY ...
            "--permission-mode",
            "acceptEdits",
            // ... and makes anything that would still prompt fail closed rather than hang
            "--permission-prompts",
            "none",
            // no MCP server is loaded, since no --mcp-config is supplied
            "--strict-mcp-config",
            // a prompt that happens to start with "/" is text, not a skill invocation
            "--disable-slash-commands",
            "--append-system-prompt",
            SYSTEM_PROMPT_PREAMBLE
        );
    }

    /**
     * Read the CLI's JSON result defensively: every consumed field degrades to {@code null} rather than
     * throwing, because an upstream shape change must still leave the caller able to install a discardable
     * session (TDD {@code ASM-2}, {@code RISK-3}).
     */
    private Invocation parse(String stdout, String stderr, int exitCode, long durationMs) {
        JsonNode root = null;
        try {
            if (!stdout.isBlank()) {
                root = mapperFactory.create(MapperFormat.JSON).readTree(stdout);
            }
        } catch (Exception e) {
            log.info("the claude CLI's stdout was not parseable JSON: {}", e.toString());
        }

        if (root == null || !root.isObject()) {
            return Invocation.builder()
                .outcome(Outcome.FAILED)
                .message(
                    "the `claude` CLI did not produce a parseable JSON result (exit status " +
                        exitCode +
                        "). Output was: " +
                        truncate(stdout.isBlank() ? stderr : stdout)
                )
                .permissionDenials(List.of())
                .durationMs(durationMs)
                .build();
        }

        val summary = text(root, "result");
        val isError = root.path("is_error").asBoolean(false);
        val failed = exitCode != 0 || isError;

        return Invocation.builder()
            .outcome(failed ? Outcome.FAILED : Outcome.COMPLETED)
            .message(failed ? failureMessage(exitCode, summary, stderr) : null)
            .agentSummary(summary)
            .numTurns(root.hasNonNull("num_turns") ? root.get("num_turns").asInt() : null)
            .costUsd(root.hasNonNull("total_cost_usd") ? root.get("total_cost_usd").asDouble() : null)
            .durationMs(durationMs)
            .permissionDenials(denials(root))
            .build();
    }

    /**
     * Map {@code permission_denials[]} per TDD {@code CTR-6}. This is the evidence the containment guarantee is
     * checked against (PRD {@code AC-12}), so it is surfaced rather than discarded — and it is the operator's
     * own content, not a secret.
     */
    private List<PermissionDenial> denials(JsonNode root) {
        val denials = new ArrayList<PermissionDenial>();
        val node = root.path("permission_denials");
        if (node.isArray()) {
            node.forEach(entry ->
                denials.add(
                    PermissionDenial.builder()
                        .toolName(text(entry, "tool_name"))
                        .filePath(text(entry.path("tool_input"), "file_path"))
                        .detail(truncate(text(entry.path("tool_input"), "content")))
                        .build()
                )
            );
        }
        return List.copyOf(denials);
    }

    private String failureMessage(int exitCode, String summary, String stderr) {
        val detail = summary != null && !summary.isBlank() ? summary : truncate(stderr);
        val suffix = detail == null || detail.isBlank() ? "" : ": " + detail;
        return "the invocation reported a failure (exit status " + exitCode + ")" + suffix;
    }

    private String text(JsonNode node, String field) {
        return node.hasNonNull(field) ? node.get(field).asText() : null;
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= DETAIL_MAX_CHARS ? value : value.substring(0, DETAIL_MAX_CHARS) + "…";
    }

    /**
     * Create the spool directory and refuse to proceed if it lands inside the workspace, which would put the
     * prompt and the CLI's output into the bridge's own diff and on its own discard path (TDD {@code CON-4}).
     */
    @SneakyThrows
    private Path spoolDirectory(Path workspaceDir) {
        val spool = createOwnerOnlyTempDirectory("archicode-claude-");
        val workspaceReal = workspaceDir.toRealPath();
        if (spool.toRealPath().startsWith(workspaceReal)) {
            deleteRecursivelyQuietly(spool);
            throw new IllegalStateException(
                "the temp directory resolves inside the served workspace (" +
                    workspaceReal +
                    "), so the prompt and the CLI's output would become part of the change under review; set" +
                    " java.io.tmpdir to a location outside the workspace"
            );
        }
        return spool;
    }

    @SneakyThrows
    private Path createOwnerOnlyTempDirectory(String prefix) {
        try {
            return Files.createTempDirectory(
                prefix,
                PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------"))
            );
        } catch (UnsupportedOperationException e) {
            // Non-POSIX filesystem: fall back to the platform's own temp-directory protection.
            return Files.createTempDirectory(prefix);
        }
    }

    @SneakyThrows
    private Path writeOwnerOnly(Path path, String content) {
        Files.writeString(path, content, StandardCharsets.UTF_8);
        try {
            Files.setPosixFilePermissions(path, PosixFilePermissions.fromString("rw-------"));
        } catch (UnsupportedOperationException e) {
            log.debug("filesystem does not support POSIX permissions; leaving {} at its default mode", path);
        }
        return path;
    }

    private void scrubEnvironment(ProcessBuilder builder) {
        SCRUBBED_ENVIRONMENT_VARIABLES.forEach(builder.environment()::remove);
    }

    private void deleteRecursivelyQuietly(Path target) {
        if (target == null) {
            return;
        }
        try (val stream = Files.walk(target)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        } catch (IOException e) {
            log.warn("could not clean up the spool directory {}: {}", target, e.toString());
        }
    }

    /**
     * How an invocation ended.
     */
    public enum Outcome {
        COMPLETED,
        FAILED,
        TIMEOUT;

        /**
         * @return the lowercase name this outcome is published under in the HTTP contract (TDD {@code CTR-2})
         */
        public String getId() {
            return name().toLowerCase();
        }
    }

    /**
     * Whether this capability can run here, and why not when it cannot.
     */
    @Value
    public static class Availability {

        boolean available;
        String reason;
    }

    /**
     * One action the invocation attempted and its own permission machinery denied (PRD {@code FR-11}).
     */
    @Value
    @Builder
    public static class PermissionDenial {

        // Explicitly always-included, overriding MapperFactory's global NON_EMPTY inclusion, so an absent
        // field is a literal JSON null rather than an omitted key — matching run-0007 TDD CTR-2 exactly.
        @JsonInclude(JsonInclude.Include.ALWAYS)
        String toolName;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        String filePath;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        String detail;
    }

    /**
     * The result of one invocation. Carries no environment value and no credential (PRD {@code NFR-6}).
     */
    @Value
    @Builder
    public static class Invocation {

        Outcome outcome;
        String message;
        String agentSummary;
        Integer numTurns;
        Double costUsd;
        Long durationMs;
        List<PermissionDenial> permissionDenials;
    }
}
