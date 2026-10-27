// ---- Shell assembly + delegated event handling ----

/**
 * One resize handle, delegated-`pointerdown`-driven (see
 * handleAppPointerDown) — markup only mirrors the archi-edtior.html
 * reference's data-resize/data-axis/data-sign contract.
 */
function renderResizeHandleHtml(panelId, axis, sign) {
  const cursorClass = axis === 'x' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize';
  return '<div data-resize="' + panelId + '" data-axis="' + axis + '" data-sign="' + sign + '" class="' + cursorClass + ' touch-none"></div>';
}

/**
 * The element the inspection panel shows: the selected one, in the layer the selection carries (a reference that exists
 * in both layers is two elements), unless it is being edited or no longer exists. Null: no panel.
 */
function inspectionRecordFor(sel) {
  if (!sel || sel.kind !== 'element' || sel.mode === 'edit') return null;
  return findElementRecord(sel.key, sel.layer) || null;
}

/**
 * The right region of a perspective that shows a diagram: the data of the selected element, next to the diagram, or null
 * (nothing selected, maximized) so that nothing is rendered. `onMap`: the Map, where the panel can be closed (nothing else
 * deselects an element there) and says when the element is not drawn.
 */
function renderInspectionHtml(onMap) {
  if (diagramMaximized) return null;
  // run 0040: with a comparison on, the panel also holds the list of the changes (a tab beside the selection, alone when nothing is selected)
  return withChangesPanel(inspectionPanelHtml(AppState.selection, onMap ? 'map' : 'elements'));
}

/** The removed element the panel is to show: the one picked on this page, or the page-of-a-view selection that names one; null when none, or when it is no longer removed. */
function removedInspectionOf(sel, mode) {
  let picked = null;
  if (sel && sel.kind === 'baseline-element') picked = { reference: sel.key, layer: sel.layer };
  else if (mode !== 'library' && removedPick && removedPick.selection === JSON.stringify(AppState.selection)) picked = removedPick;
  if (!picked) return null;
  const state = comparisonState();
  return state && state.records && state.records.has(picked.layer + '|' + picked.reference) && AppState.baseline && AppState.baseline.index[picked.layer].has(picked.reference) ? picked : null;
}

/** The panel of an element only the baseline has: what it was, read-only, and where it was declared. Its relationships are told, not linked: they lead to the other plateau. */
function renderRemovedInspectionHtml(picked, mode) {
  const record = AppState.baseline.index[picked.layer].get(picked.reference);
  const other = AppState.baseline.plateau;
  const comparison = comparisonState();
  const unionElement = comparison && comparison.records ? comparison.records.get(picked.layer + '|' + picked.reference) : null;
  const onlyChange = unionElement && CHANGE_STATES.includes(unionElement.change) ? unionElement.change : 'removed';
  const relationships = record.relationships.map((rel) => '<li>' + escapeHtml(rel.destination) + (rel.rawLabel ? ' : ' + escapeHtml(rel.rawLabel) : '') +
    (rel.qualifiers && rel.qualifiers.length ? ' <span class="muted">[' + escapeHtml(rel.qualifiers.join(', ')) + ']</span>' : '') + '</li>').join('');
  return '<div class="inspection inspection-removed" data-inspection-ref="' + escapeHtml(record.reference) + '" data-inspection-layer="' + escapeHtml(picked.layer) + '">' +
    '<div class="inspection-head"><h3>Selected element</h3><button type="button" class="inspection-close" data-action="close-removed" aria-label="Close the panel" title="Close the panel">&times;</button></div>' +
    '<div class="inspection-name"><span>' + escapeHtml(record.name || record.id) + '</span><span class="stereotype-badge" style="' + escapeHtml(styleVarsText(stereotypeBadgeVarsOf(onlyChange))) + '">' + escapeHtml(CHANGE_WORDS[onlyChange].word) + '</span></div>' +
    (layerCompareIsFuture()
      ? '<p class="inspection-note">' + escapeHtml(CHANGE_WORDS[onlyChange].word.charAt(0).toUpperCase() + CHANGE_WORDS[onlyChange].word.slice(1)) + ': this element is only in “' + escapeHtml(plateauTitle(other)) + '”, the plateau that overrides this one. What you read is that plateau’s; it is not part of the plateau drawn, and nothing here is edited or saved.</p>'
      : '<p class="inspection-note">Removed: this element is only in “' + escapeHtml(plateauTitle(other)) + '”, the plateau this one is compared with. What you read is that plateau’s; it is not part of the plateau drawn, and nothing here is edited or saved.</p>') +
    renderWhatChangedHtml(picked.layer, record.reference, true) +
    renderFieldRowHtml('Kind', escapeHtml(record.kind)) +
    renderFieldRowHtml('Layer', escapeHtml(picked.layer)) +
    renderElementPropertiesHtml(record, other.id) +
    renderFieldRowHtml('Source file', escapeHtml(record.sourceFile)) +
    renderOriginBlockHtml(record, other.id) +
    renderFieldRowHtml('Relationships', relationships ? '<ul class="removed-relationships">' + relationships + '</ul>' : renderNoneHtml(), record.relationships.length) +
    '</div>';
}

/**
 * The panel of a selection, whoever holds it. `mode` is where it stands: 'map' (it can be closed, and says when the element is
 * not drawn), 'elements' (nothing deselects there: it has no close button), or 'library' (the page of a view: it can be closed, and
 * leads to the element in Elements). The Map and Elements pass their own selection (`AppState.selection`), the page of a view the one of the page.
 */
function inspectionPanelHtml(sel, mode) {
  const removed = removedInspectionOf(sel, mode);
  if (removed) return renderRemovedInspectionHtml(removed, mode);
  if (sel.kind === 'link') return renderLinkInspectionHtml(sel);
  const onMap = mode === 'map';
  const record = inspectionRecordFor(sel);
  if (!record) return null;
  const layer = record.layer || 'application';
  let html = '<div class="inspection" data-inspection-ref="' + escapeHtml(record.reference) + '" data-inspection-layer="' + escapeHtml(layer) + '">';
  html += '<div class="inspection-head"><h3>Selected element</h3>' + (onMap
    ? '<button type="button" class="inspection-close" data-action="close-inspection" aria-label="Close the panel" title="Deselect the element and give the map its whole width back">&times;</button>'
    : mode === 'library'
      ? '<button type="button" class="inspection-close" data-action="close-inspection" aria-label="Close the panel" title="Deselect the element (Esc)">&times;</button>'
      : '') + '</div>';
  html += '<div class="inspection-name"><span>' + escapeHtml(record.name || record.id) + '</span>' + stereotypeBadgesHtml(stereotypesOfRecord(record)) + '</div>';
  if (onMap) {
    // the Map of the technology layer draws the applications deployed on its nodes too (issue #107): one of them is on the map, or not, as an element of the layer is
    const deployedApplication = layer === 'application' && mapLayer() === 'technology' && applicationIsDeployed(record.reference);
    html += layer !== mapLayer() && !deployedApplication
      ? '<p class="inspection-note">' + (mapLayer() === 'technology' ? 'This map draws the technology layer, and the applications deployed on its nodes.' : 'The map draws applications only.') + '</p>'
      : '<p class="inspection-note" id="inspection-offmap" hidden>Not on the map right now (a pin, a hidden element or a folded box leaves it out).</p>';
  }
  html += renderWhatChangedHtml(layer, record.reference, false); // a comparison: what differs from the other plateau, first: a long description must not push it out of sight
  html += renderStateWordHintsHtml(layer, record.reference); // a hand-written state word that the comparison does not give the element (issue 36)
  html += renderFieldRowHtml('Kind', escapeHtml(record.kind));
  html += renderFieldRowHtml('Layer', escapeHtml(layer));
  html += renderElementPropertiesHtml(record);
  html += renderFieldRowHtml('Source file', record.sourceFile ? escapeHtml(record.sourceFile) : renderNoneHtml());
  html += renderOriginBlockHtml(record);
  if (mode === 'library') {
    html += '<button type="button" class="inspection-open with-icon" data-action="library-open-element" data-ref="' + escapeHtml(record.reference) + '" data-layer="' + escapeHtml(layer) + '"' +
      ' title="Leave this page for the element: select it in Elements, on the tab you left there">' + controlIconHtml(CONTROL_ICON_PATHS.elements) + '<span>Show in Elements</span></button>';
  }
  return html + '</div>';
}

