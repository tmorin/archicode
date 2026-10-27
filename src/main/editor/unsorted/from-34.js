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

