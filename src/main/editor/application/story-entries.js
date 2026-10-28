// ---- Editing the lists (everything is in memory until "Save all changes") ----

/**
 * A new manifest of the editor's own kinds (a view, a story), in the first manifests folder, as a manifest with no `plateau:` is. A view and a story belong to no plateau
 * (wave 015, run 0100, issue #100): the plateau drawn decides neither the folder nor the header.
 */
function createManifestEntry(kind, content) {
  const header = { kind: ARCHICODE_KIND_PREFIX + kind, version: '1' };
  const manifestsDir = firstManifestsDir();
  const relPath = allocateManifestRelPath(
    manifestsDir === undefined ? 'manifests' : manifestsDir,
    kind + '.',
    content.id
  );
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
  entryOwners.set(content, mf);
  saveStatus = { state: 'idle' };
  return content;
}

/** The manifest of an entry leaves the model; its file goes with the next save (nothing to do for one that was never written). */
function removeEntry(entry, key) {
  const owner = entryOwners.get(entry);
  if (owner) {
    if (owner.existedOnDisk && !AppState.pendingFileRemovals.includes(owner.relPath)) {
      AppState.pendingFileRemovals.push(owner.relPath);
      AppState.removedFileBaselines.set(owner.relPath, owner.lastKnownDiskModified);
    }
    if (rawYamlEditDraft && rawYamlEditDraft.relPath === owner.relPath) rawYamlEditDraft = null;
    if (AppState.selection.kind === 'file' && AppState.selection.key === owner.relPath)
      AppState.selection = { kind: 'none', key: null, mode: 'view' };
    AppState.manifestFiles = AppState.manifestFiles.filter((f) => f !== owner);
    saveStatus = { state: 'idle' };
    return;
  }
  const list = workspaceTopLevel()[key];
  if (Array.isArray(list)) {
    const index = list.indexOf(entry);
    if (index >= 0) list.splice(index, 1);
    if (!list.length) delete workspaceTopLevel()[key]; // a file that had no such list does not keep an empty one
  }
  markWorkspaceYamlChanged();
}

/** The saved view of that diagram: the one already saved when there is one, else a new one named `name`. */
function viewForDefinition(definition, name) {
  const existing = savedViews().find(
    (view) => JSON.stringify(canonicalViewDefinition(view)) === JSON.stringify(definition)
  );
  if (existing) return existing;
  const label = name || describeViewDefinition(definition);
  return createManifestEntry('view', {
    id: uniqueIdFor(label, takenEntryIds('view', 'views'), 'view'),
    name: label,
    viewpoint: definition.viewpoint,
    layer: definition.layer,
    properties: definition.properties
  });
}

function createStory(name) {
  return createManifestEntry('story', {
    id: uniqueIdFor(name, takenEntryIds('story', 'stories'), 'story'),
    name,
    steps: []
  });
}

function writableSteps(story) {
  if (!Array.isArray(story.steps)) story.steps = [];
  return story.steps;
}

/** How many steps of the stories show that view. */
function storiesUsingView(viewId) {
  return storiesList().reduce(
    (count, story) => count + storySteps(story).filter((step) => step.view === viewId).length,
    0
  );
}

/**
 * The relationship entries a recipe names in `layer`, the one list that the rename (`rewriteRecipeReferences`) and its count (`recipeNamedReferences`, the preview of a Move) both
 * read (wave 026, run 0200, DEC-7, F6). A recipe is a view, a step that carries its own view, or a step that names a view: such a step has only its own `highlight` key, which sits
 * beside `view:` and not in `properties`. The entries of a Map of the application layer are its `links` and `highlight`; the step key is read for a step of that layer. The
 * entries returned are the objects of the recipe, so a rewrite of them is a rewrite of the recipe.
 */
function recipeLinkEntries(recipe, layer) {
  const entries = [];
  if (layer !== 'application') return entries;
  const take = (value, key) => {
    if (Array.isArray(value)) entries.push(...linkEntriesOf(value, key).entries);
  };
  const properties = recipe.properties;
  const onApplicationLayer = entryLayerOf(recipe.layer) === 'application'; // the layer of a view is read in any case (`model/layer-loader.js`, the same reading as `viewLayerOf`)
  if (isPlainObject(properties) && recipe.viewpoint === 'map' && onApplicationLayer) {
    take(properties.links, 'links');
    take(properties.highlight, 'highlight');
  }
  const namesView = typeof recipe.view === 'string' && recipe.view !== '';
  if (namesView || (recipe.viewpoint === 'map' && onApplicationLayer)) take(recipe.highlight, 'highlight');
  return entries;
}

/** A recipe (a view, or a step that carries one or names one) follows a renamed element. True when it changed. */
function rewriteRecipeReferences(recipe, oldRef, newRef, layer) {
  const properties = recipe.properties;
  let changed = false;
  const viewLayer = viewLayerOf(recipe);
  if (isPlainObject(properties)) {
    if (recipe.viewpoint !== 'map' && viewLayer === layer && typeof properties.element === 'string') {
      const element = rewriteReferenceValue(properties.element, oldRef, newRef);
      if (element !== properties.element) {
        properties.element = element;
        changed = true;
      }
    }
    if (recipe.viewpoint === 'map' && viewLayer === layer) {
      for (const key of ['pinned', 'hidden', 'opened']) {
        if (!Array.isArray(properties[key])) continue;
        const next = properties[key].map((reference) => rewriteReferenceValue(reference, oldRef, newRef));
        if (next.some((reference, i) => reference !== properties[key][i])) {
          properties[key] = next;
          changed = true;
        }
      }
    }
  }
  // the relationships a Map is narrowed to, and the ones it draws heavy, name their two ends (wave 026, runs 0199 and 0200, DEC-10); the label never changes
  const rewrite = (reference) => rewriteReferenceValue(reference, oldRef, newRef);
  if (rewriteLinkEntries(recipeLinkEntries(recipe, layer), rewrite)) changed = true;
  return changed;
}

/**
 * An element was renamed: the saved views, and the steps that carry their own view, follow it (the Map's pinned,
 * hidden and open elements are of the layer of the view, and so is the element of any other view).
 */
function rewriteSavedViewReferences(oldRef, newRef, layer) {
  let changed = false;
  for (const view of savedViews()) {
    if (rewriteRecipeReferences(view, oldRef, newRef, layer)) {
      markEntryChanged(view);
      changed = true;
    }
  }
  for (const story of storiesList()) {
    let storyChanged = false;
    for (const step of Array.isArray(story.steps) ? story.steps : []) {
      if (isPlainObject(step) && rewriteRecipeReferences(step, oldRef, newRef, layer)) storyChanged = true;
    }
    if (storyChanged) {
      markEntryChanged(story);
      changed = true;
    }
  }
  return changed;
}

/** The references a recipe (a view, or a step) names in `layer`: the ones `rewriteRecipeReferences` rewrites, the entries from the one helper `recipeLinkEntries`. */
function recipeNamedReferences(recipe, layer) {
  const named = [];
  for (const link of recipeLinkEntries(recipe, layer)) named.push(link.source, link.destination);
  const properties = recipe.properties;
  if (!isPlainObject(properties) || viewLayerOf(recipe) !== layer) return named;
  if (recipe.viewpoint === 'map') {
    return named.concat(
      ['pinned', 'hidden', 'opened']
        .reduce((all, key) => all.concat(Array.isArray(properties[key]) ? properties[key] : []), [])
        .filter((reference) => typeof reference === 'string')
    );
  }
  return typeof properties.element === 'string' ? named.concat([properties.element]) : named;
}

/**
 * What a rename of `oldRef` to `newRef` (in `layer`, in the plateau drawn) leaves behind (wave 016, run 0113, #116). A rename rewrites the files of the plateau drawn and of the
 * plateaus that stand on it (`writeScopeHas`), and the views and the stories of the whole workspace, which belong to no plateau (run 0100). A plateau that is neither (a plateau
 * beside it, or one that stands on such a plateau) is not rewritten, and keeps the old reference in its own model: a view that names the element is then rewritten to a name that
 * plateau lacks, and cannot be drawn there (`viewLacksInPlateau`). Which plateaus keep it is read from the model each plateau resolves (`layerModelOf`), so a plateau that only
 * inherits the element from another plateau counts as much as one that declares it (`declaredIn` says which). Returns null when nothing would break (no plateau is layered, the
 * plateau drawn is baseline, which every plateau stands on, the element is not declared in the plateau drawn, so the write refuses it with its own sentence, no plateau keeps the
 * reference, or no view and no step names it where it stays), else `{ from, to, plateau, plateaus: [{ id, name, declaredIn, references }], views: [{ id, label, plateaus }],
 * steps: [{ story, label, number, plateaus }] }`. Reads; writes nothing.
 */
function renameSiblingImpact(oldRef, newRef, layer) {
  const drawn = writingPlateau();
  if (drawn === null || drawn === BASELINE_PLATEAU) return null;
  const own = AppState.index[layer] ? AppState.index[layer].get(oldRef) : null;
  if (!own || own.declaredIn !== drawn) return null;
  const settings = AppState.workspace.settings;
  const below = (reference) => reference === oldRef || reference.indexOf(oldRef + '.') === 0;
  const plateaus = [];
  for (const id of AppState.plateauTree.ids) {
    if (id === drawn || layerIsBelow(id, drawn)) continue; // the plateau drawn, and the plateaus that stand on it, are rewritten
    const model = layerModelOf(id, settings);
    const references = Array.from(model.index[layer].keys()).filter(below);
    if (!references.length) continue;
    const record = model.index[layer].get(oldRef);
    plateaus.push({ id, name: layerPlateauModel(id).name, declaredIn: record ? record.declaredIn : null, references });
  }
  if (!plateaus.length) return null;
  const lost = (recipe) => {
    // the plateaus where the recipe names an element that the rename takes the name of
    const named = recipeNamedReferences(recipe, layer).filter(
      (reference) => rewriteReferenceValue(reference, oldRef, newRef) !== reference
    );
    return plateaus
      .filter((plateau) => named.some((reference) => plateau.references.includes(reference)))
      .map((plateau) => plateau.id);
  };
  const views = [];
  for (const view of savedViews()) {
    const where = lost(view);
    if (where.length) views.push({ id: view.id, label: viewLabel(view), plateaus: where });
  }
  const steps = [];
  for (const story of storiesList()) {
    (Array.isArray(story.steps) ? story.steps : []).forEach((step, i) => {
      if (!isPlainObject(step)) return;
      const where = lost(step);
      if (where.length) steps.push({ story: story.id, label: storyLabel(story), number: i + 1, plateaus: where });
    });
  }
  if (!views.length && !steps.length) return null;
  return { from: oldRef, to: newRef, plateau: drawn, plateaus, views, steps };
}

/**
 * The Rename dialog of a layered workspace when plateaus beside the one drawn keep the old reference (`renameSiblingImpact`): its title, body and buttons. The Move dialog asks
 * the same question once a parent is chosen (wave 017, run 0122, #122: `dialog.moving`, the reference changes the same way and the views and stories follow it everywhere): the
 * words say move, and Cancel gives the Move dialog back as it was (`dialog.back`) instead of leaving.
 */
function renderRenameSiblingsDialogHtml(dialog) {
  const impact = dialog.impact;
  const moving = !!dialog.moving;
  const noun = moving ? 'move' : 'rename';
  const code = (text) => '<code>' + escapeHtml(text) + '</code>';
  const list = (items) => '<ul class="layer-confirm-list">' + items.join('') + '</ul>';
  const where = (ids) => ' <span class="muted">in ' + ids.map(code).join(', ') + '</span>';
  const record = findElementRecord(dialog.reference, layerOfReference(dialog.reference) || 'application');
  const label = record ? record.name || record.id : dialog.reference;
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const keepers = impact.plateaus.map(
    (plateau) =>
      '<li>' +
      code(plateau.id) +
      (plateau.name ? ' ' + escapeHtml(plateau.name) : '') +
      (plateau.declaredIn && plateau.declaredIn !== plateau.id
        ? ' <span class="muted">(inherits it from ' + code(plateau.declaredIn) + ')</span>'
        : '') +
      '</li>'
  );
  let body =
    '<p class="app-dialog-subject">' +
    code(impact.from) +
    ' becomes ' +
    code(impact.to) +
    ' in the plateau ' +
    code(impact.plateau) +
    ', and in the plateaus that stand on it.</p>' +
    '<p>' +
    (impact.plateaus.length === 1 ? 'This plateau does' : 'These ' + impact.plateaus.length + ' plateaus do') +
    ' not stand on ' +
    code(impact.plateau) +
    ' and still ' +
    (impact.plateaus.length === 1 ? 'has' : 'have') +
    ' ' +
    code(impact.from) +
    ' (the ' +
    noun +
    ' does not reach ' +
    (impact.plateaus.length === 1 ? 'it' : 'them') +
    '):</p>' +
    list(keepers) +
    '<p>Views and stories belong to no plateau: they follow the ' +
    noun +
    ' everywhere, so ' +
    (impact.views.length + impact.steps.length === 1
      ? 'this one cannot'
      : 'these ' + (impact.views.length + impact.steps.length) + ' cannot') +
    ' be drawn any more in the plateaus that keep the old reference:</p>' +
    list(
      impact.views
        .map((view) => '<li>the view ' + escapeHtml(view.label) + ' ' + code(view.id) + where(view.plateaus) + '</li>')
        .concat(
          impact.steps.map(
            (step) =>
              '<li>the story ' +
              escapeHtml(step.label) +
              ' ' +
              code(step.story) +
              ', step ' +
              step.number +
              where(step.plateaus) +
              '</li>'
          )
        )
    ) +
    (moving
      ? '<p class="muted">To keep them whole, go back, draw ' +
        (impact.plateaus.length === 1 ? 'that plateau' : 'each of these plateaus') +
        ' and move the element to the same place there: once every plateau that has it uses ' +
        code(impact.to) +
        ', the views are drawn in all of them. Or move here and repair the views in ' +
        (impact.plateaus.length === 1 ? 'that plateau' : 'those plateaus') +
        ' afterwards.</p>'
      : '<p class="muted">To keep them whole, cancel, draw ' +
        (impact.plateaus.length === 1 ? 'that plateau' : 'each of these plateaus') +
        ' and give the element the same new id there: once every plateau that has it uses ' +
        code(impact.to) +
        ', the views are drawn in all of them. Or rename here and repair the views in ' +
        (impact.plateaus.length === 1 ? 'that plateau' : 'those plateaus') +
        ' afterwards.</p>');
  return {
    title:
      (moving ? 'Move' : 'Rename') +
      ' “' +
      label +
      '”: ' +
      plural(impact.plateaus.length, 'plateau keeps', 'plateaus keep') +
      ' the old reference',
    body,
    actions: moving
      ? '<button type="button" data-action="dialog-cancel" data-dialog-autofocus>Back to Move</button><button type="button" class="btn-primary" data-action="dialog-submit">Move anyway</button>'
      : '<button type="button" data-action="dialog-cancel" data-dialog-autofocus>Cancel</button><button type="button" class="btn-primary" data-action="dialog-submit">Rename anyway</button>'
  };
}
