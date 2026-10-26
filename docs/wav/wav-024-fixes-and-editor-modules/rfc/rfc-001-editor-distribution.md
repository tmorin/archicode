---
type: rfc
rfc: 001
status: accepted
date: 2026-10-26
issue: 'gh:tmorin/archicode#161'
related:
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-002-editor-architecture.md
---

# RFC-001 — Editor distribution: one file, assembled from parts

## Decision

The editor stays one distributed file, `standalone.html`. Its sources are split into parts under `src/main/editor/`, joined in a fixed order by a dependency-free Node script (`scripts/build-editor.mjs`). The committed `standalone.html` is the output, and CI fails when it differs from the assembly.

## Why

- `file://` does not load ES modules. A user can keep the editor as one file, and the website publishes one file (`sed` stamps its version).
- `archicode editor serve` (jar and native image) serves `editor-webapp/**`; one file keeps the native image and the jar unchanged.
- The node harness runs the page as a classic script in one context. Concatenation keeps that model, so the tests need no rewrite.

## Rejected

- **ES modules served as such.** Breaks `file://`, the website copy, and the harness in one move.
- **ES modules bundled to one file.** Right end state for the pure parts, but it changes how 100+ test files reach the page and adds a dependency. Not now. Revisit when the pure core is isolated (RFC-002); the decision is then about that core alone.
- **Leave the file as it is.** Keeps diffs, review and agent context at one 23,000-line file.

## Consequences

- The page is generated: edit `src/main/editor/`, never `standalone.html`.
- The assembler refuses a part missing from the order or listed twice.
- `.prettierignore` excludes only the generated file. Format and lint run on the parts.
- `embed.sh` still writes the kernel into the assembled file, through the same assembler.
