---
type: run
run: 0032
status: completed
wave: 007
---

# Run 0032: Nested fills outline

Wave 007 (`stable-stereotypes-and-nested-fills`), item W-2 (phase P1). Focus: tell a box from the box of the same colour around
it. Document profile: `single-document` (the scope arrives settled by the wave's W-2 row, the design is one function and a
constant, no live alternative worth a TDD); this file carries scope, decisions, canonical impact, verification and findings.

## Context

In the standalone editor, a box styled with only `background-color` (`styles.by-tags.external: background-color: lightgray`)
falls back to `var(--border)` for its outline, a grey that is lost on its own fill in the light theme, and a child with the same
fill as its compound parent vanishes into it. On the real baseline workspace the `hub` solution and each of its systems carry
`external`: in the light theme the five systems of the solution cannot be told from it (see "Looking at the real page").

## Decisions

- **D1. The outline is derived where the look is built: `styleLookOf`.** With a fill (opaque) and no `line-color`, the look gets
  `--st-stroke` = `derivedOutlineOf(fill)` and `--st-stroke-opacity: 1`. Everything downstream already reads those variables: the
  stylesheet, the SVG export (inline variables on each box, the rules of `diagramExportCss` read them), the pill of a stereotype
  (`stereotypeBadgeVarsOf` takes `--st-stroke` from its own look) and the badge of a tree row. So the page, the export and the
  badges agree by construction, and **neither CSS block changed**: the rules and their order (styled before focal, selected, ghost)
  are those of runs 0017 and 0026. The derivation is done on the merged style of the stereotypes of a box (`stereotypeLookOf`), so
  a `line-color` of any of them is the author's and wins; a later fill is outlined from the final fill.
- **D2. Darkening factor 0.6**, each RGB channel scaled (the proportions of the colour, hence its hue, are kept). Chosen by
  looking at the real page, light and dark, at 0.8, 0.6 and 0.4 (screenshots described below): at 0.8 the line of `lightgray` on
  `lightgray` is faint (`#aaa` on `#d3d3d3`, contrast 1.5 on the box edge), at 0.4 it becomes a heavy dark frame on every system
  of a solution, at 0.6 (`#7f7f7f`) it reads as a firm edge without shouting, in both themes. Over the 141 CSS colour names the
  derived outline has a contrast of at least 1.5 with the fill (the lowest are `darkred`, `darkslateblue`, `purple`).
- **D3. A fill too dark to darken is lightened** (relative luminance below 0.05, the same factor towards white). Not in the
  wave row ("same hue, darker"), added because looking at the page showed the darkened outline of a `#1b2a41` box on a `#1b2a41`
  parent is a shadow, and a black box in a black box has no outline at all (the child is not there). The lightened colour keeps
  the hue (a mix towards white); `black` gets `#666666`. Only dark fills are concerned (the fills the user writes are light).
- **D4. A compound box is outlined at opacity 1.** The `0.55` of the stylesheet is the fallback of a box with no colour at all
  (the theme's `--muted` line); a derived outline is a colour the workspace painted, as firm as a chosen one. This is also what the
  existing `line-color` branch does (`--st-stroke-opacity: 1`).
- **D5. A child with the same fill as an ancestor needs nothing more.** Parent and child each get the outline of that fill; they
  differ by their edge, not by their fill (the fill is the author's own colour and stays untouched). The parent's line is the
  heavier one (1.5 against 1.25 px). No look-up of the ancestor's fill was added: the derived line is enough on the real case, and
  a rule that depended on the ancestor would make a box draw differently by where it sits.
- **D6. Unchanged and checked:** the author's `line-color` wins (also when it equals the fill); a `transparent` or unreadable
  fill has no derived line; no fill leaves the theme's look, byte for byte; the focal and selected outlines (accent) still win
  (measured on the page, both themes: `rgb(43,108,176)` and `rgb(108,176,240)` at 2.5 px on a selected child, while its
  neighbours stay `#7f7f7f`); the ghost red dash is still after the styled rule.

## Looking at the real page

Method of run 0030: a **copy** of `<real-workspace>/as-is` in the scratchpad (the original was only read; its 41
files have the same `md5sum` before and after), `./mvnw -o -DskipTests package` on JDK 25, `java -jar target/quarkus-app/quarkus-run.jar
editor serve --host=127.0.0.1 -p 48140 -w <copy>/workspace.yaml`. Nothing of the copy or of a screenshot is in the repository.

- The built-in browser of the desktop app was fronted and a screenshot tried (twice): "Screenshot timed out after 5s: the page did not
  finish rendering", as in run 0030. The look rests on a **headless Firefox 157 (snap) driven over WebDriver** (geckodriver, a small
  script of this run, a temporary profile), which draws the page for real; theme set through the Settings key
  (`archicode-standalone-editor:theme`), diagram on *Fit*, element screenshots of `#diagram-canvas`. Every screenshot named here was
  opened and looked at. Firefox is not Chromium; the CSS is the same.
- **Before** (the outline forced back to the theme's border, light theme, view Deep of `hub`): the five systems inside `hub` are
  fills with no edge, only their text and `external` marks tell where they are (a faint `#ddd` hairline, invisible on `#d3d3d3`).
  In the dark theme the border is lighter than the fill's neighbours and the defect is milder.
- **After** (factor 0.6): each system has its own edge inside the solution, and so has the solution, with the focal accent
  outline of `hub` kept. The same on the context view of the Library (`acme_digital_platform_context`), where the `external` boxes
  now stand out of the page in the light theme and read as before in the dark one.
- **Factors** compared on the same page and theme (0.8, 0.6, 0.4, and the unfixed look): see D2.
- **Other fills** (injected as inline variables on the real boxes, `#1b2a41`, `#000000`, `#4a90d9`, `#fff3b0`, light and dark):
  the pure darkening (D2 alone) loses the child on black and almost on navy; the lightened outline of D3 shows it; the blue and the
  yellow read well with the darkened line.
- **The SVG export**: `diagramExportDocument()` on the page gave a document with the derived `--st-stroke` inline on 12 elements (the
  boxes and their pills); rendered alone (a `data:` SVG in the browser) the children of `hub` have their edge. The PNG is drawn from
  that document.
- **The CLI's PlantUML**, same workspace: `views generate` on a copy (927 `.puml` files), then `hub-deep.puml` rendered offline with a
  PlantUML jar found on the machine (1.2024.7, not necessarily the version a user has). The `external` style is
  `BackgroundColor: lightgray` per element type, and PlantUML draws the fill with its own thin dark outline: the systems of the
  solution are visibly boxed inside it (the composite's own line is a dashed `darkgray`). **No defect in the CLI; nothing changed
  there**, as the wave asks. Recorded in the manual.

## Canonical impact

None to canonical documents: `docs/` holds the run and wave records only. The user-visible rule is in the manual (`src/doc/README.adoc`,
the styles section), updated by this run; the paragraph W-1 added under "Generate views" and the stereotype-order paragraph of the
styles section were not touched.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Serve a copy of the baseline, look at the page before, light and dark | done |
| T2 | `derivedOutlineOf`, `STYLE_OUTLINE_DARKEN`, the branch in `styleLookOf` | done |
| T3 | Factor chosen by looking (0.8, 0.6, 0.4), other fills, selected and focal, export | done |
| T4 | Tests: look, line-color wins, all CSS names, dark fills, several stereotypes, parent and child of one fill, pill, CSS of the page and the export | done |
| T5 | Check what the CLI draws, record it | done |
| T6 | Manual: the styles section | done |
| T7 | `./mvnw verify`, `node --test` | done |

## Acceptance criteria (the W-2 row)

- AC1. Tests on the generated markup and the export for no `line-color`, `line-color` given, parent and child of the same fill:
  `styles.test.js`, section 13 (ten tests; with the derivation switched off, seven of them and an assertion of an older test fail, checked;
  the other three guard what must not change).
- AC2. The real page in the built-in browser, both themes, with the `hub` solution: looked at, in a headless Firefox because the
  pane does not draw (see above), which is a deviation from the letter of the row.
- AC3. The manual describes the derived outline: yes (editor paragraph and colours paragraph).
- AC4. `node --test` passes: see Results.

## Review passes

Run inline (short document; no subagent dispatched).

- **KDMLLC.** K: one pure function, one constant, one branch; D: the rule lives in `styleLookOf`, the page, the export and the
  pills read the variable, no second computation; M: line-color given or not, fill or not, transparent, dark, several stereotypes,
  nested, pill, page CSS, export CSS; L: no CSS changed, no new class; U/C: the manual's sentences were checked against the code
  and against the screenshots ("each channel at 60 %", "as firm on a box that contains others", "lighter for black").
- **C scan.** Claim "falls back to `var(--border)`" checked on the real page (computed stroke before the change). Claim "the CLI
  needs nothing" checked by rendering, not assumed (the first draft of the manual was going to say it from the style block alone).
  Claim "an unstyled box is unchanged" checked by a test on the markup (no `style` attribute on an unstyled leaf).
- **Open questions.** None left.

## Verification

All with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

### Results

- `./mvnw -o verify`: BUILD SUCCESS, 121 tests, 0 failures, 0 errors (integration tests skipped by default, as in `pom.xml`).
- `node --test "src/test/javascript/**/*.test.js"`: 581 tests (571 before, plus the ten of section 13), 581 pass, 0 fail.
- `cargo test` and `embed.sh --check`: not run, the Rust and the wasm were not touched (`git status` shows neither).
- The original workspace: `md5sum` of its 41 files identical before and after; the server (port 48140) and the WebDriver server were
  stopped (no listener left on 48140 or 48200).

## Findings

- **For the wave.** The factor is 0.6 (lightened for a fill of luminance below 0.05, D3). The CLI needed nothing. No change outside
  `likely_paths`. W-3 is not affected: the edit is in `styleLookOf` and a new constant block near `STYLE_KEYS`, nothing in
  `renderDiagramSvg` or the labels.
- **Not verified.** Chromium and Safari (Firefox only); the built-in browser could not draw a screenshot; the native image; a user's
  real folder through the File System Access picker (served mode only); the PNG export itself (checked on the SVG it is drawn from);
  the real `hub` in a **Map** view with `hub` opened (the Deep view and a Library view were looked at).
- **Constraint for later runs.** Any new place that draws a styled box must read `--st-stroke` and `--st-stroke-opacity` from the
  box's own variables, as the stylesheet and the export do, and not recompute an outline.
