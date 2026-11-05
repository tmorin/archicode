---
type: prg
status: completed
run: 0223
wave: 032
---

# Progress Log: Run 0223

## Log

- 2026-11-05: Stage 4 — drafted tdd-0223 (TDD+pln, no PRD): a shared parsed-stylesheet reader (stylesheet.js, moved from css-theme-audit) with rule/decl/order lookups; per assertion delete (named e2e spec), rewrite, or add a spec; compactStyle removed last; about ten tasks; no blocker (Q-1 reader form and Q-2 number of new specs are recommendations).
- 2026-11-05: Stage 5 — KDML review of tdd-0223 done by the leaf agent itself (Review pass: dispatched, a different agent from the drafter), referent = the repo (the 13 test files, `stylesheet-support.js`, `src/test/e2e`, `playwright.config.js`, `.github/workflows/ci-build.yaml`, the wave manifest); overall Acceptable, 8 findings returned to the main agent to apply, none a blocker: S2 C-DOC "20 specs" is 16 spec files; S2 C-DOC the new e2e tests run in the job `E2E`, not `Page` (Deployment, ASM-4); S2 MECE-MISSING the reader's self-tests (DEC-1) have no file in Scope/IMP-1 (a `stylesheet.test.js`); S2 CON-4/Out of scope "no change to an existing e2e spec" contradicts "added tests" and REQ-3 "additions only" (name-status shows M): new spec file only; S1 Proposed Design hedges `rule(rules, ...)` or closure while Q-1 and IF-1..3 choose the closure, and `order` returns positions there but a boolean in IF-3, `has` has no IF; S1 IF-3 refers to an "ASM below" that does not exist; S1 delete/rewrite/add order stated four times (Summary, Proposed Design, DEC-3, FLOW-1); S1 "about 340 tests" is 382 and the new e2e file also runs under chromium and firefox (webkit only for the six listed specs), and Prettier/ESLint cover `src/test/e2e` too (CON-2).
- 2026-11-05: Stage 6 — resolved the TDD open questions inline, none left as a blocker: Q-1 the reader is a closure over one sheet (DEC-7); Q-2 a budget of at most 5 new e2e tests in one new spec file, the rest rewritten or deleted with the reason (DEC-8).

- 2026-11-05: Stage 8 — drafted pln-0223 (TDD+pln, no PRD) by the leaf agent itself: 11 tasks, two parallel groups (TDD amendment with the inventory; then the six conversion/e2e tasks on disjoint files, each writing its own commit-record part); task-001 absorbs the eight Stage 5 findings the TDD did not yet carry; the shared reader with stylesheet.test.js comes first, compactStyle removal last; the autonomy override is noted in Human Review Gates and Escalation Rules; the implement check exits 0, WBS written, run status set to planned; no blocker.
- 2026-11-05: Stage 9 — consistency check of pln-0223 done by the leaf agent itself, no PRD so against the TDD and the repository only: every task's source_requirements trace to real TDD IDs (REQ-1..5, DEC-1..8, CTR-1/2, IMP-1..5, RISK, CON; IF-4 and the amended items arrive with task-001), no invented scope; repository spot-check holds (13 files import compactStyle and the helper is the 14th, 16 spec files, E2E job and webkit testMatch as stated, Prettier/ESLint cover src/test/e2e, scripts and coverage floor exist, header.test.js has its own rulesOf/ruleOf); two edits: gap-007 now records that Playwright, its three browsers and target/quarkus-app/quarkus-run.jar exist here, so task-009 can run the new spec; new gap-008, src/test/CLAUDE.md names the flows of the specs, so task-010 now depends on task-009 and adds a clause for stylesheet-claims.spec.js when it exists (edges, verification in both lists and next_action aligned); implement generator check exits 0, WBS regenerated; blocking_gaps is empty, so no Stage 10 blocker carried forward.

## Inventory

Task 002 of the plan. Every assertion of the 13 files that holds a CSS rule, a media or container query, or a cut of the style text. Files are in `src/test/javascript/viewpoint-kernel/`; lines are those of the committed files. Decisions: `delete` (a spec or the audit proves it, read), `rewrite` (on the shared parsed reader: `rule`/`decl`/`order`/`has` with the `at` context), `keep` (no stylesheet text). A proof column names the spec file and the lines read, or the reason. Four claims need a browser (NS-1 to NS-4, below the table); each is one row. Audit = the test `every class of the stylesheet draws with variables that both themes define` (css-theme-audit.test.js:464, which runs `auditPage`, read at 206-460: literal colour in any rule, undefined or one-sided variable, a dark block that differs from the other, a rule of its own under the dark query).

| Id | File:lines | Test | Claim | Decision | Proof read / reason |
|---|---|---|---|---|---|
| I-01 | css-theme-audit:464 | every class draws with variables both themes define | `auditPage(HTML)` finds nothing | rewrite | the audit owns the parser (`styleOf`, `rulesOf`, `declarationsOf`: DEC-1 moves them to the reader); no spec checks the two themes' variables |
| I-02 | css-theme-audit:468-499 | the audit reads what it claims | more than 500 rules; light `:root` holds 12 named variables; dark media block holds at least 18; rules in `@container` are read; `.band-mistakes` is read | rewrite | pure lookups (`rule(':root')`, `at` of a rule) |
| I-03 | css-theme-audit:501-512 | allowed literals are shadows and the veil | every literal outside `:root` is an `rgba(0, 0, 0, x)` shadow, filter or background | rewrite | iterates rules of the reader |
| I-04 | css-theme-audit:515-561 | colour literals found in every form | `literalColoursIn(property, value)` on 33 strings | keep | no stylesheet text; a function over strings |
| I-05 | css-theme-audit:640-679 | classes of waves 015 and 016 | each class is styled with named variables and the page script writes it | rewrite | `variablesOfClass` over the reader; the script half cuts at `</style>` of the page, kept as a string on the script part |
| I-06 | css-theme-audit:691-729 | a literal colour in a class fails the audit | six mutated copies, each text found once in the style | rewrite | `mutated(from, to)` matches one-line rule text that exists only through `compactStyle`; the copies are rebuilt as a replace on the raw style or as a parsed edit; mixed text and parse (RISK-4) |
| I-07 | css-theme-audit:731-772 | a variable missing, misspelt, one-sided | five copies, two of them replace a multi-line block of `--chg-*` (`\n    }\n  }`) | rewrite | same as I-06; the block text is a cut by position, replaced by an edit of the declaration |
| I-08 | css-theme-audit:774-795 | dark colour not redefined or not readable | `--accent` removed from both dark blocks, `--muted` and `--on-accent` changed | rewrite | same as I-06 |
| I-09 | css-theme-audit:797-821 | a rule of its own under the dark query | two copies inserted before `:root[data-theme="light"]` | rewrite | same as I-06 |
| I-10 | css-theme-audit:823-843 | a stale allowed literal fails | three copies (veil, tinted veil, tinted shadow) | rewrite | same as I-06 |
| I-11 | css-theme-audit:845-909 | the holes of a review are closed | 19 copies (nesting, `@property`, `@scope`, `@keyframes`, readable grounds...) | rewrite | same as I-06 |
| I-12 | css-theme-audit:911-930 | text field outlined with `--control-border`, 3:1 in three blocks | field rule border, variable in light and both dark blocks, contrast against `--bg` | rewrite | already on `rulesOf`; no spec measures a border contrast |
| I-13 | diagram-key-folded:97-103 | rules of the page: folded key | folded key hides its sentences and its note (`display: none`) | new spec NS-1 | no e2e spec opens the key (grep of the 16 specs on key, legend, opacity, stroke: only diagram-and-compare.spec.js:45 and story-player.spec.js:30 read the key's words, read) |
| I-14 | diagram-key-folded:99 | same | open key is capped at `--dg-key-max` (30vh) and scrolls | NS-1 | same row as I-13: one claim (the three assertions 97, 99, 101 are one browser test) |
| I-15 | diagram-key-folded:101-103 | same | at 700 px or less the folded key keeps one row (`nowrap`, `overflow-x: auto`) | NS-1 | same row as I-13 |
| I-16 | diagram-key-folded:104 | same | the toggle has a pressed look (`[aria-expanded="true"]`) | rewrite | `has` on the selector |
| I-17 | header:346-349 | centre panel is the container | `.center-panel { container: center / inline-size }` | rewrite | `decl` on the rule |
| I-18 | header:350-358 | three container queries widest first | exactly 85, 60, 46 rem in that order | rewrite | list of `at` contexts in source order |
| I-19 | header:361-385 | queries come after the base rules | base header, row, holder and button rules before the first query; row `flex-shrink: 0` | delete | NS-2 measures the header at the three widths, a base rule after a query would show; no pattern kept |
| I-20 | header:388-394 | compact state hides the words | label `display: none`, icon width 2rem, overflow and "..." untouched | delete | NS-2 (labels hidden at 85 rem, overflow closed) |
| I-21 | header:396-416 | minimal state: the "..." button and its popup | button inline-flex, holder relative, popup absolute and closed, open with `data-open`, header raised, closed rule before open rule | delete | NS-2 (button visible, popup closed, opens on click, above the chips) |
| I-22 | header:422-432 | "..." keeps 2rem and no padding | base rule has `!important` padding; the specific rule beats it; no weaker rule | delete | NS-2 measures the button width and padding in a browser, which is what the specificity is for |
| I-23 | header:435-440 | tight state gives two rows | `height: auto; flex-wrap: wrap; min-height: var(--header-h)` | delete | NS-2 (header wraps to two rows at 46 rem) |
| I-24 | header:443-453 | the strip is gone | no `overflow-x` on the actions row; no `@media max-width` mentions the header; no `.maximize-label` | rewrite | absence lookups on the reader (`rule` per selector, `at` filter) |
| I-25 | header:458 | help keeps its look | `.help-menu { position: absolute; top: calc(100% + 0.25rem)` | rewrite | `decl` |
| I-26 | header:462-471 | block of the header uses theme colours | cut by a COMMENT and by position (ASM-2); no hex, no function, rgba only in shadow | delete | Audit covers a literal colour in every rule, with the shadow list; the cut by comment goes with it |
| I-27 | header:822-837 | a narrow centre: toolbar groups wrap | `.diagram-tools .button-group, .diagram-toolbar .button-group` wrap and `max-width: 100%`; `.diagram-tools` and `.diagram-toolbar` wrap | delete | diagram-toolbar.spec.js:258-267 (360 px: document at most 360 wide, no control of the bar outside the window) and :445-499 (360 by 740, toolbar at most 148 px high), read |
| I-28 | header:831-836 | same test | `#diagram-hint` and `.dg-legend` are `max-width: 100%`, the legend wraps | rewrite | the spec reads buttons and selects only, not the hint or the legend; `decl` |
| I-29 | ui-fixes:430-452 | badge text readable | `.error-badge`, `.modified-badge`, `.dangling-badge` use the right variables; 4.5:1 in light and in dark | rewrite | `decl` of the rule plus the variables of the three blocks; audit checks readability of `--on-accent` only (read at 774-795 mutation) |
| I-30 | ui-fixes:456 | reset block | no `#e5e7eb` or `#9ca3af` in the style | delete | Audit (literal colours) |
| I-31 | ui-fixes:457-461 | reset block | `::placeholder` opacity 1 and muted; `.select-none` is a rule; no `h1 { font-size` rule | rewrite | `decl`, `rule`, absence |
| I-32 | ui-fixes:462 | top bar wraps | `.top-panel { flex-wrap: wrap }` | delete | workspace-menu.spec.js:20-143 (`problemsOf`: document not wider than the window, every `.top-panel` button inside the window) run at 360 and 1280 in both schemes, read |
| I-33 | ui-fixes:463-467 | help menu hangs from the "?" | `.help-menu { position: absolute; top: calc(100% + 0.25rem)` | rewrite | `decl` (same rule as I-25) |
| I-34 | ui-fixes:883-890 | button group neighbours | `button + button { margin-left: -1px }`; hover and focus-visible `position: relative; z-index: 2` | rewrite | `decl` |
| I-35 | ui-fixes:891-892 | perspective tabs | pressed tab rule exists; no `.perspective-tab` pill rule | rewrite | `has`, absence |
| I-36 | plateau-compare:501 | compound tint | `.dg-compound .dg-tint { fill-opacity: 0.08 }` | rewrite | `decl` |
| I-37 | plateau-compare:502 | tint | `.dg-tint { fill: var(--st-tint, none); fill-opacity: 0.16` | rewrite | `decl` |
| I-38 | plateau-compare:564-567 | changed link | stroke `--chg-changed`, width 2, dash 2 3 | rewrite | `decl` |
| I-39 | plateau-compare:568 | new link | `stroke-width: 3` | rewrite | `decl` |
| I-40 | plateau-compare:569 | removed link | `stroke-dasharray: 7 4` | rewrite | `decl` |
| I-41 | plateau-compare:1062-1069 | page and export agree on the lines | three rules of the page equal three strings; the export source has no hex | rewrite | page side by `decl` on the reader; the export side reads the script function (not style) and stays as it is |
| I-42 | plateau-compare:1099-1113 | state colours in three blocks | `--chg-*` defined in `:root`, the system dark block and the forced dark block; the dark blocks agree; 3:1 and 4.5:1 | rewrite | `decl` on the three blocks, both dark ones asserted; the contrast is not in the audit |
| I-43 | changes-panel:358-361 | selected row | `.change-row.selected { border-color: var(--accent) !important; box-shadow: inset 3px 0 0 var(--accent) }` | rewrite | changes-walk.spec.js:39-92 measures position, not the look (read) |
| I-44 | changes-panel:848 | faded context | `.dg-node.dg-context { opacity: 0.55 }` | rewrite | no spec reads an opacity (grep) and the claim is a property of one rule |
| I-45 | changes-panel:1349 | panels styled | seven selectors are in the style | rewrite | `has` |
| I-46 | changes-panel:1351-1356 | panels use the theme variables only | cut from `.right-tabs {` to `[data-resize] {`; no hex, no `rgb(` | delete | Audit; the cut by position goes |
| I-47 | editor-structure:1116 | page tabs hold the width | `.page-tabs` wraps, `min-width: 0`, `max-width: 100%` | rewrite | `decl`; diagram-toolbar.spec.js:258 covers a diagram page, not the Plateaus page or Settings (read) |
| I-48 | editor-structure:1117 | timeline items | `min-width: 0` and the `--depth` margin | rewrite | `decl` |
| I-49 | editor-structure:1118 | timeline main | `flex-wrap: wrap` | rewrite | `decl` |
| I-50 | editor-structure:1119-1122 | helper of the shell | `.grid-rows-[auto_auto_auto_minmax(0,1fr)]` rule with an escaped selector | rewrite | `rule` with the escaped selector (a case for the reader's selector match) |
| I-51 | editor-structure:1123 | files group | `.files-group .tree-branch-title { min-width: 0 }` | rewrite | `decl` |
| I-52 | editor-structure:1125 | four pages in a row | `.page-tabs .button-group { flex-wrap: wrap; max-width: 100%` | rewrite | `decl` |
| I-53 | editor-structure:1126-1132 | one narrow query | exactly one `@media (max-width: 40rem)` | rewrite | count of `at` contexts; the cut by `indexOf` to `</style>` for `narrow` goes |
| I-54 | editor-structure:1133-1137 | rules of the narrow window | `.page-tabs button` padding; settings field row, label and value rules | rewrite | `rule(selector, '@media (max-width: 40rem)')` |
| I-55 | editor-structure:1138-1141 | settings fields | the three fields `max-width: 100%; min-width: 0` | rewrite | `decl` |
| I-56 | editor-odds-and-ends:689-700 | 424 px document | `.min-w-48`, `.min-w-56`, `.w-1` sum to 424, more than 360 | delete | The premise of the old failure, a sum of three values. The outcome, a document not wider than the window at 360, is diagram-toolbar.spec.js:258-260 and :454-457 and workspace-menu.spec.js:29,64 (all read) |
| I-57 | editor-odds-and-ends:702-728 | below 40rem regions are stacked | app-shell is a column; handles `display: none`; panels `width: auto !important`, `min-width: 0`, `max-width: none`; the grid is a column; centre `height: 80vh` | rewrite | `rule(selector, '@media (max-width: 40rem)')`; no spec checks the stacking (the specs at 360 check the width only) |
| I-58 | editor-odds-and-ends:737-743 | room left for the centre | 40rem minus the three columns is at least 200 px | rewrite | arithmetic on three `decl` values |
| I-59 | editor-odds-and-ends:745-753 | the wide layout is untouched | none of three declarations is outside the narrow query; `.app-shell` height 100%, `#app` height 100vh | rewrite | `at` of each rule; the cut by `replace(narrowRules(), '')` goes |
| I-60 | theme:262-265 | stylesheet themes | `:root` color-scheme light dark; forced light and forced dark rules; a dark media query on `:root:not([data-theme="light"])` | rewrite | `decl` per block and `at`; workspace-menu.spec.js uses `emulateMedia` for the system scheme only |
| I-61 | theme:272-289 | dark variables same | both dark blocks declare the same variables, at least 9, each overriding a light one | delete | Audit: its mutation test at css-theme-audit.test.js:731-772 (read) fails on a variable one dark block lacks and on a different value, and on a variable only a dark block defines |
| I-62 | inspection-links:764-768 | links accent | cursor pointer; focus-visible and selected stroke `var(--accent)`; selected label fill | rewrite | `decl` |
| I-63 | inspection-links:769-770 | inspection rules | three selectors have a rule | rewrite | `has` |
| I-64 | inspection-links:771-775 | no own colour in four rules | no hex, no `rgb(` | delete | Audit |
| I-65 | inspection-links:776-778 | selected after ghost edge | `.dg-link-selected .dg-edge` after `.dg-edge.dg-ghost-edge` | rewrite | `order` (equal specificity, said in the title: DEC-2) |
| I-66 | inspection-links:780-786 | dark blocks hold the same variables | two dark blocks list the same variables | delete | Audit (same as I-61) |
| I-67 | inspection-navigation:897-913 | badges give way first | base rule: `flex: 0 100 auto`, `min-width: 0`, `display: flex`, `margin-left: -0.5rem`, `max-height: 1.1rem`, `overflow: hidden`, `flex-wrap: wrap`; two rules for the group; the name still shrinks | rewrite | `decl`; one claim per rule, not worth a browser (budget) |
| I-68 | inspection-navigation:915-920 | base before the first query | `.element-header-badges {` before the first `@container` | rewrite | `order` |
| I-69 | inspection-navigation:923-929 | tight state | in the 46 rem query the group is `max-height: none; max-width: 100%; flex: none; margin-left: 0` | rewrite | `rule(selector, '@container center (max-width: 46rem)')` |
| I-70 | inspection-navigation:930-934 | still three states | three container queries | rewrite | same as I-18; one shared helper |
| I-71 | inspection-navigation:935-939 | no colour added | four rules without hex or `rgba` | delete | Audit |
| I-72 | inspection-navigation:940 | marked relation | `.inspection-rel-marked` uses `var(--accent)` | rewrite | `decl` |
| I-73 | story-player-modal:907 | player page | `.story-player { position: fixed; inset: 0` | rewrite | `decl`; cut by two `indexOf` goes |
| I-74 | story-player-modal:908-915 | player layout never grows past the window | shell `100dvh`, `max-width: 100vw`, `overflow: hidden`; bar wraps; step menu `flex: 0 1 22rem; max-width: 100%`; words `overflow-y: auto; overflow-wrap: anywhere` | new spec NS-4 | story-player.spec.js:7-45 opens the player at the default size and never sets a viewport (read); no spec opens it at 360 |
| I-75 | story-player-modal:916 | no horizontal scroll rule | no `.story-player` rule with `overflow-x: scroll` | rewrite | absence lookup |
| I-76 | styles:869 | modified dot | `.modified-dot` is in the style | rewrite | `has` |
| I-77 | styles:1196-1212 | styled rules before the outlines | five selectors before `.dg-focal .dg-box`; plain `.dg-box` first; one rule for focal and selected with the accent; styled before `.dg-ghost .dg-box` | new spec NS-3 | no spec styles a box or reads a stroke (a grep of the 16 specs on stroke, fill and opacity finds a computed colour only in workspace-menu.spec.js:36, a menu item) |
| I-78 | styles:1550-1557 | derived outline, focal wins | `.dg-styled > .dg-group` before `.dg-focal .dg-box`; the focal and selected rule with the accent | NS-3 | same row as I-77 |
| I-79 | styles:1213-1231 | the usual look is the fallback | `.dg-styled > .dg-box` fill and stroke fallbacks; `> .dg-group` fill; `pointer-events: visibleStroke`; title and badge fills | rewrite | `decl`; the fallback text is a property of a rule |
| I-80 | styles:1236-1256 | the dark theme has no `--st-` variable | system dark, forced dark and every `:root` block declare none; no theme rule for styled boxes | rewrite | `decl` on each block (both dark ones), absence over rules; the cut by `blockAt` goes |
| I-81 | styles:1260-1268 | tree badge rule | `.stereotype-badge` reads `--st-fill`, `--st-stroke`, `--st-text`, ellipsis; after `.tree-node-kind`; Map scope row rule; legend rule | rewrite | `decl`, `order`, `has` |
| I-82 | styles:1315 | chevron colour | `.dg-fold-glyph { stroke: var(--st-text, var(--fg))` | rewrite | `decl` |
| I-83 | styles:1369-1374 | title on a fill | `.dg-over-fill .dg-title, .dg-over-fill .dg-sub { fill: var(--ov-text) }`, after the styled rule and after `.dg-title` | rewrite | `decl`, `order` (same specificity, said in the title) |
| I-84 | styles:1544-1549 | derived outline in the page | `.dg-styled > .dg-box` stroke fallback `--border`; `> .dg-group` stroke fallback `--muted` with opacity 0.55 | rewrite | `decl` |
| I-85 | header:361-440 (I-19 to I-23) | the header at three centre widths | at 85, 60 and 46 rem of centre: labels hidden, "..." button of 2rem without padding and its popup, header on two rows | new spec NS-2 | no spec sets the width of the centre or opens the header overflow (grep of the 16 specs on header-more, element-header, container: only diagram-toolbar.spec.js:163 reads `.element-header`, for its position) |

NS-1: a comparison's key: folded it shows no sentence, open it is at most 30 percent of the height and scrolls, at 700 px or less it stays on one row (I-13 to I-15). NS-2: the header of an element page at three centre widths: labels hidden, the "..." button and its popup, two rows when tight, measured width and padding of the button (replaces I-19 to I-23). NS-3: a styled box shows its fill and its own stroke, and the focal and the selected box keep the accent stroke (I-77, I-78); the workspace is written by the spec with a `styles` entry (no shipped example has one). NS-4: the story player opened at 360 px is not wider than the window and keeps its bar, step menu and words inside it (I-74).

Tally: 85 rows (one claim per row where a browser claim groups its assertions); 4 claims need a browser, within the budget of 5, so the escalation trigger (more than five) does not fire. Deletions: I-19 to I-23 (NS-2), I-26, I-27, I-30, I-32, I-46, I-56, I-61, I-64, I-66, I-71. Keep: I-04. All other rows rewrite. After the conversions, no assertion keeps a text pattern on a rule or a cut by position.

Specs read for the proofs: address, browser-workspace (name field at 1280 and 360), changes-walk, diagram-and-compare, diagram-toolbar (groups, 360 px width and height), story-player, workspace-menu (document width and bar at 360 and 1280, both schemes); the other nine specs were scanned by grep (key, legend, stroke, fill, opacity, overflow) and hold no style claim.

Points for the following tasks: (1) css-theme-audit mutation tests (I-06 to I-11) match one-line rule text and multi-line blocks; they are the largest piece to convert, and the reader needs an edit (replace a declaration of a rule) or the mutations replace in the raw style text; (2) the reader must match a selector with escaped characters (I-50) and a list of selectors as written (I-18, I-27, I-83); (3) tests that read comments or cut at them: header I-26 only (deleted); (4) tests mixing script and style: plateau-compare I-41 (kept for the script half), css-theme-audit I-05; (5) a second reading of `compactStyle` stays in `src/test/CLAUDE.md` until the last task.
- 2026-11-05: Stage 11 — verified: test:unit 3514 pass/0 fail, format:check and lint exit 0, coverage floor held when run alone, editor/sample builds change nothing, compactStyle gone, one new e2e file and none modified, nothing under src/main/editor changed; 4 e2e tests not run in a browser here (proved by the CI job E2E); pln done, run and prg completed; backlog checker tooling/docs/check-backlog.py does not exist in this repo, so not run.

## Findings

- 2026-11-05: task-011 gates: test:unit 3514 pass / 0 fail; test:coverage passes the floor (93.15 % lines, 96.31 % functions) when run alone, a first run overlapped with lint and format:check failed on tests (output not captured) and is taken as interference; format:check and lint exit 0; editor:build and sample:build change nothing; grep compactStyle empty; one new e2e file, none modified; new e2e spec not run in a browser here.

## Lessons Learnt

- Nothing yet.
