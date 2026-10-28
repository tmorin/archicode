// ---- Writing in a layer (wave 014, run 0082, W-8) ----
//
// A write goes to the plateau drawn ("writing in: <plateau>" on the page Plateaus), in the file of that plateau and nowhere else:
//   - a new element is a manifest whose header says `plateau: <the plateau>` (none for baseline, the default); a new view or story belongs to no plateau and says none (run 0100);
//   - a field of an element the plateau declares is edited in the manifest that declares it, as before;
//   - a field of an element the plateau inherits is a patch of the plateau (`SET`, `ADD` or `MERGE`, see `patchFor`), found again by (target, field) so that a second
//     edit of the same field changes that patch and does not add another;
//   - an element the plateau inherits is removed by a `REMOVE` patch (the cascade is the kernel's);
//   - a plateau is created, renamed, given a horizon or another parent in its manifest of kind `archicode.morin.io/plateau`.
// Every one of these runs under `guardedLayerWrite`: the plateaus are resolved again, and the write is kept only if the plateau written gives back the value that was edited,
// no plateau that resolved before is refused now, and, when other plateaus inherit what was written, the author said yes (a plateau with descendants asks first and lists them).
// A workspace that is not layered (`writingPlateau()` is null) does not go through any of it and saves exactly as before.

/** The plateau a write goes to: the plateau drawn, when the workspace is layered and its plateaus are drawn. Null otherwise (the old rules apply and nothing here runs). */
function writingPlateau() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !tree || !tree.layered || layers.blocked || !tree.nodes.has(layers.current)) return null;
  return layers.current;
}

/** Why nothing is written while this plateau is drawn, or null: the kernel refused its patches, so there is no graph to edit. */
function readOnlyPlateauMessage() {
  const plateau = writingPlateau();
  if (plateau === null || !AppState.layerUndrawable) return null;
  return (
    'The plateau `' + plateau + '` cannot be drawn, so nothing is written in it: repair its patches in Files first.'
  );
}

/** Why a click that writes an element is not done, or null: the plateau cannot be drawn. A view and a story belong to no plateau, so nothing here concerns them. */
function layerActionRefusal() {
  return readOnlyPlateauMessage();
}

/** Throws the sentence of `readOnlyPlateauMessage` when the plateau drawn cannot be written. Every writer of an element starts with it. */
function requireWritablePlateau() {
  const message = readOnlyPlateauMessage();
  if (message) throw new Error(message);
}

/**
 * Whether a write in the plateau drawn may rewrite this file: it belongs to the plateau drawn or to one that stands on it (a rename, a delete, a move reach what points
 * at the element, and only those files can). A plateau beside it may declare an element with the same reference, which is another element. True for a workspace that is
 * not layered and for baseline (every plateau stands on it).
 */
function writeScopeHas(mf) {
  const plateau = writingPlateau();
  if (plateau === null || plateau === BASELINE_PLATEAU) return true;
  if (!mf || !mf.header) return false;
  const owner =
    manifestKindName(mf.header.kind) === 'plateau' && mf.content ? String(mf.content.id) : plateauOfManifest(mf);
  return owner === plateau || layerIsBelow(owner, plateau);
}

/** A sentence on one line (the kernel's and the tree's sentences may be told with a line break). */
function oneLine(text) {
  return String(text)
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

/** The same JSON whatever the order of the keys of an object: what two values must share to be called equal. */
function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key]))
        .join(',') +
      '}'
    );
  return JSON.stringify(value === undefined ? null : value);
}

function sameJson(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}

function copyJson(value) {
  return value === undefined ? undefined : clonePlain(value);
}

/** The state a write may change, kept so that a write that is refused puts everything back (the manifests as they were, the lists of files, the marks of what is modified). */
function snapshotWriteState() {
  const workspace = AppState.workspace;
  return {
    files: AppState.manifestFiles.map((mf) => ({
      mf,
      props: Object.assign({}, mf, { header: copyJson(mf.header), content: copyJson(mf.content) })
    })),
    pendingFileRemovals: AppState.pendingFileRemovals.slice(),
    removedFileBaselines: new Map(AppState.removedFileBaselines),
    dirtyReferences: new Set(AppState.dirtyReferences),
    expanded: new Set(AppState.expanded),
    selection: Object.assign({}, AppState.selection),
    topLevel: workspace ? copyJson(workspace.topLevel) : undefined,
    settingsCurrent: workspace ? workspace.settings.current : undefined, // the delete of a plateau takes out a `settings.current` that names it (run 0102)
    layers: AppState.layers ? { current: AppState.layers.current, compare: copyJson(AppState.layers.compare) } : null, // and draws another plateau when it was the one drawn
    settingsDirty: workspace ? workspace.settingsDirty : undefined,
    settingsRevision: workspace ? workspace.settingsRevision : undefined,
    saveStatus,
    pendingDeleteConfirmation,
    rawYamlEditDraft,
    mapPinned: mapPinned.slice(),
    mapHidden: mapHidden.slice(),
    mapLinks: mapLinks.map((link) => Object.assign({}, link)),
    mapHighlight: mapHighlight.map((link) => Object.assign({}, link)),
    mapOpened: mapOpened ? new Set(mapOpened) : mapOpened,
    technologyMapState: {
      pinned: technologyMapState.pinned.slice(),
      hidden: technologyMapState.hidden.slice(),
      opened: technologyMapState.opened ? new Set(technologyMapState.opened) : technologyMapState.opened
    },
    navActiveKey
  };
}

function restoreWriteState(snapshot) {
  const files = [];
  for (const { mf, props } of snapshot.files) {
    for (const key of Object.keys(mf)) if (!(key in props)) delete mf[key];
    Object.assign(mf, props);
    files.push(mf);
  }
  AppState.manifestFiles = files;
  AppState.pendingFileRemovals = snapshot.pendingFileRemovals;
  AppState.removedFileBaselines = snapshot.removedFileBaselines;
  AppState.dirtyReferences = snapshot.dirtyReferences;
  AppState.expanded = snapshot.expanded;
  AppState.selection = snapshot.selection;
  const workspace = AppState.workspace;
  if (workspace) {
    workspace.topLevel = snapshot.topLevel;
    workspace.settings.current = snapshot.settingsCurrent;
    workspace.settingsDirty = snapshot.settingsDirty;
    workspace.settingsRevision = snapshot.settingsRevision;
  }
  saveStatus = snapshot.saveStatus;
  pendingDeleteConfirmation = snapshot.pendingDeleteConfirmation;
  rawYamlEditDraft = snapshot.rawYamlEditDraft;
  mapPinned = snapshot.mapPinned;
  mapHidden = snapshot.mapHidden;
  mapLinks = snapshot.mapLinks;
  mapHighlight = snapshot.mapHighlight;
  mapOpened = snapshot.mapOpened;
  technologyMapState = snapshot.technologyMapState;
  navActiveKey = snapshot.navActiveKey;
  if (snapshot.layers && AppState.layers) {
    AppState.layers.current = snapshot.layers.current;
    AppState.layers.compare = snapshot.layers.compare;
  }
}

/**
 * What a write is judged on: for every plateau of the tree, whether it resolves (`fatal`: the kernel refused a patch), what its resolved graph is (as a text, to tell
 * whether a write changed it) and the sentences the command line refuses it with; and the mistakes of the tree itself.
 */
function layerDigest() {
  const tree = AppState.plateauTree;
  const settings = AppState.workspace.settings;
  const digest = {
    // what a view or a story names is looked at too (run 0100): a delete that leaves a view naming an element that no plateau has now is refused, as it was when the view belonged to a plateau
    sentences: tree.problems.map(String).concat(
      (tree.redeclared || []).map(String),
      elementDuplicates().map(
        (d) => 'the reference `' + d.reference + '` is declared twice (' + d.sources.join(', ') + ')'
      ),
      entryProblemsOf(settings)
    ),
    byPlateau: new Map()
  };
  if (tree.problems.length || layersBlockedReason()) return digest;
  for (const id of tree.ids) {
    const result = layerStateOf(id, settings);
    if (result.fatal)
      digest.byPlateau.set(id, {
        fatal: oneLine(result.fatal[0]),
        graph: null,
        sentences: result.earlier ? result.earlier.sentences : []
      });
    else
      digest.byPlateau.set(id, {
        fatal: null,
        graph: JSON.stringify(result.state.graph),
        sentences: result.state.problems ? result.state.problems.sentences : []
      });
  }
  return digest;
}

/**
 * A sentence of a check as two states of the workspace are compared on it: the list of the plateaus some sentences end with is left out, and a step that names no plateau
 * is the same mistake whether the workspace has other plateaus or none. A step that was wrong before a plateau is created or deleted is not a new mistake (run 0102).
 */
function comparableSentence(sentence) {
  const text = String(sentence);
  const step = text.match(
    /^(the story .* step \d+ says `(?:at|against): [^`]*`)(?:, which is not a plateau of this workspace| but the workspace declares no plateau)/
  );
  if (step) return step[1] + ': not a plateau';
  return text.replace(/ \(the plateaus are [^)]*\)$/, '');
}

/** `{ broken, changed }`: the first sentence of what a write broke (a plateau that resolved no longer does, or the command line refuses it for a new reason), and the plateaus other than `written` whose graph it changed. */
function judgeLayerWrite(before, after, written) {
  const fresh = (now, then) => {
    const known = then.map(comparableSentence);
    return now.find((sentence) => !known.includes(comparableSentence(sentence))) || null;
  };
  const mistake = fresh(after.sentences, before.sentences);
  if (mistake) return { broken: oneLine(mistake), changed: [] };
  const changed = [];
  for (const [id, now] of after.byPlateau) {
    const then = before.byPlateau.get(id);
    if (now.fatal && (!then || !then.fatal))
      return { broken: 'the plateau `' + id + '` could no longer be resolved (' + now.fatal + ')', changed: [] };
    const sentence = fresh(now.sentences, then ? then.sentences : []);
    if (sentence) return { broken: oneLine(sentence), changed: [] };
    if (then && id !== written && now.graph !== then.graph) changed.push(id);
  }
  return { broken: null, changed };
}

/**
 * Runs `spec.write()` (which edits the manifests and ends in `rebuildIndexAndRender`) under the rules of writing in a layer, and keeps it only if all of them hold:
 *   - `spec.verify(result)`, if given, throws when the resolution does not give back what was edited;
 *   - no plateau that resolved before is refused now, and no new mistake appears in the tree or in a plateau;
 *   - the plateaus other than `spec.plateau` whose graph changed are told to the author, who has to say yes (`spec.confirmed`); until then nothing is kept.
 * A write that is not kept puts everything back (`snapshotWriteState`) and the page is drawn again. A refusal is an `Error` with one sentence. Pending confirmation:
 * the dialog of `spec.again` is opened and `{ pending: true, changed }` (the plateaus it changes) is returned. `spec`: { plateau, write, verify, confirmed, confirmedFor, again,
 * summary } (`confirmedFor`: the plateaus the author already said yes to, in a dialog of the write itself; a change of any other one is still asked).
 */
function guardedLayerWrite(spec) {
  if (!AppState.layers || !AppState.workspace || !AppState.plateauTree) return spec.write();
  if (AppState.plateauTree.layered && !loadedKernel) {
    throw new Error(
      'The viewpoint kernel is not loaded yet, so the plateaus cannot be resolved and checked: nothing was written. Try again in a moment.'
    );
  }
  const before = layerDigest();
  const snapshot = snapshotWriteState();
  const typedForm = keepElementForm(); // the write is tried, then put back with a redraw when the dialog is to be asked: the form as typed is kept before it (run 0121, #123)
  let result;
  let verdict;
  try {
    result = spec.write();
    if (spec.verify) spec.verify(result);
    verdict = judgeLayerWrite(before, layerDigest(), spec.plateau);
  } catch (e) {
    restoreWriteState(snapshot);
    rebuildIndexAndRender();
    throw e;
  }
  // `spec.confirmedFor`: the plateaus whose change the author has already been shown and said yes to (the dialog of the delete of a plateau lists what each plateau above loses)
  const confirmed =
    spec.confirmed ||
    (Array.isArray(spec.confirmedFor) && verdict.changed.every((changed) => spec.confirmedFor.includes(changed)));
  if (verdict.broken || (verdict.changed.length && !confirmed)) {
    restoreWriteState(snapshot);
    rebuildIndexAndRender();
    if (verdict.broken) throw new Error('Not written: ' + verdict.broken.replace(/\.$/, '') + '. Nothing was changed.');
    openAppDialog({
      kind: 'layer-confirm',
      plateau: spec.plateau,
      summary: spec.summary,
      changed: verdict.changed.slice(),
      onConfirm: spec.again,
      afterConfirm: spec.afterConfirm,
      typedForm
    });
    return { pending: true, changed: verdict.changed.slice() };
  }
  return result;
}

/** What the dialog "this also changes ..." does when the author says yes: the write again, confirmed. A refusal is told in the top bar, as any write's. */
function confirmLayerWrite(dialog) {
  // the form behind the dialog holds what was typed (`render()` put it back): kept before the write, so that a write the yes then fails on gives it back, as `writeElementDraft` does (wave 019, run 0138, #137)
  const typedForm = keepElementForm();
  try {
    const result = dialog.onConfirm();
    if (dialog.afterConfirm) dialog.afterConfirm(result); // what the click that asked would have done next (select what was created, unfold what was moved)
  } catch (e) {
    saveStatus = { state: 'error', failedFile: dialog.plateau, message: e && e.message ? e.message : String(e) };
    keptElementForm = typedForm; // `render()` puts it back and drops it (no dialog is open): view state, no `modelsChanged()`
    requestRedraw();
  }
}
