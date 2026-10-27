// ---- Plateaus: created, named, given a horizon and a parent ----

const PLATEAU_CONTENT_ORDER = ['id', 'name', 'horizon', 'override', 'patches'];

/** Sets `key` of the content of a plateau manifest (or takes it out when `value` is empty), placing a new key where the order `id, name, horizon, override, patches` puts it. */
function setPlateauContentKey(content, key, value) {
  const empty = readIsMissing(value) || String(value).trim() === '';
  if (empty) {
    delete content[key];
    return;
  }
  if (key in content) {
    if (String(content[key]) !== String(value)) content[key] = value;
    return;
  }
  const later = PLATEAU_CONTENT_ORDER.slice(PLATEAU_CONTENT_ORDER.indexOf(key) + 1).find((other) => other in content);
  if (later) insertKeyBefore(content, later, key, value);
  else content[key] = value;
}

/** The sentence that refuses an id for a new plateau, or null. */
function plateauIdProblem(id) {
  if (id === '') return 'A plateau needs an id.';
  if (!LAYER_PLATEAU_ID_PATTERN.test(id))
    return 'The id of a plateau uses lowercase letters, digits, `_` and `-` (no dot, no space).';
  if (AppState.plateauTree.nodes.has(id) || AppState.plateauTree.ids.includes(id))
    return 'The plateau `' + id + '` exists already.';
  return null;
}

/**
 * Creates a plateau that overrides `spec.parent` (baseline by default): a manifest of kind `archicode.morin.io/plateau` with its id, name, horizon and `override`
 * (not written when the parent is baseline, which is what an absent `override` means). Under `guardedLayerWrite`. Returns `{ relPath }` or `{ pending: true }`.
 */
function commitPlateauCreate(spec, options) {
  const id = String(spec.id === undefined || spec.id === null ? '' : spec.id).trim();
  const parent = readIsMissing(spec.parent) || spec.parent === '' ? BASELINE_PLATEAU : String(spec.parent);
  const problem = plateauIdProblem(id);
  if (problem) throw new Error(problem);
  if (!AppState.plateauTree.nodes.has(parent))
    throw new Error('The plateau `' + parent + '` does not exist, so `' + id + '` cannot override it.');
  const name = readIsMissing(spec.name) ? '' : String(spec.name).trim();
  const horizon = readIsMissing(spec.horizon) ? '' : String(spec.horizon).trim();
  return guardedLayerWrite({
    plateau: id,
    confirmed: !!(options && options.confirmed),
    summary: 'Create the plateau `' + id + '` over `' + parent + '`',
    again: () => commitPlateauCreate(spec, Object.assign({}, options, { confirmed: true })),
    write: () => {
      const header = { kind: ARCHICODE_KIND_PREFIX + 'plateau', version: '1' };
      const content = { id };
      setPlateauContentKey(content, 'name', name);
      setPlateauContentKey(content, 'horizon', horizon);
      if (parent !== BASELINE_PLATEAU) setPlateauContentKey(content, 'override', parent);
      const dir = firstManifestsDir();
      const relPath = allocateManifestRelPath(dir === undefined ? 'manifests' : dir, 'plateau.', id);
      const mf = {
        relPath,
        header,
        content,
        error: null,
        rawText: serializeManifestFile(header, content),
        dirty: true,
        existedOnDisk: false,
        lastKnownDiskModified: null
      };
      adoptRemovedFile(mf);
      AppState.manifestFiles.push(mf);
      AppState.manifestFiles.sort((a, b) => compareCodePoints(a.relPath, b.relPath));
      saveStatus = { state: 'idle' };
      rebuildIndexAndRender();
      return { relPath };
    },
    verify: () => {
      const node = AppState.plateauTree.nodes.get(id);
      if (!node || node.parent !== parent)
        throw new Error(
          'Not written: the new plateau `' +
            id +
            '` does not read back as a plateau over `' +
            parent +
            '`. Nothing was changed.'
        );
    }
  });
}

/**
 * Renames a plateau, gives it a horizon or another parent, in its manifest of kind `archicode.morin.io/plateau` (one is made when the plateau exists through headers only).
 * `spec`: { id, name, horizon, parent } (`parent` is ignored for baseline, which overrides nothing). A plateau cannot go under itself or under a plateau that overrides it.
 * Under `guardedLayerWrite`: a new parent changes what the plateau inherits, so the plateaus it changes are told first.
 */
function commitPlateauEdit(spec, options) {
  const id = String(spec.id);
  const node = AppState.plateauTree.nodes.get(id);
  if (!node) throw new Error('The plateau `' + id + '` does not exist.');
  const name = readIsMissing(spec.name) ? '' : String(spec.name).trim();
  const horizon = readIsMissing(spec.horizon) ? '' : String(spec.horizon).trim();
  const parent =
    id === BASELINE_PLATEAU
      ? null
      : readIsMissing(spec.parent) || spec.parent === ''
        ? BASELINE_PLATEAU
        : String(spec.parent);
  if (parent !== null) {
    if (!AppState.plateauTree.nodes.has(parent))
      throw new Error('The plateau `' + parent + '` does not exist, so `' + id + '` cannot override it.');
    if (parent === id || layerIsBelow(parent, id))
      throw new Error('The plateau `' + id + '` cannot override `' + parent + '`: it would override itself.');
  }
  const unchanged = (node.name || '') === name && (node.horizon || '') === horizon && node.parent === parent;
  if (unchanged) return { unchanged: true };
  return guardedLayerWrite({
    plateau: id,
    confirmed: !!(options && options.confirmed),
    summary: 'Edit the plateau `' + id + '`',
    again: () => commitPlateauEdit(spec, Object.assign({}, options, { confirmed: true })),
    write: () => {
      const mf = ensurePlateauManifest(id);
      setPlateauContentKey(mf.content, 'name', name);
      setPlateauContentKey(mf.content, 'horizon', horizon);
      if (parent !== null && node.parent !== parent)
        setPlateauContentKey(mf.content, 'override', parent === BASELINE_PLATEAU ? '' : parent);
      touchManifest(mf);
      saveStatus = { state: 'idle' };
      rebuildIndexAndRender();
      return { relPath: mf.relPath };
    },
    verify: () => {
      const now = AppState.plateauTree.nodes.get(id);
      if (!now || (now.name || '') !== name || (now.horizon || '') !== horizon || now.parent !== parent) {
        throw new Error(
          'Not written: the plateau `' + id + '` does not read back as it was edited. Nothing was changed.'
        );
      }
    }
  });
}

// ---- Plateaus: deleted (wave 015, run 0102, W-14, issue #93; a plateau in the middle of the tree: wave 018, run 0132, #112) ----
//
// Any plateau but the root can go. What goes is listed before anything is done, and nothing else goes: its manifest of kind `archicode.morin.io/plateau` and every manifest
// whose header says its id (a view or a story that says it belongs to no plateau, run 0100: it stays). The files are queued for removal like the files of a deleted element
// (`pendingFileRemovals`): they leave the disk at the next "Save all changes", with its check that the disk did not change meanwhile. A plateau that other plateaus override
// (decision D5 of the author, 2026-10-21) is deleted in the same one step: the plateaus that override it go under the plateau it overrode (their `override` is edited, in the
// manifest of kind plateau that says it, or taken out when that plateau is the root), and what it brought, its elements and its patches, is lost to every plateau that stood
// on it. The dialog says, for each of them, what it loses, gets back (an element the deleted plateau removed) and reads differently, worked out by resolving it again without
// the plateau (`plateauDeletionAbove`), not guessed. A plateau above that would no longer resolve (a patch that selects nothing, a relationship towards an element that is
// gone) refuses the delete: that is a mistake to repair first, not a loss. Three things name a plateau besides its files (and a saved view is looked at too):
//   - `settings.current`: the delete takes it out of .archicode.yaml (the editor has no other place to change it, and a `current` that names no plateau stops both tools);
//   - a step of a story (`at`, `against`, run 0101): the delete is refused and lists the steps, as it is for a view or a step that names an element that only this
//     plateau declares, and for a step told at or compared with a plateau above that would lose an element the step draws (`at`: run 0132; `against`: wave 019,
//     run 0139, #138). Which plateau the step should be told at instead is the author's choice, made with the two lists of the step in Stories;
//   - a saved view drawn in a plateau above that would lose what it draws (#138, `stepsLosingTheirView`) refuses it too, with the same kind of sentence. Nothing is offered
//     instead of a refusal (the author's decision of 2026-10-22): the plateaus above are repaired first, or the plateau is folded into them by hand;
//   - the `override` of the plateaus above, rewritten as said.

/**
 * What deleting the plateau `id` would do, computed from the manifests as they are and changing nothing: `refusal` (one sentence: the root, plateaus that cannot be drawn,
 * the kernel not loaded while plateaus stand on it), `overriding` (the plateaus that override it: they go under `parent`, the plateau it overrides), `files`
 * (`[{ relPath, plateau, unsaved, modified }]`, the files that go: `plateau` is its manifest of kind plateau), `rewritten` (`[{ id, relPath }]`, the manifest of each plateau
 * that overrides it, whose `override` changes), `above` (what each plateau that stands on it becomes, see `plateauDeletionAbove`), `patches` (how many patches it has, which
 * no plateau applies any more), `breaks` (the sentences of the plateaus above that would no longer be valid), `current` (the `settings.current` that is taken out, or null),
 * `blocking` (the sentences of the views and stories that stay and would be wrong: the steps that name the plateau, the views and steps that name an element only it
 * declares, the steps told at or compared with a plateau above and the saved views drawn in one that would lose what they draw: `stepsLosingTheirView`), `kept` (the views and stories that say `plateau: <id>`) and `unread` (every `.toml` and
 * `.json` manifest, whose text the editor does not keep, and the YAML files it could not read whose text has the id: none is deleted or rewritten, and one that says
 * `plateau: <id>` or `override: <id>` would keep the plateau for the command line).
 */
function plateauDeletion(id) {
  const tree = AppState.plateauTree;
  const layers = AppState.layers;
  const node = tree ? tree.nodes.get(id) : null;
  const plan = {
    id,
    refusal: null,
    parent: null,
    overriding: [],
    files: [],
    rewritten: [],
    above: [],
    patches: 0,
    breaks: [],
    current: null,
    blocking: [],
    kept: [],
    unread: []
  };
  if (!layers || !tree || !tree.layered) {
    plan.refusal = 'This workspace has no plateau but baseline, which cannot be deleted.';
    return plan;
  }
  if (layers.blocked) {
    plan.refusal = 'No plateau is deleted while the plateaus cannot be drawn: ' + oneLine(layers.blocked);
    return plan;
  }
  if (!node) {
    plan.refusal = 'The plateau `' + id + '` does not exist.';
    return plan;
  }
  if (node.parent === null) {
    plan.refusal =
      'The plateau `' +
      id +
      '` is the root of the plateaus: every other plateau stands on it, so it cannot be deleted.';
    return plan;
  }
  plan.parent = node.parent;
  plan.overriding = layerChildrenOf(id);
  plan.patches = node.patches.length;
  if (plan.overriding.length && !loadedKernel) {
    plan.refusal =
      'The viewpoint kernel is not loaded yet, so what the plateaus that override `' +
      id +
      '` would lose cannot be worked out: nothing is deleted. Try again in a moment.';
    return plan;
  }
  const goes = new Set([node.manifest].concat(node.headers).filter((relPath) => relPath));
  plan.files = AppState.manifestFiles
    .filter((mf) => goes.has(mf.relPath))
    .map((mf) => ({
      relPath: mf.relPath,
      plateau: mf.relPath === node.manifest,
      unsaved: !mf.existedOnDisk,
      modified: !!(mf.existedOnDisk && mf.dirty)
    }));
  // a plateau that overrides another than the root says so in its manifest of kind plateau: that is the file its new parent is written in (none is ever made for it)
  plan.rewritten = plan.overriding.map((child) => ({ id: child, relPath: tree.nodes.get(child).manifest }));
  plan.kept = AppState.manifestFiles
    .filter((mf) => !mf.error && isPlateauFreeManifest(mf) && headerPlateau(mf.header) === id)
    .map((mf) => mf.relPath);
  const named = new RegExp('(^|[^a-z0-9_-])' + id.replace(/[-]/g, '\\-') + '($|[^a-z0-9_-])', 'm');
  plan.unread = (AppState.unreadManifestFiles || [])
    .concat(
      AppState.manifestFiles.filter((mf) => mf.error && named.test(String(mf.rawText || ''))).map((mf) => mf.relPath)
    )
    .sort(compareCodePoints);
  const settings = AppState.workspace.settings;
  // the files as they would be: those of the plateau gone, the `override` of the plateaus that override it rewritten (for a leaf: the files that stay, as they are)
  const effects = plateauDeletionAbove(id, goes);
  const after = effects.tree;
  plan.above = effects.above;
  plan.breaks = effects.breaks;
  const now = entryProblemsOf(settings).map(comparableSentence);
  plan.blocking = entryProblemsIn(effects.files, after, null)
    .filter((sentence) => !now.includes(comparableSentence(sentence))) // a step that was wrong already is not the delete's
    .concat(stepsLosingTheirView(effects));
  // `current` naming the plateau, or `baseline` in a workspace that has no plateau left: both tools would refuse the workspace (a `current` that was wrong already is not the delete's)
  if (settings.current === id || (settings.current === BASELINE_PLATEAU && !after.layered))
    plan.current = settings.current;
  return plan;
}

/**
 * What the plateaus that stand on `id` become once it is deleted (wave 018, run 0132, #112): the plateaus that override it are given its parent, and each plateau that stands
 * on it, directly or not, is resolved again with the kernel (`resolveLayerStep`, from the states of the plateaus that do not change, `layerStateOf`) and compared with what it
 * resolves to now. Returns `{ files, tree, above, breaks, before, after }`: `files` and `tree` are the manifests and the tree of the plateaus as they would be; `above`, in the
 * order of the tree, `[{ id, parent, newParent, lost, back, changed, unknown }]`: `lost` the elements it has now and would not have (each nested element named), `back` those
 * it would have again (the deleted plateau removed them), `changed` those it keeps whose own fields would read differently (a patch of the deleted plateau set them), each
 * `{ application: [...], technology: [...] }` sorted by reference, and `unknown` when it could not be resolved before (nothing is said of it then); `breaks` the sentences
 * of the plateaus above that would no longer resolve, or that the command line would refuse for a reason it does not have now (`judgeLayerWrite` decides the same
 * after the write); `before` and `after` the states, by plateau id. Kept with the layers (`layerCache`) for one tree and one text of the manifests.
 */
function plateauDeletionAbove(id, goes) {
  const tree = AppState.plateauTree;
  const settings = AppState.workspace.settings;
  const cache = ensureLayerCache(settings);
  if (!cache.deletions) cache.deletions = new Map();
  if (cache.deletions.has(id)) return cache.deletions.get(id);
  const parent = tree.nodes.get(id).parent;
  const children = new Map(layerChildrenOf(id).map((child) => [tree.nodes.get(child).manifest, child]));
  const files = AppState.manifestFiles
    .filter((mf) => !goes.has(mf.relPath))
    .map((mf) => {
      if (!children.has(mf.relPath)) return mf;
      const content = copyJson(mf.content);
      setPlateauContentKey(content, 'override', parent === BASELINE_PLATEAU ? '' : parent);
      return Object.assign({}, mf, { content });
    });
  const after = buildPlateauTree(files);
  const effects = { files, tree: after, above: [], breaks: [], before: new Map(), after: new Map() };
  const standing = tree.ids.filter((other) => layerIsBelow(other, id));
  if (standing.length) {
    if (after.problems.length) {
      effects.breaks = after.problems.map(String);
    } else {
      const context = { byPlateau: layerManifestsByPlateau(files), kernel: loadedKernel, layered: !!after.layered };
      const resolve = (plateau) => {
        if (effects.after.has(plateau)) return effects.after.get(plateau);
        const at = after.nodes.get(plateau);
        const above = standing.includes(at.parent) ? resolve(at.parent) : layerStateOf(at.parent, settings);
        const result = above.fatal ? above : resolveLayerStep(above.state, at, context);
        effects.after.set(plateau, result);
        return result;
      };
      const sentencesOf = (result) =>
        result.fatal
          ? result.earlier
            ? result.earlier.sentences
            : []
          : result.state.problems
            ? result.state.problems.sentences
            : [];
      const breaks = [];
      for (const plateau of standing) {
        const then = layerStateOf(plateau, settings);
        const now = resolve(plateau);
        effects.before.set(plateau, then);
        // what `judgeLayerWrite` refuses: a plateau that resolved and no longer does (told once, by the plateau whose own patches fail), a sentence it did not have
        if (now.fatal && !then.fatal && now.plateau === plateau)
          breaks.push('the plateau `' + plateau + '` could no longer be resolved (' + oneLine(now.fatal[0]) + ')');
        const known = sentencesOf(then).map(comparableSentence);
        for (const sentence of sentencesOf(now))
          if (!known.includes(comparableSentence(sentence))) breaks.push(oneLine(sentence));
        const entry = {
          id: plateau,
          parent: tree.nodes.get(plateau).parent,
          newParent: after.nodes.get(plateau).parent,
          lost: null,
          back: null,
          changed: null,
          unknown: !!then.fatal
        };
        if (!then.fatal && !now.fatal) {
          const was = graphReferencesOf(then.state.graph);
          const is = graphReferencesOf(now.state.graph);
          const own = (element) => {
            const copy = Object.assign({}, element);
            delete copy.elements;
            return copy;
          };
          entry.lost = {};
          entry.back = {};
          entry.changed = {};
          for (const layer of LAYER_NAMES) {
            entry.lost[layer] = Array.from(was[layer].keys())
              .filter((reference) => !is[layer].has(reference))
              .sort(compareUnits);
            entry.back[layer] = Array.from(is[layer].keys())
              .filter((reference) => !was[layer].has(reference))
              .sort(compareUnits);
            entry.changed[layer] = Array.from(was[layer].keys())
              .filter(
                (reference) =>
                  is[layer].has(reference) && !sameJson(own(was[layer].get(reference)), own(is[layer].get(reference)))
              )
              .sort(compareUnits);
          }
        }
        effects.above.push(entry);
      }
      effects.breaks = Array.from(new Set(breaks));
    }
  }
  cache.deletions.set(id, effects);
  return effects;
}

/**
 * What a view (a saved view, or the recipe a step carries) draws that the plateau above `plateau` has now and would lose once the plateau is deleted: `[]` when it loses nothing
 * it draws. What `viewProblem` looks at: the element of a view, and for a map the elements it is pinned on, of which one is enough (a map that keeps one of its pins there loses
 * nothing). `entry` is the plateau's entry of `effects.above` (`lost` is null when it would not resolve: `plan.breaks` tells it then).
 */
function viewLosesInPlateauAbove(view, plateau, entry, effects) {
  if (!entry || !entry.lost || !view || !isPlainObject(view)) return [];
  const layer = viewLayerOf(view);
  const lost = new Set(entry.lost[layer]);
  const properties = isPlainObject(view.properties) ? view.properties : {};
  if (view.viewpoint === 'map') {
    const pinned = stringList(properties.pinned);
    const was = effects.before.get(plateau).state
      ? graphReferencesOf(effects.before.get(plateau).state.graph)[layer]
      : new Map();
    const kept = pinned.filter((reference) => was.has(reference) && !lost.has(reference));
    return pinned.length && !kept.length ? pinned.filter((reference) => lost.has(reference)) : [];
  }
  return typeof properties.element === 'string' && lost.has(properties.element) ? [properties.element] : [];
}

/** The elements a view names, with their layer: its element, or the elements a map is pinned on. */
function namedByView(view) {
  if (!view || !isPlainObject(view)) return [];
  const layer = viewLayerOf(view);
  const properties = isPlainObject(view.properties) ? view.properties : {};
  if (view.viewpoint === 'map') return stringList(properties.pinned).map((reference) => ({ layer, reference }));
  return typeof properties.element === 'string' ? [{ layer, reference: properties.element }] : [];
}

/** Whether the plateau a step is told at (`at`, else the plateau drawn) still has `reference` once the plateau is deleted: what the plateau above has now, less what it would lose. */
function survivesWhereTold(layer, reference, at, byId, effects) {
  const id = at !== null ? at : AppState.layers ? AppState.layers.current : null;
  const entry = id === null ? undefined : byId.get(id);
  const then = entry && entry.lost ? effects.before.get(id) : undefined;
  if (then && then.state)
    return graphReferencesOf(then.state.graph)[layer].has(reference) && !entry.lost[layer].includes(reference);
  return indexOfPlateau(at)[layer].has(reference);
}

/**
 * What the views and the stories that stay would lose in the plateaus above the deleted one, one sentence each (the plateau-free check, `entryProblemsIn`, tells the names no
 * plateau declares any more; this tells a plateau above that has what they draw now and would not):
 *   - a step told at a plateau above (`at`, run 0132): the step could be drawn there and no longer could (`stepProblem` would say "is not in the plateau");
 *   - a step compared with a plateau above (`against`, wave 019 run 0139, #138): the comparison is drawn from the plateau the step is told at, so the step loses its view only when
 *     the plateau compared with would lose what it names and the plateau it is told at does not keep it either;
 *   - a saved view drawn in a plateau above (#138): it can be drawn there now and no longer could; one sentence per view, naming every such plateau in the order of the tree.
 * A step with neither key is drawn in whatever plateau the reader has, and is not told. In the order of the stories and their steps (`at`, then `against`), then the views.
 */
function stepsLosingTheirView(effects) {
  const out = [];
  if (!effects.above.length) return out;
  const byId = new Map(effects.above.map((entry) => [entry.id, entry]));
  const sourceOf = (entry) => {
    const owner = entryOwners.get(entry);
    return owner ? owner.relPath : '.archicode.yaml';
  };
  for (const story of storiesList()) {
    const source = sourceOf(story);
    (Array.isArray(story.steps) ? story.steps : [])
      .filter((step) => step !== null && step !== undefined)
      .forEach((step, i) => {
        if (!isPlainObject(step)) return;
        const keys = stepPlateauKeys(step);
        const where = 'the story `' + story.id + '` (`' + source + '`) step ' + (i + 1);
        for (const [key, words] of [
          ['at', 'is told at'],
          ['against', 'is compared with']
        ]) {
          const plateau = keys[key];
          const view = stepView(step);
          let gone = plateau === null ? [] : viewLosesInPlateauAbove(view, plateau, byId.get(plateau), effects);
          // a plateau only compared with does not have to hold what the step draws: the comparison is drawn from the plateau the step is told at, so the step loses its view only
          // when that side does not keep what it names either
          if (
            key === 'against' &&
            gone.length &&
            namedByView(view).some((one) => survivesWhereTold(one.layer, one.reference, keys.at, byId, effects))
          )
            gone = [];
          if (gone.length)
            out.push(
              where + ' ' + words + ' `' + plateau + '`, which would no longer have ' + plateauNames(gone, true)
            );
        }
      });
  }
  for (const view of savedViews()) {
    const lost = effects.above
      .map((entry) => ({ plateau: entry.id, gone: viewLosesInPlateauAbove(view, entry.id, entry, effects) }))
      .filter((one) => one.gone.length);
    if (!lost.length) continue;
    const gone = Array.from(new Set(lost.flatMap((one) => one.gone))).sort(compareUnits);
    out.push(
      'the view `' +
        view.id +
        '` (`' +
        sourceOf(view) +
        '`) is drawn in ' +
        lost.map((one) => '`' + one.plateau + '`').join(', ') +
        ', which would no longer have ' +
        plateauNames(gone, true)
    );
  }
  return out;
}

/** The sentence that refuses a delete for what the plateaus above would say (`plan.breaks`) or for what the files that stay would say (`plan.blocking`), naming the first of them. */
function plateauDeletionBlockedMessage(plan) {
  if (plan.breaks.length) {
    return (
      'The plateau `' +
      plan.id +
      '` cannot be deleted: ' +
      (plan.breaks.length === 1
        ? 'a plateau that stands on it would no longer be valid'
        : plan.breaks.length + ' mistakes would appear in the plateaus that stand on it') +
      ' (' +
      oneLine(plan.breaks[0]).replace(/\.$/, '') +
      '). Repair ' +
      (plan.breaks.length === 1 ? 'it' : 'them') +
      ' first, or give the plateaus that override `' +
      plan.id +
      '` another parent with Edit.'
    );
  }
  return (
    'The plateau `' +
    plan.id +
    '` cannot be deleted: ' +
    (plan.blocking.length === 1
      ? 'a view or a story would no longer be valid'
      : plan.blocking.length + ' views or story steps would no longer be valid') +
    ' (' +
    oneLine(plan.blocking[0]).replace(/\.$/, '') +
    '). Change ' +
    (plan.blocking.length === 1 ? 'it' : 'them') +
    ' in Stories first.'
  );
}

/**
 * Deletes the plateau `id` (see `plateauDeletion`): its files leave the model and are queued for removal, the plateaus that override it are given the plateau it overrode
 * (their `override` is rewritten, or taken out when that is the root), a `settings.current` that names it is taken out, and the page draws the plateau it overrode when it
 * was the one drawn (with no comparison), compares the plateau drawn with its new parent when it compared it with its past, or stops the comparison when it was the one
 * compared with otherwise. Under `guardedLayerWrite`: every plateau that stays is resolved again, and the delete is kept only if none is refused that was not, else everything
 * is put back (the files, the `override` rewritten, the queue of removals, the settings, the plateau drawn). `options.listed`: the dialog of the delete has told the author what
 * the plateaus above lose (`plan.above`), so a change of those plateaus is not asked again; a change of any other one still is. Returns `{ removed, rewritten, current, drawn }`,
 * or `{ pending: true }` when the dialog of the plateaus it changes is open.
 */
function commitPlateauDelete(id, options) {
  if (saveInFlight) throw new Error('The folder is being saved: delete the plateau once the save has ended.');
  const plan = plateauDeletion(id);
  if (plan.refusal) throw new Error(plan.refusal);
  if (plan.breaks.length || plan.blocking.length) throw new Error(plateauDeletionBlockedMessage(plan));
  const goes = new Set(plan.files.map((f) => f.relPath));
  const parent = plan.parent;
  const drawingBefore = AppState.layers.current + '|' + layerCompareChoice();
  const result = guardedLayerWrite({
    plateau: id,
    confirmed: !!(options && options.confirmed),
    confirmedFor: options && options.listed ? plan.above.map((entry) => entry.id) : null,
    summary: 'Delete the plateau `' + id + '`',
    again: () => commitPlateauDelete(id, Object.assign({}, options, { confirmed: true })),
    write: () => {
      // the plateaus that override it go under its parent: the key `override` of their manifest of kind plateau, written line by line as Edit writes it (none for the root)
      for (const { id: child, relPath } of plan.rewritten) {
        const mf = AppState.manifestFiles.find((file) => file.relPath === relPath);
        if (!mf || !mf.content || String(mf.content.id) !== child)
          throw new Error(
            'Not written: the manifest of the plateau `' + child + '` was not found. Nothing was changed.'
          );
        setPlateauContentKey(mf.content, 'override', parent === BASELINE_PLATEAU ? '' : parent);
        touchManifest(mf);
      }
      for (const mf of AppState.manifestFiles) {
        if (!goes.has(mf.relPath)) continue;
        if (mf.existedOnDisk && !AppState.pendingFileRemovals.includes(mf.relPath)) {
          // a file that is not on disk yet just leaves the model
          AppState.pendingFileRemovals.push(mf.relPath);
          AppState.removedFileBaselines.set(mf.relPath, mf.lastKnownDiskModified); // the save checks the disk did not change since
        }
        if (rawYamlEditDraft && rawYamlEditDraft.relPath === mf.relPath) rawYamlEditDraft = null;
        if (AppState.selection.kind === 'file' && AppState.selection.key === mf.relPath)
          AppState.selection = { kind: 'none', key: null, mode: 'view' };
      }
      // the marks of what is modified, for a reference no file that stays declares (a plateau beside it may declare the same one: its mark stays)
      const declaredAfter = declaredReferencesOf(AppState.manifestFiles.filter((mf) => !goes.has(mf.relPath)));
      for (const mf of AppState.manifestFiles) {
        const layer = goes.has(mf.relPath) ? manifestLayer(mf) : null;
        if (layer)
          walkContentNodes(mf, (node, reference) => {
            if (!declaredAfter[layer].has(reference)) AppState.dirtyReferences.delete(nodeKey(reference, layer));
          });
      }
      AppState.manifestFiles = AppState.manifestFiles.filter((mf) => !goes.has(mf.relPath));
      if (plan.current !== null) {
        const raw = AppState.workspace.topLevel && AppState.workspace.topLevel.settings;
        if (isPlainObject(raw)) delete raw.current; // .archicode.yaml is written line by line: the line of the key goes, nothing else
        AppState.workspace.settings.current = '';
        markWorkspaceYamlChanged();
      }
      const layers = AppState.layers;
      if (layers.current === id) {
        layers.current = parent; // the plateau it overrode: what the author built it on
        layers.compare = null;
      } else if (layers.compare && layers.compare.other === id && layers.compare.mode !== 'past') {
        layers.compare = null;
      } // the past of a plateau that overrode it follows it to its new parent (`normalizedLayerCompare`)
      pendingDeleteConfirmation = null;
      saveStatus = { state: 'idle' };
      rebuildIndexAndRender();
      return {
        removed: Array.from(goes).sort(compareCodePoints),
        rewritten: plan.rewritten.map((r) => r.relPath),
        current: plan.current,
        drawn: layers.current
      };
    },
    verify: () => {
      if (AppState.plateauTree.nodes.has(id) || AppState.manifestFiles.some((mf) => goes.has(mf.relPath)))
        throw new Error('Not written: the plateau `' + id + '` is still read after the delete. Nothing was changed.');
      // the tree reads as the dialog said: each plateau that overrode it now overrides its parent
      const strayed = plan.overriding.find(
        (child) => !AppState.plateauTree.nodes.has(child) || AppState.plateauTree.nodes.get(child).parent !== parent
      );
      if (strayed)
        throw new Error(
          'Not written: the plateau `' +
            strayed +
            '` does not read back as a plateau over `' +
            parent +
            '`. Nothing was changed.'
        );
    }
  });
  // another plateau drawn, or no comparison: remembered as it is now, and what the page held of the plateau drawn before is let go. The address is rewritten, not added to
  // the history (the plateau it named is gone)
  if (!result.pending && AppState.layers.current + '|' + layerCompareChoice() !== drawingBefore) {
    rememberLayerChoice();
    settleAfterLayerChange(false);
    requestRedraw();
  }
  return result;
}

/** The dialog that deletes a plateau: it says what goes before anything goes. */
function openPlateauDeleteDialog(id) {
  if (!AppState.layers || !AppState.plateauTree || !AppState.plateauTree.nodes.has(id)) return;
  openAppDialog({ kind: 'plateau-delete', plateau: id });
}

/** The body and the buttons of the dialog of `openPlateauDeleteDialog`, from `plateauDeletion` (computed each time it is drawn). */
function renderPlateauDeleteDialogHtml(dialog) {
  const plan = plateauDeletion(dialog.plateau);
  const title = 'Delete the plateau ' + plateauTitle(layerPlateauModel(dialog.plateau));
  const cancel = (focus) =>
    '<button type="button" data-action="dialog-cancel"' +
    (focus ? ' class="btn-primary" data-dialog-autofocus' : '') +
    '>' +
    (focus ? 'Close' : 'Cancel') +
    '</button>';
  const code = (text) => '<code>' + escapeHtml(text) + '</code>';
  const list = (items) => '<ul class="layer-confirm-list">' + items.join('') + '</ul>';
  if (plan.refusal)
    return {
      title,
      body: '<p class="app-dialog-subject">' + duplicateMessageHtml(plan.refusal) + '</p>',
      actions: cancel(true)
    };
  const fileItem = (f) =>
    '<li>' +
    code(f.relPath) +
    (f.plateau ? ' <span class="muted">the manifest of the plateau</span>' : '') +
    (f.unsaved
      ? ' <span class="muted">(new, not saved yet)</span>'
      : f.modified
        ? ' <strong>(modified, not saved: the changes go with it)</strong>'
        : '') +
    '</li>';
  const middle = plan.overriding.length > 0; // a plateau that others override (run 0132, #112): their `override` changes too, and the dialog says what each plateau above loses
  let body =
    '<p class="app-dialog-subject">' + code(dialog.plateau) + (plan.files.length ? '' : ' has no file.') + '</p>';
  if (plan.files.length)
    body +=
      '<p>' +
      (plan.files.length === 1 ? 'This file goes' : 'These ' + plan.files.length + ' files go') +
      (middle ? ':' : ', and nothing else:') +
      '</p>' +
      list(plan.files.map(fileItem));
  if (middle) {
    const titled = (other) =>
      code(other) + (layerPlateauModel(other).name ? ' ' + escapeHtml(layerPlateauModel(other).name) : '');
    body +=
      '<p>' +
      (plan.rewritten.length === 1 ? 'This file changes' : 'These ' + plan.rewritten.length + ' files change') +
      (plan.files.length ? ', and nothing else' : '') +
      ': the ' +
      (plan.rewritten.length === 1 ? 'plateau that overrides' : 'plateaus that override') +
      ' ' +
      code(dialog.plateau) +
      ' ' +
      (plan.rewritten.length === 1 ? 'goes' : 'go') +
      ' under ' +
      code(plan.parent) +
      '.</p>' +
      list(
        plan.rewritten.map(
          (r) =>
            '<li data-plateau="' +
            escapeHtml(r.id) +
            '">' +
            code(r.relPath) +
            ' ' +
            (plan.parent === BASELINE_PLATEAU
              ? 'loses the line <code>override: ' +
                escapeHtml(dialog.plateau) +
                '</code> (a plateau that says none overrides the root)'
              : 'says <code>override: ' +
                escapeHtml(plan.parent) +
                '</code> instead of <code>override: ' +
                escapeHtml(dialog.plateau) +
                '</code>') +
            '</li>'
        )
      );
    const refs = (references) => references.map(code).join(', ');
    const count = (n, what) => n + ' ' + what + (n === 1 ? '' : 's');
    const lines = (entry) => {
      if (entry.unknown)
        return ['<li data-what="unknown">could not be resolved before the delete: what it loses is not known</li>'];
      if (!entry.lost) return ['<li data-what="broken">would no longer resolve (see below)</li>'];
      const out = [];
      for (const layer of LAYER_NAMES) {
        const where = layer === 'technology' ? ' of the technology layer' : '';
        if (entry.lost[layer].length)
          out.push(
            '<li data-what="lost" data-layer="' +
              layer +
              '">loses ' +
              count(entry.lost[layer].length, 'element') +
              where +
              ': ' +
              refs(entry.lost[layer]) +
              '</li>'
          );
        if (entry.back[layer].length)
          out.push(
            '<li data-what="back" data-layer="' +
              layer +
              '">gets back ' +
              count(entry.back[layer].length, 'element') +
              where +
              ' that ' +
              code(dialog.plateau) +
              ' removed: ' +
              refs(entry.back[layer]) +
              '</li>'
          );
        if (entry.changed[layer].length)
          out.push(
            '<li data-what="changed" data-layer="' +
              layer +
              '">reads ' +
              count(entry.changed[layer].length, 'element') +
              where +
              ' differently, without what the patches of ' +
              code(dialog.plateau) +
              ' did to ' +
              (entry.changed[layer].length === 1 ? 'it' : 'them') +
              ': ' +
              refs(entry.changed[layer]) +
              '</li>'
          );
      }
      return out.length ? out : ['<li data-what="nothing">loses nothing</li>'];
    };
    body +=
      '<p>Nothing that ' +
      code(dialog.plateau) +
      ' declares' +
      (plan.patches ? ', nor its ' + (plan.patches === 1 ? 'patch' : plan.patches + ' patches') + ',' : '') +
      ' reaches the plateaus that stand on it any more. Each of them, resolved again without it:</p>' +
      '<ul class="layer-confirm-list plateau-delete-above">' +
      plan.above
        .map(
          (entry) =>
            '<li data-plateau="' +
            escapeHtml(entry.id) +
            '">' +
            titled(entry.id) +
            ', over ' +
            code(entry.newParent) +
            (entry.newParent !== entry.parent ? ' instead of ' + code(entry.parent) : '') +
            ':<ul>' +
            lines(entry).join('') +
            '</ul></li>'
        )
        .join('') +
      '</ul>';
  }
  if (plan.breaks.length || plan.blocking.length) {
    if (plan.breaks.length) {
      body +=
        '<p><strong>It cannot be deleted yet:</strong> once it is gone, ' +
        (plan.breaks.length === 1 ? 'this sentence would be a mistake' : 'these sentences would be mistakes') +
        ' of the plateaus that stand on it, which the command line refuses. Repair ' +
        (plan.breaks.length === 1 ? 'it' : 'them') +
        ' first, or give the plateaus that override ' +
        code(dialog.plateau) +
        ' another parent with Edit.</p>' +
        list(plan.breaks.map((sentence) => '<li>' + duplicateMessageHtml(sentence) + '</li>'));
    }
    if (plan.blocking.length) {
      body +=
        '<p><strong>It cannot be deleted yet:</strong> once these files are gone, ' +
        (plan.blocking.length === 1 ? 'this sentence would be' : 'these sentences would be') +
        ' a mistake for the command line and the editor. Change ' +
        (plan.blocking.length === 1 ? 'it' : 'them') +
        ' in Stories first.</p>' +
        list(plan.blocking.map((sentence) => '<li>' + duplicateMessageHtml(sentence) + '</li>'));
    }
    return { title, body, actions: cancel(true) };
  }
  if (plan.current !== null)
    body +=
      '<p><code>settings.current</code> names ' +
      code(plan.current) +
      ': the key is taken out of <code>.archicode.yaml</code> (the command line then draws the last plateau when the plateaus are one line, and asks for <code>--plateau</code> otherwise).</p>';
  if (plan.unread.length)
    body +=
      '<p>The editor does not read ' +
      (plan.unread.length === 1 ? 'this file' : 'these files') +
      ' (TOML, JSON, or YAML it could not read), so ' +
      (plan.unread.length === 1 ? 'it is' : 'they are') +
      ' not deleted' +
      (middle ? ' nor rewritten' : '') +
      ': if one says <code>plateau: ' +
      escapeHtml(dialog.plateau) +
      '</code>' +
      (middle ? ' or <code>override: ' + escapeHtml(dialog.plateau) + '</code>' : '') +
      ', the command line still reads the plateau. Look at ' +
      (plan.unread.length === 1 ? 'it' : 'them') +
      ' in a text editor.</p>' +
      list(plan.unread.map((relPath) => '<li>' + code(relPath) + '</li>'));
  if (plan.kept.length)
    body +=
      '<p>' +
      (plan.kept.length === 1 ? 'This view or story says' : 'These views and stories say') +
      ' <code>plateau: ' +
      escapeHtml(dialog.plateau) +
      '</code> in the header, which names no plateau: ' +
      (plan.kept.length === 1 ? 'it stays' : 'they stay') +
      '.</p>' +
      list(plan.kept.map((relPath) => '<li>' + code(relPath) + '</li>'));
  const views = viewsFolderName();
  if (views)
    body +=
      '<p class="muted">The views the command line generated for it (' +
      code(views + '-' + dialog.plateau) +
      ' and the folders of its comparisons) are not manifests: they stay where they are.</p>';
  body +=
    '<p>The files leave the disk at the next “Save all changes”.' +
    (AppState.layers.current === dialog.plateau
      ? ' The plateau it overrides, ' +
        code(AppState.plateauTree.nodes.get(dialog.plateau).parent) +
        ', is drawn instead.'
      : '') +
    '</p>';
  return {
    title,
    body,
    actions:
      cancel(false) +
      '<button type="button" class="btn-danger-solid" data-action="dialog-submit">Delete plateau</button>'
  };
}
