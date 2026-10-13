---
type: run
run: 0023
status: completed
wave: 005
---

# Run 0023: Remembered folders — follow-ups

Wave 005 (`follow-ups-and-field-check`), run W-4, tmorin/archicode#16 items 1 and 2 (item 3, the migration in a real
Chromium profile, is left to a human). Document profile: `TDD+pln`; documents in this directory:
`tdd-0023-remembered-folders-followups.md`, `pln-0023-remembered-folders-followups.md`,
`prg-0023-remembered-folders-followups.md`.

Each folder of the standalone editor's list of remembered folders now says, without any prompt, what a click on it will
meet (opens without asking, will ask for permission, blocked by the browser, could not be reached / checked): queried in
parallel after the card is drawn, in words, as the Open button's accessible description. Two records of one folder
(two tabs picking it at the same moment, or left by 0.10.0) are merged into one whenever the list is read and after
each folder remembered: repair, no Web Locks and no `BroadcastChannel` (the wave's open question for W-4, TDD DEC-3).
A merge is one checked transaction that never writes the last-folder pointer, keeps the stored name and the latest
`openedAt`, and writes nothing when it fails; the folder is then still one row. The database stays at version 1.
Canonical impact: not applicable (CI-arc-1 and CI-dom-1, with their reason, in the TDD).
