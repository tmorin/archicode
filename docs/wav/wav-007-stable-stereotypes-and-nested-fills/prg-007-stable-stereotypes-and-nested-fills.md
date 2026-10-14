---
type: prg
status: active
date: 2026-10-14
related:
  - docs/wav/wav-007-stable-stereotypes-and-nested-fills/wav-007-stable-stereotypes-and-nested-fills.md
wave: 007
---

# Progress Log: stable-stereotypes-and-nested-fills

## Log

- 2026-10-14: wave drafted on branch `fix/stereotype-order-and-nested-fills`. Before drafting, two consecutive generations of the current build on a copy of the user's target workspace (3,461 files) gave 0 differing files.
- 2026-10-14: `complete-wave` started. Wave `in-progress`. Batch 1 is W-1, W-2 and W-3 (no dependency between them), all `standard`; the three share `src/doc/README.adoc` and W-2 / W-3 share `standalone.html`, so the plan's `serialize` verdict applies: they are dispatched one after another, never concurrently (1 at a time), in the order W-1, W-2, W-3, each in its own `run-management:run-executor` subagent at the default model. Dispatching W-1 first as run 0031 (`docs/wav/wav-007-stable-stereotypes-and-nested-fills/run/run-0031-stable-stereotype-order/`).
- 2026-10-14: W-1 (run 0031) returned; verified from disk, not from its report: the run status file says `completed` (profile `single-document`, so no pln); `./mvnw -o verify` re-run by the orchestrator, exit 0; `npx prettier --check "src/**/*.java"` clean; the diff of `Item.java` and `Link.java` read. Files touched: all inside W-1's `likely_paths` (plus the run's own file). Committed as the one commit of run 0031. Batch overlap check: W-1 ran alone (serialized), nothing to collide with.
- 2026-10-14: dispatching W-2 as run 0032 (`docs/wav/wav-007-stable-stereotypes-and-nested-fills/run/run-0032-nested-fills-outline/`), `standard`, one `run-management:run-executor` at the default model, alone (1 concurrent: serialized after W-1 because of `src/doc/README.adoc`, and before W-3 because of `standalone.html`).
- 2026-10-14: W-2 (run 0032) returned; verified from disk: status file `completed` (`single-document`); `node --test` 581 pass, 0 fail (re-run by the orchestrator); `cargo test` 69 pass and `embed.sh --check` ok (re-run, the Rust is untouched); `./mvnw -o verify` was green in the executor's report and the Java is untouched since W-1's verified state; the diff of `standalone.html` read (`derivedOutlineOf`, `STYLE_OUTLINE_DARKEN` = 0.6, in `styleLookOf` only). No file outside `likely_paths` touched. Committed as the one commit of run 0032. Batch overlap check: W-2 ran alone (serialized).

## Findings

- A diff of the user's baseline and target (as-is 132 elements, to-be 165) gives 38 new, 5 removed, 25 changed elements and 79 new, 23 removed relationships: the case for tmorin/archicode#18, not part of this wave.
- Run 0031: the stereotypes of a box were never unstable from one run to the next. The thousands of changed files the user saw are explained by two format changes between releases (0.9.0 to 0.10.0: 3,044 files; 0.10.0 to 0.11.0: 3,411), so the report predates the stable order. The real run-to-run instability was in the order of links (and of items deployed on several nodes), only visible under another JVM identity hash: 8 of 3,411 files on the user's target workspace. Fixed in `Item.compareTo` and `Link.compareTo`; tests added. Which version the user ran is an inference to confirm with them.
- Run 0032: the outline derived from a fill is the fill scaled by 0.6 per channel (0.8 is a whisper, 0.4 a heavy frame), lightened instead for a fill of relative luminance below 0.05 (navy and black fills vanished otherwise; this goes beyond the W-2 row). A child of the same fill as its parent needs no ancestor look-up: each gets the outline of that fill. PlantUML draws its own thin dark outline, so the CLI has no such defect.
- The built-in browser pane's screenshot timed out twice (as in run 0030); the executor looked at the real page with a headless Firefox over geckodriver instead. Chromium, Safari, the Map view with `hub` opened and the PNG export were not looked at.

## Lessons Learnt
- A determinism check that only runs twice on one machine proves nothing about hash-ordered collections: vary the identity hash (`-XX:hashCode=2`) too. Any `sorted()` over items or links must end on a total key, and nothing written to a file may rely on `HashSet` iteration order.
- Any new place that draws a styled box must read `--st-stroke` and `--st-stroke-opacity` from the box's own variables, not recompute an outline.
