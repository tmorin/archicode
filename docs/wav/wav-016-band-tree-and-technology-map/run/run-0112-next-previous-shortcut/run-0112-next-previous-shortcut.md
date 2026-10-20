---
type: run
run: 0112
status: completed
wave: 016
---

# Run 0112: Next previous shortcut

Wave 016 (`band-tree-and-technology-map`), item W-6 (phase P1). Focus: a keyboard shortcut for *Next change* and *Previous change*, and the detail of the current change inside the Changes tab (#113)

Document profile: `single-document`, as runs 0089 to 0111: the scope is settled by #113 and by the plan decision T5 (do all of it, the look it waited for is done). No PRD, TDD or pln. The review passes (KDMLLC read of this document, the open questions, the C scan against the code, a read-only review of the working tree) are answered below.

## Scope

In: `standalone.html` (a document-level key handler, the detail of the current change under the walk buttons, the titles of the two buttons, the CSS of the detail), one node test file, `CLAUDE.md`.

Out: the manual (W-12's: lines listed in the findings), the Java main code and the kernel (none touched), the third bullet of #113 (a click on the Changes list on Stories opens Elements when no view is drawn: it is the described existing behaviour, see D8).

## What was found before any change

- Keys that exist (`grep keydown`): on the document in capture, Escape for the help (`handleHelpKeydown`), for the menu of the header (`handleHeaderMenuKeydown`) and for the dialog, plus Enter and Tab inside the dialog (`handleAppDialogKeydown`); on `#app`, the diagram (`handleDiagramKeydown`, only inside `.diagram-stage`: arrows, Home, End, Enter, Space, `+` `=` `-` `0`, `f`, `c`, `m`, Escape), the tree (`handleNavKeydown`, only on a tree row: arrows, Home, End, Enter, Space, `p`, `h`) and the non-native controls (`handleActivateKeydown`: Enter, Space). The page has no list of shortcuts of its own: the help menu links to the manual's section *Keyboard shortcuts* (`docUrl('keyboard')`), which is W-12's.
- Typing surfaces: `input`, `textarea`, `select`, the CodeMirror editors (the text editor of Files, `.raw-yaml`, and the JSON/YAML editors of the forms: `.cm-editor`, whose `.cm-content` is `contenteditable`).
- Dialogs: `appDialog` (every dialog of the page, `role="dialog" aria-modal`), the help menu (`helpOpen`) and the menu of the header (`headerMenuOpen`).
- The "What changed" block: `renderWhatChangedHtml(layer, reference, removedPanel)` for an element, `renderChangedRelationshipHtml` for a relationship; both read the comparison only.
- Where the walk goes today: `walkChange` -> `goToChange` -> `selectChange({ keepList })` on a page that shows a selection (the Changes tab stays; the *Selected* tab is one click away), or only the mark (`changesWalk`) on Plateaus and on a story with no view drawn, where nothing shows what the change is.

## Decisions

- **D1. The keys are `j` (next change) and `k` (previous change).** They clash with nothing: the diagram uses `f c m` and the tree `p h`, and both only act on their own element. `n` / `p` was the mnemonic choice, rejected: `p` pins on a tree row, and a document-level `p` would fire both. No bracket or punctuation: on an AZERTY keyboard (the author's) `[`, `]` need AltGr, which the browser reports as Ctrl+Alt. `j` and `k` are on every layout, and are the pair of the web's lists (GitHub, Gmail). A Caps Lock `J` / `K` works; Shift, Ctrl, Alt and Meta leave the key alone, so none of the browser's own shortcuts is touched.
- **D2. One handler on the document, in the bubbling phase** (`handleChangesKeydown`), after the handlers of the dialog, the help and the header menu (capture) and of the diagram and the tree. It does nothing when: a modifier is held; the event is already prevented or composing; the event target or the focused element is an `input`, `textarea`, `select`, a `contenteditable`, a `role=textbox/searchbox/combobox` or inside a `.cm-editor`; a dialog, the help or the header menu is open (`appDialog`, `helpOpen`, `headerMenuOpen`); a rejected YAML text is waiting (`rawYamlEditDraft`: a selection made by a key would drop it); no Changes list is on the page (`changesListIsOnPage`: a comparison that can be listed, not pending, the diagram not maximized except on Plateaus, and a page that has the list: Plateaus, Applications, Environments, Elements, Stories). A held key is not ignored: each repeat is one step of the walk.
- **D3. It is the walk of the buttons**, `walkChange(direction, { keepFocus })`: the same order, the same filters, the same end stops, the same selection. It never writes the address itself (what the selection writes there is what a click on the button writes: the test compares the two). The list may be one tab away: on a page whose right panel shows *Selected* (or *View* on Stories) the key walks and brings the Changes tab back, as the walk of the button does (review S2: kept on purpose, the key has no other use, and it lets a walk start from the keyboard without first finding the tab).
- **D4. The focus.** A walk made with the buttons gives the focus to the button that is still useful (`pendingFocusSelector`). The shortcut gives it to no control when the focus was not in the Changes panel: a reader walking from a diagram box, a tree row or a header control keeps it where the redraw keeps it (`render()` restores those), and is not moved to a button; from elsewhere it falls to the page, as after any redraw. When the focus was on a control of the panel the walk is the button's.
- **D5. The shortcut is told where the page tells its tools**: the `title` of the two buttons (`... (shortcut: J)`, `(K)`), and the `aria-keyshortcuts` attribute (`j`, `k`). The page has no list of shortcuts of its own (the help links to the manual): W-12 writes the line in the manual's *Keyboard shortcuts*.
- **D6. The detail of the current change** (`renderCurrentChangeDetailHtml`): under the buttons, in `renderChangesPanelHtml`, the "What changed" block of the change the walk is at, for the five pages that have the list. An element: `renderWhatChangedHtml(layer, reference, false)`, the function of the inspection, unchanged. A relationship: one `what-changed` section, its state and its line (`renderChangedRelationshipHtml(..., true)`), the same line the inspection of an element lists, with the source. The reader's "where" is `currentChangeOf`, so a click on a row and a selection made by hand have the detail too. It is shown only for a change that is shown (a filter that leaves it out moves the walk to the nearest one, D8 of run 0103; nothing shown, no detail). It is view state: nothing calls `modelsChanged()`, no cache is keyed on it.
- **D7. The two limits of #113 go.** On Plateaus and on a story with no view drawn *Next change* now shows what the change is, in place; on a page that shows a selection the reader sees the change under the buttons without leaving the Changes tab, and the *Selected* tab is still there and one click away (the strip is untouched; the test clicks it).
- **D8. The third bullet of #113 stays as described.** A click on a row of the list on Stories with no view drawn still opens the thing in Elements, as on Plateaus; the detail does not change what a click does (a click is `select-change` without `keepList`; nothing in it reads the detail).

## Tasks

- [x] T1. Read #113 (`gh api`, the `gh issue view` form fails on the deprecated Projects classic), run 0103, the code (`walkChange`, `goToChange`, `selectChange`, `currentChangeOf`, `renderChangesPanelHtml`, `renderWhatChangedHtml`, the key handlers).
- [x] T2. The detail: `renderCurrentChangeDetailHtml`, its place in the panel, one CSS line.
- [x] T3. The shortcut: `handleChangesKeydown`, `changesListIsOnPage`, `isTypingTarget`, the `keepFocus` option of `walkChange`, the titles and `aria-keyshortcuts` of the two buttons.
- [x] T4. Tests (`changes-shortcut.test.js`, 18 tests).
- [x] T5. `CLAUDE.md` (the sentence about the Changes list).
- [x] T6. Gate, review pass, this document, one commit.

## Canonical impact

None to the architecture model: no TDD, no `CI-arc` or `CI-dom` packet, and the repository declares no register for the editor's behaviour. The run adds a key and a block of view state to the editor's page: no domain invariant is added or moved (no manifest, model, kernel rule or command-line behaviour is touched, and the comparison, its cache and the filters are what they were). `CLAUDE.md` is the project's one description of the behaviour of the tools, and its sentence about the Changes list gains the key, its guards and the detail.

## Shipped files

No manifest, example or fixture is added: the tests read the layered Brightcart (loaded by the command line and the editor in the tests of runs 0108 to 0110). The one new file is a node test.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier (Sonnet, medium), read-only, on the working tree. No S1. Answers:

- S2, the key fires when the list is only one tab away (Selected / View showing): kept on purpose (D3), the function is named for it now (`changesListIsOnPage`) and the test that pins it stays.
- S2, widgets with a role that take letters: `[role="textbox"]`, `[role="searchbox"]` and `[role="combobox"]` added to the typing guard (the page has none today); a held key is not ignored (D2).
- S2, a test assertion that could not fail (`every(... || !row.selected)` with no row selected, or no row): replaced by the rows of both filters, their count and the row the walk ended on.
- S3, the absolute position was not asserted (keys and buttons could be wrong together): `position` is compared with `min(i + 1, total)` at every step of the walk, on four pages.
- S3, the comment that said the focus stays "where it was": softened (D4).
- S3, `renderWhatChangedHtml` returns '' for an element the union has no record of: the detail is then absent, as the inspection's block would be; not changed (the rows come from the same table as the records).
- S3, the `input`, `textarea` and `select` stubs of the test are caught by `tagName` as well as by the selector: only the contenteditable, code-editor and role stubs test the selector; kept (the three tags are the common case, the others are the ones the selector exists for).

KDMLLC read and C scan, mine: the brief says "list what exists": the first section of this document does, and `git grep -n "keydown" -- src/main/resources/editor-webapp/standalone.html` finds seven registrations, one of them new. The brief says the shortcut is told where the page tells its tools: the page has no list of shortcuts (the help links to the manual's *Keyboard shortcuts*), so the title and `aria-keyshortcuts` of the buttons are the only place (D5). The brief says "reuse the function that renders the What changed block": `renderCurrentChangeDetailHtml` calls `renderWhatChangedHtml` for an element (asserted by string inclusion on all 134 steps of two pairs) and the relationship line of the inspection (`renderChangedRelationshipHtml`) for a relationship, which has no block of its own. The brief says "the Selected tab stays reachable": the strip is unchanged and the test clicks it on Elements and the Map.

## Verification

Run by me, on the tree as committed (JDK 25, `PLANTUML_JAR` set, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify -DskipITs=false` | BUILD SUCCESS: 879 unit tests, 0 failures, 0 errors, 0 skipped; 18 integration tests, 0 failures |
| `node --test "src/test/javascript/**/*.test.js"` | 1847 tests, 1847 pass (0 fail); was 1829 before the run (+18 in `changes-shortcut.test.js`) |
| `npx prettier --check "src/**/*.java"` | clean |

`cargo test` and `embed.sh --check` were not run: no kernel file is touched, and no Java file either.

*Fail before, pass after*: the new tests cannot pass on the old page (`handleChangesKeydown`, `renderCurrentChangeDetailHtml` and the `aria-keyshortcuts` do not exist there); `reading-changes.test.js` and `changes-panel.test.js` pass unchanged. Mutations of the code the tests are about, each reverted (the file restored from a copy, compared with `cmp`): no typing guard; only the target looked at (not the focused element); Shift allowed; Ctrl allowed; the dialog ignored; the help ignored; the YAML draft ignored; the list not required; the focus always moved; the detail shown for a change a filter leaves out; the detail of an element written as the removed panel; `k` as next; a maximized diagram ignored: each fails at least one test (13 of 13; `k` as next fails 4).

## Not verified

- A real keyboard in a real browser: the keys were given to the page's own listener as event objects (`press`), the focus and the target as stubs; no key was pressed, no AZERTY keyboard, no input method, no screen reader (`aria-keyshortcuts` is written, not heard).
- A look at the page: the detail under the buttons (one CSS line, `.changes-detail`), the length of the block in a narrow panel, the scroll of the row into view with the block above the list (`scrollIntoView` is not run by the harness), the dark theme, 360 px.
- That the focus really stays on a diagram box or a tree row after a redraw (`render()` restores them for the keyboard handlers of those; the harness draws no page).
- The native image (the integration tests ran on the JVM jar).
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep: neither exists in this repository.

## Findings

- **F1 (W-12, the manual).** Lines to write in the section on the Changes panel / *Keyboard shortcuts* (anchor `editor-keyboard`): `J` next change, `K` previous change (the walk of the buttons: same order, same filters, stops at the ends); not active while typing in a field or an editor, while a dialog or menu is open, with Ctrl, Alt, Meta or Shift, and where no Changes list is on the page; from the Selected or View tab the key brings the Changes tab back; under the buttons the page now shows the *What changed* block of the change the walk is at (on Plateaus and on a story with no view drawn it is the only place that shows it; a click on a row there still opens Elements). Run 0103's F1 text (the page Plateaus "only moves the mark") is out of date: the manual must not say it.
- **F2.** The third bullet of #113 stays as described (a click on the list on Stories with no view drawn opens Elements, as on Plateaus); the detail does not change what a click does (a test pins both pages). If the author wants a click to mark the row and show the detail in place instead, that is a decision for a later issue; none is filed.
- **F3.** The Brightcart pairs give 37 to 69 changes (`saas`/`baseline` 37, `inhouse`/`baseline` 57, `marketplace`/`inhouse` 65, `inhouse`/`saas` 69), not hundreds; the walk is also covered on the 360 changes of `replaces-large-pair` by run 0103's test, unchanged. The six states are all walked across `inhouse`/`saas` and `marketplace`/`inhouse`.
- **F4.** `gh issue view 113` fails here (the deprecated Projects classic GraphQL field); `gh api repos/tmorin/archicode/issues/113` works.
- **F5.** Files touched outside the `likely_paths`: none (`standalone.html`, `CLAUDE.md`, one new node test in `src/test/javascript/viewpoint-kernel/`, this document). The wave's manifest and progress log are the orchestrator's and were not touched.
- **F6.** The commit says `Refs #113`; the issue closes with the wave's pull request. Issues filed: none.
