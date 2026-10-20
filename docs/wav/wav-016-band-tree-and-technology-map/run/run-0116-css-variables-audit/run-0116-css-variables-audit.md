---
type: run
run: 0116
status: completed
wave: 016
---

# Run 0116: Css variables audit

Wave 016 (`band-tree-and-technology-map`), item W-10 (phase P2). Focus: a static audit of the CSS of the page: no class uses a colour that is right in one theme only (#117)

Document profile: `single-document` (one new node test; the page is not changed; the review passes are answered below).

## Scope

In: `src/test/javascript/viewpoint-kernel/css-theme-audit.test.js` (new).

Out: the page (`standalone.html` is unchanged: the audit found no defect), the manual (W-12's), `CLAUDE.md` (it does not describe how the CSS of the page is checked, so there is no sentence to change), the script of the page and the dark highlight of the code editor (the `<head>`'s list of literal colours, used only when the theme is dark), which are not in the `<style>`.

## What was found before any change

- The `<style>` (lines 16 to 925) defines 17 colour variables on bare `:root` and redefines 15 of them (every one that is a colour of text, line or fill; `--header-h` and the grounds apart) in two dark blocks: `@media (prefers-color-scheme: dark)` on `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]`. `theme.test.js` already checks that the two blocks say the same.
- Outside those blocks the stylesheet writes no `#hex`, no `rgb(` that is not black at some opacity, no colour name other than `transparent` and `currentColor`: seven shadows and the veil behind a dialog, all `rgba(0, 0, 0, a)`.
- Every `var(--x)` is defined on bare `:root`, has a fallback, is set by a rule (`--row-bg`, `--st-*` on `.map-scope-row` and the look of a stereotype) or is written by the script (`--ov-text`; `--depth` and `--level` have fallbacks).

## Decisions

- **D1. One function, `auditPage(html)`, returns the problems as sentences.** The test of the real page asserts it returns none; the tests of the mutations assert it returns the sentence they expect. An audit that cannot fail checks nothing, so half of the file is copies of the page built in memory (`mutated`, string replacement that must hit exactly once) where a class of wave 015 or 016 (`.band-mistakes`, `.band-flag`, `.changes-position`, `.changes-message`, `.app-dialog-error`, `.timeline-drawn`) gets `#b00020`, `red`, `rgb(...)`, `hsl(...)`, `royalblue`; where a variable is misspelt, defined by a dark block only, missing from one of the two dark blocks, or given a different value there; where a colour is left as the light value for both dark themes (`--accent`, 3.08:1 on the dark ground) or a dark value does not read; where a rule sits under `prefers-color-scheme` of its own.
- **D2. What "would not read on a dark ground" means.** A colour variable not redefined by the dark blocks must reach 4.5:1 on both dark grounds (none does today, so all are redefined); every colour variable reaches 3:1 on both grounds of both themes (4.5:1 for the ones that are text: `--fg`, `--muted`, `--danger`, `--accent`, `--chg-removed-text`); `--on-accent` on `--accent` and on `--danger`, `--on-modified` on `--modified`: 4.5:1 in both themes. `--bg`, `--panel-bg` (the grounds) and `--border` are exempt, and the exemption says why (a hairline is 1.5:1 on white, under the 3:1 of WCAG 1.4.11 for a control's boundary: a choice of the page since its first version, written down here, not changed).
- **D3. The allowed literals are two entries**, each with its reason and each checked to be still used: black at some opacity in `box-shadow` and `filter` (a shadow), and the veil `background` of `.app-dialog-backdrop` (it dims whichever ground there is). Any other form, any other colour of shadow, is reported.
- **D4. The classes of waves 015 and 016 are a list in the test** (`CLASSES_OF_WAVES_015_AND_016`, 34 entries): the band (`plateau-band`, `band-field`, `band-mistakes`, `band-flag`, `band-readonly`, `band-writing`, `band-errors`), the page Plateaus (`timeline-*`), the Changes panel and the walk buttons (`changes-*`), the dialogs including the rename dialog (`app-dialog*`, `layer-confirm-list`, `muted`, `btn-primary`), the story picker box (`app-dialog-choice`, `app-dialog-plateaus`, `app-dialog-plateaus-note`, `settings-help`), the map-parts toolbar (`button-group`, `diagram-tools` and its lit button) and the field *Current plateau* (`inline-error`). For each: a rule names it, the page still writes it, and the variables it must draw with are still the ones it draws with. The audit itself covers every rule, not only these; the list is there so that a renamed or dropped class is noticed and the run can say which classes it looked at.
- **D5. Scope of the text read:** the `<style>` only. Inline styles written by the script (a grep found none with a literal colour) and the dark highlight of the code editor are said, in the header of the test, not to be covered.

## Tasks

- [x] T1. Read the issue, the plan and the `<style>`; list every colour, every `var()` and every definition.
- [x] T2. `css-theme-audit.test.js`: parser (nested at-rules, declarations), literal finder, the audit, the real page, the classes, the mutations.
- [x] T3. Review pass (below), the holes it found closed with a test each.
- [x] T4. Gate, this document, one commit.

## Canonical impact

None to the model, the kernel or the shared contracts: a test of the page's stylesheet. `CLAUDE.md` does not say how the CSS is checked, so it is left alone.

## Shipped files

None.

## Defects the audit found in the page

None. The audit passes on the unchanged page; `standalone.html` is not in the commit. Every colour of every class of waves 015 and 016 is a variable that both dark blocks redefine, or one of the shadows and the veil of the list. This is what the stylesheet says; it is not a statement that the dark theme looks right (#29: see below).

## Review pass, answered

A `general-purpose` sub-agent at the standard tier (Sonnet, medium), read-only, given the test and the page and asked for holes, each confirmed by running the audit on a modified copy. It found four S1 holes, five S2 and some nits. All the S1 and S2 ones are fixed, each with a mutation in the last test of the file:

- S1 a colour name in a `var()` fallback (`var(--x, red)`) was removed before the scan: the fallback is now scanned. Functions and property names were case-sensitive (`RGB(`, `COLOR: red`): case-insensitive now. Everything in `@keyframes`, `@property`, `@scope`, `@starting-style` was skipped: the first three kinds are flattened or scanned. Native CSS nesting (`&:hover { color: red }`) was read as a declaration: a nested rule is now a problem, the stylesheet must be flat.
- S2 a colour variable written as `rgb(...)` or `hsl(...)` made the contrast checks vacuous: told, with the grounds required to be readable in both themes. `--accent` is text as well as a ground (4.5:1) and `--on-accent` sits on `--danger` too: both added. The escape hatch for variables "set by the script" matched any name in the page: it is now one explicit entry (`--ov-text`) with its reason, which must still be used. A second `:root` rule is a problem. A `data:` URL (an image with colours of its own) is a problem. A selector with `dark` or `.light` is a problem even when it holds no literal.
- S3 kept: the allowed shadows now accept `rgba(0,0,0,.3)` and `rgb(0 0 0 / 30%)` alike; `-webkit-text-fill-color`, `mask`, `border-image`, `initial-value` are colour properties; the class list matches words and the class's own rule (last compound of the selector), with `within` for the lit button of `.diagram-tools`. Not done: a `}` inside a quoted `content` would cut a rule (the page has none); the text on a `color-mix(...)` tint (`.nav-row.active`) is not computed (the header says it is a computation, not an impression).

KDMLLC read and C scan, mine: the brief says "defined on bare `:root`, and redefined by both dark blocks when the light value would not read" and the audit says the same in D2; "no literal colour outside a short list, each entry with its reason" is `ALLOWED_LITERALS`; "fails on a copy of the page where a class of wave 015 gets a literal colour (the test says so)" is the second test after the real page, whose title and comment say the copies are built in memory. The issue says `rgb(` and named colours too: both are in the finder, with the cases in a test of their own.

## Verification

Run by me on the tree as committed (JDK 25):

| Command | Result |
|---|---|
| `node --test "src/test/javascript/**/*.test.js"` | 1890 tests, 0 failures (11 of them the new file) |
| `npx prettier --check "src/**/*.java"` | clean |

`./mvnw verify` was not run: the page and the Java are unchanged (only a node test and this document are added).

Fail before, pass after: the audit on the page passes; on a copy with a literal colour in a class of wave 015 (six of them), a misspelt variable, a variable one dark block lacks, a dark value that does not read, a rule under `prefers-color-scheme`, it fails with the sentence that names the class or the variable.

## Not verified

- **The dark theme was never seen** (#29 stays open): nothing here looks at the page on a real dark screen, a contrast number is a computation, the text on tinted backgrounds and the look of the diagram in dark are not computed. The audit says a class is not right in one theme only; it does not say it is beautiful in both.
- The script's inline styles and the highlight of the code editor (outside the `<style>`).

## Findings

- **F1 (W-12).** Nothing in the manual changes for this run. If the wave's findings list the checks that the page has, `css-theme-audit.test.js` is the one for the theme: a new class must draw with variables, a new colour variable must be defined on `:root` and in both dark blocks.
- **F2.** The page has a stylesheet of 900 lines in one `<style>`; the audit reads it with a small parser of its own (rules, nested at-rules, declarations) and refuses native CSS nesting. If a later run moves the page to nested CSS, the parser is the thing to change, not the rule.
- **F3.** `--border` is 1.5:1 on white, so the outline of a text input or a button is under the WCAG 1.4.11 bar of 3:1. It was the page's choice from its first version and the audit says so next to the exemption; if the author wants it changed, it is one variable in three places and the audit does not need to change.
- **F4.** The commit says `Refs #117`; the issue closes with the wave's pull request.
