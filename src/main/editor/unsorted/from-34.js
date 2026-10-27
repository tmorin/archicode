// ---- Top panel (DEC-11, FR-1..3, AC-1/AC-11/AC-12) ----

/**
 * Render `saveStatus`'s current state as a short status line (TDD-0010
 * DEC-11, resolves AC-16/AC-17's visibility requirements) — empty while
 * `'idle'` (no save attempt has happened yet this session, or the status
 * was reset by a later edit).
 */
function renderSaveStatusHtml() {
  if (!saveStatus || saveStatus.state === 'idle') return '';
  let text;
  let isError = true;
  if (saveStatus.state === 'success') {
    text = saveStatus.message;
    isError = false;
  } else if (saveStatus.state === 'denied') {
    text = saveStatus.message;
  } else if (saveStatus.state === 'conflict') {
    text = 'Save refused — changed on disk since loaded: ' + saveStatus.conflicts.join(', ') + '. Reopen the folder before retrying.';
  } else if (saveStatus.state === 'reload-error') {
    text = 'Reload failed on "' + saveStatus.failedFile + '": ' + saveStatus.message + '. The in-memory copy was kept.';
  } else if (saveStatus.state === 'error') {
    text = 'Save failed on "' + saveStatus.failedFile + '": ' + saveStatus.message;
  } else {
    return '';
  }
  // title carries the full text: the top bar truncates long messages with an ellipsis.
  return '<span class="save-status ' + (isError ? 'save-status-error' : 'save-status-success') + '" role="status" title="' + escapeHtml(text) + '">' + escapeHtml(text) + '</span>';
}

/**
 * The perspective switch (header, left of the folder actions): a button group, the perspective of the page on screen is the pressed one. Timeline, Stories, Files and
 * Settings; a click opens the first page of the perspective (Applications for Timeline, the Stories page...). The pages of Timeline are in the bar under the band
 * (`renderPageTabsHtml`).
 */
function renderPerspectiveTabsHtml() {
  const group = PERSPECTIVES[currentPerspective].group;
  let html = '<span class="perspective-tabs button-group" role="group" aria-label="Perspectives">';
  for (const entry of PERSPECTIVE_GROUPS) {
    html += '<button type="button" data-action="set-perspective" data-perspective="' + entry.page + '" aria-pressed="' + (entry.id === group) + '">' +
              escapeHtml(entry.label) +
            '</button>';
  }
  html += '</span>';
  return html;
}

/**
 * The pages of the Timeline perspective (Plateaus, Applications, Environments, Elements), in a bar of their own under the band. Only while one of them is on screen.
 */
function renderPageTabsHtml() {
  const page = currentPerspective;
  if (PERSPECTIVES[page].group !== 'timeline') return '';
  let html = '<nav class="page-tabs col-span-3" id="page-tabs" aria-label="Pages of the Timeline"><span class="button-group" role="group" aria-label="Pages">';
  for (const id of ['plateaus'].concat(TIMELINE_PAGES)) {
    html += '<button type="button" data-action="set-page" data-perspective="' + id + '" aria-pressed="' + (id === page) + '"' + (id === page ? ' aria-current="page"' : '') + '>' + escapeHtml(PERSPECTIVES[id].label) + '</button>';
  }
  return html + '</span></nav>';
}

/**
 * The one Save of the editor. Always rendered (disabled when there is nothing to write) so the bar never shifts as
 * edits come and go, and the action stays discoverable. It is also enabled by text typed in a form and not applied yet:
 * clicking it applies the form (`flushPendingDraft`), then writes.
 */
function renderSaveAllButtonHtml() {
  return '<span class="button-group" role="group" aria-label="Changes">' + renderCancelButtonHtml() + renderSaveButtonHtml() + '</span>';
}

/** Gives up everything not written yet. Disabled, like Save, when there is nothing to give up. */
function renderCancelButtonHtml() {
  const count = countUnsavedChanges();
  if (count === 0 && !draftTyped) return '<button type="button" data-action="cancel-changes" disabled title="No changes to cancel.">Cancel</button>';
  return '<button type="button" data-action="cancel-changes"' + (saveInFlight ? ' disabled' : '') +
    ' title="Discards what you typed and every change not written to disk, and reloads the folder.">Cancel</button>';
}

function renderSaveButtonHtml() {
  const count = countUnsavedChanges();
  if (count === 0 && !draftTyped) return '<button type="button" class="btn-primary" data-action="save-all-changes" disabled title="No changes to save.">Save all changes</button>';
  const busy = saveInFlight ? ' disabled aria-busy="true"' : '';
  if (count === 0) return '<button type="button" class="btn-primary" data-action="save-all-changes"' + busy + ' title="Applies what you typed, then writes it to disk.">Save all changes</button>';
  return '<button type="button" class="btn-primary" data-action="save-all-changes"' + busy + ' title="Writes ' + count + ' modified item' + (count === 1 ? '' : 's') +
    ' to disk (files, pending file removals, .archicode.yaml settings). Until then, edits live in memory only.">Save all changes (' + count + ')</button>';
}

/** True once something was typed in the form on screen and not applied to the model yet. Any redraw starts a form afresh. */
let draftTyped = false;

/** Redraws the Cancel and Save buttons alone, so typing in a form enables it without redrawing (and losing) the form. */
function refreshSaveAllButton() {
  const group = document.querySelector('[aria-label="Changes"]');
  if (!group || !group.outerHTML) return;
  const holder = document.createElement('template');
  holder.innerHTML = renderSaveAllButtonHtml();
  if (holder.content && holder.content.firstElementChild) group.replaceWith(holder.content.firstElementChild);
}

/** Lights or dims the buttons of "Save all changes" where they are, without replacing them: a click that is being made on one must still land on it. */
function syncSaveAllButtonsInPlace() {
  const group = document.querySelector('[aria-label="Changes"]');
  if (!group || !group.querySelectorAll) return;
  const holder = document.createElement('template');
  holder.innerHTML = renderSaveAllButtonHtml();
  const fresh = holder.content ? holder.content.querySelectorAll('button') : [];
  const current = group.querySelectorAll('button');
  fresh.forEach((button, index) => {
    if (!current[index]) return;
    current[index].disabled = button.disabled;
    current[index].title = button.title;
  });
}

/**
 * Applies what the form on screen holds (an element, the settings or a manifest file) to the model, as the former
 * per-form Save did. False when it is invalid: the form shows its errors and the save must not go on.
 */
function flushPendingDraft() {
  if (currentPerspective === 'settings') {
    if (!draftTyped) return true;
    const draft = readSettingsDraft();
    if (!draft.valid) return false;
    commitSettingsEdit(draft.apply);
    return true;
  }
  const sel = AppState.selection;
  if (sel.kind === 'file') {
    const text = currentFileEditorText();
    const mf = AppState.manifestFiles.find((f) => f.relPath === sel.key);
    if (text === null || !mf || text === mf.rawText) return true;
    commitFileEdit(sel.key, text);
    return !(rawYamlEditDraft && rawYamlEditDraft.relPath === sel.key); // a rejected text stays in the editor with its error
  }
  if (sel.kind === 'element' && sel.mode === 'edit' && draftTyped) return commitElementWithDraft(sel.key, null);
  return true;
}

function renderTopPanelHtml() {
  if (!AppState.folder) return '';
  const saveAll = renderSaveAllButtonHtml();
  const name = workspaceName();
  // the name of the workspace in place of the folder, which is then the tooltip; without one, the folder and its root slash
  const label = name
    ? '<span class="folder-name workspace-name" title="Folder: ' + escapeHtml(AppState.folder.name) + '">' + escapeHtml(name) + '</span>'
    : '<span class="folder-name" title="Folder: ' + escapeHtml(AppState.folder.name) + ' (a browser does not tell the full path of a folder)">' +
        escapeHtml(AppState.folder.name) + '<span class="folder-root-slash">/</span>' +
      '</span>';
  return '<header class="top-panel col-span-3 flex items-center px-4">' +
      label +
      renderPerspectiveTabsHtml() +
      // one group, pushed to the right: when the bar wraps it moves as a whole, and the status gives way before the buttons do;
      // the folder of `archicode editor serve` is the one the server was started on: there is no other to pick, so no Close folder
      '<span class="top-actions">' + renderSaveStatusHtml() + saveAll + renderHelpButtonHtml() +
        (isServedByArchiCode() ? '' : '<button type="button" class="btn-ghost" data-action="close-folder" title="Close this workspace folder and go back to the list of folders: it stays in the list.">Close folder</button>') +
      '</span>' +
    '</header>';
}

// ---- Left panel — pure navigation (FR-8/FR-9/FR-10, AC-2/AC-3/AC-4) ----

/**
 * The id of the group of children of a row of a tree: one per layer and per element. The reference is escaped so that
 * two different ones never give the same id (`shop.web` and `shop_web` did), and the layer tells apart an application
 * element from a technology element of the same reference.
 */
function treeGroupId(prefix, layer, reference) {
  return prefix + layer + '-' + String(reference).replace(/[^A-Za-z0-9-]/g, (c) => '_' + c.charCodeAt(0).toString(16) + '_');
}

/** The tab stop of a tree is one row: a reference that is in both layers has two rows, and only the first takes it. */
let navTabStopGiven = false;
function navTabIndex(key) {
  if (key !== navActiveKey || navTabStopGiven) return '-1';
  navTabStopGiven = true;
  return '0';
}

/**
 * The order of the rows of a navigation: by kind, from the widest to the narrowest (solution, system, container,
 * component; then person, group, environment, node), then by name — the id when there is no name. The model keeps the
 * order of the manifests; only the navigation sorts.
 */
const NAV_KIND_ORDER = ['solution', 'system', 'container', 'component', 'person', 'environment', 'node'];
function navKindRank(kind) {
  const k = String(kind);
  const rank = NAV_KIND_ORDER.indexOf(k);
  return rank === -1 ? NAV_KIND_ORDER.length : rank;
}
function sortedForNav(records) {
  const label = (r) => String(r.name !== undefined && r.name !== null && r.name !== '' ? r.name : r.id);
  return (records || []).slice().sort((a, b) =>
    navKindRank(a.kind) - navKindRank(b.kind) ||
    label(a).localeCompare(label(b), undefined, { sensitivity: 'base', numeric: true }) ||
    (a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0));
}

/**
 * The comparison the rows of a tree read while it is drawn (run 0040): one lookup for the whole tree, not one per row (the answer is cached, but its
 * key is the whole model). Null while nothing is compared, and outside the drawing of a tree: a row then has no mark and is what it always was.
 */
let treeComparison = null;

function comparisonForTrees() {
  const state = comparisonState();
  return state && state.records ? state : null;
}

/** The state a row of a tree says for an element: its own change, `contains-changes` for one that has a change below it (the kernel says so, `comparisonStateOfElement`), or null. A removed element is not in a tree. */
function treeChangeOf(record) {
  if (!treeComparison) return null;
  const layer = record.layer || 'application';
  return comparisonStateOfElement(treeComparison.records.get(layer + '|' + record.reference));
}

/** The mark of a row of a tree: a glyph (+ new, ~ changed, ± contains changes; the word is in the tooltip and in what a screen reader reads, see `treeChangeWord`). */
function treeChangeMarkHtml(change) {
  return change ? '<span class="tree-change" data-state="' + change + '" title="' + escapeHtml(treeChangeWord(change)) + '" aria-hidden="true">' + escapeHtml(CHANGE_GLYPHS[change]) + '</span>' : '';
}

/** What the mark of a row says in words. */
function treeChangeWord(change) {
  return change === 'contains-changes' ? 'Contains changes: something inside it is new, changed or removed' : CHANGE_WORDS[change].word.charAt(0).toUpperCase() + CHANGE_WORDS[change].word.slice(1) + ' since ' + (treeComparison ? plateauTitle(treeComparison.base) : 'the other plateau');
}

function renderTreeNodeHtml(record, level) {
  const hasChildren = Array.isArray(record.children) && record.children.length > 0;
  const key = recordKey(record);
  const isExpanded = AppState.expanded.has(key);
  // the same reference can be an element of both layers: only the row of the selected layer is the selected one
  const selected = elementSelection();
  const isActive = selected.kind === 'element' && selected.key === record.reference &&
    layerOfReference(record.reference, selected.layer) === (record.layer || 'application');
  const label = (record.name !== undefined && record.name !== null && record.name !== '') ? record.name : record.id;
  const modified = AppState.dirtyReferences.has(key);
  const ref = escapeHtml(record.reference);
  const groupId = treeGroupId('tree-group-', record.layer || 'application', record.reference);
  const styled = styledStereotypesOf(stereotypesOfRecord(record)); // what the workspace styled: shown as badges, said in the label
  const change = treeChangeOf(record); // a comparison: the glyph after the name, and the word for a screen reader
  const spoken = label + (styled.length ? ', ' + styled.join(', ') : '') + (modified ? ', modified' : '') + (change ? ', ' + CHANGE_WORDS[change].word : '');

  let html = '<div class="tree-node">';
  html += '<div class="tree-node-row' + (isActive ? ' active' : '') + '" role="treeitem" style="--level:' + level + '" aria-level="' + level + '" aria-selected="' + isActive + '"' +
          (hasChildren ? ' aria-expanded="' + isExpanded + '"' + (isExpanded ? ' aria-owns="' + groupId + '"' : '') : '') +
          ' tabindex="' + navTabIndex(key) + '" data-node="' + escapeHtml(key) + '" data-aria="' + escapeHtml(spoken) + '" aria-label="' + escapeHtml(spoken) + '"' +
          ' data-action="select-element" data-ref="' + ref + '" data-layer="' + escapeHtml(record.layer || 'application') + '">';
  if (hasChildren) {
    html += '<span class="tree-toggle" aria-hidden="true" data-action="toggle-element" data-ref="' + ref + '" data-layer="' + escapeHtml(record.layer || 'application') + '">' + (isExpanded ? '▾' : '▸') + '</span>';
  } else {
    html += '<span class="tree-toggle tree-toggle-empty" aria-hidden="true">▸</span>';
  }
  html += '<span class="tree-node-kind" title="' + escapeHtml(record.kind) + '">' + escapeHtml(kindAbbreviation(record.kind)) + '</span>';
  html += '<span class="tree-node-label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' + treeChangeMarkHtml(change) + stereotypeBadgesHtml(styled);
  if (modified) {
    html += '<span class="modified-dot" aria-hidden="true" title="This element has unsaved changes"></span>';
  }
  html += '</div>';
  if (hasChildren && isExpanded) {
    html += '<div class="tree-node-children" role="group" id="' + groupId + '">';
    for (const child of sortedForNav(record.children)) {
      html += renderTreeNodeHtml(child, level + 1);
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/**
 * The heading of a list in the left panel that does not fold (the Map, Files, Stories, Views): the look of the headings of
 * the Elements tree — title on the left, its tools on the right — so that every perspective's panel reads the same.
 */
function renderNavHeaderHtml(title, actionsHtml) {
  return '<div class="tree-branch-header static"><span class="tree-branch-title">' + escapeHtml(title) + '</span>' +
    (actionsHtml ? '<span class="tree-branch-actions">' + actionsHtml + '</span>' : '') + '</div>';
}

function renderTreeBranchHtml(branchKey, title, category, elements, isExpanded, showAddButton) {
  let html = '<div class="nav-section">';
  html += '<div class="tree-branch-header" data-action="toggle-branch" data-branch="' + escapeHtml(branchKey) + '">' +
            // the title is the control (the header also holds buttons, which cannot sit inside one): a click anywhere on the header does the same
            '<span class="tree-branch-title" role="button" tabindex="0" aria-expanded="' + isExpanded + '">' + (isExpanded ? '▾' : '▸') + ' ' + escapeHtml(title) + '</span>' +
            '<span class="tree-branch-actions">' + renderNavToolsHtml(category, branchKey, title) + (showAddButton ? ('<button type="button" class="tree-branch-add-btn" data-action="open-create-top-level-form" data-category="' + escapeHtml(category) + '" aria-label="Add an element to ' + escapeHtml(title) + '">+ Add</button>') : '') +
            '</span>' +
          '</div>';
  if (isExpanded) {
    html += '<div class="tree-branch-body"' + (elements && elements.length ? ' role="tree" aria-label="' + escapeHtml(title) + '"' : '') + '>';
    if (!elements || elements.length === 0) {
      html += '<div class="tree-empty">' + (showAddButton ? 'No elements yet — use "+ Add" above to create one.' : 'No elements.') + '</div>';
    } else {
      for (const el of sortedForNav(elements)) {
        html += renderTreeNodeHtml(el, 1);
      }
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/**
 * The Applications/Environments element tree, no wrapper — shared by the
 * Elements and Diagram perspectives' left panel. `showAddButton` is false
 * for Diagram: its left panel is pure navigation (DEC — Diagram has no
 * center surface to land a newly-created element on, only Elements does).
 */
function renderElementsNavHtml(showAddButton) {
  const appElements = (AppState.workspace && AppState.workspace.application && AppState.workspace.application.elements) || [];
  const techElements = (AppState.workspace && AppState.workspace.technology && AppState.workspace.technology.elements) || [];
  // one tab stop for both trees: the row the user was on, else the selected one, else the first
  const visible = [];
  const collect = (record) => { visible.push(recordKey(record)); if (AppState.expanded.has(recordKey(record))) sortedForNav(record.children).forEach(collect); };
  if (treeExpandedApplications) sortedForNav(appElements).forEach(collect);
  if (treeExpandedEnvironments) sortedForNav(techElements).forEach(collect);
  const selected = elementSelection();
  resolveNavActive(visible, selected.kind === 'element' ? nodeKey(selected.key, selected.layer) : null);
  navTabStopGiven = false;
  const facet = anyDiagramShown() ? currentDiagramFacet() : null;
  const note = facet
    ? '<div class="nav-facet-note">Greyed: nothing to draw through “' + escapeHtml(facet.name) + '”. <button type="button" data-action="clear-facet">Clear facet</button></div>'
    : '';
  treeComparison = comparisonForTrees();
  try {
    return note + renderPlateauTreeHtml() + renderDuplicateReferencesHtml() + renderUnreadManifestsHtml(false) +
           renderTreeBranchHtml('applications', 'Applications', 'application', appElements, treeExpandedApplications, showAddButton) +
           renderTreeBranchHtml('environments', 'Environments', 'technology', techElements, treeExpandedEnvironments, showAddButton);
  } finally {
    treeComparison = null;
  }
}

/**
 * Unfold all / Fold all for a tree of a navigation: every branch of one layer's tree, never what the map draws. The Elements
 * navigation has one pair in the header of each of its two trees (`branch` says which header folds with it); the Map one, a single pair.
 */
function renderNavToolsHtml(layer, branch, name) {
  const icon = (d) => '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const scope = ' data-layer="' + layer + '"' + (branch ? ' data-branch="' + branch + '"' : '');
  return '<span class="nav-tools">' +
    '<button type="button" class="map-scope-btn" data-action="nav-unfold-all"' + scope + ' title="Unfold every branch of the tree" aria-label="Unfold every branch of ' + (name || 'the tree') + '">' + icon('M4 3.5l4 3 4-3M4 9.5l4 3 4-3') + '</button>' +
    '<button type="button" class="map-scope-btn" data-action="nav-fold-all"' + scope + ' title="Fold every branch of the tree" aria-label="Fold every branch of ' + (name || 'the tree') + '">' + icon('M4 6.5l4-3 4 3M4 12.5l4-3 4 3') + '</button>' +
    '</span>';
}

/** Every element of a layer that has children: what "Unfold all" opens. */
function referencesWithChildren(layer) {
  const found = [];
  for (const record of AppState.index[layer].values()) {
    if (Array.isArray(record.children) && record.children.length) found.push(record.reference);
  }
  return found;
}

/** A message of `duplicateReferenceMessage` as HTML: the reference and the files in `<code>`. */
function duplicateMessageHtml(message) {
  return escapeHtml(message).replace(/`([^`]*)`/g, '<code>$1</code>');
}

/**
 * A reference declared twice is never chosen between: it is told here (Elements and Files), on the files that declare it,
 * and the diagrams are not drawn while it lasts (`mountDiagramIfNeeded`). The command line fails on the same references.
 * Nothing is blocked otherwise: the editor still opens, edits and saves, so that the duplicate can be fixed in it.
 */
function renderDuplicateReferencesHtml() {
  const duplicates = AppState.duplicateReferences || [];
  if (!duplicates.length) return '';
  return '<div class="nav-duplicate-note" role="alert"><strong>' + duplicatesCountText(duplicates) + ' declared more than once.</strong> ' +
    'The command line refuses to load the workspace until each is declared once.' +
    (elementDuplicates().length ? ' The diagrams are not drawn meanwhile.' : '') +
    '<ul>' + duplicates.map((d) => '<li>' + duplicateMessageHtml(d.message) + '</li>').join('') + '</ul></div>';
}

function duplicatesCountText(duplicates) {
  return duplicates.length === 1 ? 'One reference, view or story is' : duplicates.length + ' references, views or stories are';
}

/**
 * The mistakes of the tree of plateaus (the command line refuses the workspace until each is fixed) and what is odd about it (the command line
 * warns). Nothing is blocked: the editor opens, edits and saves, so that the mistake can be fixed in it. Nothing at all for a workspace that
 * writes no layered plateau.
 */
function renderPlateauTreeHtml() {
  const model = AppState.plateauTree;
  if (!model) return '';
  // a view and a story that say `plateau:` are told even when nothing else uses plateaus: the key names none, and the command line warns of it
  if (!model.layered) return model.warnings.length ? '<div class="nav-facet-note nav-plateau-warnings" role="status"><ul>' + model.warnings.map((w) => '<li>' + duplicateMessageHtml(w) + '</li>').join('') + '</ul></div>' : '';
  let html = '';
  const problems = model.problems.concat(model.redeclared);
  if (problems.length) {
    html += '<div class="nav-duplicate-note" role="alert"><strong>' + (problems.length === 1 ? 'One mistake in the plateaus.' : problems.length + ' mistakes in the plateaus.') + '</strong> ' +
      'The command line refuses to load the workspace until they are fixed.' +
      '<ul>' + problems.map((p) => '<li>' + duplicateMessageHtml(p) + '</li>').join('') + '</ul></div>';
  }
  if (model.warnings.length) {
    html += '<div class="nav-facet-note nav-plateau-warnings" role="status"><ul>' + model.warnings.map((w) => '<li>' + duplicateMessageHtml(w) + '</li>').join('') + '</ul></div>';
  }
  return html;
}

/** The duplicates that are references of elements: the model has no single answer, so nothing is drawn from it. */
function elementDuplicates() {
  return (AppState.duplicateReferences || []).filter((d) => d.layer === 'application' || d.layer === 'technology');
}

/** The duplicates a file takes part in (its relPath is one of their sources). */
function duplicatesOfFile(relPath) {
  return (AppState.duplicateReferences || []).filter((d) => d.sources.includes(relPath));
}

/**
 * The files the CLI reads as manifests and the editor does not (TOML, JSON): what they declare is missing from the trees and
 * the diagrams, and nothing else says so. `list`: name them (Files), else only count them (Elements).
 */
function renderUnreadManifestsHtml(list) {
  const files = AppState.unreadManifestFiles || [];
  if (!files.length) return '';
  const text = files.length + (files.length === 1 ? ' manifest file is' : ' manifest files are') + ' not read by the editor, which reads YAML only: what ' +
    (files.length === 1 ? 'it declares is' : 'they declare is') + ' missing here, and relationships to it show as dangling.';
  return '<div class="nav-facet-note nav-unread-note" role="status">' + escapeHtml(text) +
    (list ? '<ul>' + files.map((relPath) => '<li class="file-relpath">' + escapeHtml(relPath) + '</li>').join('') + '</ul>' : ' See Files.') + '</div>';
}

const FILES_NO_PLATEAU_GROUP = 'none';

/** The group of the Files page a file is in. */
function filesGroupOf(mf) {
  const plateau = filePlateauOf(mf);
  return plateau === null ? FILES_NO_PLATEAU_GROUP : 'plateau:' + plateau;
}

/** Whether the Files page groups its files: the workspace has plateaus (a manifest of kind Plateau, or a header that says `plateau:`). Else the list is flat, as it always was. */
function filesAreGrouped() {
  return !!(AppState.plateauTree && AppState.plateauTree.layered);
}

/** The groups of the files, in the order of the plateaus (the root first, then each plateau under the one it overrides), the ones the tree does not know after them, and no plateau last. Empty groups are left out. */
function filesGroups(files) {
  const byKey = new Map();
  for (const mf of files) {
    const key = filesGroupOf(mf);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(mf);
  }
  const tree = AppState.plateauTree;
  const known = tree ? tree.ids.map((id) => 'plateau:' + id) : [];
  const unknown = Array.from(byKey.keys()).filter((key) => key !== FILES_NO_PLATEAU_GROUP && !known.includes(key)).sort(compareUnits);
  return known.concat(unknown, [FILES_NO_PLATEAU_GROUP]).filter((key) => byKey.has(key)).map((key) => ({ key, files: byKey.get(key) }));
}

/** The group of the open file is unfolded the first time it is open there (a file opened from the list, an address, a link), so that the list never loses it; a fold the author makes after that is kept. */
function unfoldGroupOfOpenFile() {
  const selection = AppState.selection;
  if (!filesAreGrouped() || selection.kind !== 'file') return;
  const mf = AppState.manifestFiles.find((f) => f.relPath === selection.key);
  if (!mf) return;
  const seen = selection.key + '\0' + filesGroupOf(mf);
  if (seen === filesSelectionSeen) return;
  filesSelectionSeen = seen;
  filesFolded.delete(filesGroupOf(mf));
}

/**
 * What is odd about where a manifest sits: its plateau disagrees with the name of a folder it is in, when that name is the id of another plateau (the folders of the layered
 * Brightcart are named after their plateau; a file moved from one to the other with its header left alone is read as the plateau its header says, not the folder's). The
 * deepest such folder counts. Null when the file agrees, when no folder is named like a plateau, or without layers. Only a warning: the folder does not matter to the tools.
 */
function filePlateauFolderWarning(mf) {
  const tree = AppState.plateauTree;
  const plateau = filePlateauOf(mf);
  if (!tree || !tree.layered || plateau === null) return null;
  const folders = mf.relPath.split('/').slice(0, -1);
  for (let i = folders.length - 1; i >= 0; i--) {
    if (!tree.nodes.has(folders[i])) continue;
    if (folders[i] === plateau) return null;
    const how = manifestKindName(mf.header.kind) === 'plateau' ? 'declares the plateau `' + plateau + '`'
      : headerPlateau(mf.header) === null ? 'has no `plateau` key in its header, so it belongs to `' + plateau + '`'
      : 'says `plateau: ' + plateau + '` in its header';
    return '`' + mf.relPath + '` ' + how + ', but it sits in the folder `' + folders[i] + '`, which is the name of another plateau';
  }
  return null;
}

/** One row of the Files list: the file, and what is odd about it. */
function renderFileRowHtml(mf) {
  const active = (AppState.selection.kind === 'file' && AppState.selection.key === mf.relPath) ? ' active' : '';
  const duplicates = duplicatesOfFile(mf.relPath);
  const errorClass = mf.error || duplicates.length ? ' has-error' : '';
  const warning = filesAreGrouped() ? filePlateauFolderWarning(mf) : null;
  return '<div class="nav-row file-row' + active + errorClass + '" role="button" tabindex="0"' + (active ? ' aria-current="true"' : '') + ' data-action="select-file" data-relpath="' + escapeHtml(mf.relPath) + '">' +
           '<span class="file-relpath">' + escapeHtml(mf.relPath) + '</span>' +
           (warning ? '<span class="warning-badge" title="' + escapeHtml(warning) + '">folder</span>' : '') +
           (mf.dirty ? '<span class="modified-badge" title="Unsaved changes">modified</span>' : '') +
           (mf.error ? '<span class="error-badge" title="' + escapeHtml(mf.error) + '">error</span>' : '') +
           (duplicates.length ? '<span class="error-badge" title="' + escapeHtml(duplicates.map((d) => d.message).join('\n')) + '">duplicate</span>' : '') +
         '</div>';
}

/** One group of the Files list: its heading (the plateau, its name, how many files), which folds it, and its rows. */
function renderFilesGroupHtml(group) {
  const folded = filesFolded.has(group.key);
  const none = group.key === FILES_NO_PLATEAU_GROUP;
  const id = none ? null : group.key.slice('plateau:'.length);
  const node = id !== null && AppState.plateauTree ? AppState.plateauTree.nodes.get(id) : null;
  const title = none ? 'No plateau' : id;
  const name = node && node.name ? node.name : '';
  const hint = none ? 'Files that belong to no plateau' : 'Files of the plateau `' + id + '`';
  const count = group.files.length + (group.files.length === 1 ? ' file' : ' files');
  // what a folded group would show on its rows, so that a fold never hides a mistake or an unsaved file
  const hidden = !folded ? '' :
    (group.files.some((mf) => mf.error || duplicatesOfFile(mf.relPath).length) ? '<span class="error-badge" title="A file of this group has an error">error</span>' : '') +
    (group.files.some((mf) => mf.dirty) ? '<span class="modified-badge" title="A file of this group has unsaved changes">modified</span>' : '');
  let html = '<div class="files-group" data-files-group="' + escapeHtml(group.key) + '"' + (id !== null ? ' data-plateau-of="' + escapeHtml(id) + '"' : '') + '>';
  html += '<div class="tree-branch-header" data-action="toggle-files-group" data-branch="files:' + escapeHtml(group.key) + '" data-group="' + escapeHtml(group.key) + '">' +
            '<span class="tree-branch-title" role="button" tabindex="0" aria-expanded="' + !folded + '" title="' + escapeHtml(hint) + '">' + (folded ? '▸' : '▾') + ' ' + escapeHtml(title) +
              (name ? ' <span class="files-group-name">' + escapeHtml(name) + '</span>' : '') + '</span>' +
            '<span class="files-group-count">' + hidden + count + '</span>' +
          '</div>';
  if (!folded) html += '<div class="tree-branch-body">' + group.files.map(renderFileRowHtml).join('') + '</div>';
  return html + '</div>';
}

/** Unfold all / Fold all for the groups of the Files list. */
function renderFilesToolsHtml() {
  const icon = (d) => '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<button type="button" class="map-scope-btn" data-action="files-unfold-all" title="Unfold every group of files" aria-label="Unfold every group of files">' + icon('M4 3.5l4 3 4-3M4 9.5l4 3 4-3') + '</button>' +
    '<button type="button" class="map-scope-btn" data-action="files-fold-all" title="Fold every group of files" aria-label="Fold every group of files">' + icon('M4 6.5l4-3 4 3M4 12.5l4-3 4 3') + '</button>';
}

/** The manifest files list, no wrapper — the Files perspective's left panel. Every file is listed; with plateaus they are in a group per plateau (see `filesFolded`). */
function renderFilesNavHtml() {
  const grouped = filesAreGrouped();
  let html = '<div class="nav-section">';
  html += renderNavHeaderHtml('Files', grouped ? renderFilesToolsHtml() : '');
  if (grouped) {
    unfoldGroupOfOpenFile();
    const misplaced = AppState.manifestFiles.filter((mf) => filePlateauFolderWarning(mf) !== null).length;
    if (misplaced > 0) html += '<div class="files-note" role="status">' + misplaced + (misplaced === 1 ? ' file sits' : ' files sit') + ' in the folder of another plateau.</div>';
    html += filesGroups(AppState.manifestFiles).map(renderFilesGroupHtml).join('');
  } else {
    html += AppState.manifestFiles.map(renderFileRowHtml).join('');
  }
  html += '</div>';
  return renderPlateauTreeHtml() + renderDuplicateReferencesHtml() + html + renderUnreadManifestsHtml(true);
}

/** The left panel's `<nav>` shell — one resizable panel id shared by every perspective that uses it. */
function renderLeftPanelWrapperHtml(innerHtml) {
  return '<nav id="panel-left" class="left-panel min-w-48 w-64 max-w-[40vw]" style="' + savedPanelSizeStyle('panel-left', 'width') + '">' + innerHtml + '</nav>';
}

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
    render();
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

// =====================================================================
// Theme — light, dark or the system's, a preference of this browser (never of the workspace: it is not in
// .archicode.yaml, and choosing it neither modifies the workspace nor lights "Save all changes"). The stylesheet reads
// `data-theme` on the root element; "system" is no attribute at all. The <head> carries a script that applies the stored
// choice before the first paint, with the same key and values.
// =====================================================================
const THEME_STORAGE_KEY = 'archicode-standalone-editor:theme';
const THEME_CHOICES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
];

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEME_CHOICES.some((choice) => choice.value === stored)) return stored;
  } catch (e) { /* storage unavailable: the system's scheme */ }
  return 'system';
}

/** The choice in force: kept in memory too, so that a browser that refuses its storage still gets the choice for the session. */
let themeChoice = readStoredTheme();

/** Put the choice on the root element, where the stylesheet reads it. */
function applyTheme() {
  const root = document.documentElement;
  if (!root) return;
  if (themeChoice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', themeChoice);
}
applyTheme();

/** Is the page in the dark scheme: forced by the choice, else the system's? */
function isDarkScheme() {
  if (themeChoice !== 'system') return themeChoice === 'dark';
  try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; }
}

/**
 * The code editors fix their dark flag and their colors of code when they are created: rebuild the open ones, with the text
 * they hold now (their undo history goes, what was typed does not).
 */
function refreshCodeEditorThemes() {
  if (!window.CM) return;
  for (const [viewpoint, view] of Object.entries(activeJsonEditorViews)) {
    const parent = view.dom.parentElement;
    const doc = view.state.doc.toString();
    view.destroy();
    activeJsonEditorViews[viewpoint] = new window.CM.EditorView({
      doc, extensions: [window.CM.basicSetup, window.CM.json()].concat(codeMirrorThemeExtensions()), parent
    });
  }
  if (activeFileEditorView) {
    const parent = activeFileEditorView.dom.parentElement;
    const doc = activeFileEditorView.state.doc.toString();
    activeFileEditorView.destroy();
    activeFileEditorView = new window.CM.EditorView({
      doc, extensions: [window.CM.basicSetup, window.CM.yaml()].concat(codeMirrorThemeExtensions()), parent
    });
  }
}

/** Choose the theme: it applies at once, without a redraw (which would drop what is typed in the settings), and is remembered. */
function setThemeChoice(value) {
  if (!THEME_CHOICES.some((choice) => choice.value === value)) return;
  themeChoice = value;
  try { localStorage.setItem(THEME_STORAGE_KEY, value); } catch (e) { /* storage unavailable: kept for this session only */ }
  applyTheme();
  refreshCodeEditorThemes();
}

// "System" follows the operating system as it changes: the stylesheet does by itself, the code editors need a rebuild.
try {
  const systemScheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (systemScheme && systemScheme.addEventListener) systemScheme.addEventListener('change', () => { if (themeChoice === 'system') refreshCodeEditorThemes(); });
} catch (e) { /* no media query: nothing to follow */ }

/** The "Appearance" section of Settings: native radios in a fieldset, and only about this browser. */
function renderAppearanceSectionHtml() {
  return '<div class="edition-section" id="settings-appearance"><h3>Appearance (this browser)</h3>' +
    '<fieldset class="theme-choice" aria-describedby="settings-help-theme"><legend>Theme</legend>' +
      THEME_CHOICES.map((choice) =>
        '<label class="theme-choice-option"><input type="radio" name="theme-choice" value="' + choice.value + '"' + (themeChoice === choice.value ? ' checked' : '') + '><span>' + choice.label + '</span></label>'
      ).join('') +
    '</fieldset>' +
    '<div class="settings-help" id="settings-help-theme">Remembered by this browser only: it is not part of the workspace and does not need saving. System follows the operating system.</div>' +
  '</div>';
}

/**
 * The look of the code editors: the page's own colors (CSS variables, so they follow the scheme), declared dark when the
 * page is, and the code colors written for a dark background in that case. Without it the editor stayed a white box
 * with the page's light text colors in a dark page.
 */
function codeMirrorThemeExtensions() {
  if (!window.CM || !window.CM.EditorView || !window.CM.EditorView.theme) return [];
  const dark = isDarkScheme();
  const theme = window.CM.EditorView.theme({
    '&': { color: 'var(--fg)', backgroundColor: 'var(--bg)' },
    '.cm-content': { caretColor: 'var(--fg)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--fg)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'color-mix(in srgb, var(--accent) 35%, transparent)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)' },
    '.cm-gutters': { backgroundColor: 'var(--panel-bg)', color: 'var(--muted)', borderRight: '1px solid var(--border)' },
    '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--fg)' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--panel-bg)', color: 'var(--muted)', border: '1px solid var(--border)' },
    '.cm-panels': { backgroundColor: 'var(--panel-bg)', color: 'var(--fg)' },
    '.cm-tooltip': { backgroundColor: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)' }
  }, { dark });
  return dark && window.CM.darkHighlight ? [theme, window.CM.darkHighlight] : [theme];
}

/**
 * Mount a fresh CodeMirror instance on the file-edit host div render() just
 * produced, if any. render() itself already destroyed whatever instance
 * was live before calling this, so there is nothing stale to clean up here.
 */
function mountJsonEditorsIfNeeded() {
  if (!window.CM) return;
  document.querySelectorAll('.json-editor-host').forEach((host) => {
    const viewpoint = host.getAttribute('data-viewpoint');
    const props = AppState.workspace.settings.views.properties[viewpoint];
    activeJsonEditorViews[viewpoint] = new window.CM.EditorView({
      doc: JSON.stringify(props || {}, null, 2),
      extensions: [window.CM.basicSetup, window.CM.json()].concat(codeMirrorThemeExtensions()),
      parent: host
    });
  });
}

function mountFileEditorIfNeeded() {
  if (!window.CM) return;
  const host = document.getElementById('file-edit-codemirror-host');
  if (!host) return;
  const relPath = host.getAttribute('data-relpath');
  const mf = AppState.manifestFiles.find((f) => f.relPath === relPath);
  if (!mf) return;
  const hasDraft = rawYamlEditDraft && rawYamlEditDraft.relPath === relPath;
  const text = hasDraft ? rawYamlEditDraft.text : mf.rawText;
  activeFileEditorView = new window.CM.EditorView({
    doc: text,
    extensions: [window.CM.basicSetup, window.CM.yaml()].concat(codeMirrorThemeExtensions()),
    parent: host
  });
}

/**
 * Id/Reference/Name/Description/Qualifiers/Tags field-rows for `record` —
 * factored out (UX review follow-up) so both the read-only element view
 * below and the Diagram perspective's "Properties" panel render the exact
 * same fields from the exact same code.
 */
function renderElementPropertiesHtml(record, forPlateau) {
  let html = '';
  const origin = (field) => originNoteHtml(record, field, forPlateau);
  html += '<div class="field-row"><span class="field-label">Id</span><span class="field-value">' + escapeHtml(record.id) + '</span></div>';
  html += '<div class="field-row"><span class="field-label">Reference</span><span class="field-value">' + escapeHtml(record.reference) + '</span></div>';
  html += '<div class="field-row"><span class="field-label">Name</span><span class="field-value">' + (record.name !== null && record.name !== undefined ? escapeHtml(record.name) : '<span class="muted">none</span>') + origin('name') + '</span></div>';
  html += '<div class="field-row"><span class="field-label">Description</span><span class="field-value">' + (record.description !== null && record.description !== undefined ? escapeHtml(record.description) : '<span class="muted">none</span>') + origin('description') + '</span></div>';

  html += '<div class="field-row"><span class="field-label">Qualifiers</span><span class="field-value">' + renderQualifierPillsHtml(record.qualifiers) + origin('qualifiers') + '</span></div>';
  html += '<div class="field-row"><span class="field-label">Tags</span><span class="field-value">' + renderTagListHtml(record.tags) + origin('tags') + '</span></div>';
  return html;
}

/** The qualifiers of an element or of a relationship, one pill each, or "none". */
function renderQualifierPillsHtml(qualifiers) {
  return qualifiers && qualifiers.length ? qualifiers.map((q) => '<span class="pill">' + escapeHtml(q) + '</span>').join('') : '<span class="muted">none</span>';
}

/** The tags of an element or of a relationship, `key: value` each, or "none". */
function renderTagListHtml(tags) {
  const keys = tags ? yamlKeysOf(tags) : [];
  if (!keys.length) return '<span class="muted">none</span>';
  return '<ul class="tag-list">' + keys.map((k) =>
    '<li><span class="tag-key">' + escapeHtml(k) + '</span>: <span class="tag-value">' + escapeHtml(String(tags[k])) + '</span></li>'
  ).join('') + '</ul>';
}

/**
 * Rules of the Details page, the same for every row: the rows an element can have are always there, in a fixed order
 * (properties, then Parent, Children, Uses or Applications, Relationships), and say "none" when empty. A reference is
 * always the same item: a link to its element followed by the kind of that element, or, when nothing answers to it,
 * its name and a "dangling" flag. A row with one value shows it inline, a row with several is a list whose label says
 * how many.
 */

/** "none", the value of a row that has nothing to say. */
function renderNoneHtml() {
  return '<span class="muted">none</span>';
}

/** A row of the Details page. `count` is only given to a list. */
function renderFieldRowHtml(label, valueHtml, count) {
  return '<div class="field-row"><span class="field-label">' + escapeHtml(label) +
           (count ? ' <span class="field-count">' + count + '</span>' : '') +
         '</span><span class="field-value">' + valueHtml + '</span></div>';
}

/** A list of ready-made items, as the rows with several values show them. */
function renderItemListHtml(itemsHtml) {
  return '<ul class="relationship-list">' + itemsHtml.map((item) => '<li>' + item + '</li>').join('') + '</ul>';
}

/**
 * A reference as an item: a link to its element, in `layer` (the element itself, or one of the other layer's: a deployed
 * application), followed by the kind of that element; or, when nothing answers to it, its name flagged as dangling.
 */
function renderReferenceItemHtml(reference, layer, owner) {
  const target = AppState.index[layer || 'application'].get(String(reference));
  if (!target) {
    const badge = '<span class="dangling-badge">dangling</span>';
    // a relationship that points at nothing is repaired where it is declared, as from the box of the diagram: a button to its owner's edit form
    if (owner === undefined) return '<span class="relationship-dangling">' + escapeHtml(String(reference)) + badge + '</span>';
    return '<button type="button" class="relationship-link relationship-dangling" data-action="fix-dangling" data-ref="' + escapeHtml(String(owner)) + '"' +
      (layer ? ' data-layer="' + escapeHtml(layer) + '"' : '') + ' title="Edit the relationship of ' + escapeHtml(String(owner)) + ' that points at nothing">' + escapeHtml(String(reference)) + '</button>' + badge;
  }
  return renderReferenceLinkHtml(String(reference), layer) + ' <span class="element-kind-badge">' + escapeHtml(target.kind) + '</span>';
}

/**
 * The element's egress relationships as a list of items — the label (and qualifiers) of the relationship, then its
 * destination as any other reference — factored out (UX review follow-up) so every view of an element renders the same
 * list from the same code.
 */
function renderElementRelationshipsHtml(record) {
  if (!(record.relationships && record.relationships.length)) return renderNoneHtml();
  // a relationship stays in its layer: its destination is the element of the same layer as its owner
  const layer = record.layer || 'application';
  return renderItemListHtml(record.relationships.map((rel) => {
    const qualifiersText = (rel.qualifiers && rel.qualifiers.length) ? ' (' + rel.qualifiers.map((q) => escapeHtml(q)).join(', ') + ')' : '';
    return escapeHtml(rel.label) + qualifiersText + ' &rarr; ' + renderReferenceItemHtml(rel.destination, layer, record.reference);
  }));
}

/**
 * A reference as a link to its element, in `layer` (the element itself, or one of the other layer's: a deployed application).
 * `description`: what the button does, when the reference alone does not say (the accessible name and the tooltip).
 */
function renderReferenceLinkHtml(reference, layer, description) {
  return '<button type="button" class="relationship-link" data-action="goto-element" data-ref="' + escapeHtml(reference) + '" data-layer="' + escapeHtml(layer || 'application') + '"' +
           (description ? ' aria-label="' + escapeHtml('Open ' + reference + ', ' + description) + '" title="' + escapeHtml('Select ' + description) + '"' : '') + '>' +
           escapeHtml(reference) +
         '</button>';
}

/**
 * Where the element stands, as rows of links: its parent (the element its reference is nested in, which is also where a
 * manifest attached with `header.parent` lands), its children, and what it is made of or linked to by its kind: for an
 * environment the environments and nodes it uses, for a technology node the applications it hosts itself (not the
 * ones of the nodes inside it).
 */
function renderElementHierarchyHtml(record) {
  const layer = record.layer || 'application';
  const cut = record.reference.lastIndexOf('.');
  const parentReference = cut === -1 ? null : record.reference.slice(0, cut);
  const children = record.children || [];
  let html = renderFieldRowHtml('Parent', parentReference !== null && AppState.index[layer].has(parentReference)
    ? renderReferenceItemHtml(parentReference, layer)
    : renderNoneHtml());
  html += renderFieldRowHtml('Children', children.length
    ? renderItemListHtml(children.map((child) => renderReferenceItemHtml(child.reference, layer)))
    : renderNoneHtml(), children.length);
  if (Array.isArray(record.replaces) && record.replaces.length) {
    // wave 009: what this element says it replaces, each flagged when the plateau compared with does not have it or this plateau still does
    html += renderFieldRowHtml('Replaces', renderItemListHtml(record.replaces.map((entry) => {
      const flag = replacesFlagOf(record, entry);
      return '<span class="change-ref">' + escapeHtml(entry) + '</span>' + (flag ? '<span class="replaces-flag">' + escapeHtml(flag) + '</span>' : '');
    })) + originNoteHtml(record, 'replaces'), record.replaces.length);
  }
  if (record.kind === 'environment') {
    const uses = record.uses || [];
    html += renderFieldRowHtml('Uses', (uses.length
      ? renderItemListHtml(uses.map((used) => renderReferenceItemHtml(used, 'technology')))
      : renderNoneHtml()) + originNoteHtml(record, 'uses'), uses.length);
  }
  if (layer === 'technology' && record.kind !== 'environment') {
    const applications = record.applications || [];
    html += renderFieldRowHtml('Applications', (applications.length
      ? renderItemListHtml(applications.map((application) => renderReferenceItemHtml(application, 'application')))
      : renderNoneHtml()) + originNoteHtml(record, 'applications'), applications.length);
  }
  return html;
}

function renderElementViewHtml(reference) {
  const record = findElementRecord(reference);
  if (!record) return '<div class="center-placeholder">Element not found: ' + escapeHtml(reference) + '</div>';

  let html = '<div class="element-view">';

  // Header first — it's sticky (stays pinned to the top of .center-panel's
  // own scroll), so it needs to be the first thing in the scroll order too.
  html += renderElementHeaderHtml(
    renderElementTitleHtml(record),
    renderShowOnMapButtonHtml(record) +
    '<button type="button" data-action="toggle-element-edit">Edit</button>'
  );

  // One list of rows, one rule (see above); the counts are in the labels of the lists, the diagrams are the other tabs
  // of the header.
  html += '<div class="element-qualitative">';
  html += renderElementPropertiesHtml(record);
  html += renderElementHierarchyHtml(record);
  const relationships = record.relationships || [];
  html += renderFieldRowHtml('Relationships', renderElementRelationshipsHtml(record) + originNoteHtml(record, 'relationships'), relationships.length);
  html += renderOriginBlockHtml(record);
  html += '</div>'; // .element-qualitative

  html += '</div>'; // .element-view
  return html;
}

// ---- Element edition form (run-0009, task-003; TDD DEC-1/DEC-2/DEC-8) ----

/** Join a string[] for a relationship's comma-separated qualifiers text input. */
function formatCommaList(arr) {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

/** Join a {k: v} map for a relationship's comma-separated `k=v` tags text input. */
function formatCommaKvList(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return yamlKeysOf(obj).map((k) => k + '=' + obj[k]).join(', ');
}

/** Parse a comma-separated text input into a trimmed, non-empty-entries string[]. */
function parseCommaList(text) {
  return String(text === null || text === undefined ? '' : text)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/**
 * Parse a comma-separated `k=v` text input into a {k: v} map (DEC-9: a
 * malformed pair with no `=` is dropped, not rejected).
 */
function parseCommaKvList(text) {
  const tags = {};
  for (const pair of parseCommaList(text)) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (key === '') continue;
    setOwnKey(tags, key, value);
  }
  return tags;
}

/** `obj[key] = value` as an own property, even for a key like `__proto__` (a plain assignment would set the prototype, or nothing). */
function setOwnKey(obj, key, value) {
  setYamlKey(obj, key, value); // keeps the order of the keys that look like array indexes
  return obj;
}

/** A shallow copy of an object's own enumerable properties, keys like `__proto__` included. */
function copyOwnKeys(obj) {
  const copy = {};
  for (const key of yamlKeysOf(obj)) setOwnKey(copy, key, obj[key]);
  return copy;
}

/** Set (or clear) an inline-error span's text by its element id, without a full render. */
function setInlineErrorText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text || '';
}

/** Set (or clear) a relationship sub-form row's own inline-error span, without a full render. */
function setRowInlineErrorText(row, text) {
  if (!row) return;
  const el = row.querySelector('.inline-error');
  if (el) el.textContent = text || '';
}

/**
 * Auto-grow textarea (form UX review follow-up): height tracks content up to
 * AUTO_GROW_MAX_LINES, then an internal scrollbar takes over — resolves the
 * "largeur 100%, hauteur auto, max ~10 lignes" request without a fixed-size
 * textarea that either wastes space or clips long text.
 */
const AUTO_GROW_MAX_LINES = 10;

function autosizeTextarea(el) {
  const style = window.getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  const verticalExtra = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0) +
                         (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
  const maxHeight = lineHeight * AUTO_GROW_MAX_LINES + verticalExtra;
  el.style.height = 'auto';
  const contentHeight = el.scrollHeight;
  el.style.height = Math.min(contentHeight, maxHeight) + 'px';
  el.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
}

let autoGrowObserver = null;

/**
 * Re-run autosizeTextarea on every `.auto-grow-textarea` currently in the DOM
 * — called after each render(). A textarea is also re-measured whenever its
 * width changes: a textarea measured while the grid is still narrower than it
 * ends up (the first render, a panel being resized) wraps its text over many
 * lines, and would otherwise keep that inflated height forever.
 */
function autosizeAllTextareas() {
  const textareas = document.querySelectorAll('.auto-grow-textarea');
  textareas.forEach(autosizeTextarea);
  if (typeof ResizeObserver === 'undefined') return;
  if (autoGrowObserver) {
    autoGrowObserver.disconnect();
  } else {
    autoGrowObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        if (entry.target._autoGrowWidth !== width) {
          entry.target._autoGrowWidth = width;
          autosizeTextarea(entry.target);
        }
      }
    });
  }
  textareas.forEach((el) => {
    el._autoGrowWidth = Math.round(el.getBoundingClientRect().width);
    autoGrowObserver.observe(el);
  });
}

/** Delegated `input` listener (DEC — mirrors the existing click/pointerdown/dblclick delegation on #app): resizes as the user types. */
function handleAppInput(e) {
  if (e.target.matches && e.target.matches('[data-settings-current]')) return; // the list of Settings writes on `change`; choosing in it is no typed draft (run 0111, #111)
  if (e.target.matches && e.target.matches('input[name="theme-choice"]')) { // a preference of the browser, not a change of the workspace
    setThemeChoice(e.target.value);
    return;
  }
  if (e.target.matches && e.target.matches('[data-dialog-filter]')) { // the search of the Move dialog
    applyMoveFilter(e.target.value);
    return;
  }
  if (e.target.tagName === 'INPUT' && e.target.type === 'text' && e.target.closest && e.target.closest('[data-view-field], [data-view-list]')) lightSaveForTypedViewText();
  if (!draftTyped && e.target.closest && e.target.closest('.element-edition-form, .settings-view, .file-view')) {
    draftTyped = true;
    refreshSaveAllButton();
  }
  if (e.target.matches && e.target.matches('[data-dialog-new]')) { // typing a name picks "New story"
    const choice = document.querySelector('input[name="story-choice"][value="' + NEW_STORY_CHOICE + '"]');
    if (choice) choice.checked = true;
    return;
  }
  if (e.target.matches && e.target.matches('[data-story-repair]')) {
    if (e.target.value) repairStoryStep(e.target.getAttribute('data-story'), Number(e.target.getAttribute('data-step')), e.target.value);
    return;
  }
  if (e.target.matches && e.target.matches('[data-story-step-plateau]')) { // wave 015 (run 0101): where a step is told, and what it is compared with
    setStepPlateau(e.target.getAttribute('data-story'), Number(e.target.getAttribute('data-step')), e.target.getAttribute('data-story-step-plateau'), e.target.value);
    return;
  }
  const storyField = e.target.closest && e.target.closest('[data-story-field]');
  if (storyField) {
    updateStoryField(storyField);
    return;
  }
  if (e.target.getAttribute && e.target.getAttribute('data-changes-filter')) { // wave 015 (run 0103): the two filters of the list of changes
    setChangesFilter(e.target.getAttribute('data-changes-filter'), e.target.value);
    return;
  }
  if (e.target.getAttribute && e.target.getAttribute('data-band-select')) { // wave 015 (run 0097): the two lists of the band
    chooseOnBand(e.target);
    return;
  }
  if (e.target.id === 'diagram-facet-select') {
    pushDiagramHistory();
    diagramFacet = e.target.value || null;
    mapSelectionCheck = true;
    render();
    return;
  }
  if (e.target.matches && e.target.matches('.auto-grow-textarea')) {
    autosizeTextarea(e.target);
  }
  if (e.target.id === 'settings-facets-directory-template-input' || e.target.id === 'settings-views-path-input') {
    refreshFacetDirectoryPreviews();
  }
}

/**
 * Read a relationship sub-form row's four inputs and validate them
 * (DEC-9's `validateRelationshipDraft`), returning the parsed
 * `qualifiers`/`tags` alongside on success.
 */
function readRelationshipDraftFromRow(row) {
  if (!row) return { valid: false, error: 'Relationship row not found.' };
  const destinationInput = row.querySelector('.rel-destination-input');
  const labelInput = row.querySelector('.rel-label-input');
  const qualifiersInput = row.querySelector('.rel-qualifiers-input');
  const tagsInput = row.querySelector('.rel-tags-input');
  const draft = validateRelationshipDraft(
    destinationInput ? destinationInput.value : '',
    labelInput ? labelInput.value : ''
  );
  if (!draft.valid) return draft;
  // A field the user did not touch keeps the model's own value: re-splitting its text on commas would corrupt a
  // qualifier like `A, B` or a tag like `ports=80,443`. Only a field whose text differs from the one rendered
  // (`data-initial`) is parsed; `undefined` means "leave as it is".
  const edited = (input) => !!input && (!input.getAttribute || input.getAttribute('data-initial') === null || input.getAttribute('data-initial') !== input.value);
  return {
    valid: true,
    destination: draft.destination,
    label: draft.label,
    qualifiers: edited(qualifiersInput) ? parseCommaList(qualifiersInput ? qualifiersInput.value : '') : undefined,
    tags: edited(tagsInput) ? parseCommaKvList(tagsInput ? tagsInput.value : '') : undefined
  };
}

/**
 * A relationship of the model as the form's draft `d` (from `readRelationshipDraftFromRow`) leaves it: only what
 * the user changed is written, everything else — a numeric label, qualifiers with commas in them, keys the form
 * does not know — stays as it was. An empty label is written as no `label` key at all (an absent label is not the
 * label `uses`: the kernel draws a natural link without one).
 */
function applyRelationshipDraft(rel, d) {
  const out = rel && typeof rel === 'object' ? copyOwnKeys(rel) : {};
  if (String(out.destination) !== d.destination) out.destination = d.destination;
  const originalLabel = out.label === undefined || out.label === null ? '' : String(out.label).trim();
  if ((d.label === undefined ? '' : d.label) !== originalLabel) {
    if (d.label === undefined) delete out.label; else out.label = d.label;
  }
  if (d.qualifiers !== undefined) {
    if (d.qualifiers.length === 0) delete out.qualifiers; else out.qualifiers = d.qualifiers;
  }
  if (d.tags !== undefined) {
    if (Object.keys(d.tags).length === 0) delete out.tags; else out.tags = d.tags;
  }
  return out;
}

/**
 * Read and validate the whole element edit form (all-or-nothing, same idea
 * as readSettingsDraft): id, name, description and every existing
 * relationship row. Shows each failing field's own error and returns
 * `{ valid: false }`, else `{ valid: true, apply(node) }` — `apply` writes
 * every field and returns `{ renamedTo }` when the id changed (DEC-8).
 */
function readElementDraft(reference, layer) {
  const category = layerOfReference(reference, layer) || 'application';
  const idInput = document.getElementById('edit-id-input');
  const nameInput = document.getElementById('edit-name-input');
  const descriptionInput = document.getElementById('edit-description-input');
  setInlineErrorText('edit-id-error', '');
  const rows = Array.from(document.querySelectorAll('.element-edition-form .relationship-edit-row[data-index]'));
  rows.forEach((row) => setRowInlineErrorText(row, ''));

  let hasError = false;
  const idResult = validateElementIdRename(idInput ? idInput.value : '', reference, category);
  if (!idResult.valid) { setInlineErrorText('edit-id-error', idResult.error); hasError = true; }

  const relationshipDrafts = new Map();
  for (const row of rows) {
    const draft = readRelationshipDraftFromRow(row);
    if (!draft.valid) { setRowInlineErrorText(row, draft.error); hasError = true; continue; }
    relationshipDrafts.set(parseInt(row.getAttribute('data-index'), 10), draft);
  }
  if (hasError) return { valid: false };

  const name = normalizeOptionalText(nameInput ? nameInput.value : '');
  const description = normalizeOptionalText(descriptionInput ? descriptionInput.value : '');
  const current = findElementRecord(reference, category);
  return {
    valid: true,
    renamed: current && String(current.id) !== idResult.newId ? { from: reference, to: idResult.newReference } : null, // what `commitElementWithDraft` asks about before it writes (run 0113)
    apply(node) {
      const oldId = node.id;
      if (String(oldId) !== idResult.newId) node.id = idResult.newId;
      // name and description: absent when empty, and untouched (type included) when the text is the one rendered
      if (name === null) delete node.name; else if (node.name === undefined || node.name === null || String(node.name) !== name) node.name = name;
      if (description === null) delete node.description; else if (node.description === undefined || node.description === null || String(node.description) !== description) node.description = description;
      if (relationshipDrafts.size > 0 && Array.isArray(node.relationships)) {
        node.relationships = node.relationships.map((rel, i) => {
          const d = relationshipDrafts.get(i);
          return d ? applyRelationshipDraft(rel, d) : rel;
        });
      }
      return String(oldId) !== idResult.newId ? { renamedTo: { from: reference, to: idResult.newReference } } : undefined;
    }
  };
}

/**
 * Commit the whole form's pending edits plus (optionally) one structural
 * change — an add/remove of a qualifier, tag, application or relationship —
 * as a single edit, so the re-render that follows never throws away what the
 * user typed elsewhere in the form. Returns false when the form is invalid.
 */
function commitElementWithDraft(reference, structuralFn) {
  const layer = layerOfReference(reference) || undefined;
  const draft = readElementDraft(reference, layer);
  if (!draft.valid) return false;
  // wave 016 (run 0113, #116): a rename rewrites the views and the stories everywhere, and a plateau beside the one drawn may still declare the old reference. The author is told
  // first, in a dialog, which plateaus and which views and steps; the write waits for the answer, and is the same write as without the dialog.
  const impact = draft.renamed ? renameSiblingImpact(draft.renamed.from, draft.renamed.to, layerOfReference(reference) || 'application') : null;
  if (impact) {
    openAppDialog({ kind: 'rename-siblings', reference, impact, plateau: impact.plateau, onConfirm: () => { writeElementDraft(reference, layer, draft, structuralFn); } });
    return false; // "Save all changes" waits, as for the dialog of the plateaus a write changes
  }
  return writeElementDraft(reference, layer, draft, structuralFn);
}

/** The write of `commitElementWithDraft`, once the draft is read and the author has said yes to whatever was asked. Returns false when it did not write (a refusal, or a dialog is open). */
function writeElementDraft(reference, layer, draft, structuralFn) {
  // a refused write, or an error, redraws the form from the model (`guardedLayerWrite` first, then the sentence in the top bar): the fields as typed are kept before it and put back by that redraw (wave 018, run 0130, #129)
  const typedForm = keepElementForm();
  try {
    // a rename rewrites the references to the element, in the model and in the UI state, inside the commit (DEC-8)
    const written = commitElementEdit(reference, (node) => {
      const renamed = draft.apply(node);
      if (structuralFn) structuralFn(node);
      return renamed;
    }, layer);
    if (written && written.pending) return false; // wave 014 (run 0082): the author is asked first (the plateaus it changes); nothing is applied yet, and "Save all changes" waits
  } catch (e) {
    saveStatus = { state: 'error', failedFile: reference, message: e && e.message ? e.message : String(e) };
    keptElementForm = typedForm; // `render()` puts it back and drops it (no dialog is open): view state, no `modelsChanged()`
    render();
    return false;
  }
  return true;
}

/** One relationship sub-form row — used both for an existing relationship and the blank "add new" one. */
function renderRelationshipEditRowHtml(reference, rel, index) {
  const refAttr = escapeHtml(reference);
  const isNew = index === null;
  const destination = rel ? rel.destination : '';
  // the label as written in the manifest, not the display fallback: an unlabeled relationship stays unlabeled when saved
  const label = rel && rel.rawLabel !== undefined && rel.rawLabel !== null ? String(rel.rawLabel) : '';
  const labelPlaceholder = 'label' + (AppState.workspace ? ' (default: ' + AppState.workspace.settings.relationships.defaultSyntheticLabel + ')' : '');
  const qualifiersText = rel ? formatCommaList(rel.qualifiers) : '';
  const tagsText = rel ? formatCommaKvList(rel.tags) : '';
  // data-initial: the text as rendered, so that a field the user did not touch is not parsed (and corrupted) on save
  let html = '<div class="relationship-edit-row' + (isNew ? ' relationship-edit-row-new' : '') + '"' +
               (isNew ? '' : ' data-index="' + index + '"') + '>';
  html += '<input type="text" class="rel-destination-input" placeholder="destination" aria-label="Relationship destination" list="archicode-all-references" value="' + escapeHtml(destination) + '">';
  html += '<input type="text" class="rel-label-input" placeholder="' + escapeHtml(labelPlaceholder) + '" aria-label="Relationship label" value="' + escapeHtml(label) + '">';
  html += '<input type="text" class="rel-qualifiers-input" placeholder="qualifiers (comma-separated)" aria-label="Relationship qualifiers, comma-separated"' + (isNew ? '' : ' data-initial="' + escapeHtml(qualifiersText) + '"') + ' value="' + escapeHtml(qualifiersText) + '">';
  html += '<input type="text" class="rel-tags-input" placeholder="tags (k=v, comma-separated)" aria-label="Relationship tags, comma-separated key=value pairs"' + (isNew ? '' : ' data-initial="' + escapeHtml(tagsText) + '"') + ' value="' + escapeHtml(tagsText) + '">';
  if (isNew) {
    html += '<button type="button" data-action="add-relationship" data-ref="' + refAttr + '">Add</button>';
  } else {
    html += '<button type="button" data-action="remove-relationship" data-ref="' + refAttr + '" data-index="' + index + '">Remove</button>';
  }
  html += '<span class="inline-error"></span>';
  html += '</div>';
  return html;
}

/**
 * The edit-mode sibling of `renderElementViewHtml` (DEC-1/DEC-2): one
 * shared template covering every kind's id/name/description/qualifiers/
 * tags/relationships, plus a `node`-only `applications` block (DEC-2a).
 * "Save all changes" commits the whole form (id/name/description and every
 * relationship row — readElementDraft). Each add/remove control commits
 * immediately (DEC-5) but applies that draft first, so nothing typed
 * elsewhere in the form is lost to the re-render.
 */
function renderElementEditionFormHtml(reference) {
  const record = findElementRecord(reference);
  if (!record) return '<div class="center-placeholder">Element not found: ' + escapeHtml(reference) + '</div>';

  const refAttr = escapeHtml(reference);
  let html = '<div class="element-edition-form">';

  html += renderElementHeaderHtml(
    '<h2>' + escapeHtml(record.name || record.id) + '</h2><span class="element-kind-badge">' + escapeHtml(record.kind) + '</span>',
    // Same order as every header: destructive first, primary last.
    // TDD-0010 DEC-4: Delete is always present — even a leaf can be the
    // destination of a relationship elsewhere.
    '<button type="button" class="btn-danger" data-action="request-delete-element" data-ref="' + refAttr + '">Delete</button>' +
    (moveIsPossible(reference, record.layer)
      ? '<button type="button" data-action="open-move-dialog" data-ref="' + refAttr + '" title="Put this element, and everything inside it, under another parent. The references to it follow.">Move</button>'
      : '') +
    (childKindOptionsFor(record).length > 0
      ? '<button type="button" data-action="open-create-child-form" data-ref="' + refAttr + '">Add child</button>'
      : '') +
    '<button type="button" data-action="toggle-element-edit">Back to view</button>'
  );

  // TDD-0010 DEC-4: a pending delete confirmation for this exact element
  // overlays the already-rendering edition view below — it never changes
  // AppState.selection (mirrors TDD-0009's rawYamlEditDraft pattern).
  if (pendingDeleteConfirmation && pendingDeleteConfirmation.reference === reference) {
    const affected = pendingDeleteConfirmation.affected;
    const deletedReferences = pendingDeleteConfirmation.deletedReferences || [];
    const deletedFiles = pendingDeleteConfirmation.files || [];
    html += '<div class="edition-section delete-confirmation">';
    html += '<h3>Confirm delete</h3>';
    if (pendingDeleteConfirmation.removal) {
      const removal = pendingDeleteConfirmation.removal;
      html += '<p class="delete-removal">This adds a <code>REMOVE</code> patch to the plateau <code>' + escapeHtml(removal.plateau) + '</code>. The element stays in <code>' + escapeHtml(removal.declaredIn) + '</code> and in the plateaus that do not remove it; here the kernel takes it out, with what is inside it and the links towards it.</p>';
    }
    // the whole subtree goes: what is nested in the element, and the manifests attached below it
    if (deletedReferences.length > 1) {
      html += '<p>This also deletes ' + (deletedReferences.length - 1) + ' element' + (deletedReferences.length === 2 ? '' : 's') + ' inside it:</p>' +
              '<ul class="relationship-list">' + deletedReferences.filter((ref) => ref !== reference).map((ref) => '<li>' + escapeHtml(ref) + '</li>').join('') + '</ul>';
    }
    if (deletedFiles.length > 0) {
      html += '<p>' + (deletedFiles.length === 1 ? 'This manifest file is removed' : 'These ' + deletedFiles.length + ' manifest files are removed') + ' when you save:</p>' +
              '<ul class="relationship-list">' + deletedFiles.map((p) => '<li>' + escapeHtml(p) + '</li>').join('') + '</ul>';
    }
    if (affected.length === 0) {
      html += '<p class="muted">No other relationship is affected.</p>';
    } else {
      html += '<p>These links elsewhere point at what is deleted, and are removed with it:</p><ul class="relationship-list">';
      for (const a of affected) {
        html += '<li>' + escapeHtml(a.ownerSourceFile) + ' (' + escapeHtml(a.ownerReference) + '): ' + escapeHtml(a.label) + ' &rarr; ' + escapeHtml(a.destination) + '</li>';
      }
      html += '</ul>';
    }
    html += '<button type="button" data-action="cancel-delete-element">Cancel</button> ' +
            '<button type="button" class="btn-danger-solid" data-action="confirm-delete-element">Confirm delete</button>';
    html += '</div>';
  }

  // id / name / description — committed together with the rest of the form by "Save all changes" (see readElementDraft).
  html += '<div class="edition-section">';
  html += '<div class="field-row"><label class="field-label" for="edit-id-input">Id</label><span class="field-value">' +
            '<input type="text" id="edit-id-input" value="' + escapeHtml(record.id) + '">' +
            '<span class="inline-error" id="edit-id-error"></span>' +
          '</span></div>';
  html += '<div class="field-row"><label class="field-label" for="edit-name-input">Name</label><span class="field-value">' +
            '<input type="text" id="edit-name-input" value="' + escapeHtml(record.name !== null && record.name !== undefined ? record.name : '') + '">' +
          '</span></div>';
  html += '<div class="field-row"><label class="field-label" for="edit-description-input">Description</label><span class="field-value">' +
            '<textarea id="edit-description-input" class="auto-grow-textarea">' + escapeHtml(record.description !== null && record.description !== undefined ? record.description : '') + '</textarea>' +
          '</span></div>';
  html += '</div>';

  // qualifiers
  html += '<div class="edition-section"><h3>Qualifiers</h3>';
  if (record.qualifiers && record.qualifiers.length) {
    html += record.qualifiers.map((q, i) =>
      '<span class="pill">' + escapeHtml(q) +
        ' <button type="button" class="pill-remove" data-action="remove-qualifier" data-ref="' + refAttr + '" data-index="' + i + '">&times;</button>' +
      '</span>'
    ).join('');
  }
  html += '<div class="edition-add-row">' +
            '<input type="text" id="add-qualifier-input" placeholder="new qualifier" aria-label="New qualifier">' +
            '<button type="button" data-action="add-qualifier" data-ref="' + refAttr + '">Add</button>' +
            '<span class="inline-error" id="add-qualifier-error"></span>' +
          '</div>';
  html += '</div>';

  // tags
  html += '<div class="edition-section"><h3>Tags</h3>';
  const tagKeys = record.tags ? yamlKeysOf(record.tags) : [];
  if (tagKeys.length) {
    html += '<ul class="tag-list">' + tagKeys.map((k) =>
      '<li><span class="tag-key">' + escapeHtml(k) + '</span>: <span class="tag-value">' + escapeHtml(String(record.tags[k])) + '</span> ' +
        '<button type="button" class="pill-remove" data-action="remove-tag" data-ref="' + refAttr + '" data-key="' + escapeHtml(k) + '">&times;</button></li>'
    ).join('') + '</ul>';
  }
  html += '<div class="edition-add-row">' +
            '<input type="text" id="add-tag-key-input" placeholder="key" aria-label="New tag key">' +
            '<input type="text" id="add-tag-value-input" placeholder="value" aria-label="New tag value">' +
            '<button type="button" data-action="add-tag" data-ref="' + refAttr + '">Add</button>' +
            '<span class="inline-error" id="add-tag-error"></span>' +
          '</div>';
  html += '</div>';

  // relationships
  html += '<div class="edition-section"><h3>Relationships</h3>';
  if (record.relationships && record.relationships.length) {
    for (const rel of record.relationships) {
      html += renderRelationshipEditRowHtml(reference, rel, rel.fileIndex); // the place in the file, not in the list drawn: an item with no value is not in the record (#105)
    }
  }
  html += renderRelationshipEditRowHtml(reference, null, null);
  html += '</div>';

  // replaces (wave 009): the elements of the other plateau this one is the new place of
  if (replacesSectionShown(record)) html += renderReplacesEditionHtml(record, refAttr);

  // applications (node only — DEC-2a)
  if (record.kind === 'node') {
    html += '<div class="edition-section"><h3>Applications</h3>';
    if (record.applications && record.applications.length) {
      html += record.applications.map((a, i) =>
        '<span class="pill">' + escapeHtml(a) +
          ' <button type="button" class="pill-remove" data-action="remove-application" data-ref="' + refAttr + '" data-index="' + i + '">&times;</button>' +
        '</span>'
      ).join('');
    }
    html += '<div class="edition-add-row">' +
              '<input type="text" id="add-application-input" placeholder="new application" aria-label="New application reference" list="archicode-application-references">' +
              '<button type="button" data-action="add-application" data-ref="' + refAttr + '">Add</button>' +
              '<span class="inline-error" id="add-application-error"></span>' +
            '</div>';
    html += '</div>';
  }

  // uses (environment only): where the dependencies of the applications deployed in the environment are looked for
  if (record.kind === 'environment') {
    html += '<div class="edition-section"><h3>Uses</h3>';
    if (record.uses && record.uses.length) {
      html += record.uses.map((u, i) =>
        '<span class="pill">' + escapeHtml(u) +
          ' <button type="button" class="pill-remove" data-action="remove-use" data-ref="' + refAttr + '" data-index="' + i + '">&times;</button>' +
        '</span>'
      ).join('');
    }
    html += '<div class="edition-add-row">' +
              '<input type="text" id="add-use-input" placeholder="environment or node used" aria-label="Environment or node used" list="archicode-technology-references">' +
              '<button type="button" data-action="add-use" data-ref="' + refAttr + '">Add</button>' +
              '<span class="inline-error" id="add-use-error"></span>' +
            '</div>';
    html += '</div>';
  }

  html += '</div>'; // .element-edition-form
  return html;
}

// ---- `replaces` by hand (wave 009) ----

/** The Replaces section is offered when there is a plateau to replace elements of (the workspace writes plateaus), or the element already says something: a workspace without plateaus has a form as it always had. */
function replacesSectionShown(record) {
  return !!(AppState.plateauTree && AppState.plateauTree.layered) || (Array.isArray(record.replaces) && record.replaces.length > 0);
}

/**
 * What the plateau compared with thinks of a reference written in `replaces`, for the element `record`: '' when it is an element of that plateau, else the reason it
 * will be ignored or is not checked. An unknown reference is allowed (the author may have compared with another baseline), but it is flagged, as the kernel warns about it.
 */
function replacesFlagOf(record, reference) {
  const layer = record.layer || 'application';
  if (AppState.index[layer].has(String(reference))) return 'still in this plateau: ignored';
  if (!AppState.baseline || layerCompareIsFuture()) return ''; // with the future the plateau compared with is the one that comes after: it names no element this one replaces
  return AppState.baseline.index[layer].has(String(reference)) ? '' : 'not in “' + plateauTitle(AppState.baseline.plateau) + '”';
}

/** The Replaces section of the edit form: the list, each with its flag and a remove button, and a field to add one. */
function renderReplacesEditionHtml(record, refAttr) {
  const replaces = Array.isArray(record.replaces) ? record.replaces : [];
  let html = '<div class="edition-section" data-section="replaces"><h3>Replaces</h3>' +
    '<p class="muted">The elements of the plateau this one is compared with that this element is the new place of (moved, renamed, split or merged). Written by you, never guessed.</p>';
  html += replaces.map((entry, i) => {
    const flag = replacesFlagOf(record, entry);
    return '<span class="pill">' + escapeHtml(entry) + (flag ? '<span class="replaces-flag">' + escapeHtml(flag) + '</span>' : '') +
      ' <button type="button" class="pill-remove" data-action="remove-replaces" data-ref="' + refAttr + '" data-index="' + i + '">&times;</button></span>';
  }).join('');
  html += '<div class="edition-add-row">' +
    '<input type="text" id="add-replaces-input" placeholder="reference of the element it replaces" aria-label="Reference of the element this one replaces"' + (AppState.baseline ? ' list="archicode-baseline-references"' : '') + '>' +
    '<button type="button" data-action="add-replaces" data-ref="' + refAttr + '">Add</button>' +
    '<span class="inline-error" id="add-replaces-error"></span></div></div>';
  return html;
}

/** A reference to add to `replaces` of `record`: not empty, not the element itself, not already listed. Unknown to the other plateau is allowed (it is flagged afterwards). */
function validateNewReplaces(record, value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed === '') return { valid: false, error: 'Value is required.' };
  if (/\s/.test(trimmed)) return { valid: false, error: 'A reference has no spaces.' };
  if (trimmed === record.reference) return { valid: false, error: 'An element cannot replace itself.' };
  if ((record.replaces || []).some((entry) => String(entry) === trimmed)) return { valid: false, error: '“' + trimmed + '” is already listed.' };
  return { valid: true, value: trimmed };
}

/**
 * The create form (TDD-0010 DEC-1/DEC-2) — one shared template for both
 * `createMode`s. `sel` is `AppState.selection` itself (`{kind:'create',
 * createMode, category, parentReference}`); the kind `<select>`'s own
 * options come from `childKindOptionsFor` (child mode) or the fixed
 * per-category `TOP_LEVEL_KIND_OPTIONS` list (top-level mode). The
 * "attach under" input only appears in top-level mode (FR-4).
 */
function renderCreateElementFormHtml(sel) {
  let kindOptions;
  if (sel.createMode === 'child') {
    const parentRecord = findElementRecord(sel.parentReference);
    kindOptions = parentRecord ? childKindOptionsFor(parentRecord) : [];
  } else {
    kindOptions = TOP_LEVEL_KIND_OPTIONS[sel.category] || [];
  }

  let html = '<div class="create-element-form">';
  html += '<h2>' + (sel.createMode === 'child' ? 'Add child element' : 'Add top-level element') + '</h2>';
  if (sel.createMode === 'child') {
    html += '<div class="field-row"><span class="field-label">Parent</span><span class="field-value">' + escapeHtml(sel.parentReference) + '</span></div>';
  }
  html += '<div class="field-row"><label class="field-label" for="create-kind-select">Kind</label><span class="field-value">' +
            '<select id="create-kind-select">' +
              kindOptions.map((k) => '<option value="' + escapeHtml(k) + '">' + escapeHtml(k) + '</option>').join('') +
            '</select>' +
          '</span></div>';
  html += '<div class="field-row"><label class="field-label" for="create-id-input">Id</label><span class="field-value">' +
            '<input type="text" id="create-id-input">' +
            '<span class="inline-error" id="create-id-error"></span>' +
          '</span></div>';
  html += '<div class="field-row"><label class="field-label" for="create-name-input">Name</label><span class="field-value">' +
            '<input type="text" id="create-name-input">' +
          '</span></div>';
  html += '<div class="field-row"><label class="field-label" for="create-description-input">Description</label><span class="field-value">' +
            '<textarea id="create-description-input" class="auto-grow-textarea"></textarea>' +
          '</span></div>';
  if (sel.createMode === 'top-level') {
    html += '<div class="field-row"><label class="field-label" for="create-attach-under-input">Attach under</label><span class="field-value">' +
              '<input type="text" id="create-attach-under-input" placeholder="(optional) existing element reference" list="archicode-all-references">' +
              '<span class="inline-error" id="create-attach-under-error"></span>' +
            '</span></div>';
  }
  html += '<div class="field-row"><span class="field-label"></span><span class="field-value">' +
            '<button type="button" data-action="' + (sel.createMode === 'child' ? 'submit-create-child' : 'submit-create-top-level') + '">Create</button> ' +
            '<button type="button" data-action="cancel-create">Cancel</button>' +
            '<span class="inline-error" id="create-form-error"></span>' +
          '</span></div>';
  html += '</div>';
  return html;
}

/**
 * `<datalist>`s backing the reference-typing inputs above (UX review
 * follow-up): one over every known reference (application + technology),
 * used by "Attach under" and a relationship's "destination"; one over
 * application references only, used by a node's "applications" field,
 * since that field only ever points at application elements.
 */
function renderReferenceDatalistsHtml() {
  const appRefs = Array.from(AppState.index.application.keys());
  const techRefs = Array.from(AppState.index.technology.keys());
  const optionsHtml = (refs) => refs.map((r) => '<option value="' + escapeHtml(r) + '">').join('');
  // wave 009: what `replaces` can name is in the plateau compared with (only offered while one is read; an unknown reference can be typed all the same)
  const baseline = AppState.baseline ? Array.from(AppState.baseline.index.application.keys()).concat(Array.from(AppState.baseline.index.technology.keys())) : null;
  return (
    '<datalist id="archicode-all-references">' + optionsHtml(appRefs.concat(techRefs)) + '</datalist>' +
    '<datalist id="archicode-application-references">' + optionsHtml(appRefs) + '</datalist>' +
    '<datalist id="archicode-technology-references">' + optionsHtml(techRefs) + '</datalist>' +
    (baseline ? '<datalist id="archicode-baseline-references">' + optionsHtml(baseline) + '</datalist>' : '')
  );
}

/** The Elements perspective's center — element view/edit or the create form; everything else (notably a 'file' selection, which belongs to the Files perspective) falls back to the same placeholder as "nothing selected". */
function renderCenterPanelHtml() {
  const sel = elementSelection();
  if (sel.kind === 'create') return renderCreateElementFormHtml(sel);
  if (sel.kind === 'element') {
    // an element is edited on its Details: Back to view must not land on a diagram the user left long ago
    if (sel.mode === 'edit') { elementTab = 'details'; return renderElementEditionFormHtml(sel.key); }
    return diagramTabShown() ? renderElementDiagramHtml(findElementRecord(sel.key)) : renderElementViewHtml(sel.key);
  }
  return '<div class="center-placeholder">Select an item on the left, or use "+ Add" above the Applications/Environments tree to create your first element.</div>';
}

// ---- Shell assembly + delegated event handling ----

/**
 * One resize handle, delegated-`pointerdown`-driven (see
 * handleAppPointerDown) — markup only mirrors the archi-edtior.html
 * reference's data-resize/data-axis/data-sign contract.
 */
function renderResizeHandleHtml(panelId, axis, sign) {
  const cursorClass = axis === 'x' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize';
  return '<div data-resize="' + panelId + '" data-axis="' + axis + '" data-sign="' + sign + '" class="' + cursorClass + ' touch-none"></div>';
}

/**
 * The element the inspection panel shows: the selected one, in the layer the selection carries (a reference that exists
 * in both layers is two elements), unless it is being edited or no longer exists. Null: no panel.
 */
function inspectionRecordFor(sel) {
  if (!sel || sel.kind !== 'element' || sel.mode === 'edit') return null;
  return findElementRecord(sel.key, sel.layer) || null;
}

/**
 * The right region of a perspective that shows a diagram: the data of the selected element, next to the diagram, or null
 * (nothing selected, maximized) so that nothing is rendered. `onMap`: the Map, where the panel can be closed (nothing else
 * deselects an element there) and says when the element is not drawn.
 */
function renderInspectionHtml(onMap) {
  if (diagramMaximized) return null;
  // run 0040: with a comparison on, the panel also holds the list of the changes (a tab beside the selection, alone when nothing is selected)
  return withChangesPanel(inspectionPanelHtml(AppState.selection, onMap ? 'map' : 'elements'));
}

/** The removed element the panel is to show: the one picked on this page, or the page-of-a-view selection that names one; null when none, or when it is no longer removed. */
function removedInspectionOf(sel, mode) {
  let picked = null;
  if (sel && sel.kind === 'baseline-element') picked = { reference: sel.key, layer: sel.layer };
  else if (mode !== 'library' && removedPick && removedPick.selection === JSON.stringify(AppState.selection)) picked = removedPick;
  if (!picked) return null;
  const state = comparisonState();
  return state && state.records && state.records.has(picked.layer + '|' + picked.reference) && AppState.baseline && AppState.baseline.index[picked.layer].has(picked.reference) ? picked : null;
}

/** The panel of an element only the baseline has: what it was, read-only, and where it was declared. Its relationships are told, not linked: they lead to the other plateau. */
function renderRemovedInspectionHtml(picked, mode) {
  const record = AppState.baseline.index[picked.layer].get(picked.reference);
  const other = AppState.baseline.plateau;
  const comparison = comparisonState();
  const unionElement = comparison && comparison.records ? comparison.records.get(picked.layer + '|' + picked.reference) : null;
  const onlyChange = unionElement && CHANGE_STATES.includes(unionElement.change) ? unionElement.change : 'removed';
  const relationships = record.relationships.map((rel) => '<li>' + escapeHtml(rel.destination) + (rel.rawLabel ? ' : ' + escapeHtml(rel.rawLabel) : '') +
    (rel.qualifiers && rel.qualifiers.length ? ' <span class="muted">[' + escapeHtml(rel.qualifiers.join(', ')) + ']</span>' : '') + '</li>').join('');
  return '<div class="inspection inspection-removed" data-inspection-ref="' + escapeHtml(record.reference) + '" data-inspection-layer="' + escapeHtml(picked.layer) + '">' +
    '<div class="inspection-head"><h3>Selected element</h3><button type="button" class="inspection-close" data-action="close-removed" aria-label="Close the panel" title="Close the panel">&times;</button></div>' +
    '<div class="inspection-name"><span>' + escapeHtml(record.name || record.id) + '</span><span class="stereotype-badge" style="' + escapeHtml(styleVarsText(stereotypeBadgeVarsOf(onlyChange))) + '">' + escapeHtml(CHANGE_WORDS[onlyChange].word) + '</span></div>' +
    (layerCompareIsFuture()
      ? '<p class="inspection-note">' + escapeHtml(CHANGE_WORDS[onlyChange].word.charAt(0).toUpperCase() + CHANGE_WORDS[onlyChange].word.slice(1)) + ': this element is only in “' + escapeHtml(plateauTitle(other)) + '”, the plateau that overrides this one. What you read is that plateau’s; it is not part of the plateau drawn, and nothing here is edited or saved.</p>'
      : '<p class="inspection-note">Removed: this element is only in “' + escapeHtml(plateauTitle(other)) + '”, the plateau this one is compared with. What you read is that plateau’s; it is not part of the plateau drawn, and nothing here is edited or saved.</p>') +
    renderWhatChangedHtml(picked.layer, record.reference, true) +
    renderFieldRowHtml('Kind', escapeHtml(record.kind)) +
    renderFieldRowHtml('Layer', escapeHtml(picked.layer)) +
    renderElementPropertiesHtml(record, other.id) +
    renderFieldRowHtml('Source file', escapeHtml(record.sourceFile)) +
    renderOriginBlockHtml(record, other.id) +
    renderFieldRowHtml('Relationships', relationships ? '<ul class="removed-relationships">' + relationships + '</ul>' : renderNoneHtml(), record.relationships.length) +
    '</div>';
}

/**
 * The panel of a selection, whoever holds it. `mode` is where it stands: 'map' (it can be closed, and says when the element is
 * not drawn), 'elements' (nothing deselects there: it has no close button), or 'library' (the page of a view: it can be closed, and
 * leads to the element in Elements). The Map and Elements pass their own selection (`AppState.selection`), the page of a view the one of the page.
 */
function inspectionPanelHtml(sel, mode) {
  const removed = removedInspectionOf(sel, mode);
  if (removed) return renderRemovedInspectionHtml(removed, mode);
  if (sel.kind === 'link') return renderLinkInspectionHtml(sel);
  const onMap = mode === 'map';
  const record = inspectionRecordFor(sel);
  if (!record) return null;
  const layer = record.layer || 'application';
  let html = '<div class="inspection" data-inspection-ref="' + escapeHtml(record.reference) + '" data-inspection-layer="' + escapeHtml(layer) + '">';
  html += '<div class="inspection-head"><h3>Selected element</h3>' + (onMap
    ? '<button type="button" class="inspection-close" data-action="close-inspection" aria-label="Close the panel" title="Deselect the element and give the map its whole width back">&times;</button>'
    : mode === 'library'
      ? '<button type="button" class="inspection-close" data-action="close-inspection" aria-label="Close the panel" title="Deselect the element (Esc)">&times;</button>'
      : '') + '</div>';
  html += '<div class="inspection-name"><span>' + escapeHtml(record.name || record.id) + '</span>' + stereotypeBadgesHtml(stereotypesOfRecord(record)) + '</div>';
  if (onMap) {
    // the Map of the technology layer draws the applications deployed on its nodes too (issue #107): one of them is on the map, or not, as an element of the layer is
    const deployedApplication = layer === 'application' && mapLayer() === 'technology' && applicationIsDeployed(record.reference);
    html += layer !== mapLayer() && !deployedApplication
      ? '<p class="inspection-note">' + (mapLayer() === 'technology' ? 'This map draws the technology layer, and the applications deployed on its nodes.' : 'The map draws applications only.') + '</p>'
      : '<p class="inspection-note" id="inspection-offmap" hidden>Not on the map right now (a pin, a hidden element or a folded box leaves it out).</p>';
  }
  html += renderWhatChangedHtml(layer, record.reference, false); // a comparison: what differs from the other plateau, first: a long description must not push it out of sight
  html += renderStateWordHintsHtml(layer, record.reference); // a hand-written state word that the comparison does not give the element (issue 36)
  html += renderFieldRowHtml('Kind', escapeHtml(record.kind));
  html += renderFieldRowHtml('Layer', escapeHtml(layer));
  html += renderElementPropertiesHtml(record);
  html += renderFieldRowHtml('Source file', record.sourceFile ? escapeHtml(record.sourceFile) : renderNoneHtml());
  html += renderOriginBlockHtml(record);
  if (mode === 'library') {
    html += '<button type="button" class="inspection-open with-icon" data-action="library-open-element" data-ref="' + escapeHtml(record.reference) + '" data-layer="' + escapeHtml(layer) + '"' +
      ' title="Leave this page for the element: select it in Elements, on the tab you left there">' + controlIconHtml(CONTROL_ICON_PATHS.elements) + '<span>Show in Elements</span></button>';
  }
  return html + '</div>';
}

