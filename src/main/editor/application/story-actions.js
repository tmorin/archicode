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
    requestRedraw();
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
  if (!definition || !story) { requestRedraw(); return; }
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
  requestRedraw();
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
  requestRedraw();
}

function selectStory(id) {
  selectedStoryId = id;
  storyNotice = null;
  requestRedraw();
}

function newStory() {
  openTextDialog('New story', 'Name of the story', '', 'Create story', (name) => {
    const wanted = name.trim().toLowerCase();
    const story = storiesList().find((entry) => storyLabel(entry).trim().toLowerCase() === wanted) || createStory(name);
    if (story) { selectedStoryId = story.id; storyNotice = null; }
    requestRedraw();
  });
}

function deleteStory(id) {
  const story = findStory(id);
  if (!story || !confirm('Delete the story “' + storyLabel(story) + '”? Its views stay saved.')) return;
  removeEntry(story, 'stories');
  if (selectedStoryId === id) selectedStoryId = null;
  if (activeStory && activeStory.id === id) activeStory = null;
  removedStep = null;
  requestRedraw();
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
  requestRedraw();
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
  requestRedraw();
}

/** Puts back the step that was just removed, where it was. */
function undoRemoveStoryStep() {
  const removed = removedStep;
  const story = removed ? findStory(removed.storyId) : null;
  removedStep = null;
  if (!story) { requestRedraw(); return; }
  const steps = writableSteps(story);
  const at = Math.min(removed.index, steps.length);
  steps.splice(at, 0, removed.step);
  if (activeStory && activeStory.id === story.id && activeStory.step >= at) activeStory.step++;
  pendingFocusSelector = '[data-action="story-step-remove"][data-story="' + story.id + '"][data-step="' + at + '"]';
  markEntryChanged(story);
  requestRedraw();
}

function addStoryStep(storyId, viewId) {
  const story = findStory(storyId);
  if (!story || !findSavedView(viewId)) return;
  writableSteps(story).push({ view: viewId });
  pendingFocusSelector = '#story-add-view';
  markEntryChanged(story);
  requestRedraw();
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
  requestRedraw();
  return true;
}

/** A step whose view is gone points at another one. */
function repairStoryStep(storyId, index, viewId) {
  const story = findStory(storyId);
  const step = story && Array.isArray(story.steps) ? story.steps[index] : null;
  if (!isPlainObject(step) || !findSavedView(viewId)) return;
  step.view = viewId;
  markEntryChanged(story);
  requestRedraw();
}

/** A step that carries its own view becomes a named view (a file of its own, that other stories can use). */
function keepStepAsNamedView(storyId, index) {
  const story = findStory(storyId);
  const step = story && Array.isArray(story.steps) ? story.steps[index] : null;
  if (!isPlainObject(step) || step.view || !step.viewpoint) return;
  openTextDialog('Keep as a named view', 'It is kept in a file of its own; the step then points at it.', describeViewDefinition(step), 'Save view', (name) => {
    const target = findStory(storyId);
    const current = target && Array.isArray(target.steps) ? target.steps[index] : null;
    if (!isPlainObject(current) || current.view) { requestRedraw(); return; }
    const view = viewForDefinition(canonicalViewDefinition(current), name);
    const text = current.text;
    // the plateaus the step is told at and compared with are the step's, not the view's: they stay (wave 015, run 0101)
    const kept = { view: view.id };
    if (current.at !== undefined) kept.at = current.at;
    if (current.against !== undefined) kept.against = current.against;
    if (text) kept.text = text;
    target.steps[index] = kept;
    markEntryChanged(target);
    requestRedraw();
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
  requestRedraw();
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
  requestRedraw();
}

function openSavedView(viewId) {
  const view = findSavedView(viewId);
  if (!view) return;
  const problem = applySavedView(view);
  if (problem) { storyNotice = problem; requestRedraw(); return; }
  activeStory = null;
  storyNotice = null;
  location.hash = currentRouteHash();
  requestRedraw();
}

function renameSavedView(viewId) {
  const view = findSavedView(viewId);
  if (!view) return;
  openTextDialog('Rename the view', 'Name of the view', viewLabel(view), 'Rename', (name) => {
    const target = findSavedView(viewId);
    if (target) { target.name = name; markEntryChanged(target); }
    requestRedraw();
  });
}

function deleteSavedView(viewId) {
  const view = findSavedView(viewId);
  if (!view) return;
  const used = storiesUsingView(viewId);
  if (!confirm('Delete the view “' + viewLabel(view) + '”?' + (used ? '\n\n' + used + ' step' + (used === 1 ? '' : 's') + ' of stories show it; they will say the view is missing.' : ''))) return;
  removeEntry(view, 'views');
  requestRedraw();
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
  requestRedraw();
}

