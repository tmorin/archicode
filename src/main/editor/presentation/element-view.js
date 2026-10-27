function mountFileEditorIfNeeded() {
  if (!window.CM) return;
  const host = document.getElementById('file-edit-codemirror-host');
  if (!host) return;
  const relPath = host.getAttribute('data-relpath');
  const mf = AppState.manifestFiles.find((f) => f.relPath === relPath);
  if (!mf) return;
  const hasDraft = rawYamlEditDraft && rawYamlEditDraft.relPath === relPath;
  const text = hasDraft ? rawYamlEditDraft.text : mf.rawText;
  activeFileEditorView = new window.CM.EditorView({
    doc: text,
    extensions: [window.CM.basicSetup, window.CM.yaml()].concat(codeMirrorThemeExtensions()),
    parent: host
  });
}

/**
 * Id/Reference/Name/Description/Qualifiers/Tags field-rows for `record` —
 * factored out (UX review follow-up) so both the read-only element view
 * below and the Diagram perspective's "Properties" panel render the exact
 * same fields from the exact same code.
 */
function renderElementPropertiesHtml(record, forPlateau) {
  let html = '';
  const origin = (field) => originNoteHtml(record, field, forPlateau);
  html += '<div class="field-row"><span class="field-label">Id</span><span class="field-value">' + escapeHtml(record.id) + '</span></div>';
  html += '<div class="field-row"><span class="field-label">Reference</span><span class="field-value">' + escapeHtml(record.reference) + '</span></div>';
  html += '<div class="field-row"><span class="field-label">Name</span><span class="field-value">' + (record.name !== null && record.name !== undefined ? escapeHtml(record.name) : '<span class="muted">none</span>') + origin('name') + '</span></div>';
  html += '<div class="field-row"><span class="field-label">Description</span><span class="field-value">' + (record.description !== null && record.description !== undefined ? escapeHtml(record.description) : '<span class="muted">none</span>') + origin('description') + '</span></div>';

  html += '<div class="field-row"><span class="field-label">Qualifiers</span><span class="field-value">' + renderQualifierPillsHtml(record.qualifiers) + origin('qualifiers') + '</span></div>';
  html += '<div class="field-row"><span class="field-label">Tags</span><span class="field-value">' + renderTagListHtml(record.tags) + origin('tags') + '</span></div>';
  return html;
}

/** The qualifiers of an element or of a relationship, one pill each, or "none". */
function renderQualifierPillsHtml(qualifiers) {
  return qualifiers && qualifiers.length ? qualifiers.map((q) => '<span class="pill">' + escapeHtml(q) + '</span>').join('') : '<span class="muted">none</span>';
}

/** The tags of an element or of a relationship, `key: value` each, or "none". */
function renderTagListHtml(tags) {
  const keys = tags ? yamlKeysOf(tags) : [];
  if (!keys.length) return '<span class="muted">none</span>';
  return '<ul class="tag-list">' + keys.map((k) =>
    '<li><span class="tag-key">' + escapeHtml(k) + '</span>: <span class="tag-value">' + escapeHtml(String(tags[k])) + '</span></li>'
  ).join('') + '</ul>';
}

/**
 * Rules of the Details page, the same for every row: the rows an element can have are always there, in a fixed order
 * (properties, then Parent, Children, Uses or Applications, Relationships), and say "none" when empty. A reference is
 * always the same item: a link to its element followed by the kind of that element, or, when nothing answers to it,
 * its name and a "dangling" flag. A row with one value shows it inline, a row with several is a list whose label says
 * how many.
 */

/** "none", the value of a row that has nothing to say. */
function renderNoneHtml() {
  return '<span class="muted">none</span>';
}

/** A row of the Details page. `count` is only given to a list. */
function renderFieldRowHtml(label, valueHtml, count) {
  return '<div class="field-row"><span class="field-label">' + escapeHtml(label) +
           (count ? ' <span class="field-count">' + count + '</span>' : '') +
         '</span><span class="field-value">' + valueHtml + '</span></div>';
}

/** A list of ready-made items, as the rows with several values show them. */
function renderItemListHtml(itemsHtml) {
  return '<ul class="relationship-list">' + itemsHtml.map((item) => '<li>' + item + '</li>').join('') + '</ul>';
}

/**
 * A reference as an item: a link to its element, in `layer` (the element itself, or one of the other layer's: a deployed
 * application), followed by the kind of that element; or, when nothing answers to it, its name flagged as dangling.
 */
function renderReferenceItemHtml(reference, layer, owner) {
  const target = AppState.index[layer || 'application'].get(String(reference));
  if (!target) {
    const badge = '<span class="dangling-badge">dangling</span>';
    // a relationship that points at nothing is repaired where it is declared, as from the box of the diagram: a button to its owner's edit form
    if (owner === undefined) return '<span class="relationship-dangling">' + escapeHtml(String(reference)) + badge + '</span>';
    return '<button type="button" class="relationship-link relationship-dangling" data-action="fix-dangling" data-ref="' + escapeHtml(String(owner)) + '"' +
      (layer ? ' data-layer="' + escapeHtml(layer) + '"' : '') + ' title="Edit the relationship of ' + escapeHtml(String(owner)) + ' that points at nothing">' + escapeHtml(String(reference)) + '</button>' + badge;
  }
  return renderReferenceLinkHtml(String(reference), layer) + ' <span class="element-kind-badge">' + escapeHtml(target.kind) + '</span>';
}

/**
 * The element's egress relationships as a list of items — the label (and qualifiers) of the relationship, then its
 * destination as any other reference — factored out (UX review follow-up) so every view of an element renders the same
 * list from the same code.
 */
function renderElementRelationshipsHtml(record) {
  if (!(record.relationships && record.relationships.length)) return renderNoneHtml();
  // a relationship stays in its layer: its destination is the element of the same layer as its owner
  const layer = record.layer || 'application';
  return renderItemListHtml(record.relationships.map((rel) => {
    const qualifiersText = (rel.qualifiers && rel.qualifiers.length) ? ' (' + rel.qualifiers.map((q) => escapeHtml(q)).join(', ') + ')' : '';
    return escapeHtml(rel.label) + qualifiersText + ' &rarr; ' + renderReferenceItemHtml(rel.destination, layer, record.reference);
  }));
}

/**
 * A reference as a link to its element, in `layer` (the element itself, or one of the other layer's: a deployed application).
 * `description`: what the button does, when the reference alone does not say (the accessible name and the tooltip).
 */
function renderReferenceLinkHtml(reference, layer, description) {
  return '<button type="button" class="relationship-link" data-action="goto-element" data-ref="' + escapeHtml(reference) + '" data-layer="' + escapeHtml(layer || 'application') + '"' +
           (description ? ' aria-label="' + escapeHtml('Open ' + reference + ', ' + description) + '" title="' + escapeHtml('Select ' + description) + '"' : '') + '>' +
           escapeHtml(reference) +
         '</button>';
}

/**
 * Where the element stands, as rows of links: its parent (the element its reference is nested in, which is also where a
 * manifest attached with `header.parent` lands), its children, and what it is made of or linked to by its kind: for an
 * environment the environments and nodes it uses, for a technology node the applications it hosts itself (not the
 * ones of the nodes inside it).
 */
function renderElementHierarchyHtml(record) {
  const layer = record.layer || 'application';
  const cut = record.reference.lastIndexOf('.');
  const parentReference = cut === -1 ? null : record.reference.slice(0, cut);
  const children = record.children || [];
  let html = renderFieldRowHtml('Parent', parentReference !== null && AppState.index[layer].has(parentReference)
    ? renderReferenceItemHtml(parentReference, layer)
    : renderNoneHtml());
  html += renderFieldRowHtml('Children', children.length
    ? renderItemListHtml(children.map((child) => renderReferenceItemHtml(child.reference, layer)))
    : renderNoneHtml(), children.length);
  if (Array.isArray(record.replaces) && record.replaces.length) {
    // wave 009: what this element says it replaces, each flagged when the plateau compared with does not have it or this plateau still does
    html += renderFieldRowHtml('Replaces', renderItemListHtml(record.replaces.map((entry) => {
      const flag = replacesFlagOf(record, entry);
      return '<span class="change-ref">' + escapeHtml(entry) + '</span>' + (flag ? '<span class="replaces-flag">' + escapeHtml(flag) + '</span>' : '');
    })) + originNoteHtml(record, 'replaces'), record.replaces.length);
  }
  if (record.kind === 'environment') {
    const uses = record.uses || [];
    html += renderFieldRowHtml('Uses', (uses.length
      ? renderItemListHtml(uses.map((used) => renderReferenceItemHtml(used, 'technology')))
      : renderNoneHtml()) + originNoteHtml(record, 'uses'), uses.length);
  }
  if (layer === 'technology' && record.kind !== 'environment') {
    const applications = record.applications || [];
    html += renderFieldRowHtml('Applications', (applications.length
      ? renderItemListHtml(applications.map((application) => renderReferenceItemHtml(application, 'application')))
      : renderNoneHtml()) + originNoteHtml(record, 'applications'), applications.length);
  }
  return html;
}

function renderElementViewHtml(reference) {
  const record = findElementRecord(reference);
  if (!record) return '<div class="center-placeholder">Element not found: ' + escapeHtml(reference) + '</div>';

  let html = '<div class="element-view">';

  // Header first — it's sticky (stays pinned to the top of .center-panel's
  // own scroll), so it needs to be the first thing in the scroll order too.
  html += renderElementHeaderHtml(
    renderElementTitleHtml(record),
    renderShowOnMapButtonHtml(record) +
    '<button type="button" data-action="toggle-element-edit">Edit</button>'
  );

  // One list of rows, one rule (see above); the counts are in the labels of the lists, the diagrams are the other tabs
  // of the header.
  html += '<div class="element-qualitative">';
  html += renderElementPropertiesHtml(record);
  html += renderElementHierarchyHtml(record);
  const relationships = record.relationships || [];
  html += renderFieldRowHtml('Relationships', renderElementRelationshipsHtml(record) + originNoteHtml(record, 'relationships'), relationships.length);
  html += renderOriginBlockHtml(record);
  html += '</div>'; // .element-qualitative

  html += '</div>'; // .element-view
  return html;
}

