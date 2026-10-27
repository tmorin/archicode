// ---- Plateaus: the page of the band (wave 014, run 0081, W-7, then called Timeline; renamed by wave 015, run 0096, W-8) ----
// The band under the top bar is always there; this page is where the plateaus are read as a list: what each is called, what it overrides, where it is written, how
// many patches and files it has, and what it changes over the plateau it overrides (the counts of `archicode diff`). W-8 writes plateaus from here.

/**
 * The plateau a manifest belongs to, as the pages tell it: a manifest of kind Plateau is the plateau it declares (its `id`), any other the plateau its header names, else
 * `baseline`. Null for a file the editor could not read, which belongs to none.
 */
function filePlateauOf(mf) {
  if (!mf || mf.error || !mf.header) return null;
  if (manifestKindName(mf.header.kind) === 'plateau') return mf.content && !readIsMissing(mf.content.id) ? String(mf.content.id) : null;
  return plateauOfManifest(mf);
}

/** The Plateaus page mounts no diagram, so nothing else asks for the kernel that its Changes panel waits for (`rightPanelPending`): it is loaded, and the panel is written again. */
function settlePlateausPanel() {
  if ((currentPerspective !== 'plateaus' && currentPerspective !== 'library') || !rightPanelPending) return;
  const page = currentPerspective;
  loadViewpointKernel().then(() => {
    if (currentPerspective !== page) return;
    if (page === 'plateaus') refreshRightPanel();
    else render(); // Stories: its panel and its tabs are written again with the list (the drawing of a view is kept in its cache)
  }).catch((e) => console.error('ArchiCode: the viewpoint kernel could not be loaded, the changes are not listed', e));
}

/** The Timeline perspective's regions: the list of the plateaus in the center, and — with a comparison on — the Changes panel on the right. */
function renderPlateausPerspectiveHtml() {
  return {
    left: null,
    center: renderPlateausPageHtml(),
    right: comparisonPanelOn() ? withChangesPanel(null) : null,
    rightLabel: 'Changes',
    bottom: null
  };
}

/** The changes a plateau brings over the one it overrides, as the chips of the Changes panel: elements, then relationships. A word when they are not counted (yet). */
function timelineChangesHtml(id) {
  const node = AppState.plateauTree.nodes.get(id);
  if (node.parent === null) return '<span class="muted">The root: it overrides nothing.</span>';
  const counts = cachedNodeCounts(id);
  if (counts === undefined) return '<span class="muted">Counting…</span>'; // `schedulePlateauCounts` computes them one plateau per turn and writes them here (see its step)
  if (!counts) return '<span class="muted">Not counted: the plateau or the one it overrides has mistakes.</span>';
  const group = (title, c) => '<span class="timeline-count-group" data-counts-of="' + title.toLowerCase() + '"><span class="changes-count-label">' + title + '</span>' +
    CHANGE_STATES.filter((name) => c[name] !== undefined).map((name) => changeChipHtml(name, c[name])).join('') + '</span>';
  return group('Elements', counts.elements) + group('Relationships', counts.relationships);
}

/** The files and patches a plateau has, and where it is written, in a few words. */
function timelineFactsHtml(item) {
  const node = item.node;
  const files = AppState.manifestFiles.filter((mf) => filePlateauOf(mf) === item.id && !(node.manifest && mf.relPath === node.manifest)).length;
  const source = item.id === BASELINE_PLATEAU && !node.manifest ? 'the root, implied'
    : node.manifest ? 'described in <code>' + escapeHtml(node.manifest) + '</code>'
    : 'exists only through the <code>plateau</code> key of ' + (node.headers.length === 1 ? 'a header' : node.headers.length + ' headers');
  return (node.parent !== null ? 'overrides <code>' + escapeHtml(node.parent) + '</code> · ' : '') + source + ' · ' +
    node.patches.length + (node.patches.length === 1 ? ' patch' : ' patches') + ' · ' + files + (files === 1 ? ' file' : ' files');
}

function timelineItemHtml(item, depth) {
  const layers = AppState.layers;
  const model = layerPlateauModel(item.id);
  const drawn = item.id === layers.current;
  const disabled = layers.blocked && item.id !== BASELINE_PLATEAU;
  const broken = layerModelBroken(item.id);
  const compared = layers.compare && layers.compare.other === item.id && !!layerCompareOther();
  const parent = item.node.parent !== null;
  return '<li class="timeline-item' + (drawn ? ' timeline-drawn' : '') + (compared ? ' timeline-compared' : '') + '" data-plateau="' + escapeHtml(item.id) + '" style="--depth:' + Math.min(depth, 6) + '">' +
    '<div class="timeline-main"><button type="button" class="timeline-name" data-action="timeline-draw" data-plateau="' + escapeHtml(item.id) + '" aria-pressed="' + drawn + '"' + (drawn ? ' aria-current="true"' : '') + (disabled ? ' disabled' : '') +
      ' title="Draw this plateau in the whole editor">' + escapeHtml(plateauTitle(model)) + '</button>' +
      (plateauTitle(model) !== item.id ? '<code class="timeline-id">' + escapeHtml(item.id) + '</code>' : '') + // a plateau with no name is called by its id: once is enough
      (item.node.horizon ? '<span class="timeline-horizon">' + escapeHtml(item.node.horizon) + '</span>' : '') +
      (drawn ? '<span class="timeline-state">drawn</span>' : '') + (compared ? '<span class="timeline-state">compared</span>' : '') +
      (broken ? '<span class="band-flag" role="img" aria-label="has mistakes" title="' + escapeHtml(broken[0]) + '">!</span>' : '') + '</div>' +
    '<div class="timeline-facts">' + timelineFactsHtml(item) + '</div>' +
    '<div class="timeline-changes">' + timelineChangesHtml(item.id) + '</div>' +
    (!layers.blocked || parent ? '<div class="timeline-actions">' +
      (parent && !disabled ? '<button type="button" data-action="timeline-changes" data-plateau="' + escapeHtml(item.id) + '" title="Draw this plateau and list what it changes over ' + escapeHtml(item.node.parent) + ' in the Changes panel">Changes</button>' : '') +
      (!layers.blocked ? '<button type="button" data-action="plateau-create" data-plateau="' + escapeHtml(item.id) + '" title="Create a plateau that overrides ' + escapeHtml(plateauTitle(model)) + '">New plateau after this</button>' +
        (AppState.plateauTree.layered ? '<button type="button" data-action="plateau-edit" data-plateau="' + escapeHtml(item.id) + '" title="Rename this plateau, give it a horizon or another parent">Edit</button>' : '') +
        (AppState.plateauTree.layered && parent ? plateauDeleteButtonHtml(item.id, 'Delete', saveInFlight ? ' disabled' : '') : '') : '') +
      '</div>' : '') +
    '</li>';
}

/** The list of the plateaus, the tree of the band flattened in its order, each indented by its depth. */
function timelineListHtml() {
  const root = bandTreeOf(AppState.plateauTree);
  if (!root) return '';
  const rows = [];
  const walk = (item, depth) => { rows.push(timelineItemHtml(item, depth)); item.children.forEach((child) => walk(child, depth + 1)); };
  walk(root, 0);
  return '<ol class="timeline-list" aria-label="Plateaus">' + rows.join('') + '</ol>';
}

function renderPlateausPageHtml() {
  const header = renderElementHeaderHtml('<h2>Plateaus</h2>', '');
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  let body = '';
  if (layers && tree) {
    const writing = plateauWritingHtml();
    const drawn = layerPlateauModel(layers.current);
    const other = layerCompareOther();
    const status = other ? plateauTitle(drawn) + ' is compared with ' + plateauTitle(other) + (comparisonPanelOn() ? ': the Changes panel on the right lists what differs.' : ', but the two cannot be compared: the diagram of Applications says why.')
      : tree.layered ? plateauTitle(drawn) + ' is drawn. “Changes” draws a plateau and lists what it changes over the plateau it overrides.' : '';
    body = (tree.layered ? '' : '<p class="timeline-note">This workspace has one plateau, <code>baseline</code>. A plateau is a layer over another one: the manifests that say <code>plateau: &lt;id&gt;</code> in their header belong to it, ' +
        'and a manifest of kind <code>archicode.morin.io/plateau</code> gives it a name, a horizon, the plateau it overrides and its patches (see the manual).</p>') +
      (layers.blocked || status ? '<p class="timeline-status" role="status">' + escapeHtml(layers.blocked ? layers.blocked : status) + '</p>' : '') +
      (writing ? '<div class="timeline-writing" aria-label="Edit the plateaus">' + writing + '</div>' : '') + timelineListHtml();
  }
  return '<div class="timeline-view">' + header + '<div class="timeline-body">' + body + '</div></div>';
}

/** The Changes button of the Plateaus page: draw the plateau and compare it with the plateau it overrides, in one step. */
function showPlateauChanges(id) {
  const layers = AppState.layers;
  if (!layers || !AppState.workspace || !AppState.plateauTree || !AppState.plateauTree.nodes.has(id) || layers.blocked) return;
  const node = AppState.plateauTree.nodes.get(id);
  if (node.parent === null) return;
  layers.current = id;
  layers.compare = { mode: 'past', other: node.parent, chosen: false };
  rememberLayerChoice();
  settleAfterLayerChange();
}

/**
 * Files perspective — navigate manifest files on the left, raw-YAML edit
 * (its own header: file name, Save, Reload) in the center. Right/bottom
 * unused/hidden, same as Elements.
 */
function renderFilesPerspectiveHtml() {
  const sel = AppState.selection;
  return {
    left: renderLeftPanelWrapperHtml(renderFilesNavHtml()),
    center: sel.kind === 'file' ? renderFileViewHtml(sel.key) : '<div class="center-placeholder">Select a file on the left.</div>',
    right: null,
    bottom: null
  };
}

