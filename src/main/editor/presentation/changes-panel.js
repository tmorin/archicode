// =====================================================================
// The Changes panel and "What changed" (run 0040). They read `comparisonState()` (the kernel's table `changes`, its `counts`, the union `records`)
// and nothing else: while nothing is compared none of this is on the page.
// =====================================================================

/** The kernel's natures (run 0036) in words. `description` alone is a change of wording. */
const NATURE_WORDS = {
  kind: 'kind',
  name: 'name',
  description: 'description',
  qualifiers: 'qualifiers',
  tags: 'tags',
  deployment: 'deployment',
  'relationships-added': 'relationships added',
  'relationships-removed': 'relationships removed',
  'relationships-changed': 'relationships changed',
  label: 'label'
};

/** What changed in a thing, in words: "name, relationships added"; "description (wording only)" when the description is all that changed. */
function natureWordsText(natures) {
  const list = Array.isArray(natures) ? natures : [];
  if (list.length === 1 && list[0] === 'description') return 'description (wording only)';
  return list.map((nature) => NATURE_WORDS[nature] || nature).join(', ');
}

/** The labels of the properties a row of the table can say before and after, in the order they are told. */
const CHANGE_PROPERTY_LABELS = [
  ['kind', 'Kind'],
  ['name', 'Name'],
  ['description', 'Description'],
  ['qualifiers', 'Qualifiers'],
  ['tags', 'Tags'],
  ['applications', 'Applications deployed'],
  ['uses', 'Uses'],
  ['label', 'Label']
];

/**
 * A state as a chip: its glyph and its word, always both (never colour alone), in the look the workspace gave the state (the same pill as on the boxes).
 * `count` (optional) goes between them: "+ 2 new".
 */
function changeChipHtml(state, count) {
  return (
    '<span class="stereotype-badge change-chip" data-state="' +
    state +
    '" style="' +
    escapeHtml(styleVarsText(stereotypeBadgeVarsOf(state))) +
    '">' +
    '<span class="change-glyph" aria-hidden="true">' +
    escapeHtml(CHANGE_GLYPHS[state]) +
    '</span>' +
    (count === undefined ? '' : ' <span class="change-count">' + count + '</span>') +
    ' ' +
    escapeHtml(CHANGE_WORDS[state].word) +
    '</span>'
  );
}

/** One value of a table row (a text, a list, a map of tags) as the panel shows it. */
function changeValueHtml(value) {
  if (Array.isArray(value))
    return value.length
      ? value.map((entry) => '<span class="pill">' + escapeHtml(entry) + '</span>').join('')
      : '<span class="muted">none</span>';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return keys.length
      ? keys.map((key) => '<span class="pill">' + escapeHtml(key + ': ' + value[key]) + '</span>').join('')
      : '<span class="muted">none</span>';
  }
  return value === undefined || value === null || value === ''
    ? '<span class="muted">none</span>'
    : '<span class="change-text">' + escapeHtml(value) + '</span>';
}

/** The properties that differ, before and after, each on two lines that say which is which (a word and a sign, so that neither relies on colour). `beforeOnly`: the Before line alone (an element that is gone has no After). */
function renderChangeDiffsHtml(before, after, beforeOnly) {
  const was = before && typeof before === 'object' ? before : {};
  const now = after && typeof after === 'object' ? after : {};
  return CHANGE_PROPERTY_LABELS.filter(([key]) => key in was || key in now)
    .map(
      ([key, label]) =>
        '<div class="change-diff" data-property="' +
        key +
        '"><div class="change-diff-label">' +
        escapeHtml(label) +
        '</div>' +
        '<div class="change-before"><span class="change-side"><span aria-hidden="true">−</span> Before</span>' +
        changeValueHtml(was[key]) +
        '</div>' +
        (beforeOnly
          ? ''
          : '<div class="change-after"><span class="change-side"><span aria-hidden="true">+</span> After</span>' +
            changeValueHtml(now[key]) +
            '</div>') +
        '</div>'
    )
    .join('');
}

/** The row of the table for a relationship (declared by `from`, to `destination`, with this label), or null. A pair whose label changed is one row, with the label of the plateau drawn. */
function relationshipRowOf(state, layer, from, destination, label) {
  const wanted = label === undefined || label === null ? '' : String(label);
  return (
    (state.changes || []).find(
      (row) =>
        row.thing === 'relationship' &&
        row.layer === layer &&
        row.reference === from &&
        row.destination === destination &&
        (row.label || '') === wanted
    ) || null
  );
}

/** The text of a relationship of the table: who to, and what it says ("no label" when nothing). */
function relationshipTextHtml(rel, withSource) {
  const label =
    rel.label === undefined || rel.label === null || String(rel.label).trim() === ''
      ? '<span class="muted">no label</span>'
      : '“' + escapeHtml(rel.label) + '”';
  return (
    '<span class="change-rel-path">' +
    (withSource ? escapeHtml(rel.from) + ' ' : '') +
    '&rarr; ' +
    escapeHtml(rel.destination) +
    '</span> <span class="change-rel-label">' +
    label +
    '</span>'
  );
}

/** One relationship that is new, changed or removed, as a line with its state; a changed one tells what it was and what it is. */
function renderChangedRelationshipHtml(state, layer, rel, withSource) {
  const row = rel.change === 'changed' ? relationshipRowOf(state, layer, rel.from, rel.destination, rel.label) : null;
  return (
    '<li class="change-rel" data-state="' +
    rel.change +
    '">' +
    changeChipHtml(rel.change) +
    ' ' +
    relationshipTextHtml(rel, withSource) +
    (row
      ? '<div class="change-natures">Changed: ' +
        escapeHtml(natureWordsText(row.natures)) +
        '</div>' +
        renderChangeDiffsHtml(row.before, row.after)
      : '') +
    '</li>'
  );
}

/** The relationships a union element declares that are new, changed or removed (a new or removed element declares all of its own as such). */
function changedRelationshipsOf(state, layer, reference) {
  const element = (state.layers[layer] || []).find((candidate) => candidate.reference === reference);
  const order = { new: 0, changed: 1, removed: 2 };
  return ((element && element.relationships) || [])
    .map((rel, i) => [rel, i])
    .filter(([rel]) => RELATIONSHIP_STATES.includes(rel.change))
    .sort((a, b) => order[a[0].change] - order[b[0].change] || a[1] - b[1])
    .map(([rel]) => rel);
}

/** An element of the other plateau that the element replaces: its name and its reference, and whether the other plateau has it (an unknown reference is told, not hidden). */
function replacedElementHtml(reference, layer) {
  const baseIndex = AppState.baseline ? baseSideIndex() : null;
  const record = baseIndex && baseIndex[layer] ? baseIndex[layer].get(String(reference)) : null;
  return (
    '<span class="change-name">' +
    escapeHtml(record && record.name ? record.name : String(reference).split('.').pop()) +
    '</span> <span class="change-ref">' +
    escapeHtml(reference) +
    '</span>' +
    (record ? '' : '<span class="replaces-flag">not in the other plateau</span>')
  );
}

/** An element of the plateau drawn that replaces the one being read (`replaced_by`): its name and its reference. */
function replacingElementHtml(reference, layer) {
  const targetIndex = AppState.baseline ? targetSideIndex() : AppState.index;
  const record = targetIndex[layer] ? targetIndex[layer].get(String(reference)) : null;
  return (
    '<span class="change-name">' +
    escapeHtml(record && record.name ? record.name : String(reference).split('.').pop()) +
    '</span> <span class="change-ref">' +
    escapeHtml(reference) +
    '</span>'
  );
}

/**
 * The "What changed" block of the inspection of an element (a changed, new or removed one; '' for any other, and with no comparison): for a
 * changed element the properties that differ with before and after, then its relationships added, removed and changed; for a new or a removed one,
 * that the whole element is, and the relationships it declares. `removedPanel`: the read-only panel of a removed element, which says it already.
 */
function renderWhatChangedHtml(layer, reference, removedPanel) {
  const state = comparisonState();
  if (!state || !state.records) return '';
  const element = state.records.get(layer + '|' + reference);
  if (!element || !CHANGE_STATES.includes(element.change)) return '';
  const other = plateauTitle(state.base);
  let html =
    '<section class="what-changed" aria-label="What changed" data-state="' +
    element.change +
    '"><h4 class="inspection-subhead">What changed ' +
    changeChipHtml(element.change) +
    '</h4>';
  if (IDENTITY_STATES.includes(element.change)) {
    // wave 009: the element says which elements of the other plateau it is the new place of; its own changes, if any, are told next to that
    const replaced = (element.replaces || []).map((ref) => replacedElementHtml(ref, layer));
    const sentence =
      element.change === 'moved'
        ? 'Moved or renamed: it replaces an element of “' + other + '”.'
        : element.change === 'split'
          ? 'Split: it is one of several elements that replace an element of “' + other + '”.'
          : 'Merged: it replaces several elements of “' + other + '”.';
    html +=
      '<p class="inspection-note">' +
      escapeHtml(sentence) +
      '</p>' +
      (replaced.length
        ? '<div class="change-diff" data-property="replaces"><div class="change-diff-label">Replaces</div>' +
          renderItemListHtml(replaced) +
          '</div>'
        : '');
    const row = (state.changes || []).find(
      (candidate) => candidate.thing === 'element' && candidate.layer === layer && candidate.reference === reference
    );
    if (row && Array.isArray(row.natures) && row.natures.length) {
      html +=
        '<p class="change-natures">Also changed: ' +
        escapeHtml(natureWordsText(row.natures)) +
        '. Compared with “' +
        escapeHtml(other) +
        '”.</p>' +
        renderChangeDiffsHtml(row.before, row.after);
    }
  } else if (element.change === 'new') {
    html +=
      '<p class="inspection-note">Whole element is new: it is not in “' +
      escapeHtml(other) +
      '”. Its properties are the ones below.</p>';
  } else if (element.change === 'removed') {
    html +=
      '<p class="inspection-note">Whole element is removed' +
      (removedPanel
        ? '. Its properties and its relationships are the ones below.'
        : ': it is only in “' + escapeHtml(other) + '”.') +
      '</p>';
    if (removedPanel) {
      // #71: what the node deployed, as the panel of a changed node says it (Before only), read as the other plateau's file wrote it;
      // wave 014 (run 0073): and what an environment used, which the panel of a changed environment says the same way
      const gone =
        AppState.baseline && AppState.baseline.index[layer] ? AppState.baseline.index[layer].get(reference) : null;
      const was = {};
      if (gone && Array.isArray(gone.applications) && gone.applications.length) was.applications = gone.applications;
      if (gone && gone.kind === 'environment' && Array.isArray(gone.uses) && gone.uses.length) was.uses = gone.uses;
      html += renderChangeDiffsHtml(was, {}, true);
    }
    if (Array.isArray(element.replaced_by) && element.replaced_by.length) {
      // wave 009: it is drawn only as the place of what was inside it; the elements that replace it are the ones to read
      html +=
        '<div class="change-diff" data-property="replaced_by"><div class="change-diff-label">Replaced by</div>' +
        renderItemListHtml(element.replaced_by.map((ref) => replacingElementHtml(ref, layer))) +
        '</div>';
    }
  } else {
    const row = (state.changes || []).find(
      (candidate) => candidate.thing === 'element' && candidate.layer === layer && candidate.reference === reference
    );
    html +=
      '<p class="change-natures">Changed: ' +
      escapeHtml(natureWordsText(element.natures)) +
      '. Compared with “' +
      escapeHtml(other) +
      '”.</p>';
    if (row) html += renderChangeDiffsHtml(row.before, row.after);
  }
  const rels = removedPanel ? [] : changedRelationshipsOf(state, layer, reference); // the panel of a removed element lists them already
  if (rels.length) {
    html +=
      '<h5 class="inspection-subhead">Relationships <span class="field-count">' +
      rels.length +
      '</span></h5><ul class="change-rels">' +
      rels.map((rel) => renderChangedRelationshipHtml(state, layer, rel, false)).join('') +
      '</ul>';
  }
  return html + '</section>';
}

/** The state of a link, from the relationships it stands for: all new is new, all removed is removed, none changed is none, any other mixture is changed (the kernel's rule for a grouped link). */
function stateOfRelationships(rels) {
  const given = rels.filter((rel) => rel.change !== undefined);
  if (!given.length) return 'none';
  const all = (wanted) => rels.every((rel) => (rel.change || 'none') === wanted);
  return all('new') ? 'new' : all('removed') ? 'removed' : all('none') ? 'none' : 'changed';
}

/** For a selected link: its own state, and what each relationship it groups says of itself (the state of each is on its line, see `renderRelationshipInspectionHtml`). */
function renderLinkChangeHtml(rels) {
  if (!comparisonState() || !comparisonState().records) return '';
  const state = stateOfRelationships(rels);
  if (state === 'none') return '';
  const plural = rels.length > 1;
  const nouns = {
    new: plural ? 'All of the relationships it groups are new.' : 'The relationship it stands for is new.',
    removed: plural ? 'All of the relationships it groups are removed.' : 'The relationship it stands for is removed.',
    changed:
      plural && !rels.every((rel) => rel.change === 'changed')
        ? 'The relationships it groups are not all the same: some are new, changed or removed.'
        : plural
          ? 'All of the relationships it groups changed.'
          : 'The relationship it stands for changed.'
  };
  return (
    '<section class="what-changed" aria-label="What changed" data-state="' +
    state +
    '"><h4 class="inspection-subhead">What changed ' +
    changeChipHtml(state) +
    '</h4>' +
    '<p class="inspection-note">' +
    nouns[state] +
    '</p></section>'
  );
}

/** The detail of a changed relationship of a link: what it was and what it is, from the table. '' when it did not change. */
function renderRelationshipChangeHtml(rel, layer) {
  const state = comparisonState();
  if (!state || !state.records || !RELATIONSHIP_STATES.includes(rel.change)) return '';
  const row = rel.change === 'changed' ? relationshipRowOf(state, layer, rel.from, rel.destination, rel.label) : null;
  return (
    '<div class="rel-change" data-state="' +
    rel.change +
    '">' +
    changeChipHtml(rel.change) +
    (row
      ? ' <span class="change-natures">Changed: ' +
        escapeHtml(natureWordsText(row.natures)) +
        '</span>' +
        renderChangeDiffsHtml(row.before, row.after)
      : '') +
    '</div>'
  );
}

// ---- The list ----

const CHANGE_STATE_ORDER = { new: 0, changed: 1, moved: 2, split: 3, merged: 4, removed: 5 };

/** The rows of the table in the order a reviewer reads them: what is new, what changed, what was removed; inside a state, the kernel's order (by reference). */
function sortedChangeRows(rows) {
  return rows
    .map((row, i) => [row, i])
    .sort((a, b) => CHANGE_STATE_ORDER[a[0].change] - CHANGE_STATE_ORDER[b[0].change] || a[1] - b[1])
    .map(([row]) => row);
}

/**
 * What a moved, split or merged row says of where the element came from, as `diff` does: `from shop.till`, and for a split `split with shop.report-b`
 * (the other rows of the same layer that replace one of the same references).
 */
function identityTextOf(row, rows) {
  const replaces = Array.isArray(row.replaces) ? row.replaces : [];
  let text = replaces.length ? 'from ' + replaces.join(', ') : '';
  if (row.change === 'split') {
    const others = rows
      .filter(
        (other) =>
          other !== row &&
          other.thing === 'element' &&
          other.layer === row.layer &&
          other.change === 'split' &&
          Array.isArray(other.replaces) &&
          other.replaces.some((ref) => replaces.includes(ref))
      )
      .map((other) => other.reference);
    if (others.length) text += (text ? '; ' : '') + 'split with ' + others.join(', ');
  }
  return text;
}

/** The split elements of the table, as `layer NUL reference`: built once per render of the panel (the Java `GapReport` does the same), not once per row. */
function splitElementsOf(rows) {
  const splits = new Set();
  for (const row of rows)
    if (row.thing === 'element' && row.change === 'split') splits.add(row.layer + '\0' + row.reference);
  return splits;
}

/**
 * The split elements a new relationship belongs to (its source, its destination), as `archicode diff` says it (`of the split X`): the kernel does not
 * compare the relationships of an element that was split (which half would own them is a guess), so those of the halves read as new. [] for any other row.
 * `splits` is `splitElementsOf` of the whole table.
 */
function ofSplitOf(row, splits) {
  if (row.thing !== 'relationship' || row.change !== 'new' || !splits.size) return [];
  return [row.reference, row.destination].filter(
    (reference, i, all) => all.indexOf(reference) === i && splits.has(row.layer + '\0' + reference)
  );
}

/** How many of the new relationships belong to a split element: the line of the header of `archicode diff`. */
function newRelationshipsOfSplits(rows, splits) {
  return rows.filter((row) => ofSplitOf(row, splits).length).length;
}

/** One row of the list: a button that selects the thing (state chip, name and reference, what changed in it). `selected`: it is the selection of the page. `rows`: the whole table (a split names the other halves); `splits`: `splitElementsOf(rows)`, which the caller builds once for all the rows. */
function renderChangeRowHtml(row, selected, rows, splits) {
  const element = row.thing === 'element';
  const attributes =
    ' data-action="select-change" data-thing="' +
    row.thing +
    '" data-change="' +
    row.change +
    '" data-layer="' +
    escapeHtml(row.layer) +
    '" data-ref="' +
    escapeHtml(row.reference) +
    '"' +
    (element ? '' : ' data-to="' + escapeHtml(row.destination) + '" data-label="' + escapeHtml(row.label || '') + '"');
  const layer = row.layer === 'technology' ? ' <span class="change-layer">technology</span>' : '';
  let main;
  let natures = '';
  let from = '';
  if (element) {
    const name = row.name || String(row.reference).split('.').pop();
    main =
      '<span class="change-name">' +
      escapeHtml(name) +
      '</span> <span class="change-ref">' +
      escapeHtml(row.reference) +
      '</span>' +
      layer;
    if (
      row.change === 'changed' ||
      (IDENTITY_STATES.includes(row.change) && Array.isArray(row.natures) && row.natures.length)
    )
      natures = natureWordsText(row.natures);
    if (IDENTITY_STATES.includes(row.change)) from = identityTextOf(row, rows || []);
  } else {
    main = relationshipTextHtml({ from: row.reference, destination: row.destination, label: row.label }, true) + layer;
    if (row.change === 'changed')
      natures =
        natureWordsText(row.natures) +
        (row.before && 'label' in row.before
          ? ': “' + (row.before.label || '') + '” → “' + (row.after.label || '') + '”'
          : '');
    const owners = ofSplitOf(row, splits || splitElementsOf(rows || []));
    if (owners.length) from = 'of the split ' + owners.join(', ');
  }
  return (
    '<li><button type="button" class="change-row' +
    (selected ? ' selected' : '') +
    '"' +
    attributes +
    (selected ? ' aria-current="true"' : '') +
    '>' +
    changeChipHtml(row.change) +
    '<span class="change-main">' +
    main +
    '</span>' +
    (from ? '<span class="change-from">' + escapeHtml(from) + '</span>' : '') +
    (natures ? '<span class="change-natures">' + escapeHtml(natures) + '</span>' : '') +
    '</button></li>'
  );
}

/** Is this row the selection of the page: the element selected, the removed box picked, or the link selected. On the page of a view in Stories it is the page's own selection (`diagramSelection`). */
function changeRowIsSelected(row, pick) {
  const library = currentPerspective === 'library';
  const sel = library ? diagramSelection() : AppState.selection;
  if (row.thing === 'relationship')
    return sel.kind === 'link' && sel.from === row.reference && sel.to === row.destination;
  if (elementIsOnlyInTheOtherPlateau(row.layer, row.reference, row.change))
    return !!pick && pick.reference === row.reference && pick.layer === row.layer;
  const element = library ? sel : elementSelection();
  return (
    element.kind === 'element' &&
    element.key === row.reference &&
    layerOfReference(element.key, element.layer) === row.layer
  );
}

// ---- Reading a long list of changes (wave 015, run 0103, #27) ----
// The list is read one change at a time (Previous change, Next change) and narrowed by two filters (a state, a layer) that say how many of how many they show. All of it is
// view state: no model changes, so none of it calls `modelsChanged()`, and it is not an input of the comparison (the cache of the comparison, the diagram and the quiet
// references are not keyed on it): a filter changes the list and nothing the diagrams draw (Everything / Changes only is the tool that does). The list is one function,
// `renderChangesPanelHtml`, called from the pages that have it: Plateaus, Applications, Environments, Elements and Stories.

/** The two filters, for the pair of plateaus they were chosen for: the pair changes, they are all again (turning the comparison off and on with the same pair keeps them). */
let changesFilter = { pair: null, state: 'all', layer: 'all' };
/** The change the reader walked to last: `{ key, selection }`, `selection` being the selection of the page right after, so that a selection made since (a click elsewhere) is told from it. */
let changesWalk = null;

/** The pair of plateaus a comparison is about, as the filters and the walk remember it. */
function comparisonPairKey(state) {
  return state.base.id + '>' + state.target.id;
}

/** The filters of the comparison `state`: reset (with the walk) when the pair of plateaus is not the one they were chosen for. */
function changesFilterFor(state) {
  const pair = comparisonPairKey(state);
  if (changesFilter.pair !== pair) {
    changesFilter = { pair, state: 'all', layer: 'all' };
    changesWalk = null;
  }
  return changesFilter;
}

/** What names a row of the table (an element, or a relationship with its label); the same text from the row and from the attributes of its button. */
function changeKey(thing, layer, reference, destination, label) {
  return [
    thing,
    layer,
    reference,
    thing === 'relationship' ? destination : '',
    thing === 'relationship' ? label || '' : ''
  ].join('\u0000');
}

function changeRowKey(row) {
  return changeKey(row.thing, row.layer, row.reference, row.destination, row.label);
}

/** Every row of the table in the order of the list: the elements, then the relationships, each as `sortedChangeRows` sorts them. The order is the one Next and Previous walk. */
function orderedChangeRows(state) {
  const rows = sortedChangeRows(state.changes || []);
  return rows.filter((row) => row.thing === 'element').concat(rows.filter((row) => row.thing === 'relationship'));
}

/** Does the row pass the two filters (`except`: leave one of them out, to count what the other would show). */
function changeRowIsShown(row, filter, except) {
  return (
    (except === 'state' || filter.state === 'all' || row.change === filter.state) &&
    (except === 'layer' || filter.layer === 'all' || row.layer === filter.layer)
  );
}

/** The rows the filters keep, in the order of the list. */
function shownChangeRows(rows, filter) {
  return rows.filter((row) => changeRowIsShown(row, filter));
}

/** How many rows each choice of each filter would show, with the other filter as it is: `{ states: { all, new, ... }, layers: { all, application, technology } }`. */
function changeFilterCounts(rows, filter) {
  const states = { all: 0 };
  const layers = { all: 0, application: 0, technology: 0 };
  for (const row of rows) {
    if (changeRowIsShown(row, filter, 'state')) {
      states.all++;
      states[row.change] = (states[row.change] || 0) + 1;
    }
    if (changeRowIsShown(row, filter, 'layer')) {
      layers.all++;
      layers[row.layer] = (layers[row.layer] || 0) + 1;
    }
  }
  return { states, layers };
}

/** The selection of the page as the walk remembers it: what is selected, and the removed box picked, if any. */
function changesSelectionStamp() {
  return JSON.stringify([diagramSelection(), removedPick ? [removedPick.reference, removedPick.layer] : null]);
}

/** The removed box the page has picked, as the list reads it (see `renderChangesPanelHtml`). */
function changesPick() {
  return currentPerspective === 'library'
    ? removedInspectionOf(diagramSelection(), 'library')
    : removedInspectionOf(AppState.selection, mapIsShown() ? 'map' : 'elements');
}

/**
 * The change the reader is at: the row last walked to (or clicked) while nothing else was selected since; else the first row that is the selection of the page; else none.
 * Relationships that share a pair of elements are all "the selection" of one link, and a relationship that is told by its source (Elements, no diagram) selects an element that
 * has a row of its own: the walk is what keeps Next going forward in both cases.
 */
function currentChangeOf(rows, pick) {
  const selected = rows.filter((row) => changeRowIsSelected(row, pick));
  const walked = changesWalk ? rows.find((row) => changeRowKey(row) === changesWalk.key) : null;
  if (walked && (!selected.length || selected.includes(walked) || changesWalk.selection === changesSelectionStamp()))
    return walked;
  return selected[0] || null;
}

/** The rows that are marked in the list: the current change when it was walked to, else every row that is the selection (a pair of elements may have several relationships). */
function markedChangeKeys(rows, pick) {
  const current = currentChangeOf(rows, pick);
  const selected = rows.filter((row) => changeRowIsSelected(row, pick));
  const marked = current && !selected.includes(current) ? [current] : selected;
  return new Set(marked.map(changeRowKey));
}

/** The next (or previous) row that the filters keep, after `current` in the order of the list; with no current change, the first (the last). Null at the end: the walk stops there. */
function neighbourChange(rows, filter, current, direction) {
  const step = direction === 'previous' ? -1 : 1;
  const at = current ? rows.findIndex((row) => changeRowKey(row) === changeRowKey(current)) : -1;
  for (let i = at < 0 ? (step > 0 ? 0 : rows.length - 1) : at + step; i >= 0 && i < rows.length; i += step) {
    if (changeRowIsShown(rows[i], filter)) return rows[i];
  }
  return null;
}

/** The row the filters keep that is nearest to `current` in the order of the list (the one after it when two are as near). Null when none is kept, or `current` is not in the list. */
function nearestShownChange(rows, filter, current) {
  const at = current ? rows.findIndex((row) => changeRowKey(row) === changeRowKey(current)) : -1;
  if (at < 0) return null;
  for (let distance = 1; distance < rows.length; distance++) {
    for (const i of [at + distance, at - distance])
      if (i >= 0 && i < rows.length && changeRowIsShown(rows[i], filter)) return rows[i];
  }
  return null;
}

/** Does the page show a selection, so that walking to a change selects it? The page Plateaus draws nothing, and Stories draws a diagram only for a view that can be drawn. */
function changeSelectionIsShown() {
  if (currentPerspective === 'plateaus') return false;
  if (currentPerspective === 'library')
    return libraryTab === 'views' && !!selectedViewId && !!libraryDiagramRecipe(findSavedView(selectedViewId));
  return true;
}

/**
 * Walk to a row of the list: where the page shows a selection the change is selected as a click on its row selects it (the diagram, the panel), but the list stays on screen
 * (`keepList`); elsewhere only the mark moves. The row is brought into view in the list. `focus`: the control to give the focus back to (the list is drawn again).
 */
function goToChange(row, focus) {
  pendingFocusSelector = focus || null;
  if (changeSelectionIsShown()) {
    selectChange(
      {
        thing: row.thing,
        change: row.change,
        layer: row.layer,
        ref: row.reference,
        to: row.destination,
        label: row.label || ''
      },
      { keepList: true }
    );
    return;
  }
  changesWalk = { key: changeRowKey(row), selection: changesSelectionStamp() };
  scrollChangesToSelection = true;
  requestRedraw();
}

/** Next change / Previous change: the walk stops at the ends of the list (the button there is disabled), it does not wrap. Returns whether the reader moved. */
function walkChange(direction, options) {
  const state = comparisonState();
  if (!state || !state.changes) return false;
  const filter = changesFilterFor(state);
  const rows = orderedChangeRows(state);
  const current = currentChangeOf(rows, changesPick());
  const row = neighbourChange(rows, filter, current, direction);
  if (!row) return false;
  const further = neighbourChange(rows, filter, row, direction);
  goToChange(
    row,
    options && options.keepFocus
      ? null
      : '[data-action="change-' +
          (further
            ? direction === 'previous'
              ? 'previous'
              : 'next'
            : direction === 'previous'
              ? 'next'
              : 'previous') +
          '"]'
  ); // at the end the other button keeps the focus; the shortcut moves the focus to no control
  return true;
}

/**
 * Does the page have a Changes list a reader can walk: a comparison that can be listed (not loading, not refused), a page that has the list, and the right panel not hidden by a maximized
 * diagram. The list may be one tab away (the Selected or View tab is showing): the walk brings the Changes tab back, as a button of the list would have been used.
 */
function changesListIsOnPage() {
  const state = comparisonState();
  if (!state || state.problems || state.pending || !state.changes) return false;
  if (currentPerspective === 'plateaus') return true;
  if (diagramMaximized) return false;
  if (currentPerspective === 'library') return libraryChangesState() !== null;
  return comparisonPanelOn();
}

/** Is this element where the reader types: an input, a textarea, a select, a contenteditable, or a code editor of the page (CodeMirror: Files, the YAML and JSON editors of the forms)? */
function isTypingTarget(el) {
  if (!el) return false;
  const tag = String(el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable) return true;
  return !!(
    el.closest &&
    el.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], .cm-editor'
    )
  );
}

/** The keys of the walk, one letter each: J goes to the next change, K to the previous one (the pair of the web's lists; no bracket, which an AZERTY keyboard types with AltGr). */
const CHANGES_WALK_KEYS = { j: 'next', k: 'previous' };

/**
 * The keyboard shortcut of *Next change* and *Previous change* (wave 016, run 0112, #113): `walkChange`, the walk of the buttons, in the same order with the same filters and the same
 * stops. It leaves the key alone, so that the browser's and the page's other shortcuts are free, when a modifier is held (Shift included), when the reader types (an input, a textarea,
 * a select, a contenteditable, a code editor: the event target and the focused element are both looked at), when a dialog, the help or the menu of the header is open, when a rejected
 * YAML text is waiting for its author, and when no Changes list is on screen. It writes nothing in the address by itself. The control that had the focus keeps it when the redraw keeps it (a diagram box, a tree row, a control of the header); no control of the panel takes it unless the focus was on the panel.
 */
function handleChangesKeydown(e) {
  const direction = CHANGES_WALK_KEYS[String(e.key || '').toLowerCase()];
  if (!direction || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented || e.isComposing) return;
  const focused = typeof document.activeElement === 'undefined' ? null : document.activeElement;
  if (isTypingTarget(e.target) || isTypingTarget(focused)) return;
  if (storyPlayer || appDialog || helpOpen || headerMenuOpen || rawYamlEditDraft || !changesListIsOnPage()) return; // the player owns the keys while it is open; a rejected YAML text is kept by the page: a selection made by a key would drop it
  const inPanel = !!(focused && focused.closest && focused.closest('[data-changes-panel]'));
  if (e.preventDefault) e.preventDefault();
  walkChange(direction, { keepFocus: !inPanel });
}
document.addEventListener('keydown', handleChangesKeydown);

/** Choose a state or a layer in the filters ('all' for none). The change the reader is at, if the filter leaves it out, moves to the nearest change that is shown. Returns whether it was a valid choice. */
function setChangesFilter(kind, value) {
  const state = comparisonState();
  if (!state || !state.changes || (kind !== 'state' && kind !== 'layer')) return false;
  const known = kind === 'state' ? ['all'].concat(CHANGE_STATES) : ['all', 'application', 'technology'];
  if (!known.includes(value)) return false;
  const filter = changesFilterFor(state);
  filter[kind] = value;
  const rows = orderedChangeRows(state);
  const current = currentChangeOf(rows, changesPick());
  const focus = '[data-changes-filter="' + kind + '"]';
  const near = current && !changeRowIsShown(current, filter) ? nearestShownChange(rows, filter, current) : null;
  if (near) goToChange(near, focus);
  else {
    pendingFocusSelector = focus;
    requestRedraw();
  }
  return true;
}

/** Both filters back to "all". */
function clearChangesFilter() {
  const state = comparisonState();
  if (!state || !state.changes) return;
  const filter = changesFilterFor(state);
  filter.state = 'all';
  filter.layer = 'all';
  pendingFocusSelector = '[data-changes-filter="state"]';
  requestRedraw();
}

/**
 * The detail of the change the reader is at, under the walk buttons (wave 016, run 0112, #113): the "What changed" block of the inspection for an element (`renderWhatChangedHtml`,
 * the one function that writes it), and for a relationship one section with its state and its line (`renderChangedRelationshipHtml`, the line the inspection of an element lists). So the
 * pages that show no selection (Plateaus, a story with no view drawn) show what a change is where *Next change* only moved a mark, and a page that shows a selection needs no switch
 * to the Selected tab to read it. '' when no change is current or the current one is left out by the filters. View state: it reads the comparison and nothing else.
 */
function renderCurrentChangeDetailHtml(state, current, shown) {
  if (!current || !shown.some((row) => changeRowKey(row) === changeRowKey(current))) return '';
  let block;
  if (current.thing === 'element') block = renderWhatChangedHtml(current.layer, current.reference, false);
  else {
    const rel = {
      from: current.reference,
      destination: current.destination,
      label: current.label,
      change: current.change
    };
    block =
      '<section class="what-changed" aria-label="What changed" data-state="' +
      current.change +
      '"><h4 class="inspection-subhead">What changed ' +
      changeChipHtml(current.change) +
      '</h4>' +
      '<ul class="change-rels">' +
      renderChangedRelationshipHtml(state, current.layer, rel, true) +
      '</ul></section>';
  }
  return block
    ? '<div class="changes-detail" data-changes-detail="' +
        escapeHtml(changeRowKey(current).replace(/\u0000/g, '|')) +
        '">' +
        block +
        '</div>'
    : '';
}

/** The two filters, the line that says how many of how many are shown, and the buttons that walk the list. `rows`: every row; `shown`: the ones the filters keep; `current`: the change the reader is at. */
function renderChangesReadingHtml(rows, filter, shown, current) {
  if (!rows.length) return '';
  const counts = changeFilterCounts(rows, filter);
  const option = (value, label, count, chosen) =>
    '<option value="' +
    value +
    '"' +
    (chosen === value ? ' selected' : '') +
    '>' +
    escapeHtml(label) +
    ' (' +
    count +
    ')</option>';
  const present = (name) => counts.states[name] > 0 || filter.state === name;
  const stateOptions =
    option('all', 'All states', counts.states.all, filter.state) +
    Object.keys(CHANGE_STATE_ORDER)
      .filter((name) => CHANGE_STATES.includes(name) && present(name))
      .map((name) =>
        option(
          name,
          CHANGE_WORDS[name].word.charAt(0).toUpperCase() + CHANGE_WORDS[name].word.slice(1),
          counts.states[name] || 0,
          filter.state
        )
      )
      .join('');
  const layerOptions =
    option('all', 'Both layers', counts.layers.all, filter.layer) +
    option('application', 'Application', counts.layers.application, filter.layer) +
    option('technology', 'Technology', counts.layers.technology, filter.layer);
  const filtered = filter.state !== 'all' || filter.layer !== 'all';
  const at = current ? shown.findIndex((row) => changeRowKey(row) === changeRowKey(current)) : -1;
  const before = neighbourChange(rows, filter, current, 'previous');
  const after = neighbourChange(rows, filter, current, 'next');
  return (
    '<div class="changes-reading" role="group" aria-label="Reading the changes">' +
    '<div class="changes-filters">' +
    '<label class="changes-filter">State<select data-changes-filter="state">' +
    stateOptions +
    '</select></label>' +
    '<label class="changes-filter">Layer<select data-changes-filter="layer">' +
    layerOptions +
    '</select></label>' +
    '</div>' +
    '<p class="changes-shown" data-changes-shown="' +
    shown.length +
    '" data-changes-total="' +
    rows.length +
    '" role="status">' +
    (filtered
      ? shown.length + ' of ' + rows.length + ' changes'
      : rows.length + (rows.length === 1 ? ' change' : ' changes')) +
    '</p>' +
    '</div>' +
    '<div class="changes-walkbar" data-changes-walkbar><div class="changes-walk"><span class="button-group" role="group" aria-label="Walk the changes">' +
    '<button type="button" data-action="change-previous"' +
    (before ? '' : ' disabled') +
    ' aria-keyshortcuts="k" title="The change before this one in the list (shortcut: K)">Previous change</button>' +
    '<button type="button" data-action="change-next"' +
    (after ? '' : ' disabled') +
    ' aria-keyshortcuts="j" title="The change after this one in the list (shortcut: J)">Next change</button></span>' +
    (at >= 0
      ? '<span class="changes-position" data-changes-position="' +
        (at + 1) +
        '">' +
        (at + 1) +
        ' of ' +
        shown.length +
        '</span>'
      : '') +
    (filtered
      ? '<button type="button" data-action="change-filters-clear" title="Show every change again">Show all</button>'
      : '') +
    '</div></div>'
  );
}

/**
 * The Changes panel: what the comparison found, in numbers and in two lists (Elements, Relationships), with the toggle that sets the wording-only
 * changes aside. A click on a row selects the thing (see `selectChange`). Under the counts, the two filters, the line "12 of 167 changes" and the buttons Previous change / Next change
 * (`renderChangesReadingHtml`, wave 015, run 0103, #27). The pages Plateaus, Applications, Environments, Elements and Stories all write it with this function. `state` is `comparisonState()` of a comparison that can be drawn.
 */
function renderChangesPanelHtml(state) {
  const pick = changesPick();
  const rows = sortedChangeRows(state.changes || []);
  const splits = splitElementsOf(rows);
  const filter = changesFilterFor(state); // wave 015, run 0103 (#27): the two filters of the list, and where the reader is in it
  const ordered = orderedChangeRows(state);
  const shown = shownChangeRows(ordered, filter);
  const marked = markedChangeKeys(ordered, pick);
  const group = (thing, title) => {
    const all = rows.filter((row) => row.thing === thing);
    const list = all.filter((row) => changeRowIsShown(row, filter));
    return (
      '<h4 class="inspection-subhead">' +
      title +
      ' <span class="field-count">' +
      (list.length === all.length ? list.length : list.length + ' of ' + all.length) +
      '</span></h4>' +
      (list.length
        ? '<ul class="change-list" aria-label="' +
          title +
          ' that differ">' +
          list.map((row) => renderChangeRowHtml(row, marked.has(changeRowKey(row)), rows, splits)).join('') +
          '</ul>'
        : '<p class="muted change-none">' +
          (all.length ? 'None of the ' + all.length + ' matches the filters.' : 'None.') +
          '</p>')
    );
  };
  const counts = state.counts;
  const countRow = (title, c) =>
    '<div class="changes-count-row"><span class="changes-count-label">' +
    title +
    '</span>' +
    CHANGE_STATES.filter((name) => c[name] !== undefined)
      .map((name) => changeChipHtml(name, c[name]))
      .join('') +
    '</div>'; // moved, split and merged are counted only when there is one: the kernel leaves them out of a comparison that has none
  const wording = AppState.hideWording
    ? state.wordingHidden
      ? '<p class="changes-note" data-wording="hidden">' +
        state.wordingHidden +
        ' wording-only ' +
        (state.wordingHidden === 1 ? 'change' : 'changes') +
        ' hidden.</p>'
      : ''
    : state.wordingOnly
      ? '<p class="changes-note" data-wording="shown">' +
        state.wordingOnly +
        ' of the changed elements ' +
        (state.wordingOnly === 1 ? 'is a change' : 'are changes') +
        ' of wording only (the description is all that changed).</p>'
      : '';
  const ofSplit = newRelationshipsOfSplits(rows, splits);
  const ofSplitNote = ofSplit
    ? '<p class="changes-note" data-of-split="' +
      ofSplit +
      '">' +
      ofSplit +
      ' of the ' +
      counts.relationships.new +
      ' new relationships ' +
      (ofSplit === 1 ? 'belongs' : 'belong') +
      ' to split elements: the comparison does not compare the relationships of a split element, so they read as new.</p>'
    : '';
  return (
    '<div class="changes-panel" data-changes-panel>' +
    '<div class="inspection-head"><h3>Changes</h3></div>' +
    '<p class="changes-compared">' +
    escapeHtml(plateauTitle(state.target)) +
    ' compared with ' +
    escapeHtml(plateauTitle(state.base)) +
    '.</p>' +
    '<div class="changes-counts" role="group" aria-label="Counts">' +
    countRow('Elements', counts.elements) +
    countRow('Relationships', counts.relationships) +
    '</div>' +
    '<label class="changes-toggle" title="A change of the description alone is wording, not structure: leave it out of the drawing, the list and the counts"><input type="checkbox" data-action="toggle-hide-wording"' +
    (AppState.hideWording ? ' checked' : '') +
    '> Hide wording-only changes</label>' +
    wording +
    ofSplitNote +
    (candidateMessage ? '<p class="changes-message" role="alert">' + escapeHtml(candidateMessage) + '</p>' : '') +
    renderCandidatesHtml(state) +
    renderWarningsHtml(state) +
    renderStateWordsHtml(state) +
    renderCascadeHtml(state) +
    (rows.length ? '' : '<p class="inspection-note">Nothing differs between the two plateaus.</p>') +
    renderChangesReadingHtml(ordered, filter, shown, currentChangeOf(ordered, pick)) +
    renderCurrentChangeDetailHtml(state, currentChangeOf(ordered, pick), shown) +
    group('element', 'Elements') +
    group('relationship', 'Relationships') +
    '</div>'
  );
}

// ---- Candidates and warnings (wave 009) ----
// The kernel proposes pairs it takes for one thing said twice (an element only the other plateau has, and an element only this one has, of the same kind and the
// same place, name or description). It never applies one. The editor, which is interactive and writes no generated file, lists them for any comparison (D-7):
// "Write replaces" writes `replaces: [from]` on the new element, through the same edit as any other; "Not related" sets the pair aside for this page.

/** The pairs set aside with "Not related": remembered in this page only, for the pair of plateaus they were set aside in. No storage. */
const dismissedCandidates = new Set();

function candidateKey(state, candidate) {
  return [state.base.id, state.target.id, candidate.layer, candidate.from, candidate.to].join('|');
}

/** The reasons the kernel gives, in words. */
const CANDIDATE_REASON_WORDS = {
  name: 'same name',
  description: 'close description',
  parent: 'the only two of their kind under the same parent'
};

/** The candidates of the comparison that were not set aside, in the kernel's order. */
function openCandidatesOf(state) {
  return (state.candidates || []).filter((candidate) => !dismissedCandidates.has(candidateKey(state, candidate)));
}

/** One side of a candidate: its name and its reference (the union knows both elements, one from each plateau). */
function candidateSideHtml(role, state, layer, reference) {
  const record = state.records && state.records.get(layer + '|' + reference);
  const name = record && record.name ? record.name : String(reference).split('.').pop();
  return (
    '<div class="change-candidate-side"><span class="change-candidate-role">' +
    role +
    '</span><span class="change-name">' +
    escapeHtml(name) +
    '</span> <span class="change-ref">' +
    escapeHtml(reference) +
    '</span>' +
    (layer === 'technology' ? ' <span class="change-layer">technology</span>' : '') +
    '</div>'
  );
}

/** The Candidates section of the Changes panel: '' when the kernel proposes none (or all were set aside and none can be brought back). */
function renderCandidatesHtml(state) {
  const open = openCandidatesOf(state);
  const setAside = (state.candidates || []).length - open.length;
  if (!open.length && !setAside) return '';
  let html =
    '<section class="changes-candidates" aria-label="Candidates"><h4 class="inspection-subhead changes-subhead">Candidates <span class="field-count">' +
    open.length +
    '</span></h4>';
  if (open.length) {
    html +=
      '<p class="changes-note">Each pair looks like one thing said twice. Nothing is applied: “Write replaces” writes <code>replaces</code> on the new element (saved with the rest), “Not related” sets the pair aside.</p>' +
      '<ul class="change-candidates">' +
      open
        .map((candidate) => {
          const attributes =
            ' data-layer="' +
            escapeHtml(candidate.layer) +
            '" data-from="' +
            escapeHtml(candidate.from) +
            '" data-to="' +
            escapeHtml(candidate.to) +
            '"';
          const why = candidateLayerProblem(candidate, state); // #130: off, with the reason, when the layer cannot hold the entry; #138: or the merge the pair is part of
          const reasons = (candidate.reasons || [])
            .map((reason) => CANDIDATE_REASON_WORDS[reason] || reason)
            .join(', ');
          return (
            '<li class="change-candidate"' +
            attributes +
            '><div class="change-candidate-pair">' +
            candidateSideHtml('Removed', state, candidate.layer, candidate.from) +
            candidateSideHtml('New', state, candidate.layer, candidate.to) +
            '</div>' +
            (reasons ? '<div class="change-candidate-reasons">' + escapeHtml(reasons) + '</div>' : '') +
            (why ? '<div class="change-candidate-why muted" role="note">' + escapeHtml(why) + '</div>' : '') +
            '<div class="change-candidate-actions"><button type="button" data-action="accept-candidate"' +
            attributes +
            (why ? ' disabled title="' + escapeHtml(why) + '"' : '') +
            '>Write replaces</button>' +
            '<button type="button" data-action="dismiss-candidate"' +
            attributes +
            '>Not related</button></div></li>'
          );
        })
        .join('') +
      '</ul>';
  }
  if (setAside) {
    html +=
      '<p class="changes-note">' +
      setAside +
      ' set aside. <button type="button" class="link-button" data-action="restore-candidates">Show again</button></p>';
  }
  return html + '</section>';
}

/**
 * The Cascade of the removals section of the Changes panel (wave 014, run 0080): what the REMOVE patches of the more recent plateau took besides the elements they
 * select, among what the other plateau has, as the table of `archicode diff` lists it after the changes (`GapReport`, `Removal.cascade`). '' when there is none.
 */
function renderCascadeHtml(state) {
  const cascade = state.cascade || [];
  if (!cascade.length) return '';
  return (
    '<section class="changes-cascade" aria-label="Cascade of the removals"><h4 class="inspection-subhead changes-subhead">Cascade of the removals <span class="field-count">' +
    cascade.length +
    '</span></h4>' +
    '<p class="changes-note">What a <code>REMOVE</code> took besides the elements it selects, in the plateaus the target adds to the one it is compared with.</p>' +
    '<ul class="change-cascade">' +
    cascade
      .map(
        (row) =>
          '<li class="change-cascade-row" data-effect="' +
          escapeHtml(row.effect) +
          '" data-plateau="' +
          escapeHtml(row.plateau) +
          '" data-element="' +
          escapeHtml(row.element) +
          '">' +
          '<span class="cascade-patch">' +
          escapeHtml(row.plateau + ' \u00b7 ' + row.rank + ' ' + row.patch) +
          '</span> ' +
          '<span class="cascade-effect">' +
          escapeHtml(row.effect) +
          '</span> ' +
          '<span class="change-ref">' +
          escapeHtml(row.element) +
          '</span>' +
          (row.layer === 'technology' ? ' <span class="change-layer">technology</span>' : '') +
          (row.detail ? ' <span class="cascade-detail muted">' + escapeHtml(row.detail) + '</span>' : '') +
          '</li>'
      )
      .join('') +
    '</ul></section>'
  );
}

/** What the kernel ignored in the `replaces` it was given, as it says it. */
function renderWarningsHtml(state) {
  const warnings = state.warnings || [];
  if (!warnings.length) return '';
  return (
    '<section class="changes-warnings-section" aria-label="Warnings"><h4 class="inspection-subhead changes-subhead">Warnings <span class="field-count">' +
    warnings.length +
    '</span></h4>' +
    '<ul class="changes-warnings">' +
    warnings.map((warning) => '<li>' + escapeHtml(warning) + '</li>').join('') +
    '</ul></section>'
  );
}

/** The Hand-written states section of the Changes panel: one line per element and word (the sentences of the command line); '' when every word agrees with the comparison, or there is none. */
function renderStateWordsHtml(state) {
  const hints = stateWordHintsOf(state);
  if (!hints.length) return '';
  return (
    '<section class="changes-state-words" aria-label="Hand-written states"><h4 class="inspection-subhead changes-subhead">Hand-written states <span class="field-count">' +
    hints.length +
    '</span></h4>' +
    '<ul class="changes-warnings">' +
    hints
      .map(
        (hint) =>
          '<li data-ref="' +
          escapeHtml(hint.reference) +
          '" data-word="' +
          escapeHtml(hint.word) +
          '">' +
          escapeHtml(hint.sentence) +
          '</li>'
      )
      .join('') +
    '</ul></section>'
  );
}

// ---- A state written by hand that the comparison does not compute (issue 36) ----
// The states of a comparison (`new`, `changed`, `removed`, `moved`, `split`, `merged`, `contains-changes`) are also words an author may have written by hand, as a
// qualifier or in the `rendering-stereotypes` tag. A box gets the default look of a state only where the comparison computes it (wave 009, D-5), so a word that
// disagrees with the comparison is a badge and the author's own style on a box that looks as it did, and nothing says why. The command line says it on its error
// output (`StateTags.java`); the sentences below are the same ones, word for word, and `state-hints.test.js` reads the sentences of the command line
// (`src/test/resources/state-hints/expected-sentences.txt`, which `StateTagRuleTest.java` checks the command line against) and fails if they differ.

/** The words of the author that are the name of a state, for an element: [{ word, source }], qualifiers first, each word once (the order of `StateTags.written`). */
function writtenStateWordsOf(record) {
  const words = [];
  const add = (word, source) => {
    if (STATE_WORDS.includes(word) && !words.some((w) => w.word === word)) words.push({ word, source });
  };
  kernelStringsOf(record.qualifiers).forEach((word) => add(word, 'qualifier'));
  const tag = kernelTagsOf(record.tags)['rendering-stereotypes'];
  if (tag !== undefined && tag.trim() !== '')
    tag
      .trim()
      .split(/\s+/)
      .forEach((word) => add(word, '`rendering-stereotypes` tag'));
  return words;
}

/**
 * What the comparison says an element of its union is: its own change, else `contains-changes` when the kernel says (`contains_changes`, on the elements of `compare`'s union,
 * issue #96) that it did not change and holds a change, else null. The page does not work the state out from the references (that is `StateTags.stateOf`'s business too,
 * which reads the same key). `element` is a record of the comparison (`comparisonState().records` or `.full.records`), or undefined for a reference the union does not hold.
 */
function comparisonStateOfElement(element) {
  if (!element) return null;
  if (CHANGE_STATES.includes(element.change)) return element.change;
  return element.contains_changes === true ? 'contains-changes' : null;
}

/** The sentence about one word and one element (`StateTags.sentence`, with a comparison). */
function stateWordSentence(reference, word, source, state, target, base) {
  const said =
    state === null
      ? 'finds that it did not change and holds no change'
      : state === 'contains-changes'
        ? 'finds that it did not change by itself but holds a change'
        : 'finds that it is ' + state;
  return (
    'the element `' +
    reference +
    '` carries `' +
    word +
    '` (' +
    source +
    '), but the comparison of `' +
    target.id +
    '` with `' +
    base.id +
    '` ' +
    said +
    ': it is drawn with your own `styles` entry named `' +
    word +
    '` (if any) and not with the default look of the state. The comparison computes the states, so the word can be dropped.'
  );
}

/**
 * The words one element carries that disagree with the comparison, in the order of the words: [{ layer, reference, word, state, sentence }]. The element is one of the plateau
 * drawn, as the command line reads the plateau it is given (`StateTags.warnings(target, ...)`): an element that only the baseline has (a removed one) is told by neither.
 */
function stateWordHintsFor(state, layer, reference) {
  if (!state || !state.full || !state.full.records || state.future) return []; // with the future the plateau drawn is the base: the command line tells these words of the target
  const record = AppState.index[layer] && AppState.index[layer].get(reference);
  if (!record) return [];
  const computed = comparisonStateOfElement(state.full.records.get(layer + '|' + reference));
  return writtenStateWordsOf(record)
    .filter(({ word }) => word !== computed)
    .map(({ word, source }) => ({
      layer,
      reference,
      word,
      state: computed,
      sentence: stateWordSentence(reference, word, source, computed, state.target, state.base)
    }));
}

/**
 * The words that disagree with the comparison, one per element and word, in the order of the command line (application, then technology; by reference; the order of the words):
 * [{ layer, reference, word, state, sentence }]. Nothing when nothing is compared (the command line says another thing then: that nothing is compared, which the editor, where the
 * comparison is a choice of the page, leaves to its band), and none for a word that is the state of its element.
 */
function stateWordHintsOf(state) {
  if (!state || !state.full || !state.full.records) return [];
  const hints = [];
  for (const layer of ['application', 'technology']) {
    const map = AppState.index[layer];
    if (!map) continue;
    for (const reference of Array.from(map.keys()).sort()) hints.push(...stateWordHintsFor(state, layer, reference));
  }
  return hints;
}

/** In the inspection of an element: the words it carries that the comparison does not give it, told where the author looks at the box. '' when none (or nothing is compared). */
function renderStateWordHintsHtml(layer, reference) {
  const hints = stateWordHintsFor(comparisonState(), layer, reference);
  if (!hints.length) return '';
  return (
    '<section class="state-word-hints" aria-label="Words that are not its state">' +
    hints
      .map(
        (hint) =>
          '<p class="inspection-note state-word-hint" data-word="' +
          escapeHtml(hint.word) +
          '">' +
          escapeHtml(hint.sentence) +
          '</p>'
      )
      .join('') +
    '</section>'
  );
}

/**
 * "Write replaces": add `from` to the `replaces` of the element `to` of the more recent plateau of the comparison, and only there (`acceptLayeredCandidate`). A candidate whose
 * new element is not in that plateau is refused with the reason (in the panel), and nothing is changed. The edit is `commitElementEdit` like every
 * other edit of an element: it keeps the comments and the lines it does not touch, marks the file as modified (saved with the rest), and ends in
 * `rebuildIndexAndRender`, which tells the cache of the comparison that the model changed. Returns `{ ok: true }` or `{ ok: false, message }`.
 */
function acceptCandidate(candidate) {
  const refuse = (message) => {
    candidateMessage = message;
    requestRedraw();
    return { ok: false, message };
  };
  const state = comparisonState();
  if (!state || !state.records)
    return refuse('Nothing is compared: choose a plateau in Compare with, on the band, first.');
  return acceptLayeredCandidate(candidate, state, refuse);
}

/**
 * "Write replaces" for two plateaus of the band, whichever is drawn: `replaces: [from]` goes on the element `to` of the more recent plateau of the comparison (the
 * target) and only there, in the manifest that declares it. An element the target inherits from a plateau above is declared there: writing it would change that plateau
 * and the ones that override it, so it is refused with the plateau to compare. The write is the same edit as any other (`commitElementEdit`): it keeps the lines it does
 * not touch, marks the file as modified, and ends in `rebuildIndexAndRender`; it is allowed in a plateau that is read-only for the rest, since it is the one thing the
 * Changes panel offers and it lands in the plateau the comparison is about.
 */
function acceptLayeredCandidate(candidate, state, refuse) {
  const layer = candidate.layer || 'application';
  const base = state.base,
    target = state.target;
  const baseIndex = baseSideIndex(),
    targetIndex = targetSideIndex();
  const record = targetIndex[layer] ? targetIndex[layer].get(candidate.to) : null;
  if (!record) {
    return refuse(
      baseIndex[layer] && baseIndex[layer].has(candidate.to)
        ? '“' +
            candidate.to +
            '” belongs to “' +
            plateauTitle(base) +
            '”, the older plateau of the comparison. replaces goes on an element of “' +
            plateauTitle(target) +
            '”, the more recent one.'
        : '“' + candidate.to + '” is not an element of “' + plateauTitle(target) + '” any more; nothing was written.'
    );
  }
  if (!baseIndex[layer] || !baseIndex[layer].has(candidate.from))
    return refuse('“' + candidate.from + '” is not an element of “' + plateauTitle(base) + '”; nothing was written.');
  if (targetIndex[layer].has(candidate.from))
    return refuse(
      '“' +
        candidate.from +
        '” is still an element of “' +
        plateauTitle(target) +
        '”: a replaces that names it would be ignored.'
    );
  if (record.declaredIn !== undefined && record.declaredIn !== target.id) {
    return refuse(
      '“' +
        candidate.to +
        '” is declared in the plateau “' +
        record.declaredIn +
        '”, not in “' +
        plateauTitle(target) +
        '”: replaces is written in the manifest that declares the element, which would change “' +
        record.declaredIn +
        '” and the plateaus that override it. Compare “' +
        record.declaredIn +
        '” with “' +
        plateauTitle(base) +
        '” to write it there; nothing was written.'
    );
  }
  const layerProblem = candidateLayerProblem(candidate, state); // #130, and the merge as a whole (#138)
  if (layerProblem) return refuse(layerProblem);
  const located = locateContentNode(candidate.to, layer, record);
  if (!located)
    return refuse(
      '“' + candidate.to + '” cannot be found in the manifests of “' + plateauTitle(target) + '”; nothing was written.'
    );
  if (located.node.replaces !== undefined && located.node.replaces !== null && !Array.isArray(located.node.replaces)) {
    return refuse('The replaces of “' + candidate.to + '” is not a list; fix it by hand, nothing was written.');
  }
  candidateMessage = null;
  try {
    commitElementEdit(
      candidate.to,
      (node) => {
        node.replaces = replacesWith(node.replaces, candidate.from);
      },
      layer,
      { record, allowReadOnly: true }
    );
  } catch (e) {
    candidateMessage = e && e.message ? e.message : String(e);
    requestRedraw();
    return { ok: false, message: candidateMessage };
  }
  return { ok: true };
}

/**
 * Whether the layer the entry would be written in can hold it (wave 018, run 0131, issue #130, decision D4): `replaces` is read against the plateau the manifest builds on, the
 * one the plateau of the target overrides, so, when the comparison is several layers apart (`replacesChainBetween`: the kernel composes the layers in between, and reads the target's entries against the plateau just below it), `from` must be an element of that plateau. An intermediate layer that removed `from` makes the entry a mistake of the layer it is
 * written in: the comparison composes it through `chain` (#89), the manifest cannot say it. Returns the sentence, or null when the layer can hold it (also when there is
 * nothing it builds on: the root, a workspace without plateaus, or a plateau that cannot be drawn, which `guardedLayerWrite` reports). Every pair is looked at alone here, so a
 * split or a merge, written one pair at a time, has each of its `from` checked; a merge is also refused as a whole when one of its `from` is (`replacesMergeProblem`, #138), and
 * *Add replaces* of the inspection asks the same (`addReplacesLayerProblem`). The command line has no such rule: it writes no `replaces`.
 */
function replacesLayerProblem(layer, from, state) {
  const tree = AppState.plateauTree;
  if (!tree || !state || !state.target) return null;
  const node = tree.nodes.get(state.target.id);
  if (!node || node.parent === null || !tree.nodes.has(node.parent)) return null;
  if (!replacesChainBetween(state.base.id, state.target.id)) return null; // the plateau compared with is the one the kernel reads the entry against (one layer apart, or siblings one layer above what they share): wave 017, as written
  const below = layerModelOf(node.parent, AppState.workspace.settings);
  if (below.undrawable || !below.index[layer] || below.index[layer].has(from)) return null;
  const titleOf = (plateau) =>
    typeof plateau.name === 'string' && plateau.name.trim() !== '' ? plateau.name : plateau.id;
  const parentTitle = titleOf(tree.nodes.get(node.parent)),
    targetTitle = titleOf(state.target);
  return (
    '\u201c' +
    from +
    '\u201d is not an element of \u201c' +
    parentTitle +
    '\u201d, the plateau \u201c' +
    targetTitle +
    '\u201d builds on (a layer in between removed it): replaces is read against that plateau, so the entry would name nothing there. ' +
    'Compare \u201c' +
    targetTitle +
    '\u201d with \u201c' +
    parentTitle +
    '\u201d, or write the entry in the layer that still has \u201c' +
    from +
    '\u201d (a plateau that overrides one that holds it); nothing was written.'
  );
}

/**
 * Why a pair of the Changes panel cannot be written (wave 019, run 0139, issue #138): its own `from` the layer cannot hold (`replacesLayerProblem`, the sentence of #130), else
 * the merge it is part of cannot be written whole (`replacesMergeProblem`). Null when it can. The button of the pair is off with it, and `acceptLayeredCandidate` refuses with it.
 */
function candidateLayerProblem(candidate, state) {
  return (
    replacesLayerProblem(candidate.layer || 'application', candidate.from, state) ||
    replacesMergeProblem(candidate, state)
  );
}

/**
 * A merge is written one pair at a time (one `from` per click on *Write replaces*): every pair is checked before the first is written, and the merge is refused as a whole
 * when the layer cannot hold one of its `from` (wave 019, run 0139, issue #138, decision T4), so that no merge is left half-written. The merge of a pair is the open pairs of
 * the comparison (not set aside with *Not related*) of its layer and its `to`, when there are two `from` or more. Returns the sentence, which names the new element, what it
 * merges, the first `from` the layer cannot hold with the reason of #130 and what to do, or null (no merge, or every `from` of it is held). A split has one `from` for all its
 * pairs, so they are already all refused or all allowed.
 */
function replacesMergeProblem(candidate, state) {
  if (!state) return null;
  const layer = candidate.layer || 'application';
  const froms = [String(candidate.from)];
  for (const other of openCandidatesOf(state)) {
    if (
      (other.layer || 'application') === layer &&
      String(other.to) === String(candidate.to) &&
      !froms.includes(String(other.from))
    )
      froms.push(String(other.from));
  }
  if (froms.length < 2) return null;
  froms.sort(compareCodePoints);
  for (const from of froms) {
    const problem = replacesLayerProblem(layer, from, state);
    if (!problem) continue;
    const named = froms.map((reference) => '“' + reference + '”');
    return (
      '“' +
      candidate.to +
      '” would merge ' +
      named.slice(0, -1).join(', ') +
      ' and ' +
      named[named.length - 1] +
      ', which is written one pair at a time, so every pair is checked before the first is written: ' +
      problem.replace(/; nothing was written\.$/, '') +
      '. If a pair is no part of the merge, set it aside with “Not related”; nothing was written.'
    );
  }
  return null;
}

/**
 * *Add replaces* of the inspection (wave 019, run 0139, issue #138, decision T4): the reference typed is checked as *Write replaces* checks a pair (`replacesLayerProblem`, #130),
 * against the comparison on screen when the plateau drawn, whose element the form edits, is its more recent plateau (with the future the plateau drawn is the base: the entry
 * is not about that comparison). Returns the sentence, or null: no comparison, one layer apart, a workspace with no plateau, which write as before.
 */
function addReplacesLayerProblem(record, reference) {
  const state = comparisonState();
  if (!state || state.future || !state.target || !state.base) return null;
  return replacesLayerProblem(record.layer || 'application', reference, state);
}

/** The list `replaces` becomes when `reference` is added to it: appended, and not twice. */
function replacesWith(current, reference) {
  if (current !== undefined && current !== null && !Array.isArray(current))
    throw new Error('The replaces of this element is not a list; fix it in the file, nothing was written.');
  const list = Array.isArray(current) ? current.slice() : [];
  if (!list.some((entry) => String(entry) === String(reference))) list.push(reference);
  return list;
}

/** "Not related": the pair is set aside for this page (memory only; the kernel is not told and nothing is written). */
function dismissCandidate(candidate) {
  const state = comparisonState();
  if (!state || !state.records) return;
  candidateMessage = null;
  dismissedCandidates.add(candidateKey(state, candidate));
  requestRedraw();
}

/** "Show again": the pairs set aside for the plateaus compared come back. */
function restoreCandidates() {
  const state = comparisonState();
  if (!state || !state.records) return;
  candidateMessage = null;
  for (const candidate of state.candidates || []) dismissedCandidates.delete(candidateKey(state, candidate));
  requestRedraw();
}

/** The Changes tab while the comparison is still being read (the kernel loads with the first drawing): the panel is there, the list follows. */
function renderChangesPendingHtml() {
  return '<div class="changes-panel" data-changes-panel data-pending><div class="inspection-head"><h3>Changes</h3></div><p class="muted">Reading the comparison&hellip;</p></div>';
}
