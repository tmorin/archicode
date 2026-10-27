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
