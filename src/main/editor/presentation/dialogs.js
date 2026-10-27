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
  requestRedraw();
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
    requestRedraw();
    return;
  }
  pendingFocusSelector = appDialog ? appDialog.returnFocus : null;
  appDialog = null;
  requestRedraw();
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
    requestRedraw();
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
    if (dialog.mode === 'create') drawPlateau(String(spec.id).trim()); else requestRedraw();
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

