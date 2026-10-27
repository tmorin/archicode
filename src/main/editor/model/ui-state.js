// Top-level Applications/Environments branch expand state (IF-2). Kept
// outside AppState (deliberately not part of CTR-1's `expanded` Set,
// which is reserved for per-element tree-node expand state) — simple
// module-level booleans, defaulting to expanded for a useful first view.
let treeExpandedApplications = true;

let treeExpandedEnvironments = true;

const DEFAULT_PERSPECTIVE = 'map';

let currentPerspective = DEFAULT_PERSPECTIVE;

const panelSizeStorage = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ } }
};

// Raw-YAML editor's one pending draft (run-0009, task-005; TDD-0009
// DEC-6/DEC-10, CTR-2) — holds { relPath, text, error } for the single
// file currently showing an unsaved/rejected edit, or null. Deliberately
// module-level, not part of AppState (same rationale as the two booleans
// above): transient UI state, not model state.
let rawYamlEditDraft = null;

/**
 * The live CodeMirror instance mounted on the file-edit view's host div
 * (form UX review follow-up), or null when either CodeMirror never loaded
 * (window.CM is undefined — the plain <textarea> fallback renders instead)
 * or the file-edit view isn't the one currently showing. Destroyed and
 * re-created on every render() — innerHTML replacement already discards
 * the DOM node it was mounted on, so this avoids leaking the editor's own
 * internal listeners/timers across re-renders.
 */
let activeFileEditorView = null;

/** Live CodeMirror JSON editors for the Settings view's `views.properties`, keyed by viewpoint id — destroyed/re-created on every render() like activeFileEditorView. */
let activeJsonEditorViews = {};

/** Perspective + selection of the last full render — lets render() tell "same view, refreshed" from "navigated elsewhere" when restoring scroll. */
let lastRenderedViewKey = null;

/**
 * Delete confirmation state (TDD-0010 DEC-4, CTR-2) — holds
 * { reference, category, affected } for the element currently showing an
 * inline delete-impact-scan confirmation (overlaid on its own, already-
 * rendering edition view), or null. Deliberately module-level, not part
 * of AppState — same rationale as `rawYamlEditDraft` above: transient UI
 * state, not model state. Canceling never touches AppState (AC-11);
 * confirming is the only path that mutates anything.
 */
let pendingDeleteConfirmation = null;

/**
 * Save status (TDD-0010 DEC-11, CTR-2) — the module-level result of the
 * most recent `saveAllChanges` attempt, or `{state: 'idle'}` before any
 * attempt this session. Deliberately not part of `AppState` — same
 * rationale as `pendingDeleteConfirmation`/`rawYamlEditDraft` above:
 * transient UI state, not model state. Reset to `'idle'` at every
 * mutation chokepoint that creates a *new* unsaved change, so a stale
 * conflict/error message from a prior save attempt does not linger past
 * the edit that would resolve it.
 */
let saveStatus = { state: 'idle' };

/**
 * The Files page lists every file of the workspace, always (wave 015, run 0098, #101; there is no scope to choose). With layers the files are grouped by plateau, and a group
 * folds and unfolds. The folded groups are kept for as long as the editor is open on the same folder, and are never written in the workspace. A group has a key: `plateau:<id>`,
 * or `none` for the files that belong to no plateau (those the editor could not read, and the views and the stories, which belong to no plateau since wave 015, run 0100).
 */
let filesFolded = new Set();

let filesFoldsOwner = null; // the folder handle the folds belong to: a reload of the same folder keeps them, another folder starts again

let filesSelectionSeen = null; // the open file and the group it was in when its group was last unfolded for it

let helpOpen = false;

/**
 * A removed box was clicked on the Map or on a diagram of Elements (run 0039): `{ reference, layer, selection }`, `selection` being the selection of the page
 * (as text) at that moment. The panel shows what the baseline had of it for as long as the page's selection is that one: any other click changes the selection
 * and ends it, with no place to remember to clear it. On the page of a view in the Library the pick is the selection of the page itself (`baseline-element`).
 */
let removedPick = null;

/** Why a candidate could not be written, told in the panel; null otherwise. Cleared by the next thing done with a candidate. */
let candidateMessage = null;

/** The Changes tab was asked for while the selection of the page was this one (`rightPanelStamp`); any other selection ends it, as for `removedPick`. */
let changesTabPick = null;

let headerMenuOpen = false;

let treeQuietCache = null;

/**
 * What is selected on the page of a view in the Library: a box (an element) or a link of its diagram, read in the panel on the right. It
 * is the page's own, with the shapes of the Map's selection so that the same panels render it, and it is never `AppState.selection`:
 * a click on this page selects here and leaves the Map, Elements, their tree and the address as they are. One view at a time (another
 * view starts with nothing selected); kept while the reader is on the Map and comes back to the same view.
 */
let libraryPick = { view: null, selection: null };

/** What the last refused edit says, under its field: { view, field, text }. Gone with the next edit, another view, or leaving the Library. */
let viewEditNotice = null;
