---
type: rfc
rfc: 002
status: accepted
date: 2026-10-26
accepted: 2026-10-26 by the author, with the amendments below (run 0182, Q-1)
issue: 'gh:tmorin/archicode#161'
related:
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-001-editor-distribution.md
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-003-editor-migration.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md
---

# RFC-002 — Editor architecture: layers, state and cut

## Decision

The editor is organised in six layers, lowest first. A part may name declarations of its own layer and of the layers below it. It never names a higher one.

| Layer | Content |
|---|---|
| 0 core | pure: YAML reader and line-preserving writer, read schema, manifest kinds, HTML escaping |
| 1 model | the editor's state (`app-state`, `ui-state`), settings, plateau tree, layer loader, comparison, kernel bridge, stories model, styles |
| 2 persistence | folders, IndexedDB, writes to disk, the save |
| 3 application | commands: commit, move, plateau writes, story actions |
| 4 presentation | renderers, forms, diagram, story player, dialogs, landing card |
| 5 composition | delegated events, address routing, `render`, bootstrap |

## Rules

1. **Downward only.** A part names declarations of its layer and below.
2. **Redraw is requested, never called.** A lower layer asks for a redraw with `requestRedraw()`. `modelsChanged()` stays a version counter for the caches and does not redraw.
3. **Snapshots in, scenes out.** The diagram and the story player take a snapshot of the model and return a scene. Neither reads the page's variables.
4. **One owner per variable is not enforced in this wave.** Variables are declared in the state parts (layer 1) and written by the layer that needs them. An owner rule is a later step, once the state is measured per part.
5. **The kernel is called in one place**, the kernel bridge (layer 1).

## Why the state is in layer 1

The state is read by the model, persistence and every layer above. Placed in the application layer, it would make every model and persistence reader a violation. Placed at the bottom, it is a dependency every layer may have, and no rule is broken for its readers.

## Enforcement

`src/main/editor/layers.json` maps each part to its layer. The assembler counts the pairs of declarations in different parts where one names the other and the other sits in a higher layer. The count is written as `ratchet.max`; the check fails when it rises. The count measures a real dependency that a reviewer can read, and it falls only when code or a declaration moves. It does not prove that no violation exists.

Names are resolved by scope analysis, so a local variable that shadows a top-level name is not a reference. The baseline value and its measurement method live in `layers.json` and in run 0182, not here.

## Cut

Parts follow the layers and their leaves first. Variables that lower layers read move to layer 1 before the functions that use them. A function declaration may move later, once the count shows it is above its callers.

## Consequences

- The notification (rule 2) is a change, not a move, and comes after the presentation and composition parts exist (RFC-003).
- The core (the YAML reader and writer) is the most valuable code; it moves first and stays byte-identical.
