---
type: run
run: 0195
status: completed
profile: TDD+pln
wave: 026
---

# Run 0195 landing-name-field

Run of wave 026 (relationship view), manifest id W-1.

Review pass: dispatched. The Stage 5 review of the TDD and the Stage 9 consistency check were done by leaf agents in fresh contexts, and every task was independently verified (see the prg).

## Verification

Stage 11, 2026-10-28, read back from the files and rerun here: the unfixed page (HEAD) makes the new test fail at 1280 and 360 px with a field 160 px high (section Red), the fixed page passes in chromium, firefox and webkit (section Checks, 9 passed), `editor:check` exits 0 with 99 upward pairs (max 99), lint and format:check exit 0, `test:unit` has one failure, the HEAD comparison of the uncommitted page, named in Checks; the look at 1280 and 360 px is in section Look; `docs/bkg` and `tooling/docs/check-backlog.py` do not exist in this repository, so the backlog sweep is vacuous; the TDD has no `DEF-n`, `CI-arc-n` or `CI-dom-n` item.

## Red

Stage 11 re-ran the new test in chromium on the page of HEAD (unfixed `style.css`), then restored the fixed page (`editor:check` exit 0): it fails at 1280 px and at 360 px with `New workspace: the field is 160 px high, at most 36.08`, the 10rem fault of ASM-1.

## Checks

Run on the uncommitted change (task-003, no commit made).

- `npx playwright test src/test/e2e/browser-workspace.spec.js --project=chromium --project=firefox --project=webkit`: exit 0, `9 passed (16.3s)` (the existing test and the field measurement at 1280 px and 360 px, in each engine).
- `npm run lint`: exit 0.
- `npm run format:check`: exit 0, `All matched files use Prettier code style!`.
- `npm run editor:check`: exit 0, `upward pairs: 99 (max 99)`; `ratchet.max` in `src/main/editor/layers.json` is 99.
- `npm run test:unit`: exit 1, `pass 3079`, `fail 1`, `skipped 1`. The one failure is `check-editor-statements.test.js:276`, "the real page: --statements HEAD passes": `the page differs from HEAD at line 152, produced by style.css:133`. It fails only because the change to `style.css` and `standalone.html` is uncommitted; it compares the page with `HEAD`. It passes once the change is committed (commit left to the operator).

## Look

Done by task-004 on the uncommitted change, with the built page (`standalone.html` after the fix). The page was served by the hosted-style server of the e2e harness (`startHostedPage` from `src/test/e2e/harness.js`, run as a background Node process on `127.0.0.1`, no JVM) and opened in the Browser pane. The widths were set with the pane's viewport: 1280 x 800 and a custom 360 x 800 (not the `mobile` preset, which is 375 px and emulates an Android device). Measurements are read from the page with `getBoundingClientRect` and `getComputedStyle`, and the screenshots were read as they were.

At 1280 px, the card _Open a workspace_ with *New workspace in this browser* pressed: the name field is one line, 31 px high (line-height 19.2 px, padding and border), 213 px wide, and the buttons *Create* and *Cancel* sit on the same row to its right. The label stays above the field.

At 1280 px, *Rename* on the browser workspace _Untitled workspace_ (listed under _In this browser_ with *Rename*, *Export*, *Delete*): the rename field is one line, 31 px high, 166 px wide, in a list row 390 px wide, with *Rename* and *Cancel* beside it. The field does not fill the row: its width is the label's basis in the auto-sized form, which is what the plan's gap-002 expected.

At 360 px, *New workspace in this browser*: the field is one line, 31 px high, 181 px wide (from x 45 to x 226 px); *Create* sits on the row at the right (x 234 to 315), *Cancel* wraps to its own row under the field. Both buttons are reachable. The document does not scroll sideways (`scrollWidth` 360, equal to the width). The *New workspace in this browser* button wraps to two lines, which is what ASM-3 and DEC-4 allow.

At 360 px, *Rename*: the field is one line, 31 px high, 169 px wide (right edge 214 px, inside the card), *Rename* at x 222 to 315 and *Cancel* on its own row below. The document does not scroll sideways (`scrollWidth` 360).

Outside the card, not in the scope of #177: at 360 px the editor page after a workspace opens (the top bar of _Timeline_ with *Workspace* and *Close workspace*) is wider than the screen; the document is 572 px wide, so the top bar scrolls sideways. This is the editor's top bar, not the landing card, and no change is made here; it is for a separate issue if it is wanted.

Documentation: `grep -rn "landing-browser" CLAUDE.md src/doc docs` finds the field's CSS class only in the wave and run documents, not in the manual or in CLAUDE.md. The manual's paragraph _A workspace kept in the browser_ (`src/doc/README.adoc`, the section "A workspace kept in the browser") names the card's buttons and says that a name is 1 to 80 characters and unique; it says nothing about the size or the layout of the field, so no sentence describes it and no documentation was changed.

Files outside likely_paths: src/doc/README.adoc (the fold recipe of the wave, not this run's change; found modified in the tree)
