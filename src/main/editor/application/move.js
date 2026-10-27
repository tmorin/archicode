// =====================================================================
// Move an element under another parent, or to the top level (wave 009, run 0047; wave 015, run 0104). The element and everything inside it follow; its reference
// changes (the parent's reference, then its id; its id alone at the top level), and every reference that pointed at it or inside it follows, by the
// machinery of an id rename (`commitElementEdit` with `renamedTo`: `rewriteInboundReferences` and `rewriteUiReferences`).
// The places rewritten are therefore the ones a rename rewrites: the `destination` of relationships, the `applications`
// of technology nodes (for an application element), the `uses` of environments (for a technology element), the
// `header.parent` of the manifests attached to the element or below it, the saved views and stories of the workspace,
// and what the page remembers (selection, unfolded rows, the Map). Facets (JSONPath) are not references and are not read.
//
// How a move is written depends on how the manifest model holds the element and on where the new parent is declared (`moveRouteUnder`, `moveTopVerdict`):
//   - 'header': the element is the root of a manifest file (its own `app.*.yaml`): only `header.parent` changes (one line; at the top level the line goes); the file stays;
//   - 'inline': it is nested in a manifest and the new parent is declared in the same file: its block moves to the `elements` of the new parent;
//   - 'paste': it is nested and the new parent is declared in another manifest of the plateau written: the block is cut out of one file and pasted in the other, with its
//     comments and quotes (`cutBlockFromText`, `pasteBlockInText`; #43), both files marked modified;
//   - 'extract': it is nested and no block can take it: it goes to the top level (#44), or the new parent is declared in a plateau whose files the plateau drawn does not write.
//     The element then gets a manifest of its own (`header.parent`, none at the top level, `plateau:` of the plateau drawn) and its block leaves its file.
// The save is the line-preserving one: a line the move does not touch is the author's, with its comments and quotes. A move writes no `replaces` (#97): "Write replaces", in
// the Changes panel, is where the key is written. For each element of the layer that is not offered as a parent the dialog says why (`moveParentVerdict`).
// =====================================================================

/** Whether `parentRecord` may hold `record`, by the rules that create an element under a parent (`childKindOptionsForLevel`). */
function moveKindFits(record, parentRecord) {
  const options = childKindOptionsForLevel(parentRecord.level);
  return options.indexOf(record.kind) !== -1;
}

/** The reference of the parent an element of `located` is under now (a nested element: the reference minus its id; a manifest root: its `header.parent`), or null at the top. */
function currentParentOf(reference, located) {
  if (located.parentArray === null) return located.mf.header && located.mf.header.parent ? String(located.mf.header.parent) : null;
  return reference.slice(0, reference.length - String(located.node.id).length - 1);
}

/** The value of the choice "Top level" in the Move dialog, and the parent `commitMoveElement` takes for a move to the top level: not a reference (it starts with a space). */
const MOVE_TOP_LEVEL = ' top level';

/** The kinds a layer holds at its top level, as the model says it (`Application` holds person, solution and system, `Technology` an environment; in a workspace that has plateaus the same list is what `resolveLayerStep` accepts with no `header.parent`, #106). */
function topLevelKindsOf(layer) {
  const spec = READ_SCHEMA.types[layer === 'technology' ? 'Technology' : 'Application'].fields.elements; // '[*ApplicationElement]'
  return Object.keys(READ_SCHEMA.kinds[spec.slice(2, -1)] || {}).sort();
}

/** `a`, `a and b`, `a, b and c`. */
function wordsList(words) {
  return words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
}

/** What a move looks at: the element, where its block is, its parent now, the plateau written. `null` when the element cannot be found in the manifests. */
function moveContextOf(reference, layer) {
  const index = AppState.index && AppState.index[layer];
  const record = index ? index.get(reference) : null;
  const located = record ? locateContentNode(reference, layer) : null;
  if (!located) return null;
  return { reference, layer, index, record, located, nested: located.parentArray !== null, parentNow: currentParentOf(reference, located), writing: writingPlateau() };
}

/** Why the element cannot get a manifest of its own named after `reference`, or null: the name of the file is the reference, and a `/` or a `\` in an id (a hand-written manifest may have one) would make it a folder. */
function manifestNameProblem(ctx, reference) {
  return /[/\\]/.test(reference) ? 'A manifest of its own is needed for “' + ctx.reference + '” there, and its reference “' + reference + '” has a “/” or a “\\” in it, which cannot be in the name of a file: rename the element first.' : null;
}

/**
 * How an element goes under `parent` when nothing else stops it: `{ route }` (see the comment above: 'header', 'inline', 'paste' or 'extract'), or `{ reason }`. A nested
 * element goes with its block to a parent declared in a file of the plateau written; a parent declared where the plateau drawn writes nothing (a plateau it overrides) takes it
 * as a manifest of its own.
 */
function moveRouteUnder(ctx, parent) {
  if (!ctx.nested) return { route: 'header' };
  const parentLocated = locateContentNode(parent.reference, ctx.layer);
  if (!parentLocated) return { reason: '“' + parent.reference + '” cannot be found in the manifests.' };
  if (parentLocated.mf === ctx.located.mf) return { route: 'inline' };
  if (ctx.writing === null || plateauOfManifest(parentLocated.mf) === ctx.writing) return { route: 'paste', file: parentLocated.mf.relPath };
  const unnamed = manifestNameProblem(ctx, parent.reference + '.' + String(ctx.located.node.id));
  if (unnamed) return { reason: unnamed };
  return { route: 'extract', plateau: plateauOfManifest(parentLocated.mf) };
}

/** `{ route }` when `parent` can hold the element, `{ reason }` (one sentence that names the parent) when not. The checks are the ones a move makes, in the order it makes them. */
function moveParentVerdict(ctx, parent) {
  const ref = parent.reference;
  if (ref === ctx.reference) return { reason: '“' + ref + '” is the element itself: an element cannot be moved into itself.' };
  if (ref.indexOf(ctx.reference + '.') === 0) return { reason: '“' + ref + '” is inside “' + ctx.reference + '”: an element cannot be moved into what it contains.' };
  if (ref === ctx.parentNow) return { reason: '“' + ctx.reference + '” is already under “' + ref + '”.' };
  if (!moveKindFits(ctx.record, parent)) {
    const holds = childKindOptionsFor(parent);
    return { reason: 'A ' + ctx.record.kind + ' cannot be put under “' + ref + '”, ' + (holds.length ? 'which holds ' + holds.join(' and ') + ' only' : 'a ' + parent.kind + ' that holds nothing') + '.' };
  }
  const id = String(ctx.located.node.id);
  if (ctx.index.has(ref + '.' + id)) return { reason: '“' + ref + '” already holds an element with the id “' + id + '” (“' + ref + '.' + id + '”); rename one of the two first.' };
  const twice = (AppState.duplicateReferences || []).find((d) => d.layer === ctx.layer && d.reference === ref);
  if (twice) return { reason: '“' + ref + '” is declared twice (' + twice.sources.join(', ') + '): which of the two is the parent is not for the editor to guess.' };
  return moveRouteUnder(ctx, parent);
}

/** `{ route }` when the element can go to the top level, `{ reason }` when not. The kinds that may be there are the ones the layer holds (`topLevelKindsOf`). */
function moveTopVerdict(ctx) {
  const roots = topLevelKindsOf(ctx.layer);
  const id = String(ctx.located.node.id);
  if (roots.indexOf(ctx.record.kind) === -1) return { reason: 'A ' + ctx.record.kind + ' is never at the top level: the ' + ctx.layer + ' layer holds only ' + wordsList(roots) + ' there.' };
  if (!ctx.nested && !ctx.parentNow) return { reason: '“' + ctx.reference + '” is already at the top level.' };
  if (ctx.index.has(id)) return { reason: 'The top level already holds an element with the id “' + id + '”; rename one of the two first.' };
  const twice = (AppState.duplicateReferences || []).find((d) => d.layer === ctx.layer && d.reference === id);
  if (twice) return { reason: '“' + id + '” is declared twice (' + twice.sources.join(', ') + '): which of the two is at the top level is not for the editor to guess.' };
  const unnamed = ctx.nested ? manifestNameProblem(ctx, id) : null;
  if (unnamed) return { reason: unnamed };
  return { route: ctx.nested ? 'extract' : 'header', plateau: ctx.writing };
}

/**
 * Why no move of `reference` can be written now, whatever the parent (one sentence), or null: an element inside it is declared twice, or a manifest cannot be read (a reference in
 * it could not be rewritten).
 */
function moveWholeProblem(ctx) {
  const subtree = computeDeletedReferenceSet(ctx.reference, ctx.layer);
  const twice = (AppState.duplicateReferences || []).filter((d) => d.layer === ctx.layer && subtree.has(d.reference));
  if (twice.length) return '“' + twice[0].reference + '” is declared twice (' + twice[0].sources.join(', ') + '): which of the two moves is not for the editor to guess.';
  const unreadable = AppState.manifestFiles.filter((f) => f.error);
  if (unreadable.length) return 'A manifest cannot be read (' + unreadable.map((f) => f.relPath).join(', ') + '): a reference in it could not be rewritten.';
  return null;
}

/**
 * Where the element `reference` can go, and why not elsewhere: `{ parents, routes, top, excluded }`. `parents` are the elements of the layer it can be put under (sorted by
 * reference), `routes` says for each how it is written (`moveRouteUnder`), `top` is `{ route }` or `{ reason }` for the top level, and `excluded` is `[{ reference, record,
 * reason }]` for every other element of the layer, sorted by reference: nothing is left out without a sentence.
 */
function moveParentCandidates(reference, layer) {
  const result = { parents: [], routes: {}, top: { reason: 'There is nothing to move.' }, excluded: [] };
  const ctx = moveContextOf(reference, layer);
  if (!ctx) return result;
  for (const parent of ctx.index.values()) {
    const verdict = moveParentVerdict(ctx, parent);
    if (verdict.reason) result.excluded.push({ reference: parent.reference, record: parent, reason: verdict.reason });
    else { result.parents.push(parent); result.routes[parent.reference] = verdict; }
  }
  result.parents.sort((a, b) => a.reference.localeCompare(b.reference));
  result.excluded.sort((a, b) => a.reference.localeCompare(b.reference));
  result.top = moveTopVerdict(ctx);
  return result;
}

/** Whether the Move button is offered: there is a parent to go under, or the top level. */
function moveIsPossible(reference, layer) {
  const candidates = moveParentCandidates(reference, layer || layerOfReference(reference));
  return candidates.parents.length > 0 || !!candidates.top.route;
}

/** Whether a typed search finds a parent: every word of the search is somewhere in `haystack` (name, id, reference, kind), whatever the case. */
function moveParentMatches(haystack, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  const text = String(haystack || '').toLowerCase();
  return words.every((word) => text.indexOf(word) !== -1);
}

/**
 * Every place that points at `oldRef` or inside it, and would follow it: how many, in which files, how many saved views, and what could NOT be rewritten
 * safely. A reference is rewritten as text; one written as a number or a boolean (`destination: 8080` for an element called `8080`) is read as the element but
 * cannot be rewritten as the reference of another one, so it is listed in `unsafe` and the move is refused.
 */
function scanMoveReferences(oldRef, layer) {
  const result = { count: 0, files: [], views: 0, unsafe: [] };
  const files = new Set();
  const inside = (text) => text === oldRef || text.indexOf(oldRef + '.') === 0;
  const look = (value, what, file) => {
    if (value === undefined || value === null || typeof value === 'object') return;
    if (typeof value === 'string') { if (inside(value)) { result.count++; files.add(file); } return; }
    if (inside(String(value))) result.unsafe.push(what + ' in ' + file + ' is written as ' + typeof value + ' ' + String(value));
  };
  for (const mf of AppState.manifestFiles) {
    if (!writeScopeHas(mf)) continue;
    const mfLayer = manifestLayer(mf);
    if (mfLayer === null) continue;
    if (mfLayer === layer) look(mf.header.parent, 'the parent of ' + manifestRootReference(mf), mf.relPath);
    walkContentNodes(mf, (node, ownerRef) => {
      if (mfLayer === layer && Array.isArray(node.relationships)) {
        for (const rel of node.relationships) if (rel && typeof rel === 'object') look(rel.destination, 'a destination of ' + ownerRef, mf.relPath);
      }
      if (layer === 'technology' && mfLayer === 'technology' && Array.isArray(node.uses)) for (const used of node.uses) look(used, 'a use of ' + ownerRef, mf.relPath);
      if (layer === 'application' && mfLayer === 'technology' && Array.isArray(node.applications)) for (const application of node.applications) look(application, 'an application of ' + ownerRef, mf.relPath);
    });
  }
  // the saved views and the steps of stories: rewritten on a copy to count them
  const copy = (entry) => JSON.parse(JSON.stringify(entry));
  for (const view of savedViews()) if (rewriteRecipeReferences(copy(view), oldRef, oldRef + '.__moved__', layer)) result.views++;
  for (const story of storiesList()) {
    for (const step of Array.isArray(story.steps) ? story.steps : []) {
      if (isPlainObject(step) && !step.view && rewriteRecipeReferences(copy(step), oldRef, oldRef + '.__moved__', layer)) result.views++;
    }
  }
  result.files = Array.from(files).sort();
  return result;
}

/**
 * Judge a move before anything is touched: `{ valid: false, error }` with the reason in words, or `{ valid: true, plan }`. `newParentReference` is a reference, or
 * `MOVE_TOP_LEVEL`. Refused: an element or a parent that belongs to the baseline (only read), an element that another plateau declares (a patch never changes a parent), the
 * element itself or something inside it as the new parent, the parent it already has, a parent that cannot hold the kind, an id the new parent already holds, a reference
 * declared twice, a manifest that cannot be read (a reference in it could not be rewritten), the top level for a kind that is never there, and a reference that cannot be
 * rewritten as text. Where the block of a nested element goes is `plan.route` (see the comment above).
 */
function validateMove(reference, layer, newParentReference) {
  const refuse = (error) => ({ valid: false, error: error + ' Nothing was changed.' });
  layer = layer === 'technology' || layer === 'application' ? layer : (layerOfReference(reference) || 'application');
  const toTop = newParentReference === MOVE_TOP_LEVEL;
  const index = AppState.index[layer];
  const drawn = drawnPlateau();
  const base = AppState.baseline ? AppState.baseline.plateau : null;
  const inBaseline = (ref) => !!AppState.baseline && AppState.baseline.index[layer].has(ref);
  const readOnly = (ref) => '“' + ref + '” belongs to “' + plateauTitle(base) + '”, which is only read to compare and is never written; a move happens in “' + plateauTitle(drawn) + '”, the plateau drawn.';
  if (!index.has(reference)) return refuse(inBaseline(reference) ? readOnly(reference) : '“' + reference + '” is not an element of the workspace.');
  if (!toTop && !index.has(newParentReference)) return refuse(inBaseline(newParentReference) ? readOnly(newParentReference) : '“' + newParentReference + '” is not an element of the workspace.');
  const record = index.get(reference);
  const writing = writingPlateau();
  if (writing !== null && writing !== BASELINE_PLATEAU && record.declaredIn !== writing) { // wave 014 (run 0082)
    return refuse('“' + reference + '” is declared in the plateau `' + record.declaredIn + '`, and a patch never changes a parent: it is moved where it is declared. Draw `' + record.declaredIn + '` to move it.');
  }
  const ctx = moveContextOf(reference, layer);
  if (!ctx) return refuse('“' + reference + '” cannot be found in the manifests.');
  const verdict = toTop ? moveTopVerdict(ctx) : moveParentVerdict(ctx, index.get(newParentReference));
  if (verdict.reason) return refuse(verdict.reason);
  const whole = moveWholeProblem(ctx);
  if (whole) return refuse(whole);
  const references = scanMoveReferences(reference, layer);
  if (references.unsafe.length) return refuse('A reference cannot be rewritten safely: ' + references.unsafe[0] + '.');
  const id = String(ctx.located.node.id);
  const plan = {
    layer, reference, kind: record.kind, newParentReference: toTop ? null : newParentReference, newReference: toTop ? id : newParentReference + '.' + id,
    parentNow: ctx.parentNow, subtree: computeDeletedReferenceSet(reference, layer), references, route: verdict.route, nested: ctx.nested
  };
  return { valid: true, plan };
}

/** The folder of a manifest file (`''` for the root of the workspace). */
function folderOfPath(relPath) {
  return relPath.split('/').slice(0, -1).join('/');
}

/**
 * Writes a judged move (`validateMove`) in the manifests, as the mutator of `commitElementEdit` (`node` is the element, `parentArray` and `indexInParent` where it is): the model
 * changes and the text of the files whose block moves is the author's own, carried over. What is not written here is left to the caller (the references that follow, the file of
 * the element marked modified, the rebuild).
 */
function applyMovePlan(plan, node, parentArray, indexInParent) {
  const located = locateContentNode(plan.reference, plan.layer);
  const mf = located.mf;
  if (plan.route === 'header') {
    if (plan.newParentReference === null) delete mf.header.parent;
    else mf.header.parent = plan.newParentReference;
    return;
  }
  const oldValue = JSON.parse(JSON.stringify({ header: mf.header, content: mf.content }));
  const oldPath = pathOfElementNode(mf.content, node);
  const oldText = mf.rawText;
  const oldParent = locateContentNode(plan.parentNow, plan.layer).node;
  const detach = () => {
    parentArray.splice(indexInParent, 1);
    if (parentArray.length === 0) delete oldParent.elements;
  };
  if (plan.route === 'inline') {
    const target = locateContentNode(plan.newParentReference, plan.layer).node;
    detach();
    if (!Array.isArray(target.elements)) target.elements = [];
    target.elements.push(node);
    // the block of the element goes as it was written, with its comments and quotes; if the layout of the file does not allow it, the ordinary save writes it
    const movedText = moveBlockInText(oldText, oldValue, oldPath, { header: mf.header, content: mf.content }, pathOfElementNode(mf.content, node));
    if (movedText !== null) mf.rawText = movedText;
    return;
  }
  const cut = () => { // the block leaves its file: the text without it, and the lines it was written in; null when the layout is not one this can follow (the ordinary save follows the model)
    const out = cutBlockFromText(oldText, oldValue, oldPath);
    if (out !== null) mf.rawText = out.text;
    return out;
  };
  if (plan.route === 'paste') {
    const targetLocated = locateContentNode(plan.newParentReference, plan.layer);
    const other = targetLocated.mf;
    const otherValue = JSON.parse(JSON.stringify({ header: other.header, content: other.content }));
    const otherText = other.rawText;
    detach();
    if (!Array.isArray(targetLocated.node.elements)) targetLocated.node.elements = [];
    targetLocated.node.elements.push(node);
    const carried = cut();
    const pasted = carried === null ? null : pasteBlockInText(otherText, otherValue, { header: other.header, content: other.content }, pathOfElementNode(other.content, node), carried.carried, carried.indent);
    other.rawText = pasted !== null ? pasted : reserializeManifestFile(other);
    other.dirty = true; // the second file changes too: "Save all changes" writes both
    return;
  }
  // 'extract': a manifest of its own, next to the file it leaves
  const header = { kind: ARCHICODE_KIND_PREFIX + plan.kind, version: '1' };
  const writing = writingPlateau();
  if (writing !== null && writing !== BASELINE_PLATEAU) header.plateau = writing;
  if (plan.newParentReference !== null) header.parent = plan.newParentReference;
  const content = JSON.parse(JSON.stringify(node));
  delete content.kind;
  detach();
  const carried = cut();
  const relPath = allocateManifestRelPath(folderOfPath(mf.relPath), plan.layer === 'application' ? 'app.' : 'env.', plan.newReference);
  const created = {
    relPath, header, content, error: null,
    rawText: (carried !== null && manifestTextFromBlock(carried.carried, header, content)) || serializeManifestFile(header, content),
    dirty: true, existedOnDisk: false, lastKnownDiskModified: null
  };
  adoptRemovedFile(created);
  AppState.manifestFiles.push(created);
  AppState.manifestFiles.sort((a, b) => compareCodePoints(a.relPath, b.relPath)); // matches loadWorkspace's own ordering
}

/**
 * Move `reference` under `newParentReference` (or to the top level, `MOVE_TOP_LEVEL`). Everything is judged first (`validateMove`); a refused move changes nothing. The edit
 * itself is `commitElementEdit` with `renamedTo` (the machinery of a rename: the references that pointed at the element and at what it holds follow, in every file), so it ends
 * in `rebuildIndexAndRender` (the cache of the comparison is told), marks the files as modified and is given up with the other edits ("Cancel"). In a layered workspace it is
 * written under `guardedLayerWrite` (it writes only the files of the plateau drawn; a write the plateaus refuse is put back whole). No `replaces` is written (#97).
 * Returns `{ ok: true, reference }` or `{ ok: false, message }`.
 */
function commitMoveElement(reference, layer, newParentReference, options) {
  const check = validateMove(reference, layer, newParentReference);
  if (!check.valid) return { ok: false, message: check.error };
  const plan = check.plan;
  try {
    const moved = commitElementEdit(reference, (node, parentArray, indexInParent) => {
      applyMovePlan(plan, node, parentArray, indexInParent);
      return { renamedTo: { from: reference, to: plan.newReference } };
    }, plan.layer, { live: true, confirmed: !!(options && options.confirmed), afterConfirm: () => { expandAncestorsOf(plan.newReference, plan.layer); requestRedraw(); } });
    if (moved && moved.pending) return { ok: true, pending: true, reference };
  } catch (e) {
    return { ok: false, message: e && e.message ? e.message : String(e) };
  }
  expandAncestorsOf(plan.newReference, plan.layer);
  requestRedraw();
  return { ok: true, reference: plan.newReference };
}

/** The sentence under the list of the Move dialog that says how a move is written for the element of `ctx`, with the ways that this list uses. */
function moveWaysHtml(ctx, routes, top) {
  const record = ctx.record;
  if (!ctx.nested) return '<p class="move-ways muted">“' + escapeHtml(record.id) + '” has a manifest of its own: a move changes its <code>header.parent</code> and the file stays.</p>';
  const used = new Set(Object.keys(routes).map((ref) => routes[ref].route).concat(top.route || []));
  const ways = [];
  if (used.has('inline')) ways.push('under a parent of the same file, the block moves inside it');
  if (used.has('paste')) ways.push('under a parent of another file, the block is cut out of this file and pasted in that one, and both files are modified');
  if (used.has('extract')) ways.push('at the top level, or under a parent of a plateau whose files are not written here, the element gets a manifest of its own');
  if (!ways.length) return '';
  return '<p class="move-ways muted">“' + escapeHtml(record.id) + '” is written inside “' + escapeHtml(record.sourceFile) + '”: ' + ways.join('; ') + '. Comments and quotes go with the block.</p>';
}

/** What a choice of the Move dialog adds after its kind: where its block goes. */
function moveRouteHintHtml(verdict) {
  if (verdict.route === 'paste') return ' · the block goes to <code>' + escapeHtml(verdict.file) + '</code>';
  if (verdict.route === 'extract') return ' · in a manifest of its own' + (verdict.plateau && !!AppState.layers && verdict.plateau !== AppState.layers.current ? ' (the parent is declared in the plateau `' + escapeHtml(verdict.plateau) + '`)' : '');
  return '';
}

/** The Move dialog (an `appDialog` of kind 'move'): a search over the parents the element can go under (and the top level), why the others are not offered, and what the move rewrites. */
function renderMoveDialogBodyHtml(dialog) {
  const record = AppState.index[dialog.layer].get(dialog.reference);
  if (!record) return { title: 'Move', body: '<p>This element does not exist any more.</p>', actions: '' };
  const { parents, routes, top, excluded } = moveParentCandidates(dialog.reference, dialog.layer);
  const ctx = moveContextOf(dialog.reference, dialog.layer);
  const inside = computeDeletedReferenceSet(dialog.reference, dialog.layer).size - 1;
  const references = scanMoveReferences(dialog.reference, dialog.layer);
  const label = record.name || record.id;
  const searchOf = (parent) => [parent.name || '', parent.id, parent.reference, parent.kind].join(' ');
  const topSearch = 'top level no parent';
  const choices = [];
  if (top.route) choices.push({ value: MOVE_TOP_LEVEL, search: topSearch, html: 'Top level <small>no parent · ' + escapeHtml(record.kind) + ' at the root' + moveRouteHintHtml(top) + '</small>' });
  for (const parent of parents) {
    choices.push({ value: parent.reference, search: searchOf(parent), html: escapeHtml(parent.name || parent.id) + ' <small><code>' + escapeHtml(parent.reference) + '</code> · ' + escapeHtml(parent.kind) + moveRouteHintHtml(routes[parent.reference]) + '</small>' });
  }
  let body = '<p class="app-dialog-subject"><code>' + escapeHtml(dialog.reference) + '</code> · ' + escapeHtml(record.kind) +
    (inside ? ' · the ' + inside + ' element' + (inside === 1 ? '' : 's') + ' inside it follow' + (inside === 1 ? 's' : '') : '') + '</p>';
  const whole = ctx ? moveWholeProblem(ctx) || (references.unsafe.length ? 'A reference cannot be rewritten safely: ' + references.unsafe[0] + '.' : null) : null;
  if (whole) body += '<p class="move-blocked" role="alert">No move can be written now. ' + escapeHtml(whole) + '</p>';
  body += '<label class="app-dialog-field" for="move-filter">New parent</label>' +
    '<input type="text" id="move-filter" data-dialog-filter data-dialog-autofocus autocomplete="off" placeholder="Search by name, id or reference" aria-label="Search the new parent" value="' + escapeHtml(dialog.query || '') + '">';
  body += '<div class="move-parents" role="radiogroup" aria-label="New parent">' + choices.map((choice) =>
    '<label class="app-dialog-choice move-parent" data-search="' + escapeHtml(choice.search) + '"' + (moveParentMatches(choice.search, dialog.query) ? '' : ' hidden') + '><input type="radio" name="move-parent" value="' + escapeHtml(choice.value) + '"' + (dialog.chosen === choice.value ? ' checked' : '') + '>' +
      '<span>' + choice.html + '</span></label>').join('') + '</div>';
  body += '<p class="move-empty muted"' + (choices.length === 0 || choices.some((choice) => moveParentMatches(choice.search, dialog.query)) ? ' hidden' : '') + '>No parent matches.</p>';
  if (ctx) body += moveWaysHtml(ctx, routes, top);
  const notOffered = (top.route ? [] : [{ search: topSearch, text: 'Top level: ' + top.reason }]).concat(excluded.map((entry) => ({ search: searchOf(entry.record), text: entry.reason })));
  if (notOffered.length) {
    body += '<details class="move-excluded"><summary>' + notOffered.length + (notOffered.length === 1 ? ' place is' : ' places are') + ' not offered, and why</summary><ul>' + notOffered.map((entry) =>
      '<li data-search="' + escapeHtml(entry.search) + '"' + (moveParentMatches(entry.search, dialog.query) ? '' : ' hidden') + '>' + escapeHtml(entry.text) + '</li>').join('') + '</ul></details>';
  }
  body += '<p class="move-impact">Its reference changes (the parent’s reference, then <code>' + escapeHtml(String(record.id)) + '</code>; at the top level, <code>' + escapeHtml(String(record.id)) + '</code> alone)' +
    (references.count ? ', and ' + references.count + ' reference' + (references.count === 1 ? '' : 's') + ' to it or inside it ' + (references.count === 1 ? 'is' : 'are') + ' rewritten in ' + references.files.length + ' file' + (references.files.length === 1 ? '' : 's') : '; no other file points at it') +
    (references.views ? ', and ' + references.views + ' saved view' + (references.views === 1 ? '' : 's') + ' of the workspace follow' + (references.views === 1 ? 's' : '') : '') + '.</p>';
  if (AppState.plateauTree && AppState.plateauTree.layered) {
    body += '<p class="move-replaces muted">Move writes no <code>replaces</code>. To tell a comparison that an element moved, compare two plateaus and use “Write replaces” in the Changes panel, which lists the pairs that look like one element said twice.</p>';
  }
  const actions = '<button type="button" data-action="dialog-cancel">Cancel</button><button type="button" class="btn-primary" data-action="move-confirm">Move</button>';
  return { title: 'Move “' + label + '”', body, actions };
}

/** Narrows the parents of the Move dialog to the ones that match what is typed (in place: the dialog is not redrawn, the focus stays in the field). */
function applyMoveFilter(query) {
  if (appDialog && appDialog.kind === 'move') appDialog.query = query; // kept when the dialog is drawn again (a refusal)
  const options = Array.from(document.querySelectorAll('.move-parent'));
  let shown = 0;
  for (const option of options) {
    const match = moveParentMatches(option.getAttribute('data-search'), query);
    option.hidden = !match;
    if (match) shown++;
    else { const radio = option.querySelector('input'); if (radio) radio.checked = false; }
  }
  const empty = document.querySelector('.move-empty');
  if (empty) empty.hidden = shown > 0 || options.length === 0;
  for (const item of Array.from(document.querySelectorAll('.move-excluded li'))) item.hidden = !moveParentMatches(item.getAttribute('data-search'), query); // the places not offered, and why
}

/** "Move" in the element's panel: applies what was typed in the form, then opens the dialog for the element selected. */
function openMoveDialog() {
  if (!flushPendingDraft()) return;
  const sel = AppState.selection;
  if (!sel || sel.kind !== 'element') return;
  const layer = layerOfReference(sel.key, sel.layer);
  if (!layer) return;
  const writing = writingPlateau();
  const record = AppState.index[layer].get(sel.key);
  if (writing !== null && writing !== BASELINE_PLATEAU && record && record.declaredIn !== writing) { // wave 014 (run 0082): said at once, not after a parent was chosen
    saveStatus = { state: 'denied', message: '“' + sel.key + '” is declared in the plateau `' + record.declaredIn + '`, and a patch never changes a parent: it is moved where it is declared. Draw `' + record.declaredIn + '` to move it.' };
    requestRedraw();
    return;
  }
  openAppDialog({ kind: 'move', reference: sel.key, layer });
}

/**
 * The button of the Move dialog: does the move the dialog asked for. The parent is the one chosen in the dialog (the top level is `MOVE_TOP_LEVEL`) unless `values.parent` says
 * it. A refusal is told in the dialog, which stays open with what was chosen and typed; nothing is changed. Returns the result of the move, or null.
 */
function submitMoveDialog(values) {
  const dialog = appDialog;
  if (!dialog || dialog.kind !== 'move') return null;
  const chosen = values && values.parent !== undefined ? values.parent : ((document.querySelector('input[name="move-parent"]:checked') || {}).value || '');
  const fail = (message) => {
    dialog.error = message;
    dialog.chosen = chosen || null;
    requestRedraw();
    return null;
  };
  if (!chosen) return fail('Choose the new parent.');
  const check = validateMove(dialog.reference, dialog.layer, chosen);
  if (!check.valid) return fail(check.error);
  const move = () => {
    const result = commitMoveElement(dialog.reference, dialog.layer, chosen);
    if (!result.ok) {
      saveStatus = { state: 'error', failedFile: dialog.reference, message: result.message };
      requestRedraw();
    }
    return result;
  };
  // wave 017 (run 0122, #122): a move changes the reference as a rename does, and the views and the stories follow it in every plateau. When a plateau beside the one drawn still has
  // the old reference, the author is told first (the question of a rename, `renameSiblingImpact`); the Move dialog waits behind it with its choices, and "Back to Move" gives it back.
  const impact = renameSiblingImpact(dialog.reference, check.plan.newReference, dialog.layer);
  if (impact) {
    dialog.chosen = chosen;
    dialog.error = null;
    openAppDialog({ kind: 'rename-siblings', reference: dialog.reference, impact, plateau: impact.plateau, moving: true, back: dialog, returnFocus: dialog.returnFocus, onConfirm: move });
    return null;
  }
  appDialog = null;
  pendingFocusSelector = dialog.returnFocus;
  return move();
}

