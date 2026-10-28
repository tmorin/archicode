/**
 * The page an address names, by the id of `PERSPECTIVES`, from its route: "#/timeline/plateaus", "#/timeline/applications", "#/timeline/environments", "#/timeline/elements",
 * "#/stories" (and "#/stories/views"), "#/files" and "#/settings". These are the only routes (0.17: the former ones, "#/map", "#/elements", "#/library", "#/diagram", "#/plateaus",
 * "#/environments" and "#/timeline" alone, were dropped with no legacy). An empty or unrecognised address, an old one among them, is the default page, Applications.
 */
function pageIdFromHash() {
  const parts = location.hash.split('?')[0].replace(/^#\/?/, '').split('/');
  for (const route of [parts[0] + '/' + parts[1], parts[0]]) {
    const id = Object.keys(PERSPECTIVES).find((page) => PERSPECTIVES[page].route === route);
    if (id) return id;
  }
  return DEFAULT_PERSPECTIVE;
}

/** The Stories page has two sides, Stories and Views: "#/stories/views" says the second; "#/stories" and anything else, the first. */
function libraryTabFromHash() {
  return location.hash.split('?')[0].replace(/^#\/?/, '').split('/')[1] === 'views' ? 'views' : 'stories';
}

/** The hash's `ref=` query param (an element reference or a manifest file's relPath), or null. */
function refFromHash() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1) return null;
  return new URLSearchParams(location.hash.slice(queryIdx + 1)).get('ref');
}

/**
 * Resolve the hash's `ref=` (if any) against the now-loaded workspace into
 * `AppState.selection` — an element reference or a manifest file's relPath,
 * whichever actually matches (falls back to the default empty selection
 * otherwise, including when there is no `ref` at all). Shared by the
 * initial load (`loadWorkspace`, once there's an index/manifestFiles list
 * to resolve against) and any later 'hashchange' while already loaded
 * (`syncPerspectiveFromHash`, below).
 */
function applyDiagramParamsFromHash() {
  const id = pageIdFromHash();
  if (id !== 'elements' && id !== 'map' && id !== 'environments' && id !== 'library') return;
  const queryIdx = location.hash.indexOf('?');
  const params = new URLSearchParams(queryIdx === -1 ? '' : location.hash.slice(queryIdx + 1));
  const storyParam = params.get('story');
  if (id === 'library') {
    libraryTab = libraryTabFromHash();
    selectedStoryId = storyParam && findStory(storyParam) ? storyParam : null;
    const viewParam = params.get('view');
    selectedViewId = viewParam && findSavedView(viewParam) ? viewParam : null;
    return;
  }
  // the story being walked through travels with the diagram it is showing
  const storyOfUrl = storyParam ? findStory(storyParam) : null;
  const stepOfUrl = Number(params.get('step'));
  activeStory =
    storyOfUrl && Number.isInteger(stepOfUrl) && stepOfUrl >= 0 && stepOfUrl < storySteps(storyOfUrl).length
      ? { id: storyParam, step: stepOfUrl }
      : null;
  if (id === 'elements') {
    const tab = params.get('tab');
    elementTab = tab && Object.prototype.hasOwnProperty.call(ELEMENT_TABS, tab) ? tab : 'details';
  } else {
    const pin = params.get('pin');
    const layer = id === 'environments' ? 'technology' : 'application';
    const state = mapStateOf(layer);
    state.pinned = pin ? pin.split(',').filter((reference) => AppState.index[layer].has(reference)) : [];
    state.pinned.forEach((reference) => expandParentsOf(reference, layer));
    if (layer === 'application') {
      mapLinks = mapLinksFromParams(params);
      mapHighlight = mapHighlightFromParams(params);
    }
  }
  const shown = {};
  for (const name of DIAGRAM_SHOW_NAMES)
    shown[name] = params.get(name) === '1' ? true : params.get(name) === '0' ? false : null;
  setDiagramShow(shown);
  technologyMapParts = {
    applications: params.get('applications') !== '0',
    relationships: params.get('relationships') !== '0'
  }; // drawn unless the address says 0
  // Fit or Center, as the link says; a zoom of the user's own is left as it is
  diagramHideUnlinked = params.get('hide-unlinked') === '1';
  if (params.get('frame') === 'fit') diagramScale = 'fit';
  else if (diagramScale === 'fit') diagramScale = 'auto';
  const facet = params.get('facet');
  diagramFacet = facet && AppState.workspace.settings.facets.customs.some((f) => f.name === facet) ? facet : null;
}

/**
 * The link the hash names, `link-from=` and `link-to=` (the two boxes of the drawing it joins: a reference, or the id of a
 * folded or unknown box), or null. Two parameters rather than one with a separator: an id of the drawing can hold any
 * character a reference can, and `URLSearchParams` already quotes each. Both or none: a lone one names nothing.
 */
function linkFromHash() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1) return null;
  const params = new URLSearchParams(location.hash.slice(queryIdx + 1));
  const from = params.get('link-from');
  const to = params.get('link-to');
  return from && to ? { from, to } : null;
}

/**
 * The link the hash names becomes the selection, where a link can be selected: on the Map, or over the element the hash
 * selects while a diagram tab of it is shown (the same places `settleLinkSelection` keeps one). Whether the drawing has
 * that pair is not known yet (it is not drawn): the selection is made as a click would, the panel waits ("Reading the
 * link…") and `reconcileLinkSelection` drops it, and the address with it, once the drawing is on screen and lacks it.
 */
function restoreLinkFromHash() {
  const link = linkFromHash();
  if (!link) return;
  const id = pageIdFromHash();
  const key = link.from + ' -> ' + link.to;
  const sel = AppState.selection;
  if (id === 'map' || id === 'environments') {
    AppState.selection = {
      kind: 'link',
      key,
      from: link.from,
      to: link.to,
      layer: id === 'environments' ? 'technology' : 'application',
      mode: 'view'
    };
  } else if (
    id === 'elements' &&
    sel.kind === 'element' &&
    sel.mode === 'view' &&
    elementTab !== 'details' &&
    findElementRecord(sel.key, sel.layer)
  ) {
    AppState.selection = {
      kind: 'link',
      key,
      from: link.from,
      to: link.to,
      layer: layerOfReference(sel.key, sel.layer) || 'application',
      mode: 'view',
      focal: sel.key
    };
  } else {
    return;
  }
  revealLinkAfterDrawing = { nth: null };
  diagramLinkStop = null; // the selected link is the tab stop of the links then, not where the focus was
}

/** The hash's `compare=` (the comparison the address was written with, see `layerCompareChoice`), or null. Read when a workspace is loaded. */
function compareFromHash() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1) return null;
  return new URLSearchParams(location.hash.slice(queryIdx + 1)).get('compare');
}

/**
 * The hash's `sample=` (the id of a sample the address asks to open, run 0193 DEC-7), or null. Read once, at load, before anything is drawn; the address the page
 * writes from its state never has it, and a `hashchange` does not act on it. Whether the id is in the catalog is for the start of the page to say.
 */
function sampleFromHash() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1) return null;
  return new URLSearchParams(location.hash.slice(queryIdx + 1)).get('sample');
}

/**
 * The removed element the hash names (`removed=` with the reference of an element only the other plateau has, `removed-layer=technology` for one of that
 * layer), or null. It is a selection that exists only with a comparison, so the address carries `compare=` with it (see `currentRouteHash`).
 */
function removedFromHash() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1) return null;
  const params = new URLSearchParams(location.hash.slice(queryIdx + 1));
  const reference = params.get('removed');
  return reference
    ? { reference, layer: params.get('removed-layer') === 'technology' ? 'technology' : 'application' }
    : null;
}

/**
 * The removed element of the hash becomes the pick of the page (run 0039's `removedPick`), over the selection the hash made. Whether the comparison has that
 * element is not known yet (the kernel loads with the first drawing): the pick is made as a click would, the panel waits, and it is dropped, and the address
 * with it, when the comparison does not know the element. Without a comparison on there is nothing to pick.
 */
function restoreRemovedFromHash() {
  removedPick = null;
  const removed = removedFromHash();
  const id = pageIdFromHash();
  if (!removed || (id !== 'map' && id !== 'environments' && id !== 'elements') || !compareTargetPlateau()) return;
  removedPick = { reference: removed.reference, layer: removed.layer, selection: JSON.stringify(AppState.selection) };
}

/** The hash's selection, whole: an element or a file, or a link over the element (see `restoreLinkFromHash`), and a removed element of a comparison. */
function applySelectionFromHashRef() {
  selectFromHashRef();
  restoreLinkFromHash();
  restoreRemovedFromHash();
}

/** The element or manifest file the hash's `ref=` names, else nothing selected. */
function selectFromHashRef() {
  applyDiagramParamsFromHash();
  const ref = refFromHash();
  if (ref) {
    if (AppState.index.application.has(ref) || AppState.index.technology.has(ref)) {
      // `layer=` is only there when both layers have the reference (a link without it keeps its old meaning)
      const layerParam = new URLSearchParams(
        location.hash.indexOf('?') === -1 ? '' : location.hash.slice(location.hash.indexOf('?') + 1)
      ).get('layer');
      const layer =
        (layerParam === 'application' || layerParam === 'technology') && AppState.index[layerParam].has(ref)
          ? layerParam
          : null;
      AppState.selection = layer
        ? { kind: 'element', key: ref, layer, mode: 'view' }
        : { kind: 'element', key: ref, mode: 'view' };
      expandAncestorsOf(ref, layer || undefined);
      scrollNavToSelection = true;
      return;
    }
    if (AppState.manifestFiles.some((f) => f.relPath === ref)) {
      AppState.selection = { kind: 'file', key: ref, mode: 'view' };
      return;
    }
  }
  AppState.selection = { kind: 'none', key: null, mode: 'view' };
}

/** Re-sync `currentPerspective` (and, once a workspace is loaded, the selection) from the URL — bootstrap and every 'hashchange' (back/forward, a hand-edited URL). */
function syncPerspectiveFromHash() {
  currentPerspective = pageIdFromHash();
  useDiagramHost(diagramHostOf(currentPerspective)); // the framing an address carries (`frame=fit`) is that of the diagram it will draw
  if (AppState.workspace) {
    drawLayersNamedByAddress(); // before the selection: an element may exist in the plateau the address names only
    applySelectionFromHashRef();
  }
}

/**
 * How the diagram is framed, for the URL: `frame=fit` (Fit: the whole drawing). Center is how a diagram opens, so a URL
 * with no `frame` is Center; a zoom or a move of the user's own is not a framing worth a link.
 */
function pushFrameParam(params) {
  if (diagramScale === 'fit') params.push('frame=fit');
}

/** A change of framing (Fit, Center, a zoom, a move) is in the address bar at once, without an entry in the history. */
function diagramFramingChanged() {
  if (AppState.workspace && (currentPerspective === 'elements' || mapIsShown())) syncHashFromState();
}

/** What the diagram shows otherwise than by default (its texts, the boxes no link reaches), for the URL. */
function pushShowParams(params, isMap) {
  const overrides = diagramShowOverrides(isMap);
  for (const name of DIAGRAM_SHOW_NAMES) if (name in overrides) params.push(name + '=' + (overrides[name] ? '1' : '0'));
  if (diagramHideUnlinked) params.push('hide-unlinked=1');
  // issue #107: the Map of the technology layer with its applications or its relationships left out
  if (isMap && mapLayer() === 'technology')
    for (const part of MAP_PARTS) if (!technologyMapParts[part]) params.push(part + '=0');
}

/**
 * The selected link, when the address should carry it: only where it is selected (the Map; a diagram tab of its element),
 * since the address is written before a change of perspective is drawn and `settleLinkSelection` has not ended it yet.
 * Selecting a link rewrites the current entry of the history, like a zoom: it refines the place and is not one.
 */
function linkInRoute() {
  const sel = AppState.selection;
  if (!sel || sel.kind !== 'link') return null;
  return (sel.focal ? currentPerspective === 'elements' && diagramTabShown() : mapIsShown()) ? sel : null;
}

/** The removed element the address should carry: the pick of the page while it holds (the selection is what it was), when the comparison is on and has the element (or is still being read). */
function removedPickForRoute() {
  if (!removedPick || (!mapIsShown() && currentPerspective !== 'elements')) return null;
  if (removedPick.selection !== JSON.stringify(AppState.selection)) return null;
  const state = comparisonState();
  if (!state || state.problems) return null;
  return state.pending ? removedPick : removedInspectionOf(AppState.selection, currentPerspective);
}

/** The "#/perspective?ref=..." hash for the current perspective + selection — what the URL should read right now (UX review follow-up: the URL mirrors what's on screen). */
function currentRouteHash() {
  const sel = elementSelection(); // a link selected in a diagram of Elements leaves the element, and so the URL, as it is
  const ref = sel.kind === 'element' || sel.kind === 'file' ? sel.key : null;
  const params = [];
  if (ref) params.push('ref=' + encodeURIComponent(ref));
  // a reference that exists in both layers needs to say which one the selection is
  if (ref && sel.kind === 'element' && referenceIsInBothLayers(ref))
    params.push('layer=' + layerOfReference(ref, sel.layer));
  // the diagram's own choices travel in the URL too, so a link (or Back) restores them
  if (
    currentPerspective === 'elements' &&
    ref &&
    sel.kind === 'element' &&
    sel.mode !== 'edit' &&
    elementTab !== 'details'
  ) {
    params.push('tab=' + (findElementRecord(ref) ? effectiveDiagramViewpoint(findElementRecord(ref)) : elementTab)); // what the tabs show, not what a leaf was asked
    if (diagramFacet) params.push('facet=' + encodeURIComponent(diagramFacet));
    pushShowParams(params, false);
    pushFrameParam(params);
  }
  if (mapIsShown()) {
    if (diagramFacet) params.push('facet=' + encodeURIComponent(diagramFacet));
    const pinned = mapStateOf().pinned;
    if (pinned.length) params.push('pin=' + pinned.map(encodeURIComponent).join(','));
    if (mapLayer() === 'application') params.push(...mapLinkParams(mapLinks), ...mapHighlightParams(mapHighlight));
    pushShowParams(params, true);
    pushFrameParam(params);
  }
  if (currentPerspective === 'library') {
    if (libraryTab === 'stories' && selectedStoryId) params.push('story=' + encodeURIComponent(selectedStoryId));
    if (libraryTab === 'views' && selectedViewId) params.push('view=' + encodeURIComponent(selectedViewId));
  }
  if ((currentPerspective === 'elements' || mapIsShown()) && activeStory && !storyPlayer) {
    // the player's `step=` is the one of the address while it is open (below)
    params.push('story=' + encodeURIComponent(activeStory.id), 'step=' + activeStory.step);
  }
  const link = linkInRoute();
  if (link) params.push('link-from=' + encodeURIComponent(link.from), 'link-to=' + encodeURIComponent(link.to));
  // run 0040: a removed element picked on the Map or in Elements. It means something only next to the comparison it was picked in, so the address names that too;
  // the other choices of the comparison (Changes only, the wording-only toggle) are a choice of whoever looks, remembered per folder, and are not in the address.
  const removed = removedPickForRoute();
  if (removed) {
    params.push('removed=' + encodeURIComponent(removed.reference));
    if (removed.layer === 'technology') params.push('removed-layer=technology');
    params.push('compare=' + encodeURIComponent(layerCompareChoice()));
  }
  // wave 014 (run 0080): the plateau of the band, when it is not the root
  if (
    AppState.layers &&
    AppState.plateauTree &&
    AppState.plateauTree.layered &&
    AppState.layers.current !== BASELINE_PLATEAU
  )
    params.push('plateau=' + encodeURIComponent(AppState.layers.current));
  if (storyPlayer) params.push('play=' + encodeURIComponent(storyPlayer.story), 'step=' + storyPlayer.step); // wave 021, run 0153 (#153): the story player, on top of whatever the editor shows
  return (
    '/' +
    PERSPECTIVES[currentPerspective].route +
    (currentPerspective === 'library' && libraryTab === 'views' ? '/views' : '') +
    (params.length ? '?' + params.join('&') : '')
  );
}

/**
 * Keep the URL in sync with whatever just rendered, without spamming
 * browser history or re-triggering 'hashchange' (replaceState does
 * neither; pushState adds an entry and fires none) — called at the end of every render() that shows the shell.
 * A plain `location.hash = ...` per click would instead push a new
 * history entry and fire 'hashchange' asynchronously, double-rendering.
 */
function syncHashFromState() {
  const hash = '#' + currentRouteHash();
  const entry = layerChangeIsAnEntry;
  layerChangeIsAnEntry = false;
  if (location.hash === hash) return;
  // a plateau or a comparison the author chose (not one an address named) is a place of its own: Back returns to the one before (#91)
  if (entry && history.pushState) history.pushState(null, '', hash);
  else history.replaceState(null, '', hash);
}

/**
 * Switch perspective from inside the app itself (the tab click handler) —
 * updates the hash (so the URL stays the source of truth, and a genuine
 * perspective switch — unlike an in-perspective selection change — is
 * worth its own back/forward history entry) and renders directly, rather
 * than relying solely on the async 'hashchange' event. Discards the two
 * transient, file/element-scoped drafts the same way every other
 * cross-navigation already does (DEC-10/FLOW-4 philosophy) — a
 * perspective switch is a bigger navigation jump than any of those.
 */
function setPerspective(id) {
  if (!Object.prototype.hasOwnProperty.call(PERSPECTIVES, id)) return;
  currentPerspective = id;
  useDiagramHost(diagramHostOf(id)); // the address below is written from the framing of the diagram it leads to
  if (rawYamlEditDraft) rawYamlEditDraft = null;
  if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
  location.hash = currentRouteHash();
  render();
}
