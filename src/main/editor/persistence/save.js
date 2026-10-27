// =====================================================================
// Save (TDD-0010 DEC-7/DEC-9/DEC-10/DEC-11) — the first functions in the
// whole wave that write to or remove from the real granted directory.
// Every disk-touching call (`createWritable`/`removeEntry`/
// `getFileHandle(..., {create: true})`) lives only in the small set of
// functions below (CON-1/NFR-2/TG-2) — no create/delete/commit function
// above performs disk I/O itself. `ensureWritePermission` elevates the
// granted handle from `read` (every prior grant in this file, per
// `openFolder`/`reopenFolder`/`tryAutoReopen`) to `readwrite`; it must
// only ever be reached from `saveAllChanges`, itself only ever called
// from the save button's own click handler (a user gesture — ASM-2).
// =====================================================================

/**
 * Elevate the granted folder handle's permission from `read` to
 * `readwrite` (TDD-0010 DEC-7, resolves FR-13). `requestPermission` must
 * only be called from inside a user-gesture handler's own synchronous
 * call chain (ASM-2) — the save button's click handler calls
 * `saveAllChanges()` directly, and this is the first `await` reached by
 * it, so the gesture is still active (mirrors CON-3/DEC-4's existing
 * discipline for `reopenFolder`'s `read`-mode request).
 */
async function ensureWritePermission() {
  if (!AppState.folder || !AppState.folder.handle) return false;
  try {
    let permission = await AppState.folder.handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      permission = await AppState.folder.handle.requestPermission({ mode: 'readwrite' });
    }
    return permission === 'granted';
  } catch (e) {
    console.error('ArchiCode: ensureWritePermission failed', e);
    return false;
  }
}

/**
 * Stat a manifest file (relative to the granted folder) for its current
 * on-disk `lastModified`, without reading its content — the cheap
 * staleness-check primitive FR-16/DEC-9/Q-1 needs. Returns `null` if the
 * file does not exist (e.g. removed externally since this session loaded
 * or last saved it).
 */
async function statManifestFile(relPath) {
  const segments = String(relPath).split('/').filter(Boolean);
  const name = segments.pop();
  try {
    const dir = await getDirectoryHandleByRelativePath(AppState.folder.handle, segments.join('/'));
    const fileHandle = await dir.getFileHandle(name);
    const file = await fileHandle.getFile();
    return file.lastModified;
  } catch (e) {
    if (e && e.name === 'NotFoundError') return null;
    throw e;
  }
}

/**
 * Write a manifest file's current `rawText` to disk (TDD-0010 DEC-9).
 * `getFileHandle(name, {create: !mf.existedOnDisk})` creates the file
 * only for a brand-new one (DEC-5) — an existing file is never created
 * out from under a missing-parent-directory assumption. `createWritable()`
 * truncates-then-writes with no separate truncate call needed (ASM-3).
 * The directory of a brand-new file is created when it is missing (a
 * workspace without its `manifests/` yet); `text` is what is written (the
 * caller keeps it, to tell later whether an edit came in meanwhile).
 */
async function writeManifestFile(mf, text) {
  const segments = String(mf.relPath).split('/').filter(Boolean);
  const name = segments.pop();
  const dir = await getDirectoryHandleByRelativePath(AppState.folder.handle, segments.join('/'), {
    create: !mf.existedOnDisk
  });
  const fileHandle = await dir.getFileHandle(name, { create: !mf.existedOnDisk });
  const writable = await fileHandle.createWritable();
  await writable.write(withByteOrderMark(mf.bom, text === undefined ? mf.rawText : text));
  await writable.close();
}

/** Remove a manifest file from disk (TDD-0010 DEC-9, resolves FR-14's removal half) via `removeEntry`. */
async function removeManifestFile(relPath) {
  const segments = String(relPath).split('/').filter(Boolean);
  const name = segments.pop();
  let dir;
  try {
    dir = await getDirectoryHandleByRelativePath(AppState.folder.handle, segments.join('/'));
    await dir.removeEntry(name);
  } catch (e) {
    if (!(e && e.name === 'NotFoundError')) throw e; // already gone from the disk: that is what was asked
  }
}

/** `statManifestFile`'s own counterpart for `.archicode.yaml`, which lives at the folder root rather than under a manifests subpath (TDD-0010 DEC-9). */
async function statWorkspaceYaml() {
  try {
    const fileHandle = await AppState.folder.handle.getFileHandle('.archicode.yaml');
    const file = await fileHandle.getFile();
    return file.lastModified;
  } catch (e) {
    if (e && e.name === 'NotFoundError') return null;
    throw e;
  }
}

/**
 * The kebab-case inverse of `parseSettings` (TDD-0010 DEC-10, resolves
 * FR-18's `TC-3` extension): every top-level settings field round-trips
 * to the same kebab-case key `.custom`'s real files already use, and
 * every `facets.customs[].actions[]` entry's `jsonPath` maps back to
 * `json-path` — the one *nested* alias `parseSettings` applies below the
 * top level. Every key is
 * always emitted (including any `parseSettings` only ever defaulted
 * because the real file never set it) — a stated, not silent, consequence
 * (TDD-0010 DEC-10). Given the settings as parsed at load time
 * (`rawSettings`), whatever the editor does not manage (other sections, other
 * keys of a section) is kept, after the managed keys of its section.
 */
const SETTINGS_MANAGED_KEYS = {
  manifests: ['paths'],
  relationships: ['default-synthetic-label'],
  views: ['path', 'labels', 'properties'],
  facets: ['global-enabled', 'directory-name-template', 'customs']
};

// The keys of `settings` that are a single value, not a section: written when they hold something, and removed from the
// file when they no longer do (a cleared name must not stay in the file as an unmanaged key).
const SETTINGS_MANAGED_SCALARS = ['name'];

function serializeSettingsToRaw(settings, rawSettings) {
  const managed = serializeManagedSettings(settings);
  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) return managed;
  const out = {};
  // a name the file did not have yet comes first; one it had keeps its place
  for (const key of SETTINGS_MANAGED_SCALARS) {
    if (Object.prototype.hasOwnProperty.call(managed, key) && !Object.prototype.hasOwnProperty.call(rawSettings, key))
      out[key] = managed[key];
  }
  for (const key of Object.keys(rawSettings)) {
    if (SETTINGS_MANAGED_SCALARS.indexOf(key) !== -1) {
      if (Object.prototype.hasOwnProperty.call(managed, key)) out[key] = managed[key];
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(managed, key)) {
      setYamlKey(out, key, rawSettings[key]);
      continue;
    }
    const section = rawSettings[key];
    const merged = Object.assign({}, managed[key]);
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      for (const sub of Object.keys(section)) {
        if (SETTINGS_MANAGED_KEYS[key].indexOf(sub) === -1) setYamlKey(merged, sub, section[sub]);
      }
    }
    out[key] = merged;
  }
  for (const key of Object.keys(managed)) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) out[key] = managed[key];
  }
  return out;
}

function serializeManagedSettings(settings) {
  const name = typeof settings.name === 'string' ? settings.name.trim() : '';
  return Object.assign(name === '' ? {} : { name }, {
    manifests: { paths: settings.manifests.paths },
    relationships: { 'default-synthetic-label': settings.relationships.defaultSyntheticLabel },
    views: { path: settings.views.path, labels: settings.views.labels, properties: settings.views.properties },
    facets: {
      'global-enabled': settings.facets.globalEnabled,
      'directory-name-template': settings.facets.directoryNameTemplate,
      customs: settings.facets.customs.map((c) => {
        const facet = Object.assign({}, c, {
          actions: (c.actions || []).map((action) => {
            const rest = Object.assign({}, action);
            const jsonPath = rest.jsonPath;
            delete rest.jsonPath;
            rest['json-path'] = jsonPath;
            return rest;
          })
        });
        delete facet.hideUnlinked;
        if (c.hideUnlinked) facet['hide-unlinked'] = true; // written only when it is on: the default is off
        return facet;
      })
    }
  });
}

/**
 * Whether the settings the editor manages say what the file says (wave 015, run 0102): a save of .archicode.yaml for another reason (a story kept in it, a `settings.current`
 * taken out by the delete of a plateau) then writes the settings as they are in the file, and not every default the editor knows of.
 */
function managedSettingsAsRead(settings, rawSettings) {
  if (!isPlainObject(rawSettings)) return false;
  return (
    canonicalJson(serializeManagedSettings(settings)) ===
    canonicalJson(serializeManagedSettings(parseSettings(rawSettings)))
  );
}

/**
 * Write `.archicode.yaml` (TDD-0010 DEC-9/DEC-10): `styles`/`formatters`
 * carried through verbatim from `AppState.workspace` (no editing surface
 * in this wave ever touches them), `settings` serialized via
 * `serializeSettingsToRaw`, the whole raw object serialized via `W-3`'s
 * existing `serializeYamlValue` (reused as-is — no second serializer).
 */
async function writeWorkspaceYaml() {
  const ws = AppState.workspace;
  const top = ws.topLevel && typeof ws.topLevel === 'object' ? ws.topLevel : {};
  const managed = {
    styles: ws.styles,
    formatters: ws.formatters,
    settings: managedSettingsAsRead(ws.settings, top.settings)
      ? top.settings
      : serializeSettingsToRaw(ws.settings, top.settings)
  };
  // The top-level keys of the file as they were (and in their order); only the three managed ones are replaced.
  // `styles` and `formatters` are added when the file had none only if they are no longer empty.
  const raw = {};
  for (const key of Object.keys(top))
    setYamlKey(raw, key, Object.prototype.hasOwnProperty.call(managed, key) ? managed[key] : top[key]);
  for (const key of Object.keys(managed)) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) continue;
    if (key === 'settings' || isYamlComplexValue(managed[key])) raw[key] = managed[key];
  }
  const text =
    typeof ws.rawText === 'string' && ws.rawText !== ''
      ? patchYamlText(ws.rawText, raw, true)
      : serializeYamlValue(raw, 0);
  const fileHandle = await AppState.folder.handle.getFileHandle('.archicode.yaml');
  const writable = await fileHandle.createWritable();
  await writable.write(withByteOrderMark(ws.bom, text));
  await writable.close();
  ws.rawText = text;
}

/**
 * `AppState.removedFileBaselines`'s own lookup helper (TDD-0010 DEC-9) —
 * a removed file's own `lastKnownDiskModified` is otherwise unreachable
 * for the stale-check once its `mf` object has left
 * `AppState.manifestFiles` (`commitDeleteElement` populates this map at
 * the moment it pushes to `pendingFileRemovals`).
 */
function removedFileBaseline(relPath) {
  return AppState.removedFileBaselines.has(relPath) ? AppState.removedFileBaselines.get(relPath) : null;
}

/** True when at least one change this session has not yet been saved (TDD-0010 DEC-11, resolves AC-14's visibility rule). */
function hasUnsavedChanges() {
  return countUnsavedChanges() > 0;
}

/** How many things "Save all changes" would write: modified files, pending file removals, and .archicode.yaml if its settings changed. */
function countUnsavedChanges() {
  return (
    AppState.manifestFiles.filter((f) => f.dirty).length +
    AppState.pendingFileRemovals.length +
    (AppState.workspace && AppState.workspace.settingsDirty ? 1 : 0)
  );
}

/**
 * Drop every `dirtyReferences` entry whose element currently lives in
 * `relPath` (UX review follow-up) — called once a file's write actually
 * succeeds, mirroring that file's own `f.dirty = false` reset so a save
 * that fails partway through still only clears what really saved.
 */
function clearDirtyReferencesForFile(relPath) {
  for (const category of ['application', 'technology']) {
    for (const record of AppState.index[category].values()) {
      if (record.sourceFile === relPath) AppState.dirtyReferences.delete(nodeKey(record.reference, category));
    }
  }
}

/**
 * The full save pipeline (TDD-0010 DEC-9, resolves FR-13 through FR-17 and
 * `Q-1`): acquire `readwrite` permission first (DEC-7); if denied, stop
 * writing nothing. Otherwise stale-check *every* dirty file, pending
 * removal, and (if settings changed) `.archicode.yaml` — all before any
 * write starts (FR-16/NFR-3) — and refuse the whole attempt, writing
 * nothing at all, if any target has changed on disk since it was loaded
 * or last saved. Only once every target is confirmed fresh does the write
 * phase begin: dirty files, then pending removals, then `.archicode.yaml`
 * if its settings changed, each step able to stop-and-report its own
 * failure (FR-17) without rolling back whatever already succeeded.
 */
async function saveAllChanges() {
  if (saveInFlight) return; // a second click (or key) while a save is running: the first one finishes alone
  saveInFlight = true;
  requestRedraw(); // the Save button is disabled while saving (still inside the user gesture: ensureWritePermission needs it)
  try {
    await performSave();
  } catch (e) {
    console.error('ArchiCode: saving failed', e);
    saveStatus = { state: 'error', failedFile: 'the folder', message: e && e.message ? e.message : String(e) };
  } finally {
    saveInFlight = false;
    requestRedraw();
  }
}

/** True while `saveAllChanges` runs: the Save button is disabled and a second save is ignored. */
let saveInFlight = false;

async function performSave() {
  if (!(await ensureWritePermission())) {
    saveStatus = { state: 'denied', message: 'Write permission was not granted; nothing was saved.' };
    requestRedraw();
    return;
  }

  const workspace = AppState.workspace;
  const dirtyFiles = AppState.manifestFiles.filter((f) => f.dirty);
  const removals = AppState.pendingFileRemovals.slice();
  const settingsDirty = workspace.settingsDirty;
  if (dirtyFiles.length === 0 && removals.length === 0 && !settingsDirty) {
    saveStatus = { state: 'success', message: 'Nothing to save.' };
    requestRedraw();
    return;
  }

  // FR-16/Q-1: stale-check every target this attempt would touch, before
  // any write starts (NFR-3 — never a partial write for a refused save).
  // A failure of the check itself (a restarted server, a revoked token,
  // a vanished folder) is reported like any save error — nothing is written.
  const conflicts = [];
  const unknownOnDisk = []; // new files whose path is taken on disk by a file this editor did not know
  let checking = 'the folder';
  try {
    for (const f of dirtyFiles) {
      checking = f.relPath;
      const current = await statManifestFile(f.relPath);
      if (!f.existedOnDisk) {
        if (current !== null) unknownOnDisk.push(f.relPath); // writing would overwrite it
        continue;
      }
      if (current === null || current !== f.lastKnownDiskModified) conflicts.push(f.relPath);
    }
    for (const relPath of removals) {
      checking = relPath;
      const current = await statManifestFile(relPath);
      const baseline = removedFileBaseline(relPath);
      if (current !== null && current !== baseline) conflicts.push(relPath);
    }
    if (settingsDirty) {
      checking = '.archicode.yaml';
      const current = await statWorkspaceYaml();
      if (current !== workspace.settingsLastKnownDiskModified) conflicts.push('.archicode.yaml');
    }
  } catch (e) {
    saveStatus = {
      state: 'error',
      failedFile: checking,
      message:
        'could not check it on disk before saving (' +
        (e && e.message ? e.message : String(e)) +
        '). Nothing was saved.'
    };
    requestRedraw();
    return;
  }
  if (unknownOnDisk.length > 0) {
    saveStatus = {
      state: 'error',
      failedFile: unknownOnDisk.join(', '),
      message:
        'a file already exists at ' +
        (unknownOnDisk.length === 1 ? 'this path' : 'these paths') +
        ' on disk, but this editor did not know it (it was added since the folder was opened). ' +
        'Saving would overwrite it, so nothing was saved. Reopen the folder to load it, then create the element again.'
    };
    requestRedraw();
    return;
  }
  if (conflicts.length > 0) {
    saveStatus = { state: 'conflict', conflicts };
    requestRedraw();
    return;
  }

  // Write phase (FR-14/FR-17/FR-19): stop at the first failure, name it,
  // leave everything already written in this attempt as written.
  for (const f of dirtyFiles) {
    try {
      const writtenText = f.rawText; // what goes to the disk: an edit made during the awaits below is not in it
      await writeManifestFile(f, writtenText);
      const modified = await statManifestFile(f.relPath); // FR-19 — this file's own new baseline
      // the file the model holds now (an edit can have replaced the object, or deleted the element meanwhile)
      const live = AppState.manifestFiles.find((x) => x.relPath === f.relPath);
      if (live) {
        live.existedOnDisk = true;
        live.lastKnownDiskModified = modified;
        live.savedRawText = writtenText;
        if (live.rawText === writtenText) {
          // only what was written is clean: a later edit stays to be saved
          live.dirty = false;
          clearDirtyReferencesForFile(f.relPath); // UX review follow-up
        }
      } else if (!AppState.pendingFileRemovals.includes(f.relPath)) {
        AppState.pendingFileRemovals.push(f.relPath); // deleted while it was being created: take it off the disk too
        AppState.removedFileBaselines.set(f.relPath, modified);
      }
    } catch (e) {
      saveStatus = { state: 'error', failedFile: f.relPath, message: e && e.message ? e.message : String(e) };
      requestRedraw();
      return;
    }
  }
  for (const relPath of removals) {
    try {
      // a file of the model now stands at this path (a new element took it): it was just written, never remove it
      if (!AppState.manifestFiles.some((x) => x.relPath === relPath)) await removeManifestFile(relPath);
      AppState.pendingFileRemovals = AppState.pendingFileRemovals.filter((p) => p !== relPath);
      AppState.removedFileBaselines.delete(relPath);
    } catch (e) {
      saveStatus = { state: 'error', failedFile: relPath, message: e && e.message ? e.message : String(e) };
      requestRedraw();
      return;
    }
  }
  if (settingsDirty) {
    try {
      const revision = workspace.settingsRevision || 0;
      await writeWorkspaceYaml();
      if ((workspace.settingsRevision || 0) === revision) workspace.settingsDirty = false; // a settings edit made meanwhile stays to be saved
      await noteWorkspaceName(); // a name changed in Settings shows in the list of folders without reopening (never throws)
      workspace.settingsLastKnownDiskModified = await statWorkspaceYaml(); // FR-19
    } catch (e) {
      saveStatus = { state: 'error', failedFile: '.archicode.yaml', message: e && e.message ? e.message : String(e) };
      requestRedraw();
      return;
    }
  }

  saveStatus = {
    state: 'success',
    message: hasUnsavedChanges() ? 'Saved. Changes made while saving are not saved yet.' : 'Saved.'
  };
  requestRedraw();
}

/**
 * The text of the file-edit view's editor as it is on screen right now —
 * the live CodeMirror doc, else the fallback textarea — or null when no
 * file is being edited.
 */
function currentFileEditorText() {
  if (activeFileEditorView) return activeFileEditorView.state.doc.toString();
  const textarea = document.getElementById('file-edit-textarea');
  return textarea ? textarea.value : null;
}

/**
 * True when reloading `relPath` from disk would throw something away: the
 * file was edited in memory (`mf.dirty`, from any surface), a rejected
 * draft is pending, or text was typed in its editor but not applied yet.
 */
function fileHasUnsavedChanges(relPath) {
  const mf = AppState.manifestFiles.find((f) => f.relPath === relPath);
  if (!mf) return false;
  if (mf.dirty) return true;
  if (rawYamlEditDraft && rawYamlEditDraft.relPath === relPath) return true;
  const editorText = currentFileEditorText();
  return editorText !== null && editorText !== mf.rawText;
}

/**
 * Reload one manifest file from disk, discarding every unsaved change to
 * it (form edits and raw-YAML edits alike): re-read and re-parse it, swap
 * its entry in, forget its elements' "modified" markers, and rebuild the
 * index. Other files are deliberately untouched — a delete or rename may
 * have changed relationships in them too, and those stay modified (the
 * confirmation in the click handler says so). A file that does not exist
 * on disk yet has nothing to reload and is left alone; a read failure
 * keeps the in-memory state and reports through `saveStatus`.
 */
async function reloadManifestFile(relPath) {
  const mf = AppState.manifestFiles.find((f) => f.relPath === relPath);
  if (!mf || !mf.existedOnDisk) return;

  let rawText;
  let bom;
  let lastModified;
  try {
    const segments = String(relPath).split('/').filter(Boolean);
    const name = segments.pop();
    const dir = await getDirectoryHandleByRelativePath(AppState.folder.handle, segments.join('/'));
    const file = await (await dir.getFileHandle(name)).getFile();
    lastModified = file.lastModified;
    ({ text: rawText, bom } = await readTextAndMark(file));
  } catch (e) {
    saveStatus = { state: 'reload-error', failedFile: relPath, message: e && e.message ? e.message : String(e) };
    requestRedraw();
    return;
  }

  const { header, content, error } = parseManifestText(rawText);
  clearDirtyReferencesForFile(relPath); // before the index is rebuilt: it still knows this file's current elements
  AppState.manifestFiles = AppState.manifestFiles.map((f) =>
    f.relPath === relPath
      ? {
          relPath,
          rawText,
          header,
          content,
          error,
          dirty: false,
          existedOnDisk: true,
          lastKnownDiskModified: lastModified,
          bom,
          savedRawText: rawText
        }
      : f
  );
  if (rawYamlEditDraft && rawYamlEditDraft.relPath === relPath) rawYamlEditDraft = null;
  saveStatus = { state: 'idle' };
  rebuildIndexAndRender();

  // The reloaded file may no longer contain the selected element.
  dropLinkSelection();
  const sel = AppState.selection;
  if (sel.kind === 'element' && !findElementRecord(sel.key)) {
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
    requestRedraw();
  }
}

/**
 * Commit a raw-YAML edit (TDD-0009 DEC-6): scratch-validate, never
 * mutate-then-rollback. Parses `newText` the same way `loadWorkspace`
 * parses a manifest file at load time; if that succeeds, re-derives the
 * index against a *scratch* copy of `AppState.manifestFiles` (reusing
 * `buildIndex` as-is, including its own header.kind/content.id and
 * ARCHICODE_KIND_MAP checks) before ever touching live state. Only a
 * fully-valid edit is swapped into `AppState.manifestFiles`; an invalid
 * edit leaves `AppState` completely untouched and records the rejected
 * draft (with its error) in `rawYamlEditDraft` for `renderFileViewHtml`
 * to show (NFR-3 — "never corrupt the model").
 */
function commitFileEdit(relPath, newText) {
  // Step 1: parse — loadWorkspace's own per-file inline logic, copied
  // verbatim (DEC-6 step 1).
  const { header, content, error: parseError } = parseManifestText(newText);
  let error = parseError;

  // Step 3 (only reached if step 1 didn't already set `error`): scratch
  // copy + buildIndex, reusing its own header.kind/content.id and
  // ARCHICODE_KIND_MAP checks to complete the validation for free.
  let scratchFiles = null;
  if (!error) {
    scratchFiles = AppState.manifestFiles.map(
      (f) => (f.relPath === relPath ? { ...f, rawText: newText, header, content, error: null, dirty: true } : f) // TDD-0010 DEC-8
    );
    buildIndex(scratchFiles, AppState.workspace.settings);
    const scratchMf = scratchFiles.find((f) => f.relPath === relPath);
    error = scratchMf ? scratchMf.error : null;
  }

  // Step 4: invalid — do not touch AppState.manifestFiles/AppState.index
  // at all; record the draft (with its error) and re-render.
  if (error) {
    rawYamlEditDraft = { relPath, text: newText, error };
    requestRedraw();
    return;
  }

  // Step 5: valid — swap the scratch array in (the one file's entry
  // replaced, every other entry the same object reference), clear the
  // draft, and rebuild+render via the single shared pipeline.
  AppState.manifestFiles = scratchFiles;
  rawYamlEditDraft = null;
  saveStatus = { state: 'idle' }; // TDD-0010 DEC-11 — a new edit discards any prior save attempt's status
  rebuildIndexAndRender();
}

/** `value` with the reference prefix `oldRef` (the reference itself, or a descendant of it, on a '.' boundary) replaced by `newRef`; `value` itself when it does not point there. */
function rewriteReferenceValue(value, oldRef, newRef) {
  if (typeof value !== 'string') return value;
  if (value === oldRef) return newRef;
  if (value.indexOf(oldRef + '.') === 0) return newRef + value.slice(oldRef.length);
  return value;
}

/**
 * The UI state that holds element references, rewritten for a rename (no render): the selection, the expanded sets,
 * the "modified" markers, the row of the tree that has the focus, and the state of the Map (pinned, hidden, opened) —
 * left alone, a stale pin on the map would silently disappear, or re-attach to a later element with the same
 * reference. `layer` limits what is layer-bound (the selection; the Map of each layer).
 */
function rewriteUiReferences(oldPrefix, newPrefix, layer) {
  const rewrite = (value) => rewriteReferenceValue(value, oldPrefix, newPrefix);
  const rewriteSet = (set) => new Set(Array.from(set).map(rewrite));
  dropLinkSelection(); // the rest only knows the kinds that name a reference
  const sel = AppState.selection;
  if (sel.kind === 'element' && sel.key && (!layer || layerOfReference(sel.key, sel.layer) === layer)) {
    sel.key = rewrite(sel.key);
  } else if (sel.kind === 'create' && sel.parentReference && (!layer || layer === sel.category)) {
    sel.parentReference = rewrite(sel.parentReference);
  }
  // the keys of the rows (`layer:reference`) follow a rename in the layer it happened in only: the other layer's element with the same reference stays
  const rewriteKey = (key) =>
    layer && nodeKeyLayer(key) !== layer ? key : nodeKeyLayer(key) + ':' + rewrite(nodeKeyReference(key));
  const rewriteKeys = (set) => new Set(Array.from(set).map(rewriteKey));
  AppState.expanded = rewriteKeys(AppState.expanded);
  // UX review follow-up: dirtyReferences holds the *old* reference (added by commitElementEdit before a
  // rename-aware rewrite runs) — carry it over to the new one.
  AppState.dirtyReferences = rewriteKeys(AppState.dirtyReferences);
  if (navActiveKey) navActiveKey = rewriteKey(navActiveKey);
  for (const mapped of ['application', 'technology']) {
    if (layer && layer !== mapped) continue;
    const state = mapStateOf(mapped);
    state.pinned = state.pinned.map(rewrite);
    state.hidden = state.hidden.map(rewrite);
    if (state.opened) state.opened = rewriteSet(state.opened);
  }
  // a delete confirmation lists what the old reference would take with it: it is stale now
  pendingDeleteConfirmation = null;
}

/** The UI state that held `deletedRefs` (a set of references of `layer`) forgets them: selection, expanded, modified markers, focus row, Map. */
function forgetUiReferences(deletedRefs, layer) {
  const gone = (value) => typeof value === 'string' && deletedRefs.has(value);
  dropLinkSelection();
  const sel = AppState.selection;
  if (sel.kind === 'element' && gone(sel.key) && layerOfReference(sel.key, sel.layer) === layer) {
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
  } else if (sel.kind === 'create' && gone(sel.parentReference) && sel.category === layer) {
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
  }
  for (const ref of deletedRefs) {
    AppState.expanded.delete(nodeKey(ref, layer));
    AppState.dirtyReferences.delete(nodeKey(ref, layer));
  }
  if (navActiveKey && nodeKeyLayer(navActiveKey) === layer && gone(nodeKeyReference(navActiveKey))) navActiveKey = null;
  const state = mapStateOf(layer);
  state.pinned = state.pinned.filter((ref) => !gone(ref));
  state.hidden = state.hidden.filter((ref) => !gone(ref));
  if (state.opened) for (const ref of Array.from(state.opened)) if (gone(ref)) state.opened.delete(ref);
}

/**
 * Rewrite every reference TO a renamed element in the manifests (the model; the element's own id was changed by the
 * caller): relationship `destination`s anywhere, in the layer of the element; the `applications` entries of
 * technology nodes when an application element was renamed; the `uses` entries of environments when a technology
 * element was renamed; and the `header.parent` of the manifests attached to
 * the old reference or below it. A reference below `oldRef` follows (`a.b` → `c.b`), on the '.' boundary only
 * (`a2` is not below `a`). Every file that changed is regenerated and marked dirty, and so are its owners'
 * "modified" markers. Returns the relPaths of the files changed.
 */
function rewriteInboundReferences(oldRef, newRef, layer) {
  const changedFiles = [];
  rewriteSavedViewReferences(oldRef, newRef, layer); // the views of .archicode.yaml that point at it follow
  const layered = writingPlateau() !== null;
  for (const mf of AppState.manifestFiles) {
    if (!writeScopeHas(mf)) continue;
    if (layered && !mf.error && mf.header && manifestKindName(mf.header.kind) === 'plateau') {
      // wave 014 (run 0082): the patches of a plateau name elements too
      if (rewritePatchReferences(mf, oldRef, newRef, layer)) {
        mf.rawText = reserializeManifestFile(mf);
        mf.dirty = true;
        changedFiles.push(mf.relPath);
      }
      continue;
    }
    const mfLayer = manifestLayer(mf);
    if (mfLayer === null) continue;
    let changed = false;
    if (mfLayer === layer && typeof mf.header.parent === 'string') {
      const parent = rewriteReferenceValue(mf.header.parent, oldRef, newRef);
      if (parent !== mf.header.parent) {
        mf.header.parent = parent;
        changed = true;
        AppState.dirtyReferences.add(nodeKey(manifestRootReference(mf), mfLayer));
      }
    }
    walkContentNodes(mf, (node, ownerRef) => {
      if (mfLayer === layer && Array.isArray(node.relationships)) {
        for (const rel of node.relationships) {
          if (!rel || typeof rel !== 'object') continue;
          const destination = rewriteReferenceValue(rel.destination, oldRef, newRef);
          if (destination !== rel.destination) {
            rel.destination = destination;
            changed = true;
            AppState.dirtyReferences.add(nodeKey(ownerRef, mfLayer));
          }
        }
      }
      // `replaces` names elements of the plateau below: they follow the rename, in a layered workspace. The element that was renamed or moved, and what it holds, in the plateau that
      // is written, is the exception: what it replaces is a reference of the plateau below, and that reference is not the one that moved
      const movedItself =
        layered &&
        plateauOfManifest(mf) === writingPlateau() &&
        (ownerRef === newRef || String(ownerRef).startsWith(newRef + '.'));
      if (layered && mfLayer === layer && Array.isArray(node.replaces) && !movedItself) {
        const replaces = node.replaces.map((entry) => rewriteReferenceValue(entry, oldRef, newRef));
        if (replaces.some((entry, i) => entry !== node.replaces[i])) {
          node.replaces = replaces;
          changed = true;
          AppState.dirtyReferences.add(nodeKey(ownerRef, mfLayer));
        }
      }
      if (layer === 'technology' && mfLayer === 'technology' && Array.isArray(node.uses)) {
        const uses = node.uses.map((u) => rewriteReferenceValue(u, oldRef, newRef));
        if (uses.some((u, i) => u !== node.uses[i])) {
          node.uses = uses;
          changed = true;
          AppState.dirtyReferences.add(nodeKey(ownerRef, mfLayer));
        }
      }
      if (layer === 'application' && mfLayer === 'technology' && Array.isArray(node.applications)) {
        const applications = node.applications.map((a) => rewriteReferenceValue(a, oldRef, newRef));
        if (applications.some((a, i) => a !== node.applications[i])) {
          node.applications = applications;
          changed = true;
          AppState.dirtyReferences.add(nodeKey(ownerRef, mfLayer));
        }
      }
    });
    if (changed) {
      mf.rawText = reserializeManifestFile(mf);
      mf.dirty = true;
      changedFiles.push(mf.relPath);
    }
  }
  return changedFiles;
}

/**
 * The patches of a plateau follow a rename (wave 014, run 0082): the `target` of a patch, the relationship it finds with `where` or adds, and the references an `applications` or
 * `uses` patch lists. A `json-path` is written by hand and is not rewritten (the plateau is refused if it no longer selects what it did). True when something changed.
 */
function rewritePatchReferences(mf, oldRef, newRef, layer) {
  if (!mf || mf.error || !mf.header || !mf.content || !Array.isArray(mf.content.patches)) return false;
  let changed = false;
  const follow = (holder, key) => {
    if (typeof holder[key] !== 'string') return;
    const next = rewriteReferenceValue(holder[key], oldRef, newRef);
    if (next !== holder[key]) {
      holder[key] = next;
      changed = true;
    }
  };
  for (const patch of mf.content.patches) {
    if (!patch || typeof patch !== 'object') continue;
    const patchLayer = readIsMissing(patch.layer) ? 'application' : String(patch.layer).toLowerCase();
    const field = readIsMissing(patch.field) ? '' : String(patch.field);
    if (patchLayer === layer) {
      if (readIsMissing(patch['json-path']) && readIsMissing(patch.json_path)) follow(patch, 'target');
      if (patch.where && typeof patch.where === 'object') follow(patch.where, 'destination');
      if (field === 'relationships') {
        for (const item of Array.isArray(patch.value) ? patch.value : [patch.value])
          if (item && typeof item === 'object') follow(item, 'destination');
      }
    }
    // a node lists the application elements it deploys, an environment the environments and nodes it uses
    if (
      (field === 'applications' && layer === 'application' && patchLayer === 'technology') ||
      (field === 'uses' && layer === 'technology' && patchLayer === 'technology')
    ) {
      if (Array.isArray(patch.value)) {
        const next = patch.value.map((entry) => rewriteReferenceValue(entry, oldRef, newRef));
        if (next.some((entry, i) => entry !== patch.value[i])) {
          patch.value = next;
          changed = true;
        }
      } else {
        follow(patch, 'value');
      }
    }
  }
  return changed;
}
