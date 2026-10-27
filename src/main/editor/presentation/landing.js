// =====================================================================
// Landing screen — everything shown before a workspace is open
// =====================================================================

const LANDING_ICON_BRAND =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="2"/><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><rect x="10" y="10" width="4" height="4" rx="1"/></svg>';
const LANDING_ICON_FOLDER =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.5h8.8A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>';
const LANDING_SAVE_NOTE = 'Nothing is written to disk until you click “Save all changes”.';
const BROWSER_SAVE_NOTE = 'Nothing is stored in this browser until you click “Save all changes”.';

/**
 * Whether the page can hold a workspace at all (TDD DEC-4): the browser picks folders, the page is served by `archicode editor serve`, or the
 * browser workspace store opened (`browserStoreState` is 'ready'). `isFolderAccessAvailable()` keeps meaning folders only.
 */
function canKeepWorkspace() {
  return isFolderAccessAvailable() || browserStoreState === 'ready';
}

/**
 * Which landing card (if any) the current state calls for; null once a
 * workspace is open. Pure function of AppState/landingBusy so every state can
 * be rendered and checked without a browser.
 */
function landingScreenConfig() {
  if (!canKeepWorkspace()) {
    if (landingBusy && !AppState.workspace) return { kind: 'busy', busy: landingBusy }; // the page is still asking the browser (startPage)
    const reason = browserStoreState && browserStoreState.failed ? ' (' + browserStoreState.failed + ')' : '';
    return {
      kind: 'unsupported',
      title: 'This browser isn’t supported',
      text:
        'This browser does not allow the editor to keep a workspace here' +
        reason +
        '; a private window may do that. Run `archicode editor serve` in your workspace folder and open the page it serves: ' +
        'that works in any browser.'
    };
  }
  if (AppState.workspace) return null;
  if (landingBusy) return { kind: 'busy', busy: landingBusy };
  const folderName = AppState.folder ? AppState.folder.name : null;
  const inBrowser = !!(AppState.folder && AppState.folder.browserWorkspace);
  if (AppState.fatalError) {
    const unreadable = AppState.fatalErrorKind === 'unreadable'; // the type, not a file name found in the text (#146)
    return {
      kind: 'error',
      title: 'Can’t open this workspace',
      text:
        unreadable && folderName ? '.archicode.yaml could not be read in “' + folderName + '”.' : AppState.fatalError,
      error: unreadable ? AppState.fatalError : null,
      hint: unreadable
        ? inBrowser
          ? 'Make sure the file is valid YAML, or delete the workspace from the list.'
          : 'Choose the workspace root — the folder that contains .archicode.yaml — and make sure the file is valid YAML.'
        : null,
      // a browser workspace is no folder: the way out is the list (CTR-3)
      actions: (inBrowser
        ? [{ label: 'Back to the list', action: 'show-folders', primary: true }]
        : [{ label: 'Choose another folder', action: 'open-folder', primary: true, icon: LANDING_ICON_FOLDER }]
      )
        .concat(folderName ? [{ label: 'Try again', action: 'retry-folder' }] : [])
        .concat(
          !inBrowser && landingFolderRows().length > 0 ? [{ label: 'Remembered folders', action: 'show-folders' }] : []
        )
    };
  }
  if (!AppState.folder) {
    const folders = isFileSystemAccessSupported();
    const browser = browserStoreState === 'ready' && !isServedByArchiCode();
    const actions = [];
    if (browser) {
      actions.push({
        label: 'New workspace in this browser',
        action: 'new-browser-workspace',
        primary: !folders,
        icon: LANDING_ICON_FOLDER
      });
    }
    if (folders) {
      actions.push({
        label: 'Open workspace folder',
        action: 'open-folder',
        primary: !browser,
        icon: LANDING_ICON_FOLDER
      });
    }
    const notes = [];
    if (folders) notes.push('Choose the folder that contains .archicode.yaml. ' + LANDING_SAVE_NOTE);
    if (browser) notes.push(BROWSER_SAVE_NOTE);
    const card = {
      kind: 'first-launch',
      title: 'Open a workspace',
      text: folders
        ? 'Edit the elements, relationships, views and settings of an ArchiCode workspace, straight from its folder.' +
          (browser ? ' Or keep a workspace in this browser, without choosing a folder.' : '')
        : 'Edit the elements, relationships, views and settings of an ArchiCode workspace. Your workspaces are kept in this browser, on this device.',
      notice: landingNotice,
      actions,
      folders: landingFolderRows(),
      note: notes.join(' ')
    };
    if (browser) card.browserRows = landingBrowserRows();
    return card;
  }
  if (AppState.permissionState === 'needs-click') {
    const card = {
      kind: 'reopen',
      title: 'Welcome back',
      text: 'Your browser needs your permission to read “' + folderName + '” again.',
      notice: landingNotice,
      actions: [
        { label: 'Reopen “' + folderName + '”', action: 'reopen-folder', primary: true, icon: LANDING_ICON_FOLDER },
        { label: 'Choose another folder', action: 'open-folder' }
      ],
      folders: landingFolderRows(),
      note: LANDING_SAVE_NOTE
    };
    if (browserStoreState === 'ready' && !isServedByArchiCode()) card.browserRows = landingBrowserRows();
    return card;
  }
  return null;
}

/** A time as the card says it: the reader's own, to the minute; '' for a time that is none. */
function landingTimeText(ms) {
  if (typeof ms !== 'number' || !(ms > 0)) return '';
  try {
    return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return new Date(ms).toISOString();
  }
}

function landingFilesText(count) {
  return count + (count === 1 ? ' file' : ' files');
}

/**
 * The browser workspaces as the landing card lists them (CTR-3): `{ id, title, files, changed, exported, problem }`, derived from
 * `browserWorkspaces`; `exported` is 'never' or a time, `problem` the sentence of a record that cannot be read (only Delete works on its row).
 */
function landingBrowserRows() {
  return browserWorkspaces.map((w) => ({
    id: w.id,
    title: browserWorkspaceTitle(w),
    files: w.fileCount,
    changed: landingTimeText(w.changedAt),
    exported: w.lastExportAt ? landingTimeText(w.lastExportAt) : 'never',
    problem: w.problem || null
  }));
}

/** The name field of *New workspace* and *Rename* (IF-2, IF-3): the typed text and, under it, the sentence of a refusal; Enter and Escape are handled by the page. */
function renderBrowserNameFieldHtml(draft, className) {
  const isNew = draft.for === 'new';
  return (
    '<form class="' +
    className +
    '" data-browser-name-form onsubmit="return false">' +
    '<label class="landing-browser-label">' +
    '<span>' +
    (isNew ? 'Name of the new workspace' : 'New name of the workspace') +
    '</span>' +
    '<input type="text" class="landing-browser-input" data-browser-name maxlength="200" autocomplete="off" spellcheck="false" value="' +
    escapeHtml(draft.text) +
    '"' +
    (draft.problem ? ' aria-invalid="true" aria-describedby="landing-browser-name-problem"' : '') +
    '></label>' +
    '<button type="button" class="btn-primary" data-action="submit-browser-name">' +
    (isNew ? 'Create' : 'Rename') +
    '</button>' +
    '<button type="button" data-action="cancel-browser-name">Cancel</button>' +
    (draft.problem
      ? '<p class="landing-folder-problem" id="landing-browser-name-problem" role="alert">' +
        escapeHtml(draft.problem) +
        '</p>'
      : '') +
    '</form>'
  );
}

/** One workspace of the list: its row, its name field when it is being renamed, or the delete question (DEC-7). */
function renderBrowserRowHtml(row) {
  const named = '“' + row.title + '”';
  const id = escapeHtml(row.id);
  if (landingNameDraft && landingNameDraft.for === row.id)
    return (
      '<li class="landing-folder landing-browser-row">' +
      renderBrowserNameFieldHtml(landingNameDraft, 'landing-browser-edit') +
      '</li>'
    );
  if (landingPendingDelete === row.id) {
    return (
      '<li class="landing-folder landing-browser-row landing-browser-question" role="group" aria-label="' +
      escapeHtml('Delete ' + named + '?') +
      '">' +
      '<p class="landing-browser-ask">Delete ' +
      escapeHtml(named) +
      '? It holds ' +
      landingFilesText(row.files) +
      (row.changed ? ', last changed ' + escapeHtml(row.changed) : '') +
      '. This cannot be undone. Nothing on your disk is touched.</p>' +
      '<button type="button" data-action="cancel-browser-workspace-question">Cancel</button>' +
      '<button type="button" class="landing-browser-delete" data-action="delete-browser-workspace" data-workspace-id="' +
      id +
      '" aria-label="' +
      escapeHtml('Delete ' + named) +
      '">Delete ' +
      escapeHtml(named) +
      '</button>' +
      '</li>'
    );
  }
  const ghost = (action, verb, text) =>
    '<button type="button" class="btn-ghost landing-folder-remove" data-action="' +
    action +
    '" data-workspace-id="' +
    id +
    '" aria-label="' +
    escapeHtml(verb + ' ' + named) +
    '">' +
    text +
    '</button>';
  if (row.problem) {
    return (
      '<li class="landing-folder landing-browser-row">' +
      '<span class="landing-folder-open landing-browser-unreadable"><span class="landing-folder-name">' +
      escapeHtml(row.title) +
      '</span></span>' +
      ghost('ask-delete-browser-workspace', 'Delete', 'Delete') +
      '<p class="landing-folder-problem">This workspace ' +
      escapeHtml(row.problem) +
      '. Delete it from the list.</p>' +
      '</li>'
    );
  }
  return (
    '<li class="landing-folder landing-browser-row">' +
    '<button type="button" class="landing-folder-open" data-action="open-browser-workspace" data-workspace-id="' +
    id +
    '" aria-label="' +
    escapeHtml('Open ' + named) +
    '">' +
    '<span class="landing-folder-name">' +
    escapeHtml(row.title) +
    '</span>' +
    '<span class="landing-folder-dir"><span>' +
    escapeHtml(landingFilesText(row.files) + (row.changed ? ' · changed ' + row.changed : '')) +
    '</span></span>' +
    '<span class="landing-folder-dir"><span>Kept in this browser · Last exported: ' +
    escapeHtml(row.exported) +
    '</span></span>' +
    '</button>' +
    ghost('rename-browser-workspace', 'Rename', 'Rename') +
    ghost('ask-delete-browser-workspace', 'Delete', 'Delete') +
    '</li>'
  );
}

/** The list *In this browser* with the field of *New workspace* above it when it is open (IF-1 to IF-3). */
function renderLandingBrowserHtml(rows) {
  const draft = landingNameDraft && landingNameDraft.for === 'new' ? landingNameDraft : null;
  if (rows.length === 0 && !draft) return '';
  return (
    '<section class="landing-folders landing-browser" aria-labelledby="landing-browser-title">' +
    '<h2 id="landing-browser-title">In this browser</h2>' +
    (draft ? renderBrowserNameFieldHtml(draft, 'landing-browser-edit') : '') +
    (rows.length > 0 ? '<ul class="landing-folder-list">' + rows.map(renderBrowserRowHtml).join('') + '</ul>' : '') +
    '</section>'
  );
}

/**
 * The remembered folders as the landing card lists them (TDD-0020 CTR-2, TDD-0023 CTR-2): `{ id, title, folder,
 * problem, permission }`, `id` being the `data-folder-id` ('' for the legacy one), `title` the workspace's name or the
 * folder's, `folder` the folder's name when it is not the title, `permission` a key of FOLDER_PERMISSION_TEXT or null
 * while not known yet. None in served mode, where the server's folder is the only one.
 */
function landingFolderRows() {
  if (isServedByArchiCode()) return [];
  return rememberedFolders.map((f) => {
    const title = rememberedFolderTitle(f);
    return {
      id: f.id || '',
      title,
      folder: title !== f.handle.name ? f.handle.name : null,
      problem: f.problem || null,
      permission: FOLDER_PERMISSION_TEXT[f.permission] ? f.permission : null
    };
  });
}

// What a click on a remembered folder will meet, as the list says it (TDD-0023 DEC-2): in words, the icon adds nothing.
const FOLDER_PERMISSION_TEXT = {
  granted: 'Opens without asking',
  prompt: 'Will ask for permission',
  denied: 'Blocked by the browser',
  unreachable: 'Could not be reached',
  unknown: 'Could not be checked'
};
const FOLDER_PERMISSION_ICON = {
  granted: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  prompt: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  denied: '<circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/>',
  unreachable:
    '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7"/><path d="M12 17h.01"/>',
  unknown:
    '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7"/><path d="M12 17h.01"/>'
};

/**
 * The list of the remembered folders on the landing card: an Open and a Remove button each, both naming the folder. The
 * Open button says, under the names, what a click will meet (its permission), or the row says what went wrong the last
 * time (its problem): that line is the button's accessible description.
 */
function renderLandingFoldersHtml(folders) {
  const rows = folders
    .map((f, i) => {
      const named = '“' + f.title + '”' + (f.folder ? ' (folder ' + f.folder + ')' : '');
      const id = escapeHtml(f.id);
      const state = !f.problem && f.permission ? 'landing-folder-state-' + i : null;
      const problem = f.problem ? 'landing-folder-problem-' + i : null;
      return (
        '<li class="landing-folder">' +
        '<button type="button" class="landing-folder-open" data-action="open-remembered-folder" data-folder-id="' +
        id +
        '" aria-label="' +
        escapeHtml('Open ' + named) +
        '"' +
        (state || problem ? ' aria-describedby="' + (state || problem) + '"' : '') +
        '>' +
        '<span class="landing-folder-name">' +
        escapeHtml(f.title) +
        '</span>' +
        (f.folder
          ? '<span class="landing-folder-dir">' +
            LANDING_ICON_FOLDER +
            '<span>' +
            escapeHtml(f.folder) +
            '</span></span>'
          : '') +
        (state
          ? '<span class="landing-folder-state" id="' +
            state +
            '" data-permission="' +
            f.permission +
            '">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            FOLDER_PERMISSION_ICON[f.permission] +
            '</svg>' +
            '<span>' +
            escapeHtml(FOLDER_PERMISSION_TEXT[f.permission]) +
            '</span></span>'
          : '') +
        '</button>' +
        '<button type="button" class="btn-ghost landing-folder-remove" data-action="forget-folder" data-folder-id="' +
        id +
        '" aria-label="' +
        escapeHtml('Remove ' + named + ' from the list') +
        '" title="This browser forgets the folder. Nothing is deleted on disk.">Remove from the list</button>' +
        (f.problem ? '<p class="landing-folder-problem" id="' + problem + '">' + escapeHtml(f.problem) + '</p>' : '') +
        '</li>'
      );
    })
    .join('');
  return (
    '<section class="landing-folders" aria-labelledby="landing-folders-title">' +
    '<h2 id="landing-folders-title">Remembered folders</h2>' +
    '<ul class="landing-folder-list">' +
    rows +
    '</ul>' +
    '<p class="landing-note">Removing a folder from the list only makes this browser forget it: nothing is deleted on disk.</p>' +
    '</section>'
  );
}

function renderLandingHtml(cfg) {
  const brand = '<div class="landing-brand">' + LANDING_ICON_BRAND + '<span>ArchiCode</span></div>';
  let body;
  if (cfg.kind === 'busy') {
    body =
      '<p class="landing-busy" role="status"><span class="landing-spinner" aria-hidden="true"></span>' +
      escapeHtml(cfg.busy) +
      '</p>';
  } else {
    body = '<h1>' + escapeHtml(cfg.title) + '</h1>' + '<p class="landing-text">' + escapeHtml(cfg.text) + '</p>';
    if (cfg.error) body += '<div class="error-panel" role="alert"><code>' + escapeHtml(cfg.error) + '</code></div>';
    if (cfg.hint) body += '<p class="landing-hint">' + escapeHtml(cfg.hint) + '</p>';
    if (cfg.notice) body += '<p class="landing-notice" role="status">' + escapeHtml(cfg.notice) + '</p>';
    if (cfg.actions && cfg.actions.length > 0) {
      body +=
        '<div class="landing-actions">' +
        cfg.actions
          .map(
            (a) =>
              '<button type="button"' +
              (a.primary ? ' class="btn-primary" id="landing-primary"' : '') +
              ' data-action="' +
              a.action +
              '">' +
              (a.icon || '') +
              '<span>' +
              escapeHtml(a.label) +
              '</span></button>'
          )
          .join('') +
        '</div>';
    }
    if (cfg.browserRows) body += renderLandingBrowserHtml(cfg.browserRows);
    if (cfg.folders && cfg.folders.length > 0) body += renderLandingFoldersHtml(cfg.folders);
    if (cfg.note) body += '<p class="landing-note">' + escapeHtml(cfg.note) + '</p>';
    body +=
      '<p class="landing-note"><a href="' +
      docUrl('editor') +
      '" target="_blank" rel="noopener">Documentation</a> · nothing leaves your browser: files are read and written locally.</p>';
  }
  return (
    '<main class="landing"><section class="landing-card" data-landing="' +
    cfg.kind +
    '">' +
    brand +
    body +
    '</section></main>'
  );
}

/** The control of the landing card that has the focus, as a selector to find it after a redraw; null if none has it. */
function landingControlSelector(el) {
  const control = el && el.closest ? el.closest('.landing-card button, .landing-card a') : null;
  if (!control) return null;
  if (control.id) return '#' + control.id;
  if (control.tagName === 'A') return '.landing-card a';
  const action = control.getAttribute('data-action');
  if (!action) return null;
  const folder = control.getAttribute('data-folder-id');
  const workspace = control.getAttribute('data-workspace-id');
  return (
    '[data-action="' +
    action +
    '"]' +
    (folder === null ? '' : '[data-folder-id="' + folder + '"]') +
    (workspace === null ? '' : '[data-workspace-id="' + workspace + '"]')
  );
}

/** The title of the page: the editor, then the workspace that is loaded (its name, or its folder when it has none). */
function pageTitle() {
  const label = workspaceLabel();
  return label ? 'ArchiCode Editor ' + label : 'ArchiCode Editor';
}
