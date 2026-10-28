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
  // wave 026 run 0199 (issue #143): the relationships a Map is narrowed to, sorted by key and without repeats, after `opened`
  const links = canonicalLinkEntries(linkEntriesOf(source.links).entries);
  if (links.length) out.links = links;
  // wave 026 run 0200 (issue #143, DEC-1): the relationships drawn heavy, written as `links` are
  const highlight = canonicalLinkEntries(linkEntriesOf(source.highlight, 'highlight').entries);
  if (highlight.length) out.highlight = highlight;
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
  // `links` and `highlight` are the Map of the application layer's alone
  if (viewpoint !== 'map' || viewLayerOf(view) !== 'application') {
    delete properties.links;
    delete properties.highlight;
  }
  if (viewpoint === 'map') delete properties.element; // a Map is about its pins, not about one element
  return { viewpoint, layer: viewLayerOf(view), properties };
}

/** What the diagram on screen is, as a view; null when no diagram is on screen (a page, a form). */
function currentViewDefinition() {
  const facetName = diagramFacet && currentDiagramFacet() ? diagramFacet : null;
  if (mapIsShown()) {
    const state = currentMapState();
    return canonicalViewDefinition({
      viewpoint: 'map',
      layer: mapLayer(),
      properties: Object.assign(
        {
          pinned: state.pinned,
          hidden: state.hidden,
          opened: state.opened,
          links: mapLayer() === 'application' ? mapLinks : [],
          highlight: mapLayer() === 'application' ? mapHighlight : [],
          facet: facetName,
          'hide-unlinked': diagramHideUnlinked
        },
        mapPartsShown(),
        diagramShowOverrides(true)
      )
    });
  }
  if (diagramTabShown()) {
    const sel = elementSelection();
    const record = findElementRecord(sel.key, sel.layer);
    return canonicalViewDefinition({
      viewpoint: effectiveDiagramViewpoint(record),
      layer: layerOfReference(sel.key, sel.layer),
      properties: Object.assign(
        { element: sel.key, facet: facetName, 'hide-unlinked': diagramHideUnlinked },
        diagramShowOverrides(false)
      )
    });
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
    return record ? record.name || record.id : reference;
  };
  let text;
  if (definition.viewpoint === 'map') {
    const pinned = stringList(definition.properties.pinned);
    text = pinned.length
      ? 'Map of ' +
        pinned
          .slice(0, 3)
          .map((reference) => nameOf(reference, definition.layer))
          .join(', ') +
        (pinned.length > 3 ? ' and ' + (pinned.length - 3) + ' more' : '')
      : definition.layer === 'technology'
        ? 'Map of the environments'
        : 'Map';
  } else {
    text =
      (definition.properties.element ? nameOf(definition.properties.element, definition.layer) : '(no element)') +
      ' — ' +
      capitalizeWord(definition.viewpoint);
  }
  return text + (definition.properties.facet ? ' (facet ' + definition.properties.facet + ')' : '');
}

function viewLabel(view) {
  return (typeof view.name === 'string' && view.name) || describeViewDefinition(view);
}

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
 * plateau drawn. `against`: the plateau a step says it is compared with (null: none; absent: the comparison on screen when `plateau` is absent too). `name` is how the sentences call the view (default its id; a step with its own recipe is `step_NN`).
 */
function viewProblem(view, plateau, name, against) {
  if (!isPlainObject(view)) return 'This view does not exist.';
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const index = indexOfPlateau(plateau);
  const viewName = typeof name === 'string' ? name : view.id;
  if (view.viewpoint === 'map') {
    const pinned = stringList(properties.pinned);
    const layer = viewLayerOf(view);
    const linksProblem =
      viewLinksProblem(properties, index, layer, viewName, plateau, against) ||
      viewLinksProblem(properties, index, layer, viewName, plateau, against, 'highlight'); // run 0200 DEC-6: the same table
    if (linksProblem) return linksProblem;
    if (!pinned.length || pinned.some((reference) => index[layer].has(reference))) return null;
    return viewLacksInPlateau(pinned, layer, plateau) || 'None of the elements it was pinned on exists any more.';
  }
  if (!STORY_DIAGRAM_VIEWPOINTS.includes(view.viewpoint))
    return 'The editor does not draw the viewpoint “' + view.viewpoint + '”.';
  const layer = viewLayerOf(view);
  if (typeof properties.element !== 'string' || !properties.element)
    return 'the view `' + viewName + '` has no element: write the reference of one in `properties.element`';
  if (!index[layer].has(properties.element)) {
    return (
      viewLacksInPlateau([properties.element], layer, plateau) ||
      'the view `' + viewName + '` names `' + properties.element + '`, which does not exist'
    );
  }
  return null;
}

/**
 * The sentence for the `links` of a Map view that cannot be drawn, or null (DEC-7 (f), the command line's words without the prefix `error:`). A workspace with no plateau and a view
 * with no facet is told the mistakes of an entry; with plateaus or a facet an entry the model lacks is dropped, and only a choice none of whose entries is there is told.
 */
function viewLinksProblem(properties, index, layer, viewName, plateau, against, key) {
  const name = key || 'links';
  if (properties[name] === undefined || properties[name] === null) return null;
  const prefix = 'the view `' + viewName + '`: ';
  if (layer !== 'application') return prefix + name + ' is read in the map of the application layer only';
  const read = linkEntriesOf(properties[name], name);
  if (read.problems.length) return prefix + read.problems[0];
  if (!read.entries.length) return null;
  const named = plateau === null || plateau === undefined ? writingPlateau() : plateau;
  if (named === null && !properties.facet) {
    for (let i = 0; i < read.entries.length; i++) {
      const entry = read.entries[i];
      for (const end of [entry.source, entry.destination])
        if (!index.application.has(end)) return prefix + 'dangling reference: ' + end;
      if (!linkEntryExists(entry, index.application)) {
        const label = normalLinkLabel(entry.label);
        return (
          prefix +
          '`' +
          name +
          '[' +
          i +
          ']` names a relationship from `' +
          entry.source +
          '` to `' +
          entry.destination +
          '` with ' +
          (label ? 'the label `' + label + '`' : 'no label') +
          ', which does not exist'
        );
      }
    }
    return null;
  }
  // a relationship the plateau compared with has can be ticked: the comparison on screen, or the plateau a step says it is compared with
  const compared =
    against !== undefined
      ? against
        ? layerModelOf(against, AppState.workspace.settings)
        : null
      : plateau === null || plateau === undefined
        ? AppState.baseline
        : null;
  if (
    name === 'links' &&
    named !== null &&
    !read.entries.some(
      (entry) =>
        linkEntryExists(entry, index.application) || (compared && linkEntryExists(entry, compared.index.application))
    )
  )
    return 'None of the relationships it shows is in the plateau “' + named + '”.';
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
  return (
    (references.length === 1 ? 'The element “' + references[0] + '”' : 'The elements it was pinned on') +
    ' ' +
    (references.length === 1 ? 'is' : 'are') +
    ' not in the plateau “' +
    named +
    '”.'
  );
}

/** Puts the editor where the view was saved. Returns why it cannot, or null once it is done (the caller redraws). */
function applySavedView(view) {
  const problem = viewProblem(view);
  if (problem) return problem;
  const properties = isPlainObject(view.properties) ? view.properties : {};
  diagramFacet =
    typeof properties.facet === 'string' &&
    AppState.workspace.settings.facets.customs.some((facet) => facet.name === properties.facet)
      ? properties.facet
      : null;
  setDiagramShow(properties);
  diagramHideUnlinked = properties['hide-unlinked'] === true;
  if (view.viewpoint === 'map') {
    const layer = viewLayerOf(view); // the page Environments draws the technology layer, the page Applications the application layer
    const known = (list) => stringList(list).filter((reference) => AppState.index[layer].has(reference));
    const map = mapStateOf(layer);
    map.pinned = known(properties.pinned);
    map.hidden = known(properties.hidden);
    map.opened = new Set(known(properties.opened));
    // issue #143: the relationships the view is narrowed to (the application layer's Map alone); a view with none gives the whole map
    if (layer === 'application')
      mapLinks = linkEntriesOf(properties.links).entries.map((link) => Object.assign({}, link)); // as the view says them: the model drawn is looked at when it is drawn
    if (layer === 'application')
      mapHighlight = linkEntriesOf(properties.highlight, 'highlight').entries.map((link) => Object.assign({}, link));
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
