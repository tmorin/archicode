'use strict';
// The behaviour of the page itself (focus, the help menu, the export, the map's fold buttons, what survives closing a
// folder…), played on the page's own script with just enough of a DOM written here. The look is checked in a browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, openFixture } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');

/** A layout shaped like ELK's answer, without ELK (see diagram.test.js). */
function fakeLayout(graph) {
  const place = (node, x) => Object.assign({}, node, {
    x, y: 0, width: node.width || 400, height: node.height || 200,
    children: (node.children || []).map((child, i) => place(child, 10 + i * 20))
  });
  return Object.assign(place(graph, 0), { width: 900, height: 600, edges: [] });
}

/** Counts the redraws, and keeps the page from really drawing. */
function countRenders(sandbox) {
  const counter = { n: 0 };
  sandbox.render = () => { counter.n++; };
  return counter;
}

const click = (sandbox, action, attrs, inside, detail) => {
  const target = action ? { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null), closest: () => null } : null;
  sandbox.handleAppClick({
    detail,
    target: { closest: (selector) => (selector === '[data-action]' ? target : inside && selector === '.help-menu' ? {} : null) },
    preventDefault() {}, stopPropagation() {}
  });
};

/** The "?" button and the menu behind it, as far as setHelpOpen needs them. */
function fakeHelpDom(sandbox) {
  const dom = { menu: null, focused: null, expanded: 'false' };
  const link = { focus() { dom.focused = 'link'; } };
  const button = {
    setAttribute(name, value) { if (name === 'aria-expanded') dom.expanded = value; },
    insertAdjacentHTML(where, html) { assert.equal(where, 'afterend'); dom.menu = { html, remove() { dom.menu = null; } }; },
    focus() { dom.focused = 'button'; }
  };
  sandbox.document.querySelector = (selector) => {
    if (selector === '.help-button') return button;
    if (selector === '.help-menu') return dom.menu;
    if (selector === '.help-menu a') return dom.menu ? link : null;
    return null;
  };
  return dom;
}

test('the help opens and closes without a redraw: what was typed and not committed is kept, and the click that closes it still acts on it', async () => {
  const { sandbox } = await openFixture();
  const renders = countRenders(sandbox);
  const dom = fakeHelpDom(sandbox);

  click(sandbox, 'toggle-help');
  assert.equal(run(sandbox, 'helpOpen'), true);
  assert.equal(dom.expanded, 'true');
  assert.match(dom.menu.html, /class="help-menu" role="dialog"/);
  assert.equal(renders.n, 0, 'no redraw to open it');
  assert.equal(dom.focused, null, 'opened with the mouse (detail 1) the focus stays where it was');

  // a click elsewhere closes it, and the action of that click runs after, with the fields as they are
  const seen = [];
  sandbox.readSettingsDraft = () => { seen.push(run(sandbox, 'helpOpen')); return { valid: false }; };
  run(sandbox, "currentPerspective = 'settings'; draftTyped = true;");
  click(sandbox, 'save-all-changes');
  assert.equal(run(sandbox, 'helpOpen'), false);
  assert.equal(dom.menu, null);
  assert.equal(dom.expanded, 'false');
  assert.equal(renders.n, 0, 'closing it by a click elsewhere redraws nothing before the action of the click');
  assert.deepEqual(seen, [false]);
});

test('the help is reached and left with the keyboard, and Escape closes it alone', async () => {
  const { sandbox } = await openFixture();
  const renders = countRenders(sandbox);
  const dom = fakeHelpDom(sandbox);

  click(sandbox, 'toggle-help', {}, false, 0); // Enter or Space on the button: the click has no pointer
  assert.equal(dom.focused, 'link', 'the focus goes into the menu');
  const listeners = sandbox.__documentListeners.keydown || [];
  assert.ok(listeners.includes(sandbox.handleHelpKeydown), 'Escape is heard on the document, ahead of the keys of the diagram');

  const event = { key: 'Escape', stopped: 0, prevented: 0, stopImmediatePropagation() { this.stopped++; }, preventDefault() { this.prevented++; } };
  sandbox.handleHelpKeydown(event);
  assert.equal(run(sandbox, 'helpOpen'), false);
  assert.equal(dom.focused, 'button', 'the focus is given back to the "?" button');
  assert.equal(event.stopped, 1, 'the key goes no further: it does not also un-maximize the diagram');
  assert.equal(renders.n, 0);

  const other = { key: 'Escape', stopImmediatePropagation() { throw new Error('the help is closed: Escape is for the diagram'); } };
  sandbox.handleHelpKeydown(other);

  click(sandbox, 'toggle-help', {}, false, 0);
  click(sandbox, 'toggle-help', {}, false, 0);
  assert.equal(dom.focused, 'button', 'closed from the keyboard with the button: the focus stays on it');
});

test('the menu is drawn right behind its button, so Tab goes from one to the other', async () => {
  const { sandbox } = await openFixture();
  run(sandbox, 'helpOpen = true;');
  const html = sandbox.renderHelpButtonHtml();
  assert.ok(html.indexOf('data-action="toggle-help"') < html.indexOf('class="help-menu"'));
  assert.match(html, /^<span class="help-wrap">.*<\/span>$/s);
  assert.doesNotMatch(sandbox.renderShellHtml().replace(sandbox.renderTopPanelHtml(), ''), /help-menu/, 'and not at the end of the page');
});

test('the SVG that is exported is the drawing itself: no pan transform, a size, a view box and a background', async () => {
  const { sandbox } = await openFixture();
  const made = [];
  const node = (tag) => {
    const n = { tag, attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
      insertBefore(child) { this.children.unshift(child); }, classList: { remove() {} }, querySelectorAll: () => [], style: {} };
    made.push(n);
    return n;
  };
  const clone = node('svg');
  clone.attrs.style = 'transform: translate(120px, 40px);';
  clone.attrs.width = '300';
  clone.firstChild = null;
  const svg = { cloneNode: () => clone };
  const canvas = { querySelector: (s) => (s === 'svg' ? svg : null), getAttribute: () => 'shop' };
  let serialized = null;
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  sandbox.document.documentElement = {};
  sandbox.document.createElementNS = (ns, tag) => node(tag);
  sandbox.document.createElement = () => ({ click() {}, remove() {} });
  sandbox.document.body = { appendChild() {} };
  sandbox.getComputedStyle = () => ({ getPropertyValue: () => '#123456' });
  sandbox.XMLSerializer = class { serializeToString(el) { serialized = JSON.parse(JSON.stringify({ attrs: el.attrs, kids: el.children.map((c) => ({ tag: c.tag, attrs: c.attrs })) })); return '<svg/>'; } };
  sandbox.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
  run(sandbox, "diagramScene = { width: 908, height: 608 }; diagramShownView = 'shop|overview';");
  sandbox.exportDiagramSvg();
  assert.ok(serialized, 'the clone is what is written');
  assert.equal(serialized.attrs.style, undefined, 'the inline transform of the pan is gone');
  assert.equal(serialized.attrs.width, '908');
  assert.equal(serialized.attrs.height, '608');
  assert.equal(serialized.attrs.viewBox, '-4 -4 908 608');
  assert.equal(serialized.kids.find((k) => k.tag === 'rect').attrs.fill, '#123456', 'a background');
});

test('a change of the address that the page made itself is not applied again: the edit mode and the drafts stay', async () => {
  const { sandbox, state } = await openFixture();
  const renders = countRenders(sandbox);
  const listener = sandbox.__windowListeners.hashchange[0];
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'edit' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'overview';");
  sandbox.location.hash = sandbox.currentRouteHash(); // setPerspective() writes it so
  listener();
  assert.equal(renders.n, 0, 'nothing to do: the state already is what the hash says');
  assert.equal(state.selection.mode, 'edit', 'still in edit mode');

  // Back/Forward, or a hand-edited address, is something else
  sandbox.location.hash = '#/elements?ref=shop.catalog';
  listener();
  assert.equal(renders.n, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(state.selection)), { kind: 'element', key: 'shop.catalog', mode: 'view' });
});

test('fix-dangling ends in the edit form of the owner, whatever the hash handler does after it', async () => {
  const { sandbox, state } = await openFixture();
  const listener = sandbox.__windowListeners.hashchange[0];
  countRenders(sandbox);
  click(sandbox, 'fix-dangling', { 'data-ref': 'shop.web.api' });
  assert.equal(state.selection.mode, 'edit');
  listener(); // the asynchronous hashchange that follows `location.hash = …`
  assert.equal(state.selection.mode, 'edit');
  assert.equal(state.selection.key, 'shop.web.api');
});

test('on the map, a fold button is drawn only where clicking it changes something', async () => {
  const { sandbox, kernel } = await openFixture();
  const draw = (opened, pinned, options) => {
    const result = kernel.compute(sandbox.buildKernelInput('map', null, { opened, pinned }).input);
    const svg = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '', Object.assign({ map: true, opened, pinned }, options)).html;
    return { result, svg, modes: Array.from(svg.matchAll(/data-mode="(\w+)" data-id="([^"]+)"/g), (m) => m[1] + ' ' + m[2]) };
  };
  assert.ok(draw([], []).modes.includes('expand shop'));
  assert.ok(draw(['shop'], []).modes.includes('close shop'), 'an open box can be closed');

  // a box that is open only because something pinned lies inside it: Close would change nothing
  const pinned = draw([], ['shop.web']);
  assert.ok(pinned.result.items.some((i) => i.id === 'shop' && pinned.result.items.some((c) => c.parent === 'shop')), 'the kernel opens what encloses a pin');
  assert.ok(!pinned.modes.includes('close shop'), 'no Close on an ancestor of a pinned element');
  assert.ok(!pinned.modes.includes('close undefined'));

  // the same box, opened by the user as well as enclosing a pin: still no Close (the kernel would keep it open)
  assert.ok(!draw(['shop'], ['shop.web']).modes.includes('close shop'));
  // an element that is not on the map at all has no button
  assert.ok(!draw([], []).modes.some((m) => m.endsWith('ghost')));
});

test('what a drawing is for is decided when it is asked for: leaving the map meanwhile does not change it', async () => {
  const { sandbox, kernel } = await openFixture();
  run(sandbox, "currentPerspective = 'elements';"); // the user has gone to the Elements perspective while the layout was computed
  const result = kernel.compute(sandbox.buildKernelInput('map', null, { opened: [] }).input);
  const asked = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '', { map: true, opened: [], pinned: [] }).html;
  assert.match(asked, /data-action="toggle-fold"/, 'drawn for the map, with its buttons');
  const elements = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '').html;
  assert.doesNotMatch(elements, /toggle-fold/, 'with nothing said it is drawn for the page as it is');
});

test('a layout started on the map is dropped when the page is drawn again without a canvas', async () => {
  const { sandbox } = await openFixture();
  const before = run(sandbox, 'diagramSeq');
  run(sandbox, "diagramScene = {}; pendingDiagramFocus = { fold: false, id: 'x' };");
  sandbox.mountDiagramIfNeeded(); // no #diagram-canvas in this page
  assert.equal(run(sandbox, 'diagramSeq'), before + 1, 'the answer of the older layout will find itself superseded');
  assert.equal(run(sandbox, 'diagramScene'), null);
  assert.equal(run(sandbox, 'pendingDiagramFocus'), null, 'and nothing waits to take the focus later');
});

test('the greying of the tree through a facet is for the elements, not for the map', async () => {
  const { sandbox } = await openFixture();
  const row = { removed: 0, toggled: 0, classList: { remove() { row.removed++; }, toggle() { row.toggled++; } }, removeAttribute() {} };
  sandbox.document.querySelectorAll = () => [row];
  run(sandbox, "currentPerspective = 'map'; diagramFacet = 'rest-only';");
  await sandbox.markTreeThroughFacet();
  assert.equal(row.toggled, 0, 'no row of the map is greyed');
  assert.equal(row.removed, 1, 'and a mark left from before is taken off');
});

test('closing a folder forgets what the page held about it, and a reload of the same one does not', async () => {
  const { sandbox, state } = await openFixture();
  countRenders(sandbox);
  sandbox.location.hash = '#/map?pin=shop.web&facet=rest-only';
  run(sandbox, `
    saveStatus = { state: 'success' }; mapPinned = ['shop.web']; mapHidden = ['mailer']; mapOpened = new Set(['shop']);
    diagramMaximized = true; diagramHideUnlinked = true; elementTab = 'deep'; diagramFacet = 'rest-only';
    diagramCache = { key: 'k' }; diagramScene = { hasSvg: true }; treeExpandedApplications = false; navActiveKey = 'application:shop';
    helpOpen = true; pendingDeleteConfirmation = { x: 1 }; rawYamlEditDraft = { relPath: 'a' }; currentPerspective = 'map';`);
  const seq = run(sandbox, 'diagramSeq');

  // loading the same folder again (after a save) keeps the place of the user
  await sandbox.loadWorkspace(state.folder ? state.folder.handle : undefined).catch(() => {});
  assert.deepEqual(run(sandbox, 'JSON.stringify(mapPinned)'), '["shop.web"]');
  assert.equal(run(sandbox, 'diagramFacet'), 'rest-only');

  await sandbox.closeFolder();
  const forgotten = JSON.parse(run(sandbox, `JSON.stringify({
    saveStatus, mapPinned, mapHidden, opened: mapOpened, maximized: diagramMaximized, hide: diagramHideUnlinked, elementTab, facet: diagramFacet,
    cache: diagramCache, scene: diagramScene, apps: treeExpandedApplications, nav: navActiveKey, help: helpOpen,
    del: pendingDeleteConfirmation, draft: rawYamlEditDraft, perspective: currentPerspective })`));
  assert.deepEqual(forgotten, {
    saveStatus: { state: 'idle' }, mapPinned: [], mapHidden: [], opened: null, maximized: false, hide: false, elementTab: 'details', facet: null,
    cache: null, scene: null, apps: true, nav: null, help: false, del: null, draft: null, perspective: 'map'
  });
  assert.ok(run(sandbox, 'diagramSeq') > seq, 'a layout still running is dropped');
  assert.equal(sandbox.location.hash, '', 'the old ref=, pin= and facet= are not left in the address to be applied to the next folder');
  assert.equal(sandbox.__state().folder, null);
});

test('a code editor follows the scheme of the page: its colors are the page variables, dark when the page is', () => {
  const sandbox = createApp();
  assert.deepEqual(Array.from(sandbox.codeMirrorThemeExtensions()), [], 'no CodeMirror (offline): nothing to add');
  const themes = [];
  const darkHighlight = { highlight: true };
  sandbox.window.CM = { EditorView: { theme: (spec, options) => { themes.push({ spec, options }); return { theme: true }; } }, darkHighlight };
  assert.deepEqual(Array.from(sandbox.codeMirrorThemeExtensions()), [{ theme: true }]);
  assert.equal(themes[0].options.dark, false);
  sandbox.window.matchMedia = (query) => ({ matches: /dark/.test(query) });
  assert.deepEqual(Array.from(sandbox.codeMirrorThemeExtensions()), [{ theme: true }, darkHighlight]);
  assert.equal(themes[1].options.dark, true);
  const spec = themes[1].spec;
  for (const part of ['&', '.cm-gutters', '.cm-activeLine', '.cm-content']) assert.ok(spec[part], part);
  assert.match(JSON.stringify(spec), /var\(--panel-bg\)/);
  assert.match(JSON.stringify(spec), /var\(--accent\)/);
  assert.doesNotMatch(JSON.stringify(spec), /#[0-9a-f]{3,6}/i, 'no color of its own');
});

// ---- contrast of the badges, in both schemes ----

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('the text of the badges is readable (4.5:1) in the light and in the dark scheme', () => {
  const css = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
  const light = css.match(/:root \{([^}]*)\}/)[1];
  const dark = css.match(/prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/)[1];
  const vars = (block) => Object.fromEntries(Array.from(block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi), (m) => [m[1], m[2]]));
  const scheme = { light: vars(light), dark: Object.assign(vars(light), vars(dark)) };
  scheme.light = vars(light);
  const rules = [['error-badge', 'on-accent', 'danger'], ['modified-badge', 'on-modified', 'modified'], ['dangling-badge', 'on-accent', 'danger']];
  for (const [name, text, background] of rules) {
    const rule = css.match(new RegExp('\\.' + name + ' \\{[^}]*\\}'))[0];
    assert.ok(rule.includes('color: var(--' + text + ')'), name + ' uses ' + text);
    assert.ok(rule.includes('background: var(--' + background + ')'), name + ' on ' + background);
    for (const [which, v] of Object.entries(scheme)) {
      const ratio = contrast(v[text], v[background]);
      assert.ok(ratio >= 4.5, name + ' in ' + which + ': ' + ratio.toFixed(2));
    }
  }
});

test('the reset block uses the page colors, the top bar wraps, and select-none is a rule', () => {
  const css = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
  assert.doesNotMatch(css, /#e5e7eb|#9ca3af/i);
  assert.match(css, /::placeholder \{ opacity: 1; color: var\(--muted\)/);
  assert.match(css, /\.select-none \{ user-select: none/);
  assert.doesNotMatch(css, /^\s*h1 \{ font-size/m, 'the heading sizes of the reset block are the only ones');
  assert.match(css, /\.top-panel \{[^}]*flex-wrap: wrap/);
  assert.match(css, /\.help-menu \{ position: absolute; top: calc\(100% \+ 0\.25rem\)/, 'the menu hangs from the "?" button, whatever the height of the bar');
});

test('the files and the branches of the trees can be used with the keyboard', async () => {
  const { sandbox } = await openFixture();
  const files = sandbox.renderFilesNavHtml();
  assert.match(files, /class="nav-row file-row[^"]*" role="button" tabindex="0"[^>]*data-action="select-file"/);
  const branch = sandbox.renderTreeBranchHtml('applications', 'Applications', 'application', [], true, true);
  assert.match(branch, /class="tree-branch-title" role="button" tabindex="0" aria-expanded="true"/);

  let clicked = 0;
  const control = { click() { clicked++; } };
  const key = (k, target) => { const e = { key: k, target, prevented: false, preventDefault() { this.prevented = true; } }; target.closest = () => target; sandbox.handleActivateKeydown(e); return e; };
  control.matches = () => true;
  assert.equal(key('Enter', control).prevented, true);
  key(' ', control);
  assert.equal(clicked, 2, 'Enter and Space do what a click does');
  assert.equal(key('a', control).prevented, false);
  assert.equal(clicked, 2);
});

test('the fold button is a sibling of the box, not a button inside a link', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('map', null, { opened: ['shop'] }).input);
  const svg = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '', { map: true, opened: ['shop'], pinned: [] }).html;
  const folds = svg.match(/<g class="dg-fold"/g) || [];
  assert.ok(folds.length >= 2, 'a Close on the open box and Expand on the others');
  assert.equal((svg.match(/<\/g><g class="dg-fold"/g) || []).length, folds.length, 'every fold button follows the end of a box');
});

test('after a redraw the focus goes back to the same box or fold button', () => {
  const sandbox = createApp();
  const part = (fold, id) => ({ classList: { contains: (c) => fold && c === 'dg-fold' }, getAttribute: () => id });
  const el = (p) => ({ closest: (s) => (/dg-node, #diagram-canvas \.dg-fold/.test(s) ? p : null) });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.diagramFocusTargetOf(el(part(true, 'shop'))))), { fold: true, id: 'shop' });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.diagramFocusTargetOf(el(part(false, 'shop'))))), { fold: false, id: 'shop' });
  assert.equal(sandbox.diagramFocusTargetOf(el(null)), null);
  assert.equal(sandbox.diagramFocusTargetOf(null), null);

  const focused = [];
  const mk = (id) => ({ getAttribute: () => id, focus: () => focused.push(id) });
  const nodes = { '.dg-fold': [mk('b')], '.dg-node': [mk('a'), mk('b')] };
  const canvas = { querySelectorAll: (s) => nodes[s] || [], contains: () => false, focus: () => focused.push('canvas') };
  sandbox.document.activeElement = null;
  run(sandbox, "pendingDiagramFocus = { fold: true, id: 'b' };");
  sandbox.restoreDiagramFocus(canvas);
  run(sandbox, "pendingDiagramFocus = { fold: true, id: 'zzz' };");
  sandbox.restoreDiagramFocus(canvas);
  run(sandbox, "pendingDiagramFocus = { fold: false, id: 'a' };");
  sandbox.restoreDiagramFocus(canvas);
  assert.deepEqual(focused, ['b', 'canvas', 'a']);

  // the user went elsewhere in the meantime: the focus is not taken from them
  sandbox.document.activeElement = { id: 'some-input' };
  run(sandbox, "pendingDiagramFocus = { fold: false, id: 'a' };");
  sandbox.restoreDiagramFocus(canvas);
  assert.deepEqual(focused, ['b', 'canvas', 'a']);
});

test('the wheel scrolls the plain list that replaces a diagram, and moves a drawing', () => {
  const sandbox = createApp();
  let prevented = 0;
  const wheel = (hasSvg) => {
    const canvas = { querySelector: (s) => (s === 'svg' && hasSvg ? {} : null) };
    sandbox.handleAppWheel({ target: { closest: (s) => (s === '#diagram-canvas' ? canvas : null) }, preventDefault() { prevented++; }, ctrlKey: false, deltaX: 0, deltaY: 0, deltaMode: 0 });
  };
  wheel(false);
  assert.equal(prevented, 0, 'a list is scrolled by the browser');
  sandbox.document.getElementById = () => null;
  wheel(true);
  assert.equal(prevented, 1, 'with a drawing the wheel is taken, to move it');
});

test('ELK is asked for again after a failure, but not on every render', async () => {
  const sandbox = createApp();
  assert.equal(await sandbox.loadElk(), null, 'the import cannot succeed here');
  assert.equal(run(sandbox, 'elkPromise'), null, 'a failure is not kept for good');
  const failedAt = run(sandbox, 'elkFailedAt');
  assert.ok(failedAt > 0);
  assert.equal(await sandbox.loadElk(), null);
  assert.equal(run(sandbox, 'elkFailedAt'), failedAt, 'within the delay it is not tried again');
  run(sandbox, 'elkFailedAt = elkFailedAt - ELK_RETRY_AFTER_MS - 1;');
  assert.equal(await sandbox.loadElk(), null);
  assert.ok(run(sandbox, 'elkFailedAt') > failedAt - 1 && run(sandbox, 'elkFailedAt') !== failedAt - 31000, 'after the delay it tries again');
});

test('the dimming of the diagram goes when the pointer leaves the canvas', () => {
  const sandbox = createApp();
  const removed = [];
  const svg = { querySelectorAll: () => [], classList: { remove: (c) => removed.push(c), add() {} } };
  sandbox.document.querySelector = (s) => (s === '#diagram-canvas svg' ? svg : null);
  sandbox.document.activeElement = null;
  const inside = {};
  const canvas = { contains: (n) => n === inside };
  const out = (relatedTarget) => sandbox.handleDiagramPointerOut({ target: { closest: () => canvas }, relatedTarget });
  out(inside);
  assert.deepEqual(removed, [], 'moving between two boxes keeps it');
  out(null);
  out({});
  assert.deepEqual(removed, ['dg-dim', 'dg-dim'], 'leaving the canvas clears it');
});

test('two relationships to the same unknown element make one box with two edges; ids of tree groups never collide', async () => {
  const { sandbox, state } = await openFixture();
  const record = state.index.application.get('shop.web.api');
  const dangling = (label) => ({ destination: 'nowhere.at.all', rawLabel: label, label, qualifiers: [], tags: {}, resolved: false });
  record.relationships = record.relationships.concat([dangling('first'), dangling('second')]);
  const result = { items: [{ id: 'shop.web.api', reference: 'shop.web.api' }], links: [] };
  const ghosts = sandbox.buildDiagramGhosts(result, null, 'application');
  assert.equal(ghosts.items.length, 1);
  assert.equal(ghosts.links.length, 2);
  assert.equal(new Set(ghosts.items.map((i) => i.id)).size, ghosts.items.length);
  assert.equal(ghosts.total, 2);

  const id = (layer, reference) => sandbox.treeGroupId('g-', layer, reference);
  assert.notEqual(id('application', 'shop.web'), id('application', 'shop_web'));
  assert.notEqual(id('application', 'shop.web'), id('technology', 'shop.web'));
  assert.notEqual(id('application', 'a_2e_b'), id('application', 'a.b'));
  assert.match(id('application', 'shop.web-1'), /^[A-Za-z0-9_-]+$/);
});

/** The fixture, with an environment that shares its reference (and its children) with the solution `shop`. */
async function openFixtureWithSharedReference() {
  const opened = await openFixture();
  const shop = opened.state.index.application.get('shop');
  const twin = Object.assign({}, shop, { layer: 'technology', children: shop.children.map((child) => Object.assign({}, child, { layer: 'technology' })) });
  opened.state.index.technology.set('shop', twin);
  opened.state.index.technology.set('shop.web', twin.children.find((child) => child.reference === 'shop.web'));
  return Object.assign(opened, { app: shop, tech: twin });
}

test('a reference that is in both layers has one tab stop, not two, and it is the row the user was on', async () => {
  const { sandbox, state } = await openFixtureWithSharedReference();
  const render = (tabStop) => {
    run(sandbox, 'navActiveKey = ' + JSON.stringify(tabStop) + '; navTabStopGiven = false;');
    return [sandbox.renderTreeNodeHtml(state.index.application.get('shop'), 1), sandbox.renderTreeNodeHtml(state.index.technology.get('shop'), 1)]
      .map((html) => html.match(/tabindex="(-?\d)"/)[1]);
  };
  assert.deepEqual(render('application:shop'), ['0', '-1']);
  // the row of the other layer is the one that takes it when the user was on that one, whichever tree comes first
  assert.deepEqual(render('technology:shop'), ['-1', '0']);
  const rows = (html) => [...html.matchAll(/data-node="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(rows(sandbox.renderTreeNodeHtml(state.index.technology.get('shop'), 1)), ['technology:shop']);
  assert.deepEqual(rows(sandbox.renderTreeNodeHtml(state.index.application.get('shop'), 1)), ['application:shop']);
});

test('what the tree remembers of a row (unfolded, modified) is kept per layer: two elements with the same reference do not share it', async () => {
  const { sandbox, state } = await openFixtureWithSharedReference();
  const html = (layer) => sandbox.renderTreeNodeHtml(state.index[layer].get('shop'), 1);
  state.expanded.clear();
  state.dirtyReferences.clear();
  state.expanded.add('application:shop');
  state.dirtyReferences.add('technology:shop');
  assert.match(html('application'), /aria-expanded="true"/);
  assert.match(html('technology'), /aria-expanded="false"/);
  assert.doesNotMatch(html('application'), /modified-dot/);
  assert.match(html('technology'), /modified-dot/);
  assert.match(html('technology'), /aria-label="[^"]*, modified"/);

  // the fold button of a row says which layer it folds
  assert.match(html('technology'), /data-action="toggle-element" data-ref="shop" data-layer="technology"/);
  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  countRenders(sandbox);
  click('toggle-element', { 'data-ref': 'shop', 'data-layer': 'technology' });
  assert.deepEqual(Array.from(state.expanded).sort(), ['application:shop', 'technology:shop']);
  click('toggle-element', { 'data-ref': 'shop', 'data-layer': 'application' });
  assert.deepEqual(Array.from(state.expanded), ['technology:shop']);

  // "Unfold all" of a tree is the unfold of that tree
  state.expanded.clear();
  click('nav-unfold-all', { 'data-layer': 'technology', 'data-branch': 'environments' });
  assert.ok(Array.from(state.expanded).length > 0 && Array.from(state.expanded).every((key) => key.startsWith('technology:')));
  click('nav-fold-all', { 'data-layer': 'technology', 'data-branch': 'environments' });
  assert.equal(state.expanded.size, 0);
});

test('revealing an element unfolds the branches above it in its own layer', async () => {
  const { sandbox, state } = await openFixtureWithSharedReference();
  state.expanded.clear();
  sandbox.expandAncestorsOf('shop.web', 'technology');
  assert.deepEqual(Array.from(state.expanded).sort(), ['technology:shop', 'technology:shop.web']);
  state.expanded.clear();
  // a link to the environment says so (`layer=`), and so does the view it opens
  sandbox.location.hash = '#/elements?ref=shop.web&layer=technology';
  sandbox.applySelectionFromHashRef();
  assert.deepEqual(Array.from(state.expanded).sort(), ['technology:shop', 'technology:shop.web']);
  state.expanded.clear();
  state.selection = { kind: 'none', key: null, mode: 'view' };
  sandbox.expandAncestorsOf('shop.web');
  assert.deepEqual(Array.from(state.expanded).sort(), ['application:shop', 'application:shop.web'], 'no layer asked: the one a reference resolves to');
});

test('a rename rewrites the state of the rows of its own layer only, a delete forgets the rows of its own layer only', async () => {
  const { sandbox, state } = await openFixtureWithSharedReference();
  const keys = (set) => Array.from(set).sort();
  const seed = () => {
    state.expanded = new Set(['application:shop', 'application:shop.web', 'technology:shop', 'technology:shop.web']);
    state.dirtyReferences = new Set(['application:shop.web', 'technology:shop.web']);
    run(sandbox, "navActiveKey = 'technology:shop.web';");
  };

  seed();
  sandbox.rewriteUiReferences('shop', 'store', 'technology');
  assert.deepEqual(keys(state.expanded), ['application:shop', 'application:shop.web', 'technology:store', 'technology:store.web']);
  assert.deepEqual(keys(state.dirtyReferences), ['application:shop.web', 'technology:store.web']);
  assert.equal(run(sandbox, 'navActiveKey'), 'technology:store.web');

  seed();
  sandbox.rewriteUiReferences('shop', 'store', 'application');
  assert.deepEqual(keys(state.expanded), ['application:store', 'application:store.web', 'technology:shop', 'technology:shop.web']);
  assert.deepEqual(keys(state.dirtyReferences), ['application:store.web', 'technology:shop.web']);
  assert.equal(run(sandbox, 'navActiveKey'), 'technology:shop.web', 'the row the user was on is not the renamed one');

  seed();
  sandbox.forgetUiReferences(new Set(['shop', 'shop.web']), 'application');
  assert.deepEqual(keys(state.expanded), ['technology:shop', 'technology:shop.web']);
  assert.deepEqual(keys(state.dirtyReferences), ['technology:shop.web']);
  assert.equal(run(sandbox, 'navActiveKey'), 'technology:shop.web');

  seed();
  sandbox.forgetUiReferences(new Set(['shop', 'shop.web']), 'technology');
  assert.deepEqual(keys(state.expanded), ['application:shop', 'application:shop.web']);
  assert.deepEqual(keys(state.dirtyReferences), ['application:shop.web']);
  assert.equal(run(sandbox, 'navActiveKey'), null);
});

test('leaving a form with text typed and not saved asks first, and staying keeps everything', async () => {
  const { sandbox } = await openFixture();
  const renders = countRenders(sandbox);
  const asked = [];
  let answer = false;
  sandbox.confirm = (message) => { asked.push(message); return answer; };
  const selection = () => JSON.stringify(run(sandbox, 'AppState.selection'));

  // nothing typed: no question
  click(sandbox, 'select-element', { 'data-ref': 'customer' });
  assert.equal(asked.length, 0);
  const before = selection();

  // typed, refused: nothing moves, the draft is still pending
  run(sandbox, 'draftTyped = true');
  click(sandbox, 'select-element', { 'data-ref': 'shop' });
  click(sandbox, 'set-perspective', { 'data-perspective': 'settings' });
  assert.equal(asked.length, 2);
  assert.match(asked[0], /Attention/);
  assert.match(asked[0], /Save all changes/);
  assert.equal(selection(), before);
  assert.equal(run(sandbox, 'draftTyped'), true);

  // an action that keeps the form never asks
  click(sandbox, 'save-all-changes');
  assert.equal(asked.length, 2);

  // typed, accepted: it leaves, and the draft is gone
  answer = true;
  click(sandbox, 'select-element', { 'data-ref': 'shop' });
  assert.equal(asked.length, 3);
  assert.notEqual(selection(), before);
  assert.equal(run(sandbox, 'draftTyped'), false);
  assert.ok(renders.n > 0);
});

test('the manifest files the editor cannot read (TOML, JSON) are named, in Files, and counted in Elements', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const { FIXTURE, makeDirHandle } = require('./harness');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unread-'));
  try {
    fs.cpSync(FIXTURE, root, { recursive: true });
    const sandbox = createApp();
    await sandbox.loadWorkspace(makeDirHandle(root));
    assert.deepEqual(Array.from(sandbox.__state().unreadManifestFiles), [], 'nothing to say about a YAML-only workspace');
    assert.equal(sandbox.renderElementsNavHtml(false).includes('not read by the editor'), false);

    fs.writeFileSync(path.join(root, 'manifests', 'zz.toml'), '[header]\n');
    fs.writeFileSync(path.join(root, 'manifests', 'aa.json'), '{}');
    fs.writeFileSync(path.join(root, 'manifests', 'notes.txt'), 'x');
    await sandbox.loadWorkspace(makeDirHandle(root));
    assert.deepEqual(Array.from(sandbox.__state().unreadManifestFiles), ['manifests/aa.json', 'manifests/zz.toml']);
    assert.ok(!sandbox.__state().manifestFiles.some((mf) => /\.(toml|json)$/.test(mf.relPath)), 'they are not manifests of the editor');
    const files = sandbox.renderFilesNavHtml();
    assert.ok(files.includes('2 manifest files are not read by the editor') && files.includes('manifests/zz.toml') && files.includes('manifests/aa.json'));
    assert.ok(!files.includes('notes.txt'));
    const elements = sandbox.renderElementsNavHtml(false);
    assert.ok(elements.includes('2 manifest files are not read by the editor') && !elements.includes('zz.toml'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the top bar: the perspectives are a button group, the pressed one is the current one, and Close folder is last', async () => {
  const { sandbox, state } = await openFixture();
  state.folder = { name: 'ws' };
  const bar = sandbox.renderTopPanelHtml();
  const tabs = bar.match(/<span class="perspective-tabs button-group" role="group" aria-label="Perspectives">(.*?)<\/span>/)[1];
  const ids = Array.from(tabs.matchAll(/data-perspective="([a-z]+)" aria-pressed="(true|false)"/g));
  assert.ok(ids.length >= 2, 'one button per perspective');
  assert.equal(ids.filter((m) => m[2] === 'true').length, 1, 'exactly one is pressed');
  assert.equal(ids.find((m) => m[2] === 'true')[1], 'timeline', 'the Map is the page called Applications, below Timeline: its button is the pressed one');
  assert.doesNotMatch(bar, /perspective-tab"|class="[^"]*\bactive\b/, 'no more pills with an "active" class');

  run(sandbox, "currentPerspective = 'settings'");
  assert.match(sandbox.renderPerspectiveTabsHtml(), /data-perspective="settings" aria-pressed="true"/);
  assert.match(sandbox.renderPerspectiveTabsHtml(), /data-perspective="timeline" aria-pressed="false"/);

  const at = (needle) => { const i = bar.indexOf(needle); assert.ok(i >= 0, needle); return i; };
  assert.ok(at('class="perspective-tabs') < at('class="top-actions"'));
  assert.ok(at('data-action="save-all-changes"') < at('data-action="toggle-help"'));
  assert.ok(at('data-action="toggle-help"') < at('data-action="close-folder"'), 'Close folder comes after "?"');
  assert.ok(at('data-action="close-folder"') > at('class="top-actions"'), 'in the group pushed to the right');
  assert.match(bar, /<\/button><\/span><\/header>$/, 'the last control of the bar');
});

test('a hovered or focused button of a button group rises above its neighbours, which overlap it by one border', () => {
  const css = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
  assert.match(css, /\.button-group button \+ button \{ margin-left: -1px; \}/);
  assert.match(css, /\.button-group button:hover, \.button-group button:focus-visible \{ position: relative; z-index: 2; \}/);
  assert.match(css, /\.perspective-tabs button\[aria-pressed="true"\]/, 'the pressed perspective is highlighted');
  assert.doesNotMatch(css, /\.perspective-tab[ .{]/, 'the pill styling of the tabs is gone');
});
