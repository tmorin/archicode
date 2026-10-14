---
type: run
run: 0035
status: completed
wave: 008
---

# Run 0035: Plateaus setting

Wave 008 (`plateaus-and-baseline-diff`), item W-2 (phase P1). Focus: list the plateaus of an architecture in one workspace.yaml
and draw the one I choose. Document profile: `single-document`, with a TDD-lite section (the Decisions below); this run is bigger
than run 0034, but the scope arrives settled (the wave's W-2 row and the author's decisions in the brief), the design is one
shared set of rules written twice (the loader of the CLI, the loader of the editor) and there was no live alternative worth a TDD
or a pln. This file carries scope, decisions, canonical impact, verification and findings.

## Context

A workspace had one set of manifests, `settings.manifests.paths` (a `HashSet`, default `{manifests}`). To keep the states of an
architecture (as is, to be) in one `workspace.yaml`, the author wants `settings.plateaus`: an ordered list of complete folders,
of which the CLI and the editor draw one. W-1 (run 0034) already made a reference declared twice an error per call of
`ManifestParser.parse` and per call of `buildIndex`, so that a plateau is one call of each.

## Decisions

Taken by the author (not reopened): `settings.plateaus` is an ordered `List` of `{id, name, horizon, path}`; `horizon` is optional
free text, never parsed (never `date`); `path` is mandatory, relative to the folder of workspace.yaml and below it (no `..`, not
absolute), unique, with `id` unique; `.` is refused with several plateaus; `current` is optional (last of the list when absent);
`--plateau <id>`; `from` is reserved and refused; `manifests.paths` stays as the short form of one implicit plateau, with the same
ban on `..` and absolute paths (a deliberate breaking change); `manifests.paths` written together with `plateaus` is an error;
`plateau add <id> --from <id>`; a workspace without `plateaus` generates byte for byte as before.

Taken by this run:

- **D1. Syntax.** `settings.current` is a sibling of `settings.plateaus` (the list holds only plateaus, so `current` cannot live in
  it). `name` is optional (the id is shown when absent): the brief made only `path` mandatory and `horizon` optional. An `id` must
  match `[A-Za-z0-9_][A-Za-z0-9_.-]*` (it is a `--plateau` argument, will be part of the `views-<plateau>/` folders of W-5 and an id
  with a slash would be a folder). An unknown key of a plateau is refused with the list of the known ones, not left to Jackson's
  `UnrecognizedPropertyException` (the same place that refuses `from`); `from` has its own message.
- **D2. One set of rules, written twice, same words.** `Plateaus.java` (CLI: `checkStructure` on the raw tree, then `select` on
  the model) and `selectPlateau` / `checkPlateauStructure` in `standalone.html` (editor) hold the rules and the messages; both
  report **every** problem, one per line, and `PlateausTest` (Java, 25) and `plateaus.test.js` (30) run the same cases with the
  same strings. Messages say what to change (a path: `it must be a folder below the one of workspace.yaml, written relative to
  it, without ..`; manifests.paths: `Move the folder below workspace.yaml (or move workspace.yaml up ...) and change the path to
  match`; both keys: `choose one ... give each plateau its own path and remove manifests.paths`; `from`: `Remove it and give the
  plateau its own path`). A path is absolute with a leading `/` or `\`, or a drive letter (`C:`, `d:/`); a `..` segment is looked
  for after splitting on both `/` and `\`; paths are compared normalised (`./a/`, `a` are one folder).
- **D3. "Written" is read from the file, not from the default.** `manifests.paths` has a default (`{manifests}`), so whether it was
  written is read from the raw tree (`WorkspaceFactory`: `tree.path("settings").path("manifests").has("paths")`, `parseSettings`:
  `manifestsPathsWritten`). The POJO is untouched: a workspace without `plateaus` deserialises exactly as before (this is what
  keeps the facet round trip, which re-reads the model as JSON, valid: `plateaus` is empty and omitted, `current` is null).
- **D4. `.` as a path.** Accepted for a single plateau and for `manifests.paths`; the workspace file in the folder is then not a
  manifest of itself (`ManifestParser.parse(wksDir, dirs, workspaceFile)` skips it; the editor skips `workspace.*` at the root).
  Before this run `manifests.paths: [.]` failed on reading `workspace.yaml` as a manifest; it now loads. Said here because it is a
  behaviour change of a case that did not work.
- **D5. Loader.** `WorkspaceFactory.create(path, viewsDir, plateauId)`; the older overloads pass `null`. The plateau read is
  `--plateau`, else `settings.current`, else the last of the list; **one `ManifestParser.parse` per call, on one folder** (the
  same reference in two plateaus is no duplicate, tested; two declarations in one plateau fail with `plateaus/20_to-be/a.yaml` and
  `plateaus/20_to-be/b.yaml`, named from the folder of the workspace). The folder of a plateau that does not exist is an error in
  the CLI (`the folder ... of the plateau ... does not exist`: an empty drawing from a typo would be the silent choice again);
  `manifests.paths` keeps its old tolerance of a missing folder. The resolved `io.morin.archicode.workspace.Workspace` carries
  `getPlateau()` (`@JsonIgnore`, kept by the facet workspace) for W-5.
- **D6. CLI.** `--plateau` is a picocli mixin (`PlateauOption`, initialised in the field so that the tests that inject the commands
  and set their fields keep working) on `views generate`, `query views` and `query graph`: every command that loads a workspace.
  `editor serve` does not load it (the editor chooses by itself).
- **D7. `plateau add <id> --from <id> [--name] [--horizon] [--path]`** (`PlateauGroup`, `AddPlateauCommand`, `PlateauAdder`).
  - *Folder naming.* Next to the copied folder, named after the id. When the copied folder starts with a number (`10_as-is`), the
    new one gets the next multiple of ten above the highest number among the plateau folders that share its parent
    (`plateaus/10_as-is`, `plateaus/30_to-be` give `plateaus/40_p2`), keeping at least two digits; a folder with no number gives a
    folder with none. `--path` overrides it (same rules as a plateau `path`). The number is cosmetic, the list order is authoritative.
  - *How workspace.yaml is written.* Neither the CLI nor Jackson has a writer that keeps comments (the editor's own is
    `patchYamlText`, JavaScript). The least invasive way that needs nothing new: **insert the lines of the new entry in the text of
    the file**, at the end of the existing `settings.plateaus` list, in its style (block or flow, the indentation of the last item,
    double quotes when the last `id` is quoted, a scalar quoted when YAML would read it as another type, the line ending of the
    file kept). Before anything is copied or written, the edited text is read again and compared with the original tree: it must be
    the original plus the new plateau at the end of the list, nothing else, or the command stops (`nothing was written`). Then the
    folder is copied (the whole folder, sub-folders included), then the file is written; if the write fails the copy is removed.
    Checked on a copy of the real to-be `workspace.yaml`: the diff is the four new lines.
  - *Refused:* an unknown source plateau, an existing id, an invalid id, a path that is absolute or has `..`, a path that is the
    folder of another plateau, a folder inside the copied one (or the other way round), a folder that exists (nothing is ever
    written over), the source `.`, a workspace with no `settings.plateaus` (the message says how to start), a `plateaus` list
    written on one line (`[...]`) or a `settings` written as a flow, a workspace file that is not YAML.
- **D8. The editor.**
  - *Reading.* `parseSettings` keeps `plateaus` and `current` as written and `manifestsPathsWritten`; `loadWorkspace` runs
    `selectPlateau` and, when a rule is broken, stops with `AppState.fatalError` (`Could not read the plateaus of workspace.yaml:`
    and the messages, one per line, the same words as the CLI): the folder to read is unknown, and the way out is the text of
    workspace.yaml, which the editor cannot repair anyway. It then reads the manifests of the folder of the plateau (the root handle
    on the folder of workspace.yaml covers every plateau below it; files are named from that root, so a manifest is saved into the
    folder it was read from, and a new element or view or story goes to the folder of the plateau drawn: `firstManifestsDir`). A
    plateau whose folder is missing is drawn empty with a line in the header (`role="alert"`), not a fatal error, so that the
    selector stays usable to leave it.
  - *The selector.* In the header, between the name of the workspace and the perspectives (not in the Map toolbar: the plateau
    changes every perspective, Elements, Files, Library, Map and Settings, not the map alone): a `Plateau` label and a button group
    like the perspectives (`aria-pressed`, same accent), one button per plateau in the order of the file, its name (else id) and
    its `horizon` in a muted span, a tooltip with the id, the horizon and the folder. Shown when the workspace has plateaus (one is
    enough: it says which one is drawn). It wraps with the header (checked at 400 px).
  - *The choice.* Default `settings.current` else the last; a click on another plateau reads its folder, after a `confirm` when
    something is not saved (the reload drops it, as *Cancel* does); remembered per folder in the browser (`localStorage`
    `archicode-standalone-editor:plateau:<folder id or name:...>`, like the sizes of the panels, wrapped in try/catch, plus a
    memory of the page for a browser that refuses its storage); ignored when the workspace no longer has that plateau.
  - *Saving.* `serializeManagedSettings` does not write `manifests` for a workspace that has plateaus and did not write
    `manifests.paths` (it would turn the file into the error of D3); `plateaus` and `current` are not managed, so the file keeps
    them as they are written (`patchYamlText`, comments included). Checked on the real page (Name changed in Settings, saved: the
    only change to a copy of the real workspace.yaml is the `name:` line). *Settings* lists the plateaus (read-only: the order and
    `current` are the author's, in the file) in place of the paths field, and the form no longer needs that field.
- **D9. Schemas.** `query schemas workspace` is generated from `Settings` by Jackson, so `plateaus` (array of objects with `id`,
  `name`, `horizon`, `path`) and `current` appear by themselves (`GetSchemasQueryTest` asserts it). `id` and `path` are not marked
  `required` there: a Jackson `required` on a builder property fails with Jackson's message, and the rules above need ours.
- **D10. The output folders are not part of this run** (W-5): generating a workspace with plateaus writes the same folders as a
  workspace without them (`views`, `views-<facet>`, or `--output`) for the plateau chosen, so generating two plateaus into the
  default folder overwrites. Said in the manual.
- **D11. A workspace without `plateaus` is unchanged,** apart from the ban of D3's breaking change (a `manifests.paths` with `..`
  or an absolute path). Measured below.

## Canonical impact

None to canonical documents (`docs/` holds the run and wave records only). The manual (`src/doc/README.adoc`) gets: a `Plateaus`
section under *Workspace* (keys, rules, the messages, `--plateau`, the folders written, the short form, the **breaking change** in
an `IMPORTANT` block), a sentence in *Technical Configuration*, an editor section (`editor-plateaus`), `--plateau` in *Generate
views* and *Query views*, and an *Add a plateau* command section; an invented example workspace, `src/doc/examples/domain_plateaus`
(two plateaus), is included in the manual and loaded by `ManualExamplesTest` with the other examples. The release notes (outside
this run) must carry the breaking change.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the loaders, the settings, the editor's load/save/settings code, the harness; keep a jar of HEAD for the before/after | done |
| T2 | `Settings.plateaus` (List) and `current`; `Plateaus` rules and messages | done |
| T3 | `WorkspaceFactory` / `ManifestParser`: one parse per plateau, `--plateau`, `.`, the workspace file is no manifest | done |
| T4 | CLI: `PlateauOption` mixin on the three commands; `plateau add` (naming, YAML insertion, verification, copy, rollback) | done |
| T5 | Editor: parse, select, errors, selector, choice per folder, Settings page, saving, new manifests in the plateau folder | done |
| T6 | Tests: `PlateausTest`, `PlateauAdderTest`, `PlateauCliTest`, schema test (Java); `plateaus.test.js` (JS) | done |
| T7 | Manual and the invented example; reflect-config for the new classes | done |
| T8 | Before/after byte for byte; the real pair arranged as two plateaus; the real page | done |
| T9 | `./mvnw verify`, `node --test`, Prettier | done |

## Acceptance criteria (the W-2 row and the P1 gate)

- AC1. A workspace with `settings.plateaus` loads in the CLI (`--plateau`, `current`, last by default) and in the editor (selector):
  `PlateausTest.thePlateausAreAnOrderedList...`, `theLastPlateauIsRead...`, `currentNamesThePlateau...`,
  `thePlateauAskedForWins...`, `PlateauCliTest` (generate and both queries with `--plateau`), `plateaus.test.js` (first tests, the
  selector markup, the choice, the memory), and the real page.
- AC2. Refused with a clear message, each tested on both sides: `from`; an unknown key; a missing `path`; a missing `id`; `..`
  (several spellings); an absolute path (`/`, `\`, `C:\`, `d:/`); a duplicate id; a duplicate path (written two ways); `.` with
  several plateaus; an invalid id; a plateau that is not a mapping; `current` unknown or without plateaus; `--plateau` unknown or
  without plateaus; a missing folder (CLI).
- AC3. `manifests.paths` with `..` or an absolute path is refused with a message that says what to change; both `manifests.paths`
  and `plateaus` is an error; `settings.plateaus` is a `List<Settings.Plateau>` in the model (the order of the file is the order
  read, tested).
- AC4. The duplicate check is per plateau: the same reference in two plateaus is no error, two in one plateau name both files
  (CLI and editor).
- AC5. `plateau add` copies the folder and appends the entry with the comments and layout kept (17 cases in `PlateauAdderTest`, 5
  through the real picocli command line in `PlateauCliTest`, and on a copy of the real workspace).
- AC6. The editor saves workspace.yaml with the plateaus, their comments and the unknown keys kept, writes no `manifests` key, and
  saves a manifest into the folder it was read from (`plateaus.test.js`; the real page).
- AC7. The schemas and the manual are updated.
- AC8. A workspace without `plateaus` generates byte for byte as before: see Results.
- AC9. `./mvnw verify` and `node --test` pass: see Results.

## Review passes

Run inline (one document; no subagent dispatched, as in run 0034).

- **KDMLLC.** K: one class of rules per side (`Plateaus`, `selectPlateau`), the model gains two fields and one nested class, the
  writer inserts lines instead of adding a YAML writer; D: the words of the rules are written once per side and the two test suites
  assert the same strings; M: each rule of the brief has a case on each side (see AC2); L: nothing that W-5 to W-7 own was added
  (no `baseline`, no output folders, no `fold`); U: every message names the plateau or the path and says what to change; C: the
  manual's claims were checked against the messages and the help text of the commands.
- **C scan.** Claim "`plateaus` is a List, never a Set": `Settings.plateaus` is a `List<Plateau>`, tested for order. Claim "a
  workspace without plateaus deserialises as before": the POJO of `manifests` is unchanged and `plateaus` is omitted when empty
  (default files of the manual regenerate unchanged: `git status` shows no change of the examples after the build). Claim "the
  editor and the CLI refuse the same things in the same words": same cases, same strings, both suites. Claim "the editor's save
  keeps comments": **partly**: `patchYamlText` keeps everything it did not change, but a scalar the user changes (the name) loses
  its trailing comment, which it did before this run (the plateaus and `current` are unchanged, so they keep theirs; asserted).
  Claim "`manifests.paths` with `..` was unused in the repository": checked with grep on `src/doc`, `src/test` and the author's
  two real workspaces (none).
- **Open questions.** None left. (`current`'s place and the id pattern are decided above; the author can change either in one
  place per side.)

## Verification

All with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

### Results

- `./mvnw -o verify`: BUILD SUCCESS, 179 tests (131 before, plus 48: `PlateausTest` 25, `PlateauAdderTest` 17, `PlateauCliTest`
  5, one in `GetSchemasQueryTest`), 0 failures, 0 errors (integration tests skipped by default, as in `pom.xml`). The asciidoctor
  `Failed to generate image` lines (no PlantUML jar on this machine) and the two `possible invalid reference` infos
  (`changed`, `external`, an existing sentence of the stereotypes section) are not from this run; the manual builds and has the
  anchors `plateaus`, `plateau-add` and `editor-plateaus`.
- `node --test "src/test/javascript/**/*.test.js"`: 637 tests (607 before, plus the 30 of `plateaus.test.js`), 637 pass, 0 fail.
- `npx prettier --check "src/**/*.java"`: clean.
- **Before and after, byte for byte.** A jar of HEAD (before) and the jar of this run (after), `views generate` run in place on copies
  in the scratchpad of nine fixtures (`src/doc/examples/domain_application`, `domain_technology`, `domain_viewpoint_views`,
  `domain_workspace`, `facet_example_step_1` to `_4`, `src/test/resources/viewpoint-kernel/workspace`) and **copies** of the author's
  baseline (`as-is`, 927 `.puml`) and target (`to-be`, 3411 `.puml`): 5081 `.puml` files in all, `diff -r` of the two trees empty and
  the `md5sum` of the sorted list identical (done with the jar built before the `.` change and again with the final jar).
- **The real pair as two plateaus.** A copy arranged as `plateaus/10_as-is` (the manifests of as-is) and `plateaus/30_to-be` (the
  manifests of to-be), one `workspace.yaml` at the root (the one of to-be with `manifests.paths` replaced by the two plateaus) and
  a second file (`as-is.yaml`, the settings of as-is plus the same plateaus). `views generate --plateau to-be -o ...` on the first
  and `--plateau as-is -o ...` on the second give 4338 `.puml` (3411 + 927), and **each facet folder is byte-identical to the one
  the HEAD jar writes for the original workspace** (nine facets of to-be, three of as-is). `query graph --plateau as-is` /
  `--plateau to-be` / no option: 133 / 166 / 166 elements and 106 / 162 / 162 relationships (the last of the list is the default).
  `plateau add p3 --from to-be` on a copy of that workspace: folder `plateaus/40_p3` (49 files, as to-be), and the diff of
  workspace.yaml is the four lines of the new entry.
- **The originals were only read:** the `md5sum` of their 91 files is the same before and after. Nothing of them is in the repository.
- **Errors from the built jar** (the CLI exits 1 with the message): `--plateau nope`; `manifests.paths` with `../elsewhere`; both
  keys; a `from`; and `plateau add` of an existing id.
- **The real page** (the snap `firefox.geckodriver` driving a headless Firefox over WebDriver, a small script of this run, as in
  runs 0030 to 0034, because the built-in pane does not draw): `editor serve` on the copy of the real pair. The header has the
  `Plateau` group (`As is`, `To be`), `To be` pressed by default and the Map drawn from `plateaus/30_to-be`; a click on `As is` reads
  `plateaus/10_as-is` (Files lists its files), the choice is in `localStorage` and survives a reload; Settings lists the two
  plateaus and has no paths field; Name changed and *Save all changes* writes `name: Platform` and nothing else to workspace.yaml.
  Looked at in light, dark and at 400 px; every screenshot named here was opened.
- `cargo test` and `embed.sh --check`: not run, the Rust and the wasm were not touched.

## Findings

- **For the wave (W-3 to W-8).** The editor reads **one** plateau into `AppState` (the manifests of `selection.path`); the
  comparison of W-6 needs the manifests of a second plateau under the same root handle: the reading loop of `loadWorkspace` should
  become a function of a folder before W-6 (it is one loop today). The CLI side is ready: `Plateaus.select(settings, written,
  requested)` and `WorkspaceFactory.create(path, viewsDir, plateauId)` can be called once per plateau, and the loaded workspace
  carries `getPlateau()`. A `baseline` key per plateau (W-5) is two edits: `KEYS` in `Plateaus.java` and `PLATEAU_KEYS` in
  `standalone.html` (and the `PlateauAdder` fields if `plateau add` should write it); `from` stays refused in both.
- **The output folders** are still the ones of a workspace without plateaus (D10): W-5 owns `views-<plateau>/`.
- **`.` works now** for one plateau, and for `manifests.paths` (it failed before, D4).
- **The text insertion of `plateau add`** supports the block and the flow style of the items, and refuses a list written on one line
  (`plateaus: [...]`), a `"plateaus":` key with quotes, and non-YAML workspaces, with a message: it does not parse YAML, it was
  checked by reading the result again.
- **`CLAUDE.md`'s architecture paragraph** does not mention plateaus (`Plateaus`, `PlateauAdder`); a line there is the
  orchestrator's call (outside this run's paths).
- **Files touched outside `likely_paths`:** `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json`
  (every class under `io/morin/archicode` must be registered: `NativeReflectionConfigTest` asked for the 11 new ones),
  `src/doc/examples/domain_plateaus/**` (the invented example; `src/doc/examples/**` is in W-8's paths, not this run's). Everything
  else is inside: `resource/workspace`, `workspace`, `manifest`, `cli`, `standalone.html`, `src/test/**`, `src/doc/README.adoc`.
- **Not verified.**
  - The editor in Chromium, Edge or Safari (Firefox only), and the File System Access picker (served mode only): the selector,
    the `confirm` on unsaved changes (tested with a stub, not clicked), and the choice per *picked* folder (the key uses the folder's
    id; the tests and the real page used the served folder, keyed by its name).
  - The built-in browser pane (could not draw a screenshot).
  - The native build (`-Dnative`; integration tests are skipped by default): the new classes are registered, and
    `NativeReflectionConfigTest` passes, but no image was built.
  - A plateau folder that is a symlink leaving the folder of the workspace (the rule is lexical: no `..`, not absolute).
  - A TOML or JSON workspace file with plateaus through the CLI (the structure check runs on the tree of any format and is tested
    through YAML only); the editor reads `workspace.yaml` only.
  - Windows path separators on a real Windows machine (a backslash is treated as a separator by the checks, tested as text).
