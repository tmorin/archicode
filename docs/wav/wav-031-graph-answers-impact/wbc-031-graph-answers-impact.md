---
type: wbc
wave: 031
status: completed
date: 2026-11-01
related:
  - docs/wav/wav-029-archicode-self-model/wav-029-archicode-self-model.md
  - CLAUDE.md
  - src/test/javascript/architecture/impact-questions.json
---

# Wave 031 — The graph answers impact questions — Business Case

## Context

Wave 029 gave ArchiCode a model of itself (`docs/architecture/`) and an impact oracle of seven questions. Building it showed that the tool does not answer "what does this touch" by itself: `ArchitectureImpactTest` runs `archicode query graph` and walks the flat `relationships` list in client code. The frictions became issues, and the author has decided each of them (comments of 2026-10-31):

- #184 `query views` lists saved and derived views together, with only the presence of `name` to tell them apart. Decision: `saved: true|false` on every entry.
- #189 `query graph` does not show deployment: a node's `applications` list is inside the serialised element, not an edge. Decision: a top-level `deployments: [{"node": ..., "application": ...}]` beside `elements` and `relationships`, omitted when empty.
- #187 no command answers "which elements are reached from X". Decision: `archicode query impact <reference>` with a direction, a depth, a qualifier filter and a containment rule; done after #189.

#184 and #189 both change a standard output that `scripts/byte-identity.sh` compares with the jar of an earlier tag, and the harness accepts a declared change of error sentences only. The author decided that the harness learns to accept a declared change of standard output, once, in whichever ticket comes first.

The registers do not cover this: `docs/` has no `bkg` or `ana` register. The sources are the three issues. #194 (the diagram toolbar) said it was "to be planned after" them; the author put it in wave 030 instead, so this wave follows 030.

## Problems / Opportunities

- An agent that asks what a change touches must know the shape of `query graph`, then write a traversal; each client (a test, a script, an agent) writes its own, so the answers can differ.
- A client cannot tell a saved view from a derived one except by a side effect, and cannot cross from a node to the applications it hosts except by reading inside an element.
- The oracle of wave 029 has the traversal in test code (`ArchitectureImpactTest.impact`), where the product cannot reuse it, and two real questions about deployment ("if `github.pages` is down, which applications are affected?") cannot be asked.
- After the wave, `CLAUDE.md` can say "run `archicode query impact`" instead of "follow the relationships yourself", and the tool is the same for every client.

## Options & Recommendation

1. **Three runs in a line: the saved marker (with the harness change), the deployments, then the command** (recommended). Each run ends in an output a test pins. The harness change goes with the first user, as the author decided.
2. **One run for the three tickets.** Rejected: it mixes two changes of an existing output, a change of the harness and a new command with its own semantics (qualifiers, containment, cycles); a failure would stop all three, and the review would have no seam.
3. **The harness change as its own first run.** Rejected: its evidence (the self-check) is not distinct from the evidence of its first user, the fallback the author allowed (`--saved` alone) depends on how heavy the change proves, and a run that nothing uses cannot be proved.
4. **Only `query impact`, leaving #184 and #189.** Rejected: the author ordered #187 after #189 so that the command can cross deployments; built first, it would run on the old graph and the oracle could not ask the two deployment questions.

## Vision

An agent asks the tool, not its own code, what a change touches. `query views` marks the saved views, `query graph` lists the deployments, and `query impact` returns the reached elements with their distance and the path that reached them. The impact oracle calls the command for its questions, and `CLAUDE.md` points to it. The harness `scripts/byte-identity.sh` can accept a declared change of standard output, so the next change of an output is declared in a file instead of discovered as a failure.
