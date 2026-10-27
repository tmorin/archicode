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

