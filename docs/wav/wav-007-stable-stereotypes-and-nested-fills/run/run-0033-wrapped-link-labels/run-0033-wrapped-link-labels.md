---
type: run
run: 0033
status: completed
wave: 007
---

# Run 0033: Wrapped link labels

Wave 007 (`stable-stereotypes-and-nested-fills`), item W-3 (phase P1). Focus: read the label of a link without it running over
the boxes next to it. Document profile: `single-document` (the scope arrives settled by the wave's W-3 row, the design is one
function, four constants and two call sites, no live alternative worth a TDD); this file carries scope, decisions, canonical
impact, verification and findings.

## Context

In the standalone editor the caption of a link (`diagramLinkText`: its label, then its qualifiers in brackets) was one
`<text class="dg-label">` line, and the layout was told `width: diagramTextWidth(caption, 11) + 10, height: 15`. A long caption
is as wide as its text: on the real baseline workspace the relationship of `staffer` to `platform.web.frontend` has a
108-character label and the qualifier `https`, about 450 px at 11 px, and in the overview of `platform.web.frontend` it runs
across the box of the Customer and under the Staffer (see "Looking at the real page", before). The longest other label of that
workspace has 50 characters.

## Decisions

- **D1. One function for the layout and the drawing: `diagramLabelLayout(link, wrap)`** (next to `diagramLeafLayout`, the same
  idea): it returns the `lines`, the `width` (widest line measured with `diagramMeasureText(line, 11)`, plus 10) and the `height`
  (`13` per line plus `2`: 15 for one line, as before). `buildElkGraph` gives ELK that width AND height, `renderDiagramSvg`
  draws the lines of the same call. It reuses `diagramWrapText` (cut at the spaces, ellipsis when a cap is given) and
  `diagramMeasureText`, the helpers that wrap the names and descriptions of the boxes: no second wrapper.
- **D2. Maximum width 220 px** (`DIAGRAM_LABEL_MAX_WIDTH`, per line, measured). Chosen by looking at the real page at 200, 220 and
  240 (same page, light and dark; a proxy served the page with the constant replaced). On this workspace the three give the
  same breaks: the reference label in three lines with the qualifier ending the last one, `... assistants in [REST]` in two,
  the other captions (up to 40 characters) in one; the longest line of the reference label measures about 200 px, so the
  workspace does not tell them apart, and the choice rests on the boxes. Boxes are 150 to 280 px wide: 200 is narrower than
  the narrowest of them and would break captions of about 35 characters that read on one line at 220; 240 is the width of a box with
  a description and begins to spread across the gap between two sibling boxes. 220 is about forty characters, the width of the boxes
  the label sits between, and keeps the common captions (`uses [REST]`, `reaches the Shop with [https]`) on one line.
- **D3. Centred, one click target.** One `<text class="dg-label">` as before, centred on `label.x + label.width / 2`; a caption
  of several lines holds one `<tspan x y>` per line (absolute `x` and `y`, no `dy`), the first baseline where the single line
  sat (`label.y + 12`), then 13 px each. A caption of one line is the markup it always was, byte for byte (no `<tspan>`). The
  `data-from/data-to/data-nth/data-action` attributes stay on the `<text>`, so `select-link`, the `.dg-link-selected` toggle and
  the highlight handlers, which query `.dg-label` by attribute, needed no change (checked on the page: selecting by a click on the
  label, the dim state, the `dg-on` class).
- **D4. The tooltip and the accessible name stay whole.** The `aria-label` and the `<title>` of the link group are unchanged
  (the whole caption). A caption of several lines also carries `<title>` with the tooltip of its link, so that hovering the label
  says all of it (the `textContent` of a text split in `<tspan>`s has no spaces between lines, so the title is what carries the
  whole caption). A one-line caption has none, as before.
- **D5. A word wider than a line is cut with an ellipsis**, in place, not spread over lines (as `diagramTruncate` does for names).
  `diagramWrapText` hard-cuts a long word over several lines, which is right for a name that Wrap spreads but not what the row
  asks for here: each word is first fitted to one line (`fit`), then the text is wrapped.
- **D6. The qualifiers are never what is cut.** They are laid out first, as one block (`[a, b]`, fitted, wrapped to at most two
  lines under the cap): if they fit on the last line of the label they end it, otherwise they take their own line(s) and the
  label gives way (re-wrapped with the lines that are left). Without Wrap the cap is four lines in all, the end of the label
  being replaced by an ellipsis; the tooltip has it whole.
- **D7. The Wrap toggle does not switch the soft wrap off; it lifts the line cap.** Wrap is off by default, and its meaning is
  "show names, qualifiers and descriptions in full instead of cutting them"; making the soft wrap depend on it would make the
  default the unwrapped one, which is the defect, and the user asked for a soft wrap that is on by default. So the captions are
  broken whatever Wrap is, and Wrap, which already lifts the three-line cap of descriptions, lifts the four-line cap of captions
  (nothing is cut then). The tooltips of the *Wrap* button (the tool and the check box of the view editor) and the manual say so.
  There is no way to get one long line back: that is the point of the change.
- **D8. Unchanged:** where the captions are shown (`shows.labels`: true in Elements, false on the Map; off draws no label and
  lays none out), the CSS (`.dg-label`, in the page and in the export, 11 px: the line height of 13 is that of the 11 px text; the
  `tspan`s inherit the fill, stroke and weight), the export (it clones the SVG, so the lines and the `<title>` come with it;
  `data-action` and the selected class are removed as before), runs 0031 and 0032 (the derived outline in `styleLookOf` was not
  touched).
- **D9. The CLI is not changed.** Its PlantUML views wrap at `wrapWidth 200` (`StyleRenderer`). Rendered for the same relationship
  (see below), the CLI breaks the reference label in five lines of about 25 characters, the editor in three of about 40: the same
  idea, a narrower line in PlantUML, whose 200 are in its own units with a larger font. Said in the manual, not aligned: the row
  asks for 200 to 240 px in the editor, and the boxes of the editor are wider than the ones PlantUML draws.

## Looking at the real page

Method of runs 0030 and 0032: a **copy** of `<real-workspace>/as-is` in the scratchpad (the original was only
read: its 41 files have the same `md5sum` before and after), `./mvnw -o -DskipTests package` on JDK 25, `java -jar
target/quarkus-app/quarkus-run.jar editor serve --host=127.0.0.1 -p 48330 -w <copy>/workspace.yaml`. Nothing of the copy, of a
screenshot or of a label is in the repository; the tests use a synthetic label of 108 characters.

- The built-in browser pane was not used: its screenshot timed out in runs 0030 and 0032. The look rests on a **headless Firefox 157
  (snap) driven over WebDriver** (geckodriver, a small script of this run, a temporary profile), as in run 0032; theme set through
  the Settings key, element screenshots of `#diagram-canvas`. Every screenshot named here was opened and looked at. Firefox is not
  Chromium; the CSS is the same.
- The overview of `platform.web.frontend` holds the long relationship (the Elements overview of `staffer` does not: it
  only draws its link to the solution). **Before** (the maximum forced to 5000 px, which is one line): the label is a line of about
  450 px that starts under the Customer and runs across the gap to the Staffer. **After** (220): three lines centred on the
  link, between the boxes, the qualifier at the end of the third; the other captions are as they were, `manages offers and
  assistants in [REST]` on two lines. Measured on the page (`getBoundingClientRect`): no label overlaps a box or another label in
  that view, light or dark.
- **Selected link:** a click on the label selects the pair (the hash gets `link-from=staffer&link-to=platform.web.frontend`),
  the three lines take the accent and the bold weight and stay inside their width, the link is outlined. **Dim** (`highlightDiagram`
  on the label, then on the link): the label and its link are lit, every other caption and box is dimmed. Both in light and dark.
- **Wrap lit:** the same three lines (the caption fits within the four-line cap); a synthetic caption of 80 words gives 4 lines
  with an ellipsis and the qualifier on its own line without Wrap, 11 lines with it (`diagramLabelLayout` run in the page).
- **The export:** `diagramExportDocument()` on the page gave an SVG with 7 `<tspan>`s on the whole view, no `data-action`, no selected
  class; rendered alone (a `data:` SVG in the browser) the long caption is the three lines, centred in its gap, in the dark colours
  of the export. The PNG is drawn from that document (not run through the PNG button itself).
- **The CLI's PlantUML,** same workspace: `views generate` on a copy (927 `.puml`), `platform_web_frontend-overview.puml` rendered
  with a PlantUML jar found on the machine (an IntelliJ plugin's, JDK 21): see D9.

## Canonical impact

None to canonical documents: `docs/` holds the run and wave records only. The user-visible rule is in the manual
(`src/doc/README.adoc`, the *Labels* and *Wrap* items of the Show group), updated by this run; the paragraphs of W-1 and W-2 were
not touched.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Serve a copy of the baseline, look at the long caption before, light and dark | done |
| T2 | `diagramLabelLayout` and its constants; `buildElkGraph` (width and height) and `renderDiagramSvg` (tspans, title) | done |
| T3 | Maximum width chosen by looking (200, 220, 240); selected, dim, Wrap, export | done |
| T4 | Tests: `link-label-wrap.test.js` (short, reference, long, one long word, qualifiers, escaping, layout/drawing agreement, constants, CSS) | done |
| T5 | Check what the CLI draws, record it | done |
| T6 | Manual: *Labels* and *Wrap* | done |
| T7 | `./mvnw verify`, `node --test` | done |

## Acceptance criteria (the W-3 row)

- AC1. Tests on the generated markup and the layout input for a short, a long, a very long (the 108-character case with its qualifier)
  and a one-long-word label, with and without qualifiers, the qualifier not cut off the last line: `link-label-wrap.test.js` (eleven
  tests; with the maximum set to 5000 nine of them fail, checked, the other two guard what must not change).
- AC2. The export agrees: the lines and the title are in the cloned SVG; the CSS of the page and of the export both draw 11 px
  (tested), and the exported document was rendered and looked at.
- AC3. The real page on the user's baseline (copy): looked at, in a headless Firefox because the pane does not draw, which is a
  deviation from the letter of the row.
- AC4. The manual says it: yes.
- AC5. `node --test` passes: see Results.

## Review passes

Run inline (short document; no subagent dispatched).

- **KDMLLC.** K: one function, four constants, two call sites; D: the lines come from `diagramLabelLayout` for the layout and the
  drawing, the wrap and the measure are those of the boxes; M: short, reference, long, one long word, qualifier alone, many
  qualifiers, blank label, escaping, Wrap on and off, Labels off; L: no CSS changed, no new class or toggle, one-line captions
  keep their exact markup; U/C: the manual's sentences ("at most 220 pixels", "about forty characters", "at most four lines")
  were checked against the constants and the page.
- **C scan.** Claim "the handlers need no change" checked on the page (click on the label selects, the dim state lights it).
  Claim "the width of a one-line caption is as before" is **not** true and is stated: the width is now the measured text
  (`diagramMeasureText`) and not the estimate of 0.6 px per character and per px of font, which was wider than the text by
  about a fifth; the layout therefore reserves a little less room for a caption, which is what is drawn. Claim "the CLI
  agrees" checked by rendering, and found narrower (D9), not assumed. Claim "a caption never loses its qualifier" tested with
  a one-word label of 300 characters and with 30 qualifiers.
- **Open questions.** None left.

## Verification

All with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

### Results

- `node --test "src/test/javascript/**/*.test.js"`: 592 tests (581 before, plus the eleven of `link-label-wrap.test.js`), 592 pass,
  0 fail.
- `./mvnw -o verify`: BUILD SUCCESS, 121 tests, 0 failures, 0 errors (integration tests skipped by default, as in `pom.xml`).
- `cargo test` and `embed.sh --check`: not run, the Rust and the wasm were not touched.
- The original workspace: `md5sum` of its 41 files identical before and after; the editor server, the WebDriver servers and the
  proxies were stopped.

## Findings

- **For the wave.** The maximum width is 220 px (D2), four lines without Wrap, all lines with it. The Wrap toggle does not switch
  the soft wrap off (D7). The CLI needed nothing (D9). No file outside `likely_paths` was touched except this run's directory.
  The layout width of a one-line caption is now the measured text (C scan above): positions in ELK's answer move by a few pixels
  for every caption, with no test depending on it.
- **Not verified.** Chromium and Safari (Firefox only; `diagramMeasureText` is the browser's canvas, so the break points can differ
  by a word between browsers and fonts); the built-in browser (could not draw a screenshot); the PNG button itself (checked on the
  SVG it is drawn from); a caption in the Map view with the Labels toggle lit; a real user folder through the File System Access
  picker (served mode only); a bold (selected) caption wider than its measured regular text (the lines kept inside their width on
  the page, with a margin of 10 px).
- **Constraint for later runs.** Anything that draws or sizes a link caption must go through `diagramLabelLayout`, as the layout
  and the drawing do, and not recompute a width from the text.
