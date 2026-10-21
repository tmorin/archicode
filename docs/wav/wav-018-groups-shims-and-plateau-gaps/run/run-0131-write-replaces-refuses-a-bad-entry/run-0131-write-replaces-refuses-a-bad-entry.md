---
type: run
run: 0131
status: completed
wave: 018
profile: single-document
---

# Run 0131: write-replaces-refuses-a-bad-entry

Wave 018, W-4. Closes GitHub issue tmorin/archicode#130, decision D4: *Write replaces* refuses an entry its layer cannot hold, and says why.

## Scope

1. Before *Write replaces* writes `replaces: [from]` on the element `to`, check that `from` is an element of the plateau the manifest builds on; if not, refuse with one sentence (the element, the plateau, what to do) and write nothing.
2. The button of the Changes panel is off, with the reason, when this can be known without a write.

## Reading first

- `replaces` of an element is read relative to the plateau its manifest builds on (the plateau its plateau overrides). Wave 017 run 0125 made a comparison several layers apart compose the layers in between (`chain`, `replacesChainBetween`), so the table is right; the writer was not changed, so a `from` that a layer in between removed (R07, with `n` named `A`: `a` is removed by `p1`, `p2` adds `n`) was written into `p2`, where it names nothing.
- The kernel reads the entries of the target against the plateau just below the target only when `chain` is given (comparison two layers or more apart: `replacesChainBetween` not null). With no chain (one layer, or siblings one layer above what they share) it reads them against the plateau compared with, and `from` is by construction an element of that plateau (the existing checks of `acceptLayeredCandidate` already require it).
- The command line writes no `replaces` (`PlateauComparer` only reads them and composes the chain), so there is no matching rule to share.

## Decisions

- **Where the check lives: `replacesLayerProblem(layer, from, state)`, one function, called by `acceptLayeredCandidate` (the writer, after its other refusals, before it looks for the node) and by `renderCandidatesHtml` (the button).** One function means the sentence of the button and of a click that gets through anyway (a test, a stale panel) are the same. Rejected: putting the check in `commitElementEdit`/`guardedLayerWrite` (it is shared by every edit, and `guardedLayerWrite` only resolves again after a write and restores; refusing before is what D4 asks, "no file changes", and *Add replaces* of the inspection has its own, other rules); rejected: the kernel (`compare` does not know which manifest would hold the word).
- **What is checked: `from` is an element of the plateau the target overrides (`layerModelOf(parent).index[layer]`), only when `replacesChainBetween(base, target)` is not null.** Not checked: one layer apart (`from` is in the plateau compared with, which is the parent), siblings one layer above what they share (the entry is read against the plateau compared with, as wave 017 wrote it, and the existing tests of the Changes panel write such pairs), the root or a workspace without plateaus (no parent: `tree.nodes.get(...).parent === null`, or no tree), and a parent that cannot be drawn (`undrawable`; `guardedLayerWrite` reports that). Rejected: checking against the parent in every case, as the brief first put it: it would refuse the sibling pairs wave 017 wrote and break their tests, and changes nothing for the case #130 is about. The consequence, recorded as a finding: a sibling pair whose `from` is not in the parent is read directly by this comparison and as a warning by a comparison with the parent; that is wave 017's semantics of siblings, not this run's.
- **Split, merge.** The writer takes one pair `(from, to)` per click, so a split (several `to`, one `from`) and a merge (several `from`, one `to`) are written pair by pair and each `from` is checked alone; a merge can therefore be half-writable (the `from` the layer has is written, the other refused with its sentence). Rejected: checking the set at once, since no gesture writes a set.
- **The button.** `disabled`, `title` = the sentence, and the sentence under the pair (`.change-candidate-why`, `role="note"`), since a title alone is not read on a phone. The button is off only for this refusal; the others stay refusals on click, as before. Rejected: hiding the pair (the author should see it and why it cannot be written here).
- **The sentence.** “a” is not an element of “p1”, the plateau “p2” builds on (a layer in between removed it): replaces is read against that plateau, so the entry would name nothing there. Compare “p2” with “p1”, or write the entry in the layer that still has “a” (a plateau that overrides one that holds it); nothing was written. Titles use the name of the plateau, else its id.
- **Not done: the field *Add replaces* of the inspection** types a reference by hand and validates only its shape (`validateNewReplaces`); a typed reference the layer cannot hold is the author's, and is shown by the warning of the kernel. Listed as a deferred item.

## Verification

- Node: `write-replaces-refuses.test.js` (7 tests): R07 with `n` named `A` (the pair is listed, the button is off with the sentence, `acceptCandidate` refuses with the same sentence, no file marked, nothing written, every file's text unchanged), the same shape one layer apart (on, written), R06 (`y` is in the plateau below: no problem), a split/merge shape, a workspace without plateaus, and the layered Brightcart (`saas` against `baseline`: both pairs on and one written; `marketplace` against `baseline`: no button off). The first test fails on the page of HEAD.
- Identity (T1, editor page only; the command line is untouched): the Brightcart `saas` against `baseline` (two pairs, written and saved) and R06 `p2` against `p1` (one pair), every file of the in-memory folder after the save, hashed: HEAD page and this page give the same 70 lines.
- Full set: maven verify (skipITs=false, CustomRenderingTest excluded) 977 unit tests (2 skipped), 21 integration tests, build success; cargo test 227 passed; embed.sh --check clean; node --test 2051 passed, 0 failed; prettier clean.

## Not verified

No real browser run (node tests with the small DOM); the look of the off button and the note under the pair; the native image.

## Canonical impact

`CLAUDE.md`: the layered paragraph says what *Write replaces* refuses and why; #130 leaves the limits of the manual and the "limit that stays" of `[[plateau-replaces]]`. The manual is W-9's.
