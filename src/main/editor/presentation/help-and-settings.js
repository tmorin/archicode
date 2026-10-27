// ---- Center panel (FR-11..16, AC-5..10, DEC-6/DEC-7/DEC-10) ----

/**
 * The Settings view's guidance texts — one place, so they are easy to
 * review against the Java behavior they describe (`Settings.java`,
 * `WorkspaceFactory`, `GenerateViewsCommand`). `backticks` render as <code>.
 */
const SETTINGS_HELP = {
  name: 'The name of the workspace. The editor shows it in place of the name of the folder, which then becomes a tooltip. Leave empty to show the folder name.',
  manifestsPaths: 'Folders scanned for manifest files, relative to the folder containing `.archicode.yaml` and below it (no `..`, not absolute). One per line. Default: `manifests`. A path that ends in `/**` (`manifests/**`) is read with the folders below it, in order of path, leaving out the folders and files whose name begins with a dot, the links to folders and the folders of the generated views; `./**` is the folder of `.archicode.yaml`. `**` means nothing elsewhere in a path.',
  defaultLabel: 'Label for a relationship that declares none, and for a link merged from several relationships. Default: `uses`.',
  current: 'The plateau the command line draws when `--plateau` is not given, and the one the editor opens the folder on when nothing else tells (the address, or the plateau this browser drew last). None: the command line draws the last plateau when the plateaus are one line, and asks for `--plateau` otherwise. Changing it does not redraw what is on screen.',
  viewsPath: 'Folder where generated views are written, relative to `.archicode.yaml`. Facets write to sibling folders (see Facets). Default: `views`.',
  viewsLabels: 'Title of the generated view for each viewpoint. Leave empty to use the default shown in the field.',
  viewsProperties: 'Extra properties merged into every view of that viewpoint, as a JSON object. Free-form: keys are passed through as-is and not validated here.',
  facetsIntro: 'A facet is a filtered copy of the workspace: its actions remove matching elements or relationships, and its views are generated in their own folder. Useful for focused views, e.g. only the OIDC flows.',
  facetsGlobalEnabled: 'Also generate the unfiltered views into the Views path. Turn off to generate only facet views. Default: on.',
  facetsTemplate: 'Folder name for each facet\'s views, as a Java format string: the first `%s` is the Views path, the second is the facet name. Default `%s-%s` gives `views-main` for a facet named `main`.',
  facetsCustoms: 'Each facet needs a unique name. Its actions run in order on the workspace model.',
  facetsAction: '`REMOVE` deletes every node matched by the JSONPath, e.g. `$.application..relationships[?(@.qualifiers[?(@ == \'oidc\')])]`.'
};

/** The default view title per viewpoint (Overview/Detailed/DeepViewpointService), shown as the empty-label placeholder. */
const VIEWPOINT_DEFAULT_LABELS = { overview: 'Overview', detailed: 'Detailed View', deep: 'Deep View' };


// ---- Help: the manual, published with the editor ----
//
// The manual is not copied into the editor (it would drift, and weigh on a file that already carries a kernel): the editor
// links to the published one, at the anchors of the sections that explain what is on screen. The anchors are written
// explicitly in src/doc/README.adoc, and a test checks that every one used here is there.

const DOCS_URL = 'https://tmorin.github.io/archicode/docs/';
const DOC_LINKS = {
  manual: '',
  editor: '#editor',
  elements: '#editor-elements',
  map: '#editor-map',
  facets: '#editor-facets',
  keyboard: '#editor-keyboard',
  serve: '#serve-the-editor',
  workspace: '#workspace',
  viewpoints: '#viewpoints',
  settings: '#technical-configuration',
  facetsConcept: '#facets',
  currentPlateau: '#editor-current-plateau'
};

function docUrl(key) {
  return DOCS_URL + DOC_LINKS[key];
}

/** The settings texts that are explained further in the manual, and where. */
const SETTINGS_HELP_DOCS = {
  name: 'workspace',
  manifestsPaths: 'settings',
  defaultLabel: 'settings',
  viewsPath: 'settings',
  facetsIntro: 'facetsConcept',
  current: 'currentPlateau'
};

/** The release this page is (or "dev" when it is the file of the repository). */
function editorVersion() {
  const meta = typeof document !== 'undefined' && document.querySelector ? document.querySelector('meta[name="archicode-version"]') : null;
  return meta && meta.getAttribute('content') ? meta.getAttribute('content') : 'dev';
}

/** The "?" button, with its menu right behind it (so Tab goes from one to the other) when the help is open. */
function renderHelpButtonHtml() {
  return '<span class="help-wrap"><button type="button" class="help-button" data-action="toggle-help" aria-haspopup="dialog" aria-expanded="' + helpOpen + '" aria-label="Help" title="Help and the manual">?</button>' +
    renderHelpMenuHtml() + '</span>';
}

function renderHelpMenuHtml() {
  if (!helpOpen) return '';
  const link = (key, text) => '<li><a href="' + docUrl(key) + '" target="_blank" rel="noopener">' + escapeHtml(text) + '</a></li>';
  const where = isServedByArchiCode()
    ? 'The editor reads and writes the folder served by <code>archicode editor serve</code> on this machine.'
    : 'Files are read and written in your browser, in the folder you picked.';
  return '<div class="help-menu" role="dialog" aria-label="Help">' +
    '<ul>' + link('manual', 'Manual') + link('editor', 'Using the editor') + link('map', 'Applications') + link('facets', 'Facets') + link('keyboard', 'Keyboard shortcuts') + '</ul>' +
    '<p class="help-note">' + where + ' Nothing is uploaded. The diagram layout and the file editor are loaded from a CDN when the page opens.</p>' +
    '<p class="help-note help-version">ArchiCode ' + escapeHtml(editorVersion()) + ' · kernel contract ' + KERNEL_CONTRACT_VERSION + '</p>' +
    '</div>';
}

/**
 * Opens or closes the help WITHOUT render(): a redraw rebuilds every field from the model, so whatever the user typed and
 * has not committed yet would be lost (and, for a click elsewhere, the action of that click would read the reverted
 * fields). Only the menu node and aria-expanded change. `focusMenu`: move the focus to the first link (opened from the
 * keyboard); `focusButton`: give it back to the "?" button (closed from the keyboard).
 */
function setHelpOpen(open, options = {}) {
  helpOpen = open;
  const button = document.querySelector('.help-button');
  if (button && button.setAttribute) button.setAttribute('aria-expanded', String(open));
  const existing = document.querySelector('.help-menu');
  if (existing && existing.remove) existing.remove();
  if (open) {
    if (button && button.insertAdjacentHTML) button.insertAdjacentHTML('afterend', renderHelpMenuHtml());
    if (options.focusMenu) {
      const first = document.querySelector('.help-menu a');
      if (first && first.focus) first.focus();
    }
  } else if (options.focusButton && button && button.focus) {
    button.focus();
  }
}

/**
 * Escape closes the help, and only that: the key does not go on to un-maximize the diagram. Registered on the document
 * (capture) so it comes first wherever the focus is; a click anywhere else is handled in handleAppClick.
 */
function handleHelpKeydown(e) {
  if (!helpOpen || e.key !== 'Escape') return;
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  else if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  setHelpOpen(false, { focusButton: true });
}
document.addEventListener('keydown', handleHelpKeydown, true);

/** One help paragraph; `describedBy(key)` is the matching aria-describedby attribute for the field it explains. */
function renderHelpHtml(key, extraClass) {
  let html = escapeHtml(SETTINGS_HELP[key]).replace(/`([^`]+)`/g, '<code>$1</code>');
  if (SETTINGS_HELP_DOCS[key]) html += ' <a href="' + docUrl(SETTINGS_HELP_DOCS[key]) + '" target="_blank" rel="noopener">Manual</a>';
  return '<div class="settings-help' + (extraClass ? ' ' + extraClass : '') + '" id="settings-help-' + key + '">' + html + '</div>';
}
function describedBy(key) {
  return ' aria-describedby="settings-help-' + key + '"';
}

/** The folder a facet's views are written to, from the template/views-path currently in use — "invalid template" instead of a throw while the user is mid-edit. */
function facetDirectoryPreviewHtml(facetName, template, viewsPath) {
  const parsed = parseDirectoryNameTemplate(String(template === null || template === undefined ? '' : template).trim());
  return '\u2192 ' + (parsed.valid ? '<code>' + escapeHtml(parsed.format(String(viewsPath).trim(), facetName)) + '</code>' : 'invalid template');
}

/** Re-render every facet card's folder preview from the live Views path / template inputs — runs on each keystroke in either. */
function refreshFacetDirectoryPreviews() {
  const template = document.getElementById('settings-facets-directory-template-input');
  const viewsPath = document.getElementById('settings-views-path-input');
  if (!template || !viewsPath) return;
  document.querySelectorAll('.facet-dir-preview').forEach((el) => {
    el.innerHTML = facetDirectoryPreviewHtml(el.getAttribute('data-facet-name'), template.value, viewsPath.value);
  });
}

/** One `views.labels` fixed row per VIEWPOINT_IDS (form UX review follow-up) — batched into the main Save, unlike properties/customs below. */
function renderViewsLabelsEditorHtml(labels) {
  let html = '<div class="settings-subgroup">';
  for (const viewpoint of VIEWPOINT_IDS) {
    const value = (labels && labels[viewpoint]) || '';
    html += '<div class="settings-subrow"><label for="settings-label-' + viewpoint + '-input">' + escapeHtml(viewpoint) + '</label>' +
              '<input type="text" id="settings-label-' + viewpoint + '-input" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(VIEWPOINT_DEFAULT_LABELS[viewpoint]) + '"' + describedBy('viewsLabels') + '>' +
            '</div>';
  }
  html += '</div>' + renderHelpHtml('viewsLabels');
  return html;
}

/**
 * One `views.properties[viewpoint]` JSON editor (form UX review follow-up):
 * the viewpoint's whole property object, edited as JSON — nested values
 * need no special case. CodeMirror (JSON mode) when loaded, else the same
 * auto-grow textarea fallback every other plain-text field uses. Committed
 * by "Save all changes", with everything else.
 */
function renderPropertyRowsHtml(viewpoint, props) {
  const text = JSON.stringify(props || {}, null, 2);
  const vp = escapeHtml(viewpoint);
  let html = '<div class="property-group"><h4>' + vp + '</h4>';
  if (window.CM) {
    html += '<div class="json-editor-host" data-viewpoint="' + vp + '" aria-label="' + vp + ' properties (JSON)"' + describedBy('viewsProperties') + '></div>';
  } else {
    html += '<textarea class="json-editor-fallback auto-grow-textarea" data-viewpoint="' + vp + '" aria-label="' + vp + ' properties (JSON)"' + describedBy('viewsProperties') + '>' + escapeHtml(text) + '</textarea>';
  }
  html += '<span class="inline-error" id="view-properties-error-' + vp + '"></span>';
  html += '</div>';
  return html;
}

function renderViewsPropertiesEditorHtml(properties) {
  let html = renderHelpHtml('viewsProperties');
  for (const viewpoint of VIEWPOINT_IDS) {
    html += renderPropertyRowsHtml(viewpoint, properties ? properties[viewpoint] : null);
  }
  return html;
}

/** One `facets.customs[].actions` row — same visual grammar as renderRelationshipEditRowHtml (reuses its CSS classes), one level deeper. */
function renderFacetActionRowHtml(facetIndex, action, actionIndex) {
  const isNew = actionIndex === null;
  const operator = action ? action.operator : FACET_ACTION_OPERATORS[0];
  const jsonPath = action ? action.jsonPath : '';
  let html = '<div class="relationship-edit-row' + (isNew ? ' relationship-edit-row-new' : '') + '" data-facet-index="' + facetIndex + '"' +
               (isNew ? '' : ' data-action-index="' + actionIndex + '"') + '>';
  html += '<select class="facet-action-operator-input">' +
            FACET_ACTION_OPERATORS.map((op) => '<option value="' + op + '"' + (op === operator ? ' selected' : '') + '>' + op + '</option>').join('') +
          '</select>';
  html += '<input type="text" class="facet-action-jsonpath-input" placeholder="json path" aria-label="Facet action JSON path"' + describedBy('facetsAction') + ' value="' + escapeHtml(jsonPath) + '">';
  if (isNew) {
    html += '<button type="button" data-action="add-facet-action" data-facet-index="' + facetIndex + '">Add action</button>';
  } else {
    html += '<button type="button" data-action="remove-facet-action" data-facet-index="' + facetIndex + '" data-action-index="' + actionIndex + '">Remove</button>';
  }
  html += '<span class="inline-error"></span>';
  html += '</div>';
  return html;
}

/** One `facets.customs[]` card — the name is set only at creation (consistent with Tags/Qualifiers keys: remove + re-add, never renamed in place). */
function renderFacetCardHtml(facet, facetIndex) {
  const settings = AppState.workspace.settings;
  let html = '<div class="facet-edit-card">';
  html += '<div class="facet-edit-card-header">' +
            '<span class="facet-name">' + escapeHtml(facet.name) + '</span>' +
            '<span class="facet-dir-preview" data-facet-name="' + escapeHtml(facet.name) + '">' +
              facetDirectoryPreviewHtml(facet.name, settings.facets.directoryNameTemplate, settings.views.path) +
            '</span>' +
            '<button type="button" data-action="remove-facet" data-facet-index="' + facetIndex + '">Remove facet</button>' +
          '</div>';
  html += '<label class="facet-option" title="In the views of the environments (technology layer), leave out the elements none of the links of this facet goes through. The element the view is about stays.">' +
            '<input type="checkbox" class="facet-hide-unlinked-input" data-facet-index="' + facetIndex + '"' + (facet.hideUnlinked ? ' checked' : '') + '> Hide the elements with no link' +
          '</label>';
  html += '<div class="facet-actions-list">';
  const actions = Array.isArray(facet.actions) ? facet.actions : [];
  for (let i = 0; i < actions.length; i++) {
    html += renderFacetActionRowHtml(facetIndex, actions[i], i);
  }
  html += renderFacetActionRowHtml(facetIndex, null, null);
  html += '</div></div>';
  return html;
}

function renderFacetsEditorHtml(customs) {
  const list = Array.isArray(customs) ? customs : [];
  let html = renderHelpHtml('facetsCustoms') + renderHelpHtml('facetsAction') + '<div class="facets-editor">';
  for (let i = 0; i < list.length; i++) {
    html += renderFacetCardHtml(list[i], i);
  }
  html += '</div>';
  html += '<div class="edition-add-row">' +
            '<input type="text" id="add-facet-name-input" placeholder="new facet name" aria-label="New facet name"' + describedBy('facetsCustoms') + '>' +
            '<button type="button" data-action="add-facet">Add facet</button>' +
            '<span class="inline-error" id="add-facet-error"></span>' +
          '</div>';
  return html;
}

/**
 * The settings view, directly editable (run-0009, task-004; TDD DEC-3) —
 * unlike the element view, there is no separate view/edit mode: this
 * function always renders the form, seeded from the live
 * `AppState.workspace.settings` (CTR-4 — same shape `parseSettings`
 * already produces). "Save all changes" validates and commits the whole form at once (FLOW-2, each field
 * with its own inline-error span). Adding/removing a facet or action is
 * structural, so it keeps its own button — but applies the rest of the
 * form first (see readSettingsDraft), so nothing typed is lost.
 */
/** The Manifests section of Settings: the folders of the manifests, to edit. The plateaus are not here: they are layers, made on the Plateaus page and on the band. */
function renderManifestsSettingsHtml(settings) {
  return '<div class="edition-section"><h3>Manifests</h3>' +
    '<div class="field-row"><label class="field-label" for="settings-manifests-paths-input">Paths</label><span class="field-value">' +
      '<textarea id="settings-manifests-paths-input" class="auto-grow-textarea" placeholder="manifests"' + describedBy('manifestsPaths') + '>' + escapeHtml(settings.manifests.paths.join('\n')) + '</textarea>' +
      '<span class="inline-error" id="settings-manifests-paths-error"></span>' +
      renderHelpHtml('manifestsPaths') +
    '</span></div>' +
  '</div>';
}

const CURRENT_PLATEAU_BROKEN = 'The plateaus have mistakes (see the Plateaus page): put them right first.';

/**
 * The field *Current plateau* of Settings (wave 016, run 0111, issue #111): `settings.current`, the plateau both tools draw by default. A list of the plateaus (in the order of
 * the band) and *none*. Shown when the workspace has plateaus to choose among: at least two (with one, the command line draws it and there is nothing to choose), or a
 * `current` the file already has (so that it can be taken out), or mistakes in the plateaus (the plateaus are then not offered, the field says why, and *None* still works).
 */
function renderCurrentPlateauSettingsHtml(settings) {
  const tree = AppState.plateauTree;
  if (!tree || !tree.layered) return '';
  const broken = tree.problems.length > 0;
  if (!broken && tree.ids.length < 2 && settings.current === '') return '';
  const ids = bandOrderOf(tree);
  if (settings.current !== '' && !ids.includes(settings.current)) ids.push(settings.current); // what the file says is shown, whatever the tree
  // while the plateaus have mistakes only what the file says and *None* can be chosen: the other ids are not trusted, but a `current` can still be taken out
  const options = '<option value=""' + (settings.current === '' ? ' selected' : '') + '>None</option>' +
    ids.map((id) => '<option value="' + escapeHtml(id) + '"' + (id === settings.current ? ' selected' : (broken ? ' disabled' : '')) + '>' + escapeHtml(plateauTitle(layerPlateauModel(id))) + (plateauTitle(layerPlateauModel(id)) !== id ? ' (' + escapeHtml(id) + ')' : '') + '</option>').join('');
  return '<div class="field-row"><label class="field-label" for="settings-current-select">Current plateau</label><span class="field-value">' +
    '<select id="settings-current-select" data-settings-current' + describedBy('current') + '>' + options + '</select>' +
    (broken ? '<span class="inline-error">' + CURRENT_PLATEAU_BROKEN + '</span>' : '') +
    renderHelpHtml('current') +
  '</span></div>';
}

/**
 * Writes `settings.current` (run 0111, #111): the plateau `value`, or the empty text for none (the key leaves the file). Through `commitSettingsEdit`, as the other fields of
 * Settings; `draft` is what the form held (`readSettingsDraft`), applied in the same step so that nothing typed is lost. Not under `guardedLayerWrite`: no plateau is resolved
 * from this key, so no plateau can change or be refused by it; the one thing that can be wrong is the name, refused with the sentence both tools say of a `current` that names no plateau
 * (`layersOfSettingsCurrentProblem`). The key is edited in the raw `settings` of .archicode.yaml (`serializeSettingsToRaw` keeps what it does not manage as the file has it) and
 * a file that has no `settings` yet gets one with this key alone, so a save writes that line and not the defaults. The plateau drawn is not changed: what the reader chose
 * on the band is not undone by a setting for the next time. Returns whether anything changed.
 */
function commitCurrentPlateau(value, draft) {
  if (!AppState.workspace || !AppState.plateauTree) throw new Error('No workspace is open.');
  if (saveInFlight) throw new Error('The folder is being saved: choose the plateau once the save has ended.');
  const id = typeof value === 'string' ? value.trim() : '';
  const settings = AppState.workspace.settings;
  if (id !== '') {
    if (AppState.plateauTree.problems.length) throw new Error(CURRENT_PLATEAU_BROKEN); // the plateaus cannot be listed, and the sentence would name none
    const sentence = layersOfSettingsCurrentProblem(id, AppState.plateauTree);
    if (sentence !== null) throw new Error(sentence);
  }
  if (id === settings.current && !draft) return false;
  commitSettingsEdit((live) => {
    if (draft) draft.apply(live);
    const top = workspaceTopLevel();
    if (id === '') {
      if (isPlainObject(top.settings)) delete top.settings.current; // the line of the key goes, nothing else
    } else {
      if (!isPlainObject(top.settings)) top.settings = {};
      top.settings.current = id;
    }
    live.current = id;
  });
  return true;
}

/** The list *Current plateau* was changed: the form's own typing is kept, a refusal is told in the top bar and the list shows what the file says again. */
function chooseCurrentPlateau(select) {
  const draft = draftTyped ? readSettingsDraft() : null;
  const restore = () => { select.value = AppState.workspace.settings.current; };
  if (draft && !draft.valid) { restore(); return; }
  try {
    commitCurrentPlateau(select.value, draft);
  } catch (e) {
    if (draft) commitSettingsEdit(draft.apply); // what was typed in the form is kept: the redraw gives the form afresh from the model
    saveStatus = { state: 'error', failedFile: '.archicode.yaml', message: e && e.message ? e.message : String(e) };
    restore();
    requestRedraw();
  }
}

function renderSettingsViewHtml() {
  const settings = AppState.workspace && AppState.workspace.settings;
  if (!settings) return '<div class="center-placeholder">No settings available.</div>';
  return (
    '<div class="settings-view">' +
      renderElementHeaderHtml('<h2>Settings</h2>', '') +
      renderAppearanceSectionHtml() +
      '<div class="edition-section" id="settings-workspace"><h3>Workspace</h3>' +
        '<div class="field-row"><label class="field-label" for="settings-name-input">Name</label><span class="field-value">' +
          '<input type="text" id="settings-name-input" value="' + escapeHtml(settings.name || '') + '" placeholder="' + escapeHtml(AppState.folder ? AppState.folder.name : '') + '"' + describedBy('name') + '>' +
          renderHelpHtml('name') +
        '</span></div>' +
        renderCurrentPlateauSettingsHtml(settings) +
      '</div>' +
      renderManifestsSettingsHtml(settings) +
      '<div class="edition-section"><h3>Relationships</h3>' +
        '<div class="field-row"><label class="field-label" for="settings-default-label-input">Default synthetic label</label><span class="field-value">' +
          '<input type="text" id="settings-default-label-input" value="' + escapeHtml(settings.relationships.defaultSyntheticLabel) + '" placeholder="uses"' + describedBy('defaultLabel') + '>' +
          renderHelpHtml('defaultLabel') +
        '</span></div>' +
      '</div>' +
      '<div class="edition-section"><h3>Views</h3>' +
        '<div class="field-row"><label class="field-label" for="settings-views-path-input">Path</label><span class="field-value">' +
          '<input type="text" id="settings-views-path-input" value="' + escapeHtml(settings.views.path) + '" placeholder="views"' + describedBy('viewsPath') + '>' +
          '<span class="inline-error" id="settings-views-path-error"></span>' +
          renderHelpHtml('viewsPath') +
        '</span></div>' +
        '<div class="field-row"><span class="field-label">Labels</span><span class="field-value">' +
          renderViewsLabelsEditorHtml(settings.views.labels) +
        '</span></div>' +
        '<div class="field-row"><span class="field-label">Properties</span><span class="field-value">' +
          renderViewsPropertiesEditorHtml(settings.views.properties) +
        '</span></div>' +
      '</div>' +
      '<div class="edition-section"><h3>Facets</h3>' +
        renderHelpHtml('facetsIntro', 'settings-group-help') +
        '<div class="field-row"><label class="field-label" for="settings-facets-global-enabled-input">Global enabled</label><span class="field-value">' +
          '<input type="checkbox" id="settings-facets-global-enabled-input"' + (settings.facets.globalEnabled ? ' checked' : '') + describedBy('facetsGlobalEnabled') + '>' +
          renderHelpHtml('facetsGlobalEnabled') +
        '</span></div>' +
        '<div class="field-row"><label class="field-label" for="settings-facets-directory-template-input">Directory name template</label><span class="field-value">' +
          '<input type="text" id="settings-facets-directory-template-input" value="' + escapeHtml(settings.facets.directoryNameTemplate) + '" placeholder="%s-%s"' + describedBy('facetsTemplate') + '>' +
          '<span class="inline-error" id="settings-facets-directory-template-error"></span>' +
          renderHelpHtml('facetsTemplate') +
        '</span></div>' +
        '<div class="field-row"><span class="field-label">Customs</span><span class="field-value">' +
          renderFacetsEditorHtml(settings.facets.customs) +
        '</span></div>' +
      '</div>' +
    '</div>'
  );
}

/**
 * A `.element-header`: a label group (name/kind, left) and an actions
 * group (buttons, right) — shared by the element view/edit headers, the
 * file-edition header, and the Diagram perspective's map header (UX
 * review follow-up: label and tag on the left, actions on the right,
 * rather than everything packed left-to-right in one row).
 */
function renderElementHeaderHtml(labelHtml, actionsHtml) {
  return '<div class="element-header">' +
           '<div class="element-header-label">' + labelHtml + '</div>' +
           '<div class="element-header-actions">' + (actionsHtml || '') + '</div>' +
         '</div>';
}

/**
 * Raw-YAML editing surface (run-0009, task-005; TDD-0009 DEC-6/DEC-10).
 * Seeded from `rawYamlEditDraft` when it holds a pending/rejected draft
 * for this exact file, else from the file's own live `mf.rawText`. A
 * draft's `error` (set only on a rejected commit) is shown in the same
 * `.error-panel` style the file's own load-time parse error already
 * uses, so an invalid edit's feedback looks consistent with that
 * existing display.
 *
 * When CodeMirror loaded (`window.CM` set — see the module script above),
 * this renders an empty host div instead of the content itself: the actual
 * editor is mounted into it by `mountFileEditorIfNeeded()`, right after
 * render() sets innerHTML (form UX review follow-up). Without CodeMirror
 * (offline, CDN unreachable), it falls back to the plain textarea this
 * view always used before — same id/content/behavior as always.
 */
function renderFileViewHtml(relPath) {
  const mf = AppState.manifestFiles.find((f) => f.relPath === relPath);
  if (!mf) return '<div class="center-placeholder">File not found: ' + escapeHtml(relPath) + '</div>';
  const hasDraft = rawYamlEditDraft && rawYamlEditDraft.relPath === relPath;
  const textareaValue = hasDraft ? rawYamlEditDraft.text : mf.rawText;
  const draftError = hasDraft ? rawYamlEditDraft.error : null;
  let html = '<div class="file-view">';
  // Header: file name (left), Save/Reload (right) — same .element-header
  // split every other center-view header uses (UX review follow-up).
  html += renderElementHeaderHtml(
    '<h2>' + escapeHtml(mf.relPath) + '</h2>' +
      (mf.dirty ? '<span class="modified-badge" title="Edited in memory. Nothing is written to disk until \'Save all changes\'.">modified \u2014 not written to disk</span>' : ''),
    '<button type="button" data-action="reload-file-edit" data-relpath="' + escapeHtml(relPath) + '"' +
      (mf.existedOnDisk
        ? ' title="Re-read this file from disk and discard unsaved changes to it."'
        : ' disabled title="This file has not been written to disk yet, so there is nothing to reload."') +
      '>Reload</button>'
  );
  if (draftError) {
    html += '<div class="error-panel"><strong>Parse error:</strong> ' + escapeHtml(draftError) + '</div>';
  } else if (mf.error) {
    html += '<div class="error-panel"><strong>Parse error:</strong> ' + escapeHtml(mf.error) + '</div>';
  }
  for (const d of duplicatesOfFile(relPath)) {
    html += '<div class="error-panel" role="alert"><strong>Duplicate reference:</strong> ' + duplicateMessageHtml(d.message) + '</div>';
  }
  const folderWarning = filePlateauFolderWarning(mf);
  if (folderWarning) html += '<div class="nav-facet-note file-plateau-warning" role="status"><strong>Warning:</strong> ' + duplicateMessageHtml(folderWarning) + '. Nothing is wrong for the tools, which read the plateau of the header; check that the file is where you mean it to be.</div>';
  if (window.CM) {
    html += '<div id="file-edit-codemirror-host" class="raw-yaml" data-relpath="' + escapeHtml(relPath) + '" aria-label="Raw YAML content of ' + escapeHtml(relPath) + '"></div>';
  } else {
    html += '<textarea id="file-edit-textarea" class="raw-yaml" data-relpath="' + escapeHtml(relPath) + '" aria-label="Raw YAML content of ' + escapeHtml(relPath) + '">' + escapeHtml(textareaValue) + '</textarea>';
  }
  html += '</div>';
  return html;
}

