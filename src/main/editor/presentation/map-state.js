/** The parts of the Map of the technology layer on screen that are drawn (both for any other Map, where they mean nothing). */
function mapPartsShown() {
  return mapLayer() === 'technology'
    ? Object.assign({}, technologyMapParts)
    : { applications: true, relationships: true };
}

/** The layer the Map on screen draws: the page Environments draws the technology layer, the page Applications the application layer. */
function mapLayer() {
  return currentPerspective === 'environments' ? 'technology' : 'application';
}

/**
 * The pins, the hidden elements and the open boxes of the Map of a layer, to read and to write (`state.pinned = ...`). The application layer keeps its three variables
 * (`mapPinned`, `mapHidden`, `mapOpened`); the technology layer a record. No layer asked: the Map on screen.
 */
function mapStateOf(layer) {
  if ((layer || mapLayer()) === 'technology') return technologyMapState;
  return {
    get pinned() {
      return mapPinned;
    },
    set pinned(value) {
      mapPinned = value;
    },
    get hidden() {
      return mapHidden;
    },
    set hidden(value) {
      mapHidden = value;
    },
    get opened() {
      return mapOpened;
    },
    set opened(value) {
      mapOpened = value;
    }
  };
}

/**
 * How to find a control of the header again once render() has rebuilt the page: its id, or its action with what tells
 * the twins apart (the tab, the zoom direction, the perspective). Null for anything else, which keeps no focus.
 */
function headerControlSelector(el) {
  const control =
    el && el.closest
      ? el.closest(
          '.element-header button, .element-header select, .diagram-tools button, .top-panel button, .top-panel select, .plateau-band select, .plateau-band button, .page-tabs button, .timeline-view button'
        )
      : null;
  if (!control) return null;
  if (control.id) return '#' + control.id;
  const action = control.getAttribute('data-action');
  if (!action) return null;
  let selector = '[data-action="' + action + '"]';
  for (const attribute of [
    'data-tab',
    'data-dir',
    'data-perspective',
    'data-show',
    'data-format',
    'data-plateau',
    'data-value'
  ]) {
    const value = control.getAttribute(attribute);
    if (value) selector += '[' + attribute + '="' + value + '"]';
  }
  return selector;
}

/** Give the one tab stop of the navigation to a row that is on screen: the one the user was on, else `preferred` (the selection), else the first. */
function resolveNavActive(visible, preferred) {
  if (visible.includes(navActiveKey)) return;
  navActiveKey = visible.includes(preferred) ? preferred : visible[0] || null;
}

/** Unfold the branches above an element, so that its row in the tree of the map can be seen (the element itself stays as it is). */
function expandParentsOf(reference, layer) {
  expandAncestorsOf(String(reference).split('.').slice(0, -1).join('.'), layer || mapLayer()); // a map draws one layer
}
/** Past this many boxes, "Unfold all" asks before drawing them. */
const MAP_UNFOLD_CONFIRM_BOXES = 150;

/** The map starts folded: nothing is open, not even the solutions. */
function defaultMapOpened() {
  return new Set();
}

function currentMapOpened() {
  const state = mapStateOf();
  if (!state.opened) state.opened = defaultMapOpened();
  return state.opened;
}

/** A Map is on screen: the page Applications or the page Environments (the pages Elements and Stories are about one element or one view). */
function mapIsShown() {
  return currentPerspective === 'map' || currentPerspective === 'environments';
}

/** What the kernel is given: only references that still exist (an element can be deleted while the map is on). */
function currentMapState() {
  const layer = mapLayer();
  const state = mapStateOf(layer);
  const known = (list) => Array.from(list).filter((reference) => AppState.index[layer].has(reference));
  // a comparison also draws the elements only the baseline has (removed): a box of the map that is one can be opened
  const knownToOpen = (list) =>
    Array.from(list).filter(
      (reference) => AppState.index[layer].has(reference) || comparisonHasElement(layer, reference)
    );
  return { opened: knownToOpen(currentMapOpened()), pinned: known(state.pinned), hidden: known(state.hidden) };
}

/** How many boxes the map would draw once `extra` more elements are open, children of open boxes being all drawn. */
function mapBoxesIfOpened(extra) {
  const opened = new Set(currentMapOpened());
  for (const reference of extra) opened.add(reference);
  const hidden = new Set(mapStateOf().hidden);
  let count = 0;
  for (const record of AppState.index[mapLayer()].values()) {
    const parts = record.reference.split('.');
    let shown = true;
    for (let i = 1; i < parts.length && shown; i++) shown = opened.has(parts.slice(0, i).join('.'));
    for (let i = 1; i <= parts.length && shown; i++) shown = !hidden.has(parts.slice(0, i).join('.'));
    if (shown) {
      count++;
      // issue #107: the applications deployed on a node that is open are boxes too (once each, however many nodes host them)
      if (mapLayer() === 'technology' && technologyMapParts.applications && opened.has(record.reference))
        count += new Set(kernelStringsOf(record.applications)).size;
    }
  }
  return count;
}

/** Closing an element also closes what was opened inside it. */
function closeOnMap(reference) {
  const opened = currentMapOpened();
  for (const open of Array.from(opened))
    if (open === reference || open.startsWith(reference + '.')) opened.delete(open);
}
