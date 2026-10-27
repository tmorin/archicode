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

// ---- The announcer of the story player (wave 021, run 0152) ----

/**
 * What a screen reader is told when a step of a story is shown: "Step n of N", then the title of the view when the step names one. Pure: it reads the story, not the page.
 */
function storyStepAnnouncement(story, index) {
  const steps = story ? storySteps(story) : [];
  if (!Number.isInteger(index) || index < 0 || index >= steps.length) return '';
  const view = stepView(steps[index]);
  return 'Step ' + (index + 1) + ' of ' + steps.length + (view ? ', ' + viewLabel(view) : '');
}

/**
 * Says `text` once through the live region outside #app (`#story-announcer`, which `render()` does not replace: it is the text that changes, so the change is announced). The same text
 * twice in a row is said once; an empty text empties the region, so that the next step is a change again. The player of wave 021 drives it; nothing in the editing layout calls it.
 */
let storyAnnounced = '';
function announceStoryStep(text) {
  const region = typeof document.getElementById === 'function' ? document.getElementById('story-announcer') : null;
  if (!region) return;
  const said = String(text || '');
  if (said === storyAnnounced) return;
  storyAnnounced = said;
  region.textContent = said;
}

// ---- The scene of a step, drawn without the editor (wave 021, run 0152, #153; plan decision T4) ----

/**
 * The plateau and the comparison the editor draws now, as a plain copy: the home of a story that is played (what a step that names none is drawn at), fixed when *Play* is pressed.
 * Null while no workspace is open.
 */
function storyHomeNow() {
  const now = currentPlateauDrawing();
  return now ? { plateau: now.plateau, against: now.against } : null;
}

/**
 * The drawing of a plateau and a comparison that is not the editor's (`editorDrawing()` has the same shape): the layers of the band as `syncLayers` would settle them for
 * `plateau` and `against`, the model of each from `layerModelOf` (kept in `layerCache`), and the toggles of the diagram as the editor has them now. It reads `AppState`, and writes nothing
 * to it. A workspace whose plateaus are not drawn (not layered, or `blocked`) has one drawing, the editor's.
 */
function drawingOfPlateaus(plateau, against, toggles) {
  const tree = AppState.plateauTree;
  if (!AppState.layers || !tree || !tree.layered || AppState.layers.blocked) return Object.assign({}, editorDrawing(), togglesOf(toggles));
  const settings = AppState.workspace.settings;
  const layers = { current: plateau, compare: against ? { mode: 'other', other: against, chosen: true } : null, blocked: null };
  layers.compare = normalizedLayerCompare(layers);
  const model = layerModelOf(plateau, settings);
  const other = layerCompareOther(layers);
  const otherModel = other ? layerModelOf(other.id, settings) : null;
  return {
    layers, index: model.index, undrawable: model.undrawable, problems: model.problems, hideWording: togglesOf(toggles).hideWording, changesOnly: togglesOf(toggles).changesOnly,
    baseline: other ? { plateau: other, index: otherModel.index, problem: otherModel.problems ? otherModel.problems.join('\n') : null, undrawable: otherModel.undrawable } : null
  };
}

/**
 * The two toggles of the diagram that a scene is drawn with (wave 021, run 0153): `changesOnly` (draw only what changed) and `hideWording` (leave the wording-only changes out), each off
 * unless the caller says so. They are the editor's choices for the diagram it shows, kept per folder; a scene that is not the editor's reads neither of them.
 */
function togglesOf(toggles) {
  return { hideWording: !!(toggles && toggles.hideWording), changesOnly: !!(toggles && toggles.changesOnly) };
}

/**
 * The plateau and the comparison a step is drawn at from `home` (what it names, else the home's): `{ layered, wanted: { plateau, against } }`. `layered` is false for a workspace
 * whose plateaus are not drawn, which has one drawing, the editor's.
 */
function stepDrawnAt(step, home) {
  const tree = AppState.plateauTree;
  const layered = !!(AppState.layers && tree && tree.layered && !AppState.layers.blocked);
  const wanted = layered && home ? stepDrawing(step, home) : { plateau: AppState.layers ? AppState.layers.current : BASELINE_PLATEAU, against: null };
  return { layered, wanted };
}

/** The plateau `stepProblem` looks at for a step drawn from `home`: the one it is drawn at, or null where the plateaus are not drawn. */
function stepPlateauAt(step, home) {
  const drawn = stepDrawnAt(step, home);
  return drawn.layered ? drawn.wanted.plateau : null;
}

/** Where a scene keeps the answers of `compare` for the pairs of plateaus it has drawn: on `layerCache`, so that they go with the manifests they were made from. */
function sceneComparisonMemo() {
  const cache = ensureLayerCache(AppState.workspace.settings);
  if (!cache.comparisons) cache.comparisons = new Map();
  const keyOf = (drawing, future) => drawing.layers.current + '>' + drawing.layers.compare.other + (future ? ':future' : '');
  return {
    find(drawing, future) {
      const kept = cache.comparisons.get(keyOf(drawing, future));
      return kept && kept.index === drawing.index && kept.baselineIndex === drawing.baseline.index ? kept.value : null;
    },
    keep(drawing, future, value) {
      cache.comparisons.set(keyOf(drawing, future), { index: drawing.index, baselineIndex: drawing.baseline.index, value });
    }
  };
}

/**
 * The scene of step `index` of a story, as the editor draws it for that step, computed on the side (wave 021, run 0152, #153): the plateau the step is told at (`at`, else the
 * home) and the one it is compared with (`against`, else the home's, as `stepDrawing` settles them) come from `layerModelOf`, the comparison from the kernel's `compare`, the drawing
 * from `computeDiagramScene` (the function the editor draws through), laid out and rendered as the editor does. It writes no `AppState` (no `index`, `baseline`, `layers`, selection
 * or address), no page and no cache but `layerCache`, and never calls `modelsChanged()`. `options.home` is `{ plateau, against }`, fixed by the caller when the story begins
 * (`storyHomeNow()`), else taken now; `options.readonly` draws the page-of-a-view way (no fold buttons); `options.changesOnly` and `options.hideWording` are the two toggles of the
 * diagram, off unless given (the editor's own are never read: a scene is not the editor's). Resolves to null for a story or a step that is not there, else
 * `{ storyId, index, count, title, text, announcement, plateau, against, told, problem, comparison, diagram }`:
 *   title, text      the title the menu gives the step (`storyStepTitle`) and its words;   announcement   what a screen reader is told (`storyStepAnnouncement`);
 *   plateau, against the ids it is drawn at and compared with (null: no comparison); told  `{ at, against }` as the step says them (`stepPlateauKeys`);
 *   problem          why it cannot be drawn (`stepProblem`, in the plateau of the step), else null; the diagram is then null;
 *   comparison       null, or `{ base, target, future }`: the ids of the two sides of the comparison drawn;
 *   diagram          the scene `showDiagramScene` takes: `{ html, status, legend (the key of a comparison included), width, height, focal, hasSvg, boxes, links, drawnIds, ... }`.
 */
async function storyStepScene(storyId, index, options) {
  const story = findStory(storyId);
  const steps = story ? storySteps(story) : [];
  if (!story || !Number.isInteger(index) || index < 0 || index >= steps.length) return null;
  const step = steps[index];
  const home = (options && options.home) || storyHomeNow();
  const readonly = !!(options && options.readonly);
  const { layered, wanted } = stepDrawnAt(step, home);
  const scene = {
    storyId, index, count: steps.length, title: storyStepTitle(step), text: typeof step.text === 'string' ? step.text : '', announcement: storyStepAnnouncement(story, index),
    plateau: wanted.plateau, against: wanted.against, told: stepPlateauKeys(step), problem: stepProblem(step, layered ? wanted.plateau : null, index + 1), comparison: null, diagram: null
  };
  if (scene.problem) return scene;
  const viewKey = 'story|' + storyId + '|' + index + '|' + wanted.plateau + '|' + (wanted.against || '');
  try {
    const [kernel, elk] = await Promise.all([loadViewpointKernel(), loadElk()]);
    const drawing = layered ? drawingOfPlateaus(wanted.plateau, wanted.against, options) : Object.assign({}, editorDrawing(), togglesOf(options));
    const comparison = drawing.layers && drawing.baseline ? comparisonStateOf(drawing, sceneComparisonMemo()) : null;
    if (comparison && comparison.layers) scene.comparison = { base: comparison.base.id, target: comparison.target.id, future: comparison.future };
    const nothing = nothingDrawnScene(viewKey, comparison);
    if (nothing) { scene.diagram = nothing; return scene; }
    const source = { index: drawing.index, baselineIndex: drawing.baseline ? drawing.baseline.index : null, comparison, changesOnly: drawing.changesOnly };
    const recipe = viewDiagramRecipe(stepView(step), drawing.index, 'story');
    const { isMap, reference, viewpoint, facet, mapState } = recipe;
    const { input } = buildKernelInput(viewpoint, reference, isMap ? { facet, layer: recipe.layer, opened: mapState.opened, pinned: mapState.pinned, applications: recipePartsOf(recipe).applications, relationships: recipePartsOf(recipe).relationships, source } : { facet, layer: recipe.layer, source });
    if (isMap) input.hidden = mapState.hidden;
    scene.diagram = (await computeDiagramScene(recipe, input, comparison, source, kernel, elk, viewKey, readonly)).scene;
  } catch (e) {
    scene.problem = 'The diagram could not be computed: ' + (e && e.message ? e.message : String(e));
    scene.diagram = null;
  }
  return scene;
}

// ---- The story player (wave 021, run 0153, #153; plan decisions T3, T5 and T6) ----

/**
 * The player that is open, or null: *Play* on a story opens a modal that covers the window and plays the story like slides. It is view state of the page and nothing else (not in
 * `AppState`, not in the workspace, no `modelsChanged()`): `{ story, step, home, scenes, scene, seq, framing, keyOpen, notice, opener, entry }`.
 *   home     the plateau and the comparison the editor drew when *Play* was pressed (`storyHomeNow()`), fixed for as long as the player is open: what a step that names none is drawn at;
 *   scenes   the scenes drawn so far, by step (`storyStepScene`, read-only: no fold buttons), so that a step seen again is not computed again;  scene  the one on screen, null while it is drawn;
 *   seq      counts the steps asked for, so that the answer of a step the reader has left is dropped;  framing  `{ scale, center }` of the diagram on screen (zoom and pan, the player's own);
 *   opener   the control that opened it (the focus goes back to it);  entry  whether the history holds an entry made for it (Escape and Close then go Back, so that Forward opens it again).
 * While it is open the editor behind it is `inert` and nothing of it is read or written: the player draws from the model of the plateau of each step, on the side.
 */
let storyPlayer = null;
/** The roots whose listeners are in place (the container is in the page once; a test may give another). */
const storyPlayerBound = new WeakSet();

function storyPlayerRoot() {
  return typeof document !== 'undefined' && typeof document.getElementById === 'function' ? document.getElementById('story-player') : null;
}

/** The story and the step the address asks the player to open (`play=<story>&step=n`), or null: no `play=`, a story that is not there or has no step, a step that is none. */
function storyPlayerAddress() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1 || !AppState.workspace) return null;
  const params = new URLSearchParams(location.hash.slice(queryIdx + 1));
  const id = params.get('play');
  const raw = params.getAll('step').pop();
  const story = id ? findStory(id) : null;
  if (!story || raw === undefined || !/^\d+$/.test(raw)) return null;
  return Number(raw) < storySteps(story).length ? { story: id, step: Number(raw) } : null;
}

/** An address without the two keys of the player (`play=` and `step=`, when `play=` is there): what is left is the editor's. */
function hashWithoutPlayer(hash) {
  const queryIdx = hash.indexOf('?');
  if (queryIdx === -1) return hash;
  const parts = hash.slice(queryIdx + 1).split('&');
  if (!parts.some((part) => part.startsWith('play='))) return hash;
  const rest = parts.filter((part) => !part.startsWith('play=') && !part.startsWith('step='));
  return hash.slice(0, queryIdx) + (rest.length ? '?' + rest.join('&') : '');
}

/**
 * The address changed under the page (Back, Forward, a hand-typed address): the editor follows the part that is its own, and the player follows `play=`. Back from an open player closes
 * it, Forward opens it again, another `step=` shows that step (no entry made), an address with no `play=` or a `play=` that names nothing leaves it closed and the address is written
 * back as it really is. The editor's part is compared without the player's two keys, so the step of the player is not mistaken for a change of the editor.
 */
function handleHashChange() {
  const wanted = storyPlayerAddress();
  if (storyPlayer && (!wanted || wanted.story !== storyPlayer.story)) closeStoryPlayer({ address: false });
  if (hashWithoutPlayer(location.hash) !== hashWithoutPlayer('#' + currentRouteHash())) {
    syncPerspectiveFromHash();
    render();
  }
  if (wanted) {
    if (!storyPlayer) openStoryPlayer(wanted.story, wanted.step, { address: 'none' });
    else if (storyPlayer.step !== wanted.step) showPlayerStep(wanted.step, { address: false });
  }
  if (!storyPlayer && location.hash !== '#' + currentRouteHash() && typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', '#' + currentRouteHash());
}

/**
 * Opens the player on step `index` of a story (*Play*: the first). `options.opener` is the control the focus goes back to; `options.address` is how the address learns of it: 'push'
 * (the default: an entry of the history, so that Back closes it), 'replace' (an address that named it at load: no entry) or 'none' (the history already moved). Returns the promise of
 * the first step's scene, or null when nothing is opened: no container, a story with no such step, a player or a dialog already open.
 */
function openStoryPlayer(storyId, index, options) {
  const opts = options || {};
  const root = storyPlayerRoot();
  const story = AppState.workspace ? findStory(storyId) : null;
  const steps = story ? storySteps(story) : [];
  if (storyPlayer || appDialog || !root || !Number.isInteger(index) || index < 0 || index >= steps.length) return null;
  const active = typeof document !== 'undefined' && document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  const address = opts.address || 'push';
  storyPlayer = { story: storyId, step: index, home: storyHomeNow(), scenes: new Map(), scene: null, seq: 0, framing: freshPlayerFraming(), keyOpen: false, notice: null, opener: opts.opener || active, entry: address !== 'replace' };
  if (typeof history !== 'undefined' && address === 'push' && history.pushState) history.pushState(null, '', '#' + currentRouteHash());
  else if (address === 'replace' && typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', '#' + currentRouteHash());
  mountStoryPlayer(root);
  return showPlayerStep(index, { address: false, first: true });
}

/** Puts the player on screen: the container shown, the editor behind it inert, the listeners in place, the focus inside. */
function mountStoryPlayer(root) {
  root.hidden = false;
  root.innerHTML = renderStoryPlayerHtml();
  const app = document.getElementById('app');
  if (app && app.setAttribute) app.setAttribute('inert', '');
  if (!storyPlayerBound.has(root)) {
    storyPlayerBound.add(root);
    root.addEventListener('click', handleStoryPlayerClick);
    root.addEventListener('change', handleStoryPlayerChange);
    root.addEventListener('pointerdown', handleStoryPlayerPointerDown);
    root.addEventListener('wheel', handleStoryPlayerWheel, { passive: false });
  }
  focusPlayerControl(null);
  applyPlayerFraming();
}

/**
 * Closes the player and puts the editor back as it was: the container emptied, the editor no longer inert, the full screen left, the live region emptied, the address without `play=`
 * (Back when the history holds the entry the player made, else the address rewritten in place) and the focus on the control that opened it. `options.address` false leaves the address
 * to the caller (the history already moved), `options.focus` false leaves the focus. Nothing of the editor was changed while it was open, so nothing is restored.
 */
function closeStoryPlayer(options) {
  const player = storyPlayer;
  if (!player) return false;
  const opts = options || {};
  storyPlayer = null;
  player.seq++;
  const root = storyPlayerRoot();
  if (typeof document !== 'undefined' && document.fullscreenElement && typeof document.exitFullscreen === 'function') {
    try { const left = document.exitFullscreen(); if (left && left.catch) left.catch(() => {}); } catch (e) { /* the browser left it already */ }
  }
  if (root) { root.innerHTML = ''; root.hidden = true; }
  const app = document.getElementById('app');
  if (app && app.removeAttribute) app.removeAttribute('inert');
  announceStoryStep('');
  if (opts.address !== false && typeof history !== 'undefined') {
    if (player.entry && history.back) history.back();
    else if (history.replaceState) history.replaceState(null, '', '#' + currentRouteHash());
  }
  if (opts.focus !== false) returnFocusAfterPlayer(player);
  return true;
}

/** Gives the focus back to the control that opened the player; if the page drew it again since, to the same action; failing that, to the *Play* of the story. */
function returnFocusAfterPlayer(player) {
  const opener = player.opener;
  if (opener && typeof opener.focus === 'function' && opener.isConnected !== false) { opener.focus({ preventScroll: true }); return; }
  const selector = (opener && actionSelectorOf(opener)) || '[data-action="story-player-open"][data-story="' + player.story + '"]';
  const app = document.getElementById('app');
  const again = app && app.querySelector ? app.querySelector(selector) : null;
  if (again && typeof again.focus === 'function') again.focus({ preventScroll: true });
}

function freshPlayerFraming() {
  return { scale: 'auto', center: { x: 0, y: 0 } };
}

/**
 * Shows step `index`: the address learns of it without an entry (`options.address` false: it does not), the scene is drawn on the side (`storyStepScene`, from the home fixed when the
 * player opened, read-only, the diagram toggles off) or taken from the scenes already drawn, and the step is said through the live region. The answer of a step the reader has left
 * is dropped. Resolves to the scene (null when nothing was asked for).
 */
function showPlayerStep(index, options) {
  const player = storyPlayer;
  const story = player ? findStory(player.story) : null;
  const steps = story ? storySteps(story) : [];
  if (!player || !Number.isInteger(index) || index < 0 || index >= steps.length) return Promise.resolve(null);
  const opts = options || {};
  player.step = index;
  player.framing = freshPlayerFraming();
  player.notice = null;
  const seq = ++player.seq;
  if (opts.address !== false && typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', '#' + currentRouteHash());
  const kept = player.scenes.get(index);
  if (kept) {
    player.scene = kept;
    renderStoryPlayer();
    sayPlayerStep(player);
    return Promise.resolve(kept);
  }
  player.scene = null;
  if (!opts.first) renderStoryPlayer();
  const arrived = (scene) => {
    if (storyPlayer !== player || player.seq !== seq) return null;
    if (scene) player.scenes.set(index, scene);
    player.scene = scene;
    renderStoryPlayer();
    sayPlayerStep(player);
    return scene;
  };
  return storyStepScene(player.story, index, { home: player.home, readonly: true }).then(arrived, (e) => arrived({
    storyId: player.story, index, count: steps.length, title: storyStepTitle(steps[index]), text: typeof steps[index].text === 'string' ? steps[index].text : '', announcement: storyStepAnnouncement(story, index),
    plateau: null, against: null, told: { at: null, against: null }, problem: 'The step could not be drawn: ' + (e && e.message ? e.message : String(e)), comparison: null, diagram: null
  }));
}

/** Says the step on screen through the live region (outside #app): "Step n of N", the view, and why it cannot be shown when it cannot. */
function sayPlayerStep(player) {
  const scene = player.scene;
  if (scene) announceStoryStep(scene.announcement + (scene.problem ? ' — cannot be shown: ' + scene.problem : ''));
}

/** What the player draws of a diagram: the page's markup with what selects or opens an element taken out (a click on a box does nothing here), so that no box says it is a link. */
function playerDiagramHtml(html) {
  return String(html)
    .replace(/<button type="button" class="relationship-link"[^>]*>([\s\S]*?)<\/button>/g, '<span class="relationship-name">$1</span>')
    .replace(/ data-action="[^"]*"/g, '')
    .replace(/ role="link"/g, ' role="img"')
    .replace(/ tabindex="[^"]*"/g, '');
}

/** The key of the lines and of a comparison under the diagram, for the player: its own ids and its own button (the editor's `toggle-diagram-key` is the page's), open or folded as the player has it. */
function playerLegendHtml(legend, open) {
  let html = String(legend || '')
    .replace(/ id="diagram-key"/g, ' id="player-key"')
    .replace(/ aria-controls="diagram-key"/g, ' aria-controls="player-key"')
    .replace(/ data-action="toggle-diagram-key"/g, ' data-player-action="toggle-key"');
  if (open) html = html.replace(/class="dg-legend-compare"/g, 'class="dg-legend-compare dg-key-open"').replace(/data-player-action="toggle-key" aria-expanded="false"/g, 'data-player-action="toggle-key" aria-expanded="true"');
  return html;
}

/** The plateau a step is drawn at and the one it is compared with, said and not chosen: what the step names, and "from the editor" for what it leaves to the plateau drawn when *Play* was pressed. */
function playerPlateausHtml(scene) {
  const tree = AppState.plateauTree;
  if (!scene || !tree || !tree.layered || !AppState.layers || AppState.layers.blocked) return '';
  const titled = (id) => escapeHtml(tree.nodes.has(id) ? plateauTitle(layerPlateauModel(id)) : id);
  const inherited = ' <span class="player-inherited" title="The step names none: it is drawn at the plateau the editor showed when Play was pressed">(from the editor)</span>';
  let html = 'Plateau <b>' + titled(scene.plateau) + '</b>' + (scene.told.at === null ? inherited : '');
  if (scene.against) html += ' · compared with <b>' + titled(scene.against) + '</b>' + (scene.told.against === null ? inherited : '');
  return '<p class="player-plateaus" data-player-plateaus>' + html + '</p>';
}

/** The whole player: the bar (title, position, menu, Previous, Next, Full screen, Close), the plateaus, the diagram with its zoom, its status and key, and the words of the step. */
function renderStoryPlayerHtml() {
  const player = storyPlayer;
  const story = player ? findStory(player.story) : null;
  const steps = story ? storySteps(story) : [];
  if (!player || !story || player.step >= steps.length) return '';
  const n = player.step;
  const step = steps[n];
  const scene = player.scene;
  const view = stepView(step);
  const diagram = scene ? scene.diagram : null;
  const text = scene ? scene.text : typeof step.text === 'string' ? step.text : '';
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled === true;
  const isFull = canFullscreen && !!document.fullscreenElement;
  let stage;
  if (!scene) stage = '<div class="muted player-loading" role="status">Drawing the step…</div>';
  else if (scene.problem) stage = '<div class="player-problem" role="status"><strong>Step ' + (n + 1) + ' cannot be shown.</strong> ' + escapeHtml(scene.problem) + ' Use Previous, Next or the menu to go on.</div>';
  else stage = playerDiagramHtml(diagram.html);
  const showTools = !!(diagram && diagram.hasSvg);
  return '<div class="player-shell" role="dialog" aria-modal="true" aria-labelledby="player-title" data-story-player>' +
    '<div class="player-bar">' +
      '<h2 class="player-title" id="player-title">' + escapeHtml(storyLabel(story)) + '</h2>' +
      '<span class="player-position" data-player-position>Step ' + (n + 1) + ' of ' + steps.length + (view ? ' · ' + escapeHtml(viewLabel(view)) : '') + '</span>' +
      renderStoryStepMenuHtml(story, n, 'player-step-menu', { home: player.home, label: 'Go to a step of the story', title: 'Go to any step: the plateau and the comparison it names are drawn' }) +
      '<span class="player-actions">' +
        '<span class="button-group" role="group" aria-label="Steps">' +
          '<button type="button" data-player-action="previous"' + (n === 0 ? ' disabled' : '') + ' aria-keyshortcuts="ArrowLeft" title="The step before (Left arrow)">Previous</button>' +
          '<button type="button" data-player-action="next"' + (n === steps.length - 1 ? ' disabled' : '') + ' aria-keyshortcuts="ArrowRight" title="The next step (Right arrow)">Next</button>' +
        '</span>' +
        (canFullscreen ? '<button type="button" data-player-action="fullscreen" aria-pressed="' + isFull + '" title="' + (isFull ? 'Leave full screen' : 'Take the whole screen') + '">' + (isFull ? 'Exit full screen' : 'Full screen') + '</button>' : '') +
        '<button type="button" data-player-action="close" aria-keyshortcuts="Escape" title="Close the player and go back to the editor, as it was (Esc)">Close</button>' +
      '</span>' +
    '</div>' +
    playerPlateausHtml(scene) +
    (player.notice ? '<p class="player-notice" role="status">' + escapeHtml(player.notice) + '</p>' : '') +
    '<div class="player-stage"><div class="diagram-canvas player-canvas" id="player-canvas" data-player-canvas>' + stage + '</div>' +
      (showTools ? '<div class="diagram-tools player-tools" role="toolbar" aria-label="Diagram tools">' +
        '<span class="button-group" role="group" aria-label="Zoom">' +
          '<button type="button" data-player-action="zoom-out" aria-label="Zoom out" title="Zoom out">−</button>' +
          '<button type="button" id="player-zoom-label" data-player-action="zoom-reset" aria-label="Actual size" title="Actual size">100%</button>' +
          '<button type="button" data-player-action="zoom-in" aria-label="Zoom in" title="Zoom in">+</button></span>' +
        '<button type="button" id="player-center-button" data-player-action="center" data-lit="true" title="Back to how the step opens: at a readable size, in the middle">Center</button>' +
        '<button type="button" id="player-fit-button" data-player-action="fit" aria-pressed="false" title="Fit the whole diagram in the window">Fit</button></div>' : '') +
    '</div>' +
    (diagram && (diagram.status || diagram.legend) ? '<div class="player-status"><span class="player-status-text" title="' + escapeHtml(diagram.status || '') + '">' + escapeHtml(diagram.status || '') + '</span>' +
      '<span class="player-hint" id="player-hint"></span><span class="dg-legend player-legend">' + playerLegendHtml(diagram.legend, player.keyOpen) + '</span></div>' : '') +
    '<div class="player-words' + (text ? '' : ' muted') + '" data-player-words>' + (text ? escapeHtml(text) : 'No words for this step.') + '</div>' +
  '</div>';
}

/** Draws the player again from its state, the focus kept on the control that had it (or the nearest that can take it), the framing applied. */
function renderStoryPlayer() {
  const root = storyPlayerRoot();
  if (!storyPlayer || !root) return;
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  const inside = !!(active && root.contains && root.contains(active));
  const key = inside ? (active.hasAttribute && active.hasAttribute('data-player-step-menu') ? 'menu' : active.getAttribute ? active.getAttribute('data-player-action') : null) : null;
  root.innerHTML = renderStoryPlayerHtml();
  applyPlayerFraming();
  focusPlayerControl(key);
}

/** Puts the focus on a control of the player: the one asked for ('menu' or an action), else the nearest that can take it (Next, Previous, then Close). */
function focusPlayerControl(key) {
  const root = storyPlayerRoot();
  if (!root || !root.querySelector) return;
  const find = (wanted) => root.querySelector(wanted === 'menu' ? '[data-player-step-menu]' : '[data-player-action="' + wanted + '"]');
  const near = { previous: ['next'], next: ['previous'], menu: ['next', 'previous'] };
  for (const wanted of [key].concat(key ? near[key] || [] : [], ['next', 'previous', 'close'])) {
    const control = wanted ? find(wanted) : null;
    if (control && !control.disabled && typeof control.focus === 'function') { control.focus({ preventScroll: true }); return; }
  }
}

/** The keys of the player (a listener on the document, in the capture phase): Left and Right, Home and End walk the steps, Escape closes, Tab goes round inside. See `handleChangesKeydown` for the rule. */
function handleStoryPlayerKeydown(e) {
  const player = storyPlayer;
  if (!player) return;
  if (e.key === 'Tab') { trapPlayerFocus(e); return; }
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented || e.isComposing) return;
  if (appDialog || helpOpen || headerMenuOpen) return;
  const last = storySteps(findStory(player.story)).length - 1;
  const stop = () => { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); };
  if (e.key === 'Escape') { stop(); closeStoryPlayer(); return; } // from the menu of the steps too: it is a list that chooses with the arrows, Escape alone leaves
  const wanted = e.key === 'ArrowLeft' ? player.step - 1 : e.key === 'ArrowRight' ? player.step + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
  if (wanted === null) return;
  const focused = typeof document.activeElement === 'undefined' ? null : document.activeElement;
  if (isTypingTarget(e.target) || isTypingTarget(focused)) return; // the menu of the steps owns the arrows, Home and End
  stop();
  if (wanted >= 0 && wanted <= last && wanted !== player.step) showPlayerStep(wanted);
}
document.addEventListener('keydown', handleStoryPlayerKeydown, true);

/** Tab goes round inside the player: the page behind it is not reachable (it is inert too, this is for the ends of the list and for a focus that is outside). */
function trapPlayerFocus(e) {
  const root = storyPlayerRoot();
  if (!root || !root.querySelectorAll) return;
  const items = Array.from(root.querySelectorAll('button, select, input, textarea, a[href], [tabindex]')).filter((el) => !el.disabled && !el.hidden && el.getAttribute('tabindex') !== '-1');
  if (!items.length) { if (e.preventDefault) e.preventDefault(); return; }
  const focused = typeof document.activeElement === 'undefined' ? null : document.activeElement;
  const inside = !!(focused && root.contains && root.contains(focused));
  if (!inside || (e.shiftKey && focused === items[0]) || (!e.shiftKey && focused === items[items.length - 1])) {
    if (e.preventDefault) e.preventDefault();
    items[e.shiftKey ? items.length - 1 : 0].focus();
  }
}

function handleStoryPlayerClick(e) {
  const player = storyPlayer;
  const control = player && e.target && e.target.closest ? e.target.closest('[data-player-action]') : null;
  if (!control || control.disabled) return;
  const action = control.getAttribute('data-player-action');
  if (action === 'previous') showPlayerStep(player.step - 1);
  else if (action === 'next') showPlayerStep(player.step + 1);
  else if (action === 'close') closeStoryPlayer();
  else if (action === 'fullscreen') togglePlayerFullscreen();
  else if (action === 'toggle-key') { player.keyOpen = !player.keyOpen; renderStoryPlayer(); }
  else if (action === 'zoom-in') setPlayerScale(playerScaleStep(1));
  else if (action === 'zoom-out') setPlayerScale(playerScaleStep(-1));
  else if (action === 'zoom-reset') setPlayerScale(1);
  else if (action === 'fit') setPlayerScale('fit');
  else if (action === 'center') setPlayerScale('auto');
}

/** The menu of the steps: the step chosen is shown, as for Next. */
function handleStoryPlayerChange(e) {
  if (storyPlayer && e.target && e.target.matches && e.target.matches('[data-player-step-menu]')) showPlayerStep(Number(e.target.value));
}

/** Full screen for the player (the Fullscreen API on its container): a browser that refuses, or has none, leaves the player where it is and says so. */
async function togglePlayerFullscreen() {
  const player = storyPlayer;
  const root = storyPlayerRoot();
  if (!player || !root) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (typeof root.requestFullscreen === 'function') await root.requestFullscreen();
    else throw new Error('no full screen here');
  } catch (e) {
    if (storyPlayer !== player) return;
    player.notice = 'The browser did not give full screen.';
    renderStoryPlayer();
  }
}
document.addEventListener('fullscreenchange', () => { if (storyPlayer) renderStoryPlayer(); });

// zoom and pan of the player's own diagram: the pure parts of the editor's framing (`diagramFitScale`, `diagramAutoScale`, `diagramFrameCenter`) over the state of the player

function playerCanvas() {
  return storyPlayer && typeof document !== 'undefined' ? document.getElementById('player-canvas') : null;
}

/** The drawing on screen when it is an SVG, else null. */
function playerDrawing() {
  const diagram = storyPlayer && storyPlayer.scene ? storyPlayer.scene.diagram : null;
  return diagram && diagram.hasSvg ? diagram : null;
}

/** The part of the canvas the drawing is framed in: the tools float over the bottom, so that strip does not count. */
function playerViewSize(canvas) {
  const tools = canvas.parentElement && canvas.parentElement.querySelector ? canvas.parentElement.querySelector('.player-tools') : null;
  return { width: canvas.clientWidth, height: Math.max(1, canvas.clientHeight - (tools ? tools.offsetHeight + 16 : 0)) };
}

function resolvePlayerScale(canvas, drawing) {
  const framing = storyPlayer.framing;
  if (typeof framing.scale === 'number') return framing.scale;
  const view = playerViewSize(canvas);
  return framing.scale === 'fit' ? diagramFitScale(view, drawing) : diagramAutoScale(view, drawing);
}

/** Puts the drawing where the framing says, in the canvas as it is now, and the zoom label with it. Returns the scale applied. */
function applyPlayerFraming() {
  const canvas = playerCanvas();
  const drawing = playerDrawing();
  const svg = canvas && drawing && canvas.querySelector ? canvas.querySelector('svg') : null;
  if (!svg) return 1;
  const framing = storyPlayer.framing;
  const scale = resolvePlayerScale(canvas, drawing);
  svg.setAttribute('width', String(Math.round(drawing.width * scale)));
  svg.setAttribute('height', String(Math.round(drawing.height * scale)));
  const view = playerViewSize(canvas);
  // a slide has no selection to put in the middle: a drawing that does not fit is centered across and shown from its top
  if (typeof framing.scale !== 'number') framing.center = diagramFrameCenter(view, drawing, null, scale);
  svg.style.transform = 'translate(' + Math.round(canvas.clientWidth / 2 - framing.center.x * scale) + 'px,' + Math.round(view.height / 2 - framing.center.y * scale) + 'px)';
  const label = document.getElementById('player-zoom-label');
  if (label) { label.textContent = Math.round(scale * 100) + '%'; label.setAttribute('aria-label', 'Actual size (now ' + Math.round(scale * 100) + '%)'); }
  const fit = document.getElementById('player-fit-button');
  if (fit) fit.setAttribute('aria-pressed', String(framing.scale === 'fit'));
  const center = document.getElementById('player-center-button');
  if (center) center.setAttribute('data-lit', String(framing.scale === 'auto'));
  // the opening view stops at a readable size: say what is left out, and how to see it (as the editor's diagram does)
  const hint = document.getElementById('player-hint');
  if (hint) {
    const whole = framing.scale === 'auto' ? diagramFitScale(view, drawing) : 1;
    hint.textContent = whole < DIAGRAM_MIN_READABLE_SCALE - 0.005 && scale > whole + 0.005 ? 'Part of the diagram is out of view: Fit shows all of it (' + Math.round(whole * 100) + '%).' : '';
  }
  return scale;
}
window.addEventListener('resize', () => { if (storyPlayer) applyPlayerFraming(); });

/** The reader took over the framing (zoom, drag, wheel): what is on screen is the framing from now on. */
function takeOverPlayerFraming(canvas, drawing) {
  const framing = storyPlayer.framing;
  if (typeof framing.scale !== 'number') framing.scale = resolvePlayerScale(canvas, drawing);
}

/** Moves the view by (dx, dy) canvas pixels: the drawing follows. */
function movePlayerBy(dx, dy) {
  const canvas = playerCanvas();
  const drawing = playerDrawing();
  if (!canvas || !drawing) return;
  applyPlayerFraming();
  takeOverPlayerFraming(canvas, drawing);
  const framing = storyPlayer.framing;
  framing.center = { x: framing.center.x - dx / framing.scale, y: framing.center.y - dy / framing.scale };
  applyPlayerFraming();
}

/** Sets the scale ('fit', 'auto' or a number), keeping the point under (clientX, clientY), by default the middle of the canvas, where it is. */
function setPlayerScale(next, clientX, clientY) {
  const canvas = playerCanvas();
  const drawing = playerDrawing();
  if (!canvas || !drawing) return;
  const framing = storyPlayer.framing;
  if (next === 'fit' || next === 'auto') { framing.scale = next; applyPlayerFraming(); return; }
  applyPlayerFraming();
  const before = resolvePlayerScale(canvas, drawing);
  const rect = canvas.getBoundingClientRect();
  const view = playerViewSize(canvas);
  const ox = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
  const oy = clientY === undefined ? 0 : clientY - rect.top - view.height / 2;
  framing.scale = next;
  const after = applyPlayerFraming();
  framing.center = { x: framing.center.x + ox / before - ox / after, y: framing.center.y + oy / before - oy / after };
  applyPlayerFraming();
}

/** One step along DIAGRAM_SCALES from the scale on screen. */
function playerScaleStep(direction) {
  const canvas = playerCanvas();
  const drawing = playerDrawing();
  const current = canvas && drawing ? resolvePlayerScale(canvas, drawing) : 1;
  const steps = DIAGRAM_SCALES.slice();
  if (direction > 0) return steps.find((s) => s > current + 0.01) || steps[steps.length - 1];
  return steps.reverse().find((s) => s < current - 0.01) || steps[steps.length - 1];
}

/** The wheel moves the diagram (shift, or a sideways wheel, moves it left and right); ctrl/⌘ + wheel zooms around the pointer. */
function handleStoryPlayerWheel(e) {
  const canvas = storyPlayer && e.target && e.target.closest ? e.target.closest('#player-canvas') : null;
  if (!canvas || !playerDrawing()) return;
  if (e.preventDefault) e.preventDefault();
  if (e.ctrlKey || e.metaKey) { setPlayerScale(playerScaleStep(e.deltaY < 0 ? 1 : -1), e.clientX, e.clientY); return; }
  const unit = e.deltaMode === 1 ? 16 : 1;
  const sideways = e.shiftKey && !e.deltaX;
  movePlayerBy(-(sideways ? e.deltaY : e.deltaX) * unit, -(sideways ? 0 : e.deltaY) * unit);
}

/** Drag the diagram with the mouse or a finger. */
function handleStoryPlayerPointerDown(e) {
  const canvas = storyPlayer && e.target && e.target.closest ? e.target.closest('#player-canvas') : null;
  const drawing = playerDrawing();
  if (!canvas || !drawing || e.button !== 0) return;
  applyPlayerFraming();
  takeOverPlayerFraming(canvas, drawing);
  const player = storyPlayer;
  const start = { x: e.clientX, y: e.clientY, center: { x: player.framing.center.x, y: player.framing.center.y } };
  let moved = false;
  const onMove = (m) => {
    const dx = m.clientX - start.x;
    const dy = m.clientY - start.y;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    moved = true;
    canvas.classList.add('panning');
    player.framing.center = { x: start.center.x - dx / player.framing.scale, y: start.center.y - dy / player.framing.scale };
    applyPlayerFraming();
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    canvas.classList.remove('panning');
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

/**
 * Over a diagram that belongs to a story: where we are in it, the way to the other steps, and the words of the step
 * (read, or typed when "Edit text" is on). A step that cannot be drawn says why here, and the way on stays open.
 */
function renderStoryBarHtml() {
  const story = activeStory ? findStory(activeStory.id) : null;
  const steps = story ? storySteps(story) : [];
  if (!story || activeStory.step < 0 || activeStory.step >= steps.length) return '';
  const n = activeStory.step;
  const view = stepView(steps[n]);
  const problem = stepProblem(steps[n], undefined, n + 1);
  const here = !!view && !problem && viewMatchesScreen(view) && stepPlateausMatchScreen(steps[n]);
  const text = steps[n].text || '';
  const words = storyBarEditing
    ? '<textarea class="story-bar-text" rows="2" data-story="' + escapeHtml(story.id) + '" data-story-field="step-text" data-step="' + n + '" aria-label="What to say about this step" placeholder="What to say about this diagram…">' + escapeHtml(text) + '</textarea>'
    : '<p class="story-bar-words' + (text ? '' : ' muted') + '">' + (text ? escapeHtml(text) : 'No words for this step yet.') + '</p>';
  return '<div class="story-bar" role="region" aria-label="Story ' + escapeHtml(storyLabel(story)) + '">' +
    '<div class="story-bar-line">' +
      '<span class="story-bar-title">' + escapeHtml(storyLabel(story)) + '</span>' +
      '<span class="story-bar-step">Step ' + (n + 1) + ' of ' + steps.length + (view ? ' · ' + escapeHtml(viewLabel(view)) : '') + '</span>' +
      stepPlateausHtml(steps[n], 'story-bar-plateaus') +
      '<span class="story-bar-actions">' +
        (here || problem ? '' : '<button type="button" data-action="story-restore" title="Draw this step again, as it was saved">Back to this step</button>') +
        '<button type="button" data-action="story-bar-edit" aria-pressed="' + storyBarEditing + '" title="Type the words of this step (they are also in Edit story)">' + (storyBarEditing ? 'Done' : 'Edit text') + '</button>' +
        '<button type="button" data-action="story-edit" title="Reorder the steps, rename the story">Edit story</button>' +
        '<button type="button" data-action="story-exit" title="Leave the story: the diagram stays as it is">Leave story</button>' +
      '</span>' +
    '</div>' +
    (storyBarNotice ? '<div class="story-bar-notice" role="status">' + escapeHtml(storyBarNotice) + '</div>' : '') +
    (problem ? '<div class="story-step-problem" role="status">Step ' + (n + 1) + ' cannot be shown: ' + escapeHtml(problem) + ' The diagram below is the one before it.</div>' : '') +
    words +
  '</div>';
}

/** In the header of a diagram: keep it as a view, or put it in a story. */
function renderStoryButtonsHtml() {
  return '<span class="button-group" role="group" aria-label="Story">' +
    '<button type="button" class="with-icon" data-action="name-view" aria-label="Name view…" title="Keep this diagram as a named view, to put in several stories (kept in memory until Save all changes)">' +
      controlIconHtml(CONTROL_ICON_PATHS.nameView) + '<span class="control-label">Name view…</span></button>' +
    '<button type="button" class="with-icon" data-action="add-to-story" aria-label="Add to story…" title="Add this diagram to a story as a step">' +
      controlIconHtml(CONTROL_ICON_PATHS.addToStory) + '<span class="control-label">Add to story…</span></button>' +
  '</span>';
}

function renderStoriesNavHtml() {
  const stories = storiesSorted();
  let html = '<div class="nav-section">' + renderNavHeaderHtml('Stories', '<button type="button" class="tree-branch-add-btn" data-action="story-new" title="Create a story" aria-label="New story">+ Add</button>');
  for (const story of stories) {
    const active = story.id === selectedStoryId ? ' active' : '';
    const count = storySteps(story).length;
    const walked = activeStory && activeStory.id === story.id && activeStory.step < count;
    html += '<div class="nav-row story-row' + active + '" role="button" tabindex="0"' + (active ? ' aria-current="true"' : '') + ' data-action="select-story" data-story="' + escapeHtml(story.id) + '">' +
      '<span class="file-relpath">' + escapeHtml(storyLabel(story)) + '</span>' +
      (entryIsModified(story) ? '<span class="modified-badge" title="Changed, not saved yet">modified</span>' : '') +
      '<span class="story-count">' + (walked ? 'step ' + (activeStory.step + 1) + ' of ' + count : count + (count === 1 ? ' step' : ' steps')) + '</span></div>';
  }
  if (!stories.length) html += '<div class="tree-empty">No story yet — use "+ Add" above to create one.</div>';
  return html + '</div>';
}

/** The plateaus a step names, as words: *Told at* and *Compared with* (nothing when it names none). `className` is the class of the span. */
function stepPlateausHtml(step, className) {
  const keys = stepPlateauKeys(step);
  if (keys.at === null && keys.against === null) return '';
  const tree = AppState.plateauTree;
  const titled = (id) => (tree && tree.layered && tree.nodes.has(id) ? plateauTitle(layerPlateauModel(id)) : id);
  const parts = [];
  if (keys.at !== null) parts.push('told at ' + escapeHtml(titled(keys.at)));
  if (keys.against !== null) parts.push('compared with ' + escapeHtml(titled(keys.against)));
  return '<span class="' + className + '">' + parts.join(', ') + '</span>';
}

/**
 * The two lists of a step in the story editor: the plateau it is told at (the plateau drawn when none) and the plateau it is compared with (nothing when none). Only in a
 * workspace that has plateaus, or when the step already names one (so that it can be put right). A plateau the workspace does not have is listed, flagged, so that it is not lost.
 */
function renderStepPlateausHtml(story, step, index) {
  const tree = AppState.plateauTree;
  const ids = tree && tree.layered ? tree.ids : [];
  const keys = stepPlateauKeys(step);
  if (!ids.length && keys.at === null && keys.against === null) return '';
  const id = escapeHtml(story.id);
  const select = (key, label, none, value) => {
    const known = value === null || ids.includes(value);
    return '<label class="story-step-plateau">' + label + ' <select data-story-step-plateau="' + key + '" data-story="' + id + '" data-step="' + index + '" aria-label="' + label + ' (step ' + (index + 1) + ')">' +
      '<option value="">' + none + '</option>' +
      ids.map((plateau) => '<option value="' + escapeHtml(plateau) + '"' + (plateau === value ? ' selected' : '') + '>' + escapeHtml(plateauTitle(layerPlateauModel(plateau))) + '</option>').join('') +
      (known ? '' : '<option value="' + escapeHtml(value) + '" selected>' + escapeHtml(value) + ' (not a plateau)</option>') +
      '</select></label>';
  };
  return '<div class="story-step-plateaus">' + select('at', 'Told at', 'The plateau drawn', keys.at) + select('against', 'Compared with', 'Nothing', keys.against) + '</div>';
}

function renderStoryStepHtml(story, step, index, count) {
  const view = stepView(step);
  const problem = stepProblem(step, undefined, index + 1);
  const id = escapeHtml(story.id);
  const current = !!activeStory && activeStory.id === story.id && activeStory.step === index;
  const button = (action, label, extra) => '<button type="button" data-action="' + action + '" data-story="' + id + '" data-step="' + index + '"' + (extra || '') + '>' + label + '</button>';
  const missingNamed = !!step.view && !findSavedView(step.view);
  const others = missingNamed ? savedViews() : [];
  return '<li class="story-step' + (problem ? ' broken' : '') + (current ? ' current' : '') + '"' + (current ? ' aria-current="step"' : '') + '>' +
    '<div class="story-step-head">' +
      (view && step.view && !problem ? '<button type="button" class="link-button story-step-view" data-action="library-go-view" data-view="' + escapeHtml(step.view) + '" title="See this view in Stories, and the other steps that use it">' + escapeHtml(viewLabel(view)) + '</button>'
        : '<span class="story-step-view">' + (view ? escapeHtml(viewLabel(view)) : '<em>Missing view</em>') + '</span>') +
      (current ? '<span class="story-current-badge">Showing now</span>' : '') +
      (view && !step.view ? '<span class="story-count">Own view — only in this step</span>' : '') +
      '<span class="story-step-tools">' +
        (problem ? '' : button('story-play', 'Show on diagram', ' title="Draw this step on the diagrams"')) +
        (view && !step.view ? button('story-step-name', 'Keep as named view', ' title="Give this view a name and a file of its own, so that other stories can use it"') : '') +
        button('story-step-up', 'Up', index === 0 ? ' disabled' : '') +
        button('story-step-down', 'Down', index === count - 1 ? ' disabled' : '') +
        button('story-step-remove', 'Remove') +
      '</span>' +
    '</div>' +
    renderStepPlateausHtml(story, step, index) +
    (problem ? '<div class="story-step-problem" role="status">' + escapeHtml(problem) + '</div>' : '') +
    (others.length ? '<select class="story-repair" data-story-repair data-story="' + id + '" data-step="' + index + '" aria-label="Use another view for step ' + (index + 1) + '"><option value="">Choose another view…</option>' +
      others.map((other) => '<option value="' + escapeHtml(other.id) + '">' + escapeHtml(viewLabel(other)) + '</option>').join('') + '</select>' : '') +
    '<textarea rows="2" data-story="' + id + '" data-story-field="step-text" data-step="' + index + '" aria-label="What to say about step ' + (index + 1) + '" placeholder="What to say about this diagram…">' + escapeHtml(step.text || '') + '</textarea>' +
  '</li>';
}

function renderStoryEditorHtml(story) {
  const id = escapeHtml(story.id);
  const steps = storySteps(story);
  const views = savedViewsSorted();
  let html = '<section class="story-editor" aria-label="Story">' +
    '<label class="story-field"><span>Name</span><input type="text" data-story="' + id + '" data-story-field="name" value="' + escapeHtml(story.name || '') + '" placeholder="' + id + '"></label>' +
    '<label class="story-field"><span>About</span><textarea rows="2" data-story="' + id + '" data-story-field="description" placeholder="What this story shows, in a few words.">' + escapeHtml(story.description || '') + '</textarea></label>';
  if (views.length) {
    html += '<div class="story-add"><label for="story-add-view">Add a saved view as the last step</label><select id="story-add-view">' +
      views.map((view) => '<option value="' + escapeHtml(view.id) + '">' + escapeHtml(viewLabel(view)) + '</option>').join('') +
      '</select><button type="button" data-action="story-add-step" data-story="' + id + '">Add step</button></div>';
  }
  if (removedStep && removedStep.storyId === story.id) {
    html += '<div class="story-undo" role="status">Step ' + (removedStep.index + 1) + ' removed. <button type="button" data-action="story-undo">Undo</button></div>';
  }
  html += steps.length
    ? '<ol class="story-steps">' + steps.map((step, i) => renderStoryStepHtml(story, step, i, steps.length)).join('') + '</ol>'
    : '<div class="story-empty"><p>No step yet.</p><ol><li>Open a diagram in Applications or in Elements.</li><li>Press “Add to story…” in its header: it goes after the step being told.</li></ol>' +
      (views.length ? '<p>Or add a saved view with the list above.</p>' : '') + '</div>';
  html += '<div class="story-danger"><button type="button" class="btn-danger" data-action="story-delete" data-story="' + id + '">Delete this story</button></div>';
  return html + '</section>';
}

/** Where an entry is kept: its manifest, or .archicode.yaml for an older one. */
function entryFileLabel(entry) {
  const owner = entryOwners.get(entry);
  return owner ? owner.relPath : '.archicode.yaml';
}

/**
 * The view as a form: what it draws and where it is kept as facts, then a control for each attribute (TDD-0029 DEC-1). A control changes
 * the entry of the view (`editSavedView`) when it is committed: a select or a checkbox at once, a text by Enter or leaving it.
 */
function renderViewFactsHtml(view) {
  const row = (name, content) => '<dt>' + name + '</dt><dd>' + content + '</dd>';
  const isMap = view.viewpoint === 'map';
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const notice = (field) => viewEditNotice && viewEditNotice.view === view.id && viewEditNotice.field === field
    ? '<div class="inline-error" role="alert">' + escapeHtml(viewEditNotice.text) + '</div>' : '';
  const typedOr = (name, value) => viewEditNotice && viewEditNotice.view === view.id && viewEditNotice.field === name && viewEditNotice.typed !== null ? viewEditNotice.typed : value; // a refused text stays in its field, to be corrected
  const field = (id, label, control, name) => '<div class="view-field"><label for="' + id + '">' + label + '</label>' + control + notice(name) + '</div>';
  const option = (value, label, selected, extra) => '<option value="' + escapeHtml(value) + '"' + (selected ? ' selected' : '') + (extra || '') + '>' + escapeHtml(label) + '</option>';

  const layer = viewLayerOf(view);
  const record = typeof properties.element === 'string' ? AppState.index[layer].get(properties.element) : null;
  const known = ['overview', 'detailed', 'deep', 'map'];
  const labels = { overview: 'Overview', detailed: 'Detailed', deep: 'Deep', map: 'Map' };
  const viewpoints = (known.includes(view.viewpoint) ? '' : option(String(view.viewpoint), view.viewpoint + ' (not drawn by the editor)', true, ' disabled')) +
    known.map((value) => option(value, labels[value], value === view.viewpoint,
      value === 'detailed' && view.viewpoint !== 'detailed' && record && LEAF_KINDS.includes(record.kind) ? ' disabled title="Only available for an element that can contain others."' : '')).join('');
  let html = '<dl class="view-facts">' +
    row('Draws', escapeHtml(describeViewDefinition(view))) +
    row('Kept in', '<code>' + escapeHtml(entryFileLabel(view)) + '</code>') +
  '</dl><div class="view-edit">';
  html += field('view-edit-viewpoint', 'Viewpoint', '<select id="view-edit-viewpoint" data-view-field="viewpoint">' + viewpoints + '</select>', 'viewpoint');
  // the layer of the view: the one its element is of, or the one its map draws (the page Applications, the page Environments)
  html += field('view-edit-layer', 'Layer', '<select id="view-edit-layer" data-view-field="layer">' + option('application', 'Application', layer === 'application') + option('technology', 'Technology', layer === 'technology') + '</select>', 'layer');
  if (isMap) {
    for (const [list, label, hint] of [['pinned', 'Pinned', 'The elements the map is about'], ['hidden', 'Hidden', 'Elements the map leaves out'], ['opened', 'Open', 'Boxes drawn unfolded']]) {
      const items = stringList(properties[list]);
      html += field('view-edit-add-' + list, label,
        '<div class="view-pills" role="list" aria-label="' + label + ' elements">' + items.map((reference) =>
          '<span class="pill' + (AppState.index[layer].has(reference) ? '' : ' pill-missing') + '" role="listitem"' + (AppState.index[layer].has(reference) ? '' : ' title="This element does not exist any more"') + '>' + escapeHtml(reference) +
          '<button type="button" class="pill-remove" data-action="view-list-remove" data-list="' + list + '" data-ref="' + escapeHtml(reference) + '" aria-label="Remove ' + escapeHtml(reference) + ' from ' + label.toLowerCase() + '" title="Remove">×</button></span>').join('') + '</div>' +
        '<input type="text" id="view-edit-add-' + list + '" data-view-list="' + list + '" list="archicode-' + layer + '-references" value="' + escapeHtml(typedOr(list, '')) + '" placeholder="Add an element…" autocomplete="off" spellcheck="false" title="' + escapeHtml(hint) + '. Press Enter to add it.">', list);
    }
  } else {
    html += field('view-edit-element', 'Element',
      '<input type="text" id="view-edit-element" data-view-field="element" list="archicode-' + layer + '-references" value="' + escapeHtml(typedOr('element', typeof properties.element === 'string' ? properties.element : '')) + '" placeholder="Reference of an element" autocomplete="off" spellcheck="false" title="Press Enter to apply it.">' +
      (record ? '<div class="muted view-element-name">' + escapeHtml(record.name || record.id) + '</div>' : ''), 'element');
  }
  const facets = AppState.workspace.settings.facets.customs;
  const facetName = typeof properties.facet === 'string' ? properties.facet : '';
  if (facets.length || facetName) {
    html += field('view-edit-facet', 'Facet', '<select id="view-edit-facet" data-view-field="facet">' + option('', 'None', !facetName) +
      facets.map((facet) => option(facet.name, facet.name, facet.name === facetName)).join('') +
      (facetName && !facets.some((facet) => facet.name === facetName) ? option(facetName, facetName + ' (not defined)', true) : '') + '</select>', 'facet');
  }
  const shows = shownTextsOf(view);
  const check = (id, fieldName, label, checked, title) => '<label class="view-check" title="' + escapeHtml(title) + '"><input type="checkbox" id="' + id + '" data-view-field="' + fieldName + '"' + (checked ? ' checked' : '') + '> ' + label + '</label>';
  html += '<fieldset class="view-field"><legend>Drawing</legend><div class="view-checks">' +
    check('view-edit-hide-unlinked', 'hide-unlinked', 'Hide unlinked', properties['hide-unlinked'] === true, 'Leave out the boxes that no link reaches') +
    (view.viewpoint === 'map' && layer === 'technology'
      ? check('view-edit-part-applications', 'part:applications', 'Applications', mapPartsOf(view).applications, 'Draw the applications deployed on the nodes, inside the nodes that are open') +
        check('view-edit-part-relationships', 'part:relationships', 'Relationships', mapPartsOf(view).relationships, 'Draw the links: the relationships that environments and nodes declare, and the dependencies between environments that the deployed applications give')
      : '') +
    check('view-edit-show-labels', 'show:labels', 'Labels', shows.labels, 'The caption of each link') +
    check('view-edit-show-qualifiers', 'show:qualifiers', 'Qualifiers', shows.qualifiers, 'The qualifiers of each element, after its kind') +
    check('view-edit-show-descriptions', 'show:descriptions', 'Descriptions', shows.descriptions, 'The description of each element that does not contain others') +
    check('view-edit-show-wrap', 'show:wrap', 'Wrap', shows.wrap, 'Break long names, qualifiers and descriptions over several lines, and show the whole of a long link label') +
  '</div></fieldset></div>';
  return html;
}

/** The steps that show a view, each a way into its story. */
function renderViewUsesHtml(view) {
  const uses = [];
  for (const story of storiesSorted()) {
    storySteps(story).forEach((step, index) => { if (step.view === view.id) uses.push({ story, index }); });
  }
  if (!uses.length) return '<p class="muted">No story shows this view yet. Add it to one from Stories, with “Add a saved view as the last step”.</p>';
  return '<ul class="view-uses">' + uses.map(({ story, index }) =>
    '<li><button type="button" class="link-button" data-action="library-go-story" data-story="' + escapeHtml(story.id) + '" data-step="' + index + '">' + escapeHtml(storyLabel(story)) + '</button>' +
    ' <span class="muted">— step ' + (index + 1) + '</span></li>').join('') + '</ul>';
}

/** The attributes of a view and the steps that show it: the centre of the page of a view that cannot be drawn, the right-hand panel of one that can. */
function renderViewAttributesHtml(view) {
  return renderViewFactsHtml(view) + '<h3>Shown in</h3>' + renderViewUsesHtml(view);
}

function renderViewDetailHtml(view) {
  const problem = viewProblem(view);
  return '<section class="story-editor" aria-label="View">' +
    (problem ? '<div class="story-step-problem" role="status">' + escapeHtml(problem) + '</div>' : '') +
    renderViewAttributesHtml(view) +
  '</section>';
}

function renderViewsNavHtml() {
  const views = savedViewsSorted();
  let html = '<div class="nav-section">' + renderNavHeaderHtml('Views');
  for (const view of views) {
    const used = storiesUsingView(view.id);
    html += '<div class="nav-row story-row' + (view.id === selectedViewId ? ' active' : '') + '" role="button" tabindex="0"' + (view.id === selectedViewId ? ' aria-current="true"' : '') + ' data-action="select-view" data-view="' + escapeHtml(view.id) + '">' +
      '<span class="file-relpath">' + escapeHtml(viewLabel(view)) + '</span>' +
      (viewProblem(view) ? '<span class="modified-badge" title="This view cannot be drawn">broken</span>' : '') +
      (entryIsModified(view) ? '<span class="modified-badge" title="Changed, not saved yet">modified</span>' : '') +
      '<span class="story-count">' + (used ? used + (used === 1 ? ' step' : ' steps') : 'unused') + '</span></div>';
  }
  if (!views.length) html += '<div class="tree-empty">No view yet.</div>';
  return html + '</div>';
}

/** Views and stories that an older workspace keeps in .archicode.yaml: said once, with the way to move them out. */
function renderLegacyEntriesNoticeHtml() {
  const { views, stories } = legacyEntriesToMove();
  const total = views.length + stories.length;
  if (!total) return '';
  const parts = [views.length ? views.length + (views.length === 1 ? ' view' : ' views') : '', stories.length ? (stories.length === 1 ? '1 story' : stories.length + ' stories') : ''].filter(Boolean).join(' and ');
  return '<div class="story-legacy" role="status"><span>' + parts + (total === 1 ? ' is' : ' are') + ' still in .archicode.yaml. ' + (total === 1 ? 'It works' : 'They work') +
    ' there, but every save rewrites that file. Move ' + (total === 1 ? 'it' : 'them') + ' into files of ' + (total === 1 ? 'its' : 'their') + ' own to keep .archicode.yaml small.</span>' +
    '<button type="button" data-action="legacy-move" title="Write a manifest file for each, and take them out of .archicode.yaml">Move to manifests</button></div>';
}

/** The two sides of the Library, as one group of joined buttons. */
function renderLibraryTabsHtml() {
  const tab = (id, label, title) => '<button type="button" data-action="library-tab" data-tab="' + id + '" aria-pressed="' + (id === libraryTab) + '" title="' + title + '">' + label + '</button>';
  return '<span class="viewpoint-switch"><span class="button-group" role="group" aria-label="Stories and views">' +
    tab('stories', 'Stories', 'Diagrams in order, with a sentence for each') +
    tab('views', 'Views', 'The named diagrams that stories are made of') + '</span></span>';
}

/**
 * Library perspective — what the workspace keeps to tell about itself: Stories (diagrams in order, with words) and
 * Views (the named diagrams they are made of). Each side has its list on the left and its page in the center, and the
 * two lead to one another: a step names its view, a view names the steps that show it.
 */
function renderLibraryPerspectiveHtml() {
  const onViews = libraryTab === 'views';
  let subject = '';
  let actions = '';
  let body;
  if (onViews) {
    if (!findSavedView(selectedViewId)) selectedViewId = (savedViewsSorted()[0] || {}).id || null; // a view is always open when there is one
    const view = selectedViewId ? findSavedView(selectedViewId) : null;
    if (view) {
      const id = escapeHtml(view.id);
      subject = '<span class="element-header-subject">' + escapeHtml(viewLabel(view)) + '</span>' +
        (entryIsModified(view) ? '<span class="modified-badge" title="Changed, not saved yet">modified</span>' : '');
      const manage = '<button type="button" data-action="saved-view-rename" data-view="' + id + '">Rename</button>' +
        '<button type="button" data-action="saved-view-delete" data-view="' + id + '">Delete</button>';
      // the panel on the right narrows the centre: what is rarely used goes into the "⋯" menu of a narrow header, as on the Map (Maximize stays in the row)
      actions = viewProblem(view) ? manage
        : '<span class="header-more">' +
            '<button type="button" class="header-more-button" data-action="toggle-header-menu" aria-haspopup="true" aria-expanded="' + headerMenuOpen + '" aria-controls="header-overflow" aria-label="More actions" title="More actions: download, open on a diagram, rename, delete">' +
              '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="3" cy="8" r="1.6" fill="currentColor"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="13" cy="8" r="1.6" fill="currentColor"/></svg></button>' +
            '<div class="header-overflow" id="header-overflow" role="group" aria-label="More actions" data-open="' + headerMenuOpen + '">' +
              renderDiagramDownloadHtml() +
              '<button type="button" data-action="saved-view-open" data-view="' + id + '" title="Draw this view in Applications or in Elements">Open on diagram</button>' + manage +
            '</div></span>' + renderMaximizeButtonHtml('the list of views and the panel');
    }
    body = view ? renderViewDetailHtml(view)
      : '<p class="muted story-intro">A view is a diagram kept under a name, to be a step in as many stories as you like. To keep one, open a diagram in Applications or in Elements and press “Name view…” in its header.</p>';
  } else {
    if (!findStory(selectedStoryId)) selectedStoryId = (storiesSorted()[0] || {}).id || null; // a story is always open when there is one
    const story = selectedStoryId ? findStory(selectedStoryId) : null;
    if (story) {
      subject = '<span class="element-header-subject">' + escapeHtml(storyLabel(story)) + '</span>';
      actions = '<button type="button" data-action="story-player-open" data-story="' + escapeHtml(story.id) + '"' + (storySteps(story).length ? '' : ' disabled') + ' title="Play the story like slides, in a window of its own, from its first step: the editor behind it is not touched">Play</button>';
    }
    body = story ? renderStoryEditorHtml(story)
      : '<p class="muted story-intro">A story puts diagrams in order, with a sentence for each, to tell how part of the architecture works. To start, open a diagram in Applications or in Elements and press “Add to story…”, or create an empty story with “New story…”.</p>';
  }
  const header = renderElementHeaderHtml('<h2>Stories</h2>' + renderLibraryTabsHtml() + subject, actions);
  const notices = (storyNotice ? '<div class="error-panel" role="status">' + escapeHtml(storyNotice) + '</div>' : '') + renderLegacyEntriesNoticeHtml();
  // a view that can be drawn is drawn: the diagram of the Map under the header, and the panel on the right says what the view is and
  // what is selected in it; Maximize gives the diagram the room of both, as on the Map. One that cannot be drawn keeps its message and its facts.
  const recipe = onViews && selectedViewId ? libraryDiagramRecipe(findSavedView(selectedViewId)) : null;
  const center = recipe
    ? '<div class="diagram-view library-view">' + header + (notices ? '<div class="library-view-notices">' + notices + '</div>' : '') +
        renderDiagramCanvasHtml(null, '', recipe) + '</div>'
    : '<div class="story-view">' + header + '<div class="story-body">' + notices + body + '</div></div>';
  return {
    left: recipe && diagramMaximized ? null : renderLeftPanelWrapperHtml(onViews ? renderViewsNavHtml() : renderStoriesNavHtml()),
    center,
    right: libraryRightHtml(recipe),
    rightLabel: recipe && !diagramMaximized ? 'View and selection' : 'Changes',
    bottom: null
  };
}

/**
 * The tab of the right-hand panel of the page Stories that is shown: 'view' (what the view is and what is selected in it) or 'changes' (the list of the changes of the comparison, wave 015,
 * run 0103, #27). A choice of whoever looks; the tab is offered only while a comparison is on, and 'view' is shown otherwise.
 */
let libraryRightTab = 'view';

/** The comparison the page Stories lists the changes of: null when nothing is compared, or the two plateaus cannot be compared (the other pages say why). While the kernel loads: `{ pending }`. */
function libraryChangesState() {
  if (currentPerspective !== 'library') return null;
  const state = comparisonState();
  return state && !state.problems ? state : null;
}

/**
 * The right-hand panel of the page Stories (null: none). A view that can be drawn has its panel; with a comparison on it has two tabs, View and Changes, and the Changes tab holds the
 * very list the other pages have (`renderChangesPanelHtml`, with its filters and its Next and Previous buttons). A story, or a view that cannot be drawn, has no panel of its own: with a
 * comparison on the Changes panel is alone on the right, as on the page Plateaus, so that a story is read with the list of changes on screen.
 */
function libraryRightHtml(recipe) {
  const state = libraryChangesState();
  rightPanelPending = !!(state && state.pending);
  const panel = recipe && !diagramMaximized ? renderLibraryPanelHtml(recipe.view) : null;
  if (!state || (recipe && diagramMaximized)) return panel;
  const changes = state.pending ? renderChangesPendingHtml() : renderChangesPanelHtml(state);
  if (panel === null) return changes;
  const showChanges = libraryRightTab === 'changes';
  const tab = (id, label, on) => '<button type="button" data-action="set-right-tab" data-tab="' + id + '" aria-pressed="' + on + '">' + label + '</button>';
  return '<div class="right-tabs button-group" role="group" aria-label="Right panel">' + tab('view', 'View', !showChanges) +
    tab('changes', 'Changes' + (state.pending ? '' : ' <span class="field-count">' + state.changes.length + '</span>'), showChanges) + '</div>' + (showChanges ? changes : panel);
}

/** The right-hand panel of the page of a view: what the view is, then — once a box or a link of its diagram is selected — the inspection of the selection. */
function renderLibraryPanelHtml(view) {
  const selection = libraryPickFor(view.id).selection;
  const inspection = selection ? inspectionPanelHtml(selection, 'library') : null;
  if (selection && !inspection) libraryPickFor(view.id).selection = null; // the element was renamed or deleted since (in Elements, or by a save): nothing to show
  return '<div class="library-panel"><section class="library-view-section" aria-label="The view">' +
    '<h3>View</h3>' + renderViewAttributesHtml(view) + '</section>' +
    (inspection ? '<section class="library-selection" aria-label="The selection">' + inspection + '</section>' : '') + '</div>';
}

/** Dispatch to the active perspective's region content. */
function renderActivePerspectiveHtml() {
  if (currentPerspective === 'plateaus') return renderPlateausPerspectiveHtml();
  if (mapIsShown()) return renderMapPerspectiveHtml();
  if (currentPerspective === 'library') return renderLibraryPerspectiveHtml();
  if (currentPerspective === 'files') return renderFilesPerspectiveHtml();
  if (currentPerspective === 'settings') return renderSettingsPerspectiveHtml();
  return renderElementsPerspectiveHtml();
}

/**
 * The resizable grid shell (layout adapted from archi-edtior.html):
 * header spans the top, then whichever of the active perspective's
 * left/center/right/bottom regions it actually uses — a `null` region is
 * not rendered at all (no panel, no resize handle, no reserved space),
 * per-perspective, rather than shown disabled. The content area always
 * lands in the grid's 3rd (1fr) column via `col-start-3`, whether or not
 * the left nav (columns 1-2) is present — an empty, item-less `auto`
 * column collapses to zero width on its own, so this needs no conditional
 * grid-template-columns.
 */
function renderShellHtml() {
  // wave 014 (run 0080): the band of plateaus sits under the top bar; wave 015 (run 0097, W-9, #98): only while a page of the perspective Timeline is on screen (the plateau
  // drawn and the comparison are the editor's state, `AppState.layers`, and stay what they were while Stories, Files or Settings is open)
  const band = bandIsShown() ? renderPlateauBandHtml() : '';
  // wave 014 (run 0081): under the band, the pages of the Timeline perspective (Plateaus, Applications, Environments, Elements)
  const pages = AppState.workspace && !AppState.fatalError ? renderPageTabsHtml() : '';
  const rows = 1 + (band ? 1 : 0) + (pages ? 1 : 0);
  let html = '<div class="app-shell grid grid-cols-[auto_auto_minmax(0,1fr)] ' + (rows === 3 ? 'grid-rows-[auto_auto_auto_minmax(0,1fr)]' : rows === 2 ? 'grid-rows-[auto_auto_minmax(0,1fr)]' : 'grid-rows-[auto_minmax(0,1fr)]') + '">';
  html += renderTopPanelHtml();
  html += band;
  html += pages;
  if (AppState.fatalError) {
    html += '<div class="col-span-3 min-h-0"><div class="error-panel shell-error-panel"><strong>Error:</strong> ' + escapeHtml(AppState.fatalError) + '</div></div>';
  } else if (!AppState.workspace) {
    html += '<div class="col-span-3 min-h-0"><div class="center-placeholder">Loading…</div></div>';
  } else {
    const p = renderActivePerspectiveHtml();

    if (p.left) {
      html += p.left;
      html += renderResizeHandleHtml('panel-left', 'x', '1');
    }

    if (!p.right && !p.bottom) {
      html += '<main id="panel-center" class="center-panel col-start-3 min-h-0 min-w-0">' + p.center + '</main>';
    } else {
      html += '<div class="grid min-h-0 min-w-0 col-start-3 grid-rows-[minmax(0,1fr)_auto_auto]">';
      if (p.right) {
        html += '<div class="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_auto_auto]">';
        html += '<main id="panel-center" class="center-panel min-h-0 min-w-0">' + p.center + '</main>';
        html += renderResizeHandleHtml('panel-right', 'x', '-1');
        html += '<aside id="panel-right" class="right-panel min-w-56 w-72 max-w-[40vw]" aria-label="' + (p.rightLabel || 'Inspection') + '" style="' + savedPanelSizeStyle('panel-right', 'width') + '">' + p.right + '</aside>';
        html += '</div>';
      } else {
        html += '<main id="panel-center" class="center-panel min-h-0 min-w-0">' + p.center + '</main>';
      }
      if (p.bottom) {
        html += renderResizeHandleHtml('panel-bottom', 'y', '-1');
        html += '<section id="panel-bottom" class="bottom-panel min-h-32 h-48 max-h-[60vh]" style="' + savedPanelSizeStyle('panel-bottom', 'height') + '">' + p.bottom + '</section>';
      }
      html += '</div>';
    }
    html += renderReferenceDatalistsHtml();
  }
  html += renderAppDialogHtml();
  html += '</div>';
  return html;
}

/** Gives up everything not written to disk — what is typed in the form and every change in memory — after a confirmation. */
async function cancelChanges() {
  if (saveInFlight || !AppState.folder || !AppState.folder.handle) return;
  const count = countUnsavedChanges();
  if (count === 0 && !draftTyped) return;
  const what = count === 0 ? 'what you typed in this form' : count + ' modified item' + (count === 1 ? '' : 's') + (draftTyped ? ' and what you typed in this form' : '');
  if (!confirm('Cancel and discard ' + what + '?\n\nThe folder is read again from disk. This cannot be undone.')) return;
  draftTyped = false;
  rawYamlEditDraft = null;
  pendingDeleteConfirmation = null;
  saveStatus = { state: 'idle' };
  await loadWorkspace(AppState.folder.handle); // from the disk, and back to the element of the URL: the user keeps their place
}

/** The clicks that replace the form on screen. Without a "Save all changes" first, what was typed in it is lost. */
const ACTIONS_LEAVING_THE_FORM = new Set([
  'timeline-draw', 'timeline-changes',
  'set-perspective', 'set-page', 'select-file', 'select-element', 'goto-element', 'set-element-tab', 'toggle-element-edit',
  'select-link', 'open-create-child-form', 'open-create-top-level-form', 'open-as-diagram', 'show-on-map', 'close-folder',
  'select-story', 'story-play', 'story-restore', 'story-edit', 'saved-view-open',
  'library-tab', 'select-view', 'library-go-story', 'library-go-view', 'library-open-element', 'select-change'
]);

/** The clicks that write, or open a form that writes, an element. Each is allowed in the plateau drawn (wave 014, run 0082) unless it cannot be drawn (`layerActionRefusal`). A view and a story belong to no plateau (wave 015, run 0100): their clicks are not here. */
const WRITE_ACTIONS = new Set([
  'toggle-element-edit', 'add-qualifier', 'remove-qualifier', 'add-application', 'remove-application', 'add-replaces', 'remove-replaces', 'add-use', 'remove-use',
  'add-tag', 'remove-tag', 'add-relationship', 'remove-relationship', 'open-create-child-form', 'open-create-top-level-form', 'submit-create-child',
  'submit-create-top-level', 'request-delete-element', 'confirm-delete-element', 'open-move-dialog', 'move-confirm', 'fix-dangling'
]);

/** Asks before throwing away what was typed in a form and not applied. True when the user accepts (the draft is then gone). */
function confirmDiscardingDraft() {
  if (!confirm('Attention: what you typed in this form has not been saved.\n\nClick “Save all changes” to keep it. Leave anyway and lose it?')) return false;
  draftTyped = false;
  return true;
}

/**
 * Single delegated click handler for the whole #app subtree — every
 * interactive element declares `data-action` (and the data it needs),
 * so one listener (added idempotently each render(), see below) covers
 * every panel without per-node addEventListener calls (DEC-1's
 * innerHTML-template approach).
 */
function handleAppClick(e) {
  if (diagramPanned) { diagramPanned = false; return; } // the mouse button went up after dragging the diagram
  if (e.target && e.target.classList && e.target.classList.contains('app-dialog-backdrop')) { closeAppDialog(); return; } // a click beside the dialog
  const target = e.target.closest('[data-action]');
  const action = target ? target.getAttribute('data-action') : null;
  if (helpOpen && action !== 'toggle-help' && !(e.target.closest && e.target.closest('.help-menu'))) {
    setHelpOpen(false); // a click anywhere else closes the help — no redraw: the action of this click reads the fields as they are
  }
  if (headerMenuOpen && action !== 'toggle-header-menu') {
    // a click on an item of the "⋯" menu closes it and leaves the focus on the button (so a dialog the item opens gives it back there); a click elsewhere only closes it
    const inMenu = e.target.closest && e.target.closest('.header-overflow');
    if (!inMenu) setHeaderMenuOpen(false);
    else if (target) setHeaderMenuOpen(false, { focusButton: true });
  }
  if (!target) return;
  // what an action said (a line over the story bar, the step that can be put back) lasts until the next one
  if (action !== 'dialog-submit' && action !== 'story-player-open') storyBarNotice = null; // Play changes nothing of the editor behind it (wave 021, run 0153)
  if (removedStep && action !== 'story-undo' && action !== 'story-step-remove' && action !== 'story-player-open') removedStep = null;
  if (draftTyped && ACTIONS_LEAVING_THE_FORM.has(action) && !confirmDiscardingDraft()) return;
  // wave 014 (runs 0080 and 0082): a plateau that cannot be drawn is not written (see `layerActionRefusal`)
  if (WRITE_ACTIONS.has(action)) {
    const refusal = layerActionRefusal();
    if (refusal !== null) {
      saveStatus = { state: 'denied', message: refusal };
      render();
      return;
    }
  }
  switch (action) {
    case 'toggle-help':
      // e.detail is 0 for a click made with the keyboard (Enter, Space): then the focus goes along
      setHelpOpen(!helpOpen, helpOpen ? { focusButton: e.detail === 0 } : { focusMenu: e.detail === 0 });
      break;
    case 'toggle-header-menu':
      // e.detail is 0 for a click made with the keyboard (Enter, Space): then the focus goes along
      setHeaderMenuOpen(!headerMenuOpen, headerMenuOpen ? { focusButton: e.detail === 0 } : { focusMenu: e.detail === 0 });
      break;
    case 'open-folder':
      openFolder();
      break;
    case 'reopen-folder':
      reopenFolder();
      break;
    case 'open-remembered-folder':
      openRememberedFolder(rememberedFolderById(target.getAttribute('data-folder-id')));
      break;
    case 'forget-folder':
      forgetFolder(rememberedFolderById(target.getAttribute('data-folder-id')));
      break;
    case 'show-folders':
      showRememberedFolders();
      break;
    case 'retry-folder':
      retryFolder();
      break;
    case 'close-folder':
      closeFolder();
      break;
    case 'set-perspective':
    case 'set-page': // the bar under the band (the pages below Timeline) and the top bar (a perspective) open a page the same way
      setPerspective(target.getAttribute('data-perspective'));
      break;
    case 'toggle-files-group': { // wave 015 (run 0098): a group of the Files page folds and unfolds
      const group = target.getAttribute('data-group');
      if (filesFolded.has(group)) filesFolded.delete(group);
      else filesFolded.add(group);
      render();
      break;
    }
    case 'files-fold-all':
      filesGroups(AppState.manifestFiles).forEach((group) => filesFolded.add(group.key));
      render();
      break;
    case 'files-unfold-all':
      filesFolded.clear();
      render();
      break;
    case 'timeline-draw': // wave 014 (run 0081): the Plateaus page
      drawPlateau(target.getAttribute('data-plateau'));
      break;
    case 'timeline-changes':
      showPlateauChanges(target.getAttribute('data-plateau'));
      break;
    case 'open-mistakes': // wave 015 (run 0097): the band's button; the lists of the band are `chooseOnBand`
      openAppDialog({ kind: 'mistakes' });
      break;
    case 'set-changes-only': { // run 0040: the diagrams draw the changes with their context, or everything
      const only = target.getAttribute('data-value') === '1';
      if (only === AppState.changesOnly) break;
      AppState.changesOnly = only;
      rememberFlag('changes-only', only);
      diagramCache = null;
      mapSelectionCheck = true; // a selection the redraw no longer draws is dropped, as for a fold or a pin
      render();
      break;
    }
    case 'toggle-hide-wording': // run 0040: the changes of wording only are set aside (not drawn as changed, not listed, counted apart)
      AppState.hideWording = !AppState.hideWording;
      rememberFlag('hide-wording', AppState.hideWording);
      diagramCache = null;
      mapSelectionCheck = true;
      render();
      break;
    case 'set-right-tab':
      setRightTab(target.getAttribute('data-tab'));
      break;
    case 'change-next': // wave 015, run 0103 (#27): the list is read one change at a time
    case 'change-previous':
      walkChange(action === 'change-next' ? 'next' : 'previous');
      break;
    case 'change-filters-clear':
      clearChangesFilter();
      break;
    case 'accept-candidate':
      acceptCandidate({ layer: target.getAttribute('data-layer'), from: target.getAttribute('data-from'), to: target.getAttribute('data-to') });
      break;
    case 'dismiss-candidate':
      dismissCandidate({ layer: target.getAttribute('data-layer'), from: target.getAttribute('data-from'), to: target.getAttribute('data-to') });
      break;
    case 'restore-candidates':
      restoreCandidates();
      break;
    case 'select-change':
      selectChange({ thing: target.getAttribute('data-thing'), change: target.getAttribute('data-change'), layer: target.getAttribute('data-layer'), ref: target.getAttribute('data-ref'), to: target.getAttribute('data-to'), label: target.getAttribute('data-label') || '' });
      break;
    case 'select-file': {
      const relPath = target.getAttribute('data-relpath');
      // DEC-10/FLOW-4: keep the draft when re-selecting the very file it
      // belongs to; discard it for any other navigation.
      if (rawYamlEditDraft && rawYamlEditDraft.relPath !== relPath) rawYamlEditDraft = null;
      // TDD-0010 DEC-4: a file view is never the element a pending delete
      // confirmation belongs to — discard unconditionally.
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
      AppState.selection = { kind: 'file', key: relPath, mode: 'view' };
      render();
      break;
    }
    case 'select-element': {
      const reference = target.getAttribute('data-ref');
      if (rawYamlEditDraft) rawYamlEditDraft = null; // DEC-10/FLOW-4 — an element is never the draft's file
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null; // TDD-0010 DEC-4 — same discard-on-navigate philosophy
      const layer = target.getAttribute('data-layer'); // the tree row knows its layer (the reference can exist in both)
      AppState.selection = layer ? { kind: 'element', key: reference, layer, mode: 'view' } : { kind: 'element', key: reference, mode: 'view' };
      render();
      break;
    }
    case 'diagram-zoom': {
      const dir = target.getAttribute('data-dir');
      setDiagramScale(dir === 'in' ? diagramScaleStep(1) : dir === 'out' ? diagramScaleStep(-1) : dir === 'fit' ? 'fit' : 1);
      break;
    }
    case 'toggle-maximize':
      toggleDiagramMaximized();
      break;
    case 'diagram-recenter':
      resetDiagramView();
      break;
    case 'diagram-export':
      if (target.getAttribute('data-format') === 'png') exportDiagramPng(); else exportDiagramSvg();
      break;
    case 'toggle-fold': {
      const id = target.getAttribute('data-id');
      const mode = target.getAttribute('data-mode');
      if (mapIsShown()) {
        if (mode === 'expand') currentMapOpened().add(id);
        else { closeOnMap(id); mapSelectionCheck = true; }
      }
      render();
      break;
    }
    case 'map-pin': {
      const ref = target.getAttribute('data-ref');
      pushDiagramHistory();
      const map = mapStateOf();
      map.pinned = map.pinned.includes(ref) ? map.pinned.filter((r) => r !== ref) : map.pinned.concat([ref]);
      map.hidden = map.hidden.filter((h) => !(ref === h || ref.startsWith(h + '.')));
      if (map.pinned.includes(ref)) expandParentsOf(ref);
      mapSelectionCheck = true;
      render();
      break;
    }
    case 'map-unpin':
      pushDiagramHistory();
      mapStateOf().pinned = mapStateOf().pinned.filter((r) => r !== target.getAttribute('data-ref'));
      render();
      break;
    case 'map-hide': {
      const ref = target.getAttribute('data-ref');
      const map = mapStateOf();
      map.hidden = map.hidden.includes(ref) ? map.hidden.filter((r) => r !== ref) : map.hidden.concat([ref]);
      mapSelectionCheck = true;
      render();
      break;
    }
    case 'show-on-map': {
      const ref = target.getAttribute('data-ref');
      const layer = target.getAttribute('data-layer') === 'technology' ? 'technology' : 'application'; // the layer of the element on the page: the Map of that layer
      const map = mapStateOf(layer);
      map.pinned = [ref];
      map.hidden = map.hidden.filter((h) => !(ref === h || ref.startsWith(h + '.')));
      expandParentsOf(ref, layer);
      setPerspective(layer === 'technology' ? 'environments' : 'map');
      break;
    }
    case 'open-as-diagram':
      // the element on its own: its overview, unless a diagram was the last thing it showed
      if (elementTab === 'details') elementTab = 'overview';
      setPerspective('elements');
      break;
    case 'name-view':
      nameCurrentView();
      break;
    case 'add-to-story':
      addCurrentViewToStory();
      break;
    case 'select-story':
      selectStory(target.getAttribute('data-story'));
      break;
    case 'story-new':
      newStory();
      break;
    case 'story-delete':
      deleteStory(target.getAttribute('data-story'));
      break;
    case 'story-play':
      goToStoryStep(target.getAttribute('data-story'), Number(target.getAttribute('data-step') || 0));
      break;
    case 'story-player-open': // wave 021, run 0153 (#153): Play opens the player over the editor and touches nothing of it
      openStoryPlayer(target.getAttribute('data-story'), 0, { opener: target });
      break;
    case 'story-restore':
      if (activeStory) goToStoryStep(activeStory.id, activeStory.step);
      break;
    case 'story-edit':
      if (activeStory) { selectedStoryId = activeStory.id; storyNotice = null; libraryTab = 'stories'; setPerspective('library'); }
      break;
    case 'story-exit':
      activeStory = null;
      storyBarEditing = false;
      render();
      break;
    case 'story-step-up':
    case 'story-step-down':
      moveStoryStep(target.getAttribute('data-story'), Number(target.getAttribute('data-step')), action === 'story-step-down' ? 1 : -1);
      break;
    case 'story-step-remove':
      removeStoryStep(target.getAttribute('data-story'), Number(target.getAttribute('data-step')));
      break;
    case 'story-add-step': {
      const choice = document.getElementById('story-add-view');
      if (choice) addStoryStep(target.getAttribute('data-story'), choice.value);
      break;
    }
    case 'saved-view-open':
      openSavedView(target.getAttribute('data-view'));
      break;
    case 'library-tab':
      libraryTab = target.getAttribute('data-tab') === 'views' ? 'views' : 'stories';
      storyNotice = null;
      location.hash = currentRouteHash();
      pendingFocusSelector = '[data-action="library-tab"][data-tab="' + libraryTab + '"]';
      render();
      break;
    case 'select-view':
      selectedViewId = target.getAttribute('data-view');
      storyNotice = null;
      render();
      break;
    case 'library-go-view':
      libraryTab = 'views';
      selectedViewId = target.getAttribute('data-view');
      storyNotice = null;
      setPerspective('library');
      break;
    case 'library-go-story':
      libraryTab = 'stories';
      selectedStoryId = target.getAttribute('data-story');
      storyNotice = null;
      setPerspective('library');
      break;
    case 'plateau-create':
      openPlateauDialog('create', target.getAttribute('data-plateau'));
      break;
    case 'plateau-edit':
      openPlateauDialog('edit', target.getAttribute('data-plateau'));
      break;
    case 'plateau-delete':
      openPlateauDeleteDialog(target.getAttribute('data-plateau'));
      break;
    case 'dialog-cancel':
      closeAppDialog();
      break;
    case 'dialog-submit':
      submitAppDialog();
      break;
    case 'story-bar-edit':
      storyBarEditing = !storyBarEditing;
      pendingFocusSelector = storyBarEditing ? '.story-bar-text' : '[data-action="story-bar-edit"]';
      render();
      break;
    case 'story-undo':
      undoRemoveStoryStep();
      break;
    case 'story-step-name':
      keepStepAsNamedView(target.getAttribute('data-story'), Number(target.getAttribute('data-step')));
      break;
    case 'legacy-move':
      moveLegacyEntriesToManifests();
      break;
    case 'saved-view-rename':
      renameSavedView(target.getAttribute('data-view'));
      break;
    case 'saved-view-delete':
      deleteSavedView(target.getAttribute('data-view'));
      break;
    case 'view-list-remove': {
      const list = target.getAttribute('data-list');
      const reference = target.getAttribute('data-ref');
      pendingFocusSelector = '#view-edit-add-' + list;
      editSavedView((view) => setViewListItem(view, list, reference, false));
      break;
    }
    case 'toggle-show': {
      const name = target.getAttribute('data-show');
      if (!DIAGRAM_SHOW_NAMES.includes(name)) break;
      if (currentPerspective === 'library') { // the page of a view: the button edits the view, as the box of its panel does
        const view = libraryPageView();
        const recipe = view ? libraryDiagramRecipe(view) : null;
        if (recipe) editSavedView((entry) => setViewShow(entry, name, !recipe.shows[name]));
        break;
      }
      pushDiagramHistory();
      diagramShow[name] = !diagramShows(mapIsShown())[name];
      // back to the default is "no choice": the URL and the saved views then say nothing
      if (diagramShow[name] === DIAGRAM_SHOW_DEFAULTS[mapIsShown() ? 'map' : 'elements'][name]) diagramShow[name] = null;
      render();
      break;
    }
    case 'map-clear':
      pushDiagramHistory();
      mapStateOf().pinned = [];
      mapStateOf().hidden = [];
      render();
      break;
    case 'map-unhide':
      mapStateOf().hidden = mapStateOf().hidden.filter((r) => r !== target.getAttribute('data-ref'));
      render();
      break;
    case 'fold-all':
      if (mapIsShown()) { mapStateOf().opened = defaultMapOpened(); mapSelectionCheck = true; render(); }
      break;
    case 'unfold-all':
      if (mapIsShown()) {
        // one more level each time; a big map asks first
        const more = (diagramScene && diagramScene.expandable) || [];
        const boxes = mapBoxesIfOpened(more);
        if (boxes > MAP_UNFOLD_CONFIRM_BOXES && typeof window.confirm === 'function' &&
            !window.confirm('Unfolding one more level draws about ' + boxes + ' boxes, which can be slow and hard to read. Unfold anyway?')) break;
        for (const id of more) currentMapOpened().add(id);
        render();
        break;
      }
      break;
    case 'fix-dangling': {
      // a relationship that points at nothing is repaired where it is declared: in its owner's edit form
      const owner = target.getAttribute('data-ref');
      const ownerLayer = target.getAttribute('data-layer');
      AppState.selection = ownerLayer ? { kind: 'element', key: owner, layer: ownerLayer, mode: 'edit' } : { kind: 'element', key: owner, mode: 'edit' };
      expandAncestorsOf(owner, ownerLayer || undefined);
      scrollNavToSelection = true;
      setPerspective('elements');
      break;
    }
    case 'toggle-diagram-key': { // issue #132: the key under a comparison, folded or open (view state; the key is changed in place, nothing is drawn again)
      diagramKeyOpen = !diagramKeyOpen;
      syncDiagramKey();
      break;
    }
    case 'toggle-map-part': { // issue #107: the Map of the technology layer draws its applications and its relationships, or not (view state, not model state)
      const part = target.getAttribute('data-part');
      if (!MAP_PARTS.includes(part)) break;
      if (currentPerspective === 'library') { // the page of a view: the button edits the view, as the box of its form does
        const view = libraryPageView();
        const recipe = view ? libraryDiagramRecipe(view) : null;
        if (recipe && recipe.parts) editSavedView((entry) => setViewMapPart(entry, part, !recipe.parts[part]));
        break;
      }
      if (!mapIsShown() || mapLayer() !== 'technology') break;
      pushDiagramHistory();
      technologyMapParts[part] = !technologyMapParts[part];
      mapSelectionCheck = true; // the boxes of the applications go with their toggle: a selection the redraw no longer draws is dropped
      render();
      break;
    }
    case 'toggle-hide-unlinked':
      if (currentPerspective === 'library') { // see 'toggle-show'
        const view = libraryPageView();
        const recipe = view ? libraryDiagramRecipe(view) : null;
        if (recipe) editSavedView((entry) => setViewHideUnlinked(entry, !recipe.hideUnlinked));
        break;
      }
      if (!mapIsShown() && !diagramTabShown()) break;
      pushDiagramHistory();
      diagramHideUnlinked = !diagramHideUnlinked;
      mapSelectionCheck = true;
      render();
      break;
    case 'clear-facet': {
      pushDiagramHistory();
      diagramFacet = null;
      mapSelectionCheck = true;
      render();
      break;
    }
    case 'set-element-tab': {
      const next = target.getAttribute('data-tab');
      if (Object.prototype.hasOwnProperty.call(ELEMENT_TABS, next) && next !== elementTab) { pushDiagramHistory(); elementTab = next; }
      render();
      break;
    }
    case 'goto-element': {
      const destinationRef = target.getAttribute('data-ref');
      if (currentPerspective === 'library') { // a box of the page of a view (or an element named in its panel): selected here, the page and its address stay
        selectOnLibraryPage({ kind: 'element', key: destinationRef, layer: target.getAttribute('data-layer') || 'application', mode: 'view' });
        break;
      }
      if (AppState.selection.key !== destinationRef) pushDiagramHistory();
      if (mapIsShown() && diagramScale === 'auto') {
        const canvas = document.getElementById('diagram-canvas');
        if (canvas) takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
      }
      if (rawYamlEditDraft) rawYamlEditDraft = null; // DEC-10/FLOW-4 — an element is never the draft's file
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null; // TDD-0010 DEC-4 — same discard-on-navigate philosophy
      const destinationLayer = target.getAttribute('data-layer');
      AppState.selection = destinationLayer ? { kind: 'element', key: destinationRef, layer: destinationLayer, mode: 'view' } : { kind: 'element', key: destinationRef, mode: 'view' };
      expandAncestorsOf(destinationRef, destinationLayer || undefined); // FR-14/FLOW-5
      scrollNavToSelection = true;
      render();
      break;
    }
    case 'select-link': {
      if (currentPerspective === 'library') { // the page of a view: the link is selected in its panel, the Map's selection is not touched
        const pageNth = target.getAttribute('data-nth');
        diagramLinkStop = diagramLinkKeyOf(target);
        selectOnLibraryPage(linkSelectionFor(target.getAttribute('data-from'), target.getAttribute('data-to'), target.getAttribute('data-layer'), pageNth === null ? null : parseInt(pageNth, 10), null));
        break;
      }
      // a link is not a place: no history entry, no change of perspective, tab or box; the drafts go like for any other selection
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
      if (mapIsShown() && diagramScale === 'auto') {
        const canvas = document.getElementById('diagram-canvas');
        if (canvas) takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
      }
      const nth = target.getAttribute('data-nth');
      diagramLinkStop = diagramLinkKeyOf(target); // a click moves the stop of the links to its link, whether or not the browser focuses it
      selectLink(target.getAttribute('data-from'), target.getAttribute('data-to'), target.getAttribute('data-layer'), nth === null ? null : parseInt(nth, 10));
      if (mapIsShown()) revealLinkAfterDrawing = { nth: Number.isInteger(parseInt(nth, 10)) ? parseInt(nth, 10) : null }; // the panel narrows the Map: the link must not end up behind it
      render();
      break;
    }
    case 'select-removed': {
      const removedRef = target.getAttribute('data-ref');
      const removedLayer = target.getAttribute('data-layer') || 'application';
      if (currentPerspective === 'library') { selectOnLibraryPage({ kind: 'baseline-element', key: removedRef, layer: removedLayer, mode: 'view' }); break; }
      if (mapIsShown() && diagramScale === 'auto') {
        const canvas = document.getElementById('diagram-canvas');
        if (canvas) takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
      }
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
      // on the Map nothing else is selected any more (the panel is about this box); in Elements the element of the diagram stays the subject
      if (mapIsShown()) AppState.selection = { kind: 'none', key: null, mode: 'view' };
      removedPick = { reference: removedRef, layer: removedLayer, selection: JSON.stringify(AppState.selection) };
      render();
      break;
    }
    case 'close-removed':
      if (currentPerspective === 'library') { closeLibrarySelection(); break; }
      removedPick = null;
      render();
      break;
    case 'close-inspection': // nothing else deselects on the Map; in Elements a link goes back to its element
      removedPick = null;
      if (currentPerspective === 'library') { closeLibrarySelection(); break; }
      if (AppState.selection.kind === 'link') dropLinkSelection(); else AppState.selection = { kind: 'none', key: null, mode: 'view' };
      render();
      break;
    case 'library-open-element': {
      // the one way out of the page from its panel: the element is selected in Elements, as the Map's "Open in Elements" does for its selection
      const openedRef = target.getAttribute('data-ref');
      const openedLayer = target.getAttribute('data-layer');
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
      AppState.selection = openedLayer ? { kind: 'element', key: openedRef, layer: openedLayer, mode: 'view' } : { kind: 'element', key: openedRef, mode: 'view' };
      expandAncestorsOf(openedRef, openedLayer || undefined);
      scrollNavToSelection = true;
      setPerspective('elements');
      break;
    }
    case 'toggle-element-edit':
      if (AppState.selection.kind === 'element') {
        AppState.selection.mode = AppState.selection.mode === 'edit' ? 'view' : 'edit';
      }
      render();
      break;
    case 'toggle-branch': {
      const branch = target.getAttribute('data-branch');
      if (branch === 'applications') {
        treeExpandedApplications = !treeExpandedApplications;
      } else if (branch === 'environments') {
        treeExpandedEnvironments = !treeExpandedEnvironments;
      }
      render();
      break;
    }
    case 'nav-unfold-all':
    case 'nav-fold-all': {
      // the tree of one layer: its elements, and — in Elements, where each tree has its own header — the tree itself
      const unfold = action === 'nav-unfold-all';
      const treeLayer = target.getAttribute('data-layer');
      referencesWithChildren(treeLayer).forEach((reference) => (unfold ? AppState.expanded.add(nodeKey(reference, treeLayer)) : AppState.expanded.delete(nodeKey(reference, treeLayer))));
      const branch = target.getAttribute('data-branch');
      if (branch === 'applications') treeExpandedApplications = unfold;
      else if (branch === 'environments') treeExpandedEnvironments = unfold;
      render();
      break;
    }
    case 'toggle-element':
      toggleExpandedKey(nodeKey(target.getAttribute('data-ref'), target.getAttribute('data-layer')));
      render();
      break;
    case 'add-qualifier': {
      const reference = target.getAttribute('data-ref');
      const input = document.getElementById('add-qualifier-input');
      const result = validateNewListEntry(input ? input.value : '');
      if (!result.valid) {
        setInlineErrorText('add-qualifier-error', result.error);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        const qualifiers = Array.isArray(node.qualifiers) ? node.qualifiers.slice() : [];
        qualifiers.push(result.value);
        node.qualifiers = qualifiers;
      });
      break;
    }
    case 'remove-qualifier': {
      if (!confirm('Remove this qualifier?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        node.qualifiers = withoutNthPresent(node.qualifiers, index); // the place among the pills drawn, not in the list: an item with no value is not drawn (#120)
      });
      break;
    }
    case 'add-application': {
      const reference = target.getAttribute('data-ref');
      const input = document.getElementById('add-application-input');
      const result = validateNewListEntry(input ? input.value : '');
      if (!result.valid) {
        setInlineErrorText('add-application-error', result.error);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        const applications = Array.isArray(node.applications) ? node.applications.slice() : [];
        applications.push(result.value);
        node.applications = applications;
      });
      break;
    }
    case 'remove-application': {
      if (!confirm('Remove this application reference?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        node.applications = withoutNthPresent(node.applications, index);
      });
      break;
    }
    case 'add-replaces': { // wave 009: the same writer as "Write replaces" (`replacesWith`), through the same edit as the other lists
      const reference = target.getAttribute('data-ref');
      const record = findElementRecord(reference);
      const input = document.getElementById('add-replaces-input');
      const result = record ? validateNewReplaces(record, input ? input.value : '') : { valid: false, error: 'Element not found.' };
      if (!result.valid) {
        setInlineErrorText('add-replaces-error', result.error);
        break;
      }
      const layerProblem = addReplacesLayerProblem(record, result.value); // #138: the check of "Write replaces" (#130), before anything is written
      if (layerProblem) {
        setInlineErrorText('add-replaces-error', layerProblem);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        node.replaces = replacesWith(node.replaces, result.value);
      });
      break;
    }
    case 'remove-replaces': {
      if (!confirm('Remove this reference from replaces?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        const replaces = Array.isArray(node.replaces) ? node.replaces.slice() : [];
        replaces.splice(index, 1);
        if (replaces.length > 0) node.replaces = replaces; else delete node.replaces;
      });
      break;
    }
    case 'add-use': {
      const reference = target.getAttribute('data-ref');
      const input = document.getElementById('add-use-input');
      const result = validateNewUse(reference, input ? input.value : '');
      if (!result.valid) {
        setInlineErrorText('add-use-error', result.error);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        const uses = Array.isArray(node.uses) ? node.uses.slice() : [];
        uses.push(result.value);
        node.uses = uses;
      });
      break;
    }
    case 'remove-use': {
      if (!confirm('Remove this used environment or node?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        const uses = withoutNthPresent(node.uses, index);
        if (uses.length > 0) node.uses = uses; else delete node.uses;
      });
      break;
    }
    case 'add-tag': {
      const reference = target.getAttribute('data-ref');
      const record = findElementRecord(reference);
      const keyInput = document.getElementById('add-tag-key-input');
      const valueInput = document.getElementById('add-tag-value-input');
      const result = validateNewTagKey(keyInput ? keyInput.value : '', record ? record.tags : {});
      if (!result.valid) {
        setInlineErrorText('add-tag-error', result.error);
        break;
      }
      const value = valueInput ? valueInput.value : '';
      commitElementWithDraft(reference, (node) => {
        const tags = (node.tags && typeof node.tags === 'object') ? copyOwnKeys(node.tags) : {};
        setOwnKey(tags, result.key, value); // an own key even for `__proto__`: a plain assignment would drop it
        node.tags = tags;
      });
      break;
    }
    case 'remove-tag': {
      if (!confirm('Remove this tag?')) break;
      const reference = target.getAttribute('data-ref');
      const key = target.getAttribute('data-key');
      commitElementWithDraft(reference, (node) => {
        const tags = (node.tags && typeof node.tags === 'object') ? copyOwnKeys(node.tags) : {};
        delete tags[key];
        node.tags = tags;
      });
      break;
    }
    case 'add-relationship': {
      const reference = target.getAttribute('data-ref');
      const row = target.closest('.relationship-edit-row');
      const draft = readRelationshipDraftFromRow(row);
      if (!draft.valid) {
        setRowInlineErrorText(row, draft.error);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        const relationships = Array.isArray(node.relationships) ? node.relationships.slice() : [];
        relationships.push(applyRelationshipDraft({}, draft)); // no empty label / qualifiers / tags keys
        node.relationships = relationships;
      });
      break;
    }
    case 'remove-relationship': {
      if (!confirm('Remove this relationship?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        const relationships = Array.isArray(node.relationships) ? node.relationships.slice() : [];
        relationships.splice(index, 1);
        node.relationships = relationships;
      });
      break;
    }
    case 'add-facet': {
      const input = document.getElementById('add-facet-name-input');
      const result = validateFacetName(input ? input.value : '', AppState.workspace.settings.facets.customs);
      setInlineErrorText('add-facet-error', result.valid ? '' : result.error);
      if (!result.valid) break;
      const draft = readSettingsDraft();
      if (!draft.valid) break;
      commitSettingsEdit((settings) => {
        draft.apply(settings);
        settings.facets.customs = settings.facets.customs.concat([{ name: result.name, actions: [] }]);
      });
      break;
    }
    case 'remove-facet': {
      if (!confirm('Remove this facet?')) break;
      const facetIndex = parseInt(target.getAttribute('data-facet-index'), 10);
      const draft = readSettingsDraft();
      if (!draft.valid) break;
      commitSettingsEdit((settings) => {
        draft.apply(settings);
        const customs = settings.facets.customs.slice();
        customs.splice(facetIndex, 1);
        settings.facets.customs = customs;
      });
      break;
    }
    case 'add-facet-action': {
      const facetIndex = parseInt(target.getAttribute('data-facet-index'), 10);
      const row = target.closest('.relationship-edit-row');
      const result = validateFacetActionDraft(row.querySelector('.facet-action-jsonpath-input').value);
      if (!result.valid) {
        setRowInlineErrorText(row, result.error);
        break;
      }
      const operator = row.querySelector('.facet-action-operator-input').value;
      const draft = readSettingsDraft();
      if (!draft.valid) break;
      commitSettingsEdit((settings) => {
        draft.apply(settings);
        const customs = settings.facets.customs.slice();
        const facet = customs[facetIndex];
        customs[facetIndex] = Object.assign({}, facet, { actions: facet.actions.concat([{ operator: operator, jsonPath: result.jsonPath }]) });
        settings.facets.customs = customs;
      });
      break;
    }
    case 'remove-facet-action': {
      if (!confirm('Remove this action?')) break;
      const facetIndex = parseInt(target.getAttribute('data-facet-index'), 10);
      const actionIndex = parseInt(target.getAttribute('data-action-index'), 10);
      const draft = readSettingsDraft();
      if (!draft.valid) break;
      commitSettingsEdit((settings) => {
        draft.apply(settings);
        const customs = settings.facets.customs.slice();
        const facet = customs[facetIndex];
        const actions = facet.actions.slice();
        actions.splice(actionIndex, 1);
        customs[facetIndex] = Object.assign({}, facet, { actions: actions });
        settings.facets.customs = customs;
      });
      break;
    }
    case 'reload-file-edit': {
      const relPath = target.getAttribute('data-relpath');
      const mf = AppState.manifestFiles.find((f) => f.relPath === relPath);
      if (!mf || !mf.existedOnDisk) break;
      if (fileHasUnsavedChanges(relPath)) {
        const others = AppState.manifestFiles.filter((f) => f.dirty && f.relPath !== relPath).map((f) => f.relPath);
        const message = 'Discard unsaved changes to ' + relPath + ' and reload it from disk?' +
          (others.length > 0 ? '\n\nOther modified files are NOT reverted:\n' + others.join('\n') : '');
        if (!confirm(message)) break;
      }
      reloadManifestFile(relPath);
      break;
    }
    case 'open-create-child-form': {
      // TDD-0010 DEC-1: category is determined the same way
      // readElementDraft does — whichever index Map holds it.
      const reference = target.getAttribute('data-ref');
      const category = layerOfReference(reference) || 'application'; // the layer of the element being edited (the selection)
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      AppState.selection = { kind: 'create', createMode: 'child', category, parentReference: reference };
      render();
      break;
    }
    case 'open-create-top-level-form': {
      const category = target.getAttribute('data-category');
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      AppState.selection = { kind: 'create', createMode: 'top-level', category, parentReference: null };
      render();
      break;
    }
    case 'cancel-create': {
      // TDD-0010 DEC-1: no AppState mutation beyond resetting selection —
      // a create form backed out of leaves nothing behind.
      const sel = AppState.selection;
      if (sel.kind === 'create' && sel.createMode === 'child') {
        AppState.selection = { kind: 'element', key: sel.parentReference, layer: sel.category, mode: 'edit' };
      } else {
        AppState.selection = { kind: 'none', key: null, mode: 'view' };
      }
      render();
      break;
    }
    case 'submit-create-child': {
      const sel = AppState.selection;
      const parentReference = sel.parentReference;
      const category = sel.category;
      const kindSelect = document.getElementById('create-kind-select');
      const idInput = document.getElementById('create-id-input');
      const nameInput = document.getElementById('create-name-input');
      const descriptionInput = document.getElementById('create-description-input');

      setInlineErrorText('create-id-error', '');
      setInlineErrorText('create-form-error', '');

      // commitCreateChildElement re-validates the kind (DEC-3, "never trust the DOM alone"), the id (a safe id,
      // not already used by the same layer) and rejects with the field to blame.
      const created = commitCreateChildElement({
        parentReference,
        layer: category,
        kind: kindSelect ? kindSelect.value : '',
        id: idInput ? idInput.value : '',
        name: normalizeOptionalText(nameInput ? nameInput.value : ''),
        description: normalizeOptionalText(descriptionInput ? descriptionInput.value : '')
      });
      if (!created.ok) {
        setInlineErrorText(created.field === 'id' ? 'create-id-error' : 'create-form-error', created.error);
        break;
      }
      if (created.pending) break; // wave 014 (run 0082): the author is asked first; the form stays until the answer

      // FR-3: one extra render after commitElementEdit's own rebuild
      // render, which still carried the stale (create-form) selection.
      AppState.selection = { kind: 'element', key: created.createdReference, layer: created.layer, mode: 'edit' };
      render();
      break;
    }
    case 'submit-create-top-level': {
      const sel = AppState.selection;
      const category = sel.category;
      const kindSelect = document.getElementById('create-kind-select');
      const idInput = document.getElementById('create-id-input');
      const nameInput = document.getElementById('create-name-input');
      const descriptionInput = document.getElementById('create-description-input');
      const attachUnderInput = document.getElementById('create-attach-under-input');

      setInlineErrorText('create-id-error', '');
      setInlineErrorText('create-attach-under-error', '');
      setInlineErrorText('create-form-error', '');

      const chosenKind = kindSelect ? kindSelect.value : '';
      const allowedTopLevelKinds = TOP_LEVEL_KIND_OPTIONS[category] || [];
      if (allowedTopLevelKinds.indexOf(chosenKind) === -1) {
        setInlineErrorText('create-form-error', 'Invalid kind for this category.');
        break;
      }

      const attachUnderRaw = attachUnderInput ? attachUnderInput.value.trim() : '';
      const attachUnder = attachUnderRaw === '' ? null : attachUnderRaw;
      const mapping = ARCHICODE_KIND_MAP[chosenKind];
      const rootKind = mapping ? mapping.rootKind : null;

      // FR-6(a): attach-under filled — must resolve, and the parent's own
      // kind must be able to contain the chosen kind.
      if (attachUnder) {
        const parentRecord = AppState.index[category] ? AppState.index[category].get(attachUnder) : null;
        if (!parentRecord) {
          setInlineErrorText('create-attach-under-error', 'No element "' + attachUnder + '" exists in this category.');
          break;
        }
        const attachOk = childKindOptionsForLevel(parentRecord.level).indexOf(rootKind) !== -1;
        if (!attachOk) {
          setInlineErrorText('create-attach-under-error', 'Element "' + attachUnder + '" cannot contain a "' + chosenKind + '".');
          break;
        }
      } else {
        // FR-6(b): attach-under left blank — the chosen kind must be one
        // the real domain model allows as a genuinely unparented root.
        const blankAllowed = TOP_LEVEL_BLANK_ATTACH_ALLOWED[category] || [];
        if (blankAllowed.indexOf(chosenKind) === -1) {
          setInlineErrorText('create-form-error', 'A "' + chosenKind + '" must have "Attach under" filled in — it is never a top-level root.');
          break;
        }
      }

      const idCheck = validateElementId(idInput ? idInput.value : '');
      if (!idCheck.valid) {
        setInlineErrorText('create-id-error', idCheck.error);
        break;
      }
      const id = idCheck.id;
      // FR-7: id-collision check against the resulting full reference.
      const newReference = attachUnder ? (attachUnder + '.' + id) : id;
      if (AppState.index[category] && AppState.index[category].has(newReference)) {
        setInlineErrorText('create-id-error', 'Another element already uses reference "' + newReference + '".');
        break;
      }

      const name = normalizeOptionalText(nameInput ? nameInput.value : '');
      const description = normalizeOptionalText(descriptionInput ? descriptionInput.value : '');

      let result;
      try {
        result = commitCreateTopLevelElement({
          category, headerKind: chosenKind, attachUnderReference: attachUnder, id, name, description
        }, { afterConfirm: () => { AppState.selection = { kind: 'element', key: newReference, layer: category, mode: 'edit' }; render(); } });
      } catch (err) { // wave 014 (run 0082): a plateau that cannot take the element says why
        setInlineErrorText('create-form-error', err && err.message ? err.message : String(err));
        break;
      }
      if (result && result.pending) break; // the author is asked first; the form stays until the answer

      // FR-3: one extra render after commitCreateTopLevelElement's own
      // rebuild render, which still carried the stale (create-form) selection.
      AppState.selection = { kind: 'element', key: result.createdReference, layer: category, mode: 'edit' };
      render();
      break;
    }
    case 'request-delete-element': {
      // TDD-0010 DEC-4: compute the impact scan and render it inline,
      // overlaid on the already-rendering edition view — no AppState
      // mutation happens here.
      const reference = target.getAttribute('data-ref');
      const category = layerOfReference(reference) || 'application'; // the layer of the element being edited (the selection)
      const impact = computeDeleteImpact(reference, category);
      // wave 014 (run 0082): an element another plateau declares is not deleted from its manifest: the plateau drawn takes it out with a `REMOVE` patch
      const writing = writingPlateau();
      const record = AppState.index[category] ? AppState.index[category].get(reference) : null;
      const removal = writing !== null && writing !== BASELINE_PLATEAU && record && record.declaredIn !== writing ? { plateau: writing, declaredIn: record.declaredIn } : null;
      pendingDeleteConfirmation = { reference, category, affected: impact.affected, files: removal ? [] : impact.files, deletedReferences: impact.deletedReferences, removal };
      render();
      break;
    }
    case 'confirm-delete-element': {
      // TDD-0010 DEC-6: commitDeleteElement itself clears
      // pendingDeleteConfirmation and calls rebuildIndexAndRender.
      if (pendingDeleteConfirmation) {
        try {
          commitDeleteElement(pendingDeleteConfirmation.reference, pendingDeleteConfirmation.category, pendingDeleteConfirmation.affected);
        } catch (err) {
          const failed = pendingDeleteConfirmation.reference;
          pendingDeleteConfirmation = null;
          saveStatus = { state: 'error', failedFile: failed, message: err && err.message ? err.message : String(err) };
          render();
        }
      }
      break;
    }
    case 'cancel-delete-element':
      // TDD-0010 DEC-4, AC-11: no AppState mutation — only the transient
      // confirmation overlay is discarded.
      pendingDeleteConfirmation = null;
      render();
      break;
    case 'open-move-dialog':
      openMoveDialog();
      break;
    case 'move-confirm':
      submitMoveDialog();
      break;
    case 'cancel-changes':
      cancelChanges();
      break;
    case 'save-all-changes':
      // TDD-0010 DEC-7/ASM-2: saveAllChanges() is called directly and
      // synchronously from this click handler so its first await
      // (inside ensureWritePermission) is still reached within the
      // triggering user gesture.
      if (!flushPendingDraft()) break; // an invalid form shows its own errors and nothing is written
      saveAllChanges();
      break;
    default:
      break;
  }
}

/**
 * Drag-to-resize for the shell's panels (layout adapted from
 * archi-edtior.html) — delegated on #app the same way handleAppClick is,
 * rather than attached per-handle at mount time: render() replaces #app's
 * entire innerHTML on every click/edit, which would silently detach a
 * directly-attached listener the next time anything elsewhere is clicked.
 * A drag gesture itself never touches AppState (only the panel's own
 * inline style), so no render() ever fires mid-drag to invalidate the
 * `panel`/`handle` references captured below.
 */
function handleAppPointerDown(e) {
  if (e.target.closest && e.target.closest('#diagram-canvas')) { startDiagramPan(e); return; }
  const handle = e.target.closest('[data-resize]');
  if (!handle) return;
  const panel = document.getElementById(handle.dataset.resize);
  if (!panel) return;

  e.preventDefault();
  const horizontal = handle.dataset.axis === 'x';
  const sign = Number(handle.dataset.sign);
  const property = horizontal ? 'width' : 'height';
  const storageKey = PANEL_SIZE_STORAGE_PREFIX + handle.dataset.resize + ':' + property;

  const start = horizontal ? e.clientX : e.clientY;
  const rect = panel.getBoundingClientRect();
  const startSize = horizontal ? rect.width : rect.height;

  handle.setPointerCapture(e.pointerId);
  handle.dataset.active = '';
  document.body.classList.add('select-none');

  const onMove = (moveEvent) => {
    const delta = (horizontal ? moveEvent.clientX : moveEvent.clientY) - start;
    panel.style[property] = (startSize + sign * delta) + 'px';
  };
  const onUp = () => {
    handle.removeEventListener('pointermove', onMove);
    delete handle.dataset.active;
    document.body.classList.remove('select-none');

    // Store the rendered size, already bounded by the panel's min-/max-*
    // classes, so it reopens within range next time.
    const size = horizontal ? panel.getBoundingClientRect().width : panel.getBoundingClientRect().height;
    panelSizeStorage.set(storageKey, String(Math.round(size)));
  };

  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp, { once: true });
  handle.addEventListener('pointercancel', onUp, { once: true });
}

/** Double-click a resize handle to forget its persisted size and fall back to the panel's default (its min-/max-/base-width classes). */
function handleAppDblClick(e) {
  const handle = e.target.closest('[data-resize]');
  if (!handle) return;
  const horizontal = handle.dataset.axis === 'x';
  const property = horizontal ? 'width' : 'height';
  panelSizeStorage.remove(PANEL_SIZE_STORAGE_PREFIX + handle.dataset.resize + ':' + property);
  render();
}

