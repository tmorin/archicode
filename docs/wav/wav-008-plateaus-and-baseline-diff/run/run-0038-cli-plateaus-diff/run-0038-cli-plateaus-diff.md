---
type: run
run: 0038
status: completed
wave: 008
---

# Run 0038: CLI plateaus and diff

Wave 008, item W-5 (phase P3). Focus: see what a plateau changes from the command line, in a file I can review.

Document profile: single-document (as runs 0034 to 0037). This file carries scope, decisions, the interface for the next runs,
canonical impact, verification and findings.

## Context

Run 0035 gave the loaders `--plateau`, run 0036 the kernel's `compare`, run 0037 views that carry `change`. Nothing yet let a
person ask for the comparison from the command line. This run adds the baseline (`--baseline`, the `baseline` key), the `diff`
command, the comparison views of `views generate` with their `gap.*` files, and the default PlantUML look of the four states.

How the run went: the first executor died after writing most of the code and tests, with no run document. This executor found the
working tree compiling and green (237 JUnit tests), assessed each scope item against the code, and found the code complete for
items 1 to 5 and the Java tests; what was missing was the evidence (the PlantUML look recorded, the real-data check, the
byte-identity checks), the manual (item 7), Prettier and this document. The decisions below were reconstructed from the code and
tests; each was re-read and checked, none was reopened, and the ones that could not be justified are in "Open".

## Scope

In: `--baseline` and the `baseline` key (`Plateaus.java`, `Settings.Plateau`, `PlateauAdder`, `plateau add --baseline`, the one-line
editor edit); `archicode diff`; `views generate --baseline` with the per-plateau output folders and `gap.md`/`gap.json`; the union
workspace and the facets of a comparison; the PlantUML look (`ChangeMarks`) and the legend; tests; the reflection config; the
manual's CLI parts.
Out: the editor beyond the one-line key (W-6, W-7), the Rust kernel (not touched), a CLI flag for `only_changes` (see Open).

## Decisions

Taken by the author (the brief; not reopened): the baseline of a plateau is the previous plateau of the list unless a `baseline` key
says otherwise; `--format text|markdown|json`, `--no-wording`; exit code 0 with differences; a workspace without plateaus is
byte-identical; with plateaus `views-<plateau>/` and `views-<plateau>-vs-<base>/`, facets keep their template; `gap.md` and
`gap.json` in the comparison folder; the four states never told by colour alone.

Taken by this run (reconstructed from the code; each one checked):

- **D1. Baseline resolution** (`Plateaus.baseline(settings, plateau, requested)`): `--baseline`, else the plateau's `baseline` key,
  else the previous plateau of the list, else none (first plateau). An unknown id is an `ArchiCodeException` that lists the
  plateaus, the plateau itself is refused. `settings.current` does not move the baseline.
- **D2. The `baseline` key is validated with the other keys** (`Plateaus.select`): an unknown id or the plateau itself is a problem
  reported with the others, one per line, before anything is read. `KEYS` has it, so the "unknown key" message lists it. The editor
  refuses unknown keys with the same words, so `PLATEAU_KEYS` and the message in `standalone.html` got the same one-line edit (and
  `plateaus.test.js` and `PlateausTest` the new wording). The editor does not check that the id is known: see Open.
- **D3. `plateau add --baseline <id>`** writes a `baseline` key into the new entry (the id must be a plateau of the list); without
  it nothing is written, because the default (the previous plateau, which is the one the new plateau is copied from when that is the
  last) already is what an author who copies the last plateau wants. The text edit and its verification (`verify`) handle the key.
- **D4. `diff` with nothing to compare is an error, exit 1** (not an empty comparison): a workspace with no `settings.plateaus`, or
  the first plateau without a baseline, each with a message that says what to write. Reason: an empty table reads as "no
  difference", which is a different statement; the stack trace is the convention of the other commands (an `ArchiCodeException`).
- **D5. The table** (`GapReport`, one rendering of the kernel's rows in three formats): header `comparing <plateau> with <base>`
  (with the name in brackets when there is one), `elements +N ~N -N`, `relationships +N ~N -N`, `wording only N of the M changed
  elements`, then the rows (change, thing, layer, reference, natures, details). A relationship's reference reads `source ->
  destination (label)`. The order of columns differs from the brief's list (reference first): change and thing first let a reader
  scan the kind of change, and `layer` is needed because a reference is only unique inside a layer. `--no-wording` leaves the
  wording-only rows out and adds `N wording-only changes hidden (--no-wording)`. Line ends are `\n`, JSON is indented by two spaces
  by a fixed printer, plain ASCII; byte-stable (`theBytesAreTheSameFromOneRunToTheNextInEveryFormat`).
- **D6. Comparison only when asked for, by `--baseline` or by a `baseline` key**, not by the default previous plateau: a comparison
  doubles the number of views (3,411 to 3,512 files on the real data), so it is not generated by surprise; `diff` is the command
  that uses the default. `--baseline` on a workspace without plateaus, or an unknown baseline, stops before anything is written.
- **D7. Output folders**: with plateaus, `views-<plateau>` (`<output>-<plateau>` with `--output`) and
  `views-<plateau>-vs-<base>`; the facets keep their `directory-name-template` and apply it to those names
  (`views-to-be-vs-as-is-main`). Run 0035 had left the plateau folders as for a plain workspace; changed here
  (`WorkspaceFactory.load`). A workspace without plateaus is untouched (D12). `gap.md` and `gap.json` go in the comparison folder
  itself (not in the facets' folders), always with the wording-only rows, whatever `--no-wording` is for `diff`. When the author
  disabled the global views (`global-enabled: false`, as in the real workspace) that folder holds only `gap.*`.
- **D8. The union** (`WorkspaceFactory.createUnion`): the plateau is read afresh and the elements the comparison calls removed are
  merged in under their parent (a removed parent brings its removed children whole), so the plain views of the plateau, drawn from
  the first load, never see them. `Workspace` gained `baseline` (the plateau it is compared with).
- **D9. Facets in a comparison: `change` is put in the facet's JSON** (`ComparisonDocument.inject`), not handed to the kernel's
  `compute`. The facet (`apply_facet`, a JSONPath over the workspace's JSON) then selects on `change` like on any field
  (`$..relationships[?(@.change=='removed')]`), the removed relationships of the baseline are added to the elements that declare
  them so that a facet sees the whole union, and `change` is stripped before the answer is read back as a workspace. Rejected:
  giving the facet to `compute` (the viewpoints would have to learn facets, and the CLI's facets act on the workspace before any
  view exists). The views of a faceted comparison keep the union's `change` for what the facet left (`KernelViewpointFactory.unionOf`).
  Ordinary facets work unchanged on comparison views (`aFacetCanReadWhatChangedAndAnOrdinaryFacetKeepsWorking`).
- **D10. The look** (`ChangeMarks`), checked on a hand-written `.puml` and on real views with PlantUML 1.2024.7 (see Verification):
  `new` `+`, thick solid outline (3) in green; `changed` `~`, dotted outline (2) in orange; `removed` `−`, grey (#7F7F7F) dashed
  outline on a light grey fill, grey struck title (`--name--`); `contains-changes` `±`, thin (1) dashed blue-grey outline. Links:
  `new` thick solid green, `changed` dotted orange, `removed` dashed grey, each with the glyph in bold in front of the label
  (a link with no label gets the glyph alone). The glyph is in the label text, not the stereotype, because the CLI hides the
  stereotypes (`hide stereotype`). The glyphs are PlantUML escapes (`<U+007E>`, `<U+2212>`, `<U+00B1>`): the file stays ASCII and
  `~`, which Creole takes for an escape, is a character like another. A new or changed box keeps the author's fill. Colours are
  the Okabe-Ito ones, readable with the usual colour-vision deficiencies, and the marks and lines carry the meaning anyway.
- **D11. Author's style wins, property by property** (`PlantumlUtilities.stereotypeStyles(styles, defaults)`): the default style
  of a state is the base, the author's `by-qualifiers` entry of the same name is laid over it, then `by-tags`. Only the states a
  view uses get a default (so a view with no change has none). The legend (`legend right`, a Creole table with the plateau names,
  the four marks, boxes and links) is written after the links when the view says at least one change.
- **D12. A view that compares nothing is byte-identical** (`Viewpoint.compared` is false; every `ChangeMarks` function returns the
  input unchanged), checked on 743 repository files and on the 3,411 files of the real to-be.
- **D13. Reflection config**: `BaselineOption`, `DiffCommand`, `GapFormatConverter`, `GapFormat`, `GapReport` (+`$1`), `ChangeMarks`
  (+`$1`), `ComparisonDocument`, `WorkspaceFactory$Loaded`, `KernelViewpointFactory$FacetedUnion` added; `NativeReflectionConfigTest`
  passes. The native image itself was not built.

## What PlantUML 1.2024.7 draws

On `/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`, a hand-written `.puml` (four boxes, four links,
a legend) and two real views rendered to PNG and looked at:

- `LineStyle: 0` solid, `2` dotted, `4` fine dashes, `7` long dashes: four outlines that differ at a glance, with
  `LineThickness: 3` visibly thick. A hyphenated selector (`.contains-changes`) works (as run 0037 found).
- Links: `-[thickness=3,#009E73]->`, `-[dotted,thickness=2,#E69F00]->` and `-[dashed,#7F7F7F]->` draw as expected; the dashed one is
  thin and grey, readable next to the dotted orange one because of the glyph, which is why the glyph is not optional.
- `**− --Removed box--**` draws a bold struck title in the grey font colour of the style. `<U+2212>`, `<U+007E>`, `<U+00B1>`
  draw `−`, `~`, `±` in the title, in a link label and in a legend table (`~` is hard to tell from `−` at small sizes; it is
  next to a dotted line and a dotted outline).
- The legend renders as a framed table with bold header and cells; nothing overlaps the diagram (it goes to the bottom right).

## The interface for the next runs

- **W-6 and W-7 (editor).** The editor needs the same default look (glyphs `+`, `~`, `−`, `±`, the line styles, the grey struck
  title) and the same legend words: `ChangeMarks` is the reference. `PLATEAU_KEYS` accepts `baseline` already; the baseline
  choice, its check against the plateau list and `plateau add --baseline`'s counterpart are W-6's. The rows of the table come from the
  kernel (the editor lists the same ones as `GapReport`).
- **W-8 (manual).** The CLI part is written (see below): `Comparing two plateaus` under Plateaus, `--baseline` under Generate
  views, `Compare plateaus` (`[[diff]]`) among the commands, `--baseline` of `plateau add`. The editor parts and the feature list
  are left to W-6, W-7 and W-8.

## Canonical impact

None to canonical documents (`docs/` holds the run and wave records only). `CLAUDE.md`'s architecture paragraph could name `diff`
and the comparison views; that is the orchestrator's call. The manual is the user-facing canon and is updated.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave plan, runs 0034 to 0037, the working tree left by the interrupted executor, and run the tests | done |
| T2 | `baseline`: `Plateaus`, `Settings`, `PlateauAdder`, `plateau add --baseline`, the editor's one line | done |
| T3 | `diff` and `GapReport` (text, Markdown, JSON, `--no-wording`) | done |
| T4 | Output folders, `createUnion`, `gap.*`, facets of a comparison | done |
| T5 | `ChangeMarks` (states, styles, legend), renderers | done |
| T6 | Tests (JUnit through picocli on invented fixtures `plateau-comparison/`, units, node) and the reflection config | done |
| T7 | PlantUML 1.2024.7 look on a hand-written file and on real views | done |
| T8 | Real-data check and byte-identity (HEAD jar vs the run's jar) | done |
| T9 | Manual (`src/doc/README.adoc`) | done |
| T10 | Prettier, `./mvnw verify`, `node --test` | done |

## Verification

All run on the final tree. JAVA_HOME is JDK 25.

- `./mvnw -o verify`: BUILD SUCCESS, 237 tests, 0 failures (Failsafe ITs are skipped by default). The Asciidoctor step runs; its
  only errors are the PlantUML-diagram ones that exist without this run (PlantUML not loadable in this environment).
- `node --test "src/test/javascript/**/*.test.js"`: 652 pass, 0 fail.
- `npx prettier --write "src/**/*.java"` run before the last build.
- `cargo test` and `embed.sh --check`: not run; the Rust and the `.wasm` are untouched.
- New tests: `PlateauComparisonTest` (25: diff in three formats, determinism, `--no-wording`, baseline rules through the command
  line, output folders, `gap.*`, defaults and author override, facet reading `change`, byte-identical regeneration, legend),
  `ChangeMarksTest` (9), `BaselineTest` (10), `UnionWorkspaceTest` (2), `PlateausTest`/`PlateauCliTest` extended, all on the
  invented bookshop `src/test/resources/plateau-comparison/` (three plateaus, `later` with its own `baseline`).
- **Real data** (read-only; md5 of the 91 files of `as-is` and `to-be` before and after: identical; copies arranged in the
  scratchpad as `plateaus/10_as-is/manifests` and `plateaus/30_to-be/manifests` with one root `workspace.yaml`, the to-be one
  minus `manifests.paths`): `archicode diff` gives `elements +38 ~26 -5`, `relationships +71 ~12 -15`, 10 of the 26 changed
  elements wording-only. These are exactly the counts of run 0036: the CLI loader and the kernel agree, no off-by-one. `views
  generate --baseline as-is`: 9 plateau folders of 379 files (3,411 `.puml`, the number of the plain to-be) and 9 comparison
  folders of 390 files (11 more, the removed elements' views) plus `views-to-be-vs-as-is/` holding `gap.md` and `gap.json`
  (2 files; that workspace disables the global views); 3,512 files in all, about 91 seconds. Rendered with the jar: the Shared
  Care Plan detailed view and the Vault Backend overview. They show new boxes (thick green outline, `+`), changed ones (dotted,
  `~`), removed ones (dashed grey, struck titles: Mailer, Blob Storage), a `±` system (ACL Service), new and removed links with
  their glyphs and the legend; the author's `new` and `changed` fills (light green, light orange) show through with the default
  outlines on top, which is the property-by-property rule at work.
- **Byte-identity of a workspace without plateaus** (jar of `git archive HEAD` built in the scratchpad vs the run's jar,
  `diff -r`): the 9 repository workspaces without plateaus (`facet_example_step_1..4`, `domain_workspace`, `domain_application`,
  `domain_viewpoint_views`, `domain_technology`, `test/resources/viewpoint-kernel/workspace`): 743 `.puml`, identical; the copy of
  the real to-be: 3,411 `.puml` (3,461 files), identical.

## Open

- The editor accepts a `baseline` key without checking that it names a known plateau, so a `workspace.yaml` the editor opens can
  be refused by the CLI with `unknown baseline`. W-6 is to add the check (the words are in `Plateaus.select`).
- `only_changes` (run 0037) has no CLI flag: the plan's W-5 row does not ask for one, and `GenerateViewsCommand` passes `false`.
  A `--only-changes` option would be one line plus a test; left for the orchestrator to decide.
- The text table is not wrapped: on the real data the reference column is as wide as the longest relationship (about 150
  characters). Fine for a pipe or a pull request (`--format markdown`), long for a narrow terminal. Not reworked.
- A cosmetic choice not settled by evidence: the default colours (green, orange, grey). The marks and lines carry the meaning
  (checked on the renders), the author can restyle by `styles.by-tags`.
- The native image was not built; only the reflection config test ran.
