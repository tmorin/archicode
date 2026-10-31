---
type: wbc
wave: 029
status: completed
date: 2026-10-31
related:
  - CLAUDE.md
  - src/main/editor/layers.json
---

# Wave 029 — The ArchiCode model of ArchiCode — Business Case

## Context

ArchiCode is now written mostly by AI agents. Its architecture lives in `CLAUDE.md`, a prose file of about 60 KB, and in a few machine-readable lists (`layers.json`, `names.json`, `java-names.json`, `check-editor.mjs --list`). The author wants a representation a human can read to understand the complexity of the CLI and of the editor, and an agent can query to decide what a change touches.

The tool is made to be that representation, and it has never been used on its own repository. Nothing in the registers covers this: `docs/` has no `bkg` or `ana` register. The facts that make the wave feasible were checked in the repository:

- a manifest element has a free `tags` map (`Map<String, String>`), so a path can be written on an element and checked by a test;
- `node scripts/check-editor.mjs --list` prints the 99 upward pairs of the editor, counted by pair of layers (`application to presentation: 45`, `model to application: 8`, ...);
- `MistakeSweepTest`, `ManifestCorpus`, `ShippedFilesTest` and `scripts/byte-identity.sh` are rooted at `src/`; a model under `docs/` widens none of them.

## Problems / Opportunities

- A human cannot see how the editor (about 29,800 lines, 6 layers, 69 parts) and the CLI fit together without reading prose.
- An agent that changes one side of a twin implementation (the CLI and the editor must say the same sentences; the kernel is shared; `standalone.html` is read by many) learns of the other side from a CI failure. `grep` finds callers, not contracts.
- Using ArchiCode on ArchiCode is the first real field test of the tool on a large codebase by its own author. Its frictions are the most useful output of the wave.

## Options & Recommendation

1. **Hand-written as-is model under `docs/architecture/`, guarded by tests** (recommended). Structure and contracts are written by the author; tests keep it true (existence of layers and packages, a set of impact questions with expected answers).
2. **Generate the model from the code** (layers from `layers.json`, packages from the sources). Rejected: the model would repeat what the code already says and could not choose what to show; it would also hide the frictions of writing a model by hand, which is the point of the dogfooding.
3. **Full model with history as plateaus, stories and generated views.** Rejected by the author for now: no history, no story, no generated files. It can follow once the as-is model has proved useful.
4. **Do nothing, extend `CLAUDE.md`.** Rejected: more prose is what makes the codebase hard to read; it answers no impact question.

Two runs: the model with its saved views and loading tests first (a model nobody can load proves nothing), then the guards that keep it true and the way in for agents. A single run would mix the writing of about 40 elements with the design of the oracle.

## Vision

`docs/architecture/` holds the as-is ArchiCode model of ArchiCode: the application layer (CLI packages, the Rust/WASM kernel, the editor by layers, the contracts that tie the two tools together) and a minimal technology layer. A human opens it in the editor from a handful of saved views. An agent asks `archicode query graph` what a change touches, and `CLAUDE.md` says how. Tests load the model with both tools, check it against `layers.json` and the Java packages, and answer a fixed list of real impact questions. Every friction met on the way is a GitHub issue.
