---
type: wave
wave: 007
status: in-progress
date: 2026-10-14
related:
  - docs/wav/wav-007-stable-stereotypes-and-nested-fills/wbc-007-stable-stereotypes-and-nested-fills.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0013-kernel-stereotypes.md
  - docs/wav/wav-006-library-view-editor/wav-006-library-view-editor.md
  - CLAUDE.md
---

# Wave 007 — Stable Stereotypes and Nested Fills

## Purpose

When this wave is done, generating the views of a workspace twice, in any order of the inputs the tool does not control,
gives the same files byte for byte, and a test fails if it ever stops doing so; the cause of the reorder reported on
the user's workspace is named, or the report is shown to come from a version before runs 0013 and 0021. In the
editor, a box styled with a fill and no outline is drawn with an outline derived from its fill, so that a box inside a
box of the same fill is told apart, in the light and the dark theme and in the exported SVG, and the manual says so. A long label of a link is broken over several lines in the diagram of the editor, so that it
stays near its link and does not run over its neighbours, and the exported SVG agrees.

## Non-Goals

- Does not compute a baseline-versus-target diff, nor add `new`, `changed` or `removed` stereotypes (tmorin/archicode#18).
- Does not sort the generated files after the generation, outside archicode.
- Does not change the colours the author wrote: the fill stays as given, and an explicit `line-color` always wins.
- Does not change the Wrap toggle of names, qualifiers and descriptions, nor the width the CLI gives a label (PlantUML
  already wraps at 200).
- Does not change the format of `workspace.yaml` or of the manifests, nor the kernel contract, unless the order defect
  is found there (then the change is the minimum that makes the order stable, with the wasm re-embedded).
- Does not restyle the diagrams of the CLI beyond what the check of W-2 finds (the PlantUML default outline is dark).
- Does not cut a release.

## Wave Manifest

```yaml
wave_manifest:
  wave: 007
  slug: stable-stereotypes-and-nested-fills
  status: in-progress
  sources: []
  phases:
    - id: P1
      name: The three fixes
      gate:
        criteria:
          - '`./mvnw verify` passes on JDK 25'
          - '`node --test "src/test/javascript/**/*.test.js"` passes'
          - '`cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` passes and `src/main/rust/viewpoint-kernel/embed.sh --check` passes'
          - 'a test generates the views of a workspace with several stereotypes per box twice, with the elements and the tags declared in different orders, and finds identical bytes'
          - 'in the editor, a link label wider than the maximum is drawn on several lines, in the diagram and in the SVG export, checked by a test on the generated markup and by a look at the real page'
          - 'in the editor, the stylesheet and the SVG export draw an outline for a box with a fill and no line-color, checked by a test on the generated markup and by a look at the real page in the light and the dark theme'
  runs:
    - id: W-1
      slug: stable-stereotype-order
      phase: P1
      depends_on: []
      run: '0031'
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/rendering/**'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/resources/**'
        - 'src/doc/README.adoc'
      focus: 'regenerate a workspace and see no changed file unless the workspace changed'
    - id: W-2
      slug: nested-fills-outline
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'tell a box from the box of the same colour around it'
    - id: W-3
      slug: wrapped-link-labels
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'read the label of a link without it running over the boxes next to it'
```

## Phase P1 — The three fixes

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0031 | `stable-stereotype-order` | — | regenerate a workspace and see no changed file unless the workspace changed | Reproduce the report: generate the user's target workspace (a copy, in the scratchpad) with the current build and with the build before runs 0013 and 0021 (the 0.10.0 tag, or the parent of `cf642ad`), and compare. Find what orders the stereotypes, the tags, the facet folders and the file names (qualifiers vs `rendering-stereotypes`, map iteration, element order across manifests, JVM or OS). Fix what is unstable, or show that the report is the one-time reorder of runs 0013 and 0021. Add a determinism test and say in the manual what is guaranteed. | Names the cause or shows the report is explained by the earlier version; a test generates twice with inputs declared in different orders and compares bytes; no file generated from a copy of the user's target workspace differs between two generations; `./mvnw verify` passes |
| W-2 | — | `nested-fills-outline` | — | tell a box from the box of the same colour around it | In `styleLookOf` and the stylesheet (and the SVG export style, which repeats them), give a box with a `background-color` and no `line-color` an outline derived from the fill (same hue, darker), with `--st-stroke-opacity` at 1 for a compound box; an explicit `line-color` wins; the fill is untouched. Check both themes, a box inside a box of the same fill, the focal and selected outlines, and the badge. Check what the CLI's PlantUML draws for the same workspace and record it. Update the styles section of the manual. Look at the real page, in a copy of the user's baseline workspace (`external` on `hub` and its systems). | Tests on the generated markup and the export for: no `line-color`, `line-color` given, parent and child of the same fill; the real page in the built-in browser, both themes, with the `hub` solution; the manual describes the derived outline; `node --test` passes |
| W-3 | — | `wrapped-link-labels` | — | read the label of a link without it running over the boxes next to it | The label of a link is one `<text>` line today (`renderDiagramSvg`, `dg-label`), sized by the layout from its full width, so a long label crosses the neighbouring boxes and links. The reference case, from the user's baseline: `staffer` to `platform.web.frontend`, label "manages catalogue entries, partner offers and banners, revokes shared coupons and consults order history with" (108 characters, about 600 px at 11 px) and the qualifier `https`, which the editor appends as `[https]` (`diagramLinkText`); the test uses a synthetic label of the same length, not the client's text. Break it at spaces to a maximum width (a constant, about 200 to 240 px, chosen by looking) into `<tspan>` lines, give the layout the wrapped width and height, keep the label centred on its link and clickable as one target (`select-link`), keep the accessible name and the tooltip whole, and draw the same in the SVG and PNG export. A word longer than the maximum is cut with an ellipsis, as names are. Decide whether the Wrap toggle can switch it off (the default is on: the user asked for a soft wrap of long labels). | Tests on the generated markup and the layout input for a short, a long, a very long (the 108-character case above, with its qualifier) and a one-long-word label, with and without qualifiers, checking that the qualifier is not cut off the last line; the export agrees; the real page in the built-in browser on the user's baseline (copy) with the long labels of `hub`; the manual says it; `node --test` passes |

**Gate:** `./mvnw verify`, the JavaScript tests, `cargo test` and `embed.sh --check` pass; the determinism test exists and
passes; the editor draws the derived outline and the wrapped labels (tests and a look at the real page).

## Risks

- **Overlap W-1 / W-2 / W-3.** W-1, W-2 and W-3 may all edit `src/doc/README.adoc`, and W-2 and W-3 both edit
  `standalone.html` (the box styles, and the drawing of the labels: two regions of a 12,000-line file) and add tests under
  `src/test/javascript`. Verdict: `serialize`, in the order W-1, W-2, W-3, because the manual is one file and one
  working tree, and two concurrent edits of the same file are not safe. W-1 shares nothing else with the other two
  (`rendering`, `viewpoint` and the kernel for W-1).
- **W-1 may find nothing to fix.** Two consecutive generations of the current build are already identical. That is a valid
  result: the run then adds the guard and records the explanation. It must not invent a change to look done.
- **The user's workspace is client data.** It is copied to the scratchpad for the checks and never committed; fixtures
  in the repository are synthetic.
- **The derived outline is a taste.** The darkening factor is chosen by looking at the page in both themes; the run
  records the value and the reason.
- **The editor cannot be fully automated.** As in waves 004 to 006, DOM, CSS text and a look in the built-in browser
  stand for the File System Access picker; the run says what was not verified.

## Completion Criteria

- Every gate criterion of P1 holds.
- The branch carries one commit per run, as a pull request to be rebase-merged (the repository allows nothing else).
- The progress log records the cause found by W-1 (or that the report predates runs 0013 and 0021), the factor chosen by W-2, the maximum label width chosen by W-3,
  and what was not verified.
