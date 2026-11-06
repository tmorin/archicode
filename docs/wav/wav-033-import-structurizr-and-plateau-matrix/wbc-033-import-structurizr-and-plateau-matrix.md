---
type: wbc
wave: 033
status: completed
date: 2026-11-05
related:
  - docs/wav/wav-032-help-name-and-stylesheet-tests/wav-032-help-name-and-stylesheet-tests.md
  - docs/wav/wav-028-fold-and-browser-menu/run/run-0206-n-plateaus-design/run-0206-n-plateaus-design.md
---

# Wave 033 — Import a Structurizr workspace and the matrix of N plateaus — Business Case

## Context

Wave 032 closed the last two tickets that were `ready`. Three issues are open on `tmorin/archicode`, and two of them became `ready` on 2026-10-31 with the author's decision on the ticket:

- #135 `archicode import structurizr <workspace.json> --output <empty folder>`: reads the JSON export of a Structurizr workspace and writes manifests and a `workspace.yaml`. Decided: JSON only, a command of the CLI only, v1 = people, systems, containers, components and their relationships (a `group` becomes a tag; views, deployment, styles, documentation and properties are reported as dropped, exit 0), an open-source sample accepted (`structurizr-export/src/test/resources/big-bank-plc.json` of github.com/structurizr/structurizr, Apache-2.0, committed with its provenance and its licence text), a non-empty output folder refused, ids rewritten to `[a-z0-9_-]` with a suffix on collision and the original id kept in a tag. First task of the run: check the current way to produce the JSON (the Java CLI is archived) for the `.dsl` refusal sentence, and check for a per-path licence notice. Build only what this importer needs: the shared part is extracted when #134 arrives.
- #24 the reading of N plateaus at once, file first: a generated table of one path of the tree of plateaus (rows = lineages followed through `replaces`, columns = plateaus, plus a Span column that is one `compare` of the first plateau with the last, with `chain`), elements only, no relationships, no transient row, no kernel change. The mock-up asked for exists: run 0206 of wave 028. The name of the command and of the file are settled in the run's design, beside `gap.*`, never by changing `gap.json`. Oracle: `src/test/resources/brightcart/matrix-cases.json`, derived from `diff` per pair plus the span. The page follows in a later wave, reading the same cases.

#134 (the LikeC4 importer) stays `not-ready` until #135 is merged; it is not in this wave. The registers do not cover this: `docs/` has no `bkg` or `ana` register. The sources are the two issues.

## Problems / Opportunities

- A team that has a Structurizr model cannot try ArchiCode without retyping it. The importer is the way in, and it is the first adoption feature after the agent work.
- The only reading of more than two plateaus is a sequence of `diff` calls, so an agent or a reviewer cannot see where an element came from, where it split or merged, without composing the pairs by hand. A file an agent can read is also the contract the page will read later.

## Options & Recommendation

1. **Two runs, one phase, one after the other** (recommended). The two share no design and no data, each ends in evidence a command can show, and each is the size of one run (the importer 1 to 2 by the review of the ticket, kept as one because its exit evidence is one command on one sample; the matrix about half a run). They are serialized only because both register a command in `cli/ArchiCode.java`, the manual and the native-image reflection list.
2. **Only #135.** Rejected: #24 is `ready` with its decision; leaving it out spends a wave for one run and costs the same fixed cost of a wave later.
3. **Split the importer into a reader run and a writer run.** Rejected: neither side can be finished and evidenced alone: a reader with no writer proves nothing the CLI can show, and the writer has no input.
4. **Add #134.** Rejected: it is `not-ready` by the author's order, after #135.
5. **Matrix page and file in the same wave.** Rejected by the author on #24: file first, the page in a second run read from the same cases.

## Vision

`archicode import structurizr` turns the JSON export of a Structurizr workspace into a workspace that the command line and the editor load, and says on standard output what it dropped. A path of plateaus has a table (rows are lineages, columns are plateaus and a Span), generated beside `gap.*` and pinned by `matrix-cases.json`, that an agent can read. Both are in the manual and the native image.
