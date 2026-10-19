---
type: run
run: 0098
status: completed
wave: 015
---

# Run 0098: Files grouped by plateau

Wave 015 (`editor-reshape-and-loose-ends`), item W-10 (phase P1). Focus: the page Files shows every file, grouped by plateau, folded and unfolded as the author wishes (#101).

Document profile: `single-document`, as runs 0089 to 0097: the scope is settled by the plan (the W-10 row, the third criterion of P1), by #101 and by the decisions of the author of 2026-10-18 that the brief repeats; there is no PRD, TDD or pln. The review passes (a read of this document against the code, the open questions, the C scan, a read-only review of the diff by a sub-agent) are answered below.

## Scope

In: the Files page of `standalone.html` (`renderFilesNavHtml` and what it calls), its CSS, the action cases, `CLAUDE.md` (the sentence on Files), the Files tests of `editor-structure.test.js`.

Out: the manual and the tutorial (W-18; what they must say is in Findings), `workspace.yaml` as a row of Files (it never was one), the stories and views joining the group of no plateau (W-12), the width of the stacked panel at 360 px (#82).

## Decisions

- **D1. Every file, always.** `filesScope`, `FILES_SCOPES`, `filesLayersOrNull`, `fileIsListed`, `renderFilesScopeHtml`, the case `set-files-scope`, the CSS of `.files-scope` and of `.plateau-badge` are deleted. The list is `AppState.manifestFiles`, whatever plateau is drawn; a file of a sibling plateau is listed.
- **D2. Groups come from `filePlateauOf`.** `filesGroupOf(mf)` is `plateau:<id>`, or `none` when `filePlateauOf` is null. `filesGroups` orders them: the plateaus in the order of the tree (`plateauTree.ids`: the root, then each plateau under the one it overrides), a plateau the tree does not know (it refused the tree) after them by code point, `none` last; an empty group is not listed (the root with no file of its own has no heading). The row has no plateau badge any more: the heading of the group says it, once.
- **D3. The group of no plateau is generic.** It holds whatever `filePlateauOf` says is null. Today that is a file the editor could not read (a parse error). `workspace.yaml` is **not** a row of Files (the page lists `manifestFiles`; the workspace file is Settings), so the brief's "such as `workspace.yaml`" does not apply today and nothing was added for it; the stories and views of `workspace.yaml` are entries, not files. When W-12 unties stories and views from plateaus, a manifest of kind story or view will return null from `filePlateauOf` (or be given the group by `filesGroupOf`) and land in `none` with no change to the page. Label *No plateau*.
- **D4. A workspace with no plateau keeps the flat list**, with no heading and no fold (a heading *baseline* over a workspace that has no plateau would say something that is not true). The test that pinned it stays, reworded.
- **D5. A group folds and unfolds.** The heading is the heading of a branch of the trees (`.tree-branch-header`, `.tree-branch-title[role=button][aria-expanded]`), so the keyboard (Enter and Space, `handleActivateKeydown`) and the focus kept across a render (`plainControlFocusOf`, through `data-branch="files:<key>"`) work as for the trees. The heading says the plateau, its name and the count of its files, also when folded. *Fold all* and *Unfold all* are two icon buttons in the heading *Files*, as in the trees. Unfolded to begin with: nothing the author did not fold is hidden.
- **D6. The folds are the session's.** `filesFolded` (a set of group keys) is module state, never written in the workspace and no file is dirtied by it. It survives drawing another plateau, visiting another page, and a reload of the same folder (`loadWorkspace` keeps it while the folder handle is the same; another folder starts again). The three actions are not in `ACTIONS_LEAVING_THE_FORM`: folding a group does not discard what was typed in a form.
- **D7. Opening a file unfolds its group**, however it is opened (a row, an address `#/files?ref=`, a link of the duplicate list): `unfoldGroupOfOpenFile` runs when the list is written and unfolds the group the first time it sees *this file in this group* (`filesSelectionSeen`). A fold the author then makes on that group is kept, so the author is never fighting the page; the file is still open in the centre. A file whose header is edited into another plateau is seen as a new pair, and its new group is unfolded.
- **D8. `filePlateauFolderWarning` is unchanged**: the *folder* badge on the row, the count (*N files sit in the folder of another plateau.*, now a note above the groups) and the warning on the page of the file.

## Tasks

- [x] T1. Read the plan row, the third criterion of P1, #101, run 0081's D6 and tests, the list, `filePlateauOf`, the tree folding code, the keyboard and focus code, the list of actions that leave a form.
- [x] T2. The page: groups, folds, the three actions, the reset on another folder, the CSS; delete the scope feature.
- [x] T3. Tests: the three tests of the scope are replaced by five (every file listed whatever is drawn, folds, open file unfolds its group, the group of no plateau, a refused tree), two kept tests lose the scope click; three more came with the review (F4); the five main ones fail on the old page (7 of 55 failed on `HEAD`'s page before the review's three).
- [x] T4. Look at the page in the built-in browser at 1280 and 360 px.
- [x] T5. `CLAUDE.md`, the review pass, the gate commands, one commit.

## Measures

Built-in browser, `archicode editor serve` on a copy of `src/test/resources/brightcart/layered` (4 plateaus, 50 files: baseline 17, inhouse 12, marketplace 17, saas 4), the jar built from the working tree.

- 1280 px: `document.documentElement.scrollWidth` 1280. Four headings, each 35 px high, 240 px wide in a 256 px panel, in the order baseline, inhouse, marketplace, saas, with counts 17, 12, 17, 4. A click on the first heading folded it (0 rows, the others unchanged). A click on a row of `inhouse` opened it. *Fold all* gave 0 rows everywhere; an address `#/files?ref=marketplace/plateau.yaml` then unfolded `marketplace` alone (17 rows, the file `active`), the others stayed folded; Enter on the keyboard-focused heading of `saas` unfolded it (4 rows) and the focus stayed on that heading.
- 360 px: `scrollWidth` 360 of 360, the headings 360 px wide and 35 px high, no row overflows its width (`scrollWidth` > `clientWidth` on none). Stacked, the list panel is 205 to 222 px high (30 vh of the stacked layout, #82): unfolded it scrolls inside itself; with *Fold all* the whole list (four headings) is 205 px and fits with no scroll. That is what folding is for on a narrow window.
- Looked at on screenshots: the page at 1280 px unfolded with a file open (the headings, the names and counts, the folded group rows hidden, the open file highlighted inside its unfolded group), the page at 360 px unfolded and folded (headings with names and counts, tools at the right).
- Not looked at: the dark theme (the heading uses the variables of the trees; the new classes only use `--muted`), a real phone, a workspace with a refused tree in the browser (a test covers it), a workspace with a file with a parse error in the browser (a test covers the group; the heading *No plateau* was not looked at).
- Seen, not changed: a file name is cut on the right by an ellipsis, so with a long folder prefix the interesting part is not visible at 256 px (it was so before this run: the path in the row is `relPath`). The panel is resizable, and the full path is the title of the page of the file.

## Review pass

- KDMLLC read of this document: the decisions are one each and the table-less list is short enough; D3 says plainly that `workspace.yaml` is not a row, against the brief.
- Open questions: none left. The ones the brief did not settle were settled here: unfolded by default (D5), the order of the groups (D2), the flat list for a workspace without plateaus (D4), what a fold of the open file's group does (D7).
- C scan against the code: every function named above exists (`filesGroupOf`, `filesGroups`, `filesAreGrouped`, `unfoldGroupOfOpenFile`, `renderFilesGroupHtml`, `renderFileRowHtml`, `renderFilesToolsHtml`, `filesFolded`, `filesFoldsOwner`, `filesSelectionSeen`); `git grep -n -E "filesScope|FILES_SCOPES|set-files-scope" -- src/main src/test` finds nothing.
- Sub-agent review of the diff (read-only): see Findings.

## Canonical impact

None to the architecture or the domain: this run changes how the page lists files, not what a file is, how a plateau is read or written, or any contract of the tools. No file the command line reads or writes changed; a check of the command line against a jar built from `git archive 25471b3` is not needed (the page only). No file or example is shipped by this run, so there is no new case to load in both tools.

## Findings

- F1. The brief's group of "files with no plateau, such as `workspace.yaml`": `workspace.yaml` is not listed on Files. The group exists, is generic and holds the unreadable files today (D3).
- F2. For W-12: a story or a view as a manifest has a plateau only through its header (`filePlateauOf` returns `plateauOfManifest`); when W-12 removes the plateau of a story or a view, it decides there whether `filePlateauOf` returns null for them (they then land in `none`, which needs nothing from the page) or whether `filesGroupOf` maps the kinds. The test "the files that belong to no plateau are a group of their own" pins the group by `filePlateauOf` null.
- F3. For W-18, the manual (`src/doc/README.adoc` line 1485, *What the list shows*) must stop saying *This plateau*, *With its past*, *All files* and say: Files lists every file of the workspace; with plateaus the files are in a group per plateau (the root first, then each plateau under the one it overrides), with the name of the plateau and the number of its files; a click on the heading folds and unfolds the group, and *Fold all* / *Unfold all* do all of them; opening a file unfolds its group; the folds are kept while the editor stays open on the folder and are not written in the workspace; the files that belong to no plateau (a file the editor could not read) are in the group *No plateau*, last; a workspace without plateaus lists its files with no groups; a file whose header says another plateau than the name of its folder carries a *folder* badge and a count above the list. The tutorial: any step that tells the reader to choose *This plateau* or *All files* on Files.
- F4. The read-only review of the diff by a sub-agent found three things, all fixed, each with a test that fails without the fix: (a) opening the same file again after leaving the page did not unfold its group (the marker of D7 is now cleared by `render()` whenever the selection is not a file; test "opening the same file again, after the page has been left, unfolds its group again"); (b) a folded group hid the *error*, *duplicate* and *modified* badges of its rows, so the heading of a folded group now carries *error* and *modified* when one of its files has it (test "a folded group still says ..."); (c) a dead selector `.files-scope button` in `headerControlSelector`. It also noted that no test pinned the reset of the folds for another folder: added ("the folds belong to one folder"). It found nothing stuck, no unescaped text and no leftover reference to the removed code.
