---
type: run
run: 0149
status: completed
profile: single-document
wave: 020
---

# Run 0149: story-step-menu

Wave 020, W-4. The bar over the diagram of a story gets a menu that shows any step directly, with the steps that cannot be drawn marked (GitHub issue tmorin/archicode#142, second request: *Show any step directly from a menu*; plan decision T7). W-5 builds the reading mode on the same menu, so it is a reusable piece. #142 is not closed by this run (the reading mode is W-5). No Java and no Rust change; the command line is not touched (T1).

Profile `single-document`: the change is one control, one handler and their tests in a page that already plays stories; a prd/tdd/pln would restate the wave's T7 and the issue. The review passes are answered below.

## Decisions

| # | decision | verdict |
|---|---|---|
| 1 | the control | a native `<select data-story-step-menu>` on the bar, after "Step n of N". Chosen over a disclosure list (button + list of buttons): the keys (arrows, type-ahead, Enter, Escape), the touch picker of a phone and screen readers come with it, with no state to keep (open/closed, focus trap, Escape, click outside) and no redraw while it is open. A disclosure would show the sentence of a refused step in full, wrapped; the cost is paid with the sentence in the text and the title of the entry (decision 4). The phone picker wraps long entries. |
| 2 | the piece W-5 reuses | `renderStoryStepMenuHtml(story, current, className)` renders the list (class is the caller's; default `story-step-menu`), `chooseStoryStep(storyId, index)` is the one handler, `storyStepTitle(step)` the title. `handleAppChange` routes `[data-story-step-menu]` to `chooseStoryStep` (the `change` event: a committed choice, as the list of Settings; the delegated listener is on `#app`, so any layout inside it works). The bar calls the renderer; the bar's CSS class `.story-step-menu` only gives the width. |
| 3 | titles (T7) | "n. title": the label of the view the step names (`viewLabel`, as the bar and the story editor say it), else the first words of its text (6 words, `…` after them, trailing punctuation dropped), else the label of the recipe the step carries (`viewLabel` of the step: the element and the viewpoint), else `Missing view “x”` / `No view`. A view that is gone does not hide what the step says. |
| 4 | the steps `stepProblem` refuses | the entry's text ends ` — cannot be shown: <sentence>` (read by a screen reader and shown in a phone picker) and the option carries the sentence as its `title`. The step on screen is `selected`; if it is refused, the bar already says it under the line ("Step n cannot be shown: ...") and keeps the way open. Choosing a refused step is walking onto it with Next (tested equal). |
| 5 | choosing | `chooseStoryStep` asks what Next asks when a form holds typed text (`confirmDiscardingDraft`; no puts the list back by a redraw and keeps the step), clears the notice and the removed step as every action does, then `goToStoryStep(storyId, index)`: the plateau and the comparison of the step are drawn by `drawPlateausOfStep` from `storyHome`, exactly as for Next. An answer that is not a step of the story (a value that is not a whole number in range, an unknown story) draws nothing. The list asks for the focus (`pendingFocusSelector`), so the keys go on working after the redraw. |
| 6 | cases that stay as they were | a story of **one step** has no menu (nothing to choose): its bar is byte for byte the bar of `archicode-0.18.0` (tested against the page of the tag); a story of several steps has the bar of the tag plus the list, nothing else (tested: the bar with the list taken out is the tag's, on four stories); an **empty story** and a story out of range have no bar (`renderStoryBarHtml` returns `''` as before); **the page of a story** (Stories, `renderStoryEditorHtml`) has no menu; the top bar, the band and the other pages are not touched. |
| 7 | 360 px | the list is `flex: 0 1 18rem; min-width: 0; max-width: 100%; box-sizing: border-box; text-overflow: ellipsis` in a line that already wraps (`.story-bar-line { flex-wrap: wrap }`): wide, it shares the row; at 360 px it is at most the width of the bar and drops to a row of its own. The harness has no layout engine: the rule is pinned as text (as `editor-at-360-px.test.js` does for the measures of #82), and the real width is for a human to look at (below). |
| 8 | what it never touches | view state only. Nothing is written (the files of the folder are byte for byte what they were, no file is marked modified, `.archicode.yaml` is not touched), no `modelsChanged()` for a story whose steps name no plateau (`modelVersion` and `AppState.index` unchanged; a step told at another plateau builds the model of that plateau exactly as Next does, which is not the menu's), no key of any cache, and no change to the address: `story=` and `step=` already carry the step, `currentRouteHash` is the one Next writes. |

## Review passes (the trio's, answered here)

- **KDMLLC.** KISS: one renderer, one handler, one title function; a native control. DRY: the problem sentences are `stepProblem`'s, the titles `viewLabel`'s, the draw is `goToStoryStep`, the question about a typed form is `confirmDiscardingDraft`; none is written twice. MECE: each entry is exactly one of (on screen, can be shown, cannot be shown); each case that stays as it was is listed in decision 6. LEAN: no option, no setting, no state, no new key in the address or the workspace. LUCID: the doc comments of the three functions say the rule; `CLAUDE.md` says it in one sentence. CONSISTENT: it uses the words of the bar ("cannot be shown") and the order of `story-prev`/`story-next`.
- **Open questions.** Select or disclosure: decided (1). Is the menu in the bar of a one-step story: no (6). Does the menu change the address: no (8). `change` or `input`: `change` (a committed choice; with the keys on a closed list some browsers fire both on every arrow, each a step drawn, which is what a reader moving by keys wants). Should the entry of the current step show "cannot be shown": yes, like the others (the bar says it too).
- **C scan against the repository.** Every place that plays a step goes through `goToStoryStep` (`story-play`, `story-prev`, `story-next`, `story-restore`, the new handler); `ACTIONS_LEAVING_THE_FORM` guards the first four by action name, and the menu has no `data-action`, so `chooseStoryStep` asks the same question itself. The story bar is drawn in the two places `renderDiagramView...` call `renderStoryBarHtml()` (lines `diagram-view`), both get the menu. `handleAppInput` does not see the list (no text field, not inside `.element-edition-form`, `.settings-view` or `.file-view`, so no draft is marked).
- **Canonical impact.** `CLAUDE.md` (one sentence added to the paragraph on the stories, about the editor playing them). The manual in W-6 (below). No `dom` packet, no `arc` item.

## Tasks

| id | task | status | verification |
|---|---|---|---|
| T-1 | `storyStepTitle`, `renderStoryStepMenuHtml`, `chooseStoryStep`, the call in `renderStoryBarHtml`, the branch in `handleAppChange`, the `.story-step-menu` rule | done | `story-step-menu.test.js` |
| T-2 | test file: per shipped story, the menu vs Next (plateau, comparison, view, counts, bar, address); titles; refused steps; the control; one step; draft question; nothing written; the address; the story page; the sheet; the bar against the page of the tag | done | `node --test` |
| T-3 | the tests fail on the page of `archicode-0.18.0` | done | below |
| T-4 | `CLAUDE.md` | done | one sentence |
| T-5 | the gate set on the final tree | done | below |

## Verification

- `node --test src/test/javascript/viewpoint-kernel/story-step-menu.test.js`: 18 tests pass. Per shipped story (`migration` of `domain_plateaus`, `fork_tour`, `order_journey`, `seller_journey` of the layered Brightcart, opened from a copy in memory): a first page plays step 1 and presses Next up to the last step, recording for each step the snapshot (story and step, plateau, comparison plateau and mode, the view definition drawn, the counts and number of changes of the comparison, the bar html, the address); a second page plays step 1 and then chooses the steps from the menu in the reverse order, then from the ends towards the middle; every snapshot is equal to the one Next gave. (The `ref=` of the address, the element selected, is dropped from the compare: no step sets it, so it is what an earlier step left, whichever road led there; the same on Next after a click. Pre-existing, not the menu's.)
- **Fail on the page of `archicode-0.18.0`** (`ARCHICODE_EDITOR_HTML=<git show archicode-0.18.0:...standalone.html>`): 12 of 18 fail (the four menu-vs-Next walks, the titles, the refused-step marks, the refused step chosen, the control, the answer that is not a step, the typed-form question, the address, the sheet rule); the 5 that pass on it pin what must not change (nothing written / no model changed in a walk, the story page has no menu) and are trivially true there, and one is skipped under the variable by design (the comparison against the page of the tag).
- **Against the page of the tag**: the bar of a story of one step is equal to the tag's; the bar of the stories `tour` (5 steps), `fork_tour` and `migration` is equal to the tag's once the list is taken out; the menu is there exactly where there are two steps or more.
- Gate set on the final tree, one at a time: `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest'`: 1347 unit tests (0 failures, 2 skipped), 27 integration tests (0 failures), BUILD SUCCESS; `cargo test`: 240 passed; `embed.sh --check`: the committed wasm is the one the sources build; `npx prettier --check "src/**/*.java"`: clean; `node --test "src/test/javascript/**/*.test.js"`: 2516 tests, 2516 passed (2498 + 18 new).
- **Not verified**: a real browser. The harness has no layout engine and no `<select>`; the page is run in Node. A human should open `archicode editor serve src/doc/examples/domain_plateaus` (and a copy of the layered Brightcart), start the story, and look at: the list on the bar (wide, and with the window at 360 px: no horizontal scroll of the page, the list on a row of its own); the keys on the list (open with Space or Alt+Down, arrows, Enter; the focus stays on the list after the step is drawn); a step that cannot be shown in the dropdown (delete an element a step names in a copy of the workspace: the entry says why, the option has a tooltip); the touch picker on a phone. The Native job (no resource or reflection config changed) and the real File System Access path are not exercised.

## What changed

- `src/main/resources/editor-webapp/standalone.html`: `STORY_MENU_WORDS`, `storyStepTitle`, `renderStoryStepMenuHtml`, `chooseStoryStep` (new, before `renderStoryBarHtml`); the call in `renderStoryBarHtml`; the first branch of `handleAppChange`; the rule `.story-step-menu`.
- Tests: `src/test/javascript/viewpoint-kernel/story-step-menu.test.js` (new).
- `CLAUDE.md`: one sentence in the stories paragraph.
- Nothing outside `likely_paths`.

## For the manual (W-6)

- `src/doc/README.adoc` line 1699, under *Stories*, the paragraph "While a story is being walked through, a bar over the diagram says where you are, with *Previous* and *Next*, and the words of the step, to read; ...". Reword the first sentence to add: a list on the bar, after "Step n of N", shows any step directly (its number and a title: the name of its view, else the first words of what it says; a story of one step has no list); choosing a step draws it as *Next* does (the plateau and the comparison it names too); the step on screen is the one selected; a step that cannot be drawn says so in its entry, with the reason. And the sentence "A step that cannot be drawn (its element was deleted) says why in the bar, which stays: *Next* and *Previous* still work." can say "the list, *Next* and *Previous* still work". "The story is in the URL ..." stays true (the list adds no key).
- The limits and the release notes of W-6: nothing is lost or written by the list; no limit to list.

## Findings for the wave

- `ref=` (the element selected) in the address is not set by any step of a story, so the address after a step depends on what was selected before it, by Next as by the menu; harmless for a Map (it ignores it) and not new. If W-5's "Back and Forward move between steps" tests compare addresses, they must drop `ref` or select nothing first.
- The list uses `change`, not `input` (the band's lists use `input`): the two are equivalent for a committed choice; W-5 may keep either, but one listener has to route it (`handleAppChange` here).
- `goToStoryStep` draws a step that names another plateau by building that plateau's model; "no `modelsChanged()`" is true of the menu's own code and of every story that names no plateau, and a story that does gets the calls Next gets (asserted equal in snapshots, and the test of "writes nothing" checks the models only for stories that name none).
- Commit subject proposed: `feat: the bar of a story has a menu that shows any step, with the steps that cannot be drawn marked`.
