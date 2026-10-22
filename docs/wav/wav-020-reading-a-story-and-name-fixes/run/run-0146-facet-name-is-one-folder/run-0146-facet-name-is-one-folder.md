---
type: run
run: 0146
status: completed
profile: single-document
wave: 020
---

# Run 0146: facet-name-is-one-folder

Wave 020, W-1. A facet name that cannot be one folder name is refused when the workspace is loaded, with one sentence that names the facet and says what to write, the same in the command line and in the editor (GitHub issue tmorin/archicode#147, decision T2 of the wave plan: refuse, never rewrite).

## Scope

The name of a facet goes as written into the folders the views are written in: `views-<plateau>-<facet>` (`views generate`) and `<NN>-<view>-<facet>` (`stories generate`), through `settings.facets.directory-name-template`. Nothing checked it. A facet `a/b` made a wrong folder, `..` wrote outside the views folder, and a name Windows refuses made an error from the file system, at the end of a run.

| # | decision | verdict |
|---|---|---|
| 1 | what is refused | an empty name; `.` and `..`; a name that holds `/`, `\`, a NUL or another control character (U+0000 to U+001F, U+007F to U+009F); a name that holds one of `<>:"\|?*`; a name that ends with a dot or a space. T2 as written |
| 2 | rewrite or refuse | refuse (T2). Rejected: replacing the characters, since two facets (`a/b`, `a_b`) would write in one folder and the folder would no longer say the name |
| 3 | the reserved device names of Windows (`CON`, `NUL`, `COM1`...) | **not refused**, not in T2's list, and a name such as `con` is a plain word elsewhere. Pinned as an accepted name in `facet-name-cases.json` with its reason; to the manual's limits (W-6) |
| 4 | where it is checked | at the load, in `WorkspaceFactory.load`, after `requireReadablePaths` (the `manifests.paths` check) and before any manifest is read: every command that loads the workspace says it (`views generate`, `stories generate`, `query graph`, `diff`; N97 runs these four). `plateau list` reads the tree of the plateaus only and never looked at the settings' facets; `editor serve` loads nothing. The editor stops at the same place, after its own `manifestsPathProblems`, as a fatal error under the heading of the settings rules (`Could not read the plateaus of .archicode.yaml:`) |
| 5 | one sentence for a workspace with several bad facets | one sentence each, in the order of the file, joined by a line feed (the command line prints one `error:` line each, as it does for the paths and the stories) |
| 6 | which reason when a name has several | the first found reading from the left: empty, `.`, `..`, then the characters in order (`/` and `\`, a control character, a Windows character), then the end (dot, space). `a/b.` is told for the `/`, `a?b/` for the `?` |
| 7 | the NUL in the sentence | a control character is written out in the sentence (`\u0000`, `\u0009`), as the name is shown and as the reason names it, so that the line stays readable and the error output carries no raw NUL |
| 8 | a facet with no name (`name:` or no key) | is not this check: the existing `Missing settings.facets.customs[0].name` sentence says it first, in both tools (measured on the command line) |
| 9 | the editor's *Add facet* | `validateFacetName` refuses the same names (after the trim, which already drops a trailing space), so the editor cannot write a name it would refuse when it opens the folder again. Not in T2's text; follows from "the same in both tools". The error is the reason, `Facet name holds `/`, ...: it is the name of a folder, write a plain word, such as "journey".` |

The sentence: ``the facet name `a/b` cannot be the name of a folder: it holds `/`, which separates the folders of a path (write a plain word, such as `journey`)``. The reasons are in `FacetNames.reasonOf` and `facetNameReason`, word for word.

## Review passes (the trio's, answered here)

- **KDMLLC on the scope.** KISS: one pure function of a string on each side, one call site in each tool. DRY: the sentence is written twice (Java, page) as everywhere else, and one table of cases (`facet-name-cases.json`) plus the whole-workspace cases N94 to N104 keep them from drifting. MECE: the classes of T2 are one `if` each and each has a case; the Windows reserved names are named as not covered (row 3). LEAN: no change to `Settings`, no new key, no new option. LUCID: the sentence names the facet, the reason, and what to write. CONSISTENT: the same place in the load order as `requireReadablePaths`; the same heading as the other settings rules in the editor.
- **Open questions** (the issue's "to decide" and the plan's): refuse or replace: refuse (T2). Whether the names Windows refuses count: yes (T2). Whether `plateau list` should refuse: no, it never read the facets; refusing there would be a new behaviour for a command that draws nothing. Whether a name with a leading space is refused: no (Windows keeps it; the folder name would be `views- x`, which is a legal name).
- **C scan against the repository.** `Settings.Facets.Facet.name` is `@NonNull` text, the set of facets is a `LinkedHashSet` in the order of the file (two identical entries collapse, which is also what the draw does). The page reads `facet.name` as it is in the file after `readObject`; a number is turned to text for the check (`String(name)`), as Jackson reads it into the text field. The folders are built only from `facet.getName()` (`WorkspaceFactory.create` with the template; `GenerateStoriesCommand`), nothing else carries the name into a path.
- **Canonical impact.** `CLAUDE.md` (the paragraph of the facets) and, for W-6, the manual (below). No `dom` packet, no `arc` item.

## Tasks

| id | task | status | verification |
|---|---|---|---|
| T-1 | `FacetNames` (reason, sentence, list for the settings) and its call in `WorkspaceFactory.load` | done | `FacetNamesTest` (every case of `facet-name-cases.json`, and the list for the settings), N94 to N104 in `BrightcartNegativeCasesTest` |
| T-2 | `facetNameReason`, `facetNameProblem`, `facetNameProblems` in the page, the refusal in `loadWorkspace`, the same names refused by `validateFacetName` | done | `facet-names.test.js` (the same table), N94 to N104 in `brightcart-negative.test.js` (11 of them fail on the page of `archicode-0.18.0`) |
| T-3 | shared cases | done | N94 empty, N95 `.`, N96 `..`, N97 `/` (four commands), N98 `\`, N99 NUL, N100 tab, N101 `:`, N102 three facets (`<`, `\|`, `*`), N103 trailing dot, N104 trailing space; `facet-name-cases.json` has the accepted names and the other Windows characters; `brightcart-negative.test.js`'s comparison test now splits a banner of several sentences into the lines the command line prints |
| T-4 | native image | done | `NativeReflectionConfigTest` asks for every class of the application: `FacetNames` is in `reflect-config.json` (outside the run's `likely_paths`) |
| T-5 | byte identity with the jar of `archicode-0.18.0` | done | below |
| T-6 | `CLAUDE.md` | done | one sentence-block in the paragraph of the facets |

## Verification

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 1327 unit tests (0 failures, 2 skipped, in `HyphenIdViewsTest` and `DistinctDashesRenderingTest`, which this run does not touch), 27 integration tests (0 failures), build success. The first run failed on `NativeReflectionConfigTest` (the new class was not registered); fixed, then the whole set re-run on the final tree.
- `cargo test`: 240 passed. `embed.sh --check`: the committed wasm is the one the sources build (794709 bytes), no kernel change. `node --test "src/test/javascript/**/*.test.js"`: 2467 tests, 2467 passed. `npx prettier --check "src/**/*.java"`: clean.
- **Byte identity (T1).** The 20 shipped workspaces (every `.archicode.yaml` under `src/doc/examples` and `src/test/resources`: the 11 examples, the layered Brightcart, `hyphen-ids`, `plateau-comparison` and its `replaces`, `plateau-state-hints`, `plateau-state-tags`, `replaces-large-pair`, `split-relationships`, `viewpoint-kernel/workspace`) were copied twice to the scratchpad; on each, `plateau list`, then `views generate`, `stories generate`, `query graph` and `diff`, without option and with `--plateau <id>` for each plateau of the tree, were run with the jar of the tag `archicode-0.18.0` (built from `git archive`) and with the jar of this tree; the output (standard and error, exit code) and every file written: `diff -r` of the two trees of 15551 files, **no difference**. (The scratch is in the run's scratchpad, not in the repository.)
- The command line, by hand, on a copy of the layered Brightcart with `name: "a/b"`: the four commands print the one `error:` line and exit 1; `plateau list` is as before; `name:` or `name: null` is the existing `Missing settings.facets.customs[0].name`.
- The new cases fail where they should: N94 to N104 fail on the page of `archicode-0.18.0` (`ARCHICODE_EDITOR_HTML`).
- Not verified: a real browser (the page runs in the Node harness of the repository; the settings page's *Add facet* error is the text `validateFacetName` returns, seen in the harness, not on screen), the Native job (the class is registered for reflection and has no state; the native image was not built).

## What changed

- `src/main/java/io/morin/archicode/workspace/FacetNames.java` (new), `WorkspaceFactory.java` (`requireFacetsThatAreFolders`, called in `load`).
- `src/main/resources/editor-webapp/standalone.html`: `facetNameReason`, `facetNameEscape`, `facetNameProblem`, `facetNameProblems`, the refusal in `loadWorkspace` after `manifestsPathProblems`, `validateFacetName`.
- `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` (outside `likely_paths`): `FacetNames`.
- Tests: `FacetNamesTest.java`, `facet-names.test.js`, `facet-name-cases.json`, N94 to N104 and the comment of `negative-cases.json`, `brightcart-negative.test.js` (a multi-sentence banner).
- `CLAUDE.md`: the facets paragraph.

## For the manual (W-6)

Where the facets are told (`src/doc/README.adoc`, the section on facets and the one on the settings), add: the name of a facet is the name of the folders the views are written in, so it must be a folder name: it cannot be empty, `.` or `..`, hold `/`, `\` or a control character, hold one of `< > : " | ? *` or end with a dot or a space (the last two groups are the names Windows refuses: a workspace is shared across systems); the reserved device names of Windows (`CON`, `NUL`, `COM1`...) are not looked at. Both tools refuse such a name when they open the workspace, with one sentence that names the facet and the reason (the sentence above), and the editor does not let *Add facet* write one. In the release notes block (the "what changes for a reader who knows 0.18.0" part of W-6): a workspace with a facet called `a/b` loaded in 0.18.0 and does not now; rename the facet (and its folder, if the old one is kept). Every example of the manual uses plain words, so no example changed.

## Findings for the wave

- A new class under `src/main` must be added to `reflect-config.json` (`NativeReflectionConfigTest`): the wave's later runs that add Java classes need the same, and `likely_paths` of W-2 do not list that file.
- `plateau list` does not load the settings' facets; the rule is "every command that loads the workspace", which the manual should say that way and not "every command".
- Commit subject proposed: `fix: a facet name that cannot be one folder name is refused at load with one sentence, in both tools`.
