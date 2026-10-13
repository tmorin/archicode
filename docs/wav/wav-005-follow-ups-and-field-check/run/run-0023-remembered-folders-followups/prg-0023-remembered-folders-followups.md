---
type: prg
status: completed
date: 2026-10-13
run: 0023
wave: 005
related:
  - docs/wav/wav-005-follow-ups-and-field-check/run/run-0023-remembered-folders-followups/run-0023-remembered-folders-followups.md
---

# Progress Log: run 0023, remembered folders follow-ups

## Log

- 2026-10-13: Run set up (profile `TDD+pln`: Stages 1-3 skipped; directory and number given by the orchestrator). Read the wave plan (row W-4, manifest entry, Risks, the open question for W-4), the wave's progress log, tmorin/archicode#16 (items 1 and 2 in scope, item 3 left to a human), run 0020's TDD (DEC-1/DEC-2, DEF-1, DEF-2, RISK-1, A-6), pln and prg, the IndexedDB helpers and folder flows of `standalone.html`, the landing card, the harness's fake `indexedDB` and `folders.test.js`, and the manual's `[[editor-folders]]`. Baseline node suite 372/372.
- 2026-10-13: Stage 4 TDD drafted (states queried after the first draw; repair on every list read and after every remember, no lock; merge onto the pointer's record in one checked transaction that never writes the pointer; `liveFolderId` for ids held from before a merge; the fake schedules transactions as a browser does). Status `designing`. The harness and the storage layer were implemented while the review ran, against the faithful fake.
- 2026-10-13: Stage 5 KDMLLC review of the TDD (standard-tier agent, HEAD as referent): 13 findings (4 S2, 7 S1, 2 S0), all applied (see the pln's Results). Two changed the code: a row with `others` clears a pointer naming any of them on Remove and Close, and the last folder is found among `others`; the list's scroll is kept across the permission redraw.
- 2026-10-13: Stage 6: no open question left. The wave's open question for W-4 answered by DEC-3 (repair only). ASM-2 (what `queryPermission` answers for a vanished directory) stated as unverified: the design handles a rejection, and an answer of `prompt`/`granted` simply leaves the failure to the click, as before. Stage 7 not applicable (no PRD).
- 2026-10-13: Stage 8 pln written after tasks 001-006 were implemented (deviation recorded). Stage 9: tasks trace to TDD ids, `likely_files` exist, `blocking_gaps` empty.
- 2026-10-13: Stage 10: tasks 002-003 (`hard_judgment`) inline as required, the `standard` ones inline too (pln section 9). 13 new node tests, one existing assertion updated deliberately; nineteen hand mutations, all caught (one only after the focus test was given a `#landing-primary`). Replica measured in light and dark at 822 and 375 px; the state sentences shortened after they wrapped on every row.
- 2026-10-13: Stage 11: node 385/385, `./mvnw test` (JDK 25) 111 tests 0 failures, `embed.sh --check` exit 0, base64 block untouched, database version still 1. Canonical impact: CI-arc-1 and CI-dom-1 not applicable, with their reason, in the TDD. No backlog sweep (this repository has no `docs/bkg/`). Run completed.

## Findings

- Wave open question for W-4: repair, no prevention. A repair is needed anyway (0.10.0 tabs take no lock, duplicates already stored, browsers without the API) and, made on every list read and after every write, it is enough: no duplicate is ever listed, and the second writer of a race always sees both records. Web Locks would only narrow an invisible window at the cost of a cross-tab dependency.
- A merge must never write the `workspace` record: choosing the record the pointer names as the survivor makes that structural, not a matter of care.
- Run 0020's fake `indexedDB` let two `readwrite` transactions run blind to each other, which no browser does; an in-transaction check (the basis of every guarded write since run 0020) only means something on the faithful scheduling, now in the harness.
- A failed `queryPermission` on load is now said by the state line of the list, no longer by a red problem line (which stays for a click that failed).
- See the pln's Findings for what could not be confirmed here.

## Lessons Learnt

- A focus test in the harness must give the page the element it would otherwise fall back to: without `#landing-primary` in the fake document, "the focus is left alone" passed whatever the code did (found by a hand mutation).
- Measure a list's text at the card's real width before settling its wording: every state sentence wrapped to two lines until shortened.
