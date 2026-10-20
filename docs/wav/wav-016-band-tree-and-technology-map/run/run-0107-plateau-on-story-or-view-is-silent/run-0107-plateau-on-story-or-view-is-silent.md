---
type: run
run: 0107
status: completed
wave: 016
---

# Run 0107: Plateau on story or view is silent

Wave 016 (`band-tree-and-technology-map`), item W-1 (phase P0). Focus: a story or a view that says `plateau:` loads with no message in both tools: nobody but Brightcart consumes a plateau, a story or a view, so the warning of wave 015 goes (the author, 2026-10-20: "enlève l'avertissement dans le code, il n'y a pas de consommateur de plateau et story et autres que seulement Brightcart"; decision T1 of the wave plan, on #29).

Document profile: `single-document`, as the runs of wave 015. The change is the removal of one warning in two tools and the cases that pinned it; a prd/tdd/pln would only copy the brief. The review passes are answered below.

## Scope

In: `ManifestParser` (the warning, the sentence, the `warnings` component of `Parsed`), `WorkspaceFactory` (the line that told it), the editor (`buildPlateauTree` and `ignoredPlateauWarning` in `standalone.html`), the shared cases M01, M84, M85, N79 (and a new M87), the three tests that read the sentence (`PlateauTreeTest`, `editor-reads-layers.test.js`, `editor-structure.test.js`), `CLAUDE.md`.

Out: the manual and the tutorial (`src/doc`: W-12 of this wave finds the sentence in its grep), the kernel (untouched), any new error for `plateau:` on a view or a story.

## Decisions

- **D1. The key stays accepted in a header and means nothing for a view or a story.** No warning, no error, no message on any output of either tool.
- **D2. It names no plateau.** The tree of the plateaus is built from elements, patches and plateau manifests (and the ids that an element's header names); a view or a story that says `plateau: x` registers nothing, whatever `x` is, valid id or not (M87: `Not A Plateau!` on a story and `ghost` on a view: the tree has `baseline` and `later` and no mistake). A workspace whose only `plateau:` is on a story is not layered (unchanged since run 0100).
- **D3. The code goes, it is not hidden.** `ManifestParser.ignoredPlateauWarning`, the `ignored` list, the `warnings` component of `Parsed` (nothing else ever filled it) and the `warnAll(parsed.warnings())` call; in the page `ignoredPlateauWarning` and the wrapper that added the sentence to the tree's warnings (`buildPlateauTreeOf` is `buildPlateauTree` again). `PlateauTree.warnings()` is untouched (its other warnings stay).
- **D4. Cases keep their ids.** M01, M84, M85 and N79 now say "no warning, no error" (`"warnings": []`, `stderr: []`, an empty editor `expect`, which the page's test compares as a whole, so a `treeWarnings` would fail it). M86 (a story declared in two plateaus is declared twice) is unchanged. M87 is new (D2).

## Tasks

- [x] T1. Find every producer: `git grep -n -i "ignored" -- src/main | grep -i plateau` (the parser, the page, the kernel's own `replaces` warnings, which are another thing) and every consumer of the sentence in the tests.
- [x] T2. Command line: the parser, the factory.
- [x] T3. Editor: the sentence, the wrapper.
- [x] T4. Shared cases and tests (D4); `CLAUDE.md`.
- [x] T5. Gate commands, byte-identity against the jar of `archicode-0.14.0`, the review pass, one commit.

## Review pass

- KDMLLC read: one decision each; D2 says what the tree does with the key, M87 pins it for both tools.
- Open questions: none. Settled here: the `Parsed.warnings` component goes with its only producer (a public record of the manifest package, used by `WorkspaceFactory` and tests only; `git grep -n "\.warnings()" -- src` shows the remaining readers are `PlateauTree.warnings()`).
- C scan against the code: `git grep -n -E "ignoredPlateauWarning|ignoredPlateauSentence" -- src` finds nothing (the gate of P0, first criterion); the sentence "which is ignored: a" is in no file of `src` but the manual (`src/doc`, W-12).

## Verification

- `./mvnw -o verify -DskipITs=false` (with `PLANTUML_JAR`, JDK 25): exit 0, BUILD SUCCESS, 840 unit tests, 18 integration tests, 0 failures (the count was 840 before and after: M87 is a case of an existing parameterised test, not a new method).
- `node --test "src/test/javascript/**/*.test.js"`: 1748 tests, 1748 pass, 0 fail.
- `npx prettier --check "src/**/*.java"`: clean.
- `cargo test` and `embed.sh --check`: not run, the kernel is not touched (`git diff --stat` has no file under `src/main/rust` or `src/main/wasm`).
- `git grep -n -E "ignoredPlateauWarning|ignoredPlateauSentence" -- src` finds nothing (exit 1).
- Before and after on a story and a view that say `plateau:` (`nowhere`, and `Not A Plateau!`, on a copy of `domain_application` plus two manifests): `query graph` with the jar of `archicode-0.14.0` prints two `warning:` lines, exit 0; with the jar of this change it prints nothing, exit 0; `plateau list` gives `baseline` alone.
- Byte-identity, jar of `archicode-0.14.0` (built by the orchestrator, `base014/`) against the jar of this change: `identity107.sh` generates `views generate`, `query graph` and `diff` on the 20 workspaces of the repository that have a `workspace.yaml` (the 15 examples of `src/doc/examples`, `domain_plateaus` and `domain_manifest_folders` among them, and the fixtures of `src/test/resources`), on a copy each, and compares standard output, exit code, error output (sorted) and every file written (`diff -r`): 20 workspaces, no difference at all. None says `plateau:` on a view or a story, so the expected difference (the missing warning line) does not show.

## Canonical impact

`CLAUDE.md` changes: the paragraph *Layered plateaus* said `plateau:` in a view or a story is a warning, the key is ignored (with the names of the producer and the cases); it now says it is accepted, means nothing, and is not told. No other architecture or domain document names that warning (`git grep -n -i "ignoredPlateau" -- docs` only finds the wave plan's own gate and the run 0100 document, which is history). No domain invariant changes: a view and a story belong to no plateau, as since run 0100. The manual says the old thing (`src/doc/README.adoc`): W-12 changes it.

## Findings

- F1. For **W-12** (the manual), `src/doc/README.adoc` still teaches the warning: line 290 to 293 (*Views and stories belong to no plateau*, with the quoted `warning:` line), line 870 (a story: `plateau:` ignored), line 1432 (*A view or a story that says `plateau:`. It is ignored, with one warning*) and line 1918 (the list of the warnings the tools tell). The text must say: the key is accepted, means nothing, and no tool tells it. No test pins the quoted line (the build is green with it in the manual), so nothing will fail until W-12 changes it.
- F2. `Parsed.warnings` (the record of `ManifestParser`) is gone; the warnings of the tree are still `Parsed.plateaus().warnings()`. A later run that wants a warning of the reading itself adds the component again.
- F3. A story or a view whose `plateau:` is not a valid id (`Not A Plateau!`) used to be a warning; it is now silent, and it is no error either (decision T1). Nothing in the tools reads the key of a view or a story any more.
- F4. Not verified: the editor in a browser (no pixel changes: the sentence was in the plateau tree's warnings, which the page lists in the dialog of the mistakes only when there is one), the Native job (no class is added or removed; `reflect-config.json` lists `ManifestParser$Parsed` with every constructor, method and field, so the record losing a component needs no change there; `NativeReflectionConfigTest` passes in the build).
- F5. Files outside `likely_paths`: none but this run's own document (`src/main/java/io/morin/archicode/workspace/WorkspaceFactory.java` is the only file of `src/main` outside `manifest/**` and the page: one line removed). Issues filed: none.
