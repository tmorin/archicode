/**
 * The relationships of the Map in the page (wave 026, run 0199, issue #143, TDD DEC-3, DEC-4, DEC-5): the list under the tree of the page Applications, the controls of the
 * panel of a selected link and the chip over the diagram. What is ticked is `mapLinks`, view state (no `modelsChanged()`); the redraw is asked by the events, in composition.
 */

/** The most rows of the list drawn at once; the filter reaches the others. */
const MAP_LINKS_ROW_CAP = 200;

/** The models the list reads: the plateau drawn, and the one compared with (a removed relationship can be ticked). */
function mapLinkModels() {
  return [AppState.index.application, AppState.baseline && AppState.baseline.index.application].filter(Boolean);
}

function mapLinkKindOf(reference) {
  for (const index of mapLinkModels()) {
    const record = index.get(reference);
    if (record) return String(record.kind || '');
  }
  return '';
}

/** Every relationship of the models, once each, then the ticked entries the models lack (`missing`); sorted by source, destination and label. */
function mapLinkRows() {
  const rows = new Map();
  for (const index of mapLinkModels()) {
    for (const record of index.values()) {
      for (const relationship of record.relationships || []) {
        const entry = linkEntryOf(relationship, record.reference);
        const key = linkEntryKey(entry);
        if (rows.has(key)) continue;
        rows.set(key, {
          entry,
          key,
          missing: false,
          sourceKind: String(record.kind || ''),
          destinationKind: mapLinkKindOf(relationship.destination)
        });
      }
    }
  }
  for (const entry of mapLinks) {
    const key = linkEntryKey(entry);
    if (!rows.has(key)) rows.set(key, { entry, key, missing: true, sourceKind: '', destinationKind: '' });
  }
  return Array.from(rows.values()).sort(
    (a, b) =>
      compareUnits(a.entry.source, b.entry.source) ||
      compareUnits(a.entry.destination, b.entry.destination) ||
      compareUnits(normalLinkLabel(a.entry.label), normalLinkLabel(b.entry.label))
  );
}

function mapLinkRowText(row) {
  return row.entry.source + ' → ' + row.entry.destination + ' ' + normalLinkLabel(row.entry.label);
}

/** The rows the controls keep (the typed text reads the kind of the source; the select of kinds reads either end):  a ticked entry the plateau lacks is always kept, it is a mistake to see. */
function mapLinkRowsShown(rows, ticked) {
  const text = mapLinksFilter.trim().toLowerCase();
  return rows.filter((row) => {
    if (row.missing) return true;
    if (mapLinksTickedOnly && !ticked.has(row.key)) return false;
    if (mapLinksKind && row.sourceKind !== mapLinksKind && row.destinationKind !== mapLinksKind) return false;
    if (!text) return true;
    return (mapLinkRowText(row) + ' ' + row.sourceKind).toLowerCase().includes(text);
  });
}

function renderMapLinkRowHtml(row, ticked) {
  const label = normalLinkLabel(row.entry.label);
  const on = ticked.has(row.key);
  const name =
    row.entry.source +
    ' to ' +
    row.entry.destination +
    (label ? ', ' + label : '') +
    (row.missing ? ', not in this plateau' : '');
  const kinds = [row.sourceKind, row.destinationKind].filter(Boolean).join(' → ');
  return (
    '<li class="map-link-row' +
    (row.missing ? ' map-link-missing' : '') +
    '"><label><input type="checkbox" data-action="map-link-toggle" data-key="' +
    escapeHtml(row.key) +
    '"' +
    (on ? ' checked' : '') +
    ' aria-label="' +
    escapeHtml(name) +
    '"><span class="map-link-text"><span class="map-link-ends">' +
    escapeHtml(row.entry.source) +
    ' → ' +
    escapeHtml(row.entry.destination) +
    '</span>' +
    (label ? ' <span class="map-link-label">' + escapeHtml(label) + '</span>' : '') +
    (kinds ? ' <span class="muted map-link-kinds">' + escapeHtml(kinds) + '</span>' : '') +
    (row.missing ? ' <span class="muted map-link-note">not in this plateau</span>' : '') +
    '</span></label></li>'
  );
}

/** The rows and what is said about them: the part of the list that a typed filter draws again alone. */
function renderMapLinkRowsHtml(rows, ticked) {
  const shown = mapLinkRowsShown(rows, ticked);
  if (!shown.length) return '<p class="muted map-links-none">No relationship matches.</p>';
  const drawn = shown.slice(0, MAP_LINKS_ROW_CAP);
  return (
    '<ul class="map-link-rows" role="list">' +
    drawn.map((row) => renderMapLinkRowHtml(row, ticked)).join('') +
    '</ul>' +
    (shown.length > drawn.length
      ? '<p class="muted map-links-more">' + drawn.length + ' of ' + shown.length + ' shown: type to narrow</p>'
      : '')
  );
}

function mapLinkTickedText() {
  return mapLinks.length === 1 ? '1 relationship ticked' : mapLinks.length + ' relationships ticked';
}

/** The section Relationships under the tree of the page Applications. */
function renderMapLinksListHtml() {
  if (mapLayer() !== 'application') return '';
  const rows = mapLinkRows();
  const ticked = new Set(mapLinks.map(linkEntryKey));
  const kinds = Array.from(new Set(rows.flatMap((row) => [row.sourceKind, row.destinationKind]).filter(Boolean))).sort(
    compareUnits
  );
  return (
    '<details class="nav-section map-links"' +
    (mapLinksListOpen ? ' open' : '') +
    ' data-map-links-details><summary>Relationships' +
    (mapLinks.length ? ' <span class="map-links-count">' + mapLinks.length + ' ticked</span>' : '') +
    '</summary>' +
    (mapLinks.length
      ? '<button type="button" class="map-links-clear" data-action="map-links-clear" title="Show the whole map again: no relationship ticked">Clear</button>'
      : '') +
    '<div class="map-links-hint muted" id="map-links-hint">Tick relationships to draw only them, with the boxes at their ends.</div>' +
    '<div class="map-links-controls">' +
    '<input type="search" id="map-links-filter" data-map-links-filter aria-label="Filter the relationships by source, destination, kind or text" placeholder="Filter" value="' +
    escapeHtml(mapLinksFilter) +
    '" autocomplete="off">' +
    '<select id="map-links-kind" data-map-links-kind aria-label="Show the relationships of a kind"><option value="">Any kind</option>' +
    kinds
      .map(
        (kind) =>
          '<option value="' +
          escapeHtml(kind) +
          '"' +
          (kind === mapLinksKind ? ' selected' : '') +
          '>' +
          escapeHtml(kind) +
          '</option>'
      )
      .join('') +
    '</select>' +
    '<label class="map-links-only"><input type="checkbox" data-map-links-ticked-only' +
    (mapLinksTickedOnly ? ' checked' : '') +
    '> Ticked only</label></div>' +
    '<div id="map-links-rows">' +
    renderMapLinkRowsHtml(rows, ticked) +
    '</div>' +
    '<div class="map-links-live" role="status" aria-live="polite">' +
    mapLinkTickedText() +
    '</div></details>'
  );
}

/** A typed filter, a kind, "Ticked only": the rows are drawn again in place, the page is not, so the focus stays where it was. */
function refreshMapLinkRows() {
  const holder = typeof document !== 'undefined' ? document.getElementById('map-links-rows') : null;
  if (!holder) return;
  holder.innerHTML = renderMapLinkRowsHtml(mapLinkRows(), new Set(mapLinks.map(linkEntryKey)));
}

/** Reads one of the controls of the list when it is the target; true when it was one. */
function handleMapLinksControl(target) {
  if (!target || !target.matches) return false;
  if (target.matches('[data-map-links-filter]')) mapLinksFilter = target.value;
  else if (target.matches('[data-map-links-kind]')) mapLinksKind = target.value;
  else if (target.matches('[data-map-links-ticked-only]')) mapLinksTickedOnly = !!target.checked;
  else return false;
  refreshMapLinkRows();
  return true;
}

/** Ticks or unticks one entry (the click on a row, or on a relationship of the panel of a link). */
function toggleMapLink(entry) {
  const key = linkEntryKey(entry);
  mapLinks = mapLinks.some((e) => linkEntryKey(e) === key)
    ? mapLinks.filter((e) => linkEntryKey(e) !== key)
    : mapLinks.concat([entry]);
}

/** Draws one relationship heavy, or not any more (the Highlight box of the panel of a link; view state, run 0200 DEC-5). */
function toggleMapHighlight(entry) {
  const key = linkEntryKey(entry);
  mapHighlight = mapHighlight.some((e) => linkEntryKey(e) === key)
    ? mapHighlight.filter((e) => linkEntryKey(e) !== key)
    : mapHighlight.concat([entry]);
}

function mapLinkKeyFocus(key) {
  return (
    'input[data-action="map-link-toggle"][data-key="' + String(key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]'
  );
}

/** The entry of a relationship of a link of the drawing, found again in the models (null: a ghost, a relationship no model declares). */
function mapLinkEntryOfRelationship(rel) {
  const wanted = normalLinkLabel(rel.label);
  for (const index of mapLinkModels()) {
    const record = index.get(rel.from);
    if (!record) continue;
    for (const relationship of record.relationships || []) {
      if (relationship.destination !== rel.destination) continue;
      if (normalLinkLabel(relationship.rawLabel) === wanted || normalLinkLabel(relationship.label) === wanted)
        return linkEntryOf(relationship, record.reference);
    }
  }
  return null;
}

/** The entries of the relationships a link stands for, once each. */
function mapLinkEntriesOfRelationships(rels) {
  const byKey = new Map();
  for (const rel of rels) {
    const entry = mapLinkEntryOfRelationship(rel);
    if (entry) byKey.set(linkEntryKey(entry), entry);
  }
  return Array.from(byKey.values());
}

/** Draw only this link: the choice becomes the relationships of the selected link (the Map of the application layer, nothing ticked yet). */
function chooseOnlyMapLink(sel) {
  const pair = inspectionLinkFor(sel);
  if (!pair) return false;
  const entries = mapLinkEntriesOfRelationships(relationshipsOfPair(pair));
  if (!entries.length) return false;
  mapLinks = entries;
  return true;
}

/** True where the panel of a link may change the choice: the Map of the application layer. */
function mapLinkControlsApply(layer) {
  return mapIsShown() && mapLayer() === 'application' && (layer || 'application') === 'application';
}

/** The boxes of one relationship in the panel of a link: Drawn (only while the choice is not empty) and Highlight (empty when the relationship cannot be found). */
function renderMapLinkPanelCheckboxHtml(rel) {
  const entry = mapLinkEntryOfRelationship(rel);
  if (!entry) return '';
  const key = linkEntryKey(entry);
  const names = escapeHtml(rel.from + ' to ' + rel.destination);
  const drawn = mapLinks.length
    ? '<label class="map-link-panel-check"><input type="checkbox" data-action="map-link-toggle" data-key="' +
      escapeHtml(key) +
      '"' +
      (mapLinks.some((e) => linkEntryKey(e) === key) ? ' checked' : '') +
      ' aria-label="Draw ' +
      names +
      '"> Drawn</label>'
    : '';
  return (
    drawn +
    '<label class="map-link-panel-check"><input type="checkbox" data-action="map-link-highlight" data-key="' +
    escapeHtml(key) +
    '"' +
    (mapHighlight.some((e) => linkEntryKey(e) === key) ? ' checked' : '') +
    ' aria-label="Highlight ' +
    names +
    '"> Highlight</label>'
  );
}

/** The button of the panel of a link: Draw only this link, while nothing is ticked. */
function renderMapLinkOnlyButtonHtml(rels) {
  if (mapLinks.length || !mapLinkEntriesOfRelationships(rels).length) return '';
  return '<p class="map-link-only"><button type="button" data-action="map-link-only" title="Draw only the relationships of this link and the boxes at their ends">Draw only this link</button></p>';
}

/** The chip over the diagram while relationships are ticked. */
function renderMapLinksChipHtml() {
  if (!mapLinks.length || mapLayer() !== 'application') return '';
  return (
    '<span class="map-chip map-chip-links"><span>Relationships: ' +
    mapLinks.length +
    '</span><button type="button" data-action="map-links-clear" aria-label="Clear the ticked relationships" title="Show the whole map again">×</button></span>'
  );
}

/** The chip over the diagram while relationships are drawn heavy. */
function renderMapHighlightChipHtml() {
  if (!mapHighlight.length || mapLayer() !== 'application') return '';
  return (
    '<span class="map-chip map-chip-highlight"><span>Highlight: ' +
    mapHighlight.length +
    '</span><button type="button" data-action="map-highlight-clear" aria-label="Clear the highlighted relationships" title="Draw every relationship calmly again">×</button></span>'
  );
}

/** The relationships of the address named `name` (`rel=` ticked, `hl=` heavy): once for each, a JSON array [source, destination, label?]; the ones no model has are dropped. */
function mapEntriesFromParams(params, name) {
  const entries = [];
  const seen = new Set();
  for (const value of params.getAll(name)) {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 3 || !parsed.every((p) => typeof p === 'string'))
      continue;
    const entry = linkEntryOfParts(parsed[0], parsed[1], parsed[2]);
    const key = linkEntryKey(entry);
    if (seen.has(key) || !mapLinkModels().some((index) => linkEntryExists(entry, index))) continue;
    seen.add(key);
    entries.push(entry);
  }
  return entries;
}

/** The ticked relationships from the address. */
function mapLinksFromParams(params) {
  return mapEntriesFromParams(params, 'rel');
}

/** The relationships drawn heavy, from the address (run 0200, DEC-1). */
function mapHighlightFromParams(params) {
  return mapEntriesFromParams(params, 'hl');
}

function linkEntryOfParts(source, destination, label) {
  const entry = { source, destination };
  if (normalLinkLabel(label)) entry.label = normalLinkLabel(label);
  return entry;
}

/** The parameters of the address named `name` for the entries. */
function mapEntryParams(entries, name) {
  return entries.map((entry) => {
    const label = normalLinkLabel(entry.label);
    return (
      name +
      '=' +
      encodeURIComponent(
        JSON.stringify(label ? [entry.source, entry.destination, label] : [entry.source, entry.destination])
      )
    );
  });
}

/** The `rel=` parameters of the address for the entries ticked. */
function mapLinkParams(entries) {
  return mapEntryParams(entries, 'rel');
}

/** The `hl=` parameters of the address for the relationships drawn heavy. */
function mapHighlightParams(entries) {
  return mapEntryParams(entries, 'hl');
}
