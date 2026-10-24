'use strict';
// The theme the editor is drawn in: light, dark or the system's, chosen in Settings and remembered by the browser alone.
// The look is checked in a browser; here, the choice, the attribute the stylesheet reads, the storage that may be refused,
// and the rules of the stylesheet.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { FIXTURE, createApp, makeDirHandle } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
const KEY = 'archicode-standalone-editor:theme';

/** A localStorage in memory. */
function memoryStorage(initial = {}) {
  const data = Object.assign({}, initial);
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    }
  };
}

/** A localStorage that refuses everything, as a browser with its site data blocked does. */
const refusingStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
  removeItem() {
    throw new Error('SecurityError');
  }
};

const themeOf = (sandbox) => sandbox.document.documentElement.getAttribute('data-theme');

/** The script of the <head>, run on a root element of its own. */
function runBootScript(localStorage) {
  const boot = HTML.match(/<script id="theme-boot">([\s\S]*?)<\/script>/);
  assert.ok(boot, 'the <head> has its script');
  assert.ok(HTML.indexOf(boot[0]) < HTML.indexOf('<style>'), 'it runs before the stylesheet and the body');
  const attributes = {};
  const document = {
    documentElement: {
      setAttribute: (k, v) => {
        attributes[k] = v;
      }
    }
  };
  vm.runInNewContext(boot[1], { document, localStorage });
  return attributes;
}

test('the script of the head applies a stored light or dark choice, and nothing else', () => {
  assert.deepEqual(runBootScript(memoryStorage({ [KEY]: 'dark' })), { 'data-theme': 'dark' });
  assert.deepEqual(runBootScript(memoryStorage({ [KEY]: 'light' })), { 'data-theme': 'light' });
  assert.deepEqual(runBootScript(memoryStorage({ [KEY]: 'system' })), {}, 'system is no attribute');
  assert.deepEqual(runBootScript(memoryStorage({ [KEY]: 'sepia' })), {}, 'an unknown value is not a theme');
  assert.deepEqual(runBootScript(memoryStorage()), {}, 'nothing stored');
  assert.deepEqual(runBootScript(refusingStorage), {}, 'a refused storage does not stop the page');
  assert.deepEqual(runBootScript(undefined), {}, 'no storage at all');
});

test('the script of the head and the page agree on the key and the values', () => {
  const sandbox = createApp();
  assert.equal(run(sandbox, 'THEME_STORAGE_KEY'), KEY);
  assert.deepEqual(Array.from(run(sandbox, 'THEME_CHOICES.map((c) => c.value)')), ['light', 'dark', 'system']);
  const boot = HTML.match(/<script id="theme-boot">([\s\S]*?)<\/script>/)[1];
  assert.ok(boot.includes("'" + KEY + "'"));
});

test('the page starts with the stored choice, and "system" by default', () => {
  const none = createApp({ localStorage: memoryStorage() });
  assert.equal(run(none, 'themeChoice'), 'system');
  assert.equal(themeOf(none), null);

  const dark = createApp({ localStorage: memoryStorage({ [KEY]: 'dark' }) });
  assert.equal(run(dark, 'themeChoice'), 'dark');
  assert.equal(themeOf(dark), 'dark');

  const junk = createApp({ localStorage: memoryStorage({ [KEY]: 'sepia' }) });
  assert.equal(run(junk, 'themeChoice'), 'system');
  assert.equal(themeOf(junk), null);
});

test('choosing a theme sets the attribute of the root element ("system" removes it) and is remembered', () => {
  const storage = memoryStorage();
  const sandbox = createApp({ localStorage: storage });
  sandbox.setThemeChoice('dark');
  assert.equal(themeOf(sandbox), 'dark');
  assert.equal(storage.data[KEY], 'dark');
  sandbox.setThemeChoice('light');
  assert.equal(themeOf(sandbox), 'light');
  assert.equal(storage.data[KEY], 'light');
  sandbox.setThemeChoice('system');
  assert.equal(themeOf(sandbox), null);
  assert.equal(storage.data[KEY], 'system');
  sandbox.setThemeChoice('sepia');
  assert.equal(storage.data[KEY], 'system', 'an unknown value is ignored');
  assert.equal(run(sandbox, 'themeChoice'), 'system');
});

test('a browser that refuses its storage still gets the choice, for the session, and nothing throws', () => {
  for (const localStorage of [refusingStorage, undefined]) {
    const sandbox = createApp({ localStorage });
    assert.equal(run(sandbox, 'themeChoice'), 'system');
    assert.doesNotThrow(() => sandbox.setThemeChoice('dark'));
    assert.equal(themeOf(sandbox), 'dark');
    assert.equal(sandbox.isDarkScheme(), true);
    assert.doesNotThrow(() => sandbox.setThemeChoice('system'));
    assert.equal(themeOf(sandbox), null);
  }
});

test("the code editors are dark when the choice says so, whatever the system says, and the system's otherwise", () => {
  const sandbox = createApp({ localStorage: memoryStorage() });
  const themes = [];
  const darkHighlight = { highlight: true };
  sandbox.window.CM = {
    EditorView: {
      theme: (spec, options) => {
        themes.push(options.dark);
        return { theme: true };
      }
    },
    darkHighlight
  };
  const dark = () => Array.from(sandbox.codeMirrorThemeExtensions()).includes(darkHighlight);

  sandbox.window.matchMedia = (query) => ({ matches: /dark/.test(query) }); // the system is dark
  assert.equal(dark(), true, 'system, dark system');
  sandbox.setThemeChoice('light');
  assert.equal(dark(), false, 'forced light on a dark system');
  sandbox.window.matchMedia = () => ({ matches: false }); // the system is light
  assert.equal(dark(), false, 'forced light, light system');
  sandbox.setThemeChoice('dark');
  assert.equal(dark(), true, 'forced dark on a light system');
  sandbox.setThemeChoice('system');
  assert.equal(dark(), false, 'system, light system');
  assert.deepEqual(themes, [true, false, false, true, false]);
});

test('the open code editors are rebuilt with the text they hold when the theme changes', () => {
  const sandbox = createApp({ localStorage: memoryStorage() });
  const created = [];
  class FakeView {
    constructor({ doc, extensions, parent }) {
      this.doc = doc;
      this.extensions = extensions;
      this.parent = parent;
      this.dom = { parentElement: parent };
      this.destroyed = false;
      this.state = { doc: { toString: () => this.doc } };
      created.push(this);
    }
    destroy() {
      this.destroyed = true;
    }
    static theme() {
      return { theme: true };
    }
  }
  sandbox.window.CM = {
    EditorView: FakeView,
    basicSetup: 'setup',
    json: () => 'json',
    yaml: () => 'yaml',
    darkHighlight: 'dark-highlight'
  };
  const host = { host: 'json' };
  const typed = new FakeView({ doc: '{"typed": "not saved"}', extensions: [], parent: host });
  sandbox.__open = { classic: typed };
  run(sandbox, 'activeJsonEditorViews = globalThis.__open');
  created.length = 0;

  sandbox.setThemeChoice('dark');
  assert.equal(typed.destroyed, true);
  assert.equal(created.length, 1);
  assert.equal(created[0].doc, '{"typed": "not saved"}', 'what was typed is kept');
  assert.equal(created[0].parent, host);
  assert.ok(created[0].extensions.includes('dark-highlight'));
  assert.equal(run(sandbox, 'activeJsonEditorViews.classic') === created[0], true);

  sandbox.setThemeChoice('light');
  assert.equal(created.length, 2);
  assert.ok(!created[1].extensions.includes('dark-highlight'));
});

test('the Settings screen offers the choice in a section of its own, apart from the workspace settings', async () => {
  const sandbox = createApp({ localStorage: memoryStorage({ [KEY]: 'dark' }) });
  await sandbox.loadWorkspace(makeDirHandle(FIXTURE));
  const html = sandbox.renderSettingsViewHtml();
  const section = html.match(/<div class="edition-section" id="settings-appearance">[\s\S]*?<\/fieldset>/);
  assert.ok(section, 'the section');
  assert.match(section[0], /<h3>Appearance \(this browser\)<\/h3>/);
  assert.match(section[0], /<fieldset[^>]*><legend>Theme<\/legend>/);
  const radios = Array.from(
    section[0].matchAll(/<input type="radio" name="theme-choice" value="(\w+)"( checked)?>/g),
    (m) => [m[1], !!m[2]]
  );
  assert.deepEqual(radios, [
    ['light', false],
    ['dark', true],
    ['system', false]
  ]);
  assert.ok(
    html.indexOf('id="settings-appearance"') < html.indexOf('<h3>Manifests</h3>'),
    'before the workspace settings'
  );
  assert.equal(html.split('id="settings-appearance"').length, 2, 'only once');
});

test('choosing a theme in Settings does not modify the workspace, light "Save all changes" or redraw the form', async () => {
  const storage = memoryStorage();
  const sandbox = createApp({ localStorage: storage });
  await sandbox.loadWorkspace(makeDirHandle(FIXTURE));
  let renders = 0;
  sandbox.render = () => {
    renders++;
  };
  const radio = (value) => ({
    value,
    matches: (selector) => selector === 'input[name="theme-choice"]',
    closest: (selector) => (/settings-view/.test(selector) ? {} : null)
  });

  assert.equal(sandbox.hasUnsavedChanges(), false);
  sandbox.handleAppInput({ target: radio('dark') });
  assert.equal(themeOf(sandbox), 'dark');
  assert.equal(storage.data[KEY], 'dark');
  assert.equal(run(sandbox, 'draftTyped'), false, 'the form is not dirty');
  assert.equal(sandbox.hasUnsavedChanges(), false, 'the workspace is not modified');
  assert.match(sandbox.renderSaveAllButtonHtml(), /disabled/, 'Save all changes stays off');
  assert.equal(renders, 0, 'no redraw: what is typed in the settings is not lost');
  assert.equal(
    JSON.stringify(sandbox.serializeSettingsToRaw(sandbox.__state().workspace.settings)).includes('theme'),
    false,
    'nothing in .archicode.yaml'
  );

  // while typing in the form still dirties it
  sandbox.handleAppInput({
    target: { id: 'x', matches: () => false, closest: (selector) => (/settings-view/.test(selector) ? {} : null) }
  });
  assert.equal(run(sandbox, 'draftTyped'), true);
});

test('the stylesheet: forced themes override the system, with the right color-scheme', () => {
  assert.match(CSS, /:root \{\s*color-scheme: light dark;/, 'system: both');
  assert.match(CSS, /:root\[data-theme="light"\] \{ color-scheme: light; \}/);
  assert.match(CSS, /:root\[data-theme="dark"\] \{\s*color-scheme: dark;/);
  assert.match(
    CSS,
    /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{/,
    'a forced light wins over a dark system'
  );
});

test("the dark variables are the same for the system's dark and for the forced one", () => {
  const declarations = (block) =>
    block
      .split(';')
      .map((d) => d.trim())
      .filter((d) => d.startsWith('--'))
      .sort();
  const system = declarations(
    CSS.match(/prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/)[1]
  );
  const forced = declarations(CSS.match(/:root\[data-theme="dark"\] \{([^}]*)\}/)[1]);
  assert.ok(system.length >= 9);
  assert.deepEqual(forced, system);
  // and each of them overrides a variable of the light block
  const light = declarations(CSS.match(/:root \{([^}]*)\}/)[1]).map((d) => d.split(':')[0]);
  for (const d of system) assert.ok(light.includes(d.split(':')[0]), d);
});

test('the SVG export takes its colors from the root element, so it follows the theme', () => {
  const fn = HTML.slice(HTML.indexOf('function diagramExportCss()'), HTML.indexOf('function diagramExportDocument()'));
  assert.match(fn, /getComputedStyle\(document\.documentElement\)/);
  assert.doesNotMatch(fn, /prefers-color-scheme|matchMedia/);
  assert.doesNotMatch(fn, /#[0-9a-f]{6}/i, 'no color of its own');
});
