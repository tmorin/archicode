---
type: wbc
wave: 014
status: proposed
date: 2026-10-18
related:
  - docs/fixtures/brightcart-spec.md
  - docs/wav/wav-012-brightcart-fixture/wav-012-brightcart-fixture.md
  - docs/wav/wav-013-reported-defects-and-shipped-files/wav-013-reported-defects-and-shipped-files.md
  - CLAUDE.md
---

# Wave 014 — Layered Plateaus — Business Case

## Context

Since wave 008, a plateau is a complete folder of manifests listed in `settings.plateaus`; the commands and the editor draw one at a
time and compare two of them. The author designed another model on 2026-10 and has now asked for it to be built, replacing the
old one at once: a plateau is a **layer**. A manifest says which plateau it belongs to with a `plateau:` key in its header, wherever
the file is; a plateau exists because elements say so, and an optional manifest `Kind: Plateau` qualifies it (name, horizon, the
plateau it overrides, and an ordered array of patches applied to the graph the manifests loaded). `baseline` is the default root.
`settings.plateaus` is removed, with no migration command and no transition: a workspace that still has it fails with a clear line.
The editor is organised around a timeline of plateaus (issue #72).

Evidence that the model can express a real migration: the Brightcart fixture (waves 012 and 013, `docs/fixtures/brightcart-spec.md`),
written in both forms, with a generator that resolves the layered form and shows it equals the complete folders. The rules L0 to L11
of that document and the study of the author's specification (the artifact of 2026-10-17, section "Version 3, révisée") are the
inputs. Other sources: #30 (layered increments), #72 (the timeline), #73 (recursive `manifests.paths`), #70 and #34 (the kernel's
contract 5), the refusal of `kind: plateau` that wave 013 put in as a place-holder.

Decisions the author gave on 2026-10-18 (they are in the plan as decisions, not as assumptions): `settings.plateaus` is removed now,
with an error and no `migrate`; the plateau of a manifest is its `plateau:` header, whatever the folder; `Kind: Plateau` carries `name`
and `override`; the patch operators of this wave are `REMOVE`, `SET`, `ADD` and `MERGE` (not `MOVE`, not `RENAME`); the editor gets
the whole Timeline in this wave; `--baseline` is renamed `--against`. The rest of the rules is the study's proposal and is listed in the
plan for the review that precedes the run.

The author also asked, on 2026-10-18, to put in this wave as many fixes as possible. The open defects of waves 011 to 013 are therefore in
it, ahead of the layers: #74 (anchors, aliases and tags), #75 and #76 (the editor is more lax than the command line, and an unknown kind gives two
sentences), #37 (cache keys of the editor), the small defects the last runs found and did not file (the `uses` of a removed environment, the page
width at 360 px), and the findings of the `/code-review` of wave 013, which was started the same day.

Nothing in the registers (`docs/bkg`, `docs/ana`) exists to read.

## Problems / Opportunities

- Complete folders copy the architecture for every plateau: a fix in the baseline does not reach the others, and the copies drift.
  The Brightcart complete folders hold 73 manifests for what the layered form says in 49 files.
- Branching is not in the model: two alternatives are two folders that nothing says are exclusive, which is why the candidates of
  `replaces` propose a pair between two alternatives (#70).
- The editor draws one plateau and offers *Compare to*; it has no sense of time, and its header does not hold four plateaus (#69).

## Options & Recommendation

1. **Build the layered model, remove `settings.plateaus` at the end of the wave, editor included** (recommended, the author's choice).
   The new mechanism is added beside the old one first (a workspace with both is an error), proved on the fixture against the old
   mechanism's numbers, then the old one is removed together with its fixtures and tests. The build stays green between runs.
2. **Engine and command line now, the editor later.** Rejected by the author: the editor would not open a workspace that uses the
   new form (it fails on `plateau:`), and the Timeline is what the model is for.
3. **Keep `settings.plateaus` beside the layers for good.** Rejected by the author: two ways to say the same thing, and the key
   `from` reserved for this very idea.
4. **Improve the complete folders (the study's option H)** with tools to keep copies in step. Rejected by the author, who reversed the
   study's decision: patches act on the graph, not on files, so a correction propagates.
5. **A separate wave for the carried-over fixes.** Rejected by the author, who asked for them here. They also come first for a reason of the
   work: the editor's validation (#75) must know the new header key and the new kind before the model adds them.
6. **Remove `settings.plateaus` first, build afterwards.** Rejected: it deletes the only mechanism that runs `diff`, `--plateau` and the
   editor's comparison, and the Brightcart tests have nothing to run for the whole wave.

## Vision

The defects left open by waves 011 to 013 are fixed, each with a test. A workspace states its plateaus through its manifests. Each plateau is a layer over its parent: the manifests that say `plateau: x`
are added to the graph of the parent, then the patches of the plateau change the graph, in order; a patch that selects nothing is an
error that names the plateau and the patch. The command line draws, compares and lists plateaus (`--plateau`, `--against`,
`plateau list`), the editor shows a band of plateaus, edits them and their patches in a Timeline perspective, and the Brightcart
fixture is the layered form the tools run on, with its negative cases. `settings.plateaus` and `plateau add` are gone, and the manual,
the example and the tutorial describe the layers.
