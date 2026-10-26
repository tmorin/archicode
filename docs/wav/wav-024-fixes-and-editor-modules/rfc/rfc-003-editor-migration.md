---
type: rfc
rfc: 003
status: accepted
date: 2026-10-26
accepted: 2026-10-26 by the author, with the amendments below (run 0182, Q-1 and Q-2)
issue: 'gh:tmorin/archicode#161'
related:
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-001-editor-distribution.md
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-002-editor-architecture.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md
---

# RFC-003 — Migration: each commit is one kind

## Decision

Each migration commit is one of three kinds, named by its subject.

- **Move**: text goes from one file to another without any edit. The assembled page must equal the parent's. The check is `build-editor.mjs --check-identical <parent>`, a byte comparison.
- **Relocate**: a variable moves to the layer that needs it. The order of the assembled script does not change, so the byte check still holds for the page's behaviour; it is checked by the same assembler.
- **Change**: behaviour or structure changes (the redraw request, a wrapper, a layer fix). It has its own tests, and is never mixed with a move or a relocate.

## Why

A 22,000-line move is not reviewable by eye. Byte equality makes "nothing changed" a fact a tool checks, at no cost and with no judgment in it.

## Guards, by cadence

- **Each commit**: the assembler check, the check of its kind, the layer count (`layers.json`, from the step that introduces it), lint and format.
- **Each step** (a group of commits that ends with something a reviewer can accept): the node suite. A move whose assembled page equals its parent's cannot change what the suite says, so the suite runs at the end of a step, not after each move. A failed step is reverted, not patched.
- **End of a group** (the notification and the composition parts): the end-to-end suite.
- **Before the first move**: the list of top-level names equals a committed list, and each page function named in a Java comment exists.
- **Native**: cannot run locally. A change that touches the image is merged only after its CI run.

## Order

1. Assembler, name list, layer count (no code moves).
2. Core: YAML, numbers, schema, discovery.
3. Model, then persistence and application.
4. Presentation and composition.
5. The notification (a change), after the parts that redraw exist.

## Consequences

- Each move and relocate records its byte check result in the run document.
- The wave's gate for P3 requires every move and relocate to pass the byte check against its parent.
