---
title: Editor — remember several folders, list them when none is open, and forget the unwanted ones
type: tdd
status: completed
date: 2026-10-13
run: 0020
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0015-workspace-name/run-0015-workspace-name.md
---

# Editor — remember several folders, list them when none is open, and forget the unwanted ones

# Summary

The standalone editor remembers one folder: a single IndexedDB record (`workspace` → `{handle}`), reopened on load,
deleted by "Close folder" and by a refused permission. This design remembers **every folder opened**, each with the
name its workspace gives itself (`settings.name`, run 0015), lists them on the landing card whenever no folder is open,
lets each be opened (the click is the user gesture a permission needs) or **removed from the list** (nothing on disk),
and keeps opening the last folder directly on load when its permission still holds. The single record of today is
migrated without ever being lost. Scope arrives settled from the wave plan (row W-9) and the dispatch brief, so there is
no PRD.

# Scope

In: `src/main/resources/editor-webapp/standalone.html` (the IndexedDB helpers, the folder flows, the landing card and
its CSS, one click action pair, `openingMessage`), `src/test/javascript/viewpoint-kernel/harness.js` (a fake
`indexedDB`) and a new `src/test/javascript/viewpoint-kernel/folders.test.js`, the test of `openingMessage` in
`workspace-name.test.js` (its contract changes), the manual (`src/doc/README.adoc`, `[[editor-open]]` and
`[[editor-workspace-name]]`).

Out: `archicode editor serve` (no list, no IndexedDB, no "Close folder": unchanged), the Rust kernel and its base64
block, the Java side.

# PRD Traceability

No PRD (profile `TDD+pln`): traceability is incomplete by construction. The requirements, from the plan row W-9 and the
dispatch brief (decided by the user, not re-opened here):

- R1 — On load, the last folder opens directly when its permission still holds (today's `tryAutoReopen`).
- R2 — With no folder open (after "Close folder", or when a permission must be asked again), the landing card lists
  every remembered folder; each can be opened (a click) or removed from the list.
- R3 — The remove action says that nothing is deleted on disk; its accessible name names the folder.
- R4 — A new storage layout, with migration of the single `workspace` record; a failed or interrupted migration leaves
  the old record usable.
- R5 — Folders are de-duplicated with `FileSystemHandle.isSameEntry`.
- R6 — Each folder remembers the name of its workspace, stored when it is opened and refreshed on each open; the list
  shows it, with the folder name as secondary text.
- R7 — "Close folder" closes and keeps the folder remembered; only Remove forgets.
- R8 — A refused or failed permission keeps the entry (today it is deleted).
- R9 — Nothing of this in `archicode editor serve`.
- R10 — `openingMessage` is fed from the stored name; `lastWorkspaceName` goes (W-4's finding).
- R11 — The harness gets a fake `indexedDB`; tests for migration, listing, open, remove, dedup, served mode.

# Technical Goals

- Never lose a remembered folder through a migration, a failed write, a refused permission or a close.
- No IndexedDB version upgrade, so no `onupgradeneeded` on existing databases, no blocked open, no older copy of the
  page locked out.
- The landing card stays one pure function of in-memory state (`landingScreenConfig`), testable without a browser.

# Non-Goals

- No cap on the number of remembered folders, no sorting choice, no renaming of an entry in the list.
- No full path in the list: the File System Access API gives a handle's `name`, never its path.
- No undo of a removal: picking the folder again remembers it again.
- No synchronisation of the list between two open tabs while they run (each reads it when it shows the landing card).

# Assumptions

- A-1 — `FileSystemHandle.name` is readable without a permission, and `isSameEntry` needs none (Chromium since 86).
- A-2 — A `FileSystemDirectoryHandle` read from IndexedDB can be written back (`put`); if one cannot, `put` throws a
  `DataCloneError` synchronously (IndexedDB spec, "clone a value"), which aborts nothing by itself.
- A-3 — A request error that is not `preventDefault`-ed aborts its transaction, and an aborted transaction leaves no
  trace; `complete` fires only after a commit. An interrupted page (closed tab) commits nothing of an unfinished
  transaction.
- A-4 — `requestPermission` needs a transient user activation: it is called before any `await` in the click handler
  (as `reopenFolder` does today). It resolves `granted` at once for a folder already granted.
- A-5 — A handle whose directory was moved or deleted still has its `name`; reading through it rejects with
  `NotFoundError` (what `loadWorkspace` already turns into the error card).
- A-6 — A browser may answer a second `requestPermission` in the same page with `denied` without prompting (not verified
  here; only the rationale of DEC-6 depends on it, not its behaviour).

# Constraints

- CON-1 — The page script runs in Node's `vm` for every test: the IndexedDB code must run against a fake.
- CON-2 — The landing wording about permission stays as it is ("Welcome back", "Your browser needs your permission to
  read “x” again.", "Reopen “x”", "Choose another folder").
- CON-3 — No `await` of anything but IndexedDB inside an IndexedDB transaction (it auto-commits): `isSameEntry` runs
  between transactions.
- CON-4 — The base64 kernel block is not touched.

# Current State

- `openArchicodeDb` opens `archicode-standalone-editor` version 1, creating the `handles` store (no keyPath) on upgrade;
  connections are never closed. `get/put/deleteStoredHandleRecord` read, write and delete the record at key
  `workspace` and resolve on the request's success (before the commit).
- `openFolder` (the picker) writes the record, and a failure of that write turns into "Failed to open folder".
- `tryAutoReopen` reads the record; `queryPermission` → `granted` opens the folder, anything else (or a throw) shows
  the reopen card (`permissionState: 'needs-click'`).
- `reopenFolder` (the reopen card's button) asks the permission; refused, dismissed or thrown → the record is deleted
  and the first-launch card shows.
- `closeFolder` deletes the record.
- `lastWorkspaceName` remembers, in memory, the name of the last workspace rendered; `openingMessage(folder)` uses it.
- The harness gives `indexedDB: {}`: every call fails (`indexedDB.open is not a function`); `tryAutoReopen` and
  `closeFolder` log and swallow it, `openFolder` would turn it into "Failed to open folder" (no test reaches it).

# Proposed Design

## Decisions

### DEC-1 — Same database, same version, same store: the layout changes at the record level

The database stays `archicode-standalone-editor` **version 1**, store `handles`. Two kinds of record:

- key `workspace` → `{ handle, id }`: **the last folder** (what the page opens on load). Same key and same `handle`
  field as today, so an older copy of the page still reopens it; `id` names the folder record it stands for. A record
  without `id` was written by an earlier version: it is migrated (DEC-2).
- key `folder:<id>` → `{ kind: 'folder', id, handle, name, openedAt }`: **one record per remembered folder**. `name` is
  the workspace's `settings.name` ('' when none), `openedAt` a `Date.now()` that orders the list (most recent first).

Why no version upgrade, though a new object store would be cleaner: (a) today's page never closes its connections and
has no `onversionchange`, so an upgrade to version 2 would be **blocked** as long as an older tab is open, and the new
page would hang on "Looking for your last workspace…"; (b) an older copy of the page (a saved `standalone.html`, a
cached published page) would get a `VersionError` on version 1 and lose even its single folder; (c) an upgrade that
throws aborts and fails every later open. A data-level migration in one `readwrite` transaction is as atomic as an
upgrade (A-3) and has none of these. One record per folder, rather than one array record, means a write touches only its
own keys: two tabs adding two folders do not overwrite each other's list.

Every connection is closed when its transaction ends, and `onversionchange` closes it too, so that a future upgrade is
never blocked by this page.

All access goes through one helper, `withArchicodeStore(mode, work)`: it opens a connection and one transaction on
`handles` and calls `work(store)`, which only queues requests and reads their results in their `onsuccess` callbacks —
never after an `await` — so a read and the write it decides run in the same transaction. A throw from `work` (a
synchronous `DataCloneError`) is caught and followed by `tx.abort()`; a throw in a callback or a request error aborts the
transaction (A-3). The promise resolves with `work`'s result on `complete` and rejects on `abort`; the connection is
closed either way. A fallback read is a new call, never a second request in an aborted transaction.

A new folder `id` is `Date.now().toString(36) + '-' + ` eight random base-36 characters (`crypto` is not assumed: the
tests run the page in a `vm` without it).

### DEC-2 — Migration: rewrite the old record in place, in one transaction, never delete it

`readRememberedFolders()` reads every value of the store (`getAll`) and the `workspace` record in one read transaction.
If the `workspace` record has a `handle` and no `id`, or an `id` with no folder record, it is migrated:

1. Outside any transaction, compare its handle with each folder record (`isSameEntry`, CON-3): the same folder → reuse
   that record's `id`; none → a new `id` and a new folder record (`name: ''`, `openedAt: now`).
2. In **one** `readwrite` transaction: read `workspace` again. Its `id` changed (another tab migrated it, or opened
   another folder): nothing is written. Same `id` but another `handle.name` (an older tab picked another folder
   meanwhile): the folder record of the handle compared in step 1 is added when new, `workspace` is left alone (the next
   load migrates it), so neither folder is lost. Otherwise: `put` the folder record when new, and `put` `{ handle, id }`
   at `workspace`.

The old record is never deleted, only rewritten with one more field, in the same transaction as the record it points to.
Failure cases:

- `put` throws `DataCloneError` (A-2): caught, the transaction is aborted explicitly, nothing is written.
- `put` fails asynchronously (quota, I/O): the transaction aborts (A-3), nothing is written.
- The tab closes mid-way: nothing of an uncommitted transaction is kept (A-3).
- In every failure the old record is still at `workspace`, unchanged. The page then **uses it as it is**: it is the last
  folder (opened on load as today) and the list shows it as an entry with `id: null` (`legacy`); opening or removing that
  entry works on the `workspace` key (DEC-6, DEC-7). The next load tries the migration again.

A `getAll` that fails (one stored value cannot be read back) aborts its transaction; a **new** read transaction then
gets `workspace` alone: the last folder is still reopened, the list holds only it, and nothing is migrated or written
from so partial a view. (A value that cannot be read back cannot be removed from the page either.)

### DEC-3 — Remember on open, with de-duplication

`rememberFolder(handle, entry?)` runs when a folder opens with its permission (picker, list, reopen card):

- with a known entry (an `id`): its record gets `openedAt: now`, and `workspace` becomes `{ handle, id }`;
- otherwise (the picker, a `legacy` entry): `isSameEntry` against each remembered folder; the same folder → that
  entry, as above; none → a new record. A folder picked twice is one entry.

The write is one `readwrite` transaction (folder record + `workspace`). A failure to remember is logged and **does not
stop the folder from opening** (today it turns into "Failed to open folder"): the folder is open, just not remembered.

### DEC-4 — The name of each folder's workspace

After `loadWorkspace` succeeds for a remembered folder (`AppState.folder.id`), `noteWorkspaceName()` writes
`workspaceName()` into its record when it differs (one `readwrite` transaction: `get` then `put` in the same
transaction; a record that is no longer there — removed in another tab — is left absent), and into the in-memory list. It runs after a successful save that wrote `workspace.yaml` too, so a name
changed in Settings shows in the list without reopening. It never runs in served mode (no `id`). Failure: logged,
ignored.

`openingMessage(folderName, name)` returns `Opening “name”…`, or `Opening “folderName”…` when `name` is empty. Each call
site passes the stored name of the folder it opens (the list entry, the last folder); the served folder and a folder
picked for the first time have none. `lastWorkspaceName` and its assignment in `render()` go.

### DEC-5 — "Close folder" keeps the folder; the last-folder pointer goes

`closeFolder()` (after its unsaved-changes confirmation, unchanged) deletes the `workspace` record **only when it points
at the folder being closed** (same `id`, checked inside the transaction): the folder record stays, so the folder is in
the list; the next load does not reopen it (closing says "not this one now", as today). A folder without `id` (a
`legacy` one, or one whose remembering failed when it was opened) is remembered first (DEC-3), then its pointer cleared;
if remembering fails storage is not touched, since the pointer may be the only trace of the folder. Then the landing card
shows the list.

### DEC-6 — Opening from the list; a refused permission keeps the entry

The list's Open button (`open-remembered-folder`, `data-folder-id`) and the reopen card's "Reopen “x”" both call
`openRememberedFolder(entry)`:

1. `requestPermission({ mode: 'read' })`, first thing in the click (A-4).
2. `granted`: another folder than the one the page holds → `AppState` and the UI state are reset (as `openFolder` does);
   the busy message says the stored name; `rememberFolder`; `loadWorkspace`.
3. Refused, dismissed or thrown: **the entry stays** (record and `workspace` untouched); the page goes to the list (no
   folder), the entry carries a problem line, and a status line says it for screen readers. Mapping: `denied` /
   `prompt` (dismissed) and any throw but `NotFoundError` → "The browser did not give access to this folder."; a thrown
   `NotFoundError` → "This folder could not be reached: it may have been moved or deleted."

Why go to the list rather than stay on the reopen card: a browser may not prompt again in the same page after a refusal
(A-6), so the reopen button could only fail again; the list offers the other folders, the picker and Remove.

A folder that opens but whose `workspace.yaml` cannot be read (a moved directory, A-5) shows today's error card, which
gains a secondary action **"Remembered folders"** (`show-folders`) when the list is not empty: it closes that folder
(without touching storage) and shows the list, where that entry carries "workspace.yaml could not be read the last time."
and can be removed.

### DEC-7 — Remove from the list

`Remove from the list` (`forget-folder`, `data-folder-id`) calls `forgetRememberedFolder(entry)`: one `readwrite`
transaction deletes `folder:<id>`, and `workspace` when it points at that `id` (read and deleted in the same
transaction). A `legacy` entry deletes the `workspace` record only if, inside the transaction, it has the same
`handle.name` and still no `id`; if another tab migrated it meanwhile (an `id`, same `handle.name`), that `id`'s folder
record goes with it. Nothing else: no file, no permission, no other entry. No
confirmation dialog: the action loses nothing that picking the folder again does not restore, and the label says so. If
the removed entry is the folder the reopen card was offering, the page returns to the first-launch card with the
remaining list. A status line says "“x” is no longer in the list. Nothing was deleted on disk." The focus goes to the
next entry's Open button, else the previous one's, else the primary button. A failed delete keeps the entry and says so.

### DEC-8 — The landing card

The list belongs to the `first-launch` and `reopen` kinds (`landingScreenConfig` adds `folders`, and `notice`), never to
`busy`, `error`, `unsupported`, or anything in served mode. Markup, after the card's actions:

```html
<section class="landing-folders" aria-labelledby="landing-folders-title">
  <h2 id="landing-folders-title">Remembered folders</h2>
  <ul class="landing-folder-list">
    <li class="landing-folder">
      <button type="button" class="landing-folder-open" data-action="open-remembered-folder" data-folder-id="ID"
              aria-label="Open “Shop” (folder archi)">
        <span class="landing-folder-name">Shop</span><span class="landing-folder-dir">(folder icon)<span>archi</span></span>
      </button>
      <button type="button" class="btn-ghost landing-folder-remove" data-action="forget-folder" data-folder-id="ID"
              aria-label="Remove “Shop” (folder archi) from the list">Remove from the list</button>
      <p class="landing-folder-problem">…</p>
    </li>
  </ul>
  <p class="landing-note">Removing a folder from the list only makes this browser forget it: nothing is deleted on disk.</p>
</section>
```

Without a workspace name the button shows the folder name alone and its label is `Open “archi”`. The list scrolls
inside the card past a height (`max-height`, `overflow-y: auto`), so many folders never push the card off the screen.
A line separates two folders and Remove stays at the right of its row: on a narrow card it wraps under its own folder
(seen on the replica at 375 px, where without them it read as belonging to the next one).
Colours are the CSS variables (light and dark, run 0014). "Choose another folder" / "Open workspace folder" stay the
picker. The reopen card lists every folder, the last one included (the user decided "all"); its primary button stays.

### DEC-9 — State in memory

`rememberedFolders` (module level, like `landingBusy`): `[{ id, handle, name, openedAt, legacy?, problem? }]`, most
recent first; `landingNotice`: a string or null. Both are read by `landingScreenConfig`. `AppState.folder` gains `id`
(the remembered entry, absent in served mode or when not remembered). The list is read from storage on load
(`tryAutoReopen`), after a close and after `show-folders`; Remove and open update it in memory. A re-read keeps the
`problem` of each entry it already held (by `id`), so the line set by DEC-6 survives `show-folders`. A legacy entry has
`id: null` in memory and `data-folder-id=""` in the markup.

### DEC-10 — Served mode

`isServedByArchiCode()` → `landingScreenConfig` never adds `folders`, the error card never adds "Remembered folders",
and the storage helpers return at once (`readRememberedFolders` → empty, the writers do nothing). No IndexedDB call is
made in served mode.

# Repository Impact

- IMP-1 — `standalone.html`, JS: the storage helpers (`openArchicodeDb` closing its connections, `withArchicodeStore`,
  `readRememberedFolders` with the migration, `rememberFolder`, `noteWorkspaceName`, `forgetRememberedFolder`,
  `clearLastFolder`); `openFolder`, `reopenFolder` (→ `openRememberedFolder`), `closeFolder`, `tryAutoReopen`,
  `retryFolder`, `openServedFolder` (busy message); `showRememberedFolders`; `loadWorkspace` (name hook); the save
  (name hook); `openingMessage`; `render()` (no `lastWorkspaceName`, the landing focus); `landingScreenConfig`,
  `renderLandingHtml`; `handleAppClick` (`open-remembered-folder`, `forget-folder`, `show-folders`).
- IMP-2 — `standalone.html`, CSS: `.landing-folders`, `.landing-folder*`, `.landing-notice`.
- IMP-3 — `harness.js`: `fakeIndexedDB()` (default for `createApp`, or `options.indexedDB`), `isSameEntry` on the
  directory handles.
- IMP-4 — `folders.test.js` (new); `workspace-name.test.js` (the `openingMessage` test follows the new contract).
- IMP-5 — `README.adoc`: `[[editor-open]]` gains the remembered folders; `[[editor-workspace-name]]` the "Opening"
  sentence.

# Canonical Impact

- CI-arc-1 — None. The repository declares no `arc` register (no `docs/arc`, no `docs/CLAUDE.md`); the change is the
  browser-side memory of one file of the editor.
- CI-dom-1 — None. No `dom` register is declared, and no invariant of the model, the manifests or the kernel changes:
  what is stored is per-browser state of the editor.

# Data Model and Contracts

- CTR-1 — IndexedDB `archicode-standalone-editor` v1, store `handles` (no keyPath): `workspace` → `{ handle, id }`
  (`id` absent when written by an earlier version); `folder:<id>` → `{ kind: 'folder', id, handle, name, openedAt }`.
  Readers ignore any other value.
- CTR-2 — `landingScreenConfig()` for `first-launch` and `reopen`: `folders: [{ id, title, folder, problem }]` (`id` is
  the markup's `data-folder-id`, `''` for a legacy entry, `title` the workspace name or the folder name, `folder` the folder name when it differs from
  `title`, else null), `notice: string | null`.
- CTR-3 — `openingMessage(folderName, name?)` → `Opening “…”…`.

# Interfaces and Behavior

- IF-1 — Landing card with remembered folders: one list item per folder, an Open button and a Remove button each, both
  naming the folder in their accessible name, a note that nothing is deleted on disk.
- IF-2 — Reopen card: unchanged wording, then the list.
- IF-3 — Error card: "Remembered folders" when the list is not empty (not in served mode).
- IF-4 — Status line (`role="status"`) for a removal or a refused permission.

# Flows and Processing Logic

- FLOW-1 — Load: busy → `readRememberedFolders` (migrates) → no `workspace` → first-launch with the list; a
  `workspace` → `queryPermission` → granted: open it; otherwise (or a throw): reopen card with the list.
- FLOW-2 — Picker: pick → `rememberFolder` (dedup) → busy (stored name) → load → name noted.
- FLOW-3 — List / reopen: click → `requestPermission` → granted: reset when another folder, `rememberFolder`, load;
  refused/throw: list with a problem line and a status.
- FLOW-4 — Close: confirm unsaved → `clearLastFolder(id)` → reset → `readRememberedFolders` → list.
- FLOW-5 — Remove: one transaction → list in memory updated → status → focus.

# Reliability, Performance, and Scalability

Each folder costs one record and, when a folder is picked, one `isSameEntry` per remembered folder: negligible for any
plausible list. Every write resolves on the transaction's `complete`, not on the request's success, so a write the
browser could still abort is never reported done.

# Security and Privacy

Nothing leaves the browser. Handles stay in the origin's IndexedDB as today; Remove deletes the record, and the browser's
own permission for that folder is left as the browser keeps it (the API offers no way to revoke it).

# Observability and Verification

- Node tests with the fake (`folders.test.js`): migration of a version-1 record (folder record created, `workspace`
  rewritten with `id`, never deleted); migration failing (`DataCloneError`, an asynchronous `put` error) leaves the old
  record as it was and lists it as a legacy entry that opens and can be removed; migration of a record that matches an
  existing folder reuses it; two folders both listed with name and folder name, most recent first; Open (granted /
  refused / thrown) and the entry kept; Remove deletes only that record (and `workspace` when it pointed at it); the
  same folder picked twice is one entry; Close keeps the folder and clears the pointer; the name stored on open and
  refreshed; the reopen card wording unchanged, with the list; the error card's "Remembered folders"; served mode makes
  no IndexedDB call and shows no list; accessible names; the CSS rules exist with variables only.
- `node --test "src/test/javascript/**/*.test.js"`, `./mvnw verify` (JDK 25), `embed.sh --check`.
- A replica of the landing card (real stylesheet, markup from `renderLandingHtml`) in the built-in browser, light and
  dark. Not confirmable here: a real IndexedDB with real handles, a real permission prompt, a real migration.

# Deployment and Rollout

Ships with the editor. Users of an earlier version keep their folder: it is migrated on the first load (DEC-2), and an
older copy of the page still reopens the last folder (DEC-1).

# Risks and Tradeoffs

- RISK-0 — An older tab writing a folder with the same `handle.name` as the one being migrated, in the milliseconds
  between the two steps of DEC-2, is taken for the same folder. Accepted.
- RISK-1 — Two tabs picking the same folder at the same moment can each add a record (the dedup runs between
  transactions, CON-3). Effect: a duplicate line, removable. Accepted.
- RISK-2 — Names are not unique and the API gives no path: two folders named `archi` without a workspace name look the
  same. The workspace name, when set, tells them apart. Accepted.
- RISK-3 — The fake `indexedDB` is not a browser: the transaction semantics it models (atomic commit, abort on error,
  synchronous `DataCloneError`) are the spec's, but the real migration is only verifiable in a real browser.

# Open Questions

None.

# Deferred Work

- DEF-1 — Show each entry's permission state (granted / to ask) in the list (`queryPermission` per entry).
- DEF-2 — Merge duplicate records of the same folder when the list is read (RISK-1).

# File Placement and Frontmatter

`docs/wav/wav-004-editor-workspace-experience/run/run-0020-multiple-folders/tdd-0020-multiple-folders.md`, `run: 0020`,
`wave: 004`.
