---
type: tdd
title: One mistake in a view is told in the same words by both tools
run: 0180
wave: 024
status: draft
owner: tmorin
date: 2026-10-26
related:
  - docs/wav/wav-024-fixes-and-editor-modules/wav-024-fixes-and-editor-modules.md
  - gh:tmorin/archicode#170
---

# One mistake in a view is told in the same words by both tools

# Summary

A saved view (or a story step that carries its own recipe) that has no element is one mistake and has two sentences: the command line says ``the view probe has no element: write the reference of one in `properties.element` `` (`KernelViewpointFactory.create`, run 0164), the editor says `This view has no element.` (`viewProblem` in `standalone.html`). A view whose element exists nowhere has two sentences too: the kernel's bare `dangling reference: gone` (`unknown focal element: gone` for a `detailed` view) and the editor's `The element “gone” does not exist any more.` (#170).

The design puts the view problems that both tools can tell into one file of cases, `view-problem-cases.json`, read by a Java test and a node test (the pattern of `dangling-reference-cases.json`), and changes the words of the tool that is behind so that each case has one sentence, the same bytes, in both. Two sentences are covered (no element; an element that exists nowhere). The others are listed with the reason they stay different on purpose.

No PRD exists for this run (profile TDD+pln): the requirement is the manifest entry W-3 of the wave and the text of #170. The sourced requirements are named `REQ-1` to `REQ-5` below; traceability to PRD identifiers is incomplete in the sense of the skill.

# Scope

In scope: the sentence of a view with no element and of a view whose element does not exist, in `KernelViewpointFactory` and in `viewProblem`/`stepProblem` of the editor page; the case file and its two readers; the tests that quote the old words; the sentence in `CLAUDE.md` ("Not aligned, recorded") and the line of the manual that quotes the sentence.

Out of scope: the other view problems (listed in DEC-4), the kernel (Rust) and its `.wasm`, the layered load-time check ``the view `v` (`file`) names `x`, which exists in no plateau`` (already one sentence in both tools, K04 and K05 of `layer-checks-cases.json`), how a map treats a pinned entry that does not exist.

# PRD Traceability

- Source: none (TDD+pln profile). Sources used: wave manifest W-3 (`wav-024-fixes-and-editor-modules.md`, phase P1) and issue #170.
- `REQ-1` (W-3 scope): one case file for the view problems, in the manner of `dangling-reference-cases.json`, read by a Java test and a node test. Addressed by DEC-1, CTR-1, IMP-4, IMP-5.
- `REQ-2` (W-3 scope): the words of whichever tool is changed are aligned, at least `has no element`. Addressed by DEC-2, IMP-1, IMP-2.
- `REQ-3` (W-3 scope): the other view problems are listed and those the file covers are aligned. Addressed by DEC-3, DEC-4.
- `REQ-4` (W-3 exit evidence): `library-view-edit.test.js` and the other tests are updated for the words. Addressed by IMP-6.
- `REQ-5` (W-3 exit evidence): the "Not aligned, recorded" sentence is removed from `CLAUDE.md`. Addressed by IMP-7.
- Unresolved: none. The assumption that the editor's wording is the one to move toward the command line's is ASM-1.

# Technical Goals

- TG-1: the same view, loaded by `archicode views generate -i <view>` and by the editor, gives the same sentence, byte for byte, for a view with no element and for a view whose element exists nowhere.
- TG-2: both readers of the case file fail when either tool changes a word of a covered sentence.
- TG-3: a story step with an inline recipe is told with the id the command line gives it (`step_01`).
- TG-4: no output of a command that succeeds changes, and no kernel contract moves.

# Non-Goals

- Aligning the sentences that differ because the tools do different things (an unknown viewpoint is a warning for the command line and a status for the editor, DEC-4).
- Making the editor refuse a map pinned on some missing entries the way the command line does (DEF-1).
- Changing the words of the warnings of the plateau checks (`skip ...`), which the goldens and the byte-identity harness pin.

# Assumptions

- ASM-1: the command line's words are the ones to keep for `has no element`, because they are already released (0.20.0, #158), tested (`ViewWithoutPropertiesTest`) and quoted by the manual and by `CLAUDE.md`; the editor is moved toward them. Validate: `README.adoc` quotes them (line 1525).
- ASM-2: the editor shows a sentence in lower case when the command line's is lower case; it already does so for the sentences of the load (`layerProblemsOf`, `entryProblemsOf`: ``the view `v` (`file`) names `x`, which exists in no plateau``). Validate: read the call sites of `viewProblem` (`library` center panel, the broken badge, `applySavedView`, `stepProblem`); none lower-cases or capitalises the text.
- ASM-3: when the kernel refuses the focal element of a view it says `dangling reference: X` (`overview`, `deep`) or `unknown focal element: X` (`detailed`), X being the focal element (a relationship `destination` is a different case: `danglingSentence` finds the element that holds X first); for a map it says `dangling reference: X` for a listed entry. Validated by running the packaged jar on a copy: `overview` and `deep` with `element: gone` print `error: dangling reference: gone`, `detailed` prints `error: unknown focal element: gone`, a map pinned on `gone` prints `error: the view v_map: dangling reference: gone`.
- ASM-4: the command line today puts no backticks round the id of a view in `has no element` (`the view probe`), where `CLAUDE.md` and the manual write ``the view `v` ``. The backticks are the convention of the neighbouring sentences (`the view `v` cannot be drawn: ...`). DEC-2 adds them.

# Constraints

- CON-1: both tools read the same file of cases; the file lives beside `dangling-reference-cases.json` in `src/test/javascript/viewpoint-kernel/` (the wave manifest lists `src/test/resources/**/view-problem-cases.json` as a likely path; the neighbour wins, as in run 0165, and is read from there by the Java test).
- CON-2: a failure the author can act on is one `error:` line, exit 1, no stack trace (`ErrorOutput`); a warning goes through `Warnings`.
- CON-3: the kernel is not changed (no `.wasm` move, no contract number): the command line turns the kernel's message into the sentence, as `danglingSentence` already does.
- CON-4: every shipped example and fixture keeps its output byte for byte (`scripts/byte-identity.sh` and the `*IT` classes); only the text of two error sentences moves, and no shipped file triggers either.
- CON-5: Prettier, ESLint and PMD apply to everything touched (`npm run format:check`, `npm run lint`, `./mvnw test-compile pmd:check`); `standalone.html` stays out of Prettier until #161.

# Current State

- CLI, no element: `KernelViewpointFactory.create` throws ``the view %s has no element: write the reference of one in `properties.element` `` for a view or a story step (id `step_NN`, `GenerateStoriesCommand` line 308) whose `properties.element` is absent, null or blank. Pinned by `ViewWithoutPropertiesTest` (SENTENCE, with `probe` and `step_01`) and `GuideViewPropertiesTest` (`contains("has no element")`). The manual quotes it (`README.adoc` line 1525).
- CLI, element exists nowhere: the kernel answers `dangling reference: gone` for an `overview` and a `deep` view (`lib.rs` line 1564) and `unknown focal element: gone` for a `detailed` view (`lib.rs` line 1294); `create` passes the first through `danglingSentence`, which finds an element of the graph that holds `gone` (a relationship, a `uses`, a hosted application) and otherwise keeps the kernel's words. A view that only names `gone` prints `error: dangling reference: gone` (`error: unknown focal element: gone` for `detailed`); a map prints `error: the view v: dangling reference: gone`. Checked by running the packaged jar on a copy, one view per viewpoint.
- Editor: `viewProblem(view, plateau)` returns `This view does not exist.` (not an object), `This view has no element.`, `The element “x” does not exist any more.` (not in the plateau, and the workspace has no plateau that declares it), `None of the elements it was pinned on exists any more.` (a map), `The editor does not draw the viewpoint “v”.`, and, through `viewLacksInPlateau`, `The element “x” is not in the plateau “p”.`. `stepProblem` adds `The view “v” does not exist any more.` and `This step has no view.`. Callers of `stepProblem`: lines 20349, 20621, 20751, 21287, 21372; the player's scene and the bar show the text as it is.
- The command line also warns, not fails, for a plateau that lacks the element (``skip `v`: it names `x`, which the plateau `p` does not have``, `ViewInPlateau`), for a viewpoint it does not generate, and fails for a facet that removes the element (``the view `v` cannot be drawn: it names `x`, which the facet `f` removes``, `GenerateViewsCommand`). The editor has its own words for each.
- `CLAUDE.md` records the gap: "Not aligned, recorded: the editor's `This view has no element.` (`viewProblem`, the voice of the page's view problems) and the command line's `the view v has no element: write the reference ...` (#158) are different words for one mistake."
- Tests and data that quote the words (a search of `src/test`, `src/doc`, `src/main` for `has no element`, `does not exist any more`, `This view does not exist`, `This step has no view`): `library-view-edit.test.js` (lines 431, 434, 972, 974: `has no element`), `library-view-diagram.test.js` (lines 433, 465), `library-view-panels.test.js` (line 137), `view-layer-any-case.test.js` (line 89), `src/test/resources/brightcart/negative-cases.json` (lines 2820 and 2832: the `viewProblems` the editor tells for a layered workspace whose view names `commerce.cartt`), `ViewWithoutPropertiesTest` (SENTENCE) and `GuideViewPropertiesTest` (line 113, `contains("has no element")`, unaffected). No other test, no spec of `src/test/e2e`, and neither `guide.md` nor `golden.md` quotes either sentence.

# Proposed Design

DEC-1 — One file of cases, read by a Java test and a node test
- Decision: add `src/test/javascript/viewpoint-kernel/view-problem-cases.json` with the shape of `dangling-reference-cases.json`: `comment`, then `cases`, each `{ id, what, files, view, cli, editor }`. `files` maps a path to its text (a workspace with no plateau, `settings.manifests.paths: ["manifests/**"]` as in `DanglingReferenceCasesTest`); `view` is the id of the saved view the case is about; `cli` is `{ "<command>": [<error lines without the "error: " prefix>] }`, the command being `views generate -i <view>` or, for a step, `stories generate`; `editor` is `{ "problem": "<sentence>" }`, the return of `viewProblem` (or `stepProblem` for a step). A case asserts that the editor's problem equals the command line's line. Two readers: `ViewProblemCasesTest` (`src/test/java/io/morin/archicode/cli/`, as `DanglingReferenceCasesTest`) and `view-problems.test.js` (as `dangling-references.test.js`).
- Rationale: the repository already solved "one mistake, two tools, one sentence" this way (#159); the pattern is proven, reviewed and cheap to read. Each case is both a spec and a regression for the two tools.
- Alternatives considered: a shared constant in the kernel (the sentence is Java and JavaScript text, not kernel output; a kernel change moves the `.wasm` for a message); a Java-only test that greps `standalone.html` (does not run the page); asserting only `contains("has no element")` as today (what hid the gap).
- Tradeoffs: a second file of cases to keep; the two readers duplicate the loop, which is the existing pattern.
- Linked requirement IDs: REQ-1.

DEC-2 — The sentence of a view with no element is the command line's, with the id in backticks, in both tools
- Decision: the shared sentence is ``the view `v` has no element: write the reference of one in `properties.element` ``. The command line adds the backticks round the id (ASM-4); the editor returns that sentence from `viewProblem`, using the view's id. For a step with an inline recipe the id is `step_NN` (two digits, from 01), the same the command line gives it: `viewProblem` takes an optional third parameter `name` (default `view.id`), and `stepProblem(step, plateau, number)` takes the step's place and passes `step_NN`. Every caller of `stepProblem` (20349, 21287, 21372 and the scene at 20621/20751) knows or can compute the step's place and passes it; the executor reads the five call sites and adds the number to each.
- Rationale: the command line's sentence is released and tells the author what to write; the editor's shorter text tells less. The editor already shows lower-case sentences of the load (ASM-2).
- Alternatives considered: move the command line to the editor's words (loses the instruction; breaks 0.20.0, `ViewWithoutPropertiesTest`, the manual and the guide); keep two sentences and document them (what #170 asks to stop).
- Tradeoffs: the editor's panel is longer for this one mistake; the sentence mentions a YAML key to an editor user, who sees it in the view form (`properties.element`) under another name (the Element field): accepted, the same is true of other load sentences the page shows.
- Linked requirement IDs: REQ-2, REQ-3.

DEC-3 — A view that names an element that exists nowhere: one new sentence, in both tools
- Decision: the shared sentence is ``the view `v` names `gone`, which does not exist``. The command line produces it in `KernelViewpointFactory.create` from the kernel's `dangling reference: X` or `unknown focal element: X` when `danglingSentence` found no element holding X (so an element that holds X still gets the sentence of #159, as today) and X is the focal element of a view that is not a map; the editor returns it in the branch that said `The element “x” does not exist any more.` (the branch where `viewLacksInPlateau` is null). The rewrite is of the message, after the kernel answered, so a comparison or a facet cannot change what is refused. The two kernel messages are matched by one pattern placed next to `DANGLING`; `unknown focal element` is only ever said of the focal element, and `dangling reference` is compared with it; a map keeps `the view v: dangling reference: gone` (see DEC-4 and DEF-1).
- Rationale: today the command line's message is the kernel's internal word, with no view; the editor's says "any more", which is false for a view that never had the element (a new file with a typo). One sentence that names the view and the element fits both. It is the plateau-free cousin of the load-time ``the view `v` (`file`) names `x`, which exists in no plateau`` (which also gives the file, because it is read from the manifests; `create` has the view but not its file).
- Alternatives considered: a rewrite of `dangling reference` only (leaves the `detailed` view with the kernel's `unknown focal element: gone`, a second sentence for one mistake, found by running the jar on each viewpoint); a check of the focal element before calling the kernel (can refuse a view the comparison union could draw, as a removed element; the message-only rewrite cannot); say "exists in no plateau" (false for a workspace with no plateau); add the file (the factory does not know it; DEF-2).
- Tradeoffs: the editor no longer hints that the element was there before ("any more"); a view of a deleted element reads the same as a typo, which is accurate.
- Linked requirement IDs: REQ-2, REQ-3.

DEC-4 — The other view problems are listed, not aligned, each with its reason
- Decision: the case file's `comment` and `CLAUDE.md` list what stays different on purpose:
  - the unknown viewpoint (command line: warning ``skip `v`: the viewpoint `x` is not generated by the command line``; editor: `The editor does not draw the viewpoint “x”.`): the two tools do not draw the same set of viewpoints, so the facts differ;
  - the plateau that lacks the element or the pinned entries (command line: warnings ``skip `v`: it names `x`, which the plateau `p` does not have``; editor: `The element “x” is not in the plateau “p”.`): a warning that skips against a status of the view in the page, pinned by the goldens, N81, N82 and the byte-identity harness; moving them moves more files than this run is for;
  - the map pinned on missing entries (command line: any missing entry is an error in a workspace with no plateau; editor: only when none exists): different behaviour, not different words (DEF-1);
  - the facet that removes the element (``the view `v` cannot be drawn: it names `x`, which the facet `f` removes``, only with `-i`; the editor's `facetRemovesElement` shows the error as the view's error): already told once, run 0119;
  - a layered workspace whose view names an element declared in no plateau: the command line stops at the load with ``the view `v` (`file`) names `x`, which exists in no plateau`` (K04 and K05) and never reaches the sentence of DEC-3; the editor tells the same load sentence in its banner and the sentence of DEC-3 on the view's own page. Two sentences in one tool, a load check and a view status, which the editor has always had; the `viewProblems` of `negative-cases.json` follow DEC-3;
  - `This view does not exist.`, `The view “v” does not exist any more.` and `This step has no view.`: states of the page's own lists (a view removed while a story step points at it), with no command-line twin (the load refuses the step as a view not declared).
- Rationale: the wave asks to list the others and align those the file covers; aligning a warning with a status is a product decision, and the cheap wins are the two sentences of an error.
- Alternatives considered: align all of them now (moves the byte-identity exceptions, the Brightcart goldens and about ten node tests for no author-visible gain); say nothing (the next reader repeats the search).
- Tradeoffs: the "Not aligned" note in `CLAUDE.md` is not removed but rewritten with the list above, shorter and exact.
- Linked requirement IDs: REQ-3, REQ-5.

# Repository Impact

- IMP-1 — Command line sentences
  - Path(s): `src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java`
  - Change type: modify
  - Why impacted: backticks round the view id in `has no element` (DEC-2); the rewrite of `dangling reference: X` and `unknown focal element: X` into ``the view `v` names `X`, which does not exist`` for a non-map view (DEC-3), placed where `danglingSentence` is applied (lines 285 to 287), only when `danglingSentence` returned the kernel's own words and X is the focal element.
  - Linked PRD IDs: REQ-2, REQ-3
  - Risks / notes: no output of a command that succeeds changes; a step named `step_NN` takes the same path. PMD: no `// NOPMD`.
- IMP-2 — Editor sentences
  - Path(s): `src/main/resources/editor-webapp/standalone.html` (`viewProblem`, `stepProblem`, their five call sites)
  - Change type: modify
  - Why impacted: the two sentences of DEC-2 and DEC-3, the `name` parameter and the step number (`step_NN`, two digits).
  - Linked PRD IDs: REQ-2, REQ-3
  - Risks / notes: keep the lines the page script has: the file is out of Prettier; the node suite, ESLint and the comparison with the released page guard it. `applySavedView` returns the sentence to its caller unchanged.
- IMP-3 — Manual text that quotes the sentences
  - Path(s): `src/doc/README.adoc` (line 1525, in `[[upgrade-0-19]]`, already writes ``the view `v` has no element: ...`` with the backticks the code lacks today; a search of the manual for `This view has no element` and `does not exist any more` finds nothing else), `src/main/resources/guide/guide.md` and `src/test/resources/guide/golden.md` (a search finds neither sentence)
  - Change type: none expected; verify by the search at the start of the work
  - Why impacted: the manual is the side that is right (the backticks are what DEC-2 gives the code); nothing changes unless the search finds a quotation of the old words.
  - Linked PRD IDs: REQ-2
  - Risks / notes: if the guide golden moves, regenerate it with the command of `CLAUDE.md` in the same commit.
- IMP-4 — The case file
  - Path(s): `src/test/javascript/viewpoint-kernel/view-problem-cases.json`
  - Change type: additive
  - Why impacted: DEC-1. Cases (each a workspace with one system `shop` and one view or one story): V01 an overview with no `properties`; V02 `properties: {}`; V03 `properties: {element: ""}`; V04 a `detailed` and a `deep` view with no element (one case per viewpoint or one case with a list of viewpoints); V05 a story step with no `properties` (`step_01`, command `stories generate`); V06 a view whose element does not exist (`overview`); V07 the same for a `detailed` view (the kernel says `unknown focal element`) and V07b for a `deep` view; V08 a view whose element does not exist, in a workspace where a relationship destination of `shop` is also missing (the sentence of #159 wins: the case pins that DEC-3 does not hide it, with its two lines in the order the command prints them).
  - Linked PRD IDs: REQ-1
  - Risks / notes: cases are written from the output of the packaged jar before the change (the old sentences) and then corrected, as the cases of #159 were.
- IMP-5 — The two readers
  - Path(s): `src/test/java/io/morin/archicode/cli/ViewProblemCasesTest.java` (new, modelled on `DanglingReferenceCasesTest`), `src/test/javascript/viewpoint-kernel/view-problems.test.js` (new, modelled on `dangling-references.test.js`: `loadWorkspace`, `loadViewpointKernel`, then `viewProblem(findSavedView(view))` or `stepProblem(step, null, 1)`)
  - Change type: additive
  - Why impacted: TG-2. The Java test also fails on a stack trace and on a case with an extra line.
  - Linked PRD IDs: REQ-1
  - Risks / notes: node tests are collected by the glob of `npm run test:unit` and by the coverage floor (the new test raises nothing it must not lower). The Java test counts for the 0.90 floors.
- IMP-6 — Tests that quote the old words
  - Path(s): `src/test/java/io/morin/archicode/cli/ViewWithoutPropertiesTest.java` (SENTENCE gains the backticks, and `step_01`), `src/test/javascript/viewpoint-kernel/library-view-edit.test.js` (lines 431, 434, 972, 974), `library-view-diagram.test.js` (433, 465), `library-view-panels.test.js` (137), `view-layer-any-case.test.js` (89), `src/test/resources/brightcart/negative-cases.json` (`viewProblems`, lines 2820 and 2832; the only reader of that key is `brightcart-negative.test.js`, node only; the three entries that say `is not in the plateau` stay, DEC-4), and anything else the search of Current State finds when it is run again
  - Change type: modify
  - Why impacted: the words move. A match on `does not exist any more` that is about a deleted view or an element deleted from the page (the Move dialog and the pills say `This element does not exist any more`) stays: DEC-3 changes the sentence of `viewProblem` only, not those of `stepProblem` for a view that is gone.
  - Linked PRD IDs: REQ-4
  - Risks / notes: change a test to the new text only after reading why it asserts the old one.
- IMP-7 — `CLAUDE.md`
  - Path(s): `CLAUDE.md`
  - Change type: modify
  - Why impacted: the "Not aligned, recorded" sentence under "A dangling reference says where it is" is replaced by the sentence on the new file (`view-problem-cases.json`, `ViewProblemCasesTest`, `view-problems.test.js`, the two covered sentences) and the list of DEC-4; the sentence quoted in "No author mistake in one key ends in a stack trace" already has its backticks and is left as it is.
  - Linked PRD IDs: REQ-5
  - Risks / notes: `CLAUDE.md` already has uncommitted changes from other runs of the wave in the working tree: edit only these paragraphs.

# Canonical Impact

Not applicable — no canonical registers declared (there is no `docs/CLAUDE.md` and no `arc` or `dom` register in this repository).

# Data Model and Contracts

- CTR-1 — The case file of the view problems
  - Current contract: none.
  - Proposed contract: `view-problem-cases.json` as in DEC-1. Fields: `id` (`V01`...), `what`, `files` (path to text), `view` (id of a saved view, or a story id for a step), `cli` (as in DEC-1: for each command, the lines printed after `error: `, exit 1), `editor.problem` (the sentence the page returns). The Java reader asserts the lines of `cli` and fails on a stack trace or an extra line; the node reader asserts `editor.problem`, and that it equals the single line of every `cli` entry.
  - Affected files: the file, `ViewProblemCasesTest.java`, `view-problems.test.js`.
  - Migration or compatibility notes: additive, test resource only; not shipped, not part of the jar.
  - Linked PRD IDs: REQ-1
- CTR-2 — Two error sentences (user-visible text)
  - Current contract: ``error: the view v has no element: ...`` and `error: dangling reference: gone` on the command line; `This view has no element.` and `The element “x” does not exist any more.` in the editor.
  - Proposed contract: ``the view `v` has no element: write the reference of one in `properties.element` `` and ``the view `v` names `x`, which does not exist`` in both. No key, exit code or file changes; the kernel's contract number does not move.
  - Affected files: IMP-1, IMP-2, IMP-3, IMP-6.
  - Migration or compatibility notes: a script that matched the old command-line text breaks; the first was released in 0.20.0 and told in `[[upgrade-0-19]]` terms by `README.adoc` line 1525. The manual's upgrade block for the next release (`[[upgrade-0-20]]`, if the wave adds one) should name both sentences; DEF-3.
  - Linked PRD IDs: REQ-2, REQ-3

# Interfaces and Behavior

- IF-1: `archicode views generate -i v` and `archicode stories generate`: stdout and the files unchanged; stderr and exit code unchanged for a success; for the two mistakes the line has the new words, exit 1.
- IF-2: the editor's page of a saved view, the `broken` badge, the story bar and the story player show `viewProblem`/`stepProblem` text as it is; the text for the two mistakes has the new words. Nothing is written, no model changes, no `modelsChanged()`.
- Error states: an `element` that is a list or an object: the command line reads `properties.element` as text (`asText("")` gives blank) and says `has no element`, and so does the editor (`typeof properties.element !== 'string'`); an `element` that is a number or a boolean differs (the command line reads it as the text `"5"` and says the element does not exist, the editor says `has no element`): no case covers it, DEF-4.

# Flows and Processing Logic

- FLOW-1 — A view with a mistake, in each tool
  - Trigger: `views generate -i v`, `stories generate`, or opening the view in the editor.
  - Steps: (command line) `create` finds the focal blank and throws the sentence of DEC-2; or calls the kernel, and on `dangling reference: X` rewrites it by `danglingSentence` (#159), else by DEC-3. (editor) `viewProblem` returns the same sentence for the blank focal, and for an `element` that `index[layer]` lacks and `viewLacksInPlateau` does not explain.
  - Branches / failure paths: a layered workspace whose plateau lacks an element that another plateau has is not one of these (the command line warns and skips, the editor says the element is not in the plateau, DEC-4); a map has no element and keeps its sentences.
  - Final output / rendered result: one `error:` line, exit 1; or the sentence in the page.
  - Linked PRD IDs: REQ-2, REQ-3

# Reliability, Performance, and Scalability

No effect on a drawn view: the rewrite runs only after the kernel refused, and the page check is the existing one. Maintainability is the point: one file of cases holds the two tools to the same words.

# Security and Privacy

None. The sentences quote names the author wrote in their own manifests, as every other sentence does; the editor escapes the text it shows (`escapeHtml` is already applied where `viewProblem` is rendered; the executor checks that no new call site inserts it raw).

# Observability and Verification

- `./mvnw test -Dtest=ViewProblemCasesTest,ViewWithoutPropertiesTest,DanglingReferenceCasesTest,GuideViewPropertiesTest` then `./mvnw test-compile pmd:check`.
- `node --test src/test/javascript/viewpoint-kernel/view-problems.test.js src/test/javascript/viewpoint-kernel/library-view-edit.test.js`, then `npm run format:check`, `npm run lint`, `npm run test:coverage` (the floors must hold).
- `./mvnw verify -DskipITs=false` (jar-level: `ViewsAndQueriesIT`, `GuideIT`, `StoriesGenerateIT`), `npm run test:e2e` for the specs that read a view problem (none is known; the search of IMP-6 covers `src/test/e2e`).
- `scripts/byte-identity.sh`: the sentences are not produced for any shipped workspace; the harness must report no difference without a new exception.
- Negative check: put the old text back in one tool, see the case fail in that tool's reader, restore it.
- Manual check: run the packaged jar on a copy with a view with no element and with a view on `gone`, read the two lines.

# Deployment and Rollout

Code and text only (command line sentences, editor page, tests, manual). No data migration, no rollout step. Rollback is a revert of the commit. The page is distributed in the jar and the website with the next tag.

# Risks and Tradeoffs

- RISK-1: the rewrite of DEC-3 catches a `dangling reference: X` that is not the focal element (a facet or a comparison case). Mitigation: it compares X with the focal element of the view before it rewrites; every other X keeps the kernel's words; V08 and the existing `DanglingReferenceCasesTest` pin it.
- RISK-2: a test or a script outside the repository matches the old command-line text. Mitigation: it is one release old; CTR-2 names the break.
- RISK-3: the page's sentence appears in a place that assumed a short text (the `broken` badge's title is fixed, the center panel wraps; the 360 px measures of `editor-at-360-px.test.js`). Mitigation: read the call sites in IMP-2; the sentence is one line plus the id.
- RISK-4: the editor cannot name a step with no place. Mitigation: IMP-2 requires the five callers to pass it.

# Open Questions

None. Whether the plateau-lacks warning and status (DEC-4) are aligned later was Q-1; it is a deferral, not a question this design needs answered (DEF-5).

# Deferred Work

- DEF-1: a map pinned on some missing entries: the command line refuses, the editor draws the others (different behaviour, not words); a later run decides one rule for both.
- DEF-2: the file of the manifest in the sentence of DEC-3, as the layered sentence gives it.
- DEF-3: a line in the manual's next upgrade block naming the two changed sentences (the release notes are written at release time).
- DEF-4: `element: 5` (a number) in the command line and in the editor.
- DEF-5: the warnings and statuses of DEC-4, one voice.

# File Placement and Frontmatter

Saved as `docs/wav/wav-024-fixes-and-editor-modules/run/run-0180-view-problem-sentences/tdd-0180-view-problem-sentences.md`, with `type: tdd`, `run: 0180`, `wave: 024`.

# Review

Review pass: dispatched. KDMLLC review of the TDD by a fresh agent, a different one from the drafter, with the repository (`KernelViewpointFactory`, `standalone.html`, the kernel's `lib.rs`, the tests and the manual) as the referent. Findings applied: the `detailed` view says `unknown focal element: X`, not `dangling reference: X` (confirmed by running the packaged jar on one view per viewpoint; DEC-3, IMP-1, IMP-4, ASM-3, Current State); the manual and `CLAUDE.md` already write the backticks (IMP-3, IMP-7); the list of tests that quote the words was wrong and omitted `negative-cases.json` (Current State, IMP-6); `cli` and `command` of the case file were stated two ways (DEC-1, CTR-1); the layered load sentence and the per-view sentence stay two (DEC-4); the error-state wording on a numeric `element` contradicted itself (Interfaces); Q-1 duplicated DEF-5 (Open Questions).
