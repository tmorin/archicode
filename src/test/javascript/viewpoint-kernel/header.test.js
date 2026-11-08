'use strict';
// The header of the centre panel holds together at any width of the panel (TDD-0016): the markup of each header, the
// text of the stylesheet that answers to the width of the panel, the "⋯" menu and the focus. The harness has no layout
// engine, so a container query cannot run here: what is checked is what the browser is given (the markup per header,
// the rules per state) and what the script does (the menu, the focus) with fake elements.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { openFixture } = require('./harness');
const { loadStylesheet, rulesOf, styleOf, declarationsOf } = require('./stylesheet');
const { readPage } = require('./editor-files');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = readPage();

// ---- helpers: markup ----

/** The inside of the div whose opening tag starts at `from` in `html`, closed at its own `</div>` (the header holds nested divs). */
function divInner(html, from) {
  const open = html.indexOf('>', from) + 1;
  let depth = 1;
  for (const m of html.slice(open).matchAll(/<div\b|<\/div>/g)) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return { inner: html.slice(open, open + m.index), start: open, end: open + m.index };
  }
  throw new Error('a div does not close: ' + html.slice(from, from + 80));
}

/** The whole `.element-header` of a centre panel, and its actions row. */
function headerOf(html) {
  const from = html.indexOf('<div class="element-header">');
  assert.notEqual(from, -1, 'the centre has a header');
  const header = divInner(html, from).inner;
  const actions = divInner(header, header.indexOf('<div class="element-header-actions">'));
  return { header, actions: actions.inner };
}

/** The `.header-overflow` of an actions row, with where it opens and closes in the row. */
function overflowOf(actions) {
  const from = actions.indexOf('<div class="header-overflow"');
  assert.notEqual(from, -1, 'the row has its overflow');
  return divInner(actions, from);
}

const count = (html, needle) => html.split(needle).length - 1;
const dataAction = (name) => 'data-action="' + name + '"';
const buttons = (html) => html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || [];

async function elementsPage(tab, mode) {
  const { sandbox, state } = await openFixture();
  state.selection = { kind: 'element', key: 'shop.web.api', mode: mode || 'view' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = '" + tab + "'; diagramMaximized = false;");
  return { sandbox, state, center: () => sandbox.renderElementsPerspectiveHtml().center };
}

async function mapPage(selected) {
  const { sandbox, state } = await openFixture();
  state.selection = selected ? { kind: 'element', key: 'shop.web.api', mode: 'view' } : { kind: 'none' };
  run(sandbox, "currentPerspective = 'map'; diagramMaximized = false;");
  return { sandbox, state, center: () => sandbox.renderMapPerspectiveHtml().center };
}

// ---- helpers: stylesheet ----

const sheet = loadStylesheet(HTML);

/** The heads of the container queries of the stylesheet, in source order, each once. */
const containerQueries = () => [
  ...new Set(
    rulesOf(styleOf(HTML))
      .flatMap((one) => one.at)
      .filter((head) => head.startsWith('@container'))
      .map((head) => head.replace(/\s+/g, ' '))
  )
];

// ============================================================ 1-3. the markup of each header

test('the actions of the Elements diagram header: the "⋯" and its overflow, then Maximize; the rare controls are in the overflow; the Facet is in the toolbar', async () => {
  const { center } = await elementsPage('overview');
  const { actions } = headerOf(center());
  // run 0217 (REQ-1): the Facet select left the header for the Draw group of the toolbar, so it is not in the row any more
  assert.equal(actions.indexOf('id="diagram-facet-select"'), -1, 'the Facet is not in the header');
  const facet = center().indexOf('id="diagram-facet-select"');
  assert.ok(facet !== -1, 'and it is in the page, in the toolbar');

  const more = actions.indexOf('class="header-more"');
  const moreButton = actions.indexOf(dataAction('toggle-header-menu'));
  const overflow = actions.indexOf('<div class="header-overflow" id="header-overflow"');
  const maximize = actions.indexOf(dataAction('toggle-maximize'));
  for (const [name, at] of Object.entries({ more, moreButton, overflow, maximize }))
    assert.notEqual(at, -1, name + ' is in the row');
  assert.ok(more < moreButton && moreButton < overflow, 'the holder with the "⋯" button, then the overflow');
  const closed = overflowOf(actions);
  assert.ok(closed.end < maximize, 'Maximize comes after the overflow closes: it stays in the row');
  assert.equal(
    actions.indexOf(dataAction('toggle-maximize'), closed.start),
    maximize,
    'and there is no Maximize inside the overflow'
  );

  const inside = closed.inner;
  assert.equal(count(inside, dataAction('show-on-map')), 1, 'Show on map is in the overflow');
  assert.equal(count(inside, dataAction('name-view')), 1);
  assert.equal(count(inside, dataAction('add-to-story')), 1);
  assert.equal(count(inside, dataAction('diagram-export')), 2);
  assert.equal(count(inside, dataAction('diagram-export') + ' data-format="png"'), 1);
  assert.equal(count(inside, dataAction('diagram-export') + ' data-format="svg"'), 1);
  for (const absent of [
    'diagram-facet-select',
    dataAction('toggle-maximize'),
    'viewpoint-switch',
    dataAction('set-element-tab'),
    dataAction('toggle-header-menu'),
    dataAction('open-as-diagram')
  ]) {
    assert.ok(!inside.includes(absent), 'the overflow does not hold ' + absent);
  }
  // the row outside the overflow holds nothing but the "⋯" holder and Maximize
  const rest = actions.slice(0, closed.start) + actions.slice(closed.end);
  assert.deepEqual(
    buttons(rest).map((b) => b.match(/data-action="([^"]+)"/)[1]),
    ['toggle-header-menu', 'toggle-maximize']
  );
});

test('the actions of the Map header have the same structure; the way to the other perspective follows the selection', async () => {
  const selected = await mapPage(true);
  const { actions } = headerOf(selected.center());
  assert.equal(
    actions.indexOf('id="diagram-facet-select"'),
    -1,
    'run 0217: the Facet is in the toolbar, not in the header'
  );
  assert.ok(selected.center().includes('id="diagram-facet-select"'), 'the Map page has it in the toolbar');
  const moreButton = actions.indexOf(dataAction('toggle-header-menu'));
  const overflow = actions.indexOf('<div class="header-overflow" id="header-overflow"');
  const maximize = actions.indexOf(dataAction('toggle-maximize'));
  assert.ok(actions.indexOf('class="header-more"') < moreButton && moreButton < overflow);
  const closed = overflowOf(actions);
  assert.ok(closed.end < maximize, 'Maximize is after the overflow');
  assert.equal(
    count(closed.inner, dataAction('open-as-diagram')),
    1,
    'with a selection, Open in Elements is in the overflow'
  );
  assert.ok(!closed.inner.includes(dataAction('show-on-map')), 'and Show on map is not');
  assert.equal(count(closed.inner, dataAction('name-view')), 1);
  assert.equal(count(closed.inner, dataAction('add-to-story')), 1);
  assert.equal(count(closed.inner, dataAction('diagram-export')), 2);
  for (const absent of ['diagram-facet-select', dataAction('toggle-maximize'), dataAction('toggle-header-menu')])
    assert.ok(!closed.inner.includes(absent), 'the overflow does not hold ' + absent);

  const none = await mapPage(false);
  const bare = headerOf(none.center()).actions;
  const bareOverflow = overflowOf(bare);
  assert.ok(!bare.includes(dataAction('open-as-diagram')), 'nothing selected: nothing to open');
  assert.equal(count(bareOverflow.inner, dataAction('name-view')), 1, 'Story is still in the overflow');
  assert.equal(count(bareOverflow.inner, dataAction('add-to-story')), 1);
  assert.equal(count(bareOverflow.inner, dataAction('diagram-export')), 2, 'and so is Download');
  assert.ok(bareOverflow.end < bare.indexOf(dataAction('toggle-maximize')));
});

test('every control of a diagram header is in the page once: no copy for the narrow state', async () => {
  const elements = await elementsPage('overview');
  const mapWith = await mapPage(true);
  const mapWithout = await mapPage(false);
  const cases = [
    [elements.center(), 'show-on-map', 'Elements'],
    [mapWith.center(), 'open-as-diagram', 'Map with a selection'],
    [mapWithout.center(), null, 'Map without a selection']
  ];
  for (const [html, opener, label] of cases) {
    const { header } = headerOf(html);
    if (opener) assert.equal(count(header, dataAction(opener)), 1, label + ': ' + opener);
    for (const name of ['name-view', 'add-to-story', 'toggle-maximize', 'toggle-header-menu'])
      assert.equal(count(header, dataAction(name)), 1, label + ': ' + name);
    assert.equal(count(header, dataAction('diagram-export')), 2, label + ': png and svg');
    assert.equal(count(header, dataAction('diagram-export') + ' data-format="png"'), 1, label + ': png');
    assert.equal(count(header, dataAction('diagram-export') + ' data-format="svg"'), 1, label + ': svg');
    // run 0217: the Facet select is in the page once, in the toolbar, and not in the header
    assert.equal(count(header, 'id="diagram-facet-select"'), 0, label + ': no facet in the header');
    assert.equal(count(html, 'id="diagram-facet-select"'), 1, label + ': the facet, once, in the toolbar');
    assert.equal(count(header, 'id="header-overflow"'), 1, label + ': the overflow');
    assert.equal(count(header, 'class="header-more"'), 1, label + ': the holder');
  }
  assert.equal(count(headerOf(mapWithout.center()).header, dataAction('open-as-diagram')), 0);
  assert.equal(count(headerOf(mapWithout.center()).header, dataAction('show-on-map')), 0);
});

// ============================================================ 4. the button and the menu, as the screen reader gets them

test('the "⋯" button and its menu say what they are, and the open state is written by the markup', async () => {
  const { sandbox, center } = await elementsPage('overview');
  const closed = headerOf(center()).actions;
  const button = buttons(closed).find((b) => b.includes(dataAction('toggle-header-menu')));
  assert.match(button, /\baria-haspopup="true"/);
  assert.match(button, /\baria-expanded="false"/);
  assert.match(button, /\baria-label="More actions"/);
  assert.match(button, /\btitle="[^"]+"/, 'a title');
  assert.match(button, /class="header-more-button"/);
  const controls = button.match(/aria-controls="([^"]+)"/)[1];
  assert.equal(controls, 'header-overflow');
  assert.equal(
    controls,
    closed.match(/<div class="header-overflow" id="([^"]+)"/)[1],
    'it controls the id of the overflow'
  );
  assert.match(
    closed,
    /<div class="header-overflow" id="header-overflow" role="group" aria-label="More actions" data-open="false">/
  );

  run(sandbox, 'headerMenuOpen = true');
  const open = headerOf(center()).actions;
  assert.match(
    buttons(open).find((b) => b.includes(dataAction('toggle-header-menu'))),
    /\baria-expanded="true"/,
    'a redraw keeps the menu open: the button says so'
  );
  assert.match(
    open,
    /<div class="header-overflow" id="header-overflow" role="group" aria-label="More actions" data-open="true">/,
    'and so does the menu'
  );
  run(sandbox, 'headerMenuOpen = false');
  assert.match(headerOf(center()).actions, /data-open="false"/);
});

test('the Map header has the same button and menu attributes', async () => {
  const { sandbox, center } = await mapPage(true);
  run(sandbox, 'headerMenuOpen = true');
  const { actions } = headerOf(center());
  const button = buttons(actions).find((b) => b.includes(dataAction('toggle-header-menu')));
  assert.match(
    button,
    /aria-haspopup="true"[^>]*aria-expanded="true"[^>]*aria-controls="header-overflow"[^>]*aria-label="More actions"/
  );
  assert.match(actions, /id="header-overflow" role="group" aria-label="More actions" data-open="true"/);
});

// ============================================================ 5. the compact state's contract

test('a control that loses its word in the compact state keeps its name: with-icon, title, aria-label equal to the word, a hidden icon', async () => {
  const elements = await elementsPage('overview');
  const mapWith = await mapPage(true);
  const expected = [
    [elements.center(), ['show-on-map', 'name-view', 'add-to-story', 'toggle-maximize']],
    [mapWith.center(), ['open-as-diagram', 'name-view', 'add-to-story', 'toggle-maximize']]
  ];
  const checkAll = (html, actions, label) => {
    const withIcon = buttons(headerOf(html).header).filter((b) => /class="[^"]*\bwith-icon\b/.test(b));
    assert.deepEqual(
      withIcon.map((b) => b.match(/data-action="([^"]+)"/)[1]).sort(),
      actions.slice().sort(),
      label + ': the controls with an icon'
    );
    for (const b of withIcon) {
      const name = b.match(/data-action="([^"]+)"/)[1];
      assert.match(b, /\btitle="[^"]+"/, name + ' has a title');
      const word = b.match(/<span class="control-label">([^<]+)<\/span>/);
      assert.ok(word, name + ' has its word in a control-label span');
      assert.equal(b.match(/aria-label="([^"]+)"/)[1], word[1], name + ': aria-label is the word that goes away');
      assert.match(b, /<svg\b[^>]*aria-hidden="true"/, name + ': the icon is hidden from the screen readers');
    }
    return withIcon;
  };
  for (const [html, actions] of expected) checkAll(html, actions, html === expected[0][0] ? 'Elements' : 'Map');

  const labelOfMaximize = (html) =>
    buttons(html)
      .find((b) => b.includes(dataAction('toggle-maximize')))
      .match(/<span class="control-label">([^<]+)<\/span>/)[1];
  assert.equal(labelOfMaximize(elements.center()), 'Maximize');
  run(elements.sandbox, 'diagramMaximized = true');
  const restored = elements.center();
  // run 0217 (REQ-4): the word does not change, `aria-pressed` says the state
  assert.equal(labelOfMaximize(restored), 'Maximize', 'maximized: the word stays Maximize');
  assert.match(
    buttons(restored).find((b) => b.includes(dataAction('toggle-maximize'))),
    /aria-pressed="true"[^>]*aria-label="Maximize"/
  );
});

// ============================================================ 6. the headers that are not diagram headers

test('the Details tab and the edit form are not diagram headers: no "⋯", no overflow, and Show on map keeps its name', async () => {
  const details = await elementsPage('details');
  const view = details.center();
  const { header, actions } = headerOf(view);
  for (const part of [
    'header-more',
    'header-overflow',
    'toggle-header-menu',
    'diagram-facet-select',
    'toggle-maximize'
  ]) {
    assert.ok(!header.includes(part), 'Details: no ' + part);
  }
  const showOnMap = buttons(actions).find((b) => b.includes(dataAction('show-on-map')));
  assert.ok(showOnMap, 'Details: Show on map is still in the header');
  assert.match(showOnMap, /class="with-icon"/);
  assert.match(showOnMap, /aria-label="Show on map"/);
  assert.match(showOnMap, /\btitle="[^"]+"/);
  assert.match(showOnMap, /<span class="control-label">Show on map<\/span>/);
  assert.ok(actions.includes(dataAction('toggle-element-edit')));

  const edit = await elementsPage('details', 'edit');
  const form = headerOf(edit.center());
  for (const part of [
    'header-more',
    'header-overflow',
    'toggle-header-menu',
    'diagram-facet-select',
    'toggle-maximize'
  ]) {
    assert.ok(!form.header.includes(part), 'Edit form: no ' + part);
  }
  assert.ok(form.actions.includes(dataAction('toggle-element-edit')), 'the edit form is the one that has Back to view');
});

// ============================================================ 7. the stylesheet
// What the header does at each width of the centre is read in a browser (stylesheet-claims.spec.js); here, what the rules say.

test('the centre panel is the container, and the three states are container queries, widest first', () => {
  const containers = rulesOf(styleOf(HTML))
    .filter((one) => one.selector === '.center-panel' && one.at.length === 0)
    .flatMap((one) => declarationsOf(one.body))
    .filter(([name]) => name === 'container');
  assert.deepEqual(containers, [['container', 'center / inline-size']], 'a container of its inline size');
  assert.deepEqual(
    containerQueries(),
    [85, 60, 46].map((rem) => '@container center (max-width: ' + rem + 'rem)'),
    'exactly three container queries: 85rem, 60rem, 46rem, in that order'
  );
});

test('the strip is gone: nothing scrolls inside the actions row, and the header does not answer to the window', () => {
  const rules = rulesOf(styleOf(HTML));
  for (const rule of rules.filter((one) => one.selector.includes('element-header-actions')))
    assert.equal(
      declarationsOf(rule.body).some(([name]) => name === 'overflow-x'),
      false,
      rule.selector + ' has no overflow-x'
    );
  for (const rule of rules.filter((one) => one.at.some((head) => /^@media\s*\(\s*max-width/.test(head))))
    for (const name of ['.element-header', '.maximize-label', '.element-header-actions'])
      assert.ok(!rule.selector.includes(name), rule.at + ' does not mention ' + name);
  assert.equal(
    rules.some((one) => one.selector.includes('.maximize-label')),
    false,
    'the word of Maximize is a control-label now'
  );
});

test('the help keeps its look: the "⋯" menu reuses it without changing it', () => {
  assert.equal(sheet.decl('.help-menu', 'position'), 'absolute');
  assert.equal(sheet.decl('.help-menu', 'top'), 'calc(100% + 0.25rem)');
});

// ============================================================ 8. the menu, with fake elements

/** A page whose document answers `.header-more-button`, `.header-overflow` and the first control of the menu with fakes. */
async function menuPage() {
  const { sandbox, state } = await openFixture();
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'overview'; diagramMaximized = false;");
  const log = { renders: 0 };
  sandbox.render = () => {
    log.renders++;
  };
  const control = (action, extra) =>
    Object.assign(
      {
        attrs: {},
        focused: 0,
        disabled: false,
        setAttribute(k, v) {
          this.attrs[k] = v;
        },
        focus() {
          this.focused++;
          sandbox.document.activeElement = this;
        },
        closest(selector) {
          return selector === '[data-action]'
            ? { getAttribute: (name) => (name === 'data-action' ? action : null) }
            : null;
        }
      },
      extra
    );
  const button = control('toggle-header-menu');
  const menu = {
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    }
  };
  const first = control('show-on-map');
  sandbox.document.querySelector = (selector) =>
    ({
      '.header-more-button': button,
      '.header-overflow': menu,
      '.header-overflow button:not(:disabled)': first
    })[selector] || null;
  const open = () => run(sandbox, 'headerMenuOpen');
  /** A click as handleAppClick reads it: the nearest data-action, and whether it landed inside the overflow. */
  const click = (action, { inside = false, detail = 1 } = {}) => {
    const target = action ? { getAttribute: (name) => (name === 'data-action' ? action : null) } : null;
    sandbox.handleAppClick({
      target: {
        closest: (selector) =>
          selector === '[data-action]' ? target : inside && selector === '.header-overflow' ? {} : null
      },
      detail,
      preventDefault() {},
      stopPropagation() {}
    });
  };
  const key = (k) => {
    const e = {
      key: k,
      prevented: 0,
      stopped: 0,
      preventDefault() {
        this.prevented++;
      },
      stopImmediatePropagation() {
        this.stopped++;
      }
    };
    sandbox.handleHeaderMenuKeydown(e);
    return e;
  };
  return { sandbox, state, log, button, menu, first, open, click, key, control };
}

test('setHeaderMenuOpen writes aria-expanded and data-open, without drawing the page again', async () => {
  const { sandbox, log, button, menu, open } = await menuPage();
  sandbox.setHeaderMenuOpen(true);
  assert.equal(open(), true);
  assert.equal(button.attrs['aria-expanded'], 'true');
  assert.equal(menu.attrs['data-open'], 'true');
  sandbox.setHeaderMenuOpen(false);
  assert.equal(open(), false);
  assert.equal(button.attrs['aria-expanded'], 'false');
  assert.equal(menu.attrs['data-open'], 'false');
  assert.equal(log.renders, 0, 'no redraw: what was typed and not committed stays');
  assert.equal(button.focused, 0, 'and no focus moved');
});

test('setHeaderMenuOpen moves the focus only when asked: to the button on close, to the first control on open', async () => {
  const { sandbox, button, first } = await menuPage();
  sandbox.setHeaderMenuOpen(true, { focusMenu: true });
  assert.equal(first.focused, 1, 'opened from the keyboard: the first control');
  assert.equal(button.focused, 0);
  sandbox.setHeaderMenuOpen(false, { focusButton: true });
  assert.equal(button.focused, 1, 'closed from the keyboard: back on the button');
  sandbox.setHeaderMenuOpen(true, { focusButton: true });
  assert.equal(button.focused, 1, 'focusButton means nothing when opening');
  sandbox.setHeaderMenuOpen(false);
  assert.equal(button.focused, 1, 'closing without the option leaves the focus');
  assert.equal(first.focused, 1);
});

test('the "⋯" button toggles the menu; the keyboard (detail 0) moves the focus along, the mouse does not', async () => {
  const { sandbox, button, first, open, click, log } = await menuPage();
  click('toggle-header-menu', { detail: 1 });
  assert.equal(open(), true, 'a click opens');
  assert.equal(first.focused + button.focused, 0, 'the mouse moves no focus');
  click('toggle-header-menu', { detail: 1 });
  assert.equal(open(), false, 'a second click closes');
  assert.equal(first.focused + button.focused, 0);

  click('toggle-header-menu', { detail: 0, inside: false });
  assert.equal(open(), true);
  assert.equal(first.focused, 1, 'Enter or Space on the button: the focus goes to the first control');
  click('toggle-header-menu', { detail: 0 });
  assert.equal(open(), false);
  assert.equal(button.focused, 1, 'and back to the button when closed the same way');
  assert.equal(log.renders, 0);
  assert.equal(sandbox.document.activeElement, button);
});

test('a click outside the menu closes it and leaves the focus; a click inside that is not on an action leaves it open', async () => {
  const { sandbox, button, first, open, click } = await menuPage();
  sandbox.setHeaderMenuOpen(true);
  click(null, { inside: true });
  assert.equal(open(), true, 'inside, on nothing: still open');
  click(null, { inside: false });
  assert.equal(open(), false, 'outside: closed');
  assert.equal(button.focused + first.focused, 0, 'with no focus move');

  sandbox.setHeaderMenuOpen(true);
  click('select-element', { inside: false });
  assert.equal(open(), false, 'an action elsewhere closes it too');
  assert.equal(button.focused, 0, 'without taking the focus from where the user went');
});

test('a click on an item closes the menu and puts the focus on the "⋯" button', async () => {
  const { sandbox, state, button, open, click } = await menuPage();
  for (const action of ['add-to-story', 'name-view', 'show-on-map', 'diagram-export']) {
    const before = button.focused;
    sandbox.setHeaderMenuOpen(true);
    state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
    try {
      click(action, { inside: true });
    } catch (e) {
      /* what the action does is not this test's */
    }
    assert.equal(open(), false, action + ': closed');
    assert.equal(button.focused, before + 1, action + ': the focus is on the button');
  }
});

test('Escape closes the open menu, and only that; with the menu closed it is left to the rest of the page', async () => {
  const { sandbox, button, open, key } = await menuPage();
  sandbox.setHeaderMenuOpen(true);
  const closing = key('Escape');
  assert.equal(open(), false);
  assert.equal(closing.prevented, 1, 'the key is consumed');
  assert.equal(closing.stopped, 1, 'and stopped, so that it does not also bring a maximized diagram back');
  assert.equal(button.focused, 1, 'the focus goes back to the button');

  const idle = key('Escape');
  assert.equal(idle.prevented, 0, 'closed: Escape is not touched');
  assert.equal(idle.stopped, 0);
  assert.equal(button.focused, 1);

  sandbox.setHeaderMenuOpen(true);
  const other = key('a');
  assert.equal(open(), true, 'another key does not close it');
  assert.equal(other.prevented + other.stopped, 0);
  assert.ok(run(sandbox, 'typeof handleHeaderMenuKeydown') === 'function');
  assert.ok(
    (sandbox.__documentListeners.keydown || []).includes(sandbox.handleHeaderMenuKeydown),
    'it listens on the document'
  );
});

test('a menu left open while the panel grew wide again does not swallow Escape: the "⋯" button is not drawn, the key is the page\'s', async () => {
  const { sandbox, button, open, key } = await menuPage();
  sandbox.setHeaderMenuOpen(true);
  button.getClientRects = () => []; // display: none: the header is wide, the menu is the inline row
  const idle = key('Escape');
  assert.equal(idle.prevented + idle.stopped, 0, 'not consumed: it still un-maximizes the diagram');
  assert.equal(open(), false, 'and the leftover state is cleared');
});

test('opening the help closes the "⋯" menu', async () => {
  const { sandbox, open, click } = await menuPage();
  sandbox.setHeaderMenuOpen(true);
  click('toggle-help', { inside: false });
  assert.equal(open(), false, 'the help button is a click outside the menu');
  assert.equal(run(sandbox, 'helpOpen'), true, 'and the help opens');
});

// ============================================================ 9. the focus

test('headerControlSelector finds the "⋯" button, an item of the menu and a download format again after a redraw', async () => {
  const { sandbox } = await openFixture();
  const control = (attrs) => ({ id: '', closest: () => ({ id: '', getAttribute: (name) => attrs[name] || null }) });
  assert.equal(
    sandbox.headerControlSelector(control({ 'data-action': 'toggle-header-menu' })),
    '[data-action="toggle-header-menu"]'
  );
  assert.equal(
    sandbox.headerControlSelector(control({ 'data-action': 'add-to-story' })),
    '[data-action="add-to-story"]'
  );
  assert.equal(
    sandbox.headerControlSelector(control({ 'data-action': 'diagram-export', 'data-format': 'png' })),
    '[data-action="diagram-export"][data-format="png"]'
  );
  assert.equal(
    sandbox.headerControlSelector(control({ 'data-action': 'diagram-export', 'data-format': 'svg' })),
    '[data-action="diagram-export"][data-format="svg"]'
  );
  assert.equal(sandbox.headerControlSelector({ closest: () => null }), null);
});

test('the headers are among the places whose controls get their focus back', () => {
  const source = HTML.slice(HTML.indexOf('function headerControlSelector'), HTML.indexOf('function resolveNavActive'));
  assert.ok(
    source.includes("'.element-header button, .element-header select"),
    'the buttons of the header, the "⋯" and the items among them'
  );
});

test('focusControl focuses a drawn control itself, and a hidden one through the "⋯" button when there is one on screen', async () => {
  const { sandbox } = await openFixture();
  const fake = (extra) =>
    Object.assign(
      {
        focused: [],
        focus(options) {
          this.focused.push(options);
        }
      },
      extra
    );

  const visible = fake({ getClientRects: () => [{}] });
  sandbox.focusControl(visible);
  assert.equal(visible.focused.length, 1, 'a control that is drawn gets the focus itself');
  assert.deepEqual(JSON.parse(JSON.stringify(visible.focused[0])), { preventScroll: true });

  const shown = fake({ getClientRects: () => [{}] });
  const hidden = fake({
    getClientRects: () => [],
    closest: (selector) =>
      selector === '.header-more'
        ? { querySelector: (inner) => (inner === '.header-more-button' ? shown : null) }
        : null
  });
  sandbox.focusControl(hidden);
  assert.equal(hidden.focused.length, 0, 'an item that is not drawn is not focused');
  assert.equal(shown.focused.length, 1, 'the "⋯" button takes the focus instead');

  const offscreenButton = fake({ getClientRects: () => [] });
  const lost = fake({
    getClientRects: () => [],
    closest: () => ({ querySelector: () => offscreenButton })
  });
  sandbox.focusControl(lost);
  assert.equal(offscreenButton.focused.length, 0, 'a "⋯" that is not drawn either is no refuge');
  assert.equal(lost.focused.length, 1, 'the control itself is focused as before');

  const alone = fake({ getClientRects: () => [], closest: () => null });
  sandbox.focusControl(alone);
  assert.equal(alone.focused.length, 1, 'no "⋯" holder: the control itself');

  const holderWithoutButton = fake({ getClientRects: () => [], closest: () => ({ querySelector: () => null }) });
  sandbox.focusControl(holderWithoutButton);
  assert.equal(holderWithoutButton.focused.length, 1, 'a holder without a button: the control itself');

  const plain = fake({});
  sandbox.focusControl(plain);
  assert.equal(
    plain.focused.length,
    1,
    'an element that cannot tell whether it is drawn (a fake of the harness) is focused itself'
  );
});

test('the control that gets the focus back after a redraw is focused through focusControl', () => {
  const at = HTML.indexOf(
    'const focusedControl = focusedScopeRef ? null : headerControlSelector(document.activeElement);'
  );
  assert.notEqual(at, -1);
  const after = HTML.slice(at, at + 2500);
  assert.match(after, /focusControl\(/, 'the restoration goes through focusControl');
  assert.match(
    HTML,
    /const wanted = app\.querySelector\(pendingFocusSelector\);\s*if \(wanted && !wanted\.disabled\) focusControl\(wanted\);/,
    'so does the return from a dialog (pendingFocusSelector)'
  );
});

test('an item of the menu that opens a dialog hands the "⋯" button to the dialog as the place to come back to', async () => {
  const { sandbox, state, button, control, click, open } = await menuPage();
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  const item = control('add-to-story');
  sandbox.document.activeElement = item;
  sandbox.setHeaderMenuOpen(true);
  click('add-to-story', { inside: true });
  assert.equal(open(), false, 'the menu is closed');
  assert.equal(sandbox.document.activeElement, button, 'the focus is on the button when the dialog opens');
  const dialog = run(sandbox, 'appDialog');
  assert.ok(dialog, 'the dialog is open');
  assert.equal(dialog.kind, 'story-picker');
  assert.equal(
    dialog.returnFocus,
    '[data-action="toggle-header-menu"]',
    'it comes back to the "⋯", not to an item that is hidden again'
  );
});

test('the dialog returns the focus to the item itself when the menu is not in use (wide header)', async () => {
  const { sandbox, state, control, click } = await menuPage();
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  sandbox.document.activeElement = control('add-to-story');
  click('add-to-story', { inside: true });
  assert.equal(
    run(sandbox, 'appDialog').returnFocus,
    '[data-action="add-to-story"]',
    'no menu open: the control that opened the dialog'
  );
});

// ============================================================ the toolbar and the status line of a diagram in a narrow centre

test('a narrow centre: the hint and the legend of the status line never exceed it', () => {
  // the groups of the toolbar wrap inside the centre: diagram-toolbar.spec.js (360 px, no control outside the window)
  assert.equal(
    sheet.decl('#diagram-hint', 'max-width'),
    '100%',
    'the hint (flex: none) wraps its text in a status line narrower than it'
  );
  assert.equal(sheet.decl('.dg-legend', 'max-width'), '100%');
  assert.equal(sheet.decl('.dg-legend', 'flex-wrap'), 'wrap', 'and so does the legend');
});
