// ---- The plateau manifest and the folder of a plateau ----

/** The manifest of kind `archicode.morin.io/plateau` that declares a plateau (it holds its name, horizon, parent and patches), or null when the plateau exists through headers only, or is `baseline` with none. */
function plateauManifestFile(id) {
  const node = AppState.plateauTree && AppState.plateauTree.nodes.get(id);
  if (!node || !node.manifest) return null;
  return AppState.manifestFiles.find((mf) => mf.relPath === node.manifest) || null;
}

/**
 * The folder a new manifest of a plateau is written in: the folder of a manifest the plateau already has (one of the layer of the element, when it has one), so that the new file
 * is where the author keeps the plateau's files and in a folder the command line reads; else the first folder of `manifests.paths`.
 */
function plateauFolderFor(id, category) {
  const own = AppState.manifestFiles.filter((mf) => !mf.error && mf.header && mf.content && manifestKindName(mf.header.kind) !== 'plateau' && plateauOfManifest(mf) === id);
  const pick = (category && own.find((mf) => manifestLayer(mf) === category)) || own[0];
  if (pick) return pick.relPath.split('/').slice(0, -1).join('/');
  const dir = firstManifestsDir();
  return dir === undefined ? 'manifests' : dir;
}

/** The manifest of a plateau where its patches are written; one with only its id is made (in memory, like any new file) when the plateau has none. */
function ensurePlateauManifest(id) {
  const existing = plateauManifestFile(id);
  if (existing) return existing;
  const header = { kind: ARCHICODE_KIND_PREFIX + 'plateau', version: '1' };
  const content = { id };
  const relPath = allocateManifestRelPath(plateauFolderFor(id), 'plateau.', id);
  const mf = { relPath, header, content, error: null, rawText: serializeManifestFile(header, content), dirty: true, existedOnDisk: false, lastKnownDiskModified: null };
  adoptRemovedFile(mf);
  AppState.manifestFiles.push(mf);
  AppState.manifestFiles.sort((a, b) => compareCodePoints(a.relPath, b.relPath));
  return mf;
}

/** The manifest is rewritten from its content (the line-preserving save) and marked modified; an edit that puts the file back as it is on disk leaves it unmodified. */
function touchManifest(mf) {
  mf.rawText = reserializeManifestFile(mf);
  mf.dirty = !(mf.existedOnDisk && typeof mf.savedRawText === 'string' && mf.rawText === mf.savedRawText);
}

// ---- Patches ----

/** The element a plateau resolves to, as the JSON of its graph (a copy), or null. */
function resolvedNodeOf(plateau, category, reference) {
  const result = layerStateOf(plateau, AppState.workspace.settings);
  if (result.fatal) return null;
  const node = graphReferencesOf(result.state.graph)[category].get(reference);
  return node ? clonePlain(node) : null;
}

/** The `SET`, `ADD`, `MERGE` and `REMOVE` patches of a plateau that name an element and a field with a `target` (what `patchFor` writes), `[{ patch, rank }]`; the rank is the kernel's (from 1). */
function plateauPatchesOn(plateau, category, reference, field) {
  const out = [];
  AppState.plateauTree.nodes.get(plateau).patches.forEach((patch, i) => {
    if (!patch || typeof patch !== 'object') return;
    if (readIsMissing(patch.target) || !readIsMissing(patch['json-path']) || !readIsMissing(patch.json_path)) return;
    const layer = readIsMissing(patch.layer) ? 'application' : String(patch.layer).toLowerCase();
    if (String(patch.target) === reference && layer === category && !readIsMissing(patch.field) && String(patch.field) === field) out.push({ patch, rank: i + 1 });
  });
  return out;
}

/** The value of a field after the patches of `plateau` except `patch`: what the patch that replaces it applies on. `{ known: false }` when that cannot be resolved. */
function fieldBaseWithout(plateau, patch, category, reference, field) {
  const settings = AppState.workspace.settings;
  const node = AppState.plateauTree.nodes.get(plateau);
  const above = node.parent === null ? null : layerStateOf(node.parent, settings);
  if (above && above.fatal) return { known: false };
  const cache = ensureLayerCache(settings);
  const result = resolveLayerStep(above ? above.state : null, Object.assign({}, node, { patches: node.patches.filter((p) => p !== patch) }), { byPlateau: cache.byPlateau, kernel: loadedKernel, layered: !!cache.tree.layered });
  if (result.fatal) return { known: false };
  const found = graphReferencesOf(result.state.graph)[category].get(reference);
  return found ? { known: true, value: copyJson(found[field]) } : { known: false };
}

function isPlainJsonObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The patch that turns the value a field has (`base`) into the one it must have (`after`), or null when they are the same. The operator is the least that says it:
 *   - a list that gains items at its end: `ADD` (the item, or the list of items);
 *   - a relationship that is changed in place, found by (destination, label) among the relationships of `base`: `SET` with `where` and the fields that changed;
 *   - an object (tags) that keeps every key it had: `MERGE` of the keys that are new or changed;
 *   - a text or a number that is cleared (the field is not a list nor an object, and the plateau no longer has it): `REMOVE` of the field (wave 017, run 0126, #94; a `SET` has no way
 *     to say "absent"). An emptied list or object is still a `SET` of the empty one: an empty list or object is a value;
 *   - anything else, a list that loses or reorders items, an object that loses a key, a text, a number: `SET` of the whole value.
 * When `base` is not known the value is set whole.
 */
function patchFor(field, base, after) {
  const listy = Array.isArray(after) || (base.known && Array.isArray(base.value));
  const objecty = isPlainJsonObject(after) || (base.known && isPlainJsonObject(base.value));
  const empty = listy ? [] : objecty ? {} : undefined;
  const now = readIsMissing(after) ? empty : after;
  const was = base.known ? (readIsMissing(base.value) ? empty : base.value) : undefined;
  if (base.known && sameJson(was, now)) return null;
  if (now === undefined) return { operator: 'REMOVE' };
  if (Array.isArray(now)) {
    if (base.known && Array.isArray(was)) {
      if (now.length > was.length && was.every((item, i) => sameJson(item, now[i]))) {
        const extra = now.slice(was.length);
        return { operator: 'ADD', value: extra.length === 1 ? extra[0] : extra };
      }
      if (field === 'relationships' && now.length === was.length) {
        const differing = now.map((item, i) => i).filter((i) => !sameJson(was[i], now[i]));
        if (differing.length === 1) {
          const i = differing[0];
          const old = was[i];
          const next = now[i];
          if (isPlainJsonObject(old) && isPlainJsonObject(next) && typeof old.destination === 'string' && Object.keys(old).every((key) => key in next)) {
            const label = readIsMissing(old.label) ? '' : String(old.label);
            const same = was.filter((item) => isPlainJsonObject(item) && item.destination === old.destination && (readIsMissing(item.label) ? '' : String(item.label)) === label);
            if (same.length === 1) {
              const value = {};
              for (const key of Object.keys(next)) if (!sameJson(old[key], next[key])) value[key] = next[key];
              const where = { destination: old.destination };
              if (label !== '') where.label = label;
              return { operator: 'SET', where, value };
            }
          }
        }
      }
    }
    return { operator: 'SET', value: now };
  }
  if (isPlainJsonObject(now) && base.known && (was === undefined || isPlainJsonObject(was)) && Object.keys(was || {}).every((key) => key in now)) {
    const value = {};
    for (const key of Object.keys(now)) if (!was || !sameJson(was[key], now[key])) value[key] = now[key];
    return { operator: 'MERGE', value };
  }
  return { operator: 'SET', value: now };
}

/** A patch as a manifest holds it, the keys in the order the fixture writes them: operator, target, layer, field, where, value (a `REMOVE` of a field has no value). */
function newPatchObject(category, reference, field, wanted) {
  const patch = { operator: wanted.operator, target: reference };
  if (category === 'technology') patch.layer = 'technology';
  patch.field = field;
  if (wanted.where) patch.where = wanted.where;
  if (wanted.operator !== 'REMOVE') patch.value = wanted.value;
  return patch;
}

/** Puts `value` under `key` of `object` just before `beforeKey` (the keys already there keep their order). */
function insertKeyBefore(object, beforeKey, key, value) {
  const entries = Object.keys(object).map((k) => [k, object[k]]);
  for (const [k] of entries) delete object[k];
  let placed = false;
  for (const [k, v] of entries) {
    if (k === beforeKey) { object[key] = value; placed = true; }
    object[k] = v;
  }
  if (!placed) object[key] = value;
}

/** The patch `patch` of a manifest now says `wanted`: only the keys that differ are written, so the lines of the others stay as the author wrote them. */
function updatePatchInPlace(patch, wanted) {
  if (String(patch.operator).toUpperCase() !== wanted.operator) patch.operator = wanted.operator;
  if (wanted.where) {
    if (patch.where === undefined) insertKeyBefore(patch, 'value', 'where', wanted.where);
    else if (!sameJson(patch.where, wanted.where)) patch.where = wanted.where;
  } else if ('where' in patch) {
    delete patch.where;
  }
  if (wanted.operator === 'REMOVE') delete patch.value; // a `REMOVE` of a field takes no value
  else if (!sameJson(patch.value, wanted.value)) patch.value = wanted.value;
}

/** The items a patch adds, as a list (`value` is one item or a list of them). */
function patchItems(patch) {
  return Array.isArray(patch.value) ? patch.value : [patch.value];
}

/**
 * Whether the patch `last` can say `delta` (the patch an edit asks for, computed from the value the field has now) instead of a patch after it: a `SET` of the whole value says
 * the new value (`after`); an `ADD` gains the items, a `MERGE` the keys; a `SET` with `where` takes the fields when it finds the relationship `delta.where` finds once it has
 * run. Changes the patch and returns true, or leaves it and returns false.
 */
function absorbIntoPatch(last, delta, after) {
  const operator = String(last.operator).toUpperCase();
  if (delta.operator === 'REMOVE') { // the field is cleared: a whole-value `SET` becomes the `REMOVE`, one that already took it out says so; any other patch stays and the `REMOVE` follows it
    if (operator === 'SET' && !last.where) updatePatchInPlace(last, delta);
    return (operator === 'SET' && !last.where) || operator === 'REMOVE';
  }
  if (operator === 'SET' && !last.where) {
    last.value = readIsMissing(after) ? (Array.isArray(last.value) ? [] : {}) : after;
    return true;
  }
  if (operator === 'ADD' && delta.operator === 'ADD') {
    const items = patchItems(last).concat(patchItems(delta));
    last.value = items.length === 1 ? items[0] : items;
    return true;
  }
  if (operator === 'MERGE' && delta.operator === 'MERGE' && isPlainJsonObject(last.value)) {
    last.value = Object.assign({}, last.value, delta.value);
    return true;
  }
  if (operator === 'SET' && last.where && delta.operator === 'SET' && delta.where && isPlainJsonObject(last.value) && isPlainJsonObject(delta.value)) {
    const destination = 'destination' in last.value ? String(last.value.destination) : String(last.where.destination);
    const label = 'label' in last.value ? String(last.value.label) : (readIsMissing(last.where.label) ? '' : String(last.where.label));
    if (destination === delta.where.destination && label === (readIsMissing(delta.where.label) ? '' : String(delta.where.label))) {
      last.value = Object.assign({}, last.value, delta.value);
      return true;
    }
  }
  return false;
}

/** Whether a `SET` with `where` only says what the relationship it finds already says without that patch (relabeled and then relabeled back): it can go. */
function patchSaysNothingNew(plateau, patch, category, reference, field) {
  const base = fieldBaseWithout(plateau, patch, category, reference, field);
  if (!base.known || !Array.isArray(base.value) || !isPlainJsonObject(patch.value)) return false;
  const label = readIsMissing(patch.where.label) ? '' : String(patch.where.label);
  const found = base.value.filter((item) => isPlainJsonObject(item) && item.destination === patch.where.destination && (readIsMissing(item.label) ? '' : String(item.label)) === label);
  return found.length === 1 && Object.keys(patch.value).every((key) => sameJson(found[0][key], patch.value[key]));
}

/**
 * Writes the change of one field of an inherited element (or of one a patch of the plateau already sets) as a patch of the plateau, and returns the manifest written.
 *   - the plateau has no patch on (target, field): one is added at the end (`patchFor`, from the value the field has now);
 *   - it has one that sets the whole value (`SET`): that patch says the new value, or is taken out when the field is back to what it was before it;
 *   - it has one that adds or merges (`ADD`, `MERGE`, `SET` with `where`): that patch is changed when the edit is of its kind, taken out when the field is back to what it was
 *     before it, and otherwise a patch for the edit is added at the end (an `ADD` of a relationship stays when another relationship is relabeled). A patch is never put in the middle of the list: the comment above a patch of the author's would end up above the new one.
 */
function writePatchChange(plateau, category, reference, change) {
  const mf = ensurePlateauManifest(plateau);
  if (!Array.isArray(mf.content.patches)) mf.content.patches = [];
  const patches = mf.content.patches;
  const mine = plateauPatchesOn(plateau, category, reference, change.field);
  const now = { known: true, value: change.before };
  if (mine.length === 0) {
    const wanted = patchFor(change.field, now, change.after);
    if (wanted) patches.push(newPatchObject(category, reference, change.field, wanted));
  } else if (mine.length > 1) {
    // several patches on the field (a relationship added, another relabeled): none is rewritten; the last absorbs an edit of its kind, else the edit is a patch at the end
    const last = mine[mine.length - 1].patch;
    const delta = patchFor(change.field, now, change.after);
    if (delta && !absorbIntoPatch(last, delta, change.after)) patches.push(newPatchObject(category, reference, change.field, delta));
    else if (delta && last.where && patchSaysNothingNew(plateau, last, category, reference, change.field)) patches.splice(patches.indexOf(last), 1); // relabeled and relabeled back
  } else {
    const patch = mine[0].patch;
    const operator = String(patch.operator).toUpperCase();
    const base = fieldBaseWithout(plateau, patch, category, reference, change.field);
    const inPlace = patchFor(change.field, base, change.after);
    if (base.known && !inPlace) {
      patches.splice(patches.indexOf(patch), 1);
    } else if (inPlace && inPlace.operator === 'REMOVE') {
      updatePatchInPlace(patch, inPlace); // the field is gone: the patch that set it says so (or the one that took it out keeps saying it)
    } else if (operator === 'REMOVE' && inPlace) {
      updatePatchInPlace(patch, inPlace); // the plateau gives the field a value again: the patch that took it out says that value instead
    } else if (operator === 'SET' && !patch.where) {
      updatePatchInPlace(patch, { operator: 'SET', value: readIsMissing(change.after) ? (Array.isArray(change.before) ? [] : {}) : change.after });
    } else if (inPlace && inPlace.operator === operator && sameJson(inPlace.where, patch.where)) {
      updatePatchInPlace(patch, inPlace);
    } else {
      const delta = patchFor(change.field, now, change.after);
      if (delta) patches.push(newPatchObject(category, reference, change.field, delta));
    }
  }
  if (!patches.length) delete mf.content.patches;
  return mf;
}

/** The sentence for a field that cannot be written because of a patch the author wrote by hand (a free `json-path`, which the editor shows and does not edit field by field). */
function handWrittenPatchSentence(record, field, plateau) {
  const last = record.patched ? record.patched.get(field) : null;
  if (!last || last.plateau !== plateau || last.operator === 'REMOVE' || !/^json-path /.test(String(last.selector))) return null;
  return 'Not written: `' + field + '` of `' + record.reference + '` is set by patch ' + last.rank + ' of the plateau `' + plateau + '` (' + last.operator + ' ' + last.selector + '), which was written by hand with a free `json-path`: the editor shows it and does not edit it field by field. Edit the patch in Files. Nothing was changed.';
}

/**
 * What an edit of an element does in a layered plateau. The mutator is tried on a copy of the element as the plateau resolves it; the fields it changes are each written where
 * they belong (`route`): `manifest` (the element is declared in the plateau, and no patch of the plateau sets the field), else `patch` (the plateau has a patch on the field, or
 * inherits the element). Returns `{ changes: [{ field, before, after, route }], renamed }`, or throws the sentence that refuses the edit.
 */
function planLayerElementEdit(plateau, record, category, reference, mutatorFn) {
  const resolved = resolvedNodeOf(plateau, category, reference);
  if (!resolved) throw new Error('"' + reference + '" cannot be found in the plateau `' + plateau + '`; nothing was changed.');
  const trial = clonePlain(resolved);
  const outcome = mutatorFn(trial, null, null);
  const renamed = (outcome && outcome.renamedTo) || (String(trial.id) !== String(resolved.id) ? { from: reference, to: null } : null);
  if (renamed && plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau) {
    throw new Error('Not written: `' + reference + '` is declared in the plateau `' + record.declaredIn + '`, and a patch never changes an id: it is renamed where it is declared. Draw `' + record.declaredIn + '` to rename it. Nothing was changed.');
  }
  if (String(trial.kind) !== String(resolved.kind)) throw new Error('Not written: the kind of an element is not edited here. Nothing was changed.');
  const located = plateau !== BASELINE_PLATEAU && record.declaredIn === plateau ? locateContentNode(reference, category, record) : null;
  const changes = [];
  for (const field of Array.from(new Set(Object.keys(resolved).concat(Object.keys(trial)))).sort(compareUnits)) {
    if (field === 'id' || field === 'elements' || field === 'kind') continue;
    if (sameJson(resolved[field], trial[field])) continue;
    const change = { field, before: copyJson(resolved[field]), after: copyJson(trial[field]), route: 'manifest' };
    if (plateau !== BASELINE_PLATEAU) {
      const handWritten = handWrittenPatchSentence(record, field, plateau);
      if (handWritten) throw new Error(handWritten);
      const mine = plateauPatchesOn(plateau, category, reference, field);
      if (mine.length >= 1 || !located || !sameJson(located.node[field], resolved[field])) change.route = 'patch';
    }
    changes.push(change);
  }
  if (renamed && changes.some((change) => change.route === 'patch')) {
    throw new Error('Not written: `' + reference + '` is renamed and a patch of the plateau `' + plateau + '` sets a field in the same edit (' + changes.filter((change) => change.route === 'patch').map((change) => change.field).join(', ') + '): save the rename, then the change. Nothing was changed.');
  }
  return { changes, renamed };
}

/** After a write: the resolution of the plateau gives back every field that was edited (an empty list or object stands for an absent one), and the new reference of a renamed element. Throws the sentence otherwise. */
function verifyLayerElementEdit(plateau, category, reference, plan) {
  const target = plan.renamed && plan.renamed.to ? plan.renamed.to : reference;
  const node = resolvedNodeOf(plateau, category, target);
  const refused = node ? null : layerStateOf(plateau, AppState.workspace.settings);
  if (refused && refused.fatal) throw new Error('Not written: the plateau `' + plateau + '` could no longer be resolved (' + oneLine(refused.fatal[0]) + '). Nothing was changed.');
  if (!node) throw new Error('Not written: after the edit the plateau `' + plateau + '` has no element `' + target + '`. Nothing was changed.');
  for (const change of plan.changes) {
    const empty = Array.isArray(change.before) || Array.isArray(change.after) ? [] : isPlainJsonObject(change.before) || isPlainJsonObject(change.after) ? {} : undefined;
    const wanted = readIsMissing(change.after) ? empty : change.after;
    const got = readIsMissing(node[change.field]) ? empty : node[change.field];
    if (!sameJson(got, wanted)) {
      throw new Error('Not written: the resolution of the plateau `' + plateau + '` does not give back the new `' + change.field + '` of `' + target + '` (it reads ' + oneLine(JSON.stringify(got === undefined ? null : got)).slice(0, 80) + '). Nothing was changed.');
    }
  }
}

/** The edit of an element in a layered plateau (see `planLayerElementEdit`), under `guardedLayerWrite`. */
function commitLayeredElementEdit(plateau, reference, mutatorFn, layer, options) {
  const category = layerOfReference(reference, layer);
  const record = category ? AppState.index[category].get(reference) : null;
  if (!record) return commitElementEditNow(reference, mutatorFn, layer, options); // says it cannot be found
  const label = record.name || reference;
  const base = {
    plateau, confirmed: !!options.confirmed, afterConfirm: options.afterConfirm, summary: 'Edit “' + label + '” in the plateau `' + plateau + '`',
    again: () => commitElementEdit(reference, mutatorFn, layer, Object.assign({}, options, { confirmed: true }))
  };
  if (options.live) {
    // the mutator edits the file that declares the element itself (a move, a child written in the file of its parent): it must be a file of the plateau written
    if (plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau) {
      throw new Error('Not written: `' + reference + '` is declared in the plateau `' + record.declaredIn + '`, not in `' + plateau + '`, and a patch never changes where an element is. Draw `' + record.declaredIn + '` to do it. Nothing was changed.');
    }
    return guardedLayerWrite(Object.assign(base, {
      write: () => commitElementEditNow(reference, mutatorFn, layer, options),
      verify: (result) => verifyLayerElementEdit(plateau, category, reference, { changes: [], renamed: result && result.renamedTo ? result.renamedTo : null })
    }));
  }
  const plan = planLayerElementEdit(plateau, record, category, reference, mutatorFn);
  const inherited = plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau;
  if (!plan.changes.length && !plan.renamed && inherited) { // nothing to say: nothing is written, and the file of another plateau is not marked
    saveStatus = { state: 'idle' };
    rebuildIndexAndRender();
    return undefined;
  }
  const write = plan.changes.every((change) => change.route === 'manifest')
    ? () => commitElementEditNow(reference, mutatorFn, layer, options)
    : () => writeMixedElementEdit(plateau, record, category, reference, plan);
  return guardedLayerWrite(Object.assign(base, { write, verify: () => verifyLayerElementEdit(plateau, category, reference, plan) }));
}

/** An edit whose fields do not all belong in the same file: the ones of the manifest that declares the element are set on it, the others are patches of the plateau. */
function writeMixedElementEdit(plateau, record, category, reference, plan) {
  const touched = new Set();
  for (const change of plan.changes) {
    if (change.route === 'patch') {
      touched.add(writePatchChange(plateau, category, reference, change));
    } else {
      const located = locateContentNode(reference, category, record);
      if (readIsMissing(change.after)) delete located.node[change.field]; else located.node[change.field] = clonePlain(change.after);
      touched.add(located.mf);
    }
  }
  for (const mf of touched) touchManifest(mf);
  AppState.dirtyReferences.add(nodeKey(reference, category));
  saveStatus = { state: 'idle' };
  rebuildIndexAndRender();
  return undefined;
}

/** An inherited element is taken out by a `REMOVE` patch at the end of the patches of the plateau: the kernel takes what is in it and what points at it. */
function writeRemovePatch(plateau, category, reference) {
  const mf = ensurePlateauManifest(plateau);
  if (!Array.isArray(mf.content.patches)) mf.content.patches = [];
  const patch = { operator: 'REMOVE', target: reference };
  if (category === 'technology') patch.layer = 'technology';
  mf.content.patches.push(patch);
  touchManifest(mf);
  forgetUiReferences(computeDeletedReferenceSet(reference, category), category);
  pendingDeleteConfirmation = null;
  saveStatus = { state: 'idle' };
  rebuildIndexAndRender();
}

/**
 * Takes out of the patches of a plateau the ones that name an element that was deleted from its own manifests (their `target`, the relationship they find with `where`, the
 * relationships they add): left in, the plateau would no longer resolve. Returns whether the manifest of the plateau changed.
 */
function prunePatchesNaming(plateau, deletedRefs, category) {
  const mf = plateauManifestFile(plateau);
  if (!mf || !Array.isArray(mf.content.patches)) return null;
  const gone = (value) => (typeof value === 'string' || typeof value === 'number') && deletedRefs.has(String(value));
  const patchLayer = (patch) => (readIsMissing(patch.layer) ? 'application' : String(patch.layer).toLowerCase());
  const kept = [];
  let modified = false;
  // what a patch adds or sets as a list of references: the destinations of relationships, the applications a node hosts, the elements an environment uses
  const listOf = (patch) => {
    const field = String(patch.field);
    if (field === 'relationships' && patchLayer(patch) === category) return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: (item) => isPlainJsonObject(item) && gone(item.destination) };
    if (field === 'applications' && category === 'application' && patchLayer(patch) === 'technology') return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: gone };
    if (field === 'uses' && category === 'technology' && patchLayer(patch) === 'technology') return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: gone };
    return null;
  };
  for (const patch of mf.content.patches) {
    if (patch && typeof patch === 'object') {
      if (patchLayer(patch) === category && (gone(readIsMissing(patch.target) ? null : String(patch.target)) || (isPlainJsonObject(patch.where) && gone(patch.where.destination)))) { modified = true; continue; }
      const operator = String(patch.operator).toUpperCase();
      const list = !readIsMissing(patch.value) && (operator === 'ADD' || operator === 'SET') && !patch.where ? listOf(patch) : null;
      if (list) {
        const left = list.items.filter((item) => !list.named(item));
        if (left.length !== list.items.length) {
          modified = true;
          if (!left.length && operator === 'ADD') continue; // nothing is left to add
          patch.value = Array.isArray(patch.value) ? left : left[0];
        }
      }
    }
    kept.push(patch);
  }
  if (!modified) return null;
  if (kept.length) mf.content.patches = kept; else delete mf.content.patches;
  return mf;
}

