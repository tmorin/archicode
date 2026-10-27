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

// =====================================================================
// The Changes panel and "What changed" (run 0040). They read `comparisonState()` (the kernel's table `changes`, its `counts`, the union `records`)
// and nothing else: while nothing is compared none of this is on the page.
// =====================================================================

/** The kernel's natures (run 0036) in words. `description` alone is a change of wording. */
const NATURE_WORDS = {
  kind: 'kind', name: 'name', description: 'description', qualifiers: 'qualifiers', tags: 'tags', deployment: 'deployment',
  'relationships-added': 'relationships added', 'relationships-removed': 'relationships removed', 'relationships-changed': 'relationships changed',
  label: 'label'
};

/** What changed in a thing, in words: "name, relationships added"; "description (wording only)" when the description is all that changed. */
function natureWordsText(natures) {
  const list = Array.isArray(natures) ? natures : [];
  if (list.length === 1 && list[0] === 'description') return 'description (wording only)';
  return list.map((nature) => NATURE_WORDS[nature] || nature).join(', ');
}

/** The labels of the properties a row of the table can say before and after, in the order they are told. */
const CHANGE_PROPERTY_LABELS = [['kind', 'Kind'], ['name', 'Name'], ['description', 'Description'], ['qualifiers', 'Qualifiers'], ['tags', 'Tags'], ['applications', 'Applications deployed'], ['uses', 'Uses'], ['label', 'Label']];

/**
 * A state as a chip: its glyph and its word, always both (never colour alone), in the look the workspace gave the state (the same pill as on the boxes).
 * `count` (optional) goes between them: "+ 2 new".
 */
function changeChipHtml(state, count) {
  return '<span class="stereotype-badge change-chip" data-state="' + state + '" style="' + escapeHtml(styleVarsText(stereotypeBadgeVarsOf(state))) + '">' +
    '<span class="change-glyph" aria-hidden="true">' + escapeHtml(CHANGE_GLYPHS[state]) + '</span>' + (count === undefined ? '' : ' <span class="change-count">' + count + '</span>') + ' ' + escapeHtml(CHANGE_WORDS[state].word) + '</span>';
}

/** One value of a table row (a text, a list, a map of tags) as the panel shows it. */
function changeValueHtml(value) {
  if (Array.isArray(value)) return value.length ? value.map((entry) => '<span class="pill">' + escapeHtml(entry) + '</span>').join('') : '<span class="muted">none</span>';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return keys.length ? keys.map((key) => '<span class="pill">' + escapeHtml(key + ': ' + value[key]) + '</span>').join('') : '<span class="muted">none</span>';
  }
  return value === undefined || value === null || value === '' ? '<span class="muted">none</span>' : '<span class="change-text">' + escapeHtml(value) + '</span>';
}

/** The properties that differ, before and after, each on two lines that say which is which (a word and a sign, so that neither relies on colour). `beforeOnly`: the Before line alone (an element that is gone has no After). */
function renderChangeDiffsHtml(before, after, beforeOnly) {
  const was = before && typeof before === 'object' ? before : {};
  const now = after && typeof after === 'object' ? after : {};
  return CHANGE_PROPERTY_LABELS.filter(([key]) => key in was || key in now).map(([key, label]) =>
    '<div class="change-diff" data-property="' + key + '"><div class="change-diff-label">' + escapeHtml(label) + '</div>' +
    '<div class="change-before"><span class="change-side"><span aria-hidden="true">−</span> Before</span>' + changeValueHtml(was[key]) + '</div>' +
    (beforeOnly ? '' : '<div class="change-after"><span class="change-side"><span aria-hidden="true">+</span> After</span>' + changeValueHtml(now[key]) + '</div>') + '</div>').join('');
}

/** The row of the table for a relationship (declared by `from`, to `destination`, with this label), or null. A pair whose label changed is one row, with the label of the plateau drawn. */
function relationshipRowOf(state, layer, from, destination, label) {
  const wanted = label === undefined || label === null ? '' : String(label);
  return (state.changes || []).find((row) => row.thing === 'relationship' && row.layer === layer && row.reference === from && row.destination === destination && (row.label || '') === wanted) || null;
}

/** The text of a relationship of the table: who to, and what it says ("no label" when nothing). */
function relationshipTextHtml(rel, withSource) {
  const label = rel.label === undefined || rel.label === null || String(rel.label).trim() === '' ? '<span class="muted">no label</span>' : '“' + escapeHtml(rel.label) + '”';
  return '<span class="change-rel-path">' + (withSource ? escapeHtml(rel.from) + ' ' : '') + '&rarr; ' + escapeHtml(rel.destination) + '</span> <span class="change-rel-label">' + label + '</span>';
}

/** One relationship that is new, changed or removed, as a line with its state; a changed one tells what it was and what it is. */
function renderChangedRelationshipHtml(state, layer, rel, withSource) {
  const row = rel.change === 'changed' ? relationshipRowOf(state, layer, rel.from, rel.destination, rel.label) : null;
  return '<li class="change-rel" data-state="' + rel.change + '">' + changeChipHtml(rel.change) + ' ' + relationshipTextHtml(rel, withSource) +
    (row ? '<div class="change-natures">Changed: ' + escapeHtml(natureWordsText(row.natures)) + '</div>' + renderChangeDiffsHtml(row.before, row.after) : '') + '</li>';
}

/** The relationships a union element declares that are new, changed or removed (a new or removed element declares all of its own as such). */
function changedRelationshipsOf(state, layer, reference) {
  const element = (state.layers[layer] || []).find((candidate) => candidate.reference === reference);
  const order = { new: 0, changed: 1, removed: 2 };
  return ((element && element.relationships) || []).map((rel, i) => [rel, i]).filter(([rel]) => RELATIONSHIP_STATES.includes(rel.change))
    .sort((a, b) => order[a[0].change] - order[b[0].change] || a[1] - b[1]).map(([rel]) => rel);
}

/** An element of the other plateau that the element replaces: its name and its reference, and whether the other plateau has it (an unknown reference is told, not hidden). */
function replacedElementHtml(reference, layer) {
  const baseIndex = AppState.baseline ? baseSideIndex() : null;
  const record = baseIndex && baseIndex[layer] ? baseIndex[layer].get(String(reference)) : null;
  return '<span class="change-name">' + escapeHtml(record && record.name ? record.name : String(reference).split('.').pop()) + '</span> <span class="change-ref">' + escapeHtml(reference) + '</span>' +
    (record ? '' : '<span class="replaces-flag">not in the other plateau</span>');
}

/** An element of the plateau drawn that replaces the one being read (`replaced_by`): its name and its reference. */
function replacingElementHtml(reference, layer) {
  const targetIndex = AppState.baseline ? targetSideIndex() : AppState.index;
  const record = targetIndex[layer] ? targetIndex[layer].get(String(reference)) : null;
  return '<span class="change-name">' + escapeHtml(record && record.name ? record.name : String(reference).split('.').pop()) + '</span> <span class="change-ref">' + escapeHtml(reference) + '</span>';
}

/**
 * The "What changed" block of the inspection of an element (a changed, new or removed one; '' for any other, and with no comparison): for a
 * changed element the properties that differ with before and after, then its relationships added, removed and changed; for a new or a removed one,
 * that the whole element is, and the relationships it declares. `removedPanel`: the read-only panel of a removed element, which says it already.
 */
function renderWhatChangedHtml(layer, reference, removedPanel) {
  const state = comparisonState();
  if (!state || !state.records) return '';
  const element = state.records.get(layer + '|' + reference);
  if (!element || !CHANGE_STATES.includes(element.change)) return '';
  const other = plateauTitle(state.base);
  let html = '<section class="what-changed" aria-label="What changed" data-state="' + element.change + '"><h4 class="inspection-subhead">What changed ' + changeChipHtml(element.change) + '</h4>';
  if (IDENTITY_STATES.includes(element.change)) {
    // wave 009: the element says which elements of the other plateau it is the new place of; its own changes, if any, are told next to that
    const replaced = (element.replaces || []).map((ref) => replacedElementHtml(ref, layer));
    const sentence = element.change === 'moved' ? 'Moved or renamed: it replaces an element of “' + other + '”.'
      : element.change === 'split' ? 'Split: it is one of several elements that replace an element of “' + other + '”.'
      : 'Merged: it replaces several elements of “' + other + '”.';
    html += '<p class="inspection-note">' + escapeHtml(sentence) + '</p>' +
      (replaced.length ? '<div class="change-diff" data-property="replaces"><div class="change-diff-label">Replaces</div>' + renderItemListHtml(replaced) + '</div>' : '');
    const row = (state.changes || []).find((candidate) => candidate.thing === 'element' && candidate.layer === layer && candidate.reference === reference);
    if (row && Array.isArray(row.natures) && row.natures.length) {
      html += '<p class="change-natures">Also changed: ' + escapeHtml(natureWordsText(row.natures)) + '. Compared with “' + escapeHtml(other) + '”.</p>' + renderChangeDiffsHtml(row.before, row.after);
    }
  } else if (element.change === 'new') {
    html += '<p class="inspection-note">Whole element is new: it is not in “' + escapeHtml(other) + '”. Its properties are the ones below.</p>';
  } else if (element.change === 'removed') {
    html += '<p class="inspection-note">Whole element is removed' + (removedPanel ? '. Its properties and its relationships are the ones below.' : ': it is only in “' + escapeHtml(other) + '”.') + '</p>';
    if (removedPanel) {
      // #71: what the node deployed, as the panel of a changed node says it (Before only), read as the other plateau's file wrote it;
      // wave 014 (run 0073): and what an environment used, which the panel of a changed environment says the same way
      const gone = AppState.baseline && AppState.baseline.index[layer] ? AppState.baseline.index[layer].get(reference) : null;
      const was = {};
      if (gone && Array.isArray(gone.applications) && gone.applications.length) was.applications = gone.applications;
      if (gone && gone.kind === 'environment' && Array.isArray(gone.uses) && gone.uses.length) was.uses = gone.uses;
      html += renderChangeDiffsHtml(was, {}, true);
    }
    if (Array.isArray(element.replaced_by) && element.replaced_by.length) {
      // wave 009: it is drawn only as the place of what was inside it; the elements that replace it are the ones to read
      html += '<div class="change-diff" data-property="replaced_by"><div class="change-diff-label">Replaced by</div>' +
        renderItemListHtml(element.replaced_by.map((ref) => replacingElementHtml(ref, layer))) + '</div>';
    }
  } else {
    const row = (state.changes || []).find((candidate) => candidate.thing === 'element' && candidate.layer === layer && candidate.reference === reference);
    html += '<p class="change-natures">Changed: ' + escapeHtml(natureWordsText(element.natures)) + '. Compared with “' + escapeHtml(other) + '”.</p>';
    if (row) html += renderChangeDiffsHtml(row.before, row.after);
  }
  const rels = removedPanel ? [] : changedRelationshipsOf(state, layer, reference); // the panel of a removed element lists them already
  if (rels.length) {
    html += '<h5 class="inspection-subhead">Relationships <span class="field-count">' + rels.length + '</span></h5><ul class="change-rels">' +
      rels.map((rel) => renderChangedRelationshipHtml(state, layer, rel, false)).join('') + '</ul>';
  }
  return html + '</section>';
}

/** The state of a link, from the relationships it stands for: all new is new, all removed is removed, none changed is none, any other mixture is changed (the kernel's rule for a grouped link). */
function stateOfRelationships(rels) {
  const given = rels.filter((rel) => rel.change !== undefined);
  if (!given.length) return 'none';
  const all = (wanted) => rels.every((rel) => (rel.change || 'none') === wanted);
  return all('new') ? 'new' : all('removed') ? 'removed' : all('none') ? 'none' : 'changed';
}

/** For a selected link: its own state, and what each relationship it groups says of itself (the state of each is on its line, see `renderRelationshipInspectionHtml`). */
function renderLinkChangeHtml(rels) {
  if (!comparisonState() || !comparisonState().records) return '';
  const state = stateOfRelationships(rels);
  if (state === 'none') return '';
  const plural = rels.length > 1;
  const nouns = {
    new: plural ? 'All of the relationships it groups are new.' : 'The relationship it stands for is new.',
    removed: plural ? 'All of the relationships it groups are removed.' : 'The relationship it stands for is removed.',
    changed: plural && !rels.every((rel) => rel.change === 'changed') ? 'The relationships it groups are not all the same: some are new, changed or removed.' : plural ? 'All of the relationships it groups changed.' : 'The relationship it stands for changed.'
  };
  return '<section class="what-changed" aria-label="What changed" data-state="' + state + '"><h4 class="inspection-subhead">What changed ' + changeChipHtml(state) + '</h4>' +
    '<p class="inspection-note">' + nouns[state] + '</p></section>';
}

/** The detail of a changed relationship of a link: what it was and what it is, from the table. '' when it did not change. */
function renderRelationshipChangeHtml(rel, layer) {
  const state = comparisonState();
  if (!state || !state.records || !RELATIONSHIP_STATES.includes(rel.change)) return '';
  const row = rel.change === 'changed' ? relationshipRowOf(state, layer, rel.from, rel.destination, rel.label) : null;
  return '<div class="rel-change" data-state="' + rel.change + '">' + changeChipHtml(rel.change) +
    (row ? ' <span class="change-natures">Changed: ' + escapeHtml(natureWordsText(row.natures)) + '</span>' + renderChangeDiffsHtml(row.before, row.after) : '') + '</div>';
}

// ---- The list ----

const CHANGE_STATE_ORDER = { new: 0, changed: 1, moved: 2, split: 3, merged: 4, removed: 5 };

/** The rows of the table in the order a reviewer reads them: what is new, what changed, what was removed; inside a state, the kernel's order (by reference). */
function sortedChangeRows(rows) {
  return rows.map((row, i) => [row, i]).sort((a, b) => CHANGE_STATE_ORDER[a[0].change] - CHANGE_STATE_ORDER[b[0].change] || a[1] - b[1]).map(([row]) => row);
}

/**
 * What a moved, split or merged row says of where the element came from, as `diff` does: `from shop.till`, and for a split `split with shop.report-b`
 * (the other rows of the same layer that replace one of the same references).
 */
function identityTextOf(row, rows) {
  const replaces = Array.isArray(row.replaces) ? row.replaces : [];
  let text = replaces.length ? 'from ' + replaces.join(', ') : '';
  if (row.change === 'split') {
    const others = rows.filter((other) => other !== row && other.thing === 'element' && other.layer === row.layer && other.change === 'split' && Array.isArray(other.replaces) && other.replaces.some((ref) => replaces.includes(ref)))
      .map((other) => other.reference);
    if (others.length) text += (text ? '; ' : '') + 'split with ' + others.join(', ');
  }
  return text;
}

/** The split elements of the table, as `layer NUL reference`: built once per render of the panel (the Java `GapReport` does the same), not once per row. */
function splitElementsOf(rows) {
  const splits = new Set();
  for (const row of rows) if (row.thing === 'element' && row.change === 'split') splits.add(row.layer + '\0' + row.reference);
  return splits;
}

/**
 * The split elements a new relationship belongs to (its source, its destination), as `archicode diff` says it (`of the split X`): the kernel does not
 * compare the relationships of an element that was split (which half would own them is a guess), so those of the halves read as new. [] for any other row.
 * `splits` is `splitElementsOf` of the whole table.
 */
function ofSplitOf(row, splits) {
  if (row.thing !== 'relationship' || row.change !== 'new' || !splits.size) return [];
  return [row.reference, row.destination].filter((reference, i, all) => all.indexOf(reference) === i && splits.has(row.layer + '\0' + reference));
}

/** How many of the new relationships belong to a split element: the line of the header of `archicode diff`. */
function newRelationshipsOfSplits(rows, splits) {
  return rows.filter((row) => ofSplitOf(row, splits).length).length;
}

/** One row of the list: a button that selects the thing (state chip, name and reference, what changed in it). `selected`: it is the selection of the page. `rows`: the whole table (a split names the other halves); `splits`: `splitElementsOf(rows)`, which the caller builds once for all the rows. */
function renderChangeRowHtml(row, selected, rows, splits) {
  const element = row.thing === 'element';
  const attributes = ' data-action="select-change" data-thing="' + row.thing + '" data-change="' + row.change + '" data-layer="' + escapeHtml(row.layer) + '" data-ref="' + escapeHtml(row.reference) + '"' +
    (element ? '' : ' data-to="' + escapeHtml(row.destination) + '" data-label="' + escapeHtml(row.label || '') + '"');
  const layer = row.layer === 'technology' ? ' <span class="change-layer">technology</span>' : '';
  let main;
  let natures = '';
  let from = '';
  if (element) {
    const name = row.name || String(row.reference).split('.').pop();
    main = '<span class="change-name">' + escapeHtml(name) + '</span> <span class="change-ref">' + escapeHtml(row.reference) + '</span>' + layer;
    if (row.change === 'changed' || (IDENTITY_STATES.includes(row.change) && Array.isArray(row.natures) && row.natures.length)) natures = natureWordsText(row.natures);
    if (IDENTITY_STATES.includes(row.change)) from = identityTextOf(row, rows || []);
  } else {
    main = relationshipTextHtml({ from: row.reference, destination: row.destination, label: row.label }, true) + layer;
    if (row.change === 'changed') natures = natureWordsText(row.natures) + (row.before && 'label' in row.before ? ': “' + (row.before.label || '') + '” → “' + (row.after.label || '') + '”' : '');
    const owners = ofSplitOf(row, splits || splitElementsOf(rows || []));
    if (owners.length) from = 'of the split ' + owners.join(', ');
  }
  return '<li><button type="button" class="change-row' + (selected ? ' selected' : '') + '"' + attributes + (selected ? ' aria-current="true"' : '') + '>' +
    changeChipHtml(row.change) + '<span class="change-main">' + main + '</span>' + (from ? '<span class="change-from">' + escapeHtml(from) + '</span>' : '') + (natures ? '<span class="change-natures">' + escapeHtml(natures) + '</span>' : '') + '</button></li>';
}

/** Is this row the selection of the page: the element selected, the removed box picked, or the link selected. On the page of a view in Stories it is the page's own selection (`diagramSelection`). */
function changeRowIsSelected(row, pick) {
  const library = currentPerspective === 'library';
  const sel = library ? diagramSelection() : AppState.selection;
  if (row.thing === 'relationship') return sel.kind === 'link' && sel.from === row.reference && sel.to === row.destination;
  if (elementIsOnlyInTheOtherPlateau(row.layer, row.reference, row.change)) return !!pick && pick.reference === row.reference && pick.layer === row.layer;
  const element = library ? sel : elementSelection();
  return element.kind === 'element' && element.key === row.reference && layerOfReference(element.key, element.layer) === row.layer;
}

// ---- Reading a long list of changes (wave 015, run 0103, #27) ----
// The list is read one change at a time (Previous change, Next change) and narrowed by two filters (a state, a layer) that say how many of how many they show. All of it is
// view state: no model changes, so none of it calls `modelsChanged()`, and it is not an input of the comparison (the cache of the comparison, the diagram and the quiet
// references are not keyed on it): a filter changes the list and nothing the diagrams draw (Everything / Changes only is the tool that does). The list is one function,
// `renderChangesPanelHtml`, called from the pages that have it: Plateaus, Applications, Environments, Elements and Stories.

/** The two filters, for the pair of plateaus they were chosen for: the pair changes, they are all again (turning the comparison off and on with the same pair keeps them). */
let changesFilter = { pair: null, state: 'all', layer: 'all' };
/** The change the reader walked to last: `{ key, selection }`, `selection` being the selection of the page right after, so that a selection made since (a click elsewhere) is told from it. */
let changesWalk = null;

/** The pair of plateaus a comparison is about, as the filters and the walk remember it. */
function comparisonPairKey(state) {
  return state.base.id + '>' + state.target.id;
}

/** The filters of the comparison `state`: reset (with the walk) when the pair of plateaus is not the one they were chosen for. */
function changesFilterFor(state) {
  const pair = comparisonPairKey(state);
  if (changesFilter.pair !== pair) {
    changesFilter = { pair, state: 'all', layer: 'all' };
    changesWalk = null;
  }
  return changesFilter;
}

/** What names a row of the table (an element, or a relationship with its label); the same text from the row and from the attributes of its button. */
function changeKey(thing, layer, reference, destination, label) {
  return [thing, layer, reference, thing === 'relationship' ? destination : '', thing === 'relationship' ? (label || '') : ''].join('\u0000');
}

function changeRowKey(row) {
  return changeKey(row.thing, row.layer, row.reference, row.destination, row.label);
}

/** Every row of the table in the order of the list: the elements, then the relationships, each as `sortedChangeRows` sorts them. The order is the one Next and Previous walk. */
function orderedChangeRows(state) {
  const rows = sortedChangeRows(state.changes || []);
  return rows.filter((row) => row.thing === 'element').concat(rows.filter((row) => row.thing === 'relationship'));
}

/** Does the row pass the two filters (`except`: leave one of them out, to count what the other would show). */
function changeRowIsShown(row, filter, except) {
  return (except === 'state' || filter.state === 'all' || row.change === filter.state) && (except === 'layer' || filter.layer === 'all' || row.layer === filter.layer);
}

/** The rows the filters keep, in the order of the list. */
function shownChangeRows(rows, filter) {
  return rows.filter((row) => changeRowIsShown(row, filter));
}

/** How many rows each choice of each filter would show, with the other filter as it is: `{ states: { all, new, ... }, layers: { all, application, technology } }`. */
function changeFilterCounts(rows, filter) {
  const states = { all: 0 };
  const layers = { all: 0, application: 0, technology: 0 };
  for (const row of rows) {
    if (changeRowIsShown(row, filter, 'state')) {
      states.all++;
      states[row.change] = (states[row.change] || 0) + 1;
    }
    if (changeRowIsShown(row, filter, 'layer')) {
      layers.all++;
      layers[row.layer] = (layers[row.layer] || 0) + 1;
    }
  }
  return { states, layers };
}

/** The selection of the page as the walk remembers it: what is selected, and the removed box picked, if any. */
function changesSelectionStamp() {
  return JSON.stringify([diagramSelection(), removedPick ? [removedPick.reference, removedPick.layer] : null]);
}

/** The removed box the page has picked, as the list reads it (see `renderChangesPanelHtml`). */
function changesPick() {
  return currentPerspective === 'library' ? removedInspectionOf(diagramSelection(), 'library') : removedInspectionOf(AppState.selection, mapIsShown() ? 'map' : 'elements');
}

/**
 * The change the reader is at: the row last walked to (or clicked) while nothing else was selected since; else the first row that is the selection of the page; else none.
 * Relationships that share a pair of elements are all "the selection" of one link, and a relationship that is told by its source (Elements, no diagram) selects an element that
 * has a row of its own: the walk is what keeps Next going forward in both cases.
 */
function currentChangeOf(rows, pick) {
  const selected = rows.filter((row) => changeRowIsSelected(row, pick));
  const walked = changesWalk ? rows.find((row) => changeRowKey(row) === changesWalk.key) : null;
  if (walked && (!selected.length || selected.includes(walked) || changesWalk.selection === changesSelectionStamp())) return walked;
  return selected[0] || null;
}

/** The rows that are marked in the list: the current change when it was walked to, else every row that is the selection (a pair of elements may have several relationships). */
function markedChangeKeys(rows, pick) {
  const current = currentChangeOf(rows, pick);
  const selected = rows.filter((row) => changeRowIsSelected(row, pick));
  const marked = current && !selected.includes(current) ? [current] : selected;
  return new Set(marked.map(changeRowKey));
}

/** The next (or previous) row that the filters keep, after `current` in the order of the list; with no current change, the first (the last). Null at the end: the walk stops there. */
function neighbourChange(rows, filter, current, direction) {
  const step = direction === 'previous' ? -1 : 1;
  const at = current ? rows.findIndex((row) => changeRowKey(row) === changeRowKey(current)) : -1;
  for (let i = at < 0 ? (step > 0 ? 0 : rows.length - 1) : at + step; i >= 0 && i < rows.length; i += step) {
    if (changeRowIsShown(rows[i], filter)) return rows[i];
  }
  return null;
}

/** The row the filters keep that is nearest to `current` in the order of the list (the one after it when two are as near). Null when none is kept, or `current` is not in the list. */
function nearestShownChange(rows, filter, current) {
  const at = current ? rows.findIndex((row) => changeRowKey(row) === changeRowKey(current)) : -1;
  if (at < 0) return null;
  for (let distance = 1; distance < rows.length; distance++) {
    for (const i of [at + distance, at - distance]) if (i >= 0 && i < rows.length && changeRowIsShown(rows[i], filter)) return rows[i];
  }
  return null;
}

/** Does the page show a selection, so that walking to a change selects it? The page Plateaus draws nothing, and Stories draws a diagram only for a view that can be drawn. */
function changeSelectionIsShown() {
  if (currentPerspective === 'plateaus') return false;
  if (currentPerspective === 'library') return libraryTab === 'views' && !!selectedViewId && !!libraryDiagramRecipe(findSavedView(selectedViewId));
  return true;
}

/**
 * Walk to a row of the list: where the page shows a selection the change is selected as a click on its row selects it (the diagram, the panel), but the list stays on screen
 * (`keepList`); elsewhere only the mark moves. The row is brought into view in the list. `focus`: the control to give the focus back to (the list is drawn again).
 */
function goToChange(row, focus) {
  pendingFocusSelector = focus || null;
  if (changeSelectionIsShown()) {
    selectChange({ thing: row.thing, change: row.change, layer: row.layer, ref: row.reference, to: row.destination, label: row.label || '' }, { keepList: true });
    return;
  }
  changesWalk = { key: changeRowKey(row), selection: changesSelectionStamp() };
  scrollChangesToSelection = true;
  render();
}

/** Next change / Previous change: the walk stops at the ends of the list (the button there is disabled), it does not wrap. Returns whether the reader moved. */
function walkChange(direction, options) {
  const state = comparisonState();
  if (!state || !state.changes) return false;
  const filter = changesFilterFor(state);
  const rows = orderedChangeRows(state);
  const current = currentChangeOf(rows, changesPick());
  const row = neighbourChange(rows, filter, current, direction);
  if (!row) return false;
  const further = neighbourChange(rows, filter, row, direction);
  goToChange(row, options && options.keepFocus ? null : '[data-action="change-' + (further ? direction === 'previous' ? 'previous' : 'next' : direction === 'previous' ? 'next' : 'previous') + '"]'); // at the end the other button keeps the focus; the shortcut moves the focus to no control
  return true;
}

/**
 * Does the page have a Changes list a reader can walk: a comparison that can be listed (not loading, not refused), a page that has the list, and the right panel not hidden by a maximized
 * diagram. The list may be one tab away (the Selected or View tab is showing): the walk brings the Changes tab back, as a button of the list would have been used.
 */
function changesListIsOnPage() {
  const state = comparisonState();
  if (!state || state.problems || state.pending || !state.changes) return false;
  if (currentPerspective === 'plateaus') return true;
  if (diagramMaximized) return false;
  if (currentPerspective === 'library') return libraryChangesState() !== null;
  return comparisonPanelOn();
}

/** Is this element where the reader types: an input, a textarea, a select, a contenteditable, or a code editor of the page (CodeMirror: Files, the YAML and JSON editors of the forms)? */
function isTypingTarget(el) {
  if (!el) return false;
  const tag = String(el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable) return true;
  return !!(el.closest && el.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], .cm-editor'));
}

/** The keys of the walk, one letter each: J goes to the next change, K to the previous one (the pair of the web's lists; no bracket, which an AZERTY keyboard types with AltGr). */
const CHANGES_WALK_KEYS = { j: 'next', k: 'previous' };

/**
 * The keyboard shortcut of *Next change* and *Previous change* (wave 016, run 0112, #113): `walkChange`, the walk of the buttons, in the same order with the same filters and the same
 * stops. It leaves the key alone, so that the browser's and the page's other shortcuts are free, when a modifier is held (Shift included), when the reader types (an input, a textarea,
 * a select, a contenteditable, a code editor: the event target and the focused element are both looked at), when a dialog, the help or the menu of the header is open, when a rejected
 * YAML text is waiting for its author, and when no Changes list is on screen. It writes nothing in the address by itself. The control that had the focus keeps it when the redraw keeps it (a diagram box, a tree row, a control of the header); no control of the panel takes it unless the focus was on the panel.
 */
function handleChangesKeydown(e) {
  const direction = CHANGES_WALK_KEYS[String(e.key || '').toLowerCase()];
  if (!direction || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented || e.isComposing) return;
  const focused = typeof document.activeElement === 'undefined' ? null : document.activeElement;
  if (isTypingTarget(e.target) || isTypingTarget(focused)) return;
  if (storyPlayer || appDialog || helpOpen || headerMenuOpen || rawYamlEditDraft || !changesListIsOnPage()) return; // the player owns the keys while it is open; a rejected YAML text is kept by the page: a selection made by a key would drop it
  const inPanel = !!(focused && focused.closest && focused.closest('[data-changes-panel]'));
  if (e.preventDefault) e.preventDefault();
  walkChange(direction, { keepFocus: !inPanel });
}
document.addEventListener('keydown', handleChangesKeydown);

/** Choose a state or a layer in the filters ('all' for none). The change the reader is at, if the filter leaves it out, moves to the nearest change that is shown. Returns whether it was a valid choice. */
function setChangesFilter(kind, value) {
  const state = comparisonState();
  if (!state || !state.changes || (kind !== 'state' && kind !== 'layer')) return false;
  const known = kind === 'state' ? ['all'].concat(CHANGE_STATES) : ['all', 'application', 'technology'];
  if (!known.includes(value)) return false;
  const filter = changesFilterFor(state);
  filter[kind] = value;
  const rows = orderedChangeRows(state);
  const current = currentChangeOf(rows, changesPick());
  const focus = '[data-changes-filter="' + kind + '"]';
  const near = current && !changeRowIsShown(current, filter) ? nearestShownChange(rows, filter, current) : null;
  if (near) goToChange(near, focus);
  else {
    pendingFocusSelector = focus;
    render();
  }
  return true;
}

/** Both filters back to "all". */
function clearChangesFilter() {
  const state = comparisonState();
  if (!state || !state.changes) return;
  const filter = changesFilterFor(state);
  filter.state = 'all';
  filter.layer = 'all';
  pendingFocusSelector = '[data-changes-filter="state"]';
  render();
}

/**
 * The detail of the change the reader is at, under the walk buttons (wave 016, run 0112, #113): the "What changed" block of the inspection for an element (`renderWhatChangedHtml`,
 * the one function that writes it), and for a relationship one section with its state and its line (`renderChangedRelationshipHtml`, the line the inspection of an element lists). So the
 * pages that show no selection (Plateaus, a story with no view drawn) show what a change is where *Next change* only moved a mark, and a page that shows a selection needs no switch
 * to the Selected tab to read it. '' when no change is current or the current one is left out by the filters. View state: it reads the comparison and nothing else.
 */
function renderCurrentChangeDetailHtml(state, current, shown) {
  if (!current || !shown.some((row) => changeRowKey(row) === changeRowKey(current))) return '';
  let block;
  if (current.thing === 'element') block = renderWhatChangedHtml(current.layer, current.reference, false);
  else {
    const rel = { from: current.reference, destination: current.destination, label: current.label, change: current.change };
    block = '<section class="what-changed" aria-label="What changed" data-state="' + current.change + '"><h4 class="inspection-subhead">What changed ' + changeChipHtml(current.change) + '</h4>' +
      '<ul class="change-rels">' + renderChangedRelationshipHtml(state, current.layer, rel, true) + '</ul></section>';
  }
  return block ? '<div class="changes-detail" data-changes-detail="' + escapeHtml(changeRowKey(current).replace(/\u0000/g, '|')) + '">' + block + '</div>' : '';
}

/** The two filters, the line that says how many of how many are shown, and the buttons that walk the list. `rows`: every row; `shown`: the ones the filters keep; `current`: the change the reader is at. */
function renderChangesReadingHtml(rows, filter, shown, current) {
  if (!rows.length) return '';
  const counts = changeFilterCounts(rows, filter);
  const option = (value, label, count, chosen) => '<option value="' + value + '"' + (chosen === value ? ' selected' : '') + '>' + escapeHtml(label) + ' (' + count + ')</option>';
  const present = (name) => counts.states[name] > 0 || filter.state === name;
  const stateOptions = option('all', 'All states', counts.states.all, filter.state) +
    Object.keys(CHANGE_STATE_ORDER).filter((name) => CHANGE_STATES.includes(name) && present(name)).map((name) => option(name, CHANGE_WORDS[name].word.charAt(0).toUpperCase() + CHANGE_WORDS[name].word.slice(1), counts.states[name] || 0, filter.state)).join('');
  const layerOptions = option('all', 'Both layers', counts.layers.all, filter.layer) + option('application', 'Application', counts.layers.application, filter.layer) +
    option('technology', 'Technology', counts.layers.technology, filter.layer);
  const filtered = filter.state !== 'all' || filter.layer !== 'all';
  const at = current ? shown.findIndex((row) => changeRowKey(row) === changeRowKey(current)) : -1;
  const before = neighbourChange(rows, filter, current, 'previous');
  const after = neighbourChange(rows, filter, current, 'next');
  return '<div class="changes-reading" role="group" aria-label="Reading the changes">' +
    '<div class="changes-filters">' +
      '<label class="changes-filter">State<select data-changes-filter="state">' + stateOptions + '</select></label>' +
      '<label class="changes-filter">Layer<select data-changes-filter="layer">' + layerOptions + '</select></label>' +
    '</div>' +
    '<p class="changes-shown" data-changes-shown="' + shown.length + '" data-changes-total="' + rows.length + '" role="status">' +
      (filtered ? shown.length + ' of ' + rows.length + ' changes' : rows.length + (rows.length === 1 ? ' change' : ' changes')) + '</p>' +
    '<div class="changes-walk"><span class="button-group" role="group" aria-label="Walk the changes">' +
      '<button type="button" data-action="change-previous"' + (before ? '' : ' disabled') + ' aria-keyshortcuts="k" title="The change before this one in the list (shortcut: K)">Previous change</button>' +
      '<button type="button" data-action="change-next"' + (after ? '' : ' disabled') + ' aria-keyshortcuts="j" title="The change after this one in the list (shortcut: J)">Next change</button></span>' +
      (at >= 0 ? '<span class="changes-position" data-changes-position="' + (at + 1) + '">' + (at + 1) + ' of ' + shown.length + '</span>' : '') +
      (filtered ? '<button type="button" data-action="change-filters-clear" title="Show every change again">Show all</button>' : '') +
    '</div></div>';
}

/**
 * The Changes panel: what the comparison found, in numbers and in two lists (Elements, Relationships), with the toggle that sets the wording-only
 * changes aside. A click on a row selects the thing (see `selectChange`). Under the counts, the two filters, the line "12 of 167 changes" and the buttons Previous change / Next change
 * (`renderChangesReadingHtml`, wave 015, run 0103, #27). The pages Plateaus, Applications, Environments, Elements and Stories all write it with this function. `state` is `comparisonState()` of a comparison that can be drawn.
 */
function renderChangesPanelHtml(state) {
  const pick = changesPick();
  const rows = sortedChangeRows(state.changes || []);
  const splits = splitElementsOf(rows);
  const filter = changesFilterFor(state); // wave 015, run 0103 (#27): the two filters of the list, and where the reader is in it
  const ordered = orderedChangeRows(state);
  const shown = shownChangeRows(ordered, filter);
  const marked = markedChangeKeys(ordered, pick);
  const group = (thing, title) => {
    const all = rows.filter((row) => row.thing === thing);
    const list = all.filter((row) => changeRowIsShown(row, filter));
    return '<h4 class="inspection-subhead">' + title + ' <span class="field-count">' + (list.length === all.length ? list.length : list.length + ' of ' + all.length) + '</span></h4>' +
      (list.length ? '<ul class="change-list" aria-label="' + title + ' that differ">' + list.map((row) => renderChangeRowHtml(row, marked.has(changeRowKey(row)), rows, splits)).join('') + '</ul>'
        : '<p class="muted change-none">' + (all.length ? 'None of the ' + all.length + ' matches the filters.' : 'None.') + '</p>');
  };
  const counts = state.counts;
  const countRow = (title, c) => '<div class="changes-count-row"><span class="changes-count-label">' + title + '</span>' +
    CHANGE_STATES.filter((name) => c[name] !== undefined).map((name) => changeChipHtml(name, c[name])).join('') + '</div>'; // moved, split and merged are counted only when there is one: the kernel leaves them out of a comparison that has none
  const wording = AppState.hideWording
    ? (state.wordingHidden ? '<p class="changes-note" data-wording="hidden">' + state.wordingHidden + ' wording-only ' + (state.wordingHidden === 1 ? 'change' : 'changes') + ' hidden.</p>' : '')
    : (state.wordingOnly ? '<p class="changes-note" data-wording="shown">' + state.wordingOnly + ' of the changed elements ' + (state.wordingOnly === 1 ? 'is a change' : 'are changes') + ' of wording only (the description is all that changed).</p>' : '');
  const ofSplit = newRelationshipsOfSplits(rows, splits);
  const ofSplitNote = ofSplit ? '<p class="changes-note" data-of-split="' + ofSplit + '">' + ofSplit + ' of the ' + counts.relationships.new + ' new relationships ' + (ofSplit === 1 ? 'belongs' : 'belong') + ' to split elements: the comparison does not compare the relationships of a split element, so they read as new.</p>' : '';
  return '<div class="changes-panel" data-changes-panel>' +
    '<div class="inspection-head"><h3>Changes</h3></div>' +
    '<p class="changes-compared">' + escapeHtml(plateauTitle(state.target)) + ' compared with ' + escapeHtml(plateauTitle(state.base)) + '.</p>' +
    '<div class="changes-counts" role="group" aria-label="Counts">' + countRow('Elements', counts.elements) + countRow('Relationships', counts.relationships) + '</div>' +
    '<label class="changes-toggle" title="A change of the description alone is wording, not structure: leave it out of the drawing, the list and the counts"><input type="checkbox" data-action="toggle-hide-wording"' + (AppState.hideWording ? ' checked' : '') + '> Hide wording-only changes</label>' +
    wording + ofSplitNote +
    (candidateMessage ? '<p class="changes-message" role="alert">' + escapeHtml(candidateMessage) + '</p>' : '') +
    renderCandidatesHtml(state) + renderWarningsHtml(state) + renderStateWordsHtml(state) + renderCascadeHtml(state) +
    (rows.length ? '' : '<p class="inspection-note">Nothing differs between the two plateaus.</p>') +
    renderChangesReadingHtml(ordered, filter, shown, currentChangeOf(ordered, pick)) + renderCurrentChangeDetailHtml(state, currentChangeOf(ordered, pick), shown) +
    group('element', 'Elements') + group('relationship', 'Relationships') + '</div>';
}

// ---- Candidates and warnings (wave 009) ----
// The kernel proposes pairs it takes for one thing said twice (an element only the other plateau has, and an element only this one has, of the same kind and the
// same place, name or description). It never applies one. The editor, which is interactive and writes no generated file, lists them for any comparison (D-7):
// "Write replaces" writes `replaces: [from]` on the new element, through the same edit as any other; "Not related" sets the pair aside for this page.

/** The pairs set aside with "Not related": remembered in this page only, for the pair of plateaus they were set aside in. No storage. */
const dismissedCandidates = new Set();

function candidateKey(state, candidate) {
  return [state.base.id, state.target.id, candidate.layer, candidate.from, candidate.to].join('|');
}

/** The reasons the kernel gives, in words. */
const CANDIDATE_REASON_WORDS = { name: 'same name', description: 'close description', parent: 'the only two of their kind under the same parent' };

/** The candidates of the comparison that were not set aside, in the kernel's order. */
function openCandidatesOf(state) {
  return (state.candidates || []).filter((candidate) => !dismissedCandidates.has(candidateKey(state, candidate)));
}

/** One side of a candidate: its name and its reference (the union knows both elements, one from each plateau). */
function candidateSideHtml(role, state, layer, reference) {
  const record = state.records && state.records.get(layer + '|' + reference);
  const name = record && record.name ? record.name : String(reference).split('.').pop();
  return '<div class="change-candidate-side"><span class="change-candidate-role">' + role + '</span><span class="change-name">' + escapeHtml(name) + '</span> <span class="change-ref">' + escapeHtml(reference) + '</span>' +
    (layer === 'technology' ? ' <span class="change-layer">technology</span>' : '') + '</div>';
}

/** The Candidates section of the Changes panel: '' when the kernel proposes none (or all were set aside and none can be brought back). */
function renderCandidatesHtml(state) {
  const open = openCandidatesOf(state);
  const setAside = (state.candidates || []).length - open.length;
  if (!open.length && !setAside) return '';
  let html = '<section class="changes-candidates" aria-label="Candidates"><h4 class="inspection-subhead changes-subhead">Candidates <span class="field-count">' + open.length + '</span></h4>';
  if (open.length) {
    html += '<p class="changes-note">Each pair looks like one thing said twice. Nothing is applied: “Write replaces” writes <code>replaces</code> on the new element (saved with the rest), “Not related” sets the pair aside.</p>' +
      '<ul class="change-candidates">' + open.map((candidate) => {
        const attributes = ' data-layer="' + escapeHtml(candidate.layer) + '" data-from="' + escapeHtml(candidate.from) + '" data-to="' + escapeHtml(candidate.to) + '"';
        const why = candidateLayerProblem(candidate, state); // #130: off, with the reason, when the layer cannot hold the entry; #138: or the merge the pair is part of
        const reasons = (candidate.reasons || []).map((reason) => CANDIDATE_REASON_WORDS[reason] || reason).join(', ');
        return '<li class="change-candidate"' + attributes + '><div class="change-candidate-pair">' +
          candidateSideHtml('Removed', state, candidate.layer, candidate.from) + candidateSideHtml('New', state, candidate.layer, candidate.to) + '</div>' +
          (reasons ? '<div class="change-candidate-reasons">' + escapeHtml(reasons) + '</div>' : '') +
          (why ? '<div class="change-candidate-why muted" role="note">' + escapeHtml(why) + '</div>' : '') +
          '<div class="change-candidate-actions"><button type="button" data-action="accept-candidate"' + attributes + (why ? ' disabled title="' + escapeHtml(why) + '"' : '') + '>Write replaces</button>' +
          '<button type="button" data-action="dismiss-candidate"' + attributes + '>Not related</button></div></li>';
      }).join('') + '</ul>';
  }
  if (setAside) {
    html += '<p class="changes-note">' + setAside + ' set aside. <button type="button" class="link-button" data-action="restore-candidates">Show again</button></p>';
  }
  return html + '</section>';
}

/**
 * The Cascade of the removals section of the Changes panel (wave 014, run 0080): what the REMOVE patches of the more recent plateau took besides the elements they
 * select, among what the other plateau has, as the table of `archicode diff` lists it after the changes (`GapReport`, `Removal.cascade`). '' when there is none.
 */
function renderCascadeHtml(state) {
  const cascade = state.cascade || [];
  if (!cascade.length) return '';
  return '<section class="changes-cascade" aria-label="Cascade of the removals"><h4 class="inspection-subhead changes-subhead">Cascade of the removals <span class="field-count">' + cascade.length + '</span></h4>' +
    '<p class="changes-note">What a <code>REMOVE</code> took besides the elements it selects, in the plateaus the target adds to the one it is compared with.</p>' +
    '<ul class="change-cascade">' + cascade.map((row) => '<li class="change-cascade-row" data-effect="' + escapeHtml(row.effect) + '" data-plateau="' + escapeHtml(row.plateau) + '" data-element="' + escapeHtml(row.element) + '">' +
      '<span class="cascade-patch">' + escapeHtml(row.plateau + ' \u00b7 ' + row.rank + ' ' + row.patch) + '</span> ' +
      '<span class="cascade-effect">' + escapeHtml(row.effect) + '</span> ' +
      '<span class="change-ref">' + escapeHtml(row.element) + '</span>' + (row.layer === 'technology' ? ' <span class="change-layer">technology</span>' : '') +
      (row.detail ? ' <span class="cascade-detail muted">' + escapeHtml(row.detail) + '</span>' : '') + '</li>').join('') + '</ul></section>';
}

/** What the kernel ignored in the `replaces` it was given, as it says it. */
function renderWarningsHtml(state) {
  const warnings = state.warnings || [];
  if (!warnings.length) return '';
  return '<section class="changes-warnings-section" aria-label="Warnings"><h4 class="inspection-subhead changes-subhead">Warnings <span class="field-count">' + warnings.length + '</span></h4>' +
    '<ul class="changes-warnings">' + warnings.map((warning) => '<li>' + escapeHtml(warning) + '</li>').join('') + '</ul></section>';
}

/** The Hand-written states section of the Changes panel: one line per element and word (the sentences of the command line); '' when every word agrees with the comparison, or there is none. */
function renderStateWordsHtml(state) {
  const hints = stateWordHintsOf(state);
  if (!hints.length) return '';
  return '<section class="changes-state-words" aria-label="Hand-written states"><h4 class="inspection-subhead changes-subhead">Hand-written states <span class="field-count">' + hints.length + '</span></h4>' +
    '<ul class="changes-warnings">' + hints.map((hint) => '<li data-ref="' + escapeHtml(hint.reference) + '" data-word="' + escapeHtml(hint.word) + '">' + escapeHtml(hint.sentence) + '</li>').join('') + '</ul></section>';
}

// ---- A state written by hand that the comparison does not compute (issue 36) ----
// The states of a comparison (`new`, `changed`, `removed`, `moved`, `split`, `merged`, `contains-changes`) are also words an author may have written by hand, as a
// qualifier or in the `rendering-stereotypes` tag. A box gets the default look of a state only where the comparison computes it (wave 009, D-5), so a word that
// disagrees with the comparison is a badge and the author's own style on a box that looks as it did, and nothing says why. The command line says it on its error
// output (`StateTags.java`); the sentences below are the same ones, word for word, and `state-hints.test.js` reads the sentences of the command line
// (`src/test/resources/state-hints/expected-sentences.txt`, which `StateTagRuleTest.java` checks the command line against) and fails if they differ.

/** The words of the author that are the name of a state, for an element: [{ word, source }], qualifiers first, each word once (the order of `StateTags.written`). */
function writtenStateWordsOf(record) {
  const words = [];
  const add = (word, source) => { if (STATE_WORDS.includes(word) && !words.some((w) => w.word === word)) words.push({ word, source }); };
  kernelStringsOf(record.qualifiers).forEach((word) => add(word, 'qualifier'));
  const tag = kernelTagsOf(record.tags)['rendering-stereotypes'];
  if (tag !== undefined && tag.trim() !== '') tag.trim().split(/\s+/).forEach((word) => add(word, '`rendering-stereotypes` tag'));
  return words;
}

/**
 * What the comparison says an element of its union is: its own change, else `contains-changes` when the kernel says (`contains_changes`, on the elements of `compare`'s union,
 * issue #96) that it did not change and holds a change, else null. The page does not work the state out from the references (that is `StateTags.stateOf`'s business too,
 * which reads the same key). `element` is a record of the comparison (`comparisonState().records` or `.full.records`), or undefined for a reference the union does not hold.
 */
function comparisonStateOfElement(element) {
  if (!element) return null;
  if (CHANGE_STATES.includes(element.change)) return element.change;
  return element.contains_changes === true ? 'contains-changes' : null;
}

/** The sentence about one word and one element (`StateTags.sentence`, with a comparison). */
function stateWordSentence(reference, word, source, state, target, base) {
  const said = state === null ? 'finds that it did not change and holds no change'
    : state === 'contains-changes' ? 'finds that it did not change by itself but holds a change'
    : 'finds that it is ' + state;
  return 'the element `' + reference + '` carries `' + word + '` (' + source + '), but the comparison of `' + target.id + '` with `' + base.id + '` ' + said +
    ': it is drawn with your own `styles` entry named `' + word + '` (if any) and not with the default look of the state. The comparison computes the states, so the word can be dropped.';
}

/**
 * The words one element carries that disagree with the comparison, in the order of the words: [{ layer, reference, word, state, sentence }]. The element is one of the plateau
 * drawn, as the command line reads the plateau it is given (`StateTags.warnings(target, ...)`): an element that only the baseline has (a removed one) is told by neither.
 */
function stateWordHintsFor(state, layer, reference) {
  if (!state || !state.full || !state.full.records || state.future) return []; // with the future the plateau drawn is the base: the command line tells these words of the target
  const record = AppState.index[layer] && AppState.index[layer].get(reference);
  if (!record) return [];
  const computed = comparisonStateOfElement(state.full.records.get(layer + '|' + reference));
  return writtenStateWordsOf(record)
    .filter(({ word }) => word !== computed)
    .map(({ word, source }) => ({ layer, reference, word, state: computed, sentence: stateWordSentence(reference, word, source, computed, state.target, state.base) }));
}

/**
 * The words that disagree with the comparison, one per element and word, in the order of the command line (application, then technology; by reference; the order of the words):
 * [{ layer, reference, word, state, sentence }]. Nothing when nothing is compared (the command line says another thing then: that nothing is compared, which the editor, where the
 * comparison is a choice of the page, leaves to its band), and none for a word that is the state of its element.
 */
function stateWordHintsOf(state) {
  if (!state || !state.full || !state.full.records) return [];
  const hints = [];
  for (const layer of ['application', 'technology']) {
    const map = AppState.index[layer];
    if (!map) continue;
    for (const reference of Array.from(map.keys()).sort()) hints.push(...stateWordHintsFor(state, layer, reference));
  }
  return hints;
}

/** In the inspection of an element: the words it carries that the comparison does not give it, told where the author looks at the box. '' when none (or nothing is compared). */
function renderStateWordHintsHtml(layer, reference) {
  const hints = stateWordHintsFor(comparisonState(), layer, reference);
  if (!hints.length) return '';
  return '<section class="state-word-hints" aria-label="Words that are not its state">' +
    hints.map((hint) => '<p class="inspection-note state-word-hint" data-word="' + escapeHtml(hint.word) + '">' + escapeHtml(hint.sentence) + '</p>').join('') + '</section>';
}

/**
 * "Write replaces": add `from` to the `replaces` of the element `to` of the more recent plateau of the comparison, and only there (`acceptLayeredCandidate`). A candidate whose
 * new element is not in that plateau is refused with the reason (in the panel), and nothing is changed. The edit is `commitElementEdit` like every
 * other edit of an element: it keeps the comments and the lines it does not touch, marks the file as modified (saved with the rest), and ends in
 * `rebuildIndexAndRender`, which tells the cache of the comparison that the model changed. Returns `{ ok: true }` or `{ ok: false, message }`.
 */
function acceptCandidate(candidate) {
  const refuse = (message) => { candidateMessage = message; render(); return { ok: false, message }; };
  const state = comparisonState();
  if (!state || !state.records) return refuse('Nothing is compared: choose a plateau in Compare with, on the band, first.');
  return acceptLayeredCandidate(candidate, state, refuse);
}

/**
 * "Write replaces" for two plateaus of the band, whichever is drawn: `replaces: [from]` goes on the element `to` of the more recent plateau of the comparison (the
 * target) and only there, in the manifest that declares it. An element the target inherits from a plateau above is declared there: writing it would change that plateau
 * and the ones that override it, so it is refused with the plateau to compare. The write is the same edit as any other (`commitElementEdit`): it keeps the lines it does
 * not touch, marks the file as modified, and ends in `rebuildIndexAndRender`; it is allowed in a plateau that is read-only for the rest, since it is the one thing the
 * Changes panel offers and it lands in the plateau the comparison is about.
 */
function acceptLayeredCandidate(candidate, state, refuse) {
  const layer = candidate.layer || 'application';
  const base = state.base, target = state.target;
  const baseIndex = baseSideIndex(), targetIndex = targetSideIndex();
  const record = targetIndex[layer] ? targetIndex[layer].get(candidate.to) : null;
  if (!record) {
    return refuse(baseIndex[layer] && baseIndex[layer].has(candidate.to)
      ? '“' + candidate.to + '” belongs to “' + plateauTitle(base) + '”, the older plateau of the comparison. replaces goes on an element of “' + plateauTitle(target) + '”, the more recent one.'
      : '“' + candidate.to + '” is not an element of “' + plateauTitle(target) + '” any more; nothing was written.');
  }
  if (!baseIndex[layer] || !baseIndex[layer].has(candidate.from)) return refuse('“' + candidate.from + '” is not an element of “' + plateauTitle(base) + '”; nothing was written.');
  if (targetIndex[layer].has(candidate.from)) return refuse('“' + candidate.from + '” is still an element of “' + plateauTitle(target) + '”: a replaces that names it would be ignored.');
  if (record.declaredIn !== undefined && record.declaredIn !== target.id) {
    return refuse('“' + candidate.to + '” is declared in the plateau “' + record.declaredIn + '”, not in “' + plateauTitle(target) + '”: replaces is written in the manifest that declares the element, which would change “' +
      record.declaredIn + '” and the plateaus that override it. Compare “' + record.declaredIn + '” with “' + plateauTitle(base) + '” to write it there; nothing was written.');
  }
  const layerProblem = candidateLayerProblem(candidate, state); // #130, and the merge as a whole (#138)
  if (layerProblem) return refuse(layerProblem);
  const located = locateContentNode(candidate.to, layer, record);
  if (!located) return refuse('“' + candidate.to + '” cannot be found in the manifests of “' + plateauTitle(target) + '”; nothing was written.');
  if (located.node.replaces !== undefined && located.node.replaces !== null && !Array.isArray(located.node.replaces)) {
    return refuse('The replaces of “' + candidate.to + '” is not a list; fix it by hand, nothing was written.');
  }
  candidateMessage = null;
  try {
    commitElementEdit(candidate.to, (node) => { node.replaces = replacesWith(node.replaces, candidate.from); }, layer, { record, allowReadOnly: true });
  } catch (e) {
    candidateMessage = e && e.message ? e.message : String(e);
    render();
    return { ok: false, message: candidateMessage };
  }
  return { ok: true };
}

/**
 * Whether the layer the entry would be written in can hold it (wave 018, run 0131, issue #130, decision D4): `replaces` is read against the plateau the manifest builds on, the
 * one the plateau of the target overrides, so, when the comparison is several layers apart (`replacesChainBetween`: the kernel composes the layers in between, and reads the target's entries against the plateau just below it), `from` must be an element of that plateau. An intermediate layer that removed `from` makes the entry a mistake of the layer it is
 * written in: the comparison composes it through `chain` (#89), the manifest cannot say it. Returns the sentence, or null when the layer can hold it (also when there is
 * nothing it builds on: the root, a workspace without plateaus, or a plateau that cannot be drawn, which `guardedLayerWrite` reports). Every pair is looked at alone here, so a
 * split or a merge, written one pair at a time, has each of its `from` checked; a merge is also refused as a whole when one of its `from` is (`replacesMergeProblem`, #138), and
 * *Add replaces* of the inspection asks the same (`addReplacesLayerProblem`). The command line has no such rule: it writes no `replaces`.
 */
function replacesLayerProblem(layer, from, state) {
  const tree = AppState.plateauTree;
  if (!tree || !state || !state.target) return null;
  const node = tree.nodes.get(state.target.id);
  if (!node || node.parent === null || !tree.nodes.has(node.parent)) return null;
  if (!replacesChainBetween(state.base.id, state.target.id)) return null; // the plateau compared with is the one the kernel reads the entry against (one layer apart, or siblings one layer above what they share): wave 017, as written
  const below = layerModelOf(node.parent, AppState.workspace.settings);
  if (below.undrawable || !below.index[layer] || below.index[layer].has(from)) return null;
  const titleOf = (plateau) => (typeof plateau.name === 'string' && plateau.name.trim() !== '' ? plateau.name : plateau.id);
  const parentTitle = titleOf(tree.nodes.get(node.parent)), targetTitle = titleOf(state.target);
  return '\u201c' + from + '\u201d is not an element of \u201c' + parentTitle + '\u201d, the plateau \u201c' + targetTitle + '\u201d builds on (a layer in between removed it): replaces is read against that plateau, so the entry would name nothing there. ' +
    'Compare \u201c' + targetTitle + '\u201d with \u201c' + parentTitle + '\u201d, or write the entry in the layer that still has \u201c' + from + '\u201d (a plateau that overrides one that holds it); nothing was written.';
}

/**
 * Why a pair of the Changes panel cannot be written (wave 019, run 0139, issue #138): its own `from` the layer cannot hold (`replacesLayerProblem`, the sentence of #130), else
 * the merge it is part of cannot be written whole (`replacesMergeProblem`). Null when it can. The button of the pair is off with it, and `acceptLayeredCandidate` refuses with it.
 */
function candidateLayerProblem(candidate, state) {
  return replacesLayerProblem(candidate.layer || 'application', candidate.from, state) || replacesMergeProblem(candidate, state);
}

/**
 * A merge is written one pair at a time (one `from` per click on *Write replaces*): every pair is checked before the first is written, and the merge is refused as a whole
 * when the layer cannot hold one of its `from` (wave 019, run 0139, issue #138, decision T4), so that no merge is left half-written. The merge of a pair is the open pairs of
 * the comparison (not set aside with *Not related*) of its layer and its `to`, when there are two `from` or more. Returns the sentence, which names the new element, what it
 * merges, the first `from` the layer cannot hold with the reason of #130 and what to do, or null (no merge, or every `from` of it is held). A split has one `from` for all its
 * pairs, so they are already all refused or all allowed.
 */
function replacesMergeProblem(candidate, state) {
  if (!state) return null;
  const layer = candidate.layer || 'application';
  const froms = [String(candidate.from)];
  for (const other of openCandidatesOf(state)) {
    if ((other.layer || 'application') === layer && String(other.to) === String(candidate.to) && !froms.includes(String(other.from))) froms.push(String(other.from));
  }
  if (froms.length < 2) return null;
  froms.sort(compareCodePoints);
  for (const from of froms) {
    const problem = replacesLayerProblem(layer, from, state);
    if (!problem) continue;
    const named = froms.map((reference) => '“' + reference + '”');
    return '“' + candidate.to + '” would merge ' + named.slice(0, -1).join(', ') + ' and ' + named[named.length - 1] + ', which is written one pair at a time, so every pair is checked before the first is written: ' +
      problem.replace(/; nothing was written\.$/, '') + '. If a pair is no part of the merge, set it aside with “Not related”; nothing was written.';
  }
  return null;
}

/**
 * *Add replaces* of the inspection (wave 019, run 0139, issue #138, decision T4): the reference typed is checked as *Write replaces* checks a pair (`replacesLayerProblem`, #130),
 * against the comparison on screen when the plateau drawn, whose element the form edits, is its more recent plateau (with the future the plateau drawn is the base: the entry
 * is not about that comparison). Returns the sentence, or null: no comparison, one layer apart, a workspace with no plateau, which write as before.
 */
function addReplacesLayerProblem(record, reference) {
  const state = comparisonState();
  if (!state || state.future || !state.target || !state.base) return null;
  return replacesLayerProblem(record.layer || 'application', reference, state);
}

/** The list `replaces` becomes when `reference` is added to it: appended, and not twice. */
function replacesWith(current, reference) {
  if (current !== undefined && current !== null && !Array.isArray(current)) throw new Error('The replaces of this element is not a list; fix it in the file, nothing was written.');
  const list = Array.isArray(current) ? current.slice() : [];
  if (!list.some((entry) => String(entry) === String(reference))) list.push(reference);
  return list;
}

/** "Not related": the pair is set aside for this page (memory only; the kernel is not told and nothing is written). */
function dismissCandidate(candidate) {
  const state = comparisonState();
  if (!state || !state.records) return;
  candidateMessage = null;
  dismissedCandidates.add(candidateKey(state, candidate));
  render();
}

/** "Show again": the pairs set aside for the plateaus compared come back. */
function restoreCandidates() {
  const state = comparisonState();
  if (!state || !state.records) return;
  candidateMessage = null;
  for (const candidate of state.candidates || []) dismissedCandidates.delete(candidateKey(state, candidate));
  render();
}

/** The Changes tab while the comparison is still being read (the kernel loads with the first drawing): the panel is there, the list follows. */
function renderChangesPendingHtml() {
  return '<div class="changes-panel" data-changes-panel data-pending><div class="inspection-head"><h3>Changes</h3></div><p class="muted">Reading the comparison&hellip;</p></div>';
}

// ---- The right-hand panel with a comparison on: Selected | Changes ----

/** The panel was drawn while the kernel was not loaded: the first drawing fills it (`refreshRightPanel`). */
let rightPanelPending = false;

/** The selection of the page, whole: what the Changes tab is a pick over. */
function rightPanelStamp() {
  return JSON.stringify([AppState.selection, removedPick ? [removedPick.reference, removedPick.layer] : null]);
}

/** A comparison is on and can be listed (or is being read): the Map and Elements keep a right-hand panel for it. */
function comparisonPanelOn() {
  const state = comparisonState();
  return !!state && !state.problems && (mapIsShown() || currentPerspective === 'elements' || currentPerspective === 'plateaus');
}

/**
 * The inner HTML of the right-hand panel when a comparison is on: the inspection (`selectedHtml`, null when nothing is selected) and the Changes panel
 * as two tabs; the Changes panel alone when nothing is selected. Without a comparison it is `selectedHtml` itself.
 */
function withChangesPanel(selectedHtml) {
  const state = comparisonState();
  rightPanelPending = false;
  if (!state || state.problems) return selectedHtml;
  rightPanelPending = !!state.pending;
  const changes = state.pending ? renderChangesPendingHtml() : renderChangesPanelHtml(state);
  if (selectedHtml === null) return changes;
  const showChanges = changesTabPick !== null && changesTabPick.stamp === rightPanelStamp();
  const tab = (id, label, on) => '<button type="button" data-action="set-right-tab" data-tab="' + id + '" aria-pressed="' + on + '">' + label + '</button>';
  return '<div class="right-tabs button-group" role="group" aria-label="Right panel">' + tab('selected', 'Selected', !showChanges) +
    tab('changes', 'Changes' + (state.pending ? '' : ' <span class="field-count">' + state.changes.length + '</span>'), showChanges) + '</div>' + (showChanges ? changes : selectedHtml);
}

/** After a drawing (the kernel is loaded now), or when the selection dropped by itself: the panel is written again from the state. */
function refreshRightPanel() {
  if (currentPerspective === 'library') return;
  const panel = document.getElementById('panel-right');
  if (!panel) return;
  const html = currentPerspective === 'plateaus' ? withChangesPanel(null) : renderInspectionHtml(mapIsShown());
  if (html !== null) panel.innerHTML = html;
}

/** The Selected | Changes tabs: the Changes tab shows the list while the selection is what it is now. */
function setRightTab(tab) {
  if (currentPerspective === 'library') { // the page Stories has its own pair of tabs: View | Changes
    libraryRightTab = tab === 'changes' ? 'changes' : 'view';
    scrollChangesToSelection = tab === 'changes';
    render();
    return;
  }
  changesTabPick = tab === 'changes' ? { stamp: rightPanelStamp() } : null;
  scrollChangesToSelection = tab === 'changes';
  render();
}

/** The Changes tab was just opened: the row of the selection is brought into view in the list (a long list opens at its top otherwise). */
let scrollChangesToSelection = false;

/** The map must draw the element for a click on a row to show it: what encloses it is opened (the choices of the user, a pin or a hidden element, stay). */
function openOnMap(reference) {
  const parts = String(reference).split('.');
  const opened = currentMapOpened();
  for (let i = 1; i < parts.length; i++) opened.add(parts.slice(0, i).join('.'));
}

/**
 * A click on a row of the list selects the thing as a click on its box or its link does, and shows it: on the Map its enclosing boxes are opened and the
 * view is centred on it (Center); a removed element opens the read-only panel of run 0039; a relationship selects its link. The page Plateaus, and Stories when its
 * page draws no view, show no element: the row opens it in Elements. On the page of a view in Stories the thing is selected on the page itself.
 * `row`: `{ thing, change, layer, ref, to, label }` (the attributes of the button). `options.keepList` (Next change, Previous change, a filter that moves the selection): the list
 * stays on screen, and the row is brought into view in it, instead of the panel of the selection taking its place.
 */
function selectChange(row, options) {
  const keepList = !!(options && options.keepList);
  const layer = row.layer || 'application';
  const done = () => { // the selection is made: where the reader is in the list, the tab, the row in view, and the page drawn
    changesWalk = { key: changeKey(row.thing, layer, row.ref, row.to, row.label), selection: null };
    changesTabPick = keepList ? { stamp: rightPanelStamp() } : null; // the new selection is what the panel shows; the Changes tab is one click away
    if (currentPerspective === 'library') libraryRightTab = keepList ? 'changes' : 'view';
    scrollChangesToSelection = keepList;
    render();
    changesWalk.selection = changesSelectionStamp();
  };
  if (currentPerspective === 'library' && changeSelectionIsShown()) { // the page of a view: the thing is selected on the page, its address and the Map's selection stay
    candidateMessage = null;
    removedPick = null;
    const removed = row.thing === 'element' && elementIsOnlyInTheOtherPlateau(layer, row.ref, row.change);
    libraryPickFor(selectedViewId).selection = removed ? { kind: 'baseline-element', key: row.ref, layer, mode: 'view' }
      : row.thing === 'relationship' ? linkSelectionFor(row.ref, row.to, layer, null, null)
      : { kind: 'element', key: row.ref, layer, mode: 'view' };
    const canvas = document.getElementById('diagram-canvas');
    if (canvas && diagramScale === 'auto') takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
    done();
    if (!keepList) bringLibrarySelectionIntoSight();
    return;
  }
  if (currentPerspective === 'plateaus' || currentPerspective === 'library') { // these pages list the changes and show no element: the row opens it in Elements
    history.pushState(null, '', location.href); // the page that was left is an entry of the history: the next address rewrites this one
    currentPerspective = 'elements';
    useDiagramHost('main');
  }
  if (rawYamlEditDraft) rawYamlEditDraft = null; // DEC-10/FLOW-4: a selection is never the draft's file
  if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
  candidateMessage = null;
  if (mapIsShown() && layer !== mapLayer()) { // a row of the other layer: the Map of that layer is the page that draws it
    history.pushState(null, '', location.href);
    currentPerspective = layer === 'technology' ? 'environments' : 'map';
  }
  const onMap = mapIsShown();
  if (onMap) diagramScale = 'auto'; // Center: the thing is put in the middle
  if (row.thing === 'element' && elementIsOnlyInTheOtherPlateau(layer, row.ref, row.change)) {
    if (onMap) openOnMap(row.ref);
    if (onMap) AppState.selection = { kind: 'none', key: null, mode: 'view' };
    removedPick = { reference: row.ref, layer, selection: JSON.stringify(AppState.selection) };
    done();
    return;
  }
  removedPick = null;
  if (row.thing === 'relationship' && onMap) {
    openOnMap(row.ref);
    openOnMap(row.to);
    AppState.selection = linkSelectionFor(row.ref, row.to, layer, null, null);
    revealLinkAfterDrawing = { nth: null };
    diagramLinkStop = null;
    done();
    return;
  }
  if (onMap) openOnMap(row.ref);
  AppState.selection = { kind: 'element', key: row.ref, layer, mode: 'view' };
  expandAncestorsOf(row.ref, layer); // the trees show it
  scrollNavToSelection = true;
  // in Elements a relationship is selected by the element that declares it, and its link when that element is drawn as a diagram
  if (row.thing === 'relationship' && diagramTabShown()) AppState.selection = linkSelectionFor(row.ref, row.to, layer, null, row.ref);
  done();
}

/** Some node of the technology layer hosts the application: the Map of that layer can draw it. */
function applicationIsDeployed(reference) {
  for (const record of AppState.index.technology.values()) if (kernelStringsOf(record.applications).includes(reference)) return true;
  return false;
}

/** After each drawing of the Map: say, in the panel, when the selected element is not on the map as it is drawn now. */
function markInspection() {
  const note = document.getElementById('inspection-offmap');
  const holder = document.querySelector('[data-inspection-ref]');
  if (!note || !holder) return;
  note.hidden = mapElementIsOnMap(holder.getAttribute('data-inspection-ref'), holder.getAttribute('data-inspection-layer')) !== false;
}

/** The Map dropped its selection by itself: the panel goes with it, with its handle (the page is not redrawn). */
function removeInspectionPanel() {
  document.querySelectorAll('#panel-right, [data-resize="panel-right"]').forEach((el) => el.remove());
}

// ---- A link of a diagram is selected: the pair of boxes it joins ----
// A link selection is `{ kind: 'link', key, from, to, layer, mode: 'view' }`, plus `focal` when it was made on
// the diagram of an element in Elements: there the selection *is* the element looked at (the centre, the tree and the URL
// read it), so the element stays the subject and everything that asks which element a perspective is about reads
// `elementSelection()`. On the Map a link selection has no element, and is read as "no element selected".

/** The selection as the places that care about the element being looked at read it: a link selected in Elements is that element. */
function elementSelection() {
  const sel = AppState.selection;
  if (!sel || sel.kind !== 'link' || !sel.focal) return sel;
  // the layer of the drawing is the layer of the element it is about
  return sel.layer ? { kind: 'element', key: sel.focal, layer: sel.layer, mode: 'view' } : { kind: 'element', key: sel.focal, mode: 'view' };
}

/** The link is no longer selected: the element it was made on (Elements), or nothing (the Map). */
function dropLinkSelection() {
  const sel = AppState.selection;
  if (!sel || sel.kind !== 'link') return;
  AppState.selection = sel.focal ? elementSelection() : { kind: 'none', key: null, mode: 'view' };
}

/**
 * Start of every render(): a link stays selected only while the diagram it was made on is on screen: the Map for one of the
 * Map, a diagram tab of that very element for one of Elements. Any other perspective, Details, the edit form or a deleted
 * element ends it. This is the one place that says "a link selection is cleared on navigation"; the handlers that replace
 * the selection (a box, a tree row, a file) end it by replacing it.
 */
function settleLinkSelection() {
  const sel = AppState.selection;
  if (!sel || sel.kind !== 'link') { revealLinkAfterDrawing = false; return; }
  if (!(sel.focal ? diagramTabShown() : mapIsShown())) { dropLinkSelection(); revealLinkAfterDrawing = false; }
}

/**
 * A link was just selected (a click on the Map, or an address that carries one): the next drawing brings it into view. Only
 * then, never on a redraw (a facet, a fold) of a link that has been selected for a while: selecting must not move the view of
 * someone who is reading it. `revealSelectedLink` consumes it. It is false, or `{ nth }`: the position (`data-nth`) of the
 * link that was clicked among the twins of its pair, which is the one to show (positions are those of the drawing the click
 * was made on, and the first drawing after it is that one), or null (an address does not say: the first link of the pair).
 */
let revealLinkAfterDrawing = false;

/**
 * After the drawing is on screen: pan the view, by the least it takes, so that the selected link is inside the canvas (the
 * panel that appeared with the selection has narrowed it, and the link may now be behind its edge; an address can name a link
 * the opening view does not show). A link already in view is left where it is. Several links between the two boxes: the one
 * that was clicked (`data-nth`), else the first.
 */
function revealSelectedLink(canvas) {
  const request = revealLinkAfterDrawing;
  revealLinkAfterDrawing = false;
  const sel = AppState.selection;
  if (!request || sel.kind !== 'link' || !canvas || !canvas.querySelectorAll) return;
  const links = Array.from(canvas.querySelectorAll('.dg-link')).filter((el) => el.getAttribute('data-from') === sel.from && el.getAttribute('data-to') === sel.to);
  const clicked = request.nth === null || request.nth === undefined ? undefined : links.find((el) => el.getAttribute('data-nth') === String(request.nth));
  const target = clicked || links[0];
  if (target) revealDiagramNode(target);
}

/** What the drawing on screen drew for the selected link: the pair of boxes (ends, links), or null (nothing drawn yet, or not in it). */
function inspectionLinkFor(sel) {
  if (!sel || sel.kind !== 'link') return null;
  const pairs = diagramScene && diagramScene.links;
  return (pairs && pairs.find((pair) => pair.from === sel.from && pair.to === sel.to)) || null;
}

/** The declared relationships of one link of a pair, in the order the kernel lists them (a link the kernel gives none for, a ghost, speaks for itself). */
function relationshipsOfLink(link, pair) {
  const own = Array.isArray(link.relationships) ? link.relationships : [];
  return own.length ? own : [{ from: pair.fromEnd.reference, destination: pair.toEnd.reference, label: link.label, qualifiers: link.qualifiers, tags: link.tags, unresolved: !!link.ghost }];
}

/** What makes two relationships the same one: who declares it, to whom, and what it says. */
function relationshipKeyOf(rel) {
  return JSON.stringify([rel.from, rel.destination, rel.label, rel.qualifiers, rel.tags]);
}

/** The declared relationships of a pair, once each, in the order the kernel lists them. */
function relationshipsOfPair(pair) {
  const rels = [];
  const seen = new Set();
  for (const link of pair.links) {
    for (const rel of relationshipsOfLink(link, pair)) {
      const key = relationshipKeyOf(rel);
      if (seen.has(key)) continue;
      seen.add(key);
      rels.push(rel);
    }
  }
  return rels;
}

/** One end of a link, for the panel: its name and kind, its reference when that differs, and what a folded box hides. */
function renderLinkEndHtml(end) {
  let html = '<span class="inspection-end-name">' + escapeHtml(end.title) + '</span>' + (end.sub ? ' <span class="muted">' + escapeHtml(end.sub) + '</span>' : '');
  if (end.reference !== end.title) html += '<br><span class="muted">' + escapeHtml(end.reference) + '</span>';
  return html;
}

/**
 * The declaring element of a relationship, as a button that selects it like a box of the diagram does (`goto-element`, with the
 * layer of the drawing). Plain text when the drawing's layer has no such element (the name stays readable, nothing to open).
 */
function renderDeclaringElementHtml(reference, layer) {
  if (layerOfReference(reference, layer) !== layer) return escapeHtml(reference);
  return renderReferenceLinkHtml(reference, layer, 'the element that declares this relationship');
}

/** One declared relationship: its label, who declares it (a button) and to whom, its qualifiers and its tags; `marked`: it belongs to the link that was clicked. */
function renderRelationshipInspectionHtml(rel, layer, marked) {
  const label = rel.label !== undefined && rel.label !== null && String(rel.label).trim() ? escapeHtml(rel.label) : '<span class="muted">no label</span>';
  return '<div class="inspection-rel' + (marked ? ' inspection-rel-marked' : '') + '"><div class="inspection-rel-label">' + label +
    (marked ? '<span class="inspection-rel-mark">Clicked link</span>' : '') + '</div>' +
    '<div class="inspection-rel-path">' + renderDeclaringElementHtml(rel.from, layer) + ' &rarr; ' + escapeHtml(rel.destination) + '</div>' +
    renderRelationshipChangeHtml(rel, layer) +
    renderFieldRowHtml('Qualifiers', renderQualifierPillsHtml(rel.qualifiers)) +
    renderFieldRowHtml('Tags', renderTagListHtml(rel.tags)) +
    (rel.unresolved ? '<p class="inspection-note">There is no element &ldquo;' + escapeHtml(rel.destination) + '&rdquo;: the relationship points at nothing.</p>' : '') +
    '</div>';
}

/** The panel of a selected link: its two ends, then each relationship it stands for. */
function renderLinkInspectionHtml(sel) {
  const layer = sel.layer || 'application';
  let html = '<div class="inspection inspection-link" data-inspection-from="' + escapeHtml(sel.from) + '" data-inspection-to="' + escapeHtml(sel.to) + '" data-inspection-layer="' + escapeHtml(layer) + '">' +
    '<div class="inspection-head"><h3>Selected link</h3>' +
    '<button type="button" class="inspection-close" data-action="close-inspection" aria-label="Close the panel" title="Deselect the link">&times;</button></div>';
  const pair = inspectionLinkFor(sel);
  if (!pair) return html + '<p class="inspection-note">Reading the link&hellip;</p></div>';
  html += renderFieldRowHtml('From', renderLinkEndHtml(pair.fromEnd)) + renderFieldRowHtml('To', renderLinkEndHtml(pair.toEnd));
  for (const end of [pair.fromEnd, pair.toEnd]) {
    if (end.collapsed) html += '<p class="inspection-note">&ldquo;' + escapeHtml(end.title) + '&rdquo; is folded: it stands for ' + end.hidden + ' hidden element' + (end.hidden === 1 ? '' : 's') + '. Open it to see their relationships one by one.</p>';
  }
  const rels = relationshipsOfPair(pair);
  html += renderLinkChangeHtml(rels); // a comparison: the state of the link, from the relationships it groups
  // several links between the same two boxes: the relationships of the one that was clicked are marked (when they can be told from the others)
  const clickedKeys = new Set(Array.isArray(sel.via) ? sel.via : []);
  const marked = pair.links.length > 1 ? rels.map((rel) => clickedKeys.has(relationshipKeyOf(rel))) : rels.map(() => false);
  const told = marked.some(Boolean) && !marked.every(Boolean);
  if (pair.links.length > 1) {
    html += '<p class="inspection-note">' + pair.links.length + ' links join these two boxes, with ' + rels.length + (rels.length === 1 ? ' relationship' : ' relationships') + ' in all.' +
      (told ? ' The relationships of the link you clicked are marked.' : '') + '</p>';
  } else if (rels.length > 1) {
    html += '<p class="inspection-note">' + rels.length + ' relationships are grouped in this link.</p>';
  }
  html += '<h4 class="inspection-subhead">Relationships <span class="field-count">' + rels.length + '</span></h4>' +
    rels.map((rel, i) => renderRelationshipInspectionHtml(rel, layer, told && marked[i])).join('');
  html += renderFieldRowHtml('Layer', escapeHtml(layer));
  return html + '</div>';
}

/** After a drawing, with a link selected: the panel says what this drawing drew (a facet may have removed some relationships). */
function refreshInspection() {
  const onPage = currentPerspective === 'library';
  if (!onPage && comparisonPanelOn()) { refreshRightPanel(); return; } // run 0040: the panel also holds the Changes tab: it is written again whole
  const holder = document.querySelector('.inspection');
  if (!holder) return; // nothing on screen to refresh (maximized)
  const html = diagramMaximized ? null : inspectionPanelHtml(diagramSelection(), onPage ? 'library' : mapIsShown() ? 'map' : 'elements');
  if (html !== null) holder.outerHTML = html;
  else if (onPage) { const section = document.querySelector('.library-selection'); if (section) section.remove(); } // the panel of the page stays: only its selection goes
  else removeInspectionPanel();
}

/**
 * After the drawing was put on screen: a selected link that this drawing does not have (a fold, a pin, a facet, another tab,
 * a drawing with no links at all) is no longer selected. Like the Map's own clear of an element, it is done by hand and the
 * page is not redrawn: the Map has nothing else that depends on a link selection but the panel, which goes with its handle;
 * Elements goes back to the panel of its element. Anything added to the Map that depends on a link selection must be undone here.
 */
function reconcileLinkSelection() {
  const sel = diagramSelection();
  if (sel.kind !== 'link') return;
  if (!inspectionLinkFor(sel)) {
    if (currentPerspective === 'library') {
      libraryPickFor(selectedViewId).selection = null; // the page's own selection: nothing of the Map's, nor the address, is involved
    } else {
      dropLinkSelection();
      syncHashFromState();
    }
  }
  refreshInspection();
}

/** The pair of the selected link is outlined, and the links of the diagram say whether they are the selected one. */
function markLinkSelection() {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas) return;
  const sel = diagramSelection();
  canvas.querySelectorAll('.dg-link, .dg-label').forEach((el) => {
    const selected = sel.kind === 'link' && el.getAttribute('data-from') === sel.from && el.getAttribute('data-to') === sel.to;
    el.classList.toggle('dg-link-selected', selected);
    if (el.classList.contains('dg-link')) el.setAttribute('aria-pressed', String(selected));
  });
}

/**
 * Elements perspective — navigate Elements on the left, view/edit/create
 * in the center. The right region holds the inspection panel while a diagram of the element is shown (the Details page
 * says the same things itself); the bottom one is unused. A `null` region is not rendered at all (see renderShellHtml):
 * hidden, not a disabled placeholder.
 */
function renderElementsPerspectiveHtml() {
  return {
    left: diagramMaximized && diagramTabShown() ? null : renderLeftPanelWrapperHtml(renderElementsNavHtml(true)),
    center: renderCenterPanelHtml(),
    right: diagramTabShown() || comparisonPanelOn() ? renderInspectionHtml(false) : null, // Details and the forms say the same, or are being edited; a comparison keeps the Changes panel
    bottom: null
  };
}

// ---- Plateaus: the page of the band (wave 014, run 0081, W-7, then called Timeline; renamed by wave 015, run 0096, W-8) ----
// The band under the top bar is always there; this page is where the plateaus are read as a list: what each is called, what it overrides, where it is written, how
// many patches and files it has, and what it changes over the plateau it overrides (the counts of `archicode diff`). W-8 writes plateaus from here.

/**
 * The plateau a manifest belongs to, as the pages tell it: a manifest of kind Plateau is the plateau it declares (its `id`), any other the plateau its header names, else
 * `baseline`. Null for a file the editor could not read, which belongs to none.
 */
function filePlateauOf(mf) {
  if (!mf || mf.error || !mf.header) return null;
  if (manifestKindName(mf.header.kind) === 'plateau') return mf.content && !readIsMissing(mf.content.id) ? String(mf.content.id) : null;
  return plateauOfManifest(mf);
}

/** The Plateaus page mounts no diagram, so nothing else asks for the kernel that its Changes panel waits for (`rightPanelPending`): it is loaded, and the panel is written again. */
function settlePlateausPanel() {
  if ((currentPerspective !== 'plateaus' && currentPerspective !== 'library') || !rightPanelPending) return;
  const page = currentPerspective;
  loadViewpointKernel().then(() => {
    if (currentPerspective !== page) return;
    if (page === 'plateaus') refreshRightPanel();
    else render(); // Stories: its panel and its tabs are written again with the list (the drawing of a view is kept in its cache)
  }).catch((e) => console.error('ArchiCode: the viewpoint kernel could not be loaded, the changes are not listed', e));
}

/** The Timeline perspective's regions: the list of the plateaus in the center, and — with a comparison on — the Changes panel on the right. */
function renderPlateausPerspectiveHtml() {
  return {
    left: null,
    center: renderPlateausPageHtml(),
    right: comparisonPanelOn() ? withChangesPanel(null) : null,
    rightLabel: 'Changes',
    bottom: null
  };
}

/** The changes a plateau brings over the one it overrides, as the chips of the Changes panel: elements, then relationships. A word when they are not counted (yet). */
function timelineChangesHtml(id) {
  const node = AppState.plateauTree.nodes.get(id);
  if (node.parent === null) return '<span class="muted">The root: it overrides nothing.</span>';
  const counts = cachedNodeCounts(id);
  if (counts === undefined) return '<span class="muted">Counting…</span>'; // `schedulePlateauCounts` computes them one plateau per turn and writes them here (see its step)
  if (!counts) return '<span class="muted">Not counted: the plateau or the one it overrides has mistakes.</span>';
  const group = (title, c) => '<span class="timeline-count-group" data-counts-of="' + title.toLowerCase() + '"><span class="changes-count-label">' + title + '</span>' +
    CHANGE_STATES.filter((name) => c[name] !== undefined).map((name) => changeChipHtml(name, c[name])).join('') + '</span>';
  return group('Elements', counts.elements) + group('Relationships', counts.relationships);
}

/** The files and patches a plateau has, and where it is written, in a few words. */
function timelineFactsHtml(item) {
  const node = item.node;
  const files = AppState.manifestFiles.filter((mf) => filePlateauOf(mf) === item.id && !(node.manifest && mf.relPath === node.manifest)).length;
  const source = item.id === BASELINE_PLATEAU && !node.manifest ? 'the root, implied'
    : node.manifest ? 'described in <code>' + escapeHtml(node.manifest) + '</code>'
    : 'exists only through the <code>plateau</code> key of ' + (node.headers.length === 1 ? 'a header' : node.headers.length + ' headers');
  return (node.parent !== null ? 'overrides <code>' + escapeHtml(node.parent) + '</code> · ' : '') + source + ' · ' +
    node.patches.length + (node.patches.length === 1 ? ' patch' : ' patches') + ' · ' + files + (files === 1 ? ' file' : ' files');
}

function timelineItemHtml(item, depth) {
  const layers = AppState.layers;
  const model = layerPlateauModel(item.id);
  const drawn = item.id === layers.current;
  const disabled = layers.blocked && item.id !== BASELINE_PLATEAU;
  const broken = layerModelBroken(item.id);
  const compared = layers.compare && layers.compare.other === item.id && !!layerCompareOther();
  const parent = item.node.parent !== null;
  return '<li class="timeline-item' + (drawn ? ' timeline-drawn' : '') + (compared ? ' timeline-compared' : '') + '" data-plateau="' + escapeHtml(item.id) + '" style="--depth:' + Math.min(depth, 6) + '">' +
    '<div class="timeline-main"><button type="button" class="timeline-name" data-action="timeline-draw" data-plateau="' + escapeHtml(item.id) + '" aria-pressed="' + drawn + '"' + (drawn ? ' aria-current="true"' : '') + (disabled ? ' disabled' : '') +
      ' title="Draw this plateau in the whole editor">' + escapeHtml(plateauTitle(model)) + '</button>' +
      (plateauTitle(model) !== item.id ? '<code class="timeline-id">' + escapeHtml(item.id) + '</code>' : '') + // a plateau with no name is called by its id: once is enough
      (item.node.horizon ? '<span class="timeline-horizon">' + escapeHtml(item.node.horizon) + '</span>' : '') +
      (drawn ? '<span class="timeline-state">drawn</span>' : '') + (compared ? '<span class="timeline-state">compared</span>' : '') +
      (broken ? '<span class="band-flag" role="img" aria-label="has mistakes" title="' + escapeHtml(broken[0]) + '">!</span>' : '') + '</div>' +
    '<div class="timeline-facts">' + timelineFactsHtml(item) + '</div>' +
    '<div class="timeline-changes">' + timelineChangesHtml(item.id) + '</div>' +
    (!layers.blocked || parent ? '<div class="timeline-actions">' +
      (parent && !disabled ? '<button type="button" data-action="timeline-changes" data-plateau="' + escapeHtml(item.id) + '" title="Draw this plateau and list what it changes over ' + escapeHtml(item.node.parent) + ' in the Changes panel">Changes</button>' : '') +
      (!layers.blocked ? '<button type="button" data-action="plateau-create" data-plateau="' + escapeHtml(item.id) + '" title="Create a plateau that overrides ' + escapeHtml(plateauTitle(model)) + '">New plateau after this</button>' +
        (AppState.plateauTree.layered ? '<button type="button" data-action="plateau-edit" data-plateau="' + escapeHtml(item.id) + '" title="Rename this plateau, give it a horizon or another parent">Edit</button>' : '') +
        (AppState.plateauTree.layered && parent ? plateauDeleteButtonHtml(item.id, 'Delete', saveInFlight ? ' disabled' : '') : '') : '') +
      '</div>' : '') +
    '</li>';
}

/** The list of the plateaus, the tree of the band flattened in its order, each indented by its depth. */
function timelineListHtml() {
  const root = bandTreeOf(AppState.plateauTree);
  if (!root) return '';
  const rows = [];
  const walk = (item, depth) => { rows.push(timelineItemHtml(item, depth)); item.children.forEach((child) => walk(child, depth + 1)); };
  walk(root, 0);
  return '<ol class="timeline-list" aria-label="Plateaus">' + rows.join('') + '</ol>';
}

function renderPlateausPageHtml() {
  const header = renderElementHeaderHtml('<h2>Plateaus</h2>', '');
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  let body = '';
  if (layers && tree) {
    const writing = plateauWritingHtml();
    const drawn = layerPlateauModel(layers.current);
    const other = layerCompareOther();
    const status = other ? plateauTitle(drawn) + ' is compared with ' + plateauTitle(other) + (comparisonPanelOn() ? ': the Changes panel on the right lists what differs.' : ', but the two cannot be compared: the diagram of Applications says why.')
      : tree.layered ? plateauTitle(drawn) + ' is drawn. “Changes” draws a plateau and lists what it changes over the plateau it overrides.' : '';
    body = (tree.layered ? '' : '<p class="timeline-note">This workspace has one plateau, <code>baseline</code>. A plateau is a layer over another one: the manifests that say <code>plateau: &lt;id&gt;</code> in their header belong to it, ' +
        'and a manifest of kind <code>archicode.morin.io/plateau</code> gives it a name, a horizon, the plateau it overrides and its patches (see the manual).</p>') +
      (layers.blocked || status ? '<p class="timeline-status" role="status">' + escapeHtml(layers.blocked ? layers.blocked : status) + '</p>' : '') +
      (writing ? '<div class="timeline-writing" aria-label="Edit the plateaus">' + writing + '</div>' : '') + timelineListHtml();
  }
  return '<div class="timeline-view">' + header + '<div class="timeline-body">' + body + '</div></div>';
}

/** The Changes button of the Plateaus page: draw the plateau and compare it with the plateau it overrides, in one step. */
function showPlateauChanges(id) {
  const layers = AppState.layers;
  if (!layers || !AppState.workspace || !AppState.plateauTree || !AppState.plateauTree.nodes.has(id) || layers.blocked) return;
  const node = AppState.plateauTree.nodes.get(id);
  if (node.parent === null) return;
  layers.current = id;
  layers.compare = { mode: 'past', other: node.parent, chosen: false };
  rememberLayerChoice();
  settleAfterLayerChange();
}

/**
 * Files perspective — navigate manifest files on the left, raw-YAML edit
 * (its own header: file name, Save, Reload) in the center. Right/bottom
 * unused/hidden, same as Elements.
 */
function renderFilesPerspectiveHtml() {
  const sel = AppState.selection;
  return {
    left: renderLeftPanelWrapperHtml(renderFilesNavHtml()),
    center: sel.kind === 'file' ? renderFileViewHtml(sel.key) : '<div class="center-placeholder">Select a file on the left.</div>',
    right: null,
    bottom: null
  };
}

