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

