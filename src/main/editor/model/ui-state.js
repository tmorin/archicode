// Top-level Applications/Environments branch expand state (IF-2). Kept
// outside AppState (deliberately not part of CTR-1's `expanded` Set,
// which is reserved for per-element tree-node expand state) — simple
// module-level booleans, defaulting to expanded for a useful first view.
let treeExpandedApplications = true;

let treeExpandedEnvironments = true;

const DEFAULT_PERSPECTIVE = 'map';

let currentPerspective = DEFAULT_PERSPECTIVE;

const panelSizeStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* storage unavailable */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* storage unavailable */
    }
  }
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

/** 'overview' | 'detailed' | 'deep' — a preference shared by every element, kept in the URL (`vp=`). */
/** What the center of the Elements perspective shows for the selected element: its page, or one of its diagrams. */
let elementTab = 'details';

/** Name of the facet the diagram is drawn through (null: the workspace itself), kept in the URL (`facet=`). */
let diagramFacet = null;

/** The Diagram perspective gives the whole window to the diagram: no tree on the left, no properties or relations. */
let diagramMaximized = false;

/** Leaves out of the diagram the boxes that no link reaches (the focal one and what encloses a kept box stay). */
let diagramHideUnlinked = false;

/** Wave 027, run 0202 (DEC-4): the boxes per row chosen on the toolbar of the diagram on screen, or null (the view, then the workspace, decide). View state: never `modelsChanged()`. */
let diagramColumns = null;

const DIAGRAM_SHOW_NAMES = ['labels', 'qualifiers', 'descriptions', 'wrap'];

/** The Map is dense: it starts without any of them. An element's diagram starts as the command line draws it (the descriptions apart). */
const DIAGRAM_SHOW_DEFAULTS = {
  elements: { labels: true, qualifiers: true, descriptions: false, wrap: false },
  map: { labels: false, qualifiers: false, descriptions: false, wrap: false }
};

/**
 * How the diagram is framed. 'auto' (how a diagram opens): the element, at a readable size, never more than 100%, with
 * no empty margin the drawing does not need. 'fit': the whole drawing, however small. A number: what the user chose
 * (1 is the natural size), with `diagramCenter`; navigating to another diagram goes back to 'auto'.
 */
let diagramScale = 'auto';

/** Invalidates a slower, older layout when a newer one has been requested. */
let diagramSeq = 0;

/** The last computed diagram: { key, scene }, so an unrelated re-render does not recompute or flash it away. */
let diagramCache = null;

/** The diagram on screen (see `buildDiagramScene`), and the identity of what it shows (element | viewpoint | facet). */
let diagramScene = null;

let diagramShownView = null;

/** The canvas' scroll position just before a re-render replaced it. */
/**
 * The point of the drawing that is in the middle of the canvas (the drawing's own pixels at 100%), with `diagramScale`
 * the whole "camera": the canvas is a free surface, and every canvas — the Diagram perspective's, the Elements
 * perspective's, a maximized one — shows the same part of the same diagram, whatever its size.
 */
let diagramCenter = { x: 0, y: 0 };

let viewpointKernelPromise = null;

let elkPromise = null;

/**
 * The diagram on screen is not the model: the camera, the scene, the cache, the tab stop of the links and whether it is maximized
 * belong to the host that draws them. The Map and the diagrams of Elements ('main') have always shared one set of them (the same diagram keeps
 * the view the user chose, whichever of the two shows it); the page of a view in the Library ('library') has its own. The live
 * globals (`diagramScale`, `diagramCenter`, `diagramShownView`, `diagramScene`, `diagramCache`, `diagramLinkStop`, `diagramMaximized`) are those of
 * `diagramHost`; the other host's are parked here, and `useDiagramHost` swaps them. Nothing a host does to its own diagram can
 * then show on the other.
 */
let diagramHost = 'main';

let parkedDiagramHost = newDiagramHostState();

/** The version of the kernel's input/output contract this editor was written for. */
const KERNEL_CONTRACT_VERSION = 5;

/** Element kinds that can never contain other elements — the kernel's `parent` flag is the opposite. */
const LEAF_KINDS = ['person', 'component'];

/**
 * Whether the key to a comparison, under the diagram, is open (wave 018, run 0130, #132). Folded, it is one row with the sample, the glyph, the word and the count of each state; open, it also says
 * how each line is drawn, capped at about 30 % of the diagram area, with its own scroll. View state only: kept while the editor stays open on the folder, not an input of any diagram or
 * cache, not in the address, not in the workspace; no `modelsChanged()`.
 */
let diagramKeyOpen = false;

/**
 * The links of a diagram are one tab stop (roving tabindex): `tabindex="0"` on one of them, `-1` on the others, and the arrow
 * keys move among them (`handleDiagramKeydown`). The stop is where the focus last rested in the group; this is that link's
 * key, or null (nothing remembered yet, or the selection came from elsewhere, an address).
 */
let diagramLinkStop = null;

/** What is open on the map of the application layer; null until the map is first drawn, then the default plus what the user opened or closed. */
let mapOpened = null;

/** The elements the map of the application layer is about (none: all of them), and the ones it leaves out. */
let mapPinned = [];

let mapHidden = [];

/** The relationships the Map of the application layer is narrowed to, as entries `{ source, destination, label }` (none: the whole map; view state, wave 026 run 0199). */
let mapLinks = [];
/** The relationships a Map of the application layer draws heavy (wave 026, run 0200, issue #143, DEC-1): entries `{ source, destination, label }`, view state like `mapLinks`. */
let mapHighlight = [];

/** The controls of the list of relationships under the tree of the page Applications: whether it is open, its text filter, its kind select ('' is any kind) and "Ticked only" (view state, reset with the folder; wave 026 run 0199). */
let mapLinksListOpen = false;

let mapLinksFilter = '';

let mapLinksKind = '';

let mapLinksTickedOnly = false;

/** The same three, for the map of the technology layer (the page Environments). */
let technologyMapState = { opened: null, pinned: [], hidden: [] };

/**
 * What the Map of the technology layer draws besides its environments and nodes (wave 016, run 0114, issue #107): the applications deployed on the nodes, as boxes inside them, and the
 * relationships (the ones the technology elements declare, and the dependencies between environments that the deployed applications give). Both are drawn, a choice of whoever looks:
 * the tools of the diagram turn them off, a saved view keeps `applications: false` and `relationships: false`, the address `applications=0` and `relationships=0`. The Map of the
 * application layer has neither.
 */
const MAP_PARTS = ['applications', 'relationships'];

let technologyMapParts = { applications: true, relationships: true };

/** The row (a `nodeKey`) of the tree that takes the focus when the user tabs into it (one tab stop for the whole tree). */
let navActiveKey = null;

/** The next render brings the selected row of the tree into view (set when the selection changes without a click in the tree). */
let scrollNavToSelection = false;

/**
 * An action of the map (fold, hide, pin, hide unlinked, facet) is about to redraw it: the element selected, if the
 * redraw no longer draws it, is then deselected (showDiagramScene does it, once it knows what was drawn). A map that
 * merely opens on an element carried over from Elements keeps it, so that Open in Elements leads back to it.
 */
let mapSelectionCheck = false;

/** What the kernel has already warned about (a facet in a syntax that is going away): said once, not at every redraw. */
const kernelWarningsShown = new Set();

/** What makes a plateau, said wherever a workspace has none and is asked for one (`WorkspaceFactory.NO_PLATEAU`). */
const NO_PLATEAU = ' (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)';

/** The dialog on screen ({ kind: 'text' | 'story-picker', … }), or null. */
let appDialog = null;

/** The step text of the story bar is a box to type in (true), or the words to read (false). */
let storyBarEditing = false;

/** One line over the story bar after something was done ("Added as step 3 of…"); the next action clears it. */
let storyBarNotice = null;

/** The step just taken out of a story, for Undo: { storyId, index, step }. */
let removedStep = null;

/** The control to put the focus on once the page is redrawn: render() replaces every control. */
let pendingFocusSelector = null;

/**
 * What the author typed in the form of an element while a dialog that waits for an answer stands in front of it (wave 017, run 0121, #123: `layer-confirm`, the plateaus a write
 * changes, and `rename-siblings`, the views a rename leaves behind). Saving the form opens the dialog and `render()` gives the form afresh from the model, behind the dialog,
 * so Cancel (and Escape, and a click beside the dialog) used to leave every field as the model has it. It is view state: the fields as typed, nothing of the model, and no
 * `modelsChanged()`. `render()` puts them back each time it draws the form of the same element while the dialog is open, and once more when the dialog is gone; a yes
 * clears it before the write, so what is written is never reread from it.
 */
let keptElementForm = null;
