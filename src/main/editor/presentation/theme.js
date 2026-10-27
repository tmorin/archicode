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
  } catch (e) {
    /* storage unavailable: the system's scheme */
  }
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
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {
    return false;
  }
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
      doc,
      extensions: [window.CM.basicSetup, window.CM.json()].concat(codeMirrorThemeExtensions()),
      parent
    });
  }
  if (activeFileEditorView) {
    const parent = activeFileEditorView.dom.parentElement;
    const doc = activeFileEditorView.state.doc.toString();
    activeFileEditorView.destroy();
    activeFileEditorView = new window.CM.EditorView({
      doc,
      extensions: [window.CM.basicSetup, window.CM.yaml()].concat(codeMirrorThemeExtensions()),
      parent
    });
  }
}

/** Choose the theme: it applies at once, without a redraw (which would drop what is typed in the settings), and is remembered. */
function setThemeChoice(value) {
  if (!THEME_CHOICES.some((choice) => choice.value === value)) return;
  themeChoice = value;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch (e) {
    /* storage unavailable: kept for this session only */
  }
  applyTheme();
  refreshCodeEditorThemes();
}

// "System" follows the operating system as it changes: the stylesheet does by itself, the code editors need a rebuild.
try {
  const systemScheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (systemScheme && systemScheme.addEventListener)
    systemScheme.addEventListener('change', () => {
      if (themeChoice === 'system') refreshCodeEditorThemes();
    });
} catch (e) {
  /* no media query: nothing to follow */
}

/** The "Appearance" section of Settings: native radios in a fieldset, and only about this browser. */
function renderAppearanceSectionHtml() {
  return (
    '<div class="edition-section" id="settings-appearance"><h3>Appearance (this browser)</h3>' +
    '<fieldset class="theme-choice" aria-describedby="settings-help-theme"><legend>Theme</legend>' +
    THEME_CHOICES.map(
      (choice) =>
        '<label class="theme-choice-option"><input type="radio" name="theme-choice" value="' +
        choice.value +
        '"' +
        (themeChoice === choice.value ? ' checked' : '') +
        '><span>' +
        choice.label +
        '</span></label>'
    ).join('') +
    '</fieldset>' +
    '<div class="settings-help" id="settings-help-theme">Remembered by this browser only: it is not part of the workspace and does not need saving. System follows the operating system.</div>' +
    '</div>'
  );
}

/**
 * The look of the code editors: the page's own colors (CSS variables, so they follow the scheme), declared dark when the
 * page is, and the code colors written for a dark background in that case. Without it the editor stayed a white box
 * with the page's light text colors in a dark page.
 */
function codeMirrorThemeExtensions() {
  if (!window.CM || !window.CM.EditorView || !window.CM.EditorView.theme) return [];
  const dark = isDarkScheme();
  const theme = window.CM.EditorView.theme(
    {
      '&': { color: 'var(--fg)', backgroundColor: 'var(--bg)' },
      '.cm-content': { caretColor: 'var(--fg)' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--fg)' },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        { backgroundColor: 'color-mix(in srgb, var(--accent) 35%, transparent)' },
      '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)' },
      '.cm-gutters': {
        backgroundColor: 'var(--panel-bg)',
        color: 'var(--muted)',
        borderRight: '1px solid var(--border)'
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'color-mix(in srgb, var(--accent) 14%, transparent)',
        color: 'var(--fg)'
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--panel-bg)',
        color: 'var(--muted)',
        border: '1px solid var(--border)'
      },
      '.cm-panels': { backgroundColor: 'var(--panel-bg)', color: 'var(--fg)' },
      '.cm-tooltip': { backgroundColor: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)' }
    },
    { dark }
  );
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
