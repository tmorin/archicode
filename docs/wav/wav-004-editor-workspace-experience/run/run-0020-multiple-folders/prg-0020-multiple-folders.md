---
type: prg
status: completed
date: 2026-10-13
run: 0020
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0020-multiple-folders/run-0020-multiple-folders.md
---

# Progress Log: run 0020, multiple folders

## Log

- 2026-10-13: Run set up (profile `TDD+pln`: Stages 1-3 skipped; directory and number given by the orchestrator). Read the wave plan (row W-9, Risks), its progress log (W-4's finding on `lastWorkspaceName` / `openingMessage`), run 0019's documents for the format, the IndexedDB helpers, the folder flows (`openFolder`, `reopenFolder`, `closeFolder`, `tryAutoReopen`, `retryFolder`, `openServedFolder`), the landing card (`landingScreenConfig`, `renderLandingHtml`, CSS), the harness, the tests that reach the landing and the folder flows, and the manual's `[[editor-open]]` / `[[editor-workspace-name]]`.
- 2026-10-13: Stage 4 TDD drafted (no version upgrade; migration in place; one record per folder; Close clears only the last-folder pointer; a refusal keeps the entry and goes to the list). Status `designing`. The storage layer was drafted against the harness's new fake `indexedDB` while the review ran.
- 2026-10-13: Stage 5 KDMLLC review of the TDD (standard-tier agent, read `git show HEAD:` as its referent): 13 findings (3 S2, 7 S1, 3 S0), all applied (see the pln's Results). Two changed the code: the migration leaves alone a last-folder record an older tab replaced meanwhile (adding only the folder it compared), and a legacy Remove is guarded inside its transaction.
- 2026-10-13: Stage 6: no open question left; A-6 (re-prompt after a refusal) stated as an assumption, only the rationale of DEC-6 depends on it. Stage 7 not applicable (no PRD).
- 2026-10-13: Stage 8 pln written (after tasks 001-004 were implemented: deviation recorded). Stage 9: tasks trace to TDD ids, `likely_files` exist, `blocking_gaps` empty. Status `in-progress`.
- 2026-10-13: Stage 10: tasks 001-002 (`hard_judgment`) and 003-006 inline. 21 new node tests, eleven hand mutations all caught. Replica seen in light and dark, desktop and 375 px; row separators added after the narrow view.
- 2026-10-13: Stage 11: node 372/372, `./mvnw verify` BUILD SUCCESS (107 unit tests; Failsafe skipped by default), `embed.sh --check` exit 0, base64 block untouched. Canonical impact: CI-arc-1 and CI-dom-1 answered None with a reason in the TDD. No backlog (this repository has no `docs/bkg/`). Run completed.

## Findings

- No IndexedDB version upgrade: the first version never closes its connections, so an upgrade would be blocked by any older tab and lock older copies of the page out (TDD DEC-1). The migration is a rewrite in place of the `workspace` record, which keeps its meaning (the last folder) for older pages.
- "Close folder" no longer deletes anything: it clears the last-folder pointer only if it still points at the folder closed, so a reload shows the list instead of reopening it.
- See the pln's Findings for what could not be confirmed here.

## Lessons Learnt

- A test of a transaction's abort must wait past the moment it would have committed: checking right after the rejection passes even without the abort (found by a hand mutation).
- Check the landing card at a phone width: a wrapped Remove button read as belonging to the next folder until the rows got separators.
