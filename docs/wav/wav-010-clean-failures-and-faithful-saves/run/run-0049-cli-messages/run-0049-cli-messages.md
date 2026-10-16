---
type: run
run: 0049
status: completed
wave: 010
---

# Run 0049: CLI messages

Wave 010 (`clean-failures-and-faithful-saves`), item W-1 (phase P1). Focus: see a message instead of a stack, and every warning on the
error output. Document profile: `single-document` (the scope arrives settled by the wave plan, decisions D-3 and D-5, and by issues
#35, #40 and the "errors without a stack trace" part of #26); this file carries scope, decisions, canonical impact, verification and
findings.

## Scope

1. A `Warnings` channel (`io.morin.archicode.Warnings`) that every command prints on its error output when it ends (#35): the facet
   dialect rewrite, a story step on a view nobody declared, a viewpoint skipped by `views generate`, the warnings of the comparison
   (`Comparison.getWarnings()`, `diff` and `views generate`), and the state words of `StateTags`.
2. One error path for every command (`cli/ErrorOutput`, #26 first part): `error: <one line>` on the error output, exit code 1, no
   stack trace, for `ArchiCodeException` and the other known failures; picocli's code 2 for a usage error (D-5, nothing reserved).
3. `replaces` read as it is written (D-3(a), #40): the kernel's warnings about a duplicate, an entry that is not a reference and a
   value that is not a list fire from the CLI.
4. The manual (a new section, "Errors, warnings and exit codes", and the `replaces` warnings paragraph) and `CLAUDE.md`.

Not in scope, not done: #46 (run W-2), #38 (run W-3), `--only-changes`, the wrapped table, `plateau add --adopt` (the rest of #26).

## Decisions

- **D1. Warnings are kept, then printed when the command ends.** `Warnings` is an application-scoped bean holding a `LinkedHashSet`
  of lines (`warn(sentence)`, `warn(format, args)`, `warnAll(list)`, `drain()`), so a sentence said many times is printed once (a facet
  is applied to the plain workspace and to the union of a comparison) and in the order it was said. The prefix `warning: ` is added by
  the channel; `StateTags` and the kernel's sentences no longer carry it. The printing is done in one place, an `IExecutionStrategy`
  (`ErrorOutput.execute`), in a `finally`: every command, including the ones that do not know the channel, prints what was said, and a
  warning comes before the `error:` line when the command fails. Cost: a warning is printed after the files are written, not before.
  The channel is drained at the start of a command, so what a command run as a plain method (the tests do) left behind is not printed
  by the next one.
- **D2. One class is both the strategy and the exception handler** (`ErrorOutput`, an `@ApplicationScoped` bean), installed on the
  Quarkus `CommandLine` by a producer (`CommandLineConfiguration`, `PicocliCommandLineFactory`), and installed by the tests with
  `errorOutput.install(commandLine)` (the three tests that each set their own handler printing `getMessage()` now use the real one, and
  a new `CliHarness` is the shared runner of the new tests). A test that builds its own `CommandLine` without it does not get the error
  path, which is why the install is a method and not a hidden global.
- **D3. What is a "known failure".** `ArchiCodeException` (one line per line of its message, each prefixed `error: `); a
  `JsonProcessingException`, a missing or forbidden file, a `BindException`, any other I/O exception (found anywhere in the cause chain).
  Anything else is a bug and keeps its stack trace after `error: unexpected <exception>`: a report needs it. Exit code 1 for all of
  them; a `ParameterException` keeps picocli's route and code 2 (D-5).
- **D4. Read errors name the file.** `ManifestParser` and `WorkspaceFactory.load` catch the Jackson error and throw
  `ArchiCodeException.unreadable(file, e, withLocation)`: "`manifests/shop.yaml` is not valid: <reason> at `<path>` (line L, column
  C)". The reason is Jackson's original message, with two rewrites an author can read: "Cannot deserialize value of type `...` from
  Array value" becomes "the value has the wrong shape (found an array)", and an unknown property lists the known keys. The line and
  the column are left out when the manifest content was read again from a string (`ManifestConverter`, which now declares
  `JsonProcessingException` instead of sneaking it). A workspace file that does not exist says so and names `-w`.
- **D5. `replaces` keeps its model and gains the written value.** `AbstractElement.replaces` stays a `Set<String>`: the schema
  (`query schemas`), the serialisation (facets, JSON) and everything that reads it are unchanged. Its deserializer returns a `Replaces`
  (a `LinkedHashSet<String>` that also holds the JSON as written, only the textual entries are in the set); `KernelGraph` gives the
  kernel the written value, unless there is none or it is an empty list (the same input as before for those). The alternative that
  was weighed, a `JsonNode` field, would have changed the generated schema. Consequence, written in the manual: `replaces: "x"` no longer
  stops the command ("the reader refuses it"), it is ignored with a warning, like the other malformed forms.
- **D6. Two small things done on the way, both inside the focus.** `ServeEditorCommand` built its `ParameterException` on
  `new CommandLine(this)`, whose error output is the process's and not the command's; it now uses the command's own `CommandLine`
  (`@Spec`), so the usage error goes where every other message goes (and a test can read it). `EditorHttpServer.fail` said "see its
  log" for a 500 and logged with `log.warn`, which the log level hides: it now logs with `log.error`, which is shown.
- **D7. `reflect-config.json` is edited** (outside the paths of the run, but `NativeReflectionConfigTest` requires every class of the
  package to be listed): `Warnings`, `ErrorOutput`, `CommandLineConfiguration`, `Replaces` and `Replaces$Deserializer` added,
  `StateTagReport` (deleted) removed.

## Canonical impact

None to the architecture model of the repository (`docs/` has no `CI-arc`/`CI-dom` packet for this run, which has no TDD). The
behavioural contract changes are in the manual (new section, rewritten `replaces` warnings paragraph, facet sentence) and in the
architecture paragraph of `CLAUDE.md`. The manifest format is unchanged; a malformed `replaces` that stopped the command is now a
warning (noted in the manual).

## Review passes

- **KDMLLC (inline).** K: one bean and one class for the error path, one channel; the exception message rewrites are two, not a
  catalogue. D: `StateTagReport` (two methods that only printed) is deleted, not kept beside the channel; the three tests'
  hand-written handlers became one call. M: the sources of warnings are listed in the manual and each has a test (facet, story step,
  skipped viewpoint, comparison, state word); the failures are covered per command that throws `ArchiCodeException`. L: no new option,
  no new exit code, no `--fail-on`. U: every error line says what is wrong and, for a file, where. C: below.
- **C scan.** Claim of `StateTags`'s class comment, "the commands put the sentences on their error output": now through the channel,
  comment updated. Claim of the manual (`plateau-replaces-warnings`), "a reference listed twice counts once, and the command line says
  nothing of it" and "a `replaces` that is not a list ... the command stops": false after this run, rewritten; that claim was the
  subject of #40. Claim of `CLAUDE.md`, "`cli/StateTagReport` says so on the error output": rewritten. Claim of
  `PlateauComparisonTest.everyReplacesTheComparisonIgnoresIsToldWithTheElementThatSaidIt`, a fixture that lists `shop.mailer` twice and
  expects no line for it: that was the gap of #40 pinned as behaviour; the expectation now includes the line. Claim of wave 010 plan,
  "a test that asserted an empty error output may need to change": none did; `PlateauComparisonTest` gained the duplicate line, the
  other changed tests only changed how they install the handler.

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25.

- `./mvnw -o -q verify` exits 0 (302 tests; the new ones are `CleanFailuresTest` 17, `WarningsChannelTest` 5, `ReplacesAsWrittenTest`
  5).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 160 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`:
  "the committed WebAssembly is the one the sources build", exit 0. The Rust and the wasm were not touched.
- `node --test "src/test/javascript/**/*.test.js"`: 845 passed, 0 failed.
- `npx prettier --check "src/**/*.java"`: clean.
- **Byte-identity against a jar of the previous commit** (`git archive HEAD`, `./mvnw -o package`, in the scratchpad). The 13
  `workspace.yaml` of the repository (the 9 examples of `src/doc/examples`, `plateau-comparison`, `plateau-comparison/replaces`,
  `plateau-state-tags`, `viewpoint-kernel/workspace`), each copied once per jar, 91 command runs per jar: `views generate`, `query
  graph`, `query views -f json`, `query schemas`, and for the four workspaces with plateaus also `diff` (text, markdown, json,
  `--no-wording`), `views generate --baseline <first>`, `views generate --plateau <id>` and `query graph --plateau <id>` for each.
  Result: exit codes identical in all 91; the generated trees (`diff -r` of the copies) identical; stdout identical in 78 of 91, and
  the 13 others are `query views -f json` with the same views in another order (the order of a `HashSet<View>` that hashes an enum by
  identity; it moves with any change of the code, and was not stable between two builds before this run, issue #48; compared as sets of
  views: identical). Stderr identical in 90 of 91; the one that gains lines is `views generate` of `viewpoint-kernel/workspace`, whose
  facets use the old dialect: five `warning: facet ...` lines that the previous jar did not show (the warnings were in the log, hidden
  by `quarkus.log.level=ERROR`).
- **The failures, by hand with the built jar**: a dangling reference (`views generate`), a dangling reference (`query graph`), a
  manifest that is not valid, a missing workspace file, a workspace without plateaus (`diff`): one `error:` line, exit 1, no trace;
  `--bogus` and `editor serve -w other.yaml`: picocli's message and usage, exit 2; a story step on an undeclared view is printed by
  `query graph` too (exit 0).
- **Gate P1 criteria that this run owns**: (1) a Java test per command that throws `ArchiCodeException`
  (`CleanFailuresTest`: `views generate`, `query graph`, `query views`, `diff`, `plateau add`, and `editor serve` for the usage form);
  (2) the old-dialect workspace prints its rewrite warning on `views generate` and `diff` prints the warnings of the comparison
  (`WarningsChannelTest`, `ReplacesAsWrittenTest`, `PlateauComparisonTest`). The other criteria belong to W-2 and W-3.

## Not verified

- The native image: `ErrorOutput`, the producer, `Warnings` and `Replaces` are registered in `reflect-config.json` (and
  `NativeReflectionConfigTest` passes), but no native build was made, so the producer and the strategy are untested in the native runner.
- `editor serve` failing to bind a port (`BindException`, the message "the server cannot listen: ...") is covered by a unit assertion
  on `ErrorOutput.message` only, not by a real second server on the same port.
- A `.toml` workspace or manifest that is not valid: the message path is the same Jackson one, tried only for YAML.
- Windows line and path forms of the messages (`sourceOf` already writes `/`).
- A real workspace: only invented fixtures and the repository's examples were used.

## Follow-ups

- Issue #48: `query views` output order depends on an identity hash (filed). Everything else this run found was done in the run.
- #26 stays open for `--only-changes`, the wrapped table and `plateau add --adopt`; its "clean errors" part is done here.
