---
type: prg
run: 0064
status: completed
wave: 013
---

# Progress: Run 0064 Fixture layered off repo

## Log

- 2026-10-17. Read the wave plan, the document, the generator and the tests. Profile `single-document`; the run file carries scope, decisions, review passes and verification.
- 2026-10-17. `generate.mjs --layered <dir>`, temporary folder for the resolver, `layered/` removed from the repository, layered saves test and `renditions.json` entry removed, README and document reworded.
- 2026-10-17. Second run of `BrightcartStableOutputTest` on `saas` and `marketplace`; class timed before and after in alternating pairs.
- 2026-10-17. The five commands of the P1 gate pass on the final tree (see the run file).

## Findings

- The class `BrightcartStableOutputTest` is still above a minute after the cut (F1 of the run file); the author decides on a tag.
- Timings on this machine swing from 133 s to 265 s for the same class (F2).

## Lessons Learnt

- A generator that empties its output folder must refuse a folder it did not make before it accepts a user-given one.
- Time a test change in alternating before/after pairs when the machine is shared: a single before/after pair said the change made the class slower.
