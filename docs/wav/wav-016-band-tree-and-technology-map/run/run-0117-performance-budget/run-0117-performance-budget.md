---
type: run
run: 0117
status: completed
wave: 016
---

# Run 0117: Performance budget

Wave 016 (`band-tree-and-technology-map`), item W-11 (phase P2). Focus: the first render, the Map, `quiet` and the Changes list at the size of the largest fixture (600 elements, 839 changes) do not grow faster than the elements (#118)

Document profile: `single-document` (one new node test; the page and the kernel are not changed; the review passes are answered below).

## Scope

In: `src/test/javascript/viewpoint-kernel/performance-budget.test.js` (new, 10 tests).

Out: the page (`standalone.html` is unchanged: no count grows with the elements), the kernel and the `.wasm` (unchanged, so no `embed.sh`), the manual and `CLAUDE.md` (W-12's; `CLAUDE.md` does not describe how the page is measured, so no sentence to change).

## Decisions

- **D1. Two sizes, both real.** 82 elements and 65 changes: the layered Brightcart, plateau `marketplace` compared with `inhouse` (the size of runs 0095 and 0103). 591 elements and 839 changes: the invented harbour of `replaces-large-pair`, plateau `after` compared with `before` (the pair of wave 011; `after-declared` has only 360 changes, `after` has the 839 of the issue). The sizes are asserted, so a fixture that changes size fails the test instead of weakening it.
- **D2. What is counted, how.** The four kernel entries the page calls (`compute`, `quiet`, `compare`, `applyPatches`; `states` is read once at the load, `apply_facet` is not an entry of the page) are wrapped on the object the page holds (`loadedKernel`), so every call is counted whoever makes it. The rows of the table of changes are read through proxies installed in the page's own comparison cache: every property read of a row and every index read of the table is a read. Both are reset by each step of one scenario that is the same on both sizes: draw the plateau, compare, first render of an element through a facet (`commerce` / `berth-allocation`, tab Overview, a facet that removes two persons), render again, ask `quiet` again, the Map of each layer folded and then *Unfold all* until nothing is left to unfold, the page Plateaus, the list of changes, ten steps of the walk, a filter and back.
- **D3. What is asserted.** Kernel calls are asserted equal where they depend on nothing but the structure: one `applyPatches` for each plateau of the tree that has patches (the page resolves every plateau, 3 and 2 here), one `compare` for the comparison and one for each plateau but the root on the page Plateaus (3 and 3), at most one `compute` on a page drawn, three at most for the first render of an element (the diagram and the tabs that have something to draw), exactly one `quiet` per layer, no kernel call for a second render, a second `quiet`, the list, the walk and the filters, and exactly one `compute` for each render of a Map, folded or unfolded, in either layer. Reads of the rows are asserted per row: the list may read every row (it shows every row) but not more often per row at 839 rows than at 65 (limit: a quarter more), and under 200 reads per row in all. A tool that would count nothing passes any page, so the list is checked to read every row at least once.
- **D4. The times are recorded, not asserted** (`t.diagnostic`, one line for each step at both sizes, with the time spent in each kernel entry, and one line for each Map with the boxes of each unfold). They are in the table below. The layout engine of the harness is a fake: the ELK layout of the extra boxes (the cost run 0114 named) is not in them.
- **D5. A budget that cannot fail checks nothing.** Two tests run the scenario on a page made to grow, at both sizes, and expect the comparison to say so: `quietReferencesThroughFacet` replaced by one `compute` per element (83 and 592 `compute` for the first render, the comparison names the entry and the two sizes), and `orderedChangeRows` replaced by a version that filters every row for every row (the panel and the walk are reported as reads per row). A last test runs the two comparison functions on made-up numbers.

## Tasks

- [x] T1. Read #118, the plan, runs 0095 (F5), 0103 and 0114, the harness, and measure the page by hand (kernel calls, row reads, times) at both sizes.
- [x] T2. `performance-budget.test.js`: the meter, the scenario, the assertions, the times, the two pages that grow, the comparison functions.
- [x] T3. Review pass (below), gate, this document, one commit.

## Result: the page holds, nothing is changed

No count grows with the elements. At 82 and at 591 elements the calls to the kernel are the same, step by step (table below), and the reads of the rows are 62 per row at both sizes for a render that shows the list (62.5 at 65 rows, 61.6 at 839), 84 and 78 per step of the walk (843 and 775 for ten steps), 169 and 147 for a filter and back. Nothing in the page asks the kernel once per element (the `quiet` entry of run 0095 is what keeps it so) or reads the table once per row.

| Step | kernel calls (82 and 591 elements) | reads of the rows per row (65 and 839 rows) |
|---|---|---|
| draw a plateau | `applyPatches` 3 and 2 (one per plateau of the tree with patches), `compute` 1 and 1 | 0 and 0 |
| compare | `compare` 1 and 1, `compute` 1 and 1 | 0 and 0 |
| first render of an element through a facet | `compute` 3 and 3, `quiet` 2 and 2 | 125 and 123 (two lists drawn) |
| render again, `quiet` again | 0 and 0 | 62 and 62, 0 and 0 |
| Map, application layer, folded, unfolded | `compute` 1 each render | 62 and 62 |
| Map, technology layer, folded, unfolded | `compute` 1 each render | 62 and 62 |
| page Plateaus | `compare` 3 and 3 (one per plateau but the root) | 62 and 62 |
| list of changes, ten steps of the walk, a filter and back | 0 and 0 | 62 and 62, 843 and 775, 169 and 147 |

## Times, as recorded (median of three runs, Node 24 on the author's machine, a fake layout engine, ms)

Wall time of the step (the action and the drawing it waits for); in brackets the time spent in the kernel entry.

| Step | 82 elements | 591 elements | ratio (elements: 7.2) |
|---|---|---|---|
| draw the plateau | 37 (`applyPatches` 20, 3 calls) | 379 (`applyPatches` 353, 2 calls) | 10 (17) |
| compare | 15 (`compare` 7) | 133 (`compare` 105) | 9 (14) |
| first render through a facet | 585 (`quiet` 16, `compute` 3) | 553 (`quiet` 474, `compute` 26) | 1 (29, 10) |
| render again, `quiet` again | 4, 0.3 | 19, 0.1 | |
| Map, application layer, folded | 126 (`compute` 5) | 115 (`compute` 71) | 1 (14) |
| Map, technology layer, folded | 117 (`compute` 3) | 34 (`compute` 13) | |
| page Plateaus | 147 (`compare` 6, three) | 327 (`compare` 142, three) | 2 (24) |
| list of changes | 1.5 | 16 | 10 (rows: 12.9) |
| walk, ten steps | 26 | 221 | 8.6 (rows: 12.9) |
| filter and back | 5.6 | 40 | 7 |

*Unfold all* (boxes drawn and wall time of each level): application layer, 82 elements 51 boxes in 413 ms; 591 elements 542 boxes in 398 ms then 664 in 109 ms; technology layer, 82 elements 21, 70, 90, 106 boxes in 46, 86, 51, 32 ms; 591 elements 71 and 224 boxes in 72 and 37 ms. (The wall time of the first step of the process is mostly the warming of the script; the 82-element pair is measured first: the 585 ms of the first render is that, not the kernel's 19.)

What the numbers say. The page's own work follows the rows: the list, the walk and the filters cost in proportion to the 12.9 times more rows (a step of the walk sorts the table, an N log N). The kernel does not follow the elements: for 7.2 times more elements its calls take between 10 and 29 times longer (`quiet` 29, `applyPatches` 17 over fewer calls, `compare` 14, a `compute` of the application Map 14). That is the limit run 0095 recorded as F5 (`quiet` builds the view of each element and each build reads the whole input), now measured, and it is inside the kernel, not in a count the page can change: the brief's rule is to fix only a count that grows, so nothing is changed here. A figure to start from if it is ever worth the work: 0.5 s for the first `quiet` of a page of 591 elements, once per model change (cached afterwards).

## Canonical impact

None to the model, the kernel or the shared contracts: a test. `CLAUDE.md` does not say how the page is measured, so it is left alone.

## Shipped files

None.

## Review pass, answered

No sub-agent was dispatched (a single test file read against a four-line brief; the work is small enough that a second reader's context would cost more than the pass). I read it against the brief myself:

- **KDMLLC read.** The brief says "assert that the number of kernel calls and the number of reads of the rows do not grow with the number of elements, at two sizes, 82 and 600; times recorded, not asserted": D1 to D4, in that order. A reader's first doubt is "reads of the rows that depend on the rows": answered in D3 (per row, with a quarter's slack, and a test that a quadratic list fails). No duplicated checks: the 100 ms figure of `quiet-references.test.js` stays there (it is a time that file chose to assert, from run 0095; this run asserts none).
- **C scan.** The comparison of `quiet-references.test.js` ("at most one `quiet` per layer, no `compute`") is the same claim for `quiet`, and this test agrees (2 `quiet` for the two layers; the 3 `compute` are the diagram and its tabs, not the tree). The issue says "the first render, the Map, `quiet` and the Changes list": each has its steps. The plan's "600 elements" is 591 in the pair; the run says 591.
- **Holes I found and closed.** (1) The first version counted the elements before the plateau was drawn (50 instead of 82): the sizes are now read after the draw and asserted. (2) A drawn page makes one `compute` of its own (the Map), which the first assertion forbade: at most one, equal at both sizes. (3) The mutation of `quiet` ran the whole scenario at 591 elements (38 s): it stops after the first render (`until`), 12 s. (4) The message of a count that differs lacked the unit: the regular expression of the mutation test pins it.
- **Not closed (nits).** The tolerance of a quarter on the reads per row is a judgement (the real figures differ by 2% to 13%, a quadratic list is off by a factor of 7); the three tests that print the times also pass if the numbers are odd, by design.

## Verification

Run by me on the tree as committed (JDK 25 not needed: no Java, page or Rust change):

| Command | Result |
|---|---|
| `node --test "src/test/javascript/**/*.test.js"` | 1900 tests, 0 failures (10 of them the new file, 24 s of the 112 s of the suite) |
| `npx prettier --check "src/**/*.java"` | clean |

`cargo test`, `embed.sh --check` and `./mvnw verify` were not run: the page, the kernel and the Java are unchanged (only a node test and this document are added).

Fail before, pass after: the new file passes on the unchanged page; with `quietReferencesThroughFacet` made to call `compute` for every element it fails with `first: compute is called 83 times at 82 elements and 592 times at 591 elements`; with a list that reads every row for every row it fails on the reads per row of the panel and of the walk.

## Not verified

- **The times of a browser.** Node, the kernel as WebAssembly in V8, no DOM, and a fake layout engine: ELK, the browser's layout, the style recalculation and the paint of 731 KB of list (839 rows) are not in them. The counts hold in a browser as they hold here (the page is the same script); the times are an order of magnitude for the page's own code and the kernel only.
- Edits (a save that rebuilds the index and the models) are not in the scenario: the plan lists the first render, the Map, `quiet` and the Changes list.
- The CLI (`archicode diff`, `views generate`) is not measured; it is not what #118 asks about.

## Findings

- **F1 (W-12).** Nothing in the manual changes for this run. If the wave's findings list the checks the page has, `performance-budget.test.js` is the one for the number of kernel calls and of reads of the rows (a new kernel call per element, or a list that reads the table per row, fails it).
- **F2 (later runs).** The kernel's super-linear cost is real and measured now: for 591 elements the first `quiet` is about 0.5 s, `applyPatches` 0.35 s for a plateau chain and `compare` 0.1 s. Directions, if the author ever has a workspace of that size: `quiet` builds a view per element (F5 of run 0095: share what `build` reads, or one pass over the links), `apply_patches` evaluates every selector over the whole tree. Not filed as an issue (the brief says findings go in the report); a number to put in one: 29 times longer for 7.2 times more elements.
- **F3.** The harness reads the 839 changes of the pair `after` / `before`; `after-declared` has 360 (the fixture the node tests of run 0103 use). A later test that wants "the 839" must draw `after`.
- **F4.** The commit says `Refs #118`; the issue closes with the wave's pull request (the plan's exit evidence says "closes #118": the dispatch says not to close issues).
