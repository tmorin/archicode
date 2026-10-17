---
type: wbc
wave: 013
status: proposed
date: 2026-10-17
related:
  - docs/wav/wav-012-brightcart-fixture/wav-012-brightcart-fixture.md
  - docs/wav/wav-012-brightcart-fixture/prg-012-brightcart-fixture.md
  - docs/wav/wav-011-faithful-saves-and-stable-output/prg-011-faithful-saves-and-stable-output.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 013 — Reported Defects and Shipped Files — Business Case

## Context

Waves 011 and 012 left a list of issues on tmorin/archicode that they found and did not fix: #57 to #61 and #66 (wave 011 and the
tests of wave 012), and #68 to #71 (the look at the editor on the Brightcart fixture). Wave 012 also taught something about
its own tests: the author opened the layered rendition of the fixture in the editor and found two errors by hand
(`Unrecognized header.kind "archicode.morin.io/plateau"`, and `settings.manifests.paths` that does not read sub-folders). The
wave had tested the complete-folder rendition end to end and the layered one only by text saves. The author asked for the rule
that follows, which is now in `CLAUDE.md` (Conventions): every file, example or fixture the repository ships is loaded by the
command line and by the editor in a test, and what fails today is pinned by a test of the author's message, or is not shipped.

On 2026-10-17 the author asked to apply the recommendations of that discussion on the same branch, to fix the reported bugs and
items, and to be sure that the editor's timeline is in an issue (#72). The recommendations, after being challenged for
simplicity and durability, were: do not commit a layered rendition whose syntax is a guess (generate it outside the repository);
cut the cost of the stable-output test instead of tagging it slow; refuse `Kind: plateau` with a clear message in the way `from`
is refused, instead of recognising a kind whose meaning does not exist; do not make `manifests.paths` recursive by default (a
path ending in `/**` is the proposal, filed as #73, undecided).

Nothing in the registers (`docs/bkg`, `docs/ana`) exists to read; the sources are the issues and the progress logs of waves 011
and 012.

## Problems / Opportunities

- A file the repository ships and that no tool opens is a trap: `layered/` is named `workspace.yaml`, so people open it. The
  rule of `CLAUDE.md` is only a sentence until a test enforces it on the folders that exist today.
- The editor has four defects found on a realistic project (a Map that fails after a facet, a header that does not wrap, a panel
  that hides what a removed node deployed) and one found by a test run under load (a fixed 50 ms wait). A fifth, #57, loses the
  comments of a whole file on a list written at the column of its key.
- `query graph` has an unsorted order and `query views -f toml` is not valid TOML: both are cheap now and costly once someone
  stores the output.
- The candidates of `replaces` are right 45 percent of the time on a large invented pair, and propose a swap between two
  alternatives (#60, #70). A split element's relationships read as new with nothing saying why (#61).

## Options & Recommendation

1. **One wave of six runs in three phases: shipped files and fixture, editor defects, outputs and candidates** (recommended).
   Each run has its own exit evidence and its own files; the phases are checkpoints. All runs are executed one at a time (one
   working tree, one `target/`).
2. **Six waves, or one run per issue** (twelve runs). Rejected: five issues are in `standalone.html` and four share the kernel
   or `query`; a run per issue would edit the same file in turn and the exit evidence of #68, #69 and #71 is one look at the
   editor.
3. **Do it directly, without a wave**, as one commit. Rejected: the kernel, the editor page, the command line and a fixture
   generator change together, and the wave gives each change its verification and its progress log.
4. **Include #62 (native checks as integration tests), #65 (`plateau merge`), #73 (recursive paths) and #72 (the timeline).**
   Rejected: #62 says it is worth doing only if the script grows and cannot be verified without a native image; #65 is deferred
   by the author; #73 and #72 wait for decisions (and #72 for the layered model, #30). They are in issues, not in this wave.

## Vision

Every fixture and example the repository ships is loaded by the command line and the editor in one test, with a named list of
exceptions each carrying its reason. The layered rendition of Brightcart is no longer committed: the generator writes it on
demand and its resolver still proves it equals the complete folders. A manifest with `Kind: plateau` or a `plateau` header is
refused by the command line and the editor with one line that says layered plateaus are not supported yet. The editor's four
reported defects and the flaky test are fixed with a test each; the save keeps the lines of a list written at the column of its
key. `query graph` is sorted and `query views -f toml` is valid. The candidates of `replaces` are better on the large invented
pair and no longer propose the pair of two alternatives; the relationships of a split element say they come from it.
