---
type: wbc
wave: 003
status: completed
date: 2026-10-04
related:
  - CLAUDE.md
---

# Wave 003 — Standalone Workspace Editor — Business Case

## Context

ArchiCode's manifests are plain YAML, parsed and resolved entirely by the
Java CLI. Today's only editing surface is a text editor, plus — from a
separate, unrelated prior wave (`docs/wav/wav-002-manifest-web-editor`) — a
server-backed editor that requires running `editor serve`. This wave adds a
second, independent surface: a single HTML file a person can open directly
from disk (`file://`) with no process to run, no build step, and no
dependency on wav-002's server, API, or webapp code.

Nothing in the repository's registers covers this goal — there is no
`docs/CLAUDE.md` register declaration and no `docs/bkg/` or `docs/ana/`
directory. It arrives directly from a user request.

## Problems / Opportunities

- **No zero-install way to look at or edit a workspace.** Browsing or
  tweaking a workspace today means hand-editing raw YAML and mentally
  resolving cross-manifest dotted references, or standing up a local server
  (a separate capability, from a separate wave) just to get a browsable
  view.
- **No clickable dependency exploration.** Seeing an element's neighborhood
  means running `views generate` and reading a static rendered PlantUML
  file; there is no way to click from one element into a related element
  without regenerating files each time. This wave puts every other
  browsing/editing capability in place first and lets a person navigate
  via an element's listed relationships; reproducing the generated views'
  diagrams dynamically is explicitly deferred (see Vision) rather than
  attempted half-way.
- **No persistent, user-controlled folder workflow.** A browser-based tool
  that asks for folder access on every single page load, with no memory of
  "the folder I was just working in" and no explicit way to say "I'm done
  with this folder," is a worse experience than the terminal and the text
  editor it is meant to replace for quick, offline use. This is a concrete
  requirement this tool must satisfy from its first phase, not an
  afterthought: open once asks, open again reopens the same folder
  automatically, and the user can close a folder explicitly.

## Options & Recommendation

1. **File System Access API, single self-contained HTML file, no server
   (recommended).** `showDirectoryPicker()` for the initial folder choice,
   the resulting `FileSystemDirectoryHandle` persisted in IndexedDB so a
   later page load can re-request permission on the same handle instead of
   prompting a fresh picker, writes made in place inside the granted
   directory tree, and an explicit "close folder" action that discards the
   stored handle. This is the only option that delivers the open-once /
   reopen-automatically / close-explicitly workflow at all. Accepted
   downside: the File System Access API is Chromium-only today (Chrome,
   Edge, Opera, Arc) — Firefox and Safari cannot run this tool. Recorded as
   a non-goal rather than built around, since a fallback would mean
   maintaining two entirely different storage models in one file.
2. **`<input type="file" webkitdirectory>` plus `Blob`/download-link
   saves, no File System Access API.** Works in every browser, but a save
   is always a fresh download the user must manually move back into the
   folder, and `webkitdirectory` grants no persistent, revocable handle
   across page loads — "reopen the same folder automatically" and "close
   the folder" are not implementable this way. **Rejected**: fails the
   explicit reopen/close requirement outright, not just imperfectly.
3. **No filesystem bridge at all — paste or type the workspace content
   into the page.** Rejected: contradicts "browse elements within a tree"
   against a real, multi-manifest workspace on disk, and the explicit
   load/reopen/close-folder workflow has no meaning without a real folder.

## Vision

A person opens a single HTML file directly from disk in a Chromium-based
browser — no server, no CLI invocation, no build step. The first time, it
asks them to pick a workspace folder; every later time it reopens that same
folder automatically (re-confirming the browser's own permission grant as
needed); they can close it explicitly to return to picking a different one.
From there they browse the full element tree and open any element's element
view — a read-only view (its qualitative and quantitative information,
including its relationships, each clickable to jump to the destination
element's own element view) and an edition view (forms to update, add, or
remove its details) — edit the workspace's own settings and a manifest's
raw YAML directly, create a new element into an existing or a brand-new
manifest, and delete an element with its relationships elsewhere cleaned up
— with every edit ultimately saved back to the same folder on disk.
Reproducing the generated PlantUML views' diagrams dynamically is
deliberately out of scope for this wave: the element view's diagram area
ships as an inert placeholder, reserved for later.
