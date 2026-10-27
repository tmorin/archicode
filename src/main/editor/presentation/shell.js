/** Dispatch to the active perspective's region content. */
function renderActivePerspectiveHtml() {
  if (currentPerspective === 'plateaus') return renderPlateausPerspectiveHtml();
  if (mapIsShown()) return renderMapPerspectiveHtml();
  if (currentPerspective === 'library') return renderLibraryPerspectiveHtml();
  if (currentPerspective === 'files') return renderFilesPerspectiveHtml();
  if (currentPerspective === 'settings') return renderSettingsPerspectiveHtml();
  return renderElementsPerspectiveHtml();
}

/**
 * The resizable grid shell (layout adapted from archi-edtior.html):
 * header spans the top, then whichever of the active perspective's
 * left/center/right/bottom regions it actually uses — a `null` region is
 * not rendered at all (no panel, no resize handle, no reserved space),
 * per-perspective, rather than shown disabled. The content area always
 * lands in the grid's 3rd (1fr) column via `col-start-3`, whether or not
 * the left nav (columns 1-2) is present — an empty, item-less `auto`
 * column collapses to zero width on its own, so this needs no conditional
 * grid-template-columns.
 */
function renderShellHtml() {
  // wave 014 (run 0080): the band of plateaus sits under the top bar; wave 015 (run 0097, W-9, #98): only while a page of the perspective Timeline is on screen (the plateau
  // drawn and the comparison are the editor's state, `AppState.layers`, and stay what they were while Stories, Files or Settings is open)
  const band = bandIsShown() ? renderPlateauBandHtml() : '';
  // wave 014 (run 0081): under the band, the pages of the Timeline perspective (Plateaus, Applications, Environments, Elements)
  const pages = AppState.workspace && !AppState.fatalError ? renderPageTabsHtml() : '';
  const rows = 1 + (band ? 1 : 0) + (pages ? 1 : 0);
  let html =
    '<div class="app-shell grid grid-cols-[auto_auto_minmax(0,1fr)] ' +
    (rows === 3
      ? 'grid-rows-[auto_auto_auto_minmax(0,1fr)]'
      : rows === 2
        ? 'grid-rows-[auto_auto_minmax(0,1fr)]'
        : 'grid-rows-[auto_minmax(0,1fr)]') +
    '">';
  html += renderTopPanelHtml();
  html += band;
  html += pages;
  if (AppState.fatalError) {
    html +=
      '<div class="col-span-3 min-h-0"><div class="error-panel shell-error-panel"><strong>Error:</strong> ' +
      escapeHtml(AppState.fatalError) +
      '</div></div>';
  } else if (!AppState.workspace) {
    html += '<div class="col-span-3 min-h-0"><div class="center-placeholder">Loading…</div></div>';
  } else {
    const p = renderActivePerspectiveHtml();

    if (p.left) {
      html += p.left;
      html += renderResizeHandleHtml('panel-left', 'x', '1');
    }

    if (!p.right && !p.bottom) {
      html += '<main id="panel-center" class="center-panel col-start-3 min-h-0 min-w-0">' + p.center + '</main>';
    } else {
      html += '<div class="grid min-h-0 min-w-0 col-start-3 grid-rows-[minmax(0,1fr)_auto_auto]">';
      if (p.right) {
        html += '<div class="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_auto_auto]">';
        html += '<main id="panel-center" class="center-panel min-h-0 min-w-0">' + p.center + '</main>';
        html += renderResizeHandleHtml('panel-right', 'x', '-1');
        html +=
          '<aside id="panel-right" class="right-panel min-w-56 w-72 max-w-[40vw]" aria-label="' +
          (p.rightLabel || 'Inspection') +
          '" style="' +
          savedPanelSizeStyle('panel-right', 'width') +
          '">' +
          p.right +
          '</aside>';
        html += '</div>';
      } else {
        html += '<main id="panel-center" class="center-panel min-h-0 min-w-0">' + p.center + '</main>';
      }
      if (p.bottom) {
        html += renderResizeHandleHtml('panel-bottom', 'y', '-1');
        html +=
          '<section id="panel-bottom" class="bottom-panel min-h-32 h-48 max-h-[60vh]" style="' +
          savedPanelSizeStyle('panel-bottom', 'height') +
          '">' +
          p.bottom +
          '</section>';
      }
      html += '</div>';
    }
    html += renderReferenceDatalistsHtml();
  }
  html += renderAppDialogHtml();
  html += '</div>';
  return html;
}

/** Gives up everything not written to disk — what is typed in the form and every change in memory — after a confirmation. */
async function cancelChanges() {
  if (saveInFlight || !AppState.folder || !AppState.folder.handle) return;
  const count = countUnsavedChanges();
  if (count === 0 && !draftTyped) return;
  const what =
    count === 0
      ? 'what you typed in this form'
      : count + ' modified item' + (count === 1 ? '' : 's') + (draftTyped ? ' and what you typed in this form' : '');
  if (!confirm('Cancel and discard ' + what + '?\n\nThe folder is read again from disk. This cannot be undone.'))
    return;
  draftTyped = false;
  rawYamlEditDraft = null;
  pendingDeleteConfirmation = null;
  saveStatus = { state: 'idle' };
  await loadWorkspace(AppState.folder.handle); // from the disk, and back to the element of the URL: the user keeps their place
}

/** The clicks that replace the form on screen. Without a "Save all changes" first, what was typed in it is lost. */
const ACTIONS_LEAVING_THE_FORM = new Set([
  'timeline-draw',
  'timeline-changes',
  'set-perspective',
  'set-page',
  'select-file',
  'select-element',
  'goto-element',
  'set-element-tab',
  'toggle-element-edit',
  'select-link',
  'open-create-child-form',
  'open-create-top-level-form',
  'open-as-diagram',
  'show-on-map',
  'close-folder',
  'select-story',
  'story-play',
  'story-restore',
  'story-edit',
  'saved-view-open',
  'library-tab',
  'select-view',
  'library-go-story',
  'library-go-view',
  'library-open-element',
  'select-change'
]);

/** The clicks that write, or open a form that writes, an element. Each is allowed in the plateau drawn (wave 014, run 0082) unless it cannot be drawn (`layerActionRefusal`). A view and a story belong to no plateau (wave 015, run 0100): their clicks are not here. */
const WRITE_ACTIONS = new Set([
  'toggle-element-edit',
  'add-qualifier',
  'remove-qualifier',
  'add-application',
  'remove-application',
  'add-replaces',
  'remove-replaces',
  'add-use',
  'remove-use',
  'add-tag',
  'remove-tag',
  'add-relationship',
  'remove-relationship',
  'open-create-child-form',
  'open-create-top-level-form',
  'submit-create-child',
  'submit-create-top-level',
  'request-delete-element',
  'confirm-delete-element',
  'open-move-dialog',
  'move-confirm',
  'fix-dangling'
]);

/** Asks before throwing away what was typed in a form and not applied. True when the user accepts (the draft is then gone). */
function confirmDiscardingDraft() {
  if (
    !confirm(
      'Attention: what you typed in this form has not been saved.\n\nClick “Save all changes” to keep it. Leave anyway and lose it?'
    )
  )
    return false;
  draftTyped = false;
  return true;
}
