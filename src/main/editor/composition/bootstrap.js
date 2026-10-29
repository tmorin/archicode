// =====================================================================
// Bootstrap
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
  syncPerspectiveFromHash(); // a bookmarked/shared "#/settings" etc. lands directly there
  const sample = sampleFromHash(); // read before the first render, which writes the address back without it (DEC-7)
  if (isServedByArchiCode()) {
    // the served folder opens first and the key is ignored; once it is open, the store is probed on the side (nothing waits for it) so that the Workspace menu can offer the sample (DEC-8)
    stripServerTokenFromUrl();
    landingBusy = 'Opening the workspace…';
    render();
    openServedFolder().then(() => {
      if (AppState.workspace) probeBrowserStore().then(requestRedraw, requestRedraw);
    });
    return;
  }
  landingBusy = 'Looking for your last workspace…';
  render(); // no blank page while IndexedDB / the folder permission are checked
  startPage(sample);
});

/**
 * A page that is not served: ask once whether the browser can keep a workspace (DEC-4), then reopen what was open. A browser that can neither pick a folder
 * nor keep a workspace gets its card and stops. A sample the address asks for (`sample=`) wins over reopening the last workspace; an id that is not in the
 * catalog is said on the card and the usual start follows (DEC-7).
 */
async function startPage(sample = null) {
  await probeBrowserStore();
  if (!canKeepWorkspace()) {
    landingBusy = null;
    render();
    return;
  }
  if (sample !== null && browserStoreState === 'ready') {
    if (Object.prototype.hasOwnProperty.call(BROWSER_SAMPLES, sample)) {
      await openSample(sample);
      return;
    }
    landingNotice = 'There is no sample “' + sample + '”.';
  }
  await tryAutoReopen();
}

// Covers back/forward and a hand-edited URL — setPerspective() (the
// in-app tab click) already renders directly, so this mostly re-confirms
// what's already true, except for navigation setPerspective never sees.
// CodeMirror usually finishes loading after a refresh's first render, which
// therefore showed the plain-textarea fallbacks. Swap them for the real
// editors now — but only if still untouched, so a first keystroke typed in
// the meantime is never thrown away by the re-render.
window.addEventListener('codemirror-ready', () => {
  const fallbacks = document.querySelectorAll('#file-edit-textarea, .json-editor-fallback');
  if (fallbacks.length === 0) return;
  if (Array.from(fallbacks).every((el) => el.value === el.defaultValue)) render();
});

// the cap of the open key is 30 % of the diagram area, which a resize of the window changes (wave 019, run 0138, #137): view state, nothing is drawn again
window.addEventListener('resize', syncDiagramKey);
window.addEventListener('resize', syncRightPanelSticky); // the sticky block of the right panel wraps differently at another width (wave 027, run 0201)

window.addEventListener('hashchange', () => {
  // the change came from the app itself (setPerspective writes the hash after it has set the state): the state is
  // already what the hash says, and re-applying it would lose what the hash does not carry (the edit mode, a draft)
  if (location.hash === '#' + currentRouteHash()) return;
  handleHashChange(); // the editor's part of the address, and the player's (wave 021, run 0153)
});

// A tab/window close or reload otherwise discards any edit not yet
// written to disk with no warning at all (UX review follow-up).
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
