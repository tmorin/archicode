---
type: rfc
rfc: 003
status: proposed
date: 2026-10-26
issue: 'gh:tmorin/archicode#161'
related:
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-001-editor-distribution.md
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-002-editor-architecture.md
---

# RFC-003 — Migration: move and change are different commits

## Decision

Each migration commit is either a **move** or a **change**, never both.

- A **move** cuts text from the old page into a part without editing it. The assembled script must equal the previous commit's assembled script, after removing the part headers. The check is a byte comparison, not a review of the diff.
- A **change** alters behaviour or structure: the layer rule, the notification step, a wrapper around the YAML flags. It has its own justification and tests, and is never mixed into a move.

## Why

A 22,000-line move is not reviewable by eye. Byte equality makes "nothing changed" a fact a tool checks. The behavioural suite then has one job: catching changes, which are few and named.

## Guards

- Every commit: format, lint, the node suite, the coverage floor, the byte check for moves.
- Each group of commits: the e2e suite.
- Before the first move: a check that the set of top-level names equals a committed list, and that every page function named in a Java comment exists.
- The Native job cannot run locally. A change that touches the image is merged only after its CI run.

## Order

1. Assembler, layer rule, name list (no code moves).
2. Core (YAML, numbers, schema, discovery).
3. Domain and persistence.
4. Notification step (a change).
5. Application, presentation, composition.

A failed step is reverted, not patched.

## Consequences

- Each move commit records the byte check result in the run document.
- The wave's gate for P3 requires every move commit to pass the byte check against its parent.
