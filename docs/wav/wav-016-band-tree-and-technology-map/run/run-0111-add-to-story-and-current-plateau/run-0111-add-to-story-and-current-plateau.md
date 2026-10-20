---
type: run
run: 0111
status: completed
wave: 016
---

# Run 0111: Add to story and current plateau

Wave 016 (`band-tree-and-technology-map`), item W-5 (phase P1). Focus: *Add to story...* can write `at` and `against` (#110) and Settings has a field for `settings.current` (#111)

Document profile: `single-document`, as runs 0089 to 0110: the scope is settled by the author's decision on #110 (2026-10-20) and by the question of #111, whose rules fit in a line each below. No PRD, TDD or pln. The review passes (KDMLLC read of this document, the open questions, the C scan against the code, a read-only review of the working tree) are answered below.

## Scope

In: `standalone.html` (the story picker's dialog and `addCurrentViewToStoryChoice`; the field *Current plateau* of the page Settings and its writer), two node test files, `CLAUDE.md`.

Out: the manual (W-12's), the Java main code and the kernel (none touched), the story editor's own two lists per step (run 0101, unchanged).

## What was found before any change

- `currentPlateauDrawing()` (run 0101) already says the plateau drawn and the plateau compared with; but it reads `layers.compare.other` raw, which is the plateau of a *future still to choose* (null), a *gone* plateau, or the plateau drawn itself; `layerCompareOther()` is the check that names a comparison (it returns null for those three), so the offer is built on it.
- `submitAppDialog` of the story picker passes `{ storyId }` or `{ newName }` to `addCurrentViewToStoryChoice`; the dialog is read from the page by `readAppDialogValues`, which is also what the tests of `model-ops.test.js` bypass by giving the values: a value left out (`withPlateaus` undefined) is *unchecked*, so no existing test changes.
- `settings.current` lives twice: in `workspace.settings.current` (what the page reads) and in the raw `topLevel.settings` (what the line-preserving save writes: `serializeSettingsToRaw` keeps the keys it does not manage as the raw object has them). `commitPlateauDelete` edits both. So does the new writer.
- A file with no `settings` block: `managedSettingsAsRead` is false for a non-object, so `serializeSettingsToRaw(settings, undefined)` would have written every default. The writer creates `topLevel.settings = {}` first; the save then writes `settings:\n  current: "x"` and nothing else.
- `editor-structure.test.js` pins "Settings has no plateau section" (no `<h3>Plateaus</h3>`, run 0084: the plateaus are layers made on the page Plateaus), so the field is a row of the section *Workspace*, under the name, and not a section.
- `layersOfSettingsCurrentProblem` is silent when the tree has mistakes (the load tells those first), and a tree with mistakes lists no plateau (`ids` is empty, so its sentence would say "the plateaus are " and nothing): the writer refuses with the field's own sentence (*The plateaus have mistakes (see the Plateaus page): put them right first.*) before it asks for the sentence of the load; *None* still works.
- `CLAUDE.md`'s ``openLayers`` reads: address, then the plateau this browser remembers, then `settings.current`, then `baseline`. There is no function for "the plateau the command line draws by default" in the page (the command line draws the last plateau of a one-line tree; the editor starts at the root, "where it can edit", said in `openLayers`): none was extracted.

## Decisions

- **D1. The box (#110).** In the story picker, under the list of stories: a check box `data-dialog-plateaus`, label *Tell the step at `x`, compared with `y`* (or *at the plateau drawn, `x`* when nothing can be named), a one-sentence help (*The step names plateaus by id: a comparison that follows the plateau drawn (the past, the future) is written as the plateau it is now.*), plus the reason when a comparison was asked for and cannot be named. CHECKED by default only when `layerCompareOther()` names a plateau and the keys pass `stepPlateauProblem`.
- **D2. What is written.** Checked: `at` = the plateau drawn, `against` = the id of the plateau compared with now, only when there is one. A *Past* is the plateau it resolves to; it does not follow the step afterwards. The same plateau twice is never written (`layerCompareOther` is null when the compared plateau is the one drawn, so `against` is left out and the dialog says so). Unchecked: the step as before. The notice over the story bar adds *told at x, compared with y*. Key order: after the view or the recipe.
- **D3. Where the box is not.** No plateau in the workspace: no box, no key, whatever the dialog is asked. The plateaus cannot be drawn (`layers.blocked`): no box, one sentence says the step is added without a plateau. The plateau drawn cannot be told (`stepPlateauProblem`: the kernel refuses its patches): the box is there, off and disabled, with the sentence, and the add writes no key. Only the plateau compared with cannot be told: the step is told at the plateau drawn and `against` is left out, with the reason (review S3). One plateau alone (`baseline` declared by a manifest): the box is offered (`layered`); `at: baseline` is true and harmless.
- **D4. The field (#111).** *Current plateau*, a row of the section *Workspace* under *Name* (not a section of its own: `editor-structure.test.js` pins that Settings has no plateau section): *None* and the plateaus in the order of the band, a plateau shown by name and id. Written on `change` of the list (not on Save): `chooseCurrentPlateau` applies the typed draft of the form in the same step (as *Add facet* does), stops if the draft is invalid, and keeps the draft when the choice is refused (review S2). Shown when the tree is layered and has two plateaus or more, or the file already has a `current` (so that it can be taken out), or the tree has mistakes (no plateau can be chosen then, the field says why, a `current` the file has is shown and *None* still works). With one plateau alone the command line draws it and there is nothing to choose. The input event of the list does not light *Save all changes* (it is no typed draft).
- **D5. What is written.** `commitCurrentPlateau` through `commitSettingsEdit`: the plateau goes to the raw `settings` of `workspace.yaml` and to `settings.current`; *None* takes the line out (`settings: {}` is left when it was the only one, as the delete of a plateau leaves it: both tools read it as the defaults); a file with no `settings` block gets `settings:\n  current: "x"`. A save of a file whose managed settings did not change writes that line only (run 0102's `managedSettingsAsRead`), pinned byte for byte on the Brightcart `workspace.yaml`. The sentence for a plateau that is none is `layersOfSettingsCurrentProblem`'s, the one of the load (and of `WorkspaceFactory.chosen`): the test compares it with what the page says when a file has the key.
- **D6. Not under `guardedLayerWrite`.** That function resolves every plateau again, and asks when other plateaus inherit what was written. No plateau is resolved from `settings.current` (not the layers, the comparison, the models), and `commitSettingsEdit`, the writer of every other field of Settings, does not use it either. The only thing that can be wrong is the name, checked first.
- **D7. The plateau on screen is not redrawn.** The setting is for the next time: what the reader chose on the band (and the address, and the plateau this browser remembers) win over it, as in `openLayers`; redrawing would undo a choice made in the same session. The test pins both: the drawing before and after, and the plateau a folder opened afresh is drawn at.

## Tasks

- [x] T1. Read #110, #111, runs 0101, 0102, 0107 to 0110 and the code (`addCurrentViewToStoryChoice`, `currentPlateauDrawing`, `setStepPlateau`, `stepPlateauProblem`, `commitSettingsEdit`, `writeWorkspaceYaml`, `commitPlateauDelete`).
- [x] T2. #110: the box in the picker, the keys in the step.
- [x] T3. #111: the field, the writer, the sentence.
- [x] T4. Tests (`add-to-story-plateaus.test.js`, `settings-current-plateau.test.js`).
- [x] T5. `CLAUDE.md`.
- [x] T6. Gate, review pass, this document, one commit.

## Canonical impact

None to the architecture model: no TDD, no `CI-arc` or `CI-dom` packet, and the repository declares no register for the editor's behaviour. The run changes the editor's page and its tests; no domain invariant is added or moved (the keys `at` and `against`, the rule that a plateau is never compared with itself, and `settings.current` naming a plateau of the workspace are those of waves 014 and 015, already in `CLAUDE.md`). `CLAUDE.md` is the project's one description of the behaviour of the tools, and it gains one passage for the box of *Add to story...* and one for the field *Current plateau* of Settings.

## Shipped files

No manifest, example or fixture is added: the tests read the Brightcart fixture of run 0110 (`layered/shared/`, loaded by the command line and the editor in the tests of that run) and invented in-memory workspaces. The two new files are node tests.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier (Sonnet, medium), read-only, on the working tree. No S1. Answers:

- S2, a refused choice in the list redrew the form and lost what was typed: fixed (`chooseCurrentPlateau` applies the draft before it tells the refusal); the test types a name, chooses a plateau that is none and checks the name is kept. The `saveInFlight` refusal stays (the delete of a plateau has it too).
- S2, `settings.current` can name a plateau that exists but whose patches the kernel refuses: not changed. It is what a file with that key gives today on both tools, and the page flags the plateau everywhere else; not worth a new refusal.
- S2, tests that could not fail (the "invalid draft stops the choice" title with no such assertion; no `input`/`change` event dispatched; `a && a` equals false whatever the first call returns): fixed, three new assertions, each checked by a mutation (below).
- S3, a box disabled because only the plateau compared with cannot be told: fixed (the step is told at the plateau drawn, `against` left out, with the reason).
- S3, the list disabled for a tree with mistakes kept a `current` from being taken out: fixed (no plateau can be chosen, a `current` the file has is shown, *None* works).
- S3, the status line reads *Save failed on "workspace.yaml": ...* for a refused choice: kept, it is the line every refusal of a layered write gets (`confirmLayerWrite`).
- S3, the state of the box lives in the page only and is lost by a redraw while the dialog is open: nothing in the dialog redraws it (typing and the radio buttons do not call `render()`); not changed.
- S3, `stepProblem(...) === null` on a keyless step proves nothing: the `deepEqual` on the step before it is the assertion; kept as a second check.

KDMLLC read and C scan, mine: the brief says *the keys of run 0101 (`setStepPlateau`)*: the picker writes them straight into the step as `setStepPlateau` does, through `markEntryChanged`, and the step passes `entryProblemsOf` (asserted). The brief says "a workspace with none writes no key and shows no box": asserted with `ticked: true`. The brief says "reuse the page's existing function for the default": there is none (see above); `openLayers` is the one place and is unchanged. The brief says `guardedLayerWrite` "if the other writers do": decided D6, with the reason. The brief says the Brightcart `fork_tour` has both keys: used for the position test (a step added after the step being told).

## Verification

Run by me, on the tree as committed (JDK 25, `PLANTUML_JAR` set, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify -DskipITs=false` | BUILD SUCCESS: 879 unit tests, 0 failures, 0 errors, 0 skipped; 18 integration tests, 0 failures |
| `node --test "src/test/javascript/**/*.test.js"` | 1829 tests, 1829 pass (0 fail); was 1805 before the run (+24: 12 in `add-to-story-plateaus.test.js`, 12 in `settings-current-plateau.test.js`) |
| `npx prettier --check "src/**/*.java"` | clean |

`cargo test` and `embed.sh --check` were not run: no kernel file is touched, and no Java file either.

*Fail before, pass after* (the new tests cannot pass on the old page: `storyStepPlateaus`, `commitCurrentPlateau` and the box do not exist there). Mutations of the code the tests are about, each reverted (the file restored from a copy; `git status` shows only the intended files): the box never checked by default (5 tests fail); the box read as ticked whatever the dialog says (3); `against` written as null when nothing can be named (2); no refusal of a plateau that is none (2); no `settings` block created for a file that has none (1); the blocked-tree case (plateaus that cannot be drawn) ignored (1); the `input` event of the list marking the form as typed (1); the draft dropped when a choice is refused (1); the problem of the plateau compared with not leaving `against` out (1); the tree's mistakes not told first (2); an invalid draft not stopping the choice (1).

## Not verified

- A look at the page: the dialog with the box and the field in Settings were read through the page's functions in node (`renderAppDialogHtml`, `storyPlateauChoiceHtml`, `renderCurrentPlateauSettingsHtml`, `handleAppChange`), not seen in a browser, in either theme, or at 360 px. The classes `app-dialog-plateaus` and `app-dialog-plateaus-note` are two new CSS lines (a top margin and the indent of the note under the box).
- A real click on the check box and on the list (`readAppDialogValues` is run against a stub of `document.querySelector`; `handleAppChange` against a stub target).
- The native image (the integration tests ran on the JVM jar).
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep: neither exists in this repository.

## Findings

- **F1 (W-12, the manual).** Sections to write: *Add to story* (the box: where it is, CHECKED when a comparison is on screen, what it writes, that a following Past is written as the plateau it is now, when it is not offered), and Settings (the field *Current plateau* in the section Workspace: what it writes, that it does not redraw what is on screen, that the editor opens the folder on it only when nothing else tells). `src/doc/README.adoc` has a SETTINGS_HELP_DOCS anchor table in the page (`SETTINGS_HELP_DOCS` of `standalone.html`): the new key `current` has no manual link until W-12 writes the section; add `current: '<anchor>'` there then.
- **F2.** The editor starts at the root `baseline` for a one-line tree with no `settings.current`, where the command line draws the last plateau (`openLayers`; said in `CLAUDE.md` since wave 014). The help of the field says what the command line does and what the editor does; unchanged.
- **F3.** Files touched outside the `likely_paths`: none (`standalone.html`, `CLAUDE.md`, two new node tests in `src/test/javascript/viewpoint-kernel/`, this document). The wave's manifest and progress log are the orchestrator's and were not touched.
- **F4.** The commit says `Refs #110, #111`; the issues close with the wave's pull request. Issues filed: none.
