// ---- The recipe of a diagram ----

/** The properties of a view, in the order they are written, without the empty ones: two equal diagrams give equal text. */
function canonicalViewProperties(properties) {
  const source = isPlainObject(properties) ? properties : {};
  const out = {};
  if (typeof source.element === 'string' && source.element) out.element = source.element;
  for (const key of ['pinned', 'hidden', 'opened']) {
    const list = stringList(source[key]).slice().sort();
    if (list.length) out[key] = list;
  }
  if (typeof source.facet === 'string' && source.facet) out.facet = source.facet;
  if (source['hide-unlinked'] === true) out['hide-unlinked'] = true;
  for (const name of MAP_PARTS) if (source[name] === false) out[name] = false; // drawn is the default, so only `false` is a choice (issue #107)
  for (const name of DIAGRAM_SHOW_NAMES) if (typeof source[name] === 'boolean') out[name] = source[name];
  return out;
}

function canonicalViewDefinition(view) {
  const viewpoint = String(view.viewpoint);
  const properties = canonicalViewProperties(view.properties);
  // a text drawn as the default of that diagram says is not a choice: it is not remembered
  const defaults = DIAGRAM_SHOW_DEFAULTS[viewpoint === 'map' ? 'map' : 'elements'];
  for (const name of DIAGRAM_SHOW_NAMES) if (properties[name] === defaults[name]) delete properties[name];
  // only the Map of the technology layer draws the applications and the relationships of the model: the keys mean nothing anywhere else
  if (viewpoint !== 'map' || viewLayerOf(view) !== 'technology') for (const name of MAP_PARTS) delete properties[name];
  return { viewpoint, layer: viewLayerOf(view), properties };
}

/** What the diagram on screen is, as a view; null when no diagram is on screen (a page, a form). */
function currentViewDefinition() {
  const facetName = diagramFacet && currentDiagramFacet() ? diagramFacet : null;
  if (mapIsShown()) {
    const state = currentMapState();
    return canonicalViewDefinition({ viewpoint: 'map', layer: mapLayer(), properties: Object.assign({ pinned: state.pinned, hidden: state.hidden, opened: state.opened, facet: facetName, 'hide-unlinked': diagramHideUnlinked }, mapPartsShown(), diagramShowOverrides(true)) });
  }
  if (diagramTabShown()) {
    const sel = elementSelection();
    const record = findElementRecord(sel.key, sel.layer);
    return canonicalViewDefinition({ viewpoint: effectiveDiagramViewpoint(record), layer: layerOfReference(sel.key, sel.layer), properties: Object.assign({ element: sel.key, facet: facetName, 'hide-unlinked': diagramHideUnlinked }, diagramShowOverrides(false)) });
  }
  return null;
}

function viewMatchesScreen(view) {
  const current = currentViewDefinition();
  return !!current && JSON.stringify(canonicalViewDefinition(view)) === JSON.stringify(current);
}

/** A name for a view nobody named: the element and the viewpoint, or what the map is pinned on. */
function describeViewDefinition(view) {
  const definition = canonicalViewDefinition(view);
  const nameOf = (reference, layer) => {
    const record = AppState.index && AppState.index[layer] ? AppState.index[layer].get(reference) : null;
    return record ? (record.name || record.id) : reference;
  };
  let text;
  if (definition.viewpoint === 'map') {
    const pinned = stringList(definition.properties.pinned);
    text = pinned.length ? 'Map of ' + pinned.slice(0, 3).map((reference) => nameOf(reference, definition.layer)).join(', ') + (pinned.length > 3 ? ' and ' + (pinned.length - 3) + ' more' : '') : (definition.layer === 'technology' ? 'Map of the environments' : 'Map');
  } else {
    text = (definition.properties.element ? nameOf(definition.properties.element, definition.layer) : '(no element)') + ' — ' + capitalizeWord(definition.viewpoint);
  }
  return text + (definition.properties.facet ? ' (facet ' + definition.properties.facet + ')' : '');
}

function viewLabel(view) { return (typeof view.name === 'string' && view.name) || describeViewDefinition(view); }

/**
 * The elements of a plateau, by layer: `AppState.index` for the plateau drawn, else the model the plateau gives (a step is told at a plateau that is not the one on screen).
 * Null for the plateau drawn, which `viewProblem` reads from the page's state as it always did.
 */
function indexOfPlateau(plateau) {
  const layers = AppState.layers;
  if (plateau === null || plateau === undefined || !layers || plateau === layers.current) return AppState.index;
  return layerModelOf(plateau, AppState.workspace.settings).index;
}

/**
 * Why a saved view cannot be drawn now, or null when it can. `plateau` is the plateau it is looked at in (a step that is told at one, wave 015 run 0101): absent, the
 * plateau drawn. `name` is how the sentences call the view (default its id; a step with its own recipe is `step_NN`).
 */
function viewProblem(view, plateau, name) {
  if (!isPlainObject(view)) return 'This view does not exist.';
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const index = indexOfPlateau(plateau);
  const viewName = typeof name === 'string' ? name : view.id;
  if (view.viewpoint === 'map') {
    const pinned = stringList(properties.pinned);
    const layer = viewLayerOf(view);
    if (!pinned.length || pinned.some((reference) => index[layer].has(reference))) return null;
    return viewLacksInPlateau(pinned, layer, plateau) || 'None of the elements it was pinned on exists any more.';
  }
  if (!STORY_DIAGRAM_VIEWPOINTS.includes(view.viewpoint)) return 'The editor does not draw the viewpoint “' + view.viewpoint + '”.';
  const layer = viewLayerOf(view);
  if (typeof properties.element !== 'string' || !properties.element) return 'the view `' + viewName + '` has no element: write the reference of one in `properties.element`';
  if (!index[layer].has(properties.element)) {
    return viewLacksInPlateau([properties.element], layer, plateau) || 'the view `' + viewName + '` names `' + properties.element + '`, which does not exist';
  }
  return null;
}

/**
 * A view belongs to no plateau (wave 015, run 0100, issue #100), and the plateau drawn may lack what it names: the view then cannot be drawn *in this plateau*, which is no
 * mistake of the view (an entry of a map that the plateau lacks is simply left out). The sentence when the workspace has plateaus and a plateau declares what the view names,
 * else null (the element is gone altogether, or the workspace has one plateau). `references` are the names the plateau lacks, `plateau` the plateau looked at (a step told at
 * one, run 0101), else the plateau drawn.
 */
function viewLacksInPlateau(references, layer, plateau) {
  const named = plateau === null || plateau === undefined ? writingPlateau() : plateau;
  if (named === null) return null;
  const declared = declaredAnywhereCached()[layer];
  const there = references.filter((reference) => declared.has(reference));
  if (!there.length) return null;
  return (references.length === 1 ? 'The element “' + references[0] + '”' : 'The elements it was pinned on') + ' ' + (references.length === 1 ? 'is' : 'are') + ' not in the plateau “' + named + '”.';
}

/** Puts the editor where the view was saved. Returns why it cannot, or null once it is done (the caller redraws). */
function applySavedView(view) {
  const problem = viewProblem(view);
  if (problem) return problem;
  const properties = isPlainObject(view.properties) ? view.properties : {};
  diagramFacet = typeof properties.facet === 'string' && AppState.workspace.settings.facets.customs.some((facet) => facet.name === properties.facet) ? properties.facet : null;
  setDiagramShow(properties);
  diagramHideUnlinked = properties['hide-unlinked'] === true;
  if (view.viewpoint === 'map') {
    const layer = viewLayerOf(view); // the page Environments draws the technology layer, the page Applications the application layer
    const known = (list) => stringList(list).filter((reference) => AppState.index[layer].has(reference));
    const map = mapStateOf(layer);
    map.pinned = known(properties.pinned);
    map.hidden = known(properties.hidden);
    map.opened = new Set(known(properties.opened));
    if (layer === 'technology') technologyMapParts = mapPartsOf(view); // the view says `false` for what it leaves out, else it is drawn
    map.pinned.forEach((reference) => expandParentsOf(reference, layer));
    mapSelectionCheck = true;
    currentPerspective = layer === 'technology' ? 'environments' : 'map';
    useDiagramHost('main');
  } else {
    const layer = viewLayerOf(view);
    AppState.selection = { kind: 'element', key: properties.element, layer, mode: 'view' };
    elementTab = view.viewpoint;
    expandAncestorsOf(properties.element, layer);
    scrollNavToSelection = true;
    currentPerspective = 'elements';
    useDiagramHost('main');
  }
  if (rawYamlEditDraft) rawYamlEditDraft = null;
  if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
  return null;
}

// ---- Editing the lists (everything is in memory until "Save all changes") ----

/**
 * A new manifest of the editor's own kinds (a view, a story), in the first manifests folder, as a manifest with no `plateau:` is. A view and a story belong to no plateau
 * (wave 015, run 0100, issue #100): the plateau drawn decides neither the folder nor the header.
 */
function createManifestEntry(kind, content) {
  const header = { kind: ARCHICODE_KIND_PREFIX + kind, version: '1' };
  const manifestsDir = firstManifestsDir();
  const relPath = allocateManifestRelPath(manifestsDir === undefined ? 'manifests' : manifestsDir, kind + '.', content.id);
  const mf = { relPath, header, content, error: null, rawText: serializeManifestFile(header, content), dirty: true, existedOnDisk: false, lastKnownDiskModified: null };
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
    if (AppState.selection.kind === 'file' && AppState.selection.key === owner.relPath) AppState.selection = { kind: 'none', key: null, mode: 'view' };
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
  const existing = savedViews().find((view) => JSON.stringify(canonicalViewDefinition(view)) === JSON.stringify(definition));
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
  return createManifestEntry('story', { id: uniqueIdFor(name, takenEntryIds('story', 'stories'), 'story'), name, steps: [] });
}

function writableSteps(story) {
  if (!Array.isArray(story.steps)) story.steps = [];
  return story.steps;
}

/** How many steps of the stories show that view. */
function storiesUsingView(viewId) {
  return storiesList().reduce((count, story) => count + storySteps(story).filter((step) => step.view === viewId).length, 0);
}

/** A recipe (a view, or a step that carries one) follows a renamed element. True when it changed. */
function rewriteRecipeReferences(recipe, oldRef, newRef, layer) {
  const properties = recipe.properties;
  if (!isPlainObject(properties)) return false;
  let changed = false;
  const viewLayer = viewLayerOf(recipe);
  if (recipe.viewpoint !== 'map' && viewLayer === layer && typeof properties.element === 'string') {
    const element = rewriteReferenceValue(properties.element, oldRef, newRef);
    if (element !== properties.element) { properties.element = element; changed = true; }
  }
  if (recipe.viewpoint === 'map' && viewLayer === layer) {
    for (const key of ['pinned', 'hidden', 'opened']) {
      if (!Array.isArray(properties[key])) continue;
      const next = properties[key].map((reference) => rewriteReferenceValue(reference, oldRef, newRef));
      if (next.some((reference, i) => reference !== properties[key][i])) { properties[key] = next; changed = true; }
    }
  }
  return changed;
}

/**
 * An element was renamed: the saved views, and the steps that carry their own view, follow it (the Map's pinned,
 * hidden and open elements are of the layer of the view, and so is the element of any other view).
 */
function rewriteSavedViewReferences(oldRef, newRef, layer) {
  let changed = false;
  for (const view of savedViews()) {
    if (rewriteRecipeReferences(view, oldRef, newRef, layer)) { markEntryChanged(view); changed = true; }
  }
  for (const story of storiesList()) {
    let storyChanged = false;
    for (const step of Array.isArray(story.steps) ? story.steps : []) {
      if (isPlainObject(step) && !step.view && rewriteRecipeReferences(step, oldRef, newRef, layer)) storyChanged = true;
    }
    if (storyChanged) { markEntryChanged(story); changed = true; }
  }
  return changed;
}

/** The references a recipe (a view, or a step that carries one) names in `layer`: the ones `rewriteRecipeReferences` rewrites. Keep the two in step. */
function recipeNamedReferences(recipe, layer) {
  const properties = recipe.properties;
  if (!isPlainObject(properties) || viewLayerOf(recipe) !== layer) return [];
  if (recipe.viewpoint === 'map') return ['pinned', 'hidden', 'opened'].reduce((all, key) => all.concat(Array.isArray(properties[key]) ? properties[key] : []), []).filter((reference) => typeof reference === 'string');
  return typeof properties.element === 'string' ? [properties.element] : [];
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
  const lost = (recipe) => { // the plateaus where the recipe names an element that the rename takes the name of
    const named = recipeNamedReferences(recipe, layer).filter((reference) => rewriteReferenceValue(reference, oldRef, newRef) !== reference);
    return plateaus.filter((plateau) => named.some((reference) => plateau.references.includes(reference))).map((plateau) => plateau.id);
  };
  const views = [];
  for (const view of savedViews()) {
    const where = lost(view);
    if (where.length) views.push({ id: view.id, label: viewLabel(view), plateaus: where });
  }
  const steps = [];
  for (const story of storiesList()) {
    (Array.isArray(story.steps) ? story.steps : []).forEach((step, i) => {
      if (!isPlainObject(step) || step.view) return;
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
  const label = record ? (record.name || record.id) : dialog.reference;
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const keepers = impact.plateaus.map((plateau) => '<li>' + code(plateau.id) + (plateau.name ? ' ' + escapeHtml(plateau.name) : '') +
    (plateau.declaredIn && plateau.declaredIn !== plateau.id ? ' <span class="muted">(inherits it from ' + code(plateau.declaredIn) + ')</span>' : '') + '</li>');
  let body = '<p class="app-dialog-subject">' + code(impact.from) + ' becomes ' + code(impact.to) + ' in the plateau ' + code(impact.plateau) + ', and in the plateaus that stand on it.</p>' +
    '<p>' + (impact.plateaus.length === 1 ? 'This plateau does' : 'These ' + impact.plateaus.length + ' plateaus do') + ' not stand on ' + code(impact.plateau) + ' and still ' + (impact.plateaus.length === 1 ? 'has' : 'have') + ' ' + code(impact.from) + ' (the ' + noun + ' does not reach ' + (impact.plateaus.length === 1 ? 'it' : 'them') + '):</p>' + list(keepers) +
    '<p>Views and stories belong to no plateau: they follow the ' + noun + ' everywhere, so ' + (impact.views.length + impact.steps.length === 1 ? 'this one cannot' : 'these ' + (impact.views.length + impact.steps.length) + ' cannot') + ' be drawn any more in the plateaus that keep the old reference:</p>' +
    list(impact.views.map((view) => '<li>the view ' + escapeHtml(view.label) + ' ' + code(view.id) + where(view.plateaus) + '</li>')
      .concat(impact.steps.map((step) => '<li>the story ' + escapeHtml(step.label) + ' ' + code(step.story) + ', step ' + step.number + where(step.plateaus) + '</li>'))) +
    (moving
      ? '<p class="muted">To keep them whole, go back, draw ' + (impact.plateaus.length === 1 ? 'that plateau' : 'each of these plateaus') + ' and move the element to the same place there: once every plateau that has it uses ' + code(impact.to) + ', the views are drawn in all of them. Or move here and repair the views in ' + (impact.plateaus.length === 1 ? 'that plateau' : 'those plateaus') + ' afterwards.</p>'
      : '<p class="muted">To keep them whole, cancel, draw ' + (impact.plateaus.length === 1 ? 'that plateau' : 'each of these plateaus') + ' and give the element the same new id there: once every plateau that has it uses ' + code(impact.to) + ', the views are drawn in all of them. Or rename here and repair the views in ' + (impact.plateaus.length === 1 ? 'that plateau' : 'those plateaus') + ' afterwards.</p>');
  return {
    title: (moving ? 'Move' : 'Rename') + ' “' + label + '”: ' + plural(impact.plateaus.length, 'plateau keeps', 'plateaus keep') + ' the old reference',
    body,
    actions: moving
      ? '<button type="button" data-action="dialog-cancel" data-dialog-autofocus>Back to Move</button><button type="button" class="btn-primary" data-action="dialog-submit">Move anyway</button>'
      : '<button type="button" data-action="dialog-cancel" data-dialog-autofocus>Cancel</button><button type="button" class="btn-primary" data-action="dialog-submit">Rename anyway</button>'
  };
}

// ---- Editing a view from its page in the Library ----
// The attributes of a view are controls on its page (run 0029, TDD-0029). An edit changes the entry of the view in memory: it is marked
// changed like any entry (its manifest is re-serialised, "modified" shows, "Save all changes" writes it, "Cancel" gives it up), the
// page's recipe is built from that entry, so the diagram follows. Nothing the Map and Elements read is involved.

/** The view the page of the Library shows now (the Views side, a view open), or null. */
function libraryPageView() {
  return currentPerspective === 'library' && libraryTab === 'views' ? findSavedView(selectedViewId) : null;
}

function refuseViewEdit(view, field, text, typed) {
  viewEditNotice = { view: view.id, field, text, typed: typed === undefined ? null : String(typed) };
  return false;
}

/**
 * Applies `change(view, properties)` to the view of the page. `change` returns false when nothing changed (the same value, or a refusal said with
 * `refuseViewEdit`): then the view is not marked and the page is only redrawn to say the refusal. `later`: redraw a moment later. Returns whether the view changed.
 */
function editSavedView(change, later) {
  const view = libraryPageView();
  if (!view) return false;
  if (!isPlainObject(view.properties)) view.properties = {};
  viewEditNotice = null;
  const changed = change(view, view.properties) !== false;
  if (changed) markEntryChanged(view);
  if (!changed && !viewEditNotice) return false;
  if (later) { // see handleViewFieldChange: the button that is being pressed is still there, and "Save all changes" is already lit
    if (changed) syncSaveAllButtonsInPlace();
    setTimeout(() => { if (libraryPageView() === view) render(); }, 250);
  } else {
    render();
  }
  return changed;
}

/** The kind of diagram a viewpoint draws: it decides the defaults of the texts. */
function viewKindOf(view) {
  return view.viewpoint === 'map' ? 'map' : 'elements';
}

/**
 * The layer a view draws, or a step that carries its own recipe, or a view definition: `technology` or else `application`, and the `layer` is read in any case, as the command
 * line reads it (`layer: Technology` is the technology layer, wave 016 run 0108, issue #108). The one place the page reads the `layer` of a view; what is written is never changed
 * by it (a view is not rewritten because of the case of its layer).
 */
function viewLayerOf(view) {
  return entryLayerOf(view ? view.layer : undefined);
}

/** The texts a view draws: what it says, else the defaults of its kind of diagram. */
function shownTextsOf(view) {
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const defaults = DIAGRAM_SHOW_DEFAULTS[viewKindOf(view)];
  const shows = {};
  for (const name of DIAGRAM_SHOW_NAMES) shows[name] = typeof properties[name] === 'boolean' ? properties[name] : defaults[name];
  return shows;
}

/** A text of a view: the default of its kind of diagram is no choice, so it is not kept (the canonical form of the view). */
const VIEW_PROPERTY_ORDER = ['element', 'pinned', 'hidden', 'opened', 'facet', 'hide-unlinked'].concat(MAP_PARTS, DIAGRAM_SHOW_NAMES);

/**
 * Writes a property of a view. One the view already has keeps its place; one it has not (a default that an earlier edit took out, written again)
 * goes where the editor writes it, before the first property that follows it in that order, so that a property put back is not moved to the end
 * of the file. A key the editor does not know goes last.
 */
function putViewProperty(properties, key, value) {
  if (Object.prototype.hasOwnProperty.call(properties, key)) { properties[key] = value; return; }
  const rank = VIEW_PROPERTY_ORDER.indexOf(key);
  const keys = Object.keys(properties);
  const before = rank < 0 ? undefined : keys.find((other) => VIEW_PROPERTY_ORDER.indexOf(other) > rank);
  if (before === undefined) { properties[key] = value; return; }
  const kept = keys.map((other) => [other, properties[other]]);
  for (const other of keys) delete properties[other];
  for (const [other, current] of kept) {
    if (other === before) properties[key] = value;
    properties[other] = current;
  }
}

function setViewShow(view, name, value) {
  const properties = view.properties;
  if (value === DIAGRAM_SHOW_DEFAULTS[viewKindOf(view)][name]) {
    if (!(name in properties)) return false;
    delete properties[name];
    return true;
  }
  if (properties[name] === value) return false;
  putViewProperty(properties, name, value);
  return true;
}

function setViewHideUnlinked(view, value) {
  const properties = view.properties;
  if (!value) {
    if (!('hide-unlinked' in properties)) return false;
    delete properties['hide-unlinked'];
    return true;
  }
  if (properties['hide-unlinked'] === true) return false;
  putViewProperty(properties, 'hide-unlinked', true);
  return true;
}

/** Draws (or leaves out) the applications or the relationships of a Map view of the technology layer: drawn is the default, so only `false` is written (issue #107). */
function setViewMapPart(view, part, drawn) {
  if (view.viewpoint !== 'map' || !MAP_PARTS.includes(part)) return false;
  const properties = view.properties;
  if (drawn) {
    if (!(part in properties)) return false;
    delete properties[part];
    return true;
  }
  if (properties[part] === false) return false;
  putViewProperty(properties, part, false);
  return true;
}

function setViewFacet(view, name) {
  const properties = view.properties;
  if (!name) {
    if (!('facet' in properties)) return false;
    delete properties.facet;
    return true;
  }
  if (properties.facet === name) return false;
  putViewProperty(properties, 'facet', name);
  return true;
}

/** The element a view is about (the element viewpoints). A reference that is not an element of the view's layer is refused. */
function setViewElement(view, reference) {
  if (view.viewpoint === 'map') return false;
  const layer = viewLayerOf(view);
  const wanted = String(reference).trim();
  if (!wanted) return refuseViewEdit(view, 'element', 'Type the reference of an element.', reference);
  if (!AppState.index[layer].has(wanted)) return refuseViewEdit(view, 'element', '“' + wanted + '” is not an element of the ' + layer + ' layer.', wanted);
  if (view.properties.element === wanted) return false;
  putViewProperty(view.properties, 'element', wanted);
  return true;
}

/**
 * The layer of a view. An element viewpoint: the element stays when it exists in the other layer, else the view needs one. The Map: the pinned, hidden
 * and open elements that are elements of the other layer stay, the others go (they named elements of the layer the Map no longer draws).
 */
function setViewLayer(view, layer) {
  if ((layer !== 'application' && layer !== 'technology') || viewLayerOf(view) === layer) return false;
  view.layer = layer;
  if (view.viewpoint === 'map') {
    for (const list of VIEW_LISTS) {
      if (!Array.isArray(view.properties[list])) continue;
      const kept = view.properties[list].filter((reference) => AppState.index[layer].has(reference));
      if (kept.length) view.properties[list] = kept; else delete view.properties[list];
    }
    if (layer !== 'technology') for (const part of MAP_PARTS) delete view.properties[part]; // only the Map of the technology layer draws the applications and the relationships of the model (issue #107)
  } else if (typeof view.properties.element !== 'string' || !AppState.index[layer].has(view.properties.element)) delete view.properties.element;
  return true;
}

/**
 * The viewpoint. Between the three element viewpoints only the viewpoint changes. To the Map the element becomes the pinned element (the Map is the one
 * of the layer of the view); back from it the first pinned element becomes the element and the Map's lists go. What the view showed of the texts is kept:
 * the two kinds of diagram have other defaults.
 */
function setViewViewpoint(view, viewpoint) {
  if (viewpoint !== 'map' && !STORY_DIAGRAM_VIEWPOINTS.includes(viewpoint)) return false;
  if (view.viewpoint === viewpoint) return false;
  const properties = view.properties;
  const shows = shownTextsOf(view);
  if (viewpoint === 'map' && view.viewpoint !== 'map') {
    const element = properties.element;
    const pinned = typeof element === 'string' && element ? [element] : [];
    delete properties.element;
    if (pinned.length) putViewProperty(properties, 'pinned', pinned);
  } else if (viewpoint !== 'map' && view.viewpoint === 'map') {
    const first = stringList(properties.pinned).find((reference) => AppState.index[viewLayerOf(view)].has(reference)); // the first pin that is still an element, in the order of the file
    for (const key of ['pinned', 'hidden', 'opened'].concat(MAP_PARTS)) delete properties[key]; // the Map's own keys go with it
    if (first) putViewProperty(properties, 'element', first); else delete properties.element;
  }
  view.viewpoint = viewpoint;
  for (const name of DIAGRAM_SHOW_NAMES) setViewShow(view, name, shows[name]);
  return true;
}

const VIEW_LISTS = ['pinned', 'hidden', 'opened'];

/** Adds an element of the layer of the view to the pinned, hidden or opened elements of a Map view, or takes one out. A reference that is not an element of that layer is refused. */
function setViewListItem(view, list, reference, add) {
  if (view.viewpoint !== 'map' || !VIEW_LISTS.includes(list)) return false;
  const items = stringList(view.properties[list]);
  const wanted = String(reference).trim();
  if (add) {
    if (!wanted) return false;
    if (!AppState.index[viewLayerOf(view)].has(wanted)) return refuseViewEdit(view, list, '“' + wanted + '” is not an element of the ' + viewLayerOf(view) + ' layer.', wanted);
    if (items.includes(wanted)) return refuseViewEdit(view, list, '“' + wanted + '” is already there.', wanted);
    putViewProperty(view.properties, list, items.concat(wanted));
    return true;
  }
  if (!items.includes(wanted)) return false;
  const rest = items.filter((item) => item !== wanted);
  if (rest.length) view.properties[list] = rest; else delete view.properties[list];
  return true;
}

/**
 * A control of the form of a view was changed (a select, a checkbox, a text committed by Enter or by leaving it). A text committed by leaving
 * it for another control is applied at once but redrawn a moment later: the redraw replaces the controls, and the click that made the text
 * lose the focus (Save all changes, a tab, a button) must still land on the control it was made on. `immediate`: redraw now.
 */
function handleViewFieldChange(control, immediate) {
  const field = control.getAttribute('data-view-field');
  const list = control.getAttribute('data-view-list');
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  // the focus is on another control already, or a pointer button is down on something else: the text is being left by a click that is not over
  // yet (Firefox says the focus is on the body while the field loses it, and a redraw then replaces the button before its click)
  const pressed = !!pointerPressedOn && pointerPressedOn !== control && !(control.contains && control.contains(pointerPressedOn));
  const left = pressed || (!!active && active !== control && active !== document.body);
  if (control.id && !left) pendingFocusSelector = '#' + control.id;
  const isText = control.tagName === 'INPUT' && control.type === 'text';
  const later = isText && left && !immediate;
  let changed;
  const apply = (change) => { changed = editSavedView(change, later); };
  if (list) {
    const reference = control.value;
    control.value = '';
    apply((view) => setViewListItem(view, list, reference, true));
  }
  else if (field === 'viewpoint') apply((view) => setViewViewpoint(view, control.value));
  else if (field === 'layer') apply((view) => setViewLayer(view, control.value));
  else if (field === 'element') apply((view) => setViewElement(view, control.value));
  else if (field === 'facet') apply((view) => setViewFacet(view, control.value));
  else if (field === 'hide-unlinked') apply((view) => setViewHideUnlinked(view, !!control.checked));
  else if (field && field.startsWith('part:') && MAP_PARTS.includes(field.slice(5))) apply((view) => setViewMapPart(view, field.slice(5), !!control.checked));
  else if (field && field.startsWith('show:') && DIAGRAM_SHOW_NAMES.includes(field.slice(5))) apply((view) => setViewShow(view, field.slice(5), !!control.checked));
  return changed;
}

/**
 * A text typed in a field of the form of a view is applied when the field is left, and the click that leaves it may be on Save all changes:
 * a disabled button takes no click, and the edit lights it only after the click is lost. So Save is lit, where it is, as soon as something is
 * typed. If the text turns out to be refused or unchanged, the next redraw dims it again.
 */
function lightSaveForTypedViewText() {
  const button = document.querySelector('[aria-label="Changes"] [data-action="save-all-changes"]');
  if (!button || !button.disabled || saveInFlight) return;
  button.disabled = false;
  button.title = 'Applies what you typed, then writes it to disk.';
}

/** What a pointer button is down on, from its press to its release (null otherwise): a field that loses its focus to a click says so by it. */
let pointerPressedOn = null;
function notePointer(e) { pointerPressedOn = e.type === 'pointerdown' ? e.target : null; }
document.addEventListener('pointerdown', notePointer, true);
document.addEventListener('pointerup', notePointer, true);
document.addEventListener('pointercancel', notePointer, true);

/** Delegated `change` listener: the form of a view on its page, the list of Settings. (The menu of the steps of a story is the player's, `handleStoryPlayerChange`.) */
function handleAppChange(e) {
  if (e.target && e.target.matches && e.target.matches('[data-settings-current]')) { chooseCurrentPlateau(e.target); return; }
  const control = e.target && e.target.closest ? e.target.closest('[data-view-field], [data-view-list]') : null;
  if (control) handleViewFieldChange(control);
}

/** A text field of a story, typed in: the model follows at once (there is no form to apply), and "Save all changes" lights up. */
function updateStoryField(field) {
  const story = findStory(field.getAttribute('data-story'));
  if (!story) return;
  const name = field.getAttribute('data-story-field');
  const value = field.value;
  let target = story;
  let key = name;
  if (name === 'step-text') {
    target = Array.isArray(story.steps) ? story.steps[Number(field.getAttribute('data-step'))] : null;
    key = 'text';
  } else if (name !== 'name' && name !== 'description') {
    return;
  }
  if (!isPlainObject(target)) return;
  if (value === '') delete target[key]; else target[key] = value;
  markEntryChanged(story);
  refreshSaveAllButton();
}

// ---- Dialogs: the editor's own, in place of prompt() ----

const NEW_STORY_CHOICE = '__new__';

/** How to find the control of an action again after a redraw: its action, and what tells its twins apart. */
function actionSelectorOf(el) {
  const control = el && el.closest ? el.closest('[data-action]') : null;
  if (!control) return null;
  let selector = '[data-action="' + control.getAttribute('data-action') + '"]';
  for (const attribute of ['data-story', 'data-view', 'data-step', 'data-perspective']) {
    const value = control.getAttribute(attribute);
    if (value !== null && value !== '') selector += '[' + attribute + '="' + String(value).replace(/"/g, '\\"') + '"]';
  }
  return selector;
}

function openAppDialog(dialog) {
  if (dialog.kind === 'layer-confirm' || dialog.kind === 'rename-siblings') { // the form of the element, as typed (wave 017, run 0121, #123)
    // a write that was tried and put back has already drawn the form afresh (`guardedLayerWrite`), so it hands over the copy it took before it wrote
    keptElementForm = dialog.typedForm !== undefined ? dialog.typedForm : keepElementForm();
    dialog = Object.assign({}, dialog);
    delete dialog.typedForm;
  }
  appDialog = Object.assign({ returnFocus: actionSelectorOf(typeof document !== 'undefined' ? document.activeElement : null) }, dialog);
  render();
}

/** The fields of the form of the element on screen, in the order the page draws them. */
function elementFormFields() {
  const form = typeof document !== 'undefined' && document.querySelector ? document.querySelector('.element-edition-form') : null;
  return form && form.querySelectorAll ? Array.from(form.querySelectorAll('input, textarea, select')) : [];
}

/** What tells a field from the next one when the form is drawn again from the same model: its id, its class, the row of a relationship and its placeholder. */
function elementFormFieldSignature(field) {
  const attribute = (name) => (field.getAttribute ? field.getAttribute(name) : null) || '';
  const row = field.closest ? field.closest('[data-index]') : null;
  return [field.id || '', field.className || '', row && row.getAttribute ? row.getAttribute('data-index') || '' : '', attribute('placeholder')].join('|');
}

function elementFormFieldValue(field) {
  return field.type === 'checkbox' || field.type === 'radio' ? !!field.checked : String(field.value === undefined || field.value === null ? '' : field.value);
}

/** The values of the form of the element in edition on screen, or null when there is none. */
function keepElementForm() {
  const selection = AppState.selection;
  if (!selection || selection.kind !== 'element' || selection.mode !== 'edit') return null;
  const fields = elementFormFields();
  if (fields.length === 0) return null;
  return { reference: selection.key, layer: selection.layer || null, fields: fields.map((field) => ({ signature: elementFormFieldSignature(field), value: elementFormFieldValue(field) })) };
}

/** Puts the kept values back in the form just drawn, when it is the form of the same element and has the same fields; lights Save when one of them differs from the model. */
function restoreElementForm() {
  const kept = keptElementForm;
  if (!kept) return;
  if (!appDialog) keptElementForm = null; // the dialog is gone: this is the last time
  const selection = AppState.selection;
  if (!selection || selection.kind !== 'element' || selection.mode !== 'edit' || selection.key !== kept.reference || (selection.layer || null) !== kept.layer) return;
  const fields = elementFormFields();
  if (fields.length !== kept.fields.length) return;
  let typed = false;
  fields.forEach((field, i) => {
    if (elementFormFieldSignature(field) !== kept.fields[i].signature) return;
    const value = kept.fields[i].value;
    if (elementFormFieldValue(field) === value) return;
    if (typeof value === 'boolean') field.checked = value; else field.value = value;
    typed = true;
  });
  if (typed) {
    draftTyped = true;
    if (typeof refreshSaveAllButton === 'function') refreshSaveAllButton();
  }
}

function closeAppDialog() {
  if (appDialog && appDialog.back) { // the question a Move asks (`renameSiblingImpact`): "Back to Move" gives the Move dialog as it was, with the parent chosen and what was typed in its search
    const back = appDialog.back;
    keptElementForm = null; // the form behind was applied before the Move dialog opened
    appDialog = back;
    pendingFocusSelector = null;
    render();
    return;
  }
  pendingFocusSelector = appDialog ? appDialog.returnFocus : null;
  appDialog = null;
  render();
}

function openTextDialog(title, label, value, confirmLabel, onSubmit) {
  openAppDialog({ kind: 'text', title, label, value, confirmLabel, onSubmit });
}

function renderAppDialogHtml() {
  if (!appDialog) return '';
  let title = appDialog.title;
  let body;
  let confirmLabel = appDialog.confirmLabel;
  let actions = null;
  if (appDialog.kind === 'move') {
    const move = renderMoveDialogBodyHtml(appDialog);
    title = move.title;
    body = move.body;
    actions = move.actions;
  } else if (appDialog.kind === 'mistakes') {
    title = 'Mistakes in the plateaus';
    body = renderMistakesDialogBodyHtml();
    actions = '<button type="button" class="btn-primary" data-action="dialog-cancel" data-dialog-autofocus>Close</button>';
  } else if (appDialog.kind === 'layer-confirm') {
    title = 'Writing in ' + appDialog.plateau + ' changes other plateaus';
    confirmLabel = 'Write in ' + appDialog.plateau;
    body = '<p class="app-dialog-subject">' + escapeHtml(appDialog.summary) + '</p>' +
      '<p>' + (appDialog.changed.length === 1 ? 'The plateau that inherits it changes too:' : 'The ' + appDialog.changed.length + ' plateaus that inherit it change too:') + '</p>' +
      '<ul class="layer-confirm-list">' + appDialog.changed.map((id) => '<li><code>' + escapeHtml(id) + '</code>' + (layerPlateauModel(id).name ? ' ' + escapeHtml(layerPlateauModel(id).name) : '') + '</li>').join('') + '</ul>';
  } else if (appDialog.kind === 'rename-siblings') {
    const renaming = renderRenameSiblingsDialogHtml(appDialog);
    title = renaming.title;
    body = renaming.body;
    actions = renaming.actions;
  } else if (appDialog.kind === 'plateau-delete') {
    const deletion = renderPlateauDeleteDialogHtml(appDialog);
    title = deletion.title;
    body = deletion.body;
    actions = deletion.actions;
  } else if (appDialog.kind === 'plateau-form') {
    const v = appDialog.values;
    const creating = appDialog.mode === 'create';
    const tree = AppState.plateauTree;
    const choices = bandOrderOf(tree).filter((id) => creating || (id !== appDialog.plateau && !layerIsBelow(id, appDialog.plateau)));
    title = creating ? 'New plateau' : 'Edit the plateau ' + plateauTitle(layerPlateauModel(appDialog.plateau));
    confirmLabel = creating ? 'Create plateau' : 'Save plateau';
    body = (creating
        ? '<label class="app-dialog-field" for="plateau-form-id">Id (lowercase letters, digits, - and _)</label><input type="text" id="plateau-form-id" data-dialog-field="id" data-dialog-autofocus autocomplete="off" value="' + escapeHtml(v.id) + '">'
        : '<p class="app-dialog-subject"><code>' + escapeHtml(appDialog.plateau) + '</code></p>') +
      '<label class="app-dialog-field" for="plateau-form-name">Name</label><input type="text" id="plateau-form-name" data-dialog-field="name"' + (creating ? '' : ' data-dialog-autofocus') + ' autocomplete="off" value="' + escapeHtml(v.name) + '">' +
      '<label class="app-dialog-field" for="plateau-form-horizon">Horizon (a label: 2026-Q4, 2027, …)</label><input type="text" id="plateau-form-horizon" data-dialog-field="horizon" autocomplete="off" value="' + escapeHtml(v.horizon) + '">' +
      (appDialog.plateau === BASELINE_PLATEAU ? '' :
        '<label class="app-dialog-field" for="plateau-form-parent">Overrides</label><select id="plateau-form-parent" data-dialog-field="parent">' +
        choices.map((id) => '<option value="' + escapeHtml(id) + '"' + (id === v.parent ? ' selected' : '') + '>' + escapeHtml(plateauTitle(layerPlateauModel(id))) + (plateauTitle(layerPlateauModel(id)) !== id ? ' (' + escapeHtml(id) + ')' : '') + '</option>').join('') + '</select>');
  } else if (appDialog.kind === 'story-picker') {
    const stories = storiesSorted();
    const preferred = (activeStory && stories.find((story) => story.id === activeStory.id)) || stories.find((story) => story.id === selectedStoryId) || stories[0] || null;
    const definition = currentViewDefinition();
    title = 'Add this diagram to a story';
    confirmLabel = 'Add to story';
    body = (definition ? '<p class="app-dialog-subject">' + escapeHtml(describeViewDefinition(definition)) + '</p>' : '') +
      '<fieldset class="app-dialog-choices"><legend>Story</legend>' +
      stories.map((story) => {
        const count = storySteps(story).length;
        return '<label class="app-dialog-choice"><input type="radio" name="story-choice" value="' + escapeHtml(story.id) + '"' + (preferred && story.id === preferred.id ? ' checked data-dialog-autofocus' : '') + '>' +
          '<span>' + escapeHtml(storyLabel(story)) + ' <small>' + count + (count === 1 ? ' step' : ' steps') + '</small></span></label>';
      }).join('') +
      '<label class="app-dialog-choice"><input type="radio" name="story-choice" value="' + NEW_STORY_CHOICE + '"' + (preferred ? '' : ' checked') + '><span>New story</span></label>' +
      '<input type="text" class="app-dialog-new" data-dialog-new' + (preferred ? '' : ' data-dialog-autofocus') + ' aria-label="Name of the new story" placeholder="Name of the new story">' +
      '</fieldset>' + storyPlateauChoiceHtml();
  } else {
    body = '<label class="app-dialog-field" for="app-dialog-text">' + escapeHtml(appDialog.label) + '</label>' +
      '<input type="text" id="app-dialog-text" data-dialog-text data-dialog-autofocus value="' + escapeHtml(appDialog.value || '') + '">';
  }
  return '<div class="app-dialog-backdrop"><div class="app-dialog' + (appDialog.kind === 'move' || appDialog.kind === 'layer-confirm' || appDialog.kind === 'rename-siblings' || appDialog.kind === 'mistakes' || appDialog.kind === 'plateau-delete' ? ' app-dialog-wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title">' +
    '<h2 id="app-dialog-title">' + escapeHtml(title) + '</h2>' + body +
    '<div class="app-dialog-error" id="app-dialog-error" role="alert">' + (appDialog.error ? escapeHtml(appDialog.error) : '') + '</div>' +
    '<div class="app-dialog-actions">' + (actions !== null ? actions :
      '<button type="button" data-action="dialog-cancel">Cancel</button>' +
      '<button type="button" class="btn-primary" data-action="dialog-submit">' + escapeHtml(confirmLabel || 'OK') + '</button>') + '</div>' +
  '</div></div>';
}

function readAppDialogValues() {
  const text = document.querySelector('[data-dialog-text]');
  const choice = document.querySelector('input[name="story-choice"]:checked');
  const newName = document.querySelector('[data-dialog-new]');
  const fields = {}; // the form of a plateau (wave 014, run 0082)
  for (const field of Array.from(document.querySelectorAll('[data-dialog-field]'))) fields[field.getAttribute('data-dialog-field')] = field.value;
  const plateaus = document.querySelector('[data-dialog-plateaus]'); // the box of the story picker (wave 016, run 0111, #110)
  return { text: text ? text.value : '', choice: choice ? choice.value : '', newName: newName ? newName.value : '', fields, withPlateaus: !!(plateaus && plateaus.checked) };
}

/** Does what the dialog asked for, with the values typed in it (read from the page unless they are given). */
function submitAppDialog(values) {
  const dialog = appDialog;
  if (!dialog || dialog.kind === 'move') return;
  if (dialog.kind === 'mistakes') { closeAppDialog(); return; }
  const v = values || readAppDialogValues();
  const fail = (message) => {
    const line = document.getElementById('app-dialog-error');
    if (line) line.textContent = message;
  };
  if (dialog.kind === 'layer-confirm' || dialog.kind === 'rename-siblings') { // the author says yes to the plateaus a write changes (see `guardedLayerWrite`), or to the views a rename leaves behind (`renameSiblingImpact`)
    keptElementForm = null; // the write is the draft's own, read before the dialog opened
    appDialog = null;
    pendingFocusSelector = dialog.returnFocus;
    confirmLayerWrite(dialog);
    return;
  }
  if (dialog.kind === 'plateau-delete') {
    let result;
    try {
      result = commitPlateauDelete(dialog.plateau, { listed: true }); // the dialog has said what the plateaus above lose: that is not asked again
    } catch (e) {
      fail(e && e.message ? e.message : String(e));
      return;
    }
    if (result && result.pending) return; // the dialog of the plateaus it changes has taken this one's place
    appDialog = null;
    pendingFocusSelector = dialog.returnFocus;
    render();
    return;
  }
  if (dialog.kind === 'plateau-form') {
    const f = v.fields || {};
    const spec = { id: dialog.mode === 'create' ? f.id : dialog.plateau, name: f.name, horizon: f.horizon, parent: dialog.plateau === BASELINE_PLATEAU ? null : f.parent };
    let result;
    try {
      result = dialog.mode === 'create' ? commitPlateauCreate(spec) : commitPlateauEdit(spec);
    } catch (e) {
      fail(e && e.message ? e.message : String(e));
      return;
    }
    if (result && result.pending) return; // the dialog of the plateaus it changes has taken this one's place
    appDialog = null;
    pendingFocusSelector = dialog.returnFocus;
    if (dialog.mode === 'create') drawPlateau(String(spec.id).trim()); else render();
    return;
  }
  if (dialog.kind === 'story-picker') {
    const name = String(v.newName || '').trim();
    if (v.choice === NEW_STORY_CHOICE && !name) { fail('Name the new story.'); return; }
    appDialog = null;
    pendingFocusSelector = dialog.returnFocus;
    addCurrentViewToStoryChoice(v.choice === NEW_STORY_CHOICE ? { newName: name, withPlateaus: !!v.withPlateaus } : { storyId: v.choice, withPlateaus: !!v.withPlateaus });
    return;
  }
  const text = String(v.text || '').trim();
  if (!text) { fail('Type a name.'); return; }
  appDialog = null;
  pendingFocusSelector = dialog.returnFocus;
  dialog.onSubmit(text);
}

function handleAppDialogKeydown(e) {
  if (!appDialog) return;
  if (e.key === 'Escape') {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    closeAppDialog();
    return;
  }
  if (e.key === 'Enter' && e.target && e.target.matches && e.target.matches('input[type="text"]')) {
    e.preventDefault();
    if (appDialog.kind !== 'move') submitAppDialog(); // the search of the Move dialog does not move anything by itself
    return;
  }
  if (e.key === 'Tab') { // the page behind the dialog is not reachable: the focus goes round
    const dialog = document.querySelector('.app-dialog');
    const items = dialog ? Array.from(dialog.querySelectorAll('input, button')).filter((el) => !el.disabled) : [];
    if (!items.length) return;
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
  }
}
document.addEventListener('keydown', handleAppDialogKeydown, true);

// ---- Actions ----

function storiesSorted() {
  return storiesList().slice().sort((a, b) => storyLabel(a).localeCompare(storyLabel(b), undefined, { sensitivity: 'base' }));
}

function savedViewsSorted() {
  return savedViews().slice().sort((a, b) => viewLabel(a).localeCompare(viewLabel(b), undefined, { sensitivity: 'base' }));
}

/** Has this entry changed in memory since it was read (its manifest, or .archicode.yaml for an older one)? */
function entryIsModified(entry) {
  const owner = entryOwners.get(entry);
  return owner ? !!owner.dirty : !!(AppState.workspace && AppState.workspace.settingsDirty);
}

/** Keeps the diagram on screen as a named view: asks its name. */
function nameCurrentView() {
  const definition = currentViewDefinition();
  if (!definition) return;
  const existing = savedViews().find((view) => JSON.stringify(canonicalViewDefinition(view)) === JSON.stringify(definition));
  if (existing) {
    alert('This diagram is already saved as “' + viewLabel(existing) + '”. Rename it in Stories.');
    return;
  }
  openTextDialog('Name this view', 'It is kept in a file of its own, to be put in stories.', describeViewDefinition(definition), 'Save view', (name) => {
    const current = currentViewDefinition();
    if (current) viewForDefinition(current, name);
    render();
  });
}

/** Asks which story the diagram on screen goes in. */
function addCurrentViewToStory() {
  if (!currentViewDefinition()) return;
  openAppDialog({ kind: 'story-picker' });
}

/**
 * What *Add to story...* can write of the plateaus (wave 016, run 0111, issue #110, the author's decision of 2026-10-20): the keys `at` (the plateau drawn) and `against` (the
 * plateau compared with) of run 0101, which name plateaus by id, not modes. Null when the workspace has no plateau (it writes no key and shows no box). Otherwise
 * `{ blocked }` (the plateaus cannot be drawn: the sentence, no box), or `{ at, against, note, problem, checked }`: `against` is null when the page cannot name a comparison
 * (none on screen, the future still to choose, a plateau that is gone, the plateau drawn itself), `note` says why when a comparison was asked for and cannot be named,
 * `problem` is what `stepPlateauProblem` says of the two keys (the box is then off and cannot be ticked), and `checked` is the default of the box: a comparison is on screen.
 * A comparison that follows the plateau drawn (the past, the future) is written as the plateau it is now.
 */
function storyStepPlateaus() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !tree || !tree.layered) return null;
  if (layers.blocked) return { blocked: oneLine(layers.blocked) };
  const other = layerCompareOther();
  const against = other ? other.id : null;
  let note = null;
  const asked = layers.compare;
  if (asked && against === null) {
    if (asked.mode === 'future' && !asked.other) note = 'The comparison with the future waits for a plateau to be chosen, so no plateau is named for it.';
    else if (asked.other && asked.other === layers.current) note = 'The plateau compared with is the plateau drawn: nothing is compared, so no plateau is named for it.';
    else if (asked.other && !tree.nodes.has(asked.other)) note = 'The plateau compared with is not a plateau of this workspace any more, so no plateau is named for it.';
  }
  // the plateau drawn first: if it cannot be told, nothing is written; if only the plateau compared with cannot, the step is told at the plateau drawn and `against` is left out, with the reason
  const foundAt = stepPlateauProblem({ at: layers.current });
  let named = against;
  if (!foundAt && named !== null) {
    const foundAgainst = stepPlateauProblem({ at: layers.current, against: named });
    if (foundAgainst) { named = null; note = foundAgainst.problem + ' No plateau is named for the comparison.'; }
  }
  return { at: layers.current, against: named, note, problem: foundAt ? foundAt.problem : null, checked: !foundAt && named !== null };
}

/** The box of the story picker: keep the plateau drawn, and the plateau compared with, in the step. Empty when the workspace has no plateau. */
function storyPlateauChoiceHtml() {
  const offer = storyStepPlateaus();
  if (!offer) return '';
  if (offer.blocked) return '<p class="settings-help app-dialog-plateaus-note">The plateaus cannot be drawn (' + escapeHtml(offer.blocked) + '), so the step is added without a plateau.</p>';
  const code = (id) => '<code>' + escapeHtml(id) + '</code>';
  const label = offer.against === null ? 'Tell the step at the plateau drawn, ' + code(offer.at) : 'Tell the step at ' + code(offer.at) + ', compared with ' + code(offer.against);
  return '<label class="app-dialog-choice app-dialog-plateaus"><input type="checkbox" data-dialog-plateaus' + (offer.checked ? ' checked' : '') + (offer.problem ? ' disabled' : '') + '><span>' + label + '</span></label>' +
    '<p class="settings-help app-dialog-plateaus-note">' + (offer.problem ? escapeHtml(offer.problem) + ' ' : '') + (offer.note ? escapeHtml(offer.note) + ' ' : '') +
    'The step names plateaus by id: a comparison that follows the plateau drawn (the past, the future) is written as the plateau it is now.</p>';
}

/**
 * Puts the diagram on screen in a story (an existing one, or a new one, found by its name before it is created), after
 * the step being told, else at the end. Says where it went, and opens the words of the step to type. With `choice.withPlateaus` (the box of the picker, offered when the workspace
 * has plateaus) the step is told at the plateau drawn and compared with the plateau compared with, as `at` and `against` (run 0111, #110).
 */
function addCurrentViewToStoryChoice(choice) {
  const definition = currentViewDefinition();
  let story = choice.storyId ? findStory(choice.storyId) : null;
  if (!story && choice.newName) {
    const wanted = choice.newName.trim().toLowerCase();
    story = storiesList().find((entry) => storyLabel(entry).trim().toLowerCase() === wanted) || createStory(choice.newName.trim());
  }
  if (!definition || !story) { render(); return; }
  // a view that was named is pointed at; any other diagram goes in the step itself: no file for each diagram of a story
  const named = savedViews().find((view) => JSON.stringify(canonicalViewDefinition(view)) === JSON.stringify(definition));
  const step = named ? { view: named.id } : { viewpoint: definition.viewpoint, layer: definition.layer, properties: definition.properties };
  const plateaus = choice.withPlateaus ? storyStepPlateaus() : null;
  const keeps = !!plateaus && !plateaus.blocked && !plateaus.problem;
  if (keeps) {
    step.at = plateaus.at;
    if (plateaus.against !== null) step.against = plateaus.against;
  }
  const steps = writableSteps(story);
  const at = activeStory && activeStory.id === story.id ? Math.min(activeStory.step + 1, steps.length) : steps.length;
  steps.splice(at, 0, step);
  activeStory = { id: story.id, step: at };
  selectedStoryId = story.id;
  storyBarEditing = true;
  storyBarNotice = 'Added as step ' + (at + 1) + ' of “' + storyLabel(story) + '”' + (keeps ? ', told at ' + plateaus.at + (plateaus.against !== null ? ', compared with ' + plateaus.against : '') : '') + '.';
  pendingFocusSelector = '.story-bar-text';
  markEntryChanged(story);
  render();
}

/**
 * What is drawn now, as far as a step is concerned (wave 015, run 0101): the plateau, and the plateau it is compared with (null: nothing, or the future that is not chosen yet).
 */
function currentPlateauDrawing() {
  const layers = AppState.layers;
  if (!layers) return null;
  const other = layerCompareOther();
  return { plateau: layers.current, against: other ? other.id : null };
}

/**
 * What the reader chose before a story was told, kept while it is told (`goToStoryStep`): a step that names no plateau is drawn there, as one that names `at` is drawn at
 * its plateau. `story` is the story walked, `set` what the last step drew (so that a plateau or a comparison the reader chose on the band in the middle of the story is the
 * new home, and not overwritten by the next step).
 */
let storyHome = null;

/** The plateau and the comparison a step draws: `at` and `against` as the step says them, else the home (what was drawn before the story, or what the reader chose since). */
function stepDrawing(step, home) {
  const keys = stepPlateauKeys(step);
  const plateau = keys.at !== null ? keys.at : home.plateau;
  // a step that is told at a plateau of its own is a comparison only when it says so; one that says nothing is drawn as the reader had it
  const against = keys.against !== null ? keys.against : keys.at !== null ? null : home.against;
  return { plateau, against: against === plateau ? null : against };
}

/** Where the home is for the step about to be drawn in the story: what was drawn when the story began, unless the reader changed it since. */
function homeOfStory(storyId) {
  const now = currentPlateauDrawing();
  if (!now) return null;
  if (!storyHome || storyHome.story !== storyId || !activeStory || activeStory.id !== storyId) storyHome = { story: storyId, plateau: now.plateau, against: now.against, set: now };
  else if (storyHome.set && (storyHome.set.plateau !== now.plateau || storyHome.set.against !== now.against)) { storyHome.plateau = now.plateau; storyHome.against = now.against; }
  return storyHome;
}

/**
 * Draws the plateau and the comparison of a step, when it has something to say about them (or the reader moved them since the story began): the plateau is drawn as the band
 * draws it, without an entry in the history (the step is the entry). A step with a plateau that is none, or one the editor cannot draw, changes nothing: the bar says why.
 */
function drawPlateausOfStep(storyId, step) {
  const home = homeOfStory(storyId);
  if (!home || !AppState.plateauTree || !AppState.plateauTree.layered || stepPlateauProblem(step)) return;
  const wanted = stepDrawing(step, home);
  drawPlateau(wanted.plateau, { compare: wanted.against ? 'other:' + wanted.against : '', fromAddress: true });
  home.set = currentPlateauDrawing();
}

/** Whether the plateau and the comparison on screen are the ones a step draws (the story bar offers *Back to this step* when they are not). */
function stepPlateausMatchScreen(step) {
  const now = currentPlateauDrawing();
  if (!now || !AppState.plateauTree || !AppState.plateauTree.layered) return true;
  const keys = stepPlateauKeys(step);
  if (keys.at === null && keys.against === null) return true; // the reader's own plateau is what it is told at
  const wanted = stepDrawing(step, storyHome && activeStory && storyHome.story === activeStory.id ? storyHome : now);
  return wanted.plateau === now.plateau && wanted.against === now.against;
}

/** Draws a step of a story on the Map or in Elements. A step that cannot be drawn is said in the story bar, which stays, so that the others can be reached. */
function goToStoryStep(storyId, index) {
  const story = findStory(storyId);
  const steps = story ? storySteps(story) : [];
  if (!story || index < 0 || index >= steps.length) return;
  selectedStoryId = storyId;
  drawPlateausOfStep(storyId, steps[index]);
  const problem = stepProblem(steps[index], undefined, index + 1) || applySavedView(stepView(steps[index]));
  if (problem && !mapIsShown() && currentPerspective !== 'elements') { currentPerspective = 'map'; useDiagramHost('main'); } // somewhere to show the bar
  activeStory = { id: storyId, step: index };
  storyBarEditing = false;
  storyBarNotice = null;
  storyNotice = null;
  location.hash = currentRouteHash();
  render();
}

function selectStory(id) {
  selectedStoryId = id;
  storyNotice = null;
  render();
}

function newStory() {
  openTextDialog('New story', 'Name of the story', '', 'Create story', (name) => {
    const wanted = name.trim().toLowerCase();
    const story = storiesList().find((entry) => storyLabel(entry).trim().toLowerCase() === wanted) || createStory(name);
    if (story) { selectedStoryId = story.id; storyNotice = null; }
    render();
  });
}

function deleteStory(id) {
  const story = findStory(id);
  if (!story || !confirm('Delete the story “' + storyLabel(story) + '”? Its views stay saved.')) return;
  removeEntry(story, 'stories');
  if (selectedStoryId === id) selectedStoryId = null;
  if (activeStory && activeStory.id === id) activeStory = null;
  removedStep = null;
  render();
}

function moveStoryStep(storyId, index, delta) {
  const story = findStory(storyId);
  const steps = story && Array.isArray(story.steps) ? story.steps : null;
  const to = index + delta;
  if (!steps || index < 0 || index >= steps.length || to < 0 || to >= steps.length) return;
  [steps[index], steps[to]] = [steps[to], steps[index]];
  if (activeStory && activeStory.id === storyId) {
    if (activeStory.step === index) activeStory.step = to; else if (activeStory.step === to) activeStory.step = index;
  }
  // the focus follows the step that moved: the same button, or the other one when this step is now at an end
  const action = delta > 0 ? 'story-step-down' : 'story-step-up';
  const other = delta > 0 ? 'story-step-up' : 'story-step-down';
  const atEnd = delta > 0 ? to === steps.length - 1 : to === 0;
  pendingFocusSelector = '[data-action="' + (atEnd ? other : action) + '"][data-story="' + story.id + '"][data-step="' + to + '"]';
  markEntryChanged(story);
  render();
}

function removeStoryStep(storyId, index) {
  const story = findStory(storyId);
  if (!story || !Array.isArray(story.steps) || index < 0 || index >= story.steps.length) return;
  removedStep = { storyId, index, step: story.steps[index] };
  story.steps.splice(index, 1);
  if (activeStory && activeStory.id === storyId) {
    if (activeStory.step > index) activeStory.step--;
    if (activeStory.step >= story.steps.length) activeStory = story.steps.length ? { id: storyId, step: story.steps.length - 1 } : null;
  }
  // the focus goes to the Remove of the step that took its place, else of the one before it, else to the Undo
  const next = Math.min(index, story.steps.length - 1);
  pendingFocusSelector = story.steps.length ? '[data-action="story-step-remove"][data-story="' + story.id + '"][data-step="' + next + '"]' : '[data-action="story-undo"]';
  markEntryChanged(story);
  render();
}

/** Puts back the step that was just removed, where it was. */
function undoRemoveStoryStep() {
  const removed = removedStep;
  const story = removed ? findStory(removed.storyId) : null;
  removedStep = null;
  if (!story) { render(); return; }
  const steps = writableSteps(story);
  const at = Math.min(removed.index, steps.length);
  steps.splice(at, 0, removed.step);
  if (activeStory && activeStory.id === story.id && activeStory.step >= at) activeStory.step++;
  pendingFocusSelector = '[data-action="story-step-remove"][data-story="' + story.id + '"][data-step="' + at + '"]';
  markEntryChanged(story);
  render();
}

function addStoryStep(storyId, viewId) {
  const story = findStory(storyId);
  if (!story || !findSavedView(viewId)) return;
  writableSteps(story).push({ view: viewId });
  pendingFocusSelector = '#story-add-view';
  markEntryChanged(story);
  render();
}

/**
 * The plateau a step is told at (`at`) or compared with (`against`) is chosen in the story editor (wave 015, run 0101, issue #24): the key is written in the step, or taken
 * out when the choice is the default (the plateau drawn, nothing). The story is changed in memory and its manifest rewritten line by line (`markEntryChanged`), as for the
 * words of a step; nothing in the models changes, so no cache is dropped. Returns whether the step changed.
 */
function setStepPlateau(storyId, index, key, value) {
  const story = findStory(storyId);
  const step = story && Array.isArray(story.steps) ? story.steps[index] : null;
  if ((key !== 'at' && key !== 'against') || !isPlainObject(step)) return false;
  if (value === '' ? step[key] === undefined : step[key] === value) return false;
  if (value === '') delete step[key]; else step[key] = value;
  markEntryChanged(story);
  pendingFocusSelector = '[data-story-step-plateau="' + key + '"][data-story="' + story.id + '"][data-step="' + index + '"]';
  render();
  return true;
}

/** A step whose view is gone points at another one. */
function repairStoryStep(storyId, index, viewId) {
  const story = findStory(storyId);
  const step = story && Array.isArray(story.steps) ? story.steps[index] : null;
  if (!isPlainObject(step) || !findSavedView(viewId)) return;
  step.view = viewId;
  markEntryChanged(story);
  render();
}

/** A step that carries its own view becomes a named view (a file of its own, that other stories can use). */
function keepStepAsNamedView(storyId, index) {
  const story = findStory(storyId);
  const step = story && Array.isArray(story.steps) ? story.steps[index] : null;
  if (!isPlainObject(step) || step.view || !step.viewpoint) return;
  openTextDialog('Keep as a named view', 'It is kept in a file of its own; the step then points at it.', describeViewDefinition(step), 'Save view', (name) => {
    const target = findStory(storyId);
    const current = target && Array.isArray(target.steps) ? target.steps[index] : null;
    if (!isPlainObject(current) || current.view) { render(); return; }
    const view = viewForDefinition(canonicalViewDefinition(current), name);
    const text = current.text;
    // the plateaus the step is told at and compared with are the step's, not the view's: they stay (wave 015, run 0101)
    const kept = { view: view.id };
    if (current.at !== undefined) kept.at = current.at;
    if (current.against !== undefined) kept.against = current.against;
    if (text) kept.text = text;
    target.steps[index] = kept;
    markEntryChanged(target);
    render();
  });
}

/**
 * A box or a link of the page of a view was clicked (or an element named in its panel): it becomes the selection of the page, which the
 * panel on the right shows. The page, its perspective and its address stay; nothing the Map and Elements read is written. The drawing is
 * redrawn from its cache, so that what is on screen does not jump.
 */
function selectOnLibraryPage(selection) {
  libraryPickFor(selectedViewId).selection = selection;
  const canvas = document.getElementById('diagram-canvas');
  if (canvas && diagramScale === 'auto') takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
  render();
  bringLibrarySelectionIntoSight();
}

/**
 * The view comes first in the panel and the selection after it. The reader stays where he is when the top of the selection is already in the
 * panel (room for a few lines of it). Otherwise the panel scrolls by as little as it takes to show the top of the selection: its first
 * 120 px at the foot of the panel when it lies below (bringing the whole section to the top of the panel took the attributes of the view
 * out of sight), its top edge at the head of the panel when it lies above.
 */
function bringLibrarySelectionIntoSight() {
  const section = document.querySelector('.library-selection');
  if (!section) return;
  const panel = document.getElementById('panel-right');
  if (panel && panel.getBoundingClientRect && section.getBoundingClientRect) {
    const room = panel.getBoundingClientRect();
    const top = section.getBoundingClientRect().top;
    if (top >= room.top && top <= room.bottom - 64) return;
    panel.scrollTop += top > room.bottom - 64 ? top - (room.bottom - 120) : top - room.top;
  } else if (section.scrollIntoView) {
    section.scrollIntoView({ block: 'nearest' });
  }
}

/** The selection of the page of a view is given up (the panel's cross, Escape): the panel keeps the view. */
function closeLibrarySelection() {
  libraryPickFor(selectedViewId).selection = null;
  render();
}

function openSavedView(viewId) {
  const view = findSavedView(viewId);
  if (!view) return;
  const problem = applySavedView(view);
  if (problem) { storyNotice = problem; render(); return; }
  activeStory = null;
  storyNotice = null;
  location.hash = currentRouteHash();
  render();
}

function renameSavedView(viewId) {
  const view = findSavedView(viewId);
  if (!view) return;
  openTextDialog('Rename the view', 'Name of the view', viewLabel(view), 'Rename', (name) => {
    const target = findSavedView(viewId);
    if (target) { target.name = name; markEntryChanged(target); }
    render();
  });
}

function deleteSavedView(viewId) {
  const view = findSavedView(viewId);
  if (!view) return;
  const used = storiesUsingView(viewId);
  if (!confirm('Delete the view “' + viewLabel(view) + '”?' + (used ? '\n\n' + used + ' step' + (used === 1 ? '' : 's') + ' of stories show it; they will say the view is missing.' : ''))) return;
  removeEntry(view, 'views');
  render();
}

/** The views and the stories that are still in .archicode.yaml (and not shadowed by a manifest): what "Move to manifests" takes out. */
function legacyEntriesToMove() {
  const movable = (key, kind) => {
    const taken = new Set(manifestEntries(kind).map((entry) => entry.id));
    return legacyEntries(key).filter((entry) => !taken.has(entry.id));
  };
  return { views: movable('views', 'view'), stories: movable('stories', 'story') };
}

/** One manifest for each view and each story of .archicode.yaml, and .archicode.yaml without them. */
function moveLegacyEntriesToManifests() {
  const top = workspaceTopLevel();
  const { views, stories } = legacyEntriesToMove();
  const move = (key, kind, entries) => {
    for (const entry of entries) {
      const content = JSON.parse(JSON.stringify(entry));
      delete content.kind; // the kind is the one of the manifest now
      createManifestEntry(kind, content);
    }
    if (Array.isArray(top[key])) {
      const rest = top[key].filter((entry) => !entries.includes(entry));
      if (rest.length) top[key] = rest; else delete top[key];
    }
  };
  move('views', 'view', views);
  move('stories', 'story', stories);
  markWorkspaceYamlChanged();
  render();
}

// ---- What is drawn ----

/** How a step is named in the menu when it names no view of its own: the first words of what it says (wave 020, run 0149). */
const STORY_MENU_WORDS = 6;

/**
 * The title of a step in the menu of the steps: the label of the view it names (`viewLabel`, as the bar and the story editor say it), else the first words of its text, else
 * the label of the recipe it carries (the element and the viewpoint), else what is wrong with it (a view that is gone, a step with no view).
 */
function storyStepTitle(step) {
  const view = stepView(step);
  if (view && step.view) return viewLabel(view);
  const words = typeof step.text === 'string' ? step.text.split(/\s+/).filter(Boolean) : [];
  if (words.length) return words.length > STORY_MENU_WORDS ? words.slice(0, STORY_MENU_WORDS).join(' ').replace(/[\s,:;.\-–—]+$/, '') + '…' : words.join(' ');
  if (view) return viewLabel(view);
  return step.view ? 'Missing view “' + step.view + '”' : 'No view';
}

/**
 * The menu of the steps of a story (wave 020, run 0149, #142, second request; T7), the player's since wave 021 (run 0153): a native `<select data-player-step-menu>`, so that the keys,
 * the touch and the screen readers work as for any list and the bar of the player does not grow past the window at 360 px. One entry per step, "n. title", the step on screen
 * selected; a step that cannot be shown (`stepProblem`, looked at in the plateau the step is drawn at from `options.home`, the player's) says so in the text of its entry and
 * carries the sentence as its title. A story with one step has nothing to choose: no menu. `className` is the class of the list; `options.label` and `options.title` its
 * accessible name and its tooltip. The one handler is `handleStoryPlayerChange`.
 */
function renderStoryStepMenuHtml(story, current, className, options) {
  const steps = storySteps(story);
  if (steps.length < 2) return '';
  const opts = options || {};
  const id = escapeHtml(story.id);
  const entries = steps.map((step, i) => {
    const problem = stepProblem(step, stepPlateauAt(step, opts.home), i + 1);
    return '<option value="' + i + '"' + (i === current ? ' selected' : '') + (problem ? ' title="' + escapeHtml(problem) + '"' : '') + '>' +
      (i + 1) + '. ' + escapeHtml(storyStepTitle(step)) + (problem ? ' — cannot be shown: ' + escapeHtml(problem) : '') + '</option>';
  });
  return '<select class="' + (className || 'player-step-menu') + '" data-player-step-menu data-story="' + id + '" aria-label="' + escapeHtml(opts.label || 'Go to a step of the story') + '" title="' +
    escapeHtml(opts.title || 'Go to any step') + '">' + entries.join('') + '</select>';
}

