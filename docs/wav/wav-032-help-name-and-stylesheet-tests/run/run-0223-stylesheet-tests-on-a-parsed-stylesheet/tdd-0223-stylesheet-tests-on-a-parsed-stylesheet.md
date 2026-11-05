---
title: Stylesheet tests on a parsed stylesheet
type: tdd
status: draft
run: 0223
wave: 032
owner: tmorin
date: 2026-11-05
related:
  - docs/wav/wav-032-help-name-and-stylesheet-tests/wav-032-help-name-and-stylesheet-tests.md
  - docs/wav/wav-032-help-name-and-stylesheet-tests/wbc-032-help-name-and-stylesheet-tests.md
  - src/test/javascript/viewpoint-kernel/stylesheet-support.js
  - src/test/javascript/viewpoint-kernel/css-theme-audit.test.js
  - src/test/CLAUDE.md
  - https://github.com/tmorin/archicode/issues/203
---

# Stylesheet tests on a parsed stylesheet

# Summary

Thirteen test files under `src/test/javascript/viewpoint-kernel/` read the `<style>` of `standalone.html` as text: they wrap the page in `compactStyle` (`stylesheet-support.js`), which puts every rule back on one line, then match it with regular expressions that hold a rule (`selector { a: b; }`), a media query, or cut it by position (`indexOf`, `slice`, `substring`). They pass while another rule overrides the one they match and break when the formatter moves a line. This run replaces them: each assertion is deleted, rewritten on a parsed stylesheet through one shared reader `rule(selector, at)`, or backed by a new Playwright test, in the order DEC-3 fixes. `compactStyle` and `stylesheet-support.js` are removed last.

There is no PRD (profile TDD+pln), so traceability is incomplete: requirements are labelled `REQ-n` from the manifest of wave 032 (row W-2, gate P1 criteria 4 to 7) and from #203.

No diagram: the change adds one test helper and edits tests; no new boundary between components.

# Scope

In scope:

- `src/test/javascript/viewpoint-kernel/`: the 13 test files that call `compactStyle` (`changes-panel`, `editor-odds-and-ends`, `inspection-navigation`, `css-theme-audit`, `diagram-key-folded`, `header`, `inspection-links`, `ui-fixes`, `styles`, `story-player-modal`, `editor-structure`, `plateau-compare`, `theme`), a new shared reader file `stylesheet.js` with its self-tests in `stylesheet.test.js`, removal of `stylesheet-support.js`.
- `src/test/e2e/`: one NEW spec file, where a deletion leaves a behaviour unproved (DEC-4, DEC-8); no existing spec, helper or fixture is edited.
- `src/test/CLAUDE.md`: the sentence on `compactStyle` (line 27) rewritten.
- The run record.

Out of scope: `style.css` and everything under `src/main/editor` (wave non-goal); any change to an existing e2e spec, helper or fixture; assertions that read the JavaScript of the page (they may keep `HTML` as a string, only the stylesheet reads change); #24, #134, #135.

# PRD Traceability

No PRD. Requirements assumed from the wave manifest and #203.

- `REQ-1` (P1 gate 4): `grep -rl compactStyle src/test` prints nothing and `stylesheet-support.js` does not exist. Addressed (DEC-5, IMP-1, IMP-5).
- `REQ-2` (P1 gate 5): no assertion of the 13 files has a pattern that holds a CSS rule or a media query, nor cuts the stylesheet by position; a shared reader `rule(selector, at)` over a parsed stylesheet exists and the kept assertions use it. Addressed (DEC-1, DEC-2, DEC-3, FLOW-1).
- `REQ-3` (P1 gate 6): the commits list each deleted test with the e2e spec that covers it; `git diff --name-status` of `src/test/e2e` shows at most one added file and no modified existing file; nothing under `src/main/editor`. Addressed (DEC-3, DEC-4, CTR-2).
- `REQ-4` (P1 gate 7, the part of this run): `npm run test:unit`, `test:coverage`, `format:check`, `lint` exit 0; `editor:build` and `sample:build` leave `git status --short` unchanged. Addressed (Observability and Verification, RISK-3).
- `REQ-5` (W-2 scope): order `css-theme-audit.test.js`, `styles.test.js`, the rest; about ten tasks. Addressed (DEC-6).
- Partially addressed: none. Unresolved: none that blocks (Q-1 and Q-2 are recommendations).

# Technical Goals

- TG-1: one reader of the stylesheet, built on the parse that `css-theme-audit.test.js` already has (`rulesOf`, `declarationsOf`), used by every kept assertion.
- TG-2: an assertion fails when the computed rule is wrong (property missing, overridden by a later rule, absent from a media query), not when the layout of the text changes.
- TG-3: nothing is deleted without a named spec that proves the behaviour, nor kept as text.
- TG-4: the unit suite and the coverage floor stay green; the loss of assertions is reported, not hidden.

# Non-Goals

- No CSS parser dependency (`package.json` has none; the rule parser already in `css-theme-audit.test.js` is enough, see DEC-1).
- No test of layout in Node (the harness has no layout engine); rendering stays with Playwright.
- No rewrite of the tests' other assertions, no rename of tests that are kept.

# Assumptions

- ASM-1: the parse of `css-theme-audit.test.js` (`rulesOf` with `at`, `declarationsOf`) is correct on the whole stylesheet; it runs today on `style.css` in 5 tests. Validated by running the audit file after the move (task 1) with no change of verdict.
- ASM-2: `compactStyle` only reformats the `<style>`; no assertion depends on the comments it keeps. A rule read from a parse ignores comments. Validated per file: a test that reads a comment is listed in the inventory (DEC-6) and decided there.
- ASM-3: the 16 spec files of `src/test/e2e` cover most layout/visibility behaviours the CSS text assertions stand for. Not assumed per assertion: every deletion names its spec (DEC-3).
- ASM-4: `npm run test:e2e` can be run locally (Playwright installed); if not, the new e2e tests are proved by the job `E2E` of CI, which runs them under chromium and firefox (the webkit project runs six listed specs only), and the run says so.

# Constraints

- CON-1: `standalone.html` is generated; the tests read the committed file as it is; nothing here edits `src/main/editor`.
- CON-2: Prettier and ESLint cover `src/test/javascript/**/*.js` and `src/test/e2e` (`npm run format:check`, `npm run lint`, `--max-warnings 0`); a new file must be a fixed point of Prettier.
- CON-3: `npm run test:coverage` has a floor (`scripts/editor-coverage-floor.json`) on the lines and functions of the page script; removed tests that exercised script paths could lower it.
- CON-4: an existing e2e spec is not changed (wave non-goal); new tests go in a NEW spec file only, since a test added to an existing file shows as modified in `git diff --name-status`.
- CON-5: `src/test/CLAUDE.md` states what is true now, with no wave or run ids.

# Current State

- `stylesheet-support.js` exports `compactCss` and `compactStyle`; 13 test files import `compactStyle` (15 files hold the word: those, the helper, and `src/test/CLAUDE.md`, line 27).
- Counts per file of lines that look like a CSS rule, a media query or a cut by position (an upper bound, `grep`): `css-theme-audit` 83, `styles` 71, `changes-panel` 62, `inspection-links` 60, `plateau-compare` 59, `inspection-navigation` 51, `ui-fixes` 50, `header` 42, `editor-structure` 33, `editor-odds-and-ends` 30, `story-player-modal` 21, `theme` 15, `diagram-key-folded` 14. The wave counts about 55 rule assertions and about 40 cuts.
- `css-theme-audit.test.js` has `styleOf(html)` (the `<style>` text without comments), `rulesOf(css, at)` giving `{ selector, body, at, atRule? }` with nested at-rules flattened, and `declarationsOf(body)` giving `[property, value]`; `header.test.js` has its own, simpler `rulesOf` and `ruleOf(css, selector)` on a regex.
- The unit tests are plain `node --test` with the page loaded in a `vm` sandbox through `harness.js`.

# Proposed Design

A new file `src/test/javascript/viewpoint-kernel/stylesheet.js` holds the reader: `styleOf`, `rulesOf`, `declarationsOf` moved unchanged from `css-theme-audit.test.js`, plus:

- `loadStylesheet(html)` returning `sheet`, a closure over the rules of the page's `<style>` (comments stripped), memoised per HTML string (DEC-7).
- `sheet.rule(selector, at = [])`: returns the declarations of the one rule whose selector text equals `selector` (whitespace-normalised) inside exactly the at-rules `at` (substring match on each at-rule head, outermost first); throws with the list of near matches when there are zero or several. `sheet.decl(selector, property, at)` returns the value, `sheet.order(selectorA, selectorB)` returns a boolean, true when the first rule comes before the second in the source (IF-3); rules carry an `index` in source order for this.
- `sheet.has(selector, at)` for the presence and absence checks (IF-4).

Tests then assert on `decl(...)` values (`'none'`, `'var(--x)'`), on presence in a given `at`, on `order(...)`, and on the dark variables defined in both themes. They no longer receive the compacted page: they read the page as it is with `fs.readFileSync`; assertions that read the markup or the script keep the `HTML` string.

Per assertion the decision order is fixed once, in DEC-3.

# Repository Impact

- IMP-1 — Shared reader
  - Path(s): `src/test/javascript/viewpoint-kernel/stylesheet.js` (new), `src/test/javascript/viewpoint-kernel/stylesheet.test.js` (new, the self-tests of DEC-1), `css-theme-audit.test.js`
  - Change type: additive (new file), modify (audit imports the reader instead of defining `rulesOf`)
  - Why impacted: TG-1.
  - Linked PRD IDs: REQ-2
  - Risks / notes: moved code is unchanged text; the audit's verdicts must not move. `header.test.js` and its local `rulesOf` go in the rewrite of that file.
- IMP-2 — Audit and styles tests
  - Path(s): `css-theme-audit.test.js`, `styles.test.js`
  - Change type: modify, remove
  - Why impacted: the two largest files, done first (DEC-6); the audit already parses and only drops `compactStyle`.
  - Linked PRD IDs: REQ-2, REQ-3, REQ-5
  - Risks / notes: `styles.test.js` is 1582 lines; its assertions mix script and style, only the style ones change.
- IMP-3 — The other eleven files
  - Path(s): `changes-panel`, `inspection-links`, `plateau-compare`, `inspection-navigation`, `ui-fixes`, `header`, `editor-structure`, `editor-odds-and-ends`, `story-player-modal`, `theme`, `diagram-key-folded` (all `.test.js` in the same folder)
  - Change type: modify, remove
  - Why impacted: REQ-1 to REQ-3.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-3
  - Risks / notes: grouped in tasks of two or three files (DEC-6).
- IMP-4 — End-to-end specs
  - Path(s): one new spec file in `src/test/e2e/` (no existing spec edited)
  - Change type: additive
  - Why impacted: a deletion that leaves a visible behaviour unproved (DEC-4).
  - Linked PRD IDs: REQ-3
  - Risks / notes: no edit to an existing test (CON-4); fixtures from `fixtures.js`, `harness.js`.
- IMP-5 — Removal of the old helper
  - Path(s): `src/test/javascript/viewpoint-kernel/stylesheet-support.js`, `src/test/CLAUDE.md`
  - Change type: remove, modify
  - Why impacted: REQ-1; the sentence of `src/test/CLAUDE.md` says the stylesheet is read through `stylesheet.js`, parsed.
  - Linked PRD IDs: REQ-1
  - Risks / notes: last task, after `grep -rl compactStyle src/test` lists only these two.

# Canonical Impact

Not applicable — the repository declares no `arc` or `dom` register in a `docs/CLAUDE.md` (the file does not exist). The ArchiCode model of `docs/architecture/` models the editor layers and `tags.path` of code, not the unit tests; CI-arc-1: None.

# Data Model and Contracts

- CTR-1 — Stylesheet reader
  - Current contract: a test file gets a page string whose `<style>` is compact text and matches it.
  - Proposed contract: `require('./stylesheet')` exports `styleOf`, `rulesOf`, `declarationsOf`, `loadStylesheet(html)` and the lookups of the Proposed Design; a lookup that finds zero or several rules throws an `AssertionError`-compatible error naming the selector and the `at` it looked for.
  - Affected files: `stylesheet.js`, every test that reads the stylesheet.
  - Migration or compatibility notes: tests only; nothing shipped.
  - Linked PRD IDs: REQ-2
- CTR-2 — Commit record of deletions
  - Current contract: none.
  - Proposed contract: each commit that deletes an assertion lists, in its body, one line per deleted test: the test title, then the spec (`file.spec.js`, test title) that covers it, or `rewritten` or `new spec`.
  - Affected files: the commits of the run (wave gate criterion 6 reads `git log --format=%B`).
  - Migration or compatibility notes: the run's work goes in as several tasks but the wave's rule is one commit per run; the run's single commit then carries the full list.
  - Linked PRD IDs: REQ-3

# Interfaces and Behavior

- IF-1 — `sheet.rule(selector, at)`: input a selector as written in the stylesheet and the at-rule heads around it; output its declarations as `[property, value]` pairs with `!important` stripped as `declarationsOf` does; error when not exactly one rule.
- IF-2 — `sheet.decl(selector, property, at)`: the value of the last declaration of `property` in that rule; undefined when absent.
- IF-3 — `sheet.order(a, b)`: true when the rule `a` comes before the rule `b` in the source, for cascade-order assertions (the test author assumes the same specificity, DEC-2, and says so in the test title).
- IF-4 — `sheet.has(selector, at)`: true when at least one rule matches the selector inside exactly those at-rules, false when none; used for the presence and the absence checks (a rule that must not exist).
- Error behaviour: a test failing on `rule` says which selector, which `at`, and the rules whose selector contains the text.

# Flows and Processing Logic

- FLOW-1 — Converting one assertion
  - Trigger: an assertion in one of the 13 files whose pattern holds a CSS rule, a media query or a cut of the style.
  - Steps: (1) record it in the inventory of the run (file, test title, what it claims); (2) apply DEC-3 (delete with the named spec and note the pair for the commit, else rewrite as `decl`/`order`/`has` on the parsed sheet with no literal colour (use the variable) and the two dark blocks (`prefers-color-scheme` and `[data-theme="dark"]`) both asserted, else add a Playwright test within DEC-8); (3) run the file.
  - Branches / failure paths: a cut by position that selects a block to run a regex over becomes a lookup by selector and `at`; a test that reads a comment is decided in the inventory (ASM-2); a claim that is neither provable in Node nor worth a spec is deleted and said so in the commit, with the reason.
  - Final output / rendered result: the file has no `compactStyle`, no rule pattern, no cut; the commit message has the pair.
  - Linked PRD IDs: REQ-2, REQ-3

# Decisions

- DEC-1 — Reuse the parser of the audit, no dependency
  - Decision: move `styleOf`, `rulesOf`, `declarationsOf` from `css-theme-audit.test.js` to `stylesheet.js` and build the lookups on them.
  - Rationale: it is already exercised on the real stylesheet, handles nested at-rules and strings, and `package.json` has no CSS library; wave row W-2 names this move.
  - Alternatives considered: `postcss` (new dependency to pin, audit, and keep in the lockfile); the simpler regex `rulesOf` of `header.test.js` (misses nested blocks); a real CSSOM in `jsdom` (not in the harness).
  - Tradeoffs: a hand parser can mis-parse an unusual construct; mitigated by the audit's tests and by a few self-tests of the reader on a small sheet (nested `@media`, a string with `;`, two rules of one selector).
  - Linked PRD IDs: REQ-2
- DEC-2 — Specificity is not computed
  - Decision: the reader gives source order and the `at` context; it does not compute specificity or resolve the cascade.
  - Rationale: the claims seen are of three kinds (a property on a rule, a rule in or out of a media query, the order of two rules); a cascade engine is out of proportion.
  - Alternatives considered: a mini-cascade resolving a property for a selector (large, easy to get wrong).
  - Tradeoffs: an order assertion states in its title that the two rules have the same specificity.
  - Linked PRD IDs: REQ-2
- DEC-3 — Delete, rewrite, or add, in this order
  - Decision: for each assertion, in this order: (1) delete if an e2e spec proves the behaviour; (2) else rewrite on the parsed reader; (3) else, when it proves a visible result that neither a spec nor a parsed rule can, add a Playwright test. A deletion is accepted only with a named spec that proves the behaviour (read, not by name).
  - Rationale: the author accepted deleting what a spec covers (wave risks); the risk is a spec that names but does not prove.
  - Alternatives considered: rewrite everything (about 95 assertions, most re-proving what Playwright shows); delete everything (loses the audit-type guarantees that only a parse gives: no literal colour, dark variables twice).
  - Tradeoffs: the reading of the 16 specs is a cost paid once, at the inventory.
  - Linked PRD IDs: REQ-2, REQ-3
- DEC-4 — New e2e only for a behaviour that matters
  - Decision: add a test (in one new spec file, never in an existing one) only when the inventory marks a deleted claim as a visible behaviour with no spec; target a handful, each named in the commit.
  - Rationale: wave non-goal and CON-4.
  - Alternatives considered: keep the unit assertion as a rewrite (fine when the claim is a property of a rule, wrong when the claim is what the user sees).
  - Tradeoffs: a new e2e test costs CI time; kept small.
  - Linked PRD IDs: REQ-3
- DEC-5 — `compactStyle` goes last
  - Decision: remove `stylesheet-support.js` and the sentence of `src/test/CLAUDE.md` once no file imports it.
  - Rationale: until then, a file not yet converted still works; each task leaves the suite green.
  - Alternatives considered: remove first and fix everything at once (a red suite for the whole run).
  - Tradeoffs: none.
  - Linked PRD IDs: REQ-1
- DEC-6 — Order and tasks
  - Decision: inventory first (one task, no code change, a table kept in the run's progress log, not as a file in the repo), then `css-theme-audit` with the move of the reader, `styles`, then the others in groups of two or three files by size, then the removal; about ten tasks.
  - Rationale: wave row W-2.
  - Alternatives considered: one task per file (13 tasks of uneven size).
  - Tradeoffs: grouped tasks are larger.
  - Linked PRD IDs: REQ-5
- DEC-7 — The reader is a closure over one sheet
  - Decision: `loadStylesheet(html)` returns `sheet`; lookups are `sheet.rule`, `sheet.decl`, `sheet.order`, `sheet.has`.
  - Rationale: Q-1; call sites stay short, and the memoised parse is held by the closure.
  - Alternatives considered: free functions of `(rules, selector, at)` (every call repeats `rules`).
  - Tradeoffs: none that matters; both forms satisfy the wave's `rule(selector, at)`.
  - Linked PRD IDs: REQ-2
- DEC-8 — Budget of five new e2e tests
  - Decision: at most 5 new e2e tests in one new spec file; beyond that, rewrite (property of a rule) or delete with the reason in the commit.
  - Rationale: Q-2; keeps CI time and the size of the run bounded when the inventory is not yet known (RISK-5).
  - Alternatives considered: no cap (CI cost, unbounded run); stop the run at the inventory (blocks on a number the inventory itself produces).
  - Tradeoffs: a claim beyond the budget is proved less strongly than by a browser.
  - Linked PRD IDs: REQ-3

# Reliability, Performance, and Scalability

- The unit suite is large (382 tests in the 13 files); the parse of a stylesheet is run once per file (`loadStylesheet` is memoised by the HTML string), so no slower than the compaction today.
- A lookup that throws on zero or several matches keeps a renamed selector from passing silently.

# Security and Privacy

Not applicable — test code reading a committed file.

# Observability and Verification

- Per task: `node --test src/test/javascript/viewpoint-kernel/<file>.test.js` for the files touched.
- At the end: `npm run test:unit`, `npm run test:coverage`, `npm run format:check`, `npm run lint` exit 0; `npm run editor:build` and `npm run sample:build` leave `git status --short` unchanged (nothing in `src/main/editor` is touched).
- `grep -rl compactStyle src/test` prints nothing; `test ! -e src/test/javascript/viewpoint-kernel/stylesheet-support.js`.
- A scan for what the gate forbids, over the 13 files: `grep -nE '\{ ?[a-z-]+:|@media|@container' <files>` shows no match in an assertion, and `grep -nE 'indexOf\(|slice\(|substring\(' <files>` shows none applied to the style text (hits on markup or script are expected and read by hand).
- For e2e: `npx playwright test <added spec>` when the browsers are installed (ASM-4).
- Coverage: `npm run test:coverage` is compared to `scripts/editor-coverage-floor.json`; the run reports the covered lines before and after.

# Deployment and Rollout

Test-only change; no release effect, no rollback beyond the revert of the commit. The new e2e tests run in the job `E2E` of CI, under chromium and firefox (the webkit project runs six listed specs only).

# Risks and Tradeoffs

- RISK-1: a deleted assertion whose "covering" spec does not prove it. Mitigation: DEC-3 (read the spec), the gate has a fresh agent read the commit lists.
- RISK-2: the hand parser reads a rule differently from a browser (for example a selector list, `:is()`, an escaped character). Mitigation: self-tests of the reader; a rule is matched on its selector text as written.
- RISK-3: coverage floor lowered by removed tests (CON-3). Mitigation: measure after each group; if the floor breaks, the test that carried the lines is the one that exercised script paths, and is restored on the script side (an assertion on the script, not the style), not by lowering the floor.
- RISK-4: tests that mix script and style in one assertion, or that read a comment of the stylesheet. Mitigation: the inventory lists them.
- RISK-5: size of the run (about 95 assertions, 13 files). Mitigation: DEC-6 order; each task leaves the suite green.

# Open Questions

None open.

- Q-1 (resolved, DEC-7): the reader is a closure. `loadStylesheet(html)` returns `sheet` with `rule`, `decl`, `order` and `has`; there are no free functions of `(rules, ...)`. It reads best in a test, and `sheet.rule(selector, at)` is the `rule(selector, at)` the wave names.
- Q-2 (resolved, DEC-8): the number of added e2e tests cannot be known before the inventory (task 1), so the answer is a rule, not a number. Budget: at most 5 new e2e tests, in one new spec file. If the inventory marks more than 5 deleted claims as a visible behaviour with no spec, the claims beyond 5 are rewritten on the parsed reader when they are a property of a rule, or deleted with the reason in the commit when they are neither; the run does not grow the e2e suite past the budget and records the count in the progress log.

# Deferred Work

- DEF-1: a mini-cascade resolving a property through specificity (DEC-2), only if a later test needs it.
- DEF-2: the assertions that read the JavaScript of the page by position (wave non-goal).

# File Placement and Frontmatter

Saved as `docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/tdd-0223-stylesheet-tests-on-a-parsed-stylesheet.md`, with `type: tdd`, `run: 0223`, `wave: 032`.
