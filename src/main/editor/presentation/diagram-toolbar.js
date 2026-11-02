// ---- Diagram: the perspective's markup and the computation behind it ----

/**
 * The canvas, its tools and the status line; `mountDiagramIfNeeded` fills the canvas once render() has put it in the page.
 * `host` is only given by the page of a view in the Library ({ view, isMap, hideUnlinked, shows }, see `libraryDiagramRecipe`): its
 * canvas names the view, its tools show what that page draws and offer no folding (a Map view's open boxes are part of the view).
 */
function renderDiagramCanvasHtml(record, overlayHtml, host) {
  // no record: the map of the whole layer (the workspace for the application layer)
  const subject = host
    ? 'the view ' + escapeHtml(viewLabel(host.view))
    : record
      ? escapeHtml(record.name || record.id)
      : mapLayer() === 'technology'
        ? 'the technology layer'
        : 'the workspace';
  const canvasAttributes = host
    ? ' data-host="library" data-view="' +
      escapeHtml(host.view.id) +
      '" tabindex="0" aria-label="Diagram of ' +
      subject +
      '. Arrow keys move between boxes, Enter selects one, plus and minus zoom."'
    : (record ? '' : ' data-map="true"') +
      ' tabindex="0" aria-label="' +
      (record ? 'Diagram' : 'Map') +
      ' of ' +
      subject +
      '. Arrow keys move between boxes, Enter opens one, plus and minus zoom." data-ref="' +
      (record ? escapeHtml(record.reference) : '') +
      '"';
  return (
    renderDiagramToolbarHtml(record, host) +
    '<div class="diagram-stage">' +
    (overlayHtml || '') +
    '<div class="diagram-canvas" id="diagram-canvas"' +
    canvasAttributes +
    '><span class="muted">Computing the diagram…</span></div></div>' +
    // under the drawing: what it is (its status), the hint, and the key to the lines
    '<div class="diagram-status"><span id="diagram-status" role="status"></span><span id="diagram-hint"></span><span id="diagram-legend" class="dg-legend"></span></div>'
  );
}

/** The groups a view keeps (TDD-0218 DEC-4): the ones that carry the dot. Equal to the groups with a keyed control in `toolbar-controls.json`. */
const SAVED_GROUPS = ['Draw', 'Texts', 'Layout'];

/** The groups that are not part of a view: their title says so. */
const GROUP_NOT_IN_VIEW = 'Not part of a view';

/** The number of controls on in a piece of markup: a button with `aria-pressed="true"`, a select with `data-on="true"` (TDD-0218 DEC-5). */
function countOnControls(controlsHtml) {
  let count = 0;
  for (const tag of String(controlsHtml).matchAll(/<(?:button|select)\b[^>]*>/g))
    if (/\saria-pressed="true"|\sdata-on="true"/.test(tag[0])) count++;
  return count;
}

/**
 * One group of the toolbar (TDD-0217 DEC-3, TDD-0218 CTR-1): named, with a stable `data-group`; a group with no control is not drawn. Its head holds the name, the dot
 * (a group a view keeps) and, but for Compare (one control, inline), the button that opens the controls under 40 rem, with the count of the controls that are on.
 * `buttonDetail` is what the button shows after the name (Frame: the zoom), else the count.
 */
function renderToolGroupHtml(name, controlsHtml, buttonDetail) {
  if (!controlsHtml) return '';
  const key = name.toLowerCase();
  const saved = SAVED_GROUPS.includes(name);
  const hasButton = name !== 'Compare';
  const open = hasButton && currentToolPanelOpen() === key;
  const dot = saved
    ? '<span class="tool-group-dot" role="img" aria-label="Saved with the view" title="Kept when you name the view">●</span>'
    : '';
  const button = hasButton
    ? '<button type="button" class="tool-group-button" data-action="toggle-tool-group" data-group="' +
      key +
      '" aria-expanded="' +
      open +
      '" aria-controls="tool-panel-' +
      key +
      '" title="Show the ' +
      name +
      ' controls">' +
      name +
      ' ' +
      (buttonDetail || '<span class="tool-group-count">' + (saved ? countOnControls(controlsHtml) : '') + '</span>') +
      '</button>'
    : '';
  return (
    '<div class="tool-group" role="group" aria-label="' +
    name +
    '" data-group="' +
    key +
    '"' +
    (hasButton ? ' data-open="' + open + '"' : '') +
    (saved ? '' : ' title="' + GROUP_NOT_IN_VIEW + '"') +
    '><div class="tool-group-head"><span class="tool-group-name" aria-hidden="true">' +
    name +
    '</span>' +
    dot +
    button +
    '</div><span class="tool-group-controls"' +
    (hasButton ? ' id="tool-panel-' + key + '"' : '') +
    '>' +
    controlsHtml +
    '</span></div>'
  );
}

/**
 * Reset (TDD-0218 CTR-2): puts Draw, Texts and Layout back to the origin of the diagram (the view or step it came from, else the defaults). `aria-disabled` while the
 * diagram equals its origin, a dot while it differs. Only on the pages that draw a diagram of the session.
 */
function renderResetHtml() {
  const differs = diagramDiffersFromOrigin();
  const origin = currentDiagramOrigin();
  const name = origin ? origin.name : '';
  const target = origin ? '"' + escapeHtml(diagramTruncate(name, 24)) + '"' : 'defaults';
  const titleTarget = origin ? '&quot;' + escapeHtml(name) + '&quot;' : 'the defaults'; // in an attribute: the quotes are entities
  return (
    '<button type="button" id="diagram-reset-button" class="tool-reset" data-action="diagram-reset"' +
    (differs ? '' : ' aria-disabled="true"') +
    ' title="Put Draw, Texts and Layout back to ' +
    titleTarget +
    '; Changes only, the zoom and the pins stay.' +
    (differs ? ' The diagram differs from ' + titleTarget + '.' : '') +
    '">Reset to ' +
    target +
    (differs ? '<span class="reset-dot" aria-hidden="true"></span>' : '') +
    '</button><span class="tool-legend" aria-hidden="true">● kept in a named view</span>'
  );
}

/**
 * The toolbar of a diagram, docked before the canvas (TDD-0217 DEC-1): five groups, Draw, Texts, Layout, Compare and Frame, each control in one, and Reset after Layout.
 * `host` is only given by the page of a view in the Library (see `renderDiagramCanvasHtml`): it has no folding and no Facet, and no Reset.
 */
function renderDiagramToolbarHtml(record, host) {
  return (
    '<div class="diagram-toolbar" role="toolbar" aria-label="Diagram tools">' +
    renderToolGroupHtml('Draw', renderDrawToolsHtml(record, host)) +
    renderToolGroupHtml(
      'Texts',
      renderDiagramShowGroupHtml(host ? host.isMap : !record, host ? host.shows : undefined)
    ) +
    renderToolGroupHtml('Layout', renderColumnsToolHtml(record, host)) +
    (host ? '' : renderResetHtml()) +
    renderToolGroupHtml('Compare', renderCompareToolsHtml()) +
    renderToolGroupHtml('Frame', renderFrameToolsHtml(), '<span class="tool-group-zoom">100%</span>') +
    '</div>'
  );
}

/** Draw: what the diagram draws of the model: folding (Maps), unlinked boxes, the parts of the technology Map, the Facet (not on the page of a view). */
function renderDrawToolsHtml(record, host) {
  const hideUnlinked = host ? host.hideUnlinked : diagramHideUnlinked;
  return (
    // folding is for exploring: the three viewpoints of an element are drawn as the CLI draws them
    (record || (host && !host.isMap)
      ? ''
      : '<span class="button-group" role="group" aria-label="Fold the boxes">' +
        '<button type="button" data-action="fold-all" title="Fold every box that contains others and close the ones that were opened">Fold all</button>' +
        '<button type="button" data-action="unfold-all" title="Unfold every folded box and open the boxes that hide children one more level each time">Unfold all</button></span>') +
    '<button type="button" data-action="toggle-hide-unlinked" aria-pressed="' +
    hideUnlinked +
    '" title="Leave out the boxes that no link reaches, such as the children a facet left without any relationship">Hide unlinked</button>' +
    renderMapPartsToolHtml(record, host) +
    renderFacetSelectHtml(host)
  );
}

/** Compare: one toggle, only while a plateau is compared (wave 015, run 0097, #98); `data-value` is the value a click sets. */
function renderCompareToolsHtml() {
  if (!layerCompareOther()) return '';
  return (
    '<button type="button" id="diagram-changes-only-button" data-action="set-changes-only" data-value="' +
    (AppState.changesOnly ? '0' : '1') +
    '" aria-pressed="' +
    AppState.changesOnly +
    '" title="Draw only what is new, changed or removed, with the boxes around it and the ends of the changed links (drawn faded) to place it; press again to draw the whole plateau">Changes only</button>'
  );
}

/** Frame: zoom, back to how the diagram opens, fit. */
function renderFrameToolsHtml() {
  return (
    '<span class="button-group" role="group" aria-label="Zoom">' +
    '<button type="button" data-action="diagram-zoom" data-dir="out" aria-label="Zoom out" title="Make the diagram smaller (-)">−</button>' +
    '<button type="button" id="diagram-zoom-label" data-action="diagram-zoom" data-dir="reset" aria-label="Actual size" title="Draw the diagram at its actual size (0)">100%</button>' +
    '<button type="button" data-action="diagram-zoom" data-dir="in" aria-label="Zoom in" title="Make the diagram larger (+)">+</button></span>' +
    '<button type="button" id="diagram-center-button" data-action="diagram-recenter" aria-pressed="' +
    (diagramScale === 'auto') +
    '" title="Go back to how the diagram opens: this element in the middle, at a readable size (C)">Center</button>' +
    '<button type="button" id="diagram-fit-button" data-action="diagram-zoom" data-dir="fit" aria-pressed="' +
    (diagramScale === 'fit') +
    '" title="Fit the whole diagram in the panel (F)">Fit</button>'
  );
}

/**
 * Download the diagram: two buttons set side by side, one click each, rather than a menu to open for two choices. Off
 * until a drawing is on screen (`showDiagramScene` turns them on).
 */
function renderDiagramDownloadHtml() {
  const icon =
    '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path d="M8 2v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const tool = (format, title) =>
    '<button type="button" class="download-button" data-action="diagram-export" data-format="' +
    format +
    '" disabled aria-label="Download as ' +
    format.toUpperCase() +
    '" title="' +
    escapeHtml(title) +
    '">' +
    icon +
    '<span>' +
    format.toUpperCase() +
    '</span></button>';
  return (
    '<span class="button-group" role="group" aria-label="Download the diagram">' +
    tool('png', 'Download the diagram as a PNG image, twice the size it has on screen') +
    tool('svg', 'Download the diagram as a self-contained SVG file') +
    '</span>'
  );
}

/**
 * The two toggles of the Map of the technology layer (issue #107): the applications deployed on the nodes and the relationships, each drawn or left out. Only there: the Map of the
 * application layer and the diagrams of an element have neither. On the page of a saved view they edit the view, as the texts do.
 */
function renderMapPartsToolHtml(record, host) {
  const parts = host
    ? host.isMap && host.layer === 'technology'
      ? host.parts
      : null
    : !record && mapLayer() === 'technology'
      ? mapPartsShown()
      : null;
  if (!parts) return '';
  const tool = (name, label, title) =>
    '<button type="button" data-action="toggle-map-part" data-part="' +
    name +
    '" aria-pressed="' +
    parts[name] +
    '" title="' +
    escapeHtml(title) +
    '">' +
    label +
    '</button>';
  return (
    '<span class="button-group" role="group" aria-label="What the map draws">' +
    tool(
      'applications',
      'Applications',
      'Draw the applications deployed on the nodes, as boxes inside the nodes that are open'
    ) +
    tool(
      'relationships',
      'Relationships',
      'Draw the links: the relationships that environments and nodes declare, and the dependencies between environments that the deployed applications give'
    ) +
    '</span>'
  );
}

/** The texts the diagram draws, each one a button that is lit while it is shown. */
function renderDiagramShowGroupHtml(isMap, drawn) {
  const shows = drawn || diagramShows(isMap); // `drawn`: what the page of a view in the Library draws
  const tool = (name, label, title) =>
    '<button type="button" data-action="toggle-show" data-show="' +
    name +
    '" aria-pressed="' +
    shows[name] +
    '" title="' +
    escapeHtml(title) +
    '">' +
    label +
    '</button>';
  return (
    '<span class="button-group" role="group" aria-label="Show">' +
    tool('labels', 'Labels', 'The caption of each link: its label, and its qualifiers in brackets') +
    tool('qualifiers', 'Qualifiers', 'The qualifiers of each element, after its kind') +
    tool(
      'descriptions',
      'Descriptions',
      'The description of each element that does not contain others, up to ' +
        DIAGRAM_DESCRIPTION_LINES +
        ' lines, all of it with Wrap'
    ) +
    tool(
      'wrap',
      'Wrap',
      'Break long names, qualifiers and descriptions over several lines instead of cutting them with an ellipsis except the kind of a box that contains others, and show the whole of a long link label instead of cutting it after four lines'
    ) +
    '</span>'
  );
}

/**
 * What the toolbar's "Fold all" / "Unfold all" act on: the boxes that contain others (except the focal one and the
 * ones around it, which the kernel never folds) and the boxes that hide children of the model.
 */
