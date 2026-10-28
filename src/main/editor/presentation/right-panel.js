// ---- The right-hand panel with a comparison on: Selected | Changes ----

/** The panel was drawn while the kernel was not loaded: the first drawing fills it (`refreshRightPanel`). */
let rightPanelPending = false;

/** The selection of the page, whole: what the Changes tab is a pick over. */
function rightPanelStamp() {
  return JSON.stringify([AppState.selection, removedPick ? [removedPick.reference, removedPick.layer] : null]);
}

/** A comparison is on and can be listed (or is being read): the Map and Elements keep a right-hand panel for it. */
function comparisonPanelOn() {
  const state = comparisonState();
  return (
    !!state &&
    !state.problems &&
    (mapIsShown() || currentPerspective === 'elements' || currentPerspective === 'plateaus')
  );
}

/**
 * The inner HTML of the right-hand panel when a comparison is on: the inspection (`selectedHtml`, null when nothing is selected) and the Changes panel
 * as two tabs; the Changes panel alone when nothing is selected. Without a comparison it is `selectedHtml` itself.
 */
function withChangesPanel(selectedHtml) {
  const state = comparisonState();
  rightPanelPending = false;
  if (!state || state.problems) return selectedHtml;
  rightPanelPending = !!state.pending;
  const changes = state.pending ? renderChangesPendingHtml() : renderChangesPanelHtml(state);
  if (selectedHtml === null) return changes;
  const showChanges = changesTabPick !== null && changesTabPick.stamp === rightPanelStamp();
  const tab = (id, label, on) =>
    '<button type="button" data-action="set-right-tab" data-tab="' +
    id +
    '" aria-pressed="' +
    on +
    '">' +
    label +
    '</button>';
  return (
    '<div class="right-tabs button-group" role="group" aria-label="Right panel">' +
    tab('selected', 'Selected', !showChanges) +
    tab(
      'changes',
      'Changes' + (state.pending ? '' : ' <span class="field-count">' + state.changes.length + '</span>'),
      showChanges
    ) +
    '</div>' +
    (showChanges ? changes : selectedHtml)
  );
}

/** After a drawing (the kernel is loaded now), or when the selection dropped by itself: the panel is written again from the state. */
function refreshRightPanel() {
  if (currentPerspective === 'library') return;
  const panel = document.getElementById('panel-right');
  if (!panel) return;
  const html = currentPerspective === 'plateaus' ? withChangesPanel(null) : renderInspectionHtml(mapIsShown());
  if (html !== null) panel.innerHTML = html;
}

/** The Selected | Changes tabs: the Changes tab shows the list while the selection is what it is now. */
function setRightTab(tab) {
  if (currentPerspective === 'library') {
    // the page Stories has its own pair of tabs: View | Changes
    libraryRightTab = tab === 'changes' ? 'changes' : 'view';
    scrollChangesToSelection = tab === 'changes';
    requestRedraw();
    return;
  }
  changesTabPick = tab === 'changes' ? { stamp: rightPanelStamp() } : null;
  scrollChangesToSelection = tab === 'changes';
  requestRedraw();
}

/** The Changes tab was just opened: the row of the selection is brought into view in the list (a long list opens at its top otherwise). */
let scrollChangesToSelection = false;

/** The map must draw the element for a click on a row to show it: what encloses it is opened (the choices of the user, a pin or a hidden element, stay). */
function openOnMap(reference) {
  const parts = String(reference).split('.');
  const opened = currentMapOpened();
  for (let i = 1; i < parts.length; i++) opened.add(parts.slice(0, i).join('.'));
}

/**
 * A click on a row of the list selects the thing as a click on its box or its link does, and shows it: on the Map its enclosing boxes are opened and the
 * view is centred on it (Center); a removed element opens the read-only panel of run 0039; a relationship selects its link. The page Plateaus, and Stories when its
 * page draws no view, show no element: the row opens it in Elements. On the page of a view in Stories the thing is selected on the page itself.
 * `row`: `{ thing, change, layer, ref, to, label }` (the attributes of the button). `options.keepList` (Next change, Previous change, a filter that moves the selection): the list
 * stays on screen, and the row is brought into view in it, instead of the panel of the selection taking its place.
 */
function selectChange(row, options) {
  const keepList = !!(options && options.keepList);
  const layer = row.layer || 'application';
  const done = () => {
    // the selection is made: where the reader is in the list, the tab, the row in view, and the page drawn
    changesWalk = { key: changeKey(row.thing, layer, row.ref, row.to, row.label), selection: null };
    changesTabPick = keepList ? { stamp: rightPanelStamp() } : null; // the new selection is what the panel shows; the Changes tab is one click away
    if (currentPerspective === 'library') libraryRightTab = keepList ? 'changes' : 'view';
    scrollChangesToSelection = keepList;
    requestRedraw();
    changesWalk.selection = changesSelectionStamp();
  };
  if (currentPerspective === 'library' && changeSelectionIsShown()) {
    // the page of a view: the thing is selected on the page, its address and the Map's selection stay
    candidateMessage = null;
    removedPick = null;
    const removed = row.thing === 'element' && elementIsOnlyInTheOtherPlateau(layer, row.ref, row.change);
    libraryPickFor(selectedViewId).selection = removed
      ? { kind: 'baseline-element', key: row.ref, layer, mode: 'view' }
      : row.thing === 'relationship'
        ? linkSelectionFor(row.ref, row.to, layer, null, null)
        : { kind: 'element', key: row.ref, layer, mode: 'view' };
    const canvas = document.getElementById('diagram-canvas');
    if (canvas && diagramScale === 'auto') takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
    done();
    if (!keepList) bringLibrarySelectionIntoSight();
    return;
  }
  if (currentPerspective === 'plateaus' || currentPerspective === 'library') {
    // these pages list the changes and show no element: the row opens it in Elements
    history.pushState(null, '', location.href); // the page that was left is an entry of the history: the next address rewrites this one
    currentPerspective = 'elements';
    useDiagramHost('main');
  }
  if (rawYamlEditDraft) rawYamlEditDraft = null; // DEC-10/FLOW-4: a selection is never the draft's file
  if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
  candidateMessage = null;
  if (mapIsShown() && layer !== mapLayer()) {
    // a row of the other layer: the Map of that layer is the page that draws it
    history.pushState(null, '', location.href);
    currentPerspective = layer === 'technology' ? 'environments' : 'map';
  }
  const onMap = mapIsShown();
  if (onMap) diagramScale = 'auto'; // Center: the thing is put in the middle
  if (row.thing === 'element' && elementIsOnlyInTheOtherPlateau(layer, row.ref, row.change)) {
    if (onMap) openOnMap(row.ref);
    if (onMap) AppState.selection = { kind: 'none', key: null, mode: 'view' };
    removedPick = { reference: row.ref, layer, selection: JSON.stringify(AppState.selection) };
    done();
    return;
  }
  removedPick = null;
  if (row.thing === 'relationship' && onMap) {
    openOnMap(row.ref);
    openOnMap(row.to);
    AppState.selection = linkSelectionFor(row.ref, row.to, layer, null, null);
    revealLinkAfterDrawing = { nth: null };
    diagramLinkStop = null;
    done();
    return;
  }
  if (onMap) openOnMap(row.ref);
  AppState.selection = { kind: 'element', key: row.ref, layer, mode: 'view' };
  expandAncestorsOf(row.ref, layer); // the trees show it
  scrollNavToSelection = true;
  // in Elements a relationship is selected by the element that declares it, and its link when that element is drawn as a diagram
  if (row.thing === 'relationship' && diagramTabShown())
    AppState.selection = linkSelectionFor(row.ref, row.to, layer, null, row.ref);
  done();
}

/** Some node of the technology layer hosts the application: the Map of that layer can draw it. */
function applicationIsDeployed(reference) {
  for (const record of AppState.index.technology.values())
    if (kernelStringsOf(record.applications).includes(reference)) return true;
  return false;
}

/** After each drawing of the Map: say, in the panel, when the selected element is not on the map as it is drawn now. */
function markInspection() {
  const note = document.getElementById('inspection-offmap');
  const holder = document.querySelector('[data-inspection-ref]');
  if (!note || !holder) return;
  note.hidden =
    mapElementIsOnMap(holder.getAttribute('data-inspection-ref'), holder.getAttribute('data-inspection-layer')) !==
    false;
}

/** The Map dropped its selection by itself: the panel goes with it, with its handle (the page is not redrawn). */
function removeInspectionPanel() {
  document.querySelectorAll('#panel-right, [data-resize="panel-right"]').forEach((el) => el.remove());
}

// ---- A link of a diagram is selected: the pair of boxes it joins ----
// A link selection is `{ kind: 'link', key, from, to, layer, mode: 'view' }`, plus `focal` when it was made on
// the diagram of an element in Elements: there the selection *is* the element looked at (the centre, the tree and the URL
// read it), so the element stays the subject and everything that asks which element a perspective is about reads
// `elementSelection()`. On the Map a link selection has no element, and is read as "no element selected".

/** The selection as the places that care about the element being looked at read it: a link selected in Elements is that element. */
function elementSelection() {
  const sel = AppState.selection;
  if (!sel || sel.kind !== 'link' || !sel.focal) return sel;
  // the layer of the drawing is the layer of the element it is about
  return sel.layer
    ? { kind: 'element', key: sel.focal, layer: sel.layer, mode: 'view' }
    : { kind: 'element', key: sel.focal, mode: 'view' };
}

/** The link is no longer selected: the element it was made on (Elements), or nothing (the Map). */
function dropLinkSelection() {
  const sel = AppState.selection;
  if (!sel || sel.kind !== 'link') return;
  AppState.selection = sel.focal ? elementSelection() : { kind: 'none', key: null, mode: 'view' };
}

/**
 * Start of every render(): a link stays selected only while the diagram it was made on is on screen: the Map for one of the
 * Map, a diagram tab of that very element for one of Elements. Any other perspective, Details, the edit form or a deleted
 * element ends it. This is the one place that says "a link selection is cleared on navigation"; the handlers that replace
 * the selection (a box, a tree row, a file) end it by replacing it.
 */
function settleLinkSelection() {
  const sel = AppState.selection;
  if (!sel || sel.kind !== 'link') {
    revealLinkAfterDrawing = false;
    return;
  }
  if (!(sel.focal ? diagramTabShown() : mapIsShown())) {
    dropLinkSelection();
    revealLinkAfterDrawing = false;
  }
}

/**
 * A link was just selected (a click on the Map, or an address that carries one): the next drawing brings it into view. Only
 * then, never on a redraw (a facet, a fold) of a link that has been selected for a while: selecting must not move the view of
 * someone who is reading it. `revealSelectedLink` consumes it. It is false, or `{ nth }`: the position (`data-nth`) of the
 * link that was clicked among the twins of its pair, which is the one to show (positions are those of the drawing the click
 * was made on, and the first drawing after it is that one), or null (an address does not say: the first link of the pair).
 */
let revealLinkAfterDrawing = false;

/**
 * After the drawing is on screen: pan the view, by the least it takes, so that the selected link is inside the canvas (the
 * panel that appeared with the selection has narrowed it, and the link may now be behind its edge; an address can name a link
 * the opening view does not show). A link already in view is left where it is. Several links between the two boxes: the one
 * that was clicked (`data-nth`), else the first.
 */
function revealSelectedLink(canvas) {
  const request = revealLinkAfterDrawing;
  revealLinkAfterDrawing = false;
  const sel = AppState.selection;
  if (!request || sel.kind !== 'link' || !canvas || !canvas.querySelectorAll) return;
  const links = Array.from(canvas.querySelectorAll('.dg-link')).filter(
    (el) => el.getAttribute('data-from') === sel.from && el.getAttribute('data-to') === sel.to
  );
  const clicked =
    request.nth === null || request.nth === undefined
      ? undefined
      : links.find((el) => el.getAttribute('data-nth') === String(request.nth));
  const target = clicked || links[0];
  if (target) revealDiagramNode(target);
}

/** What the drawing on screen drew for the selected link: the pair of boxes (ends, links), or null (nothing drawn yet, or not in it). */
function inspectionLinkFor(sel) {
  if (!sel || sel.kind !== 'link') return null;
  const pairs = diagramScene && diagramScene.links;
  return (pairs && pairs.find((pair) => pair.from === sel.from && pair.to === sel.to)) || null;
}

/** The declared relationships of one link of a pair, in the order the kernel lists them (a link the kernel gives none for, a ghost, speaks for itself). */
function relationshipsOfLink(link, pair) {
  const own = Array.isArray(link.relationships) ? link.relationships : [];
  return own.length
    ? own
    : [
        {
          from: pair.fromEnd.reference,
          destination: pair.toEnd.reference,
          label: link.label,
          qualifiers: link.qualifiers,
          tags: link.tags,
          unresolved: !!link.ghost
        }
      ];
}

/** What makes two relationships the same one: who declares it, to whom, and what it says. */
function relationshipKeyOf(rel) {
  return JSON.stringify([rel.from, rel.destination, rel.label, rel.qualifiers, rel.tags]);
}

/** The declared relationships of a pair, once each, in the order the kernel lists them. */
function relationshipsOfPair(pair) {
  const rels = [];
  const seen = new Set();
  for (const link of pair.links) {
    for (const rel of relationshipsOfLink(link, pair)) {
      const key = relationshipKeyOf(rel);
      if (seen.has(key)) continue;
      seen.add(key);
      rels.push(rel);
    }
  }
  return rels;
}

/** One end of a link, for the panel: its name and kind, its reference when that differs, and what a folded box hides. */
function renderLinkEndHtml(end) {
  let html =
    '<span class="inspection-end-name">' +
    escapeHtml(end.title) +
    '</span>' +
    (end.sub ? ' <span class="muted">' + escapeHtml(end.sub) + '</span>' : '');
  if (end.reference !== end.title) html += '<br><span class="muted">' + escapeHtml(end.reference) + '</span>';
  return html;
}

/**
 * The declaring element of a relationship, as a button that selects it like a box of the diagram does (`goto-element`, with the
 * layer of the drawing). Plain text when the drawing's layer has no such element (the name stays readable, nothing to open).
 */
function renderDeclaringElementHtml(reference, layer) {
  if (layerOfReference(reference, layer) !== layer) return escapeHtml(reference);
  return renderReferenceLinkHtml(reference, layer, 'the element that declares this relationship');
}

/** One declared relationship: its label, who declares it (a button) and to whom, its qualifiers and its tags; `marked`: it belongs to the link that was clicked. */
function renderRelationshipInspectionHtml(rel, layer, marked, control) {
  const label =
    rel.label !== undefined && rel.label !== null && String(rel.label).trim()
      ? escapeHtml(rel.label)
      : '<span class="muted">no label</span>';
  return (
    '<div class="inspection-rel' +
    (marked ? ' inspection-rel-marked' : '') +
    '"><div class="inspection-rel-label">' +
    label +
    (marked ? '<span class="inspection-rel-mark">Clicked link</span>' : '') +
    '</div>' +
    '<div class="inspection-rel-path">' +
    renderDeclaringElementHtml(rel.from, layer) +
    ' &rarr; ' +
    escapeHtml(rel.destination) +
    '</div>' +
    (control || '') +
    renderRelationshipChangeHtml(rel, layer) +
    renderFieldRowHtml('Qualifiers', renderQualifierPillsHtml(rel.qualifiers)) +
    renderFieldRowHtml('Tags', renderTagListHtml(rel.tags)) +
    (rel.unresolved
      ? '<p class="inspection-note">There is no element &ldquo;' +
        escapeHtml(rel.destination) +
        '&rdquo;: the relationship points at nothing.</p>'
      : '') +
    '</div>'
  );
}

/** The panel of a selected link: its two ends, then each relationship it stands for. */
function renderLinkInspectionHtml(sel) {
  const layer = sel.layer || 'application';
  let html =
    '<div class="inspection inspection-link" data-inspection-from="' +
    escapeHtml(sel.from) +
    '" data-inspection-to="' +
    escapeHtml(sel.to) +
    '" data-inspection-layer="' +
    escapeHtml(layer) +
    '">' +
    '<div class="inspection-head"><h3>Selected link</h3>' +
    '<button type="button" class="inspection-close" data-action="close-inspection" aria-label="Close the panel" title="Deselect the link">&times;</button></div>';
  const pair = inspectionLinkFor(sel);
  if (!pair) return html + '<p class="inspection-note">Reading the link&hellip;</p></div>';
  html +=
    renderFieldRowHtml('From', renderLinkEndHtml(pair.fromEnd)) +
    renderFieldRowHtml('To', renderLinkEndHtml(pair.toEnd));
  for (const end of [pair.fromEnd, pair.toEnd]) {
    if (end.collapsed)
      html +=
        '<p class="inspection-note">&ldquo;' +
        escapeHtml(end.title) +
        '&rdquo; is folded: it stands for ' +
        end.hidden +
        ' hidden element' +
        (end.hidden === 1 ? '' : 's') +
        '. Open it to see their relationships one by one.</p>';
  }
  const rels = relationshipsOfPair(pair);
  html += renderLinkChangeHtml(rels); // a comparison: the state of the link, from the relationships it groups
  // several links between the same two boxes: the relationships of the one that was clicked are marked (when they can be told from the others)
  const clickedKeys = new Set(Array.isArray(sel.via) ? sel.via : []);
  const marked =
    pair.links.length > 1 ? rels.map((rel) => clickedKeys.has(relationshipKeyOf(rel))) : rels.map(() => false);
  const told = marked.some(Boolean) && !marked.every(Boolean);
  if (pair.links.length > 1) {
    html +=
      '<p class="inspection-note">' +
      pair.links.length +
      ' links join these two boxes, with ' +
      rels.length +
      (rels.length === 1 ? ' relationship' : ' relationships') +
      ' in all.' +
      (told ? ' The relationships of the link you clicked are marked.' : '') +
      '</p>';
  } else if (rels.length > 1) {
    html += '<p class="inspection-note">' + rels.length + ' relationships are grouped in this link.</p>';
  }
  html += '<h4 class="inspection-subhead">Relationships <span class="field-count">' + rels.length + '</span></h4>';
  const linkControls = mapLinkControlsApply(layer); // the Map of the application layer: draw only this link, or take a relationship out
  if (linkControls) html += renderMapLinkOnlyButtonHtml(rels);
  html += rels
    .map((rel, i) =>
      renderRelationshipInspectionHtml(
        rel,
        layer,
        told && marked[i],
        linkControls ? renderMapLinkPanelCheckboxHtml(rel) : ''
      )
    )
    .join('');
  html += renderFieldRowHtml('Layer', escapeHtml(layer));
  return html + '</div>';
}

/** After a drawing, with a link selected: the panel says what this drawing drew (a facet may have removed some relationships). */
function refreshInspection() {
  const onPage = currentPerspective === 'library';
  if (!onPage && comparisonPanelOn()) {
    refreshRightPanel();
    return;
  } // run 0040: the panel also holds the Changes tab: it is written again whole
  const holder = document.querySelector('.inspection');
  if (!holder) return; // nothing on screen to refresh (maximized)
  const html = diagramMaximized
    ? null
    : inspectionPanelHtml(diagramSelection(), onPage ? 'library' : mapIsShown() ? 'map' : 'elements');
  if (html !== null) holder.outerHTML = html;
  else if (onPage) {
    const section = document.querySelector('.library-selection');
    if (section) section.remove();
  } // the panel of the page stays: only its selection goes
  else removeInspectionPanel();
}

/**
 * After the drawing was put on screen: a selected link that this drawing does not have (a fold, a pin, a facet, another tab,
 * a drawing with no links at all) is no longer selected. Like the Map's own clear of an element, it is done by hand and the
 * page is not redrawn: the Map has nothing else that depends on a link selection but the panel, which goes with its handle;
 * Elements goes back to the panel of its element. Anything added to the Map that depends on a link selection must be undone here.
 */
function reconcileLinkSelection() {
  const sel = diagramSelection();
  if (sel.kind !== 'link') return;
  if (!inspectionLinkFor(sel)) {
    if (currentPerspective === 'library') {
      libraryPickFor(selectedViewId).selection = null; // the page's own selection: nothing of the Map's, nor the address, is involved
    } else {
      dropLinkSelection();
      syncHashFromState();
    }
  }
  refreshInspection();
}

/** The pair of the selected link is outlined, and the links of the diagram say whether they are the selected one. */
function markLinkSelection() {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas) return;
  const sel = diagramSelection();
  canvas.querySelectorAll('.dg-link, .dg-label').forEach((el) => {
    const selected =
      sel.kind === 'link' && el.getAttribute('data-from') === sel.from && el.getAttribute('data-to') === sel.to;
    el.classList.toggle('dg-link-selected', selected);
    if (el.classList.contains('dg-link')) el.setAttribute('aria-pressed', String(selected));
  });
}

/**
 * Elements perspective — navigate Elements on the left, view/edit/create
 * in the center. The right region holds the inspection panel while a diagram of the element is shown (the Details page
 * says the same things itself); the bottom one is unused. A `null` region is not rendered at all (see renderShellHtml):
 * hidden, not a disabled placeholder.
 */
function renderElementsPerspectiveHtml() {
  return {
    left: diagramMaximized && diagramTabShown() ? null : renderLeftPanelWrapperHtml(renderElementsNavHtml(true)),
    center: renderCenterPanelHtml(),
    right: diagramTabShown() || comparisonPanelOn() ? renderInspectionHtml(false) : null, // Details and the forms say the same, or are being edited; a comparison keeps the Changes panel
    bottom: null
  };
}
