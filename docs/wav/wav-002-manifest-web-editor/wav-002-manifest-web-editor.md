---
type: wave
wave: 002
status: in-progress
date: 2026-10-04
related:
  - docs/wav/wav-002-manifest-web-editor/wbc-002-manifest-web-editor.md
  - CLAUDE.md
---

# Wave 002 — Manifest Web Editor

## Purpose

When this wave is done, running ArchiCode locally gets a second
capability alongside `views generate`: a local web page where a human can
browse the full manifest tree, see the resolved cross-manifest dependency
graph, edit any manifest's content with the same validation the CLI
already enforces, and save straight to the right YAML file. From that same
page, a human can describe a change in natural language and have Claude
apply it to the real manifest files, with the result shown as a diff that
must be reviewed and accepted before it is treated as final.

## Non-Goals

- Does not replace or change `views generate`'s PlantUML rendering pipeline
  — the editor is a new, independent surface built on the same parser.
- Does not support multiple concurrent users or remote access as a design
  goal — the server is meant for one local operator, invoked the same way
  as every other ArchiCode command (`docker run ... archicode editor
  serve`, mirroring the existing `views generate`/`query schemas` examples
  in `README.md`). Because Docker requires the process to listen on
  `0.0.0.0` inside the container for `-p` to work at all, the actual
  exposure boundary is the host-side port mapping the operator chooses
  (`-p 127.0.0.1:8080:8080` to stay local-machine-only vs. `-p 8080:8080`
  which reaches the whole LAN), not a loopback bind inside the server.
- Does not add authentication, authorization, or multi-tenant access
  control — there is exactly one intended user. `README.md`'s documented
  invocation must default to a loopback-only port mapping precisely
  because the server trusts anyone who can reach it.
- Does not guarantee preservation of hand-authored YAML comments or
  formatting on save — whether that is acceptable, or whether a
  format-preserving write path is required, is resolved when the editor
  run (W-3) drafts its own PRD/TDD, not at the wave level.
- Does not package the editor as an Electron/Tauri desktop app or a VS
  Code extension — see Options & Recommendation in the business case for
  why, and for how those stay revisitable later against the same server
  contract.
- Does not let the Claude-editing bridge (W-4) touch anything outside the
  target workspace directory, or apply a change without a reviewable diff
  — both are hard requirements on that run's scope, not just a preference.

## Wave Manifest

```yaml
wave_manifest:
  wave: 002
  slug: manifest-web-editor
  status: in-progress
  sources: []
  phases:
    - id: P1
      name: Resolved Graph Query
      gate:
        criteria:
          - 'running the new query command against .custom outputs valid JSON for every element and relationship'
          - 'running the new query command against a workspace with a deliberately dangling relationship destination exits non-zero with a clear error, the same way `views generate` already does'
    - id: P2
      name: Local Editor Server
      gate:
        criteria:
          - 'a GET request to the server returns the resolved graph (proxying W-1) and the raw content of a given manifest'
          - 'a write request with a schema-valid manifest payload is persisted to the correct YAML file on disk'
          - 'a write request with a schema-invalid manifest payload is rejected with a 4xx response and nothing is written'
    - id: P3
      name: Manifest Viewer & Editor Webapp
      gate:
        criteria:
          - 'opening the webapp against a running server and the .custom workspace lets a human browse the manifest tree, see at least one cross-manifest relationship rendered as a graph edge, edit a manifest field, save it, and see the change on reload'
    - id: P4
      name: Claude Editing Bridge
      gate:
        criteria: []
  runs:
    - id: W-1
      slug: resolved-graph-query
      phase: P1
      depends_on: []
      run: 4
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/query/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
      focus: 'one CLI command that answers "what does this resolve to and what is dangling," reusing the existing parser and resolution path instead of a new one'
    - id: W-2
      slug: manifest-editor-server
      phase: P2
      depends_on: [W-1]
      run: 5
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/editor/**'
        - 'tools/manifest-editor/server/**'
      focus: 'the one local process (new `editor serve` command group, invoked the same way as `views`/`query`) that reads and writes manifest YAML outside the render path, proxying W-1 and `query schemas` for everything else'
    - id: W-3
      slug: manifest-editor-webapp
      phase: P3
      depends_on: [W-2]
      run: 6
      delegation: standard
      likely_paths:
        - 'tools/manifest-editor/webapp/**'
      focus: 'the screen a human actually looks at: browse the tree, see the dependency graph, edit a manifest, save it'
    - id: W-4
      slug: claude-editing-bridge
      phase: P4
      depends_on: [W-2, W-3]
      run: null
      delegation: hard_judgment
      delegation_reason: 'touches live capability — gives a local web UI the ability to invoke an autonomous coding agent (`claude`) against the user real working tree; incorrect scoping or a missing review-before-trust step risks destructive or unintended file changes'
      likely_paths:
        - 'tools/manifest-editor/server/**'
        - 'tools/manifest-editor/webapp/**'
      focus: 'let a human describe a change in the editor and have Claude apply it to real files, with the result reviewable before it is trusted'
```

## Phase P1 — Resolved Graph Query

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0004 | `resolved-graph-query` | — | one CLI command that answers "what does this resolve to and what is dangling" | new `query graph` subcommand (naming TBD in its own PRD) that builds the full `ElementIndex`, forces resolution of every relationship the same way `views generate`/`query views` already do, and prints the resolved elements + relationships as JSON | running it against `.custom` prints valid JSON for every element/relationship; running it against a workspace with a deliberately broken `destination` id exits non-zero with the same kind of error `views generate` already produces for that case |

**Gate:** the command above is merged and both criteria in the manifest hold, checked by running it against `.custom` and against a one-off workspace with a dangling reference.

## Phase P2 — Local Editor Server

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-2 | 0005 | `manifest-editor-server` | W-1 | the one local process that reads and writes manifest YAML outside the render path | a new `editor serve` command (implementation TBD in its own TDD), invoked the same way as the README's existing `docker run ... archicode <command>` examples (e.g. `docker run -u "$(id -u):$(id -g)" -v "$(pwd):/workdir" -w /workdir -p 8080:8080 --rm ghcr.io/tmorin/archicode editor serve`), that serves a static bundle plus a REST API: the resolved graph (shelling out to W-1), `query schemas` passthrough, raw manifest read, and manifest write with schema validation before persisting | a GET for the graph and for a manifest's raw content both work; a schema-valid write is persisted to the correct file; a schema-invalid write is rejected with nothing written; `README.md`'s documented example maps the port to `127.0.0.1` by default — verifiable with `curl` or an integration test, no UI required |

**Gate:** all three P2 criteria hold against a locally running instance of the server over `.custom`.

## Phase P3 — Manifest Viewer & Editor Webapp

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | 0006 | `manifest-editor-webapp` | W-2 | the screen a human actually looks at | a single-page app served by W-2: tree navigation of the manifest hierarchy, a dependency-graph view of resolved relationships, a manifest detail/edit view backed by the JSON Schema from `query schemas`, and a save action against W-2's write endpoint with validation errors surfaced inline | a manual walkthrough against `.custom` and a running server: browse the tree, see a cross-manifest edge rendered, edit a field, save, reload and see the change persisted; an invalid edit is blocked with a visible error before save |

**Gate:** the P3 criterion holds, checked by that manual walkthrough (no visual-regression tooling exists in this repository to automate it).

## Phase P4 — Claude Editing Bridge

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | — | `claude-editing-bridge` | W-2, W-3 | let a human describe a change and have Claude apply it, reviewably | a new endpoint on W-2's server that accepts a natural-language prompt, invokes the `claude` CLI non-interactively and scoped to the workspace directory only, and a webapp surface (building on W-3) that shows the resulting file diff and requires explicit accept/discard before the change is considered final (discard must actually revert the files, e.g. via a git-backed undo) | a prompted change to a manifest in `.custom` results in a diff shown in the webapp; discarding it leaves the files byte-identical to before the prompt; the bridge cannot be made to write outside the workspace directory |

**Gate:** none — last phase.

## Dependency View

```
W-1 -> W-2 -> W-3 -> W-4
```

## Risks

- **This wave is fully serial.** Every phase holds exactly one run, and
  each depends on the one before it (the server needs the query command,
  the webapp needs the server, the Claude bridge needs both the server and
  the webapp's review surface). There is never more than one run in a
  batch, so the same-batch path-overlap check has nothing to check —
  `likely_paths` are listed for `complete-wave`'s bookkeeping, not because
  any two runs could collide. Largest concurrent batch: 1.
- **W-4 is the one run with real blast radius.** It gives a web UI the
  ability to run an AI coding agent against the user's actual files. The
  scope above requires the discard path to be a real, verified revert
  (not just "stop showing the diff") — if W-4's own TDD cannot make that
  guarantee cheaply (e.g. no git-backed undo available because the target
  workspace isn't a git repository), that is a reason for W-4 to escalate
  back to this wave's human review gate rather than ship a weaker
  guarantee silently.
- **No authentication, so host-side port exposure is the only guard.**
  `editor serve` has no auth and must listen on `0.0.0.0` inside the
  container for Docker's `-p` to work — the only thing standing between
  "local operator only" and "reachable by anyone on the LAN" is whether
  the documented invocation maps the port to `127.0.0.1` or to all
  interfaces. `README.md`'s example for this command must default to the
  loopback-restricted form; W-2's own TDD should say so explicitly rather
  than leaving it to whoever copies the example.
- **Packaging assumption.** This plan assumes the editor ships as a
  documented, released ArchiCode capability (hence `tools/manifest-editor/`
  inside this repository) rather than a private script. If that assumption
  is rejected at the review gate in favor of a personal/internal tool kept
  out of the release, every run's `likely_paths` and its PRD's framing
  change, but the dependency graph (W-1→W-2→W-3→W-4) does not.

## Completion Criteria

- `query graph` (or its chosen name) ships, outputs the resolved graph as
  JSON, and reports dangling references the same way view-building already
  does.
- The local editor server serves that graph, serves and persists manifest
  content, and enforces schema validation on every write.
- The webapp lets a human browse, visualize dependencies, edit, and save a
  real manifest in `.custom` end to end.
- The Claude bridge can apply a natural-language-described change to a
  manifest and present it as a diff that must be explicitly accepted, with
  a verified discard path, and cannot write outside the workspace
  directory.
