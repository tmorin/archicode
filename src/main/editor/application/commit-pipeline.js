// =====================================================================
// Commit-and-rebuild pipeline (TDD-0009 DEC-5) — the single reconciliation
// mechanism every editing surface (element form, settings form, raw-YAML
// editor) funnels through: mutate the one canonical source (a content
// node via commitElementEdit, or AppState.workspace.settings via
// commitSettingsEdit), then fully re-derive index/tree/relationships from
// the live AppState.manifestFiles/settings and re-render — never a
// bespoke per-field patch (TG-1/TC-3). A later task's UI click handlers
// call these; this task only adds the plumbing.
// =====================================================================

/**
 * Re-run buildIndex + resolveRelationships over the live
 * AppState.manifestFiles/AppState.workspace.settings (exactly mirroring
 * loadWorkspace's own pipeline) and re-render (DEC-5). Called at the tail
 * of every commit path below.
 */
function rebuildIndexAndRender() {
  const { index, rootsByCategory, duplicates, plateauTree } = buildIndex(AppState.manifestFiles, AppState.workspace.settings);
  AppState.index = index;
  AppState.duplicateReferences = duplicates;
  AppState.plateauTree = plateauTree;
  AppState.workspace.application.elements = rootsByCategory.application;
  AppState.workspace.technology.elements = rootsByCategory.technology;
  AppState.relationshipStats = resolveRelationships(index);
  modelsChanged(); // every edit of the plateau drawn ends here (see `modelVersion`)
  syncLayers(); // wave 014 (run 0080): the plateau on the band is resolved again from the manifests as they are now (nothing for a workspace with no layers)
  render();
}

/**
 * Commit an element-level edit (DEC-5): locate the live content node for
 * `reference` (DEC-4), apply `mutatorFn` to it (and, when relevant, to
 * its containing array/index), regenerate that node's manifest file's
 * `rawText` from the now-mutated `content` (DEC-7), then rebuild+render.
 *
 * `mutatorFn(node, parentArray, indexInParent)` may return a value — e.g.
 * `{ renamedTo: { from, to } }` for an id-rename (DEC-8) — which is passed
 * through as this function's own return value for a later task to act on.
 * A caller must run DEC-9 validation *before* calling this function: a
 * rejected action never reaches here, so no validation happens inside.
 */
function commitElementEdit(reference, mutatorFn, layer, options) {
  const given = options || {};
  if (!given.allowReadOnly) requireWritablePlateau(); // wave 014 (run 0080): see `readOnlyPlateauMessage`
  // wave 014 (run 0082): in a layered workspace the edit goes where the plateau drawn keeps it (a field of the manifest, or a patch), under `guardedLayerWrite`.
  // `options.live`: the mutator edits the manifest that declares the element itself (a move, a child written in its parent's file). `options.confirmed`: the author said yes to the plateaus it changes.
  const plateau = given.allowReadOnly ? null : writingPlateau();
  if (plateau !== null) return commitLayeredElementEdit(plateau, reference, mutatorFn, layer, given);
  return commitElementEditNow(reference, mutatorFn, layer, options);
}

/** `commitElementEdit` in the manifest that declares the element: the edit of a workspace that is not layered, of baseline, and of an element a plateau declares. */
function commitElementEditNow(reference, mutatorFn, layer, options) {
  const located = locateContentNode(reference, layer, options && options.record);
  if (!located) {
    throw new Error('"' + reference + '" cannot be found in the loaded manifests (it may have been removed or renamed); nothing was changed.');
  }
  const { mf, node, parentArray, indexInParent } = located;
  const elementLayer = options && options.record ? (layer || 'application') : layerOfReference(reference, layer);
  const result = mutatorFn(node, parentArray, indexInParent);
  let dirtyReference = reference;
  if (result && result.renamedTo) {
    // the id changed: everything that pointed at the old reference follows it, in the model and in the UI state
    const { from, to } = result.renamedTo;
    rewriteUiReferences(from, to, elementLayer);
    rewriteInboundReferences(from, to, elementLayer);
    dirtyReference = to;
  }
  mf.rawText = reserializeManifestFile(mf);
  mf.dirty = true; // TDD-0010 DEC-8 — every structural edit marks its file dirty for the next save
  AppState.dirtyReferences.add(nodeKey(dirtyReference, elementLayer)); // UX review follow-up — element-level "modified" tracking
  saveStatus = { state: 'idle' }; // TDD-0010 DEC-11 — a new edit discards any prior save attempt's status
  rebuildIndexAndRender();
  return result;
}

/**
 * Commit a settings edit (DEC-5): mutate `AppState.workspace.settings` in
 * place via `mutatorFn`, then rebuild+render. Like `commitElementEdit`,
 * a caller must run DEC-9 validation before calling this function.
 */
function commitSettingsEdit(mutatorFn) {
  mutatorFn(AppState.workspace.settings);
  AppState.workspace.settingsDirty = true; // TDD-0010 DEC-8
  AppState.workspace.settingsRevision = (AppState.workspace.settingsRevision || 0) + 1; // lets a save in flight tell it wrote the older settings
  saveStatus = { state: 'idle' }; // TDD-0010 DEC-11 — a new edit discards any prior save attempt's status
  rebuildIndexAndRender();
}

// =====================================================================
// Create (TDD-0010 DEC-1/DEC-2/DEC-3/DEC-5) — new element entry points,
// shared create form, and the one new commit function the top-level
// path needs (a same-file child reuses commitElementEdit as-is, above).
// =====================================================================

/** PRD FR-4's fixed per-category top-level kind list (the full header.kind flavors, not the nested-child vocabulary childKindOptionsForLevel returns). */
const TOP_LEVEL_KIND_OPTIONS = {
  application: ['person', 'system', 'solution', 'container', 'component'],
  technology: ['environment', 'node']
};

/** PRD FR-6(b)'s fixed per-category list of kinds the real domain model allows as a genuinely unparented root (attach-under left blank). */
const TOP_LEVEL_BLANK_ATTACH_ALLOWED = {
  application: ['solution', 'system', 'person'],
  technology: ['environment']
};

/**
 * The id of a new element (or the new id of a renamed one): letters, digits, `_` and `-`, not starting with `-`.
 * An id is a segment of references (`a.b.c`) and part of the name of the manifest file (`app.a.b.yaml`), so a '.',
 * a '/' or a '\' would change what the reference means or where the file lands. Returns `{ valid, id | error }`.
 */
function validateElementId(rawId) {
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (id === '') return { valid: false, error: 'Id is required.' };
  if (/\s/.test(id)) return { valid: false, error: 'An id cannot contain spaces.' };
  if (/[./\\]/.test(id)) return { valid: false, error: 'An id cannot contain "." (it separates the levels of a reference), "/" or "\\".' };
  if (/^[-.]/.test(id)) return { valid: false, error: 'An id cannot start with "-" or ".".' };
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return { valid: false, error: 'An id may only contain letters, digits, "_" and "-".' };
  return { valid: true, id };
}

/**
 * A relPath for a new manifest file that nothing in the workspace uses: `<dir>/<prefix><reference>.yaml`, else
 * `…-2.yaml`, `…-3.yaml`. Taken means: a file the editor knows (compared case-insensitively, as a case-insensitive
 * disk would), or a file queued for removal under another spelling. The very path of a file queued for removal is
 * free: the new file replaces it (see `adoptRemovedFile`), the removal is dropped.
 */
function allocateManifestRelPath(dir, prefix, reference) {
  const taken = new Set(AppState.manifestFiles.map((f) => f.relPath.toLowerCase()));
  const base = (dir ? dir + '/' : '') + prefix + reference;
  for (let n = 1; ; n++) {
    const candidate = base + (n === 1 ? '' : '-' + n) + '.yaml';
    if (taken.has(candidate.toLowerCase())) continue;
    const queued = AppState.pendingFileRemovals.filter((p) => p.toLowerCase() === candidate.toLowerCase());
    if (queued.length > 0 && !queued.includes(candidate)) continue;
    return candidate;
  }
}

/**
 * A new file takes the path of a file queued for removal: the removal is dropped and the new file stands for the one
 * that was on disk (so the save rewrites it, with the stale-check of the removed file's baseline), instead of the
 * save deleting what it has just written.
 */
function adoptRemovedFile(mf) {
  if (!AppState.pendingFileRemovals.includes(mf.relPath)) return;
  AppState.pendingFileRemovals = AppState.pendingFileRemovals.filter((p) => p !== mf.relPath);
  mf.existedOnDisk = true;
  mf.lastKnownDiskModified = removedFileBaseline(mf.relPath);
  AppState.removedFileBaselines.delete(mf.relPath);
}

/**
 * Commit a brand-new top-level manifest file (TDD-0010 DEC-5 — the
 * Stage-5-corrected version, with the manifests-directory prefix). A
 * caller must run FR-6/FR-7's validation before calling this function —
 * a rejected submission never reaches it (same discipline W-3's DEC-9
 * already established for every other commit path).
 */
function commitCreateTopLevelElement(spec, options) {
  requireWritablePlateau();
  const plateau = writingPlateau();
  if (plateau === null) return commitCreateTopLevelElementNow(spec, null);
  // wave 014 (run 0082): in a layered workspace the new manifest says `plateau: <the plateau drawn>` in its header, under `guardedLayerWrite`
  return guardedLayerWrite({
    plateau, confirmed: !!(options && options.confirmed), afterConfirm: options && options.afterConfirm, summary: 'Add “' + spec.id + '” to the plateau `' + plateau + '`',
    again: () => commitCreateTopLevelElement(spec, Object.assign({}, options, { confirmed: true })),
    write: () => commitCreateTopLevelElementNow(spec, plateau),
    verify: (created) => {
      if (!AppState.index[spec.category].has(created.createdReference)) throw new Error('Not written: the plateau `' + plateau + '` does not read back the new element `' + created.createdReference + '`. Nothing was changed.');
    }
  });
}

/** `commitCreateTopLevelElement`, writing the manifest with `plateau: <plateau>` in its header when `plateau` is a plateau other than baseline. */
function commitCreateTopLevelElementNow({ category, headerKind, attachUnderReference, id, name, description }, plateau) {
  const idCheck = validateElementId(id);
  if (!idCheck.valid) throw new Error(idCheck.error);
  const reference = attachUnderReference ? (attachUnderReference + '.' + id) : id;
  if (AppState.index[category] && AppState.index[category].has(reference)) {
    throw new Error('Another element already uses reference "' + reference + '".');
  }
  const header = { kind: ARCHICODE_KIND_PREFIX + headerKind, version: '1' };
  if (plateau !== null && plateau !== BASELINE_PLATEAU) header.plateau = plateau;
  if (attachUnderReference) header.parent = attachUnderReference;
  const content = { id };
  if (name) content.name = name;
  if (description) content.description = description;
  const manifestsDir = plateau !== null ? plateauFolderFor(plateau, category) : firstManifestsDir();
  const relPath = allocateManifestRelPath(manifestsDir === undefined ? 'manifests' : manifestsDir, category === 'application' ? 'app.' : 'env.', reference);
  const mf = {
    relPath, header, content, error: null,
    rawText: serializeManifestFile(header, content), // W-3's serializer, reused as-is
    dirty: true, existedOnDisk: false, lastKnownDiskModified: null
  };
  adoptRemovedFile(mf);
  AppState.manifestFiles.push(mf);
  AppState.manifestFiles.sort((a, b) => compareCodePoints(a.relPath, b.relPath)); // matches loadWorkspace's own ordering
  AppState.dirtyReferences.add(nodeKey(reference, category)); // UX review follow-up — element-level "modified" tracking
  saveStatus = { state: 'idle' }; // TDD-0010 DEC-11 — a new edit discards any prior save attempt's status
  rebuildIndexAndRender();
  return { createdReference: reference, relPath };
}

/**
 * Commit a new element nested in `parentReference`'s own manifest (the same-file path of TDD-0010 DEC-5, which
 * reuses `commitElementEdit`). `layer` tells the parent apart when both layers have that reference. Returns
 * `{ ok: true, createdReference }` or `{ ok: false, field: 'kind' | 'id', error }` when the submission is rejected,
 * leaving the model untouched.
 */
function commitCreateChildElement({ parentReference, layer, kind, id, name, description, confirmed }) {
  const category = layerOfReference(parentReference, layer);
  const parentRecord = category ? AppState.index[category].get(parentReference) : null;
  if (!parentRecord) return { ok: false, field: 'kind', error: 'The parent "' + parentReference + '" does not exist.' };
  if (childKindOptionsFor(parentRecord).indexOf(kind) === -1) return { ok: false, field: 'kind', error: 'Invalid kind for this parent.' };
  const idCheck = validateElementId(id);
  if (!idCheck.valid) return { ok: false, field: 'id', error: idCheck.error };
  const createdReference = parentReference + '.' + idCheck.id;
  if (AppState.index[category].has(createdReference)) {
    return { ok: false, field: 'id', error: 'Another element already uses reference "' + createdReference + '".' };
  }
  const plateau = writingPlateau();
  const afterConfirm = () => { AppState.selection = { kind: 'element', key: createdReference, layer: category, mode: 'edit' }; render(); }; // after the author said yes, as after the click
  // wave 014 (run 0082): a child of an element another plateau declares is a manifest of the plateau drawn, with `header.parent`; it cannot be written in the file of its parent
  const inheritedParent = plateau !== null && plateau !== BASELINE_PLATEAU && parentRecord.declaredIn !== plateau;
  try {
    let written;
    if (inheritedParent) {
      const headerKind = kind;
      written = commitCreateTopLevelElement({ category, headerKind, attachUnderReference: parentReference, id: idCheck.id, name, description }, { confirmed, afterConfirm });
    } else {
      written = commitElementEdit(parentReference, (node) => {
        node.elements = Array.isArray(node.elements) ? node.elements.slice() : [];
        const child = { kind, id: idCheck.id };
        if (name) child.name = name;
        if (description) child.description = description;
        node.elements.push(child);
        // UX review follow-up: the new child is wholly unsaved on its own, independent of the parent's own dirty state
        AppState.dirtyReferences.add(nodeKey(createdReference, category));
      }, category, { live: true, confirmed, afterConfirm });
    }
    if (written && written.pending) return { ok: true, pending: true, layer: category };
  } catch (e) {
    return { ok: false, field: 'kind', error: e && e.message ? e.message : String(e) };
  }
  AppState.dirtyReferences.add(nodeKey(createdReference, category));
  return { ok: true, createdReference, layer: category };
}

// =====================================================================
// Delete (TDD-0010 DEC-4/DEC-6) — the whole-model impact scan, its
// transient confirm/cancel overlay (pendingDeleteConfirmation, declared
// above alongside rawYamlEditDraft), and the one new commit function the
// removal needs — a removal can touch more than one manifest file in one
// commit, which no existing mutator does today.
// =====================================================================

/**
 * The deleted element's own reference plus every reference in the same
 * category's current index that is a former descendant of it (including
 * a cross-file-attached one) — TDD-0010 DEC-4.
 */
function computeDeletedReferenceSet(reference, category) {
  const set = new Set([reference]);
  for (const ref of AppState.index[category].keys()) {
    if (ref === reference || ref.indexOf(reference + '.') === 0) set.add(ref);
  }
  return set;
}

/**
 * Every relationship elsewhere in `category`'s index whose `destination`
 * names a reference in `deletedRefs` (TDD-0010 DEC-4). "Elsewhere"
 * excludes the deleted subtree itself — a relationship owned by an
 * element being deleted anyway is not itself a dangling reference left
 * behind.
 */
function scanDanglingRelationshipsFor(deletedRefs, category) {
  const affected = [];
  for (const record of AppState.index[category].values()) {
    if (deletedRefs.has(record.reference)) continue; // DEC-4: "elsewhere" excludes the deleted subtree itself
    for (const rel of record.relationships) {
      if (deletedRefs.has(rel.destination)) {
        affected.push({ ownerReference: record.reference, ownerSourceFile: record.sourceFile, label: rel.label, destination: rel.destination });
      }
    }
  }
  // a technology node deploys application elements by reference: deleting one takes it off the nodes that list it
  if (category === 'application') {
    for (const record of AppState.index.technology.values()) {
      for (const application of record.applications) {
        if (deletedRefs.has(String(application))) {
          affected.push({ ownerReference: record.reference, ownerSourceFile: record.sourceFile, label: 'deploys application', destination: String(application) });
        }
      }
    }
  }
  // an environment lists the environments and nodes it uses by reference: deleting one takes it off the lists
  if (category === 'technology') {
    for (const record of AppState.index.technology.values()) {
      if (deletedRefs.has(record.reference)) continue;
      for (const used of record.uses || []) {
        if (deletedRefs.has(String(used))) {
          affected.push({ ownerReference: record.reference, ownerSourceFile: record.sourceFile, label: 'uses', destination: String(used) });
        }
      }
    }
  }
  return affected;
}

/** The layer a manifest file belongs to (from its header.kind), or null when it is unreadable or of an unknown kind. */
function manifestLayer(mf) {
  if (!mf || mf.error || !mf.header || !mf.header.kind || !mf.content) return null;
  const mapping = ARCHICODE_KIND_MAP[stripArchicodeKindPrefix(mf.header.kind)];
  return mapping ? mapping.category : null;
}

/** The reference of the root element of a manifest file (its header.parent, when it has one, then its id). */
function manifestRootReference(mf) {
  return mf.header && mf.header.parent ? (mf.header.parent + '.' + mf.content.id) : String(mf.content.id);
}

/** Call `fn(node, reference)` for the root element of a manifest file and every element nested in it, whatever the depth. */
function walkContentNodes(mf, fn) {
  if (!mf || !mf.content || typeof mf.content !== 'object') return;
  const walk = (node, reference) => {
    fn(node, reference);
    for (const child of (Array.isArray(node.elements) ? node.elements : [])) {
      if (child && typeof child === 'object' && child.id !== undefined && child.id !== null) walk(child, reference + '.' + String(child.id));
    }
  };
  walk(mf.content, manifestRootReference(mf));
}

/**
 * The manifest files a delete takes away: the element's own file when it is the root of one, and the file of every
 * manifest attached below the deleted set through `header.parent` (their root reference is `<parent>.<id>`, so it is
 * in `deletedRefs`). Leaving them would keep orphans that still declare the deleted element as their parent.
 */
function computeDeletedManifestFiles(deletedRefs, category) {
  return AppState.manifestFiles
    .filter((mf) => manifestLayer(mf) === category && deletedRefs.has(manifestRootReference(mf)) && writeScopeHas(mf))
    .map((mf) => mf.relPath);
}

/** What deleting `reference` does, for the confirmation and for the commit: the references that go, the files that go, the links elsewhere that go with them. */
function computeDeleteImpact(reference, category) {
  const deletedRefs = computeDeletedReferenceSet(reference, category);
  return {
    deletedRefs,
    deletedReferences: Array.from(deletedRefs).filter((ref) => AppState.index[category].has(ref)).sort(),
    affected: scanDanglingRelationshipsFor(deletedRefs, category),
    files: computeDeletedManifestFiles(deletedRefs, category)
  };
}

/**
 * Commit a delete (TDD-0010 DEC-6, resolves FR-10): remove the element
 * (splice from its parent's `content.elements` if nested, or remove its
 * whole manifest file's entry if it was a manifest root) and every
 * relationship `affected` named, together, in one commit. A caller (the
 * `confirm-delete-element` handler) must have already run DEC-4's scan —
 * `affected` is trusted as-is here, never re-scanned.
 *
 * Every "elsewhere" relationship is pruned by re-deriving the removal
 * condition directly against each owner's *live* raw node (via
 * `locateContentNode`) — never by index/array-position identity against
 * the disposable `ElementRecord` copies DEC-4's scan read from, since
 * those are rebuilt fresh on every `buildIndex` call (the same reasoning
 * TDD-0009's DEC-4/`locateContentNode` already established).
 */
function commitDeleteElement(reference, category, affected, options) {
  requireWritablePlateau();
  const plateau = writingPlateau();
  if (plateau === null) return commitDeleteElementNow(reference, category, affected, null);
  // wave 014 (run 0082): an element the plateau declares is deleted from its manifests; one it inherits is taken out by a `REMOVE` patch (the kernel takes what is in it
  // and what points at it). Either way under `guardedLayerWrite`.
  category = layerOfReference(reference, category);
  const record = category ? AppState.index[category].get(reference) : null;
  if (!record) throw new Error('"' + reference + '" cannot be found in the loaded manifests; nothing was deleted.');
  const inherited = plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau;
  return guardedLayerWrite({
    plateau, confirmed: !!(options && options.confirmed), summary: 'Delete “' + (record.name || reference) + '” in the plateau `' + plateau + '`',
    again: () => commitDeleteElement(reference, category, affected, Object.assign({}, options, { confirmed: true })),
    write: () => (inherited ? writeRemovePatch(plateau, category, reference) : commitDeleteElementNow(reference, category, affected, plateau)),
    verify: () => {
      if (AppState.index[category].has(reference)) throw new Error('Not written: the plateau `' + plateau + '` still has `' + reference + '` after the delete. Nothing was changed.');
    }
  });
}

/** `commitDeleteElement` in the manifests: the delete of a workspace that is not layered, of baseline, and of an element the plateau drawn declares (the patches of that plateau that name it go too). */
function commitDeleteElementNow(reference, category, affected, plateau) {
  category = layerOfReference(reference, category);
  const located = category ? locateContentNode(reference, category) : null;
  if (!located) {
    throw new Error('"' + reference + '" cannot be found in the loaded manifests; nothing was deleted.');
  }
  const touchedRelPaths = new Set(); // relPath strings, not mf object references (see below)

  // The whole subtree goes: the element, what is nested in it, and every manifest attached below it through
  // header.parent (their files are removed too). `affected` (the scan the confirmation showed) is not trusted: the
  // links to prune are re-derived from the live nodes, against exactly the references that are deleted.
  const deletedRefs = computeDeletedReferenceSet(reference, category);
  const removedFiles = new Set(computeDeletedManifestFiles(deletedRefs, category));
  for (const mf of AppState.manifestFiles) {
    if (removedFiles.has(mf.relPath)) continue; // gone with the subtree: nothing to prune in it
    if (!writeScopeHas(mf)) continue; // a plateau beside the one drawn may declare the same reference: it is another element
    const mfLayer = manifestLayer(mf);
    if (mfLayer === null) continue;
    walkContentNodes(mf, (node, ownerRef) => {
      if (mfLayer === category && Array.isArray(node.relationships)) {
        const kept = node.relationships.filter((r) => !(r && r.destination !== undefined && r.destination !== null && deletedRefs.has(String(r.destination))));
        if (kept.length !== node.relationships.length) {
          node.relationships = kept;
          touchedRelPaths.add(mf.relPath);
          AppState.dirtyReferences.add(nodeKey(ownerRef, mfLayer)); // UX review follow-up — this owner's own relationships changed
        }
      }
      // an environment no longer uses an environment or a node that is deleted
      if (category === 'technology' && mfLayer === 'technology' && Array.isArray(node.uses)) {
        const kept = node.uses.filter((u) => !deletedRefs.has(String(u)));
        if (kept.length !== node.uses.length) {
          if (kept.length > 0) node.uses = kept; else delete node.uses;
          touchedRelPaths.add(mf.relPath);
          AppState.dirtyReferences.add(nodeKey(ownerRef, mfLayer));
        }
      }
      // a technology node no longer deploys an application element that is deleted
      if (category === 'application' && mfLayer === 'technology' && Array.isArray(node.applications)) {
        const kept = node.applications.filter((a) => !deletedRefs.has(String(a)));
        if (kept.length !== node.applications.length) {
          node.applications = kept;
          touchedRelPaths.add(mf.relPath);
          AppState.dirtyReferences.add(nodeKey(ownerRef, mfLayer));
        }
      }
    });
  }

  // Remove the element itself: splice from its parent array (nested), then take away the manifest files of the subtree.
  if (located.parentArray !== null) {
    located.parentArray.splice(located.indexInParent, 1);
    touchedRelPaths.add(located.mf.relPath);
  }
  for (const mf of AppState.manifestFiles) {
    if (!removedFiles.has(mf.relPath)) continue;
    if (mf.existedOnDisk && !AppState.pendingFileRemovals.includes(mf.relPath)) {
      AppState.pendingFileRemovals.push(mf.relPath);
      AppState.removedFileBaselines.set(mf.relPath, mf.lastKnownDiskModified); // DEC-9's stale-check needs this baseline
    }
    touchedRelPaths.delete(mf.relPath); // that file no longer exists; nothing to regenerate for it
    if (rawYamlEditDraft && rawYamlEditDraft.relPath === mf.relPath) rawYamlEditDraft = null;
    if (AppState.selection.kind === 'file' && AppState.selection.key === mf.relPath) {
      AppState.selection = { kind: 'none', key: null, mode: 'view' };
    }
  }
  AppState.manifestFiles = AppState.manifestFiles.filter((f) => !removedFiles.has(f.relPath));
  if (plateau !== null && plateau !== BASELINE_PLATEAU) { // a patch of the plateau that names a deleted element would no longer resolve
    const pruned = prunePatchesNaming(plateau, deletedRefs, category);
    if (pruned) touchedRelPaths.add(pruned.relPath);
  }

  // The deleted elements no longer exist — drop what the UI kept about them (a stale pin on the map would silently
  // come back on a later element with the same reference).
  forgetUiReferences(deletedRefs, category);

  // Regenerate raw YAML exactly once per still-existing touched file.
  // touchedRelPaths is deliberately a plain Set of relPath strings, not
  // of `mf` object references — AppState.manifestFiles is reassigned by
  // `.filter()` above, which would silently invalidate a stale `mf`
  // reference held from before that reassignment.
  for (const mf of AppState.manifestFiles) {
    if (touchedRelPaths.has(mf.relPath)) {
      mf.rawText = reserializeManifestFile(mf);
      mf.dirty = true;
    }
  }

  // (forgetUiReferences above already sent the selection back to the workspace-wide default view when it was the
  // deleted element, or one of its former descendants.)
  pendingDeleteConfirmation = null;
  saveStatus = { state: 'idle' }; // TDD-0010 DEC-11 — a new edit discards any prior save attempt's status
  rebuildIndexAndRender();
}

