---
type: rfc
rfc: 002
status: proposed
date: 2026-10-26
issue: 'gh:tmorin/archicode#161'
related:
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-001-editor-distribution.md
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-003-editor-migration.md
---

# RFC-002 — Editor architecture: layers, state and cut

## Decision

The editor is organised in six layers. A layer uses only the layers below it. A lower layer reaches a higher one only through a published notification, never by calling it.

| Layer | Content |
|---|---|
| 0 Core | YAML reader and line-preserving writer, number grammar, read schema, manifest discovery, check sentences |
| 1 Domain | workspace model, layers and plateaus, comparison through the kernel, stories model |
| 2 Persistence | directory-handle seam, remembered folders (IndexedDB), write and commit pipeline |
| 3 Application | the state, commands (commit, move, rename, create), change notification |
| 4 Presentation | pages, diagram, story player, bar, landing card |
| 5 Composition | delegated events, address routing, bootstrap |

## Why

Measured on 2026-10-26 by reading the page's top-level declarations and the names each part uses: the parts form cycles, not a chain. The clearest are the application state calling rendering and the diagram calling the shell, which calls the diagram back. Ordering the parts cannot break a cycle; a rule about direction can.

## Rules

1. **Downward only.** Layer N imports functions from N-1 and below.
2. **Notify upward.** `modelsChanged()` publishes a version; presentation subscribes and redraws. The state never names a renderer.
3. **Snapshots in, scenes out.** The diagram and the story player take a snapshot of the model and return a scene. Neither reads the page's variables.
4. **One owner per variable.** The layer that declares a variable is the only one that writes it. Other layers read it through an accessor.
5. **The kernel is called in one place**, the kernel bridge (layer 1). No other layer touches its memory.

## Cut

Parts follow the layers and their leaves first: core (the YAML reader and writer is already self-contained), then domain, persistence, application, presentation, composition. Consolidating the 96 top-level `let` into state objects is not part of this work; it is an option once the core is a module (RFC-001 rejects modules for now).

## Enforcement

A layer file, `src/main/editor/layers.json`, maps each part to its layer. The assembler reads it and fails when a part names a function or variable declared in a higher layer.

The existing violations (state to renderers, diagram to shell) are listed in that file with a count. The check fails when the count rises. Its purpose is to stop new violations and to make the list shrink on purpose; it does not prove that none exist.

## Consequences

- The notification step (rule 2) changes when a redraw happens. It is a separate change, not a move, and is covered by the e2e suite.
- The save and the core are the most valuable code; they move first and must stay byte-identical.
