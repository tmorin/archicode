---
type: wave
wave: 010
status: planned
date: 2026-10-16
related:
  - docs/wav/wav-010-clean-failures-and-faithful-saves/wbc-010-clean-failures-and-faithful-saves.md
  - docs/wav/wav-009-element-identity-across-plateaus/wav-009-element-identity-across-plateaus.md
  - CLAUDE.md
---

# Wave 010 — Clean Failures and Faithful Saves

## Purpose

When this wave is done, a command that fails prints a message and exits non-zero without a stack trace, the warnings of the
application reach the error output, and a facet or a view no longer leads to a crash or an invalid PlantUML file for the cases
filed as #46 and #38. The editor keeps the quoting style of the lines it writes and the lines of a manifest that holds flow
collections, and tells the author when a hand-written state word disagrees with the comparison; the CLI and the editor draw
`split` with the same kind of line. A workspace that hits none of these defects generates exactly the same files as before.

## Non-Goals

- Does not extend the editor's move to the top level, to a parent in another file, or to a list of reasons (#43, #44).
- Does not add `--baseline-ref`, `--fail-on` or `--only-changes`, a wrapped table or `plateau add --adopt` (#25, the rest
  of #26); it only gives the commands the clean error path those need.
- Does not compare more than two plateaus, nor add a `compare` property to views (#24); no reader for a long list of changes (#27);
  no layered increments (#30).
- Does not check what needs the author's real pair or another machine: native image, other browsers, folder picker, thresholds
  of the candidates (#29, #33).
- Does not change the contract of the kernel (#34), nor the cost of the diagram cache keys (#37, not measured).
- Does not change the format of manifests.
- Does not put any text from a real workspace in the repository: fixtures and examples are invented.
- Does not cut a release.

## Decision Prerequisites

Decided on 2026-10-16: the user confirmed the recommendation of each ruling below. The runs apply them.

- **D-1 (decided) (#46, W-2).** A facet that removes an element a relationship points at: (a) *drop* the relationships that point
  at the element (and the `uses` of environments), or (b) keep the limit and say so in a message, the manual saying that
  removing an element means removing the relationships that point at it. Decided: (a). Nothing depends on the current
  behaviour (it crashes), and a facet exists to hide things.
- **D-2 (decided) (#38, W-3).** An id with a hyphen: (a) quote or sanitise it in the PlantUML so the view renders, or (b) say in
  the manual that ids avoid hyphens. Decided: (a). Files that were invalid become valid; ids without a hyphen are
  unchanged byte for byte.
- **D-3 (decided) (#40, part of W-1).** A malformed or twice-listed `replaces`: (a) read the raw list so the kernel's warnings fire from
  the CLI, or (b) keep the model lenient and drop the warnings that cannot fire. Decided: (a).
- **D-4 (decided) (#42, part of W-6).** Which side moves for `split`: PlantUML's `LineStyle` takes a dash-gap pair, not a dash-dot,
  so the CLI cannot draw the editor's dash-dot. Decided: the editor takes a plain dash-gap pair that `removed` does not
  use, since wave 009 is unreleased and nobody has seen either look.
- **D-5 (decided) (exit codes, W-1).** One failure code (1) and picocli's own usage code, nothing reserved for the future
  `--fail-on`. Decided; the vocabulary of #25 is decided with #25.

Left out and not blocking: #39 (list the candidates for a plateau without `replaces`) needs a real pair (#33), so the rule of
wave 009's D-7 stays.

## Wave Manifest

```yaml
wave_manifest:
  wave: 010
  slug: clean-failures-and-faithful-saves
  status: planned
  sources: []
  phases:
    - id: P1
      name: The command line says what went wrong
      gate:
        criteria:
          - 'a failing command (a dangling reference, an unknown plateau, an invalid manifest) prints a one-line message on the error output and exits non-zero, with no stack trace, checked by a Java test for each command that throws `ArchiCodeException`'
          - 'a workspace whose facets use the old dialect (`src/test/resources/viewpoint-kernel/workspace`) prints its rewrite warning on the error output of `views generate`, and `diff` prints the warnings of the comparison'
          - 'the facet of #46 on a copy of `src/doc/examples/domain_plateaus` gives the outcome chosen in D-1 (views written, or a message and a non-zero exit), and the views of an element with a hyphen in its id are accepted by `plantuml-1.2024.7.jar` (D-2)'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` and `src/main/rust/viewpoint-kernel/embed.sh --check` pass'
          - 'the files generated for the workspaces of the repository and of the example folder that hit none of the defects are byte-identical to those of a jar built from the commit before the wave'
    - id: P2
      name: The editor saves what was written
      gate:
        criteria:
          - 'a test per case compares the saved text with the original and shows that only the intended lines differ: a move, a rename and "Write replaces" on a file with double quotes, and the flow shapes of #41 (a flow map, a list in a `- ` item, nested brackets, a multi-line list)'
          - 'the Changes panel says, for a hand-written state word that disagrees with the comparison, which word and why, with the sentences of `StateTags`'
          - 'the key of `split` in the CLI views, the editor and the manual (`editor-compare` and `plateau-comparison` tables) describe the same line'
          - '`node --test "src/test/javascript/**/*.test.js"`, `./mvnw -o verify`, `embed.sh --check` and `npx prettier --check "src/**/*.java"` pass'
          - 'the editor page was looked at in the built-in browser (light and dark) on an invented copy with a move, a hand-written state word and a split'
  runs:
    - id: W-1
      slug: cli-messages
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/ArchiCodeException.java'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/resources/application.properties'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/doc/README.adoc'
      focus: 'see a message instead of a stack, and every warning on the error output'
    - id: W-2
      slug: facet-removes-element
      phase: P1
      depends_on: [W-1]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'hide an element with a facet without the views failing on what pointed at it'
    - id: W-3
      slug: plantuml-hyphen-ids
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/rendering/plantuml/**'
        - 'src/test/java/io/morin/archicode/rendering/**'
        - 'src/test/resources/plateau-comparison/**'
        - 'src/doc/README.adoc'
      focus: 'name an element with a hyphen and still get a view that renders'
    - id: W-4
      slug: editor-keeps-quotes
      phase: P2
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
      focus: 'move or rename in the editor and see only the value change in the pull request'
    - id: W-5
      slug: editor-flow-collections
      phase: P2
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
      focus: 'save a manifest that holds a flow map or a nested list without losing its comments'
    - id: W-6
      slug: editor-state-hints
      phase: P2
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/java/io/morin/archicode/rendering/plantuml/**'
        - 'src/test/javascript/**'
        - 'src/test/java/io/morin/archicode/rendering/**'
        - 'src/doc/README.adoc'
      focus: 'learn in the editor why a hand-written state word is not drawn as a change, and read one look for split everywhere'
```

## Phase P1 — The command line says what went wrong

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `cli-messages` | — | see a message instead of a stack, and every warning on the error output | one `Warnings` channel on the error output used by `views generate`, `diff`, the facet rewrite and the story step (#35); `ArchiCodeException` caught once at the top, message and exit code (D-5); the warnings of the comparison printed; `replaces` read raw (D-3, #40) | Java tests per command; the old-dialect workspace prints its warning |
| W-2 | — | `facet-removes-element` | W-1 | hide an element with a facet without the views failing | the outcome of D-1 in the kernel (or the message through W-1's path) and the manual's facet section (#46) | the reproduction of #46 on a copy of `domain_plateaus`, the `changed`, `moved` and `split` variants |
| W-3 | — | `plantuml-hyphen-ids` | — | name an element with a hyphen and still get a view that renders | the id of an element quoted or sanitised in the PlantUML (D-2, #38), nothing changed for ids without a hyphen | `plantuml-1.2024.7.jar` renders the fixture's `shop.report-a` view; byte-identity on the others |

**Gate:** see the manifest, phase P1.

## Phase P2 — The editor saves what was written

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | — | `editor-keeps-quotes` | — | move or rename and see only the value change | a quote-preserving emitter for the value of a changed or added scalar line in `patchYamlLines`/`patchYamlText` (#45) | tests comparing saved text with the original, as `move-editor.test.js` and `replaces-editor.test.js` do |
| W-5 | — | `editor-flow-collections` | — | save a manifest with a flow map or nested list without losing its comments | `openFlowLists`/`closeFlowLists` extended to the shapes of #41; the rule "accept only if re-reading gives the emitter's value" kept | one test per shape (flow map, list in a `- ` item, nested brackets, multi-line list) |
| W-6 | — | `editor-state-hints` | — | learn why a hand-written state word is not drawn, and read one look for `split` | a line in the Changes panel or the inspector for a disagreeing state word (#36); the line style of `split` (D-4, #42), its keys and the two manual tables | a JS test of the sentence for the four cases; the keys agree |

**Gate:** see the manifest, phase P2.

## Dependency View

```
P1:  W-1 ──> W-2          W-3
P2:  W-4     W-5     W-6
```

## Risks

- **Overlap, W-1 and W-3** (`src/doc/README.adoc`, `src/test/java/**`): `serialize`. The edits are in different sections but
  each run commits its own files, and a shared file cannot be split cleanly between two commits.
- **Overlap, W-1 and W-2** (`src/doc/README.adoc`, `src/test/java/**`): resolved by the edge `W-1 -> W-2` (W-2's message path,
  if D-1 is (b), is W-1's).
- **Overlap, W-2 and W-3** (`src/doc/README.adoc`): `serialize`.
- **Overlap, W-4, W-5 and W-6** (`standalone.html`, `src/test/javascript/**`): `serialize`. W-4 and W-5 change the same two
  functions (`patchYamlLines`, `patchYamlText`), so they must also be read in that order (W-4 first) by whoever dispatches.
- **Overlap, W-2 and W-4, W-5, W-6** (`standalone.html`): they are in different phases; phase order serializes them.
- **Overlap, W-3 and W-6** (`rendering/plantuml/**`, the manual): different phases, serialized by the gate.
- W-2 may re-embed the wasm (`embed.sh`) if D-1 is (a); a contract bump is not expected (the contract of facets does not
  change), and a run that finds it needed stops and reports.
- Byte-identity is the one invariant that every run can break quietly (the quoting emitter, the id sanitiser). Each run
  compares against a jar of the previous commit on the repository's workspaces and says which it ran.
- The warnings channel (W-1) prints to a stream that tests of other commands may capture; a test that asserted an empty error
  output may need to change, and the run says which.

## Completion Criteria

Both phase gates verified; the manual and the `CLAUDE.md` architecture paragraph describe the error path and the warnings
channel; `./mvnw -o verify`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass
on the final tree; every item the runs list as "not verified" is in the final report; the issues #35, #36, #38, #40, #41,
#42, #45, #46 are closed by their commits or re-filed with the reason.
