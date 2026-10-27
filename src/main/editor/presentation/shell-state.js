// =====================================================================
// Resizable shell panels (layout adapted from archi-edtior.html) — sizes
// persist in localStorage, keyed per panel id, read back into the
// template on every render() (never set imperatively once at boot: a
// render() replaces #app's whole innerHTML on every click/edit, which
// would otherwise wipe out an imperatively-set inline style the very
// next time anything is clicked).
// =====================================================================
const PANEL_SIZE_STORAGE_PREFIX = 'archicode-standalone-editor:panel-size:';

/** The inline `style="..."` attribute content for a resizable panel, from its persisted size (or '' if none saved). */
function savedPanelSizeStyle(panelId, property) {
  const raw = panelSizeStorage.get(PANEL_SIZE_STORAGE_PREFIX + panelId + ':' + property);
  const size = Number(raw);
  return size > 0 ? property + ': ' + size + 'px;' : '';
}
