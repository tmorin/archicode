---
type: run
run: 0143
status: completed
profile: single-document
wave: 019
---

# Run 0143: kernel-cost-on-large-pairs

Wave 019, W-7. quiet and apply_patches stay quick on a large pair of plateaus (#125, decision T8).

## Scope

Issue #125: on the pair `replaces-large-pair` (591 elements, 839 changes, the largest of the repository, measured by `src/test/javascript/viewpoint-kernel/performance-budget.test.js`, issue #118)
the number of kernel calls does not grow with the elements, but the time of one call does. T8: at least halve the median of the first `quiet` and of `apply_patches` for that pair, or
say what the floor is and why; lower `compare` and the Map `compute` if the same work serves them; tighten the budget of the test to the new measure, with a margin.

The output does not change. Kernel contract stays 5, no key or shape moves. Out of the run: the manual (`src/doc`, W-9 owns it), GitHub issues (not closed or commented here).

## What was slow, and what changed

Found with `perf` on a native build of the kernel and the inputs the editor really sends (recorded, see Verification).

1. **`quiet` rebuilt what every view reads, once per element.** `quiet_json` calls `build` for each focal element, and `build` made the map of the elements by reference, ran
   `find_egress` and `find_ingress` over every element (each making a `BTreeSet` of the relationships of every element it looked at), made `above_changes` (a join of every prefix of
   every changed reference), and, in the technology layer, the dependencies between environments again. All of it depends on the elements, none on the focal element: it grew with the
   square of the elements. `lib.rs` has a `Shared` (the two lists of elements by reference, the relationships of each element once, without duplicates and in order, the derived and
   local dependencies, the references above a change), worked out when a view first asks for it. `build` makes one for its own call; `quiet` makes one for all its focal elements, and
   `mark_expandable` one for all the boxes it tries to open (the unfolded Map). `Shared` borrows the two lists of elements and not the whole input, so that `quiet` can change
   `input.viewpoint` and `input.focal` while it is held (disjoint fields). `Derived`, `derived_dependencies`, `local_dependencies` and `relationships_of_deployed` take the two lists
   instead of the input.
2. **`apply_patches` read the whole graph twice for every patch.** `remove_nodes` made the set of references before and after each `REMOVE`, and `apply_one` did the same around every
   `SET`/`ADD`/`MERGE`: 216 patches on 591 elements were about 430 walks of the tree (a `format!` and a `HashSet` insert per node), then a walk to drop what points at a removed element.
   Now: (a) a patch with a `field` cannot change an `id` or the nesting (`check` refuses `id`, `parent` and `elements`), so it does not read the references; (b) `RefCounts` in
   `facet.rs` counts how many times each reference is held, once, and a `REMOVE` of elements only subtracts the references of the subtrees it removes (`subtrees_of`; the count
   keeps duplicates exact: an element declared twice is gone when both are); it reads the document again when a removed node is not an element, a path is inside another, an element
   has no `id` on the way, and a patch without `field` or a removal of anything but an element empties what was kept (a field of an element may be its `id`); (c) the walks read the
   few keys of an element in one pass instead of hashing five names, and `drop_references_to` builds a reference only for what it takes out and does not rebuild a list nothing leaves.
   The facets (`apply`) use the same `remove_nodes` and keep the counts across their actions.
3. **Not changed, and why (the floor).** `compare` (about 105 ms in the page, 25 ms in WebAssembly, 8 ms native) is flat in `perf`: allocation, comparison of strings and the
   candidates of `replaces`, nothing shared between calls to take out, and it is called once per comparison. The Map `compute` of the application layer at 591 elements is 65 to 70 ms in
   the page, of which most is the page's JSON in and out (427 KB); the unfolded Map (34 boxes open) costs 140 ms native because `mark_expandable` has to build the view again
   for every box that could open, and each build is the Map's own work (`with_ancestors`, `emit_links`, `merge_links`, spread out). A shorter `visible` and `project` (no join) and an
   `is_ancestor_of` with no allocation were tried in the Map and measured no gain, so were left out. Only the Map of the technology layer gained from `Shared`. An incremental
   `mark_expandable` would change how the answer is found, not only its cost: deferred (see Deferred).

## Measures

Same machine, same method. The medians are of the time the kernel took in the page of the editor for the step (the performance-budget scenario: real page, real kernel, fake layout),
`kernelMs` of `performance-budget.test.js`, **5 runs of the test of the old tree (HEAD, a `git worktree`) interleaved with 5 runs of the new tree** (one old, one new, five times, so
that the drift of a laptop falls on both), the machine otherwise quiet. Times in ms.

| Step | 82 elements before | 82 after | 591 before | 591 after | 591 before/after |
|---|---|---|---|---|---|
| first `quiet` (the step "first render") | 16.1 | 10.2 | 301.2 | 77.5 | 3.9 times less |
| `apply_patches` (the step "draw the plateau", 2 calls at 591) | 19.8 | 13.4 | 356.4 | 69.3 | 5.1 times less |
| `compare` | 8.1 | 8.2 | 103.7 | 131.6 (min 113.2; max 217.7: noise, unchanged code) | unchanged |
| Map `compute`, application, folded | 6.2 | 6.2 | 70.0 | 72.3 | unchanged |

The kernel alone (WebAssembly as the editor embeds it, the same recorded input replayed in Node, median of 7 runs, an interleaved before and after, 3 rounds):
`apply_patches` of the 216 patches 164 to 22 ms (7 times; 277 to 36 ms on the slower hour), `quiet` of the 591 elements 175 to 39 ms (4.5 times); the technology Map 80 to 27 ms;
the first Map `compute`, `compare`: unchanged. Native (`opt-level 3`, first version of the change): `quiet` 131 to 20 ms.

T8 is met for the two entries: both are more than halved by the median of the page (3.9 and 5.1 times), and the growth with the elements is gone: `quiet` took 18.7 times as long at
591 elements as at 82 (7.2 times more elements) and now 7.6 times, `apply_patches` 18.0 and now 5.2. The floor of `quiet` is now the JSON of the input, the per-view
grooming and the items themselves (a view of every element must still be built to know if it has a link that is not secondary).

## The budget

`performance-budget.test.js` asserted only counts. It now also bounds, for the two entries (`TIME_BUDGET`, `timeProblems`), the time at 591 elements as a ratio to the time at 82 in the
same run (limits 12 for `quiet` and 10 for `apply_patches`: old 18.7 and 18.0, new 7.6 and 5.2; in three runs of the whole JavaScript suite at once, the machine loaded by the other test files,
the new ratios were at most 7.7 for `quiet` and 6.7 for `apply_patches`, so the limits keep a margin of 1.5). An absolute ceiling in ms was tried first and removed: the same
`quiet` took 78 ms alone and 570 to 630 ms in two of the three full runs, so a ceiling fails for the load, not for the code. The test fails on the old kernel (checked on the worktree of HEAD)
and holds on the new one; a unit test of `timeProblems` shows it tells a ratio that grows, does not tell a slow machine, and does not pass a step that made no call. The other times stay
recorded, not asserted (`compare` and the Maps move by 50 % from one run to the next on the same code).

## Verification

Run on the final tree, after the last edit (JDK 25):

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 1258 unit tests, 0 failures (2 skipped, as before), 27 integration tests, 0 failures, BUILD SUCCESS.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 240 passed (233 before; 7 new in `patch_tests.rs`: a run of patches gives what the same patches one at a time give,
  with duplicates, elements with no `id`, a path inside another, `SET` with and without `field`, a removal of an `id`, the facets; and the references a removal says are gone against
  the document read before and after).
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (794709 bytes)", exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 2401 tests, 2401 pass (run twice more after the last edit of the test, both green; the run before the ceiling was removed failed twice in three, see The budget).
- `npx prettier --check "src/**/*.java"`: all matched files use Prettier code style.

**Byte identity.** (1) Every call the kernel got in the 2399 JavaScript tests was recorded (a preload wraps `WebAssembly.instantiate` in every realm of the tests: name, input, output; 10676
distinct calls: 9672 `compute`, 487 `apply_patches`, 376 `quiet`, 141 `compare`) with the old kernel; the new kernel gives the same bytes for all of them (0 differences). (2) The jar of HEAD (built
from a worktree) and the jar of the new tree were run on every workspace of the repository (the 20 `workspace.yaml` of `src/doc/examples` and `src/test/resources`, among them the layered Brightcart,
`replaces-large-pair`, `plateau-comparison`, `domain_plateaus` and `viewpoint-kernel/workspace`): `plateau list`, then for each plateau `views generate`, `diff` and `query graph`, and `stories generate`;
`diff -r` of the folders and of the output: no difference, 15447 files in all (3825 for the layered Brightcart, 9563 for `replaces-large-pair`). The jar of `archicode-0.17.0` was not needed: W-4 changed technology views, so the base is HEAD.

## Canonical impact

None. No contract, key, shape or sentence of the kernel, of the editor or of the command line changes (the kernel contract stays 5; `RefCounts` and `Shared` are private to the crate), so no
`CI-arc`/`CI-dom` item, no ADR and no domain packet is concerned. The kernel README gains two bullets (what the views share; how the patches count the references), because its text on
`quiet` and `apply_patches` said how they work. `CLAUDE.md` says nothing of the cost and is unchanged.

## For W-9 (the manual)

`src/doc/README.adoc`, around line 1516, the limit "The editor is slow on very large pairs of plateaus (#125)": it says that the first call that finds what has nothing to draw takes about half a
second for the 591 elements of the test pair, ten to thirty times longer for seven times more elements. It is now about 0.1 second (a third of a second before) and grows with the elements;
what still grows faster than the elements is the unfolded Map (one build for each box that could open), and nothing shipped is that large. W-9 decides whether the limit stays, shortened,
or goes.

## Deferred

- `mark_expandable` builds the whole Map again for every closed box that could open (34 boxes open: 140 ms native). An incremental answer (does opening this box change the view) would
  be a change of algorithm with a risk to the output; to be filed as a GitHub issue if a real workspace is slow (the user decides; not filed here).

## Tasks

- [x] Measure the old tree (HEAD) in the page (5 runs, interleaved), in WebAssembly and native; record the calls of the whole JavaScript test suite as the oracle.
- [x] `Shared` for `quiet`, `build` and `mark_expandable`.
- [x] `RefCounts`, `subtrees_of`, one-pass walks for `apply_patches` and the facets.
- [x] Cargo tests; re-embed the wasm.
- [x] Tighten `performance-budget.test.js`; fails on the old kernel.
- [x] Byte identity: recorded calls and the two jars.
- [x] Verification set on the final tree (results above and in the report).
- [x] Commit.
