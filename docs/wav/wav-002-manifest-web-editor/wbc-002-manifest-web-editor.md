---
type: wbc
wave: 002
status: completed
date: 2026-10-04
related:
  - CLAUDE.md
---

# Wave 002 — Manifest Web Editor — Business Case

## Context

ArchiCode today is a one-way pipeline: `workspace.yaml` + manifest YAML
files go in, PlantUML view files come out (`views generate`), or a JSON
Schema / rendered-`View` JSON comes out (`query schemas`, `query views`).
There is no command that dumps the *resolved* element/relationship graph
(the thing a human actually wants when asking "what does this depend on"),
and no write path at all — every manifest is hand-edited in a text editor,
and a relationship's `destination` (e.g. `platform.authx.backend`,
cross-manifest) is only checked lazily, the first time a view is actually
built; a dangling reference is otherwise silent until someone runs
`views generate`.

A real example workspace already lives in this repository at `.custom/`
(`workspace.yaml` + ~25 manifests under `.custom/manifests/`), used here as
the concrete target for what "browsing the tree" and "visualizing
dependencies" mean in practice.

This repository has no `docs/CLAUDE.md` register declaration and no
`docs/bkg/` or `docs/ana/` directories — there is nothing in the registers
to cite. This goal arrives directly from a user request, not from a prior
analysis or backlog item.

## Problems / Opportunities

- **No dependency visibility without a full render.** Seeing what an
  element depends on, or what depends on it, today means reading YAML
  across however many manifest files are involved and mentally resolving
  dotted ids, or running `views generate` and opening a PlantUML diagram
  that mixes rendering concerns (styles, layout) with the question being
  asked.
- **No early validation.** A broken cross-manifest reference is only
  surfaced by the view-build path (`ElementIndex.getElementByReference`),
  not by editing or parsing alone — so a typo in a `destination` id is
  invisible until much later.
- **No programmatic surface to build on.** Because the CLI only renders to
  disk or prints a schema/view, nothing else — a visual editor, a script, an
  AI assistant — has a JSON contract for "what does this workspace's
  resolved graph look like" or a way to persist an edit back. Any assisted
  editing experience (human-driven or AI-driven) is blocked on this gap
  before it is blocked on anything about the editing UI itself.

## Options & Recommendation

1. **Pure `file://` static page, no local process.** An HTML file opened
   directly from disk, using the browser's File System Access API to read
   the manifests directory and write edits back, with no companion process.
   **Rejected.** This cannot reach the stated AI-integration goal at all —
   no browser JS, under any permission, may spawn a process (`claude` or
   anything else) — and even for the plain viewer, `file://`-origin pages
   get inconsistent (often blocked) File System Access support across
   browsers, and have no way to call back into ArchiCode's own parser for
   schema validation or dependency resolution. It would end up
   reimplementing manifest parsing in JavaScript and still not solve the
   one thing this wave is actually for.
2. **Desktop app (Electron/Tauri) wrapping the same UI.** Full filesystem
   and process access, solving the sandboxing problem the same way a local
   server does. **Rejected.** It buys nothing a local HTTP server doesn't
   already buy, at the cost of a second, heavier packaging/release pipeline
   (OS-specific builds, auto-update) running alongside the existing
   Maven/JVM release — for a tool whose client-side half is just a web page.
3. **VS Code extension / webview.** Full Node access inside the extension
   host, no server to run manually. **Rejected, for now.** It would tie the
   feature to one editor, while the rest of ArchiCode is deliberately
   IDE-agnostic (a Docker-run CLI per the README). Worth revisiting later as
   an *additional* front-end against the same server contract, not as the
   first one.
4. **Extend the CLI itself with a local HTTP server (recommended).** Add
   one new read-only `query` subcommand that exposes the resolved
   element/relationship graph as JSON (reusing the parser and the
   resolution path `views generate` already uses, so dangling references
   are caught the same way), then a local, localhost-only HTTP server
   (a new capability) that serves a static single-page app and a small
   REST API: proxy that graph command and the existing `query schemas`
   command, and add the only genuinely new behavior — reading and writing
   raw manifest YAML. The AI-assist feature is one more endpoint on that
   same server: it shells out to the `claude` CLI, non-interactively,
   scoped to the workspace directory, and the resulting file changes are
   surfaced as a reviewable diff before being treated as final. This reuses
   ArchiCode's own parsing/validation as the single source of truth for
   "is this manifest valid," ships inside the one artifact users already
   run, and needs nothing from the client beyond a browser.

This wave is scoped as a real ArchiCode capability — documented and
released alongside the rest of the CLI, not a private, undocumented script
kept outside the product. If that assumption is wrong, the packaging and
`likely_paths` of every run past the first change; it is called out again
at hand-off for the human review gate.

## Vision

A human runs ArchiCode locally and gets, in addition to today's PlantUML
rendering, a local web page: it shows the full manifest tree and the
resolved cross-manifest dependency graph, lets them open any manifest's
content and edit it with the same validation the CLI already enforces, and
persists a valid edit straight to the right YAML file. From that same page,
a human can describe a change in natural language and have Claude apply it
to the real manifest files, with the result shown as a diff they review and
accept — never applied silently.
