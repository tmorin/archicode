---
type: prg
status: completed
date: 2026-10-13
run: 0024
wave: 005
related:
  - docs/wav/wav-005-follow-ups-and-field-check/run/run-0024-inspection-panel-navigation/run-0024-inspection-panel-navigation.md
---

# Progress Log: run 0024, inspection panel navigation

## Log

- 2026-10-13: Run set up (profile `TDD+pln`: Stages 1-3 skipped; directory and number given by the orchestrator). Read the wave plan (row W-2, Risks, open questions), tmorin/archicode#17, runs 0016, 0017, 0018 and 0019 TDDs (DEC-1..7, RISK-1, DEF-1..4, CTR-1), the selection, address and diagram code of `standalone.html`. Baseline node 385/385.
- 2026-10-13: Stage 4 TDD drafted; the code of the five features was written against it (declaring button, parallel links, address, reveal, header badges); five old assertions of `inspection-links.test.js` updated deliberately. Stage 5 KDMLLC review of the TDD (standard-tier agent reading the committed code): 8 findings, all applied (see the pln's Results); one changed the design (the reveal carries the clicked position).
- 2026-10-13: Stage 6: no blocking open question; the wave's two (key in the URL, how parallel links differ) answered by DEC-2 and DEC-4; Q-1 (centre versus bring into view) left for the owner of the issue to confirm, not blocking. Stage 7 not applicable (no PRD). Stage 8-9: pln written after the implementation (deviation recorded in its Results), tasks trace to TDD ids, `likely_files` exist, `blocking_gaps` empty.
- 2026-10-13: Stage 10: all six tasks inline (one file, each task asserts the previous one's markup). 39 new node tests; about thirty hand mutations, all caught after two got tests; replica in the built-in browser for the header at five widths and the panel in light and dark (viewport reset, server stopped by PID).
- 2026-10-13: Stage 11: node 424/424, `./mvnw test` (JDK 25) 111 tests 0 failures, `embed.sh --check` exit 0, base64 block untouched, no `tabindex` in the diff. Canonical impact: CI-arc-1 and CI-dom-1 not applicable, with their reason, in the TDD. No backlog sweep (this repository has no `docs/bkg/`). Run completed.

## Findings

- Wave open question, key of a link in the URL: two parameters `link-from` and `link-to` (the ids of the pair of boxes), not one with a separator: an id can hold any character and a ghost id is typed text. The layer is not in the address (Map: application; Elements: the element's).
- Wave open question, parallel links: the position in the markup (`data-nth`, only on twins, so the common markup is unchanged) tells the clicked link at the moment of the click; the selection keeps the keys of its relationships (`via`), not the position, which drifts with a redraw; the label is not an identity (twins can share it or have none). The address does not carry which twin: it names the connection.
- Selecting a link keeps pushing no history entry (it rewrites the current one); Back/Forward restore a link because the entry's address keeps it, and a `goto-element` pushes a copy of the address with the link in it.
- "Centre on the link" became "bring into view by the least pan, once": the issue's wording would move a link the user is looking at; runs 0018 and 0019 refused a selection that jumps the view. The pin of run 0019 is unchanged. Q-1 for the issue's owner.
- The address guard must be a function of the state: four callers write it before drawing (`setPerspective`, `goToStoryStep`, `openSavedView`, `library-tab`).
- The label row of a header pays its `gap` for an item squeezed to nothing: a clipped group needs a negative margin to leave the name its 8 rem.
- Two review findings were facts about the code, not the design: the clicked twin cannot be recovered from `via` when twins carry identical relationships; `mountDiagramIfNeeded` never shows a cached scene and then a computed one.
- Run 0025 (roving tab stop) runs next in the same file: `data-nth` is additive and only on twins; the exact opening tag of a link without twin is unchanged; `markLinkSelection` and the tab-stop model are untouched.
