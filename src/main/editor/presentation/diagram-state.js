// ---- Diagram: viewpoints computed by the shared kernel, laid out by ELK, drawn as SVG ----

/*
 * The viewpoint algorithms (overview / detailed / deep), the facets and the folding of boxes are NOT implemented in
 * this file. They live in a Rust crate (src/main/rust/viewpoint-kernel) that is compiled to WebAssembly and embedded
 * below as base64 (<script id="viewpoint-kernel-wasm">), and that the ArchiCode CLI runs too, so a diagram here is
 * the same set of boxes and links the CLI writes to PlantUML. The kernel is a pure function: a graph of references
 * and relationships goes in as JSON, items and links come out. It never sees YAML or files — this section adapts the
 * in-memory model to its input (so a diagram always reflects unsaved edits) and draws its output.
 */

/**
 * Which texts the diagram draws. Null follows the default of the diagram (DIAGRAM_SHOW_DEFAULTS), a boolean is what the
 * user chose. Kept in the URL (`labels=`, `qualifiers=`, `descriptions=`, `wrap=`, only when they differ from the
 * default) and in the saved views, so that a link or a step of a story draws the same texts.
 */
let diagramShow = { labels: null, qualifiers: null, descriptions: null, wrap: null };

/** What the diagram draws now: the choice of the user, else the default of that kind of diagram. */
function diagramShows(isMap) {
  const defaults = DIAGRAM_SHOW_DEFAULTS[isMap ? 'map' : 'elements'];
  const out = {};
  for (const name of DIAGRAM_SHOW_NAMES)
    out[name] = typeof diagramShow[name] === 'boolean' ? diagramShow[name] : defaults[name];
  return out;
}

/** Only the texts that are not drawn as the default says: what a URL or a saved view has to remember. */
function diagramShowOverrides(isMap) {
  const defaults = DIAGRAM_SHOW_DEFAULTS[isMap ? 'map' : 'elements'];
  const shows = diagramShows(isMap);
  const out = {};
  for (const name of DIAGRAM_SHOW_NAMES) if (shows[name] !== defaults[name]) out[name] = shows[name];
  return out;
}

function setDiagramShow(values) {
  const source = values || {};
  diagramShow = {};
  for (const name of DIAGRAM_SHOW_NAMES) diagramShow[name] = typeof source[name] === 'boolean' ? source[name] : null;
}
let diagramResizeObserver = null;
/** True from the end of a mouse drag until the click that follows it has been swallowed. */
let diagramPanned = false;
/** The box (or its fold button) that had the focus when render() rebuilt the diagram: { fold, id }, given back once it is drawn again. */
let pendingDiagramFocus = null;

function newDiagramHostState() {
  return {
    scale: 'auto',
    center: { x: 0, y: 0 },
    shownView: null,
    scene: null,
    cache: null,
    linkStop: null,
    maximized: false
  };
}

/** The host a perspective draws its diagram for: the page of a view in the Library, else the Map and Elements. */
function diagramHostOf(perspective) {
  return perspective === 'library' ? 'library' : 'main';
}

/** Makes `host` the one whose diagram state the live globals hold. Idempotent. */
function useDiagramHost(host) {
  if (host === diagramHost) return;
  const live = {
    scale: diagramScale,
    center: diagramCenter,
    shownView: diagramShownView,
    scene: diagramScene,
    cache: diagramCache,
    linkStop: diagramLinkStop,
    maximized: diagramMaximized
  };
  const parked = parkedDiagramHost;
  diagramScale = parked.scale;
  diagramCenter = parked.center;
  diagramShownView = parked.shownView;
  diagramScene = parked.scene;
  diagramCache = parked.cache;
  diagramLinkStop = parked.linkStop;
  diagramMaximized = parked.maximized;
  parkedDiagramHost = live;
  diagramHost = host;
  pendingDiagramFocus = null; // a box that had the focus on the other host is not a box of this one
}

const DIAGRAM_SCALES = [0.25, 0.33, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3];
/** More unknown destinations than this are counted, not drawn. */
const DIAGRAM_MAX_GHOSTS = 12;

const ELEMENT_TABS = {
  details: {
    label: 'Details',
    title: 'The element itself: its properties, its relationships, and the way to edit it.'
  },
  overview: {
    label: 'Overview',
    title: 'The direct relationships of this element, grouped under the nearest element they can be shown on.'
  },
  detailed: { label: 'Detailed', title: 'The overview of each element inside this one, combined.' },
  deep: { label: 'Deep', title: 'Every relationship of this element and of everything inside it, ungrouped.' }
};

const DIAGRAM_VIEWPOINTS = {
  overview: {
    label: 'Overview',
    title: 'The direct relationships of this element, grouped under the nearest element they can be shown on.'
  },
  detailed: { label: 'Detailed', title: 'The overview of each element inside this one, combined.' },
  deep: { label: 'Deep', title: 'Every relationship of this element and of everything inside it, ungrouped.' }
};

// ---- The map viewpoint: no focal element, every element of the layer is in play ----
// Wave 015 (run 0099, W-11, #92): there are two Maps, the page Applications (the application layer) and the page Environments (the technology layer). They are one code with the layer
// as a parameter (`mapLayer()`), and each keeps its own pins, hidden elements and open boxes: a reference can exist in both layers, and a pin of one layer means nothing in the other.
