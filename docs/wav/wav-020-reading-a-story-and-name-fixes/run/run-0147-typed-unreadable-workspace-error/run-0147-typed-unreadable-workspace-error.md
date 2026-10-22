---
type: run
run: 0147
status: completed
profile: single-document
wave: 020
---

# Run 0147: typed-unreadable-workspace-error

Wave 020, W-2. The failure "the workspace file cannot be had" is a typed failure in both tools, so that no wording depends on a file name found in a message (GitHub issue tmorin/archicode#146, decision T3 of the wave plan).

## What was measured first (jar of `archicode-0.18.0`)

The issue says `cli/ErrorOutput` rewords any message that mentions `.archicode.yaml`. **It does not**: `ErrorOutput` prints the message of the failure as it is, and no text is matched anywhere in the command line. Only the editor guessed from the text (`/\.archicode\.yaml/.test(fatalError) && fatalError !== FORMER_WORKSPACE_FILE_SENTENCE` in `landingScreenConfig`, and `showRememberedFolders`, which noted any fatal error as unreadable). What each tool said, before:

| case | command line (0.18.0) | editor card (0.18.0) |
|---|---|---|
| no file | `error: the workspace file `P` does not exist (`-w` names another one)` | "`.archicode.yaml` could not be read in “ws”." + the error + the hint |
| a folder where the file should be | the same line as no file | same as no file |
| the file refused by the file system | **`error: unexpected java.io.FileNotFoundException: P (Permission denied)` and a stack trace** (a bug: `FileNotFoundException` is no `FileSystemException`, so `ErrorOutput` took it for an unexpected failure) | "could not be read" (the browser's refusal) |
| only `workspace.yaml` | the sentence, word for word | the sentence, word for word (the equality exemption) |
| unknown key, `settings.plateaus`, YAML that is not valid, a document that is not a mapping | `error: `.archicode.yaml` is not valid: ...` / the sentence of the key | **reworded**: "could not be read" with the sentence under it as `error`, and the hint "make sure the file is valid YAML" |
| a manifests path or a facet name the settings refuse (`Could not read the plateaus of .archicode.yaml:`) | the sentence | **reworded** like the line above, only because the heading names the file |
| any fatal error, when the list of the remembered folders is shown | n/a | the folder is noted "Its .archicode.yaml could not be read the last time it was opened." (even for `Failed to open folder` or a facet name) |

## Decisions

| # | decision | verdict |
|---|---|---|
| 1 | the type in Java | `workspace/WorkspaceFileException extends ArchiCodeException` with a `Reason`: `MISSING` (no regular file, a folder where it should be), `FORMER_NAME`, `UNREADABLE` (an `IOException` other than a Jackson one while the file is read). Raised in `WorkspaceFactory.read` (the one place every command, `plateau list` included, reads the file) and in `ServeEditorCommand` (the former name). It is a subclass, so `ErrorOutput` needs no change and prints the message like any `ArchiCodeException`: the T3 wording "ErrorOutput reads the type" is true by construction, the issue's premise about `ErrorOutput` was not (see above) |
| 2 | the message of the types | `MISSING` and `FORMER_NAME`: word for word what they said. `UNREADABLE` is new text for what was a stack trace: ``the workspace file `P` cannot be read: permission denied`` (the reason of the file system without the path, first letter in lower case; a `FileNotFoundException` says it in parentheses at the end, which is cut out). Same shape as the `MISSING` line, one `error:` line, exit 1 |
| 3 | the type in the editor | `AppState.fatalErrorKind`, set with the message by `setFatalError(message, kind)` (every assignment of `fatalError` goes through it, so a new failure never keeps the kind of the last one): `'unreadable'` when `getFileHandle`, `getFile` or the read of the text fails (absent, a folder, refused) and `'renamed'` for the former name; none for everything else |
| 4 | what is `unreadable` and what is `content` | the file could not be had = typed. What was read and found wrong (unknown key, `settings.plateaus`, YAML not valid, not a mapping, a path or a facet name refused) is `content`: the same line the command line prints (`... is not valid: ...`, an `ArchiCodeException` that is no `WorkspaceFileException`). The YAML that is not valid is the one that loses something: the card no longer says "could not be read" with the hint "make sure the file is valid YAML"; it shows the sentence (`Could not read/parse .archicode.yaml: YAML error at line 1: ...`), which says it. Chosen for consistency with the command line (it says "is not valid" for it, and it is not "missing or unreadable", the words of T3); one line to reverse if the author wants the hint back (`parseYaml` in its own `try` in `loadWorkspace`) |
| 5 | the list of the remembered folders | notes a folder when the kind is set (`unreadable` or `renamed`: both are a workspace file that cannot be had, so the note for the former name stays as it was) and not for a failure of another kind (a facet name, a key): the note says the file "could not be read", which was false for those |
| 6 | shared cases | `workspace-file-name-cases.json` (read by `WorkspaceFileNameTest` and `workspace-file-name.test.js`) gets `expect.failure` ∈ `unreadable`, `renamed`, `content` (F01 gets `renamed`; F04 to F10 are new: no file, a folder in place of the file, unknown key, `settings.plateaus`, YAML not valid, not a mapping, a path that leaves the folder) and `directories`. Java asserts the type (and the reason) and that the command line prints the message as it is; the editor asserts the kind and the card |
| 7 | what is not shared | the refusal of the file system (`chmod`) is Java-only (`WorkspaceFileNameTest`, skipped as root); the browser's refusal (`failGetFile`) is node-only. The messages of `unreadable` differ by tool (the editor says what the browser said), as they always did |
| 8 | native image | `WorkspaceFileException` and its `Reason` are in `reflect-config.json` (outside the likely paths, as run 0146 found: `NativeReflectionConfigTest`) |

## Review passes (the trio's, answered here)

- **KDMLLC.** KISS: one class, one function (`setFatalError`), the card tests a field. DRY: the three kinds are named once for both tools in the cases file; the sentences are not written a third time. MECE: `unreadable`, `renamed`, `content` cover every `fatalError` the page sets (the rest, `Failed to open folder` and `server could not be reached`, are `content`-like: kind none, told as they are). LEAN: no new option, no change to `ErrorOutput` code. LUCID: the javadoc of the class and the paragraph of `setFatalError` say what the type is and is not. CONSISTENT: the kinds are the same words in the cases file, the Java reason and the page.
- **Open questions.** Is the YAML syntax error "unreadable"? No (decision 4). Should `ErrorOutput` get a `catch` for `FileNotFoundException` instead of wrapping at the read? No: the read of the workspace file is the one place that knows the file is the workspace file; a generic mapping would type a manifest the same way, and the manifests have their own sentences. Should a manifest that cannot be read be typed too? Out of scope (the issue is the workspace file).
- **C scan against the repository.** `grep` for `could not be read`, `\.archicode\.yaml` in `src/main`: the only text matches were the two in the page (`landingScreenConfig`, `showRememberedFolders` via `fatalError` alone). `ErrorOutput.message` ranks by class, not by text. `holdsFormerNameOnly` is public and used by `ServeEditorCommand`; both sites now raise the type.
- **Canonical impact.** `CLAUDE.md` (the paragraph of the workspace file); the manual in W-6 (below). No `dom` packet, no `arc` item.

## Tasks

| id | task | status | verification |
|---|---|---|---|
| T-1 | `WorkspaceFileException`, raised in `WorkspaceFactory.read` and `ServeEditorCommand`; `ErrorOutput` javadoc | done | `WorkspaceFileNameTest` |
| T-2 | `setFatalError`, `fatalErrorKind`, `loadWorkspace` split in two `try` blocks (file had / file read), the card and the list read the kind | done | `workspace-file-name.test.js`, `folders.test.js` |
| T-3 | shared cases F01 to F10 | done | both tests above |
| T-4 | reflection config | done | `NativeReflectionConfigTest` |
| T-5 | byte identity with the jar of `archicode-0.18.0` | done | below |
| T-6 | `CLAUDE.md` | done | one sentence-block in the paragraph of the workspace file |

## Verification

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 1347 unit tests (0 failures, 2 skipped, the ones of run 0146's list), 27 integration tests (0 failures), build success.
- `cargo test`: 240 passed. `embed.sh --check`: the committed wasm is the one the sources build (794709 bytes). `node --test "src/test/javascript/**/*.test.js"`: 2479 tests, 2479 passed. `npx prettier --check "src/**/*.java"`: clean.
- **The new tests fail where they should.** On the page of `archicode-0.18.0` (`ARCHICODE_EDITOR_HTML`), 13 of the new or changed node tests fail (F01 to F10, the refusal, the type-not-text test, the row of a folder with an unknown key). In Java the unreadable-file test would be the stack trace of the base.
- **Failure cases, before (jar of `archicode-0.18.0`) and after, command line** (`query graph`, `views generate`, `diff`, `plateau list`, and `editor serve` for the former name): no file, a folder in place of the file, `workspace.yaml` only, unknown key, YAML not valid, not a mapping, `settings.plateaus`, a path with `..`, invalid UTF-8: **identical output and exit code**. The file with mode 000: the stack trace of the base (`unexpected java.io.FileNotFoundException ... (Permission denied)` with 25 lines of trace, exit 1) is now ``error: the workspace file `P` cannot be read: permission denied``, exit 1, in the four commands. `editor serve` on a missing file or a folder starts, as before. The scratch is in the run's scratchpad (`cases/base.txt`, `cases/new.txt`, diff by hand).
- **Failure cases, editor, before and after** (`cases/editor-base.txt`, `editor-new.txt`): no file, a folder, a file the browser refuses, `workspace.yaml` only: identical. Unknown key, `settings.plateaus`, YAML not valid, not a mapping, a path with `..`: the card no longer says ".archicode.yaml could not be read in “ws”." with the hint; it says the sentence as it is, with no hint. A facet `a/b` is refused in the new page only (run 0146).
- **Byte identity (T1).** The 20 shipped workspaces (the 11 examples and every other `.archicode.yaml` under `src/test/resources`) were copied twice; on each, `plateau list`, then `views generate`, `stories generate`, `query graph` and `diff`, without option and with `--plateau <id>` for each plateau, were run with the jar of the tag `archicode-0.18.0` and with the jar of this tree: output (standard and error, exit code) and every file written, `diff -rq` of the two trees of 15551 files, **no difference**.
- Not verified: a real browser (the page runs in the Node harness; what a browser says when `getFileHandle` meets a folder (`TypeMismatchError`) is played as `NotFoundError` by the harness, and both go the same way: the first `catch`), the Native job (the two classes are registered for reflection; the native image was not built), the unreadable-file test as root (it assumes it away).

## What changed

- `src/main/java/io/morin/archicode/workspace/WorkspaceFileException.java` (new), `WorkspaceFactory.java` (`read`), `cli/ServeEditorCommand.java`, `cli/ErrorOutput.java` (javadoc only).
- `src/main/resources/editor-webapp/standalone.html`: `AppState.fatalErrorKind`, `setFatalError`, the two `try` blocks of `loadWorkspace`, `landingScreenConfig`, `showRememberedFolders`.
- `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` (outside `likely_paths`): `WorkspaceFileException` and `WorkspaceFileException$Reason`.
- Tests: `WorkspaceFileNameTest.java`, `workspace-file-name.test.js`, `workspace-file-name-cases.json` (F01 to F10), `folders.test.js`.
- `CLAUDE.md`: the paragraph of the workspace file.

## For the manual (W-6)

- Under the error output of the command line (where the exit codes and `error:` lines are told): the workspace file that cannot be read is one line like the others, ``error: the workspace file `P` cannot be read: permission denied`` (it was a stack trace before 0.19), next to `does not exist (`-w` names another one)` and the sentence for `workspace.yaml`.
- Under the editor's opening of a folder: the card "Can't open this workspace" says ".archicode.yaml could not be read in “folder”." only when the file cannot be had (absent, a folder, refused), and the sentence of the former name as it is; a file that is read and found wrong (an unknown key, YAML that is not valid, `settings.plateaus`, a path or a facet name refused) shows its own sentence, the one the command line prints, with no "could not be read" and no hint.
- Release notes block ("what changes for a reader who knows 0.18.0"): the stack trace for an unreadable `.archicode.yaml` is one `error:` line; the editor's card for a `.archicode.yaml` that is read and wrong now shows its sentence directly.

## Findings for the wave

- The issue's premise about `ErrorOutput` is wrong: it never reworded a message. The only guess from the text was the editor's (two places). The command line gains the typed failure and one real fix (the stack trace for a file it cannot read).
- The reversal of decision 4 (YAML that is not valid back under "could not be read" with the hint) is one `try` in `loadWorkspace`, if the author wants it.
- `likely_paths` of runs that add a Java class need `reflect-config.json` (run 0146's finding, met again here).
- Commit subject proposed: `fix: the failure to have the workspace file is typed, so no wording depends on a file name found in a message`.
