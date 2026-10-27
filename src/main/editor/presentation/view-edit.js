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

