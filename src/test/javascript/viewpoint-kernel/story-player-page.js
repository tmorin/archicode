'use strict';
// The story player played in Node (wave 021, run 0153, #153): a page on a copy of a shipped folder in memory (the real `render()` over the real kernel, a fake layout), and, around it,
// the pieces of a browser the player needs and the harness has not: a container (`#story-player`) whose markup is parsed into the buttons and the list a test can click, focus and
// tab through, a canvas with an SVG to frame, the live region, the focus (`document.activeElement`) and `inert` on #app. Used by story-player-modal.test.js.
const fs = require('node:fs');
const path = require('node:path');
const { run, startPage } = require('./library-page');

const REPO = path.resolve(__dirname, '../../../..');
const LAYERED = path.join(REPO, 'src/test/resources/brightcart/layered');
const DOMAIN_PLATEAUS = path.join(REPO, 'src/doc/examples/domain_plateaus');

/** Every file of a folder, as a path -> text object. */
function filesOf(dir, prefix = '') {
  const out = {};
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) Object.assign(out, filesOf(dir, rel));
    else out[rel] = fs.readFileSync(path.join(dir, rel), 'utf8');
  }
  return out;
}
const FILES = new Map();
const shippedFiles = (dir) => { if (!FILES.has(dir)) FILES.set(dir, filesOf(dir)); return FILES.get(dir); };

/** The shipped stories and the homes they are played from (the plateau and comparison on screen when Play is pressed; `compare` is the choice of the band). */
const SHIPPED = [
  { story: 'migration', dir: DOMAIN_PLATEAUS, homes: [{}, { plateau: 'to-be', compare: 'past' }] },
  { story: 'fork_tour', dir: LAYERED, homes: [{}, { plateau: 'marketplace', compare: 'past' }] },
  { story: 'order_journey', dir: LAYERED, homes: [{}, { plateau: 'marketplace', compare: 'past' }, { plateau: 'saas', compare: 'other:marketplace' }] },
  { story: 'seller_journey', dir: LAYERED, homes: [{}, { plateau: 'inhouse', compare: 'other:saas' }] }
];

/** A copy of a value that a later write cannot change: maps, sets, arrays and plain objects, cycles kept. */
function cloneDeep(value, seen = new Map()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (Object.prototype.toString.call(value) === '[object Map]') {
    const out = new Map();
    seen.set(value, out);
    for (const [k, v] of value) out.set(cloneDeep(k, seen), cloneDeep(v, seen));
    return out;
  }
  if (Object.prototype.toString.call(value) === '[object Set]') {
    const out = new Set();
    seen.set(value, out);
    for (const v of value) out.add(cloneDeep(v, seen));
    return out;
  }
  if (Array.isArray(value)) {
    const out = [];
    seen.set(value, out);
    for (const v of value) out.push(cloneDeep(v, seen));
    return out;
  }
  const out = {};
  seen.set(value, out);
  for (const key of Object.keys(value)) out[key] = cloneDeep(value[key], seen);
  return out;
}

/** The ids of the boxes and the `from>to` of the links of a markup, which is what "the same boxes and links" means. */
function boxesAndLinks(html) {
  return {
    boxes: Array.from(html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]).sort(),
    links: Array.from(html.matchAll(/<g class="dg-link" data-from="([^"]*)" data-to="([^"]*)"/g), (m) => m[1] + '>' + m[2]).sort()
  };
}

/** An element of the container, from its tag in the markup: attributes, `disabled`, `focus()`, and the few selectors the player asks of it. */
function fakeControl(tag, attributes, dom) {
  const attrs = Object.assign({}, attributes);
  const el = {
    tagName: tag.toUpperCase(),
    attrs,
    get disabled() { return 'disabled' in attrs; },
    hidden: false,
    isContentEditable: false,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    hasAttribute: (name) => name in attrs,
    setAttribute: (name, value) => { attrs[name] = String(value); },
    focus() { dom.active = el; },
    matches: (selector) => selector === '[data-player-step-menu]' && 'data-player-step-menu' in attrs,
    closest: (selector) => (selector === '[data-player-action]' && 'data-player-action' in attrs ? el : selector === '[data-player-step-menu]' && 'data-player-step-menu' in attrs ? el : null)
  };
  return el;
}

/**
 * The container of the player, an element that parses what is written in it into its buttons and list; `listeners` are the handlers the page put on it; `dom.active` is the
 * element that has the focus. `onWrite` is called each time its markup is replaced (a new markup is a new canvas).
 */
function fakeRoot(dom, onWrite) {
  let html = '';
  let controls = [];
  const root = {
    hidden: true,
    listeners: {},
    addEventListener(type, fn) { (root.listeners[type] = root.listeners[type] || []).push(fn); },
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      controls = Array.from(html.matchAll(/<(button|select)\b([^>]*)>/g), (m) => fakeControl(m[1], Object.fromEntries(Array.from(m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g), (a) => [a[1], a[2] === undefined ? '' : a[2]])), dom));
      onWrite();
    },
    controls: () => controls,
    contains: (el) => controls.includes(el),
    querySelector(selector) {
      const action = /^\[data-player-action="([^"]*)"\]$/.exec(selector);
      if (action) return controls.find((el) => el.attrs['data-player-action'] === action[1]) || null;
      if (selector === '[data-player-step-menu]') return controls.find((el) => 'data-player-step-menu' in el.attrs) || null;
      return null;
    },
    querySelectorAll: () => controls.slice()
  };
  return root;
}

/** A canvas of 800 x 600 px with an SVG the player can frame (its size and its transform are what it writes). */
function fakeCanvas() {
  const svg = { attrs: {}, style: {}, setAttribute(name, value) { svg.attrs[name] = String(value); } };
  return {
    svg,
    clientWidth: 800,
    clientHeight: 600,
    parentElement: { querySelector: () => null },
    querySelector: (selector) => (selector === 'svg' ? svg : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    classList: { add() {}, remove() {} }
  };
}

/**
 * A page on a copy of a folder in memory with the home drawn as the reader would have drawn it (`home.plateau`, `home.compare`), and the player's surroundings:
 * `page.root`, `page.canvas()`, `page.region` (the live region), `page.dom.active` (the focus), `page.app` (the markup of #app and its `inert`).
 */
async function openPlayerPage(files, home, options) {
  const opts = options || {};
  const page = await startPage({ only: files });
  const { sandbox } = page;
  const dom = { active: null };
  let canvas = null;
  const root = fakeRoot(dom, () => { canvas = null; });
  const region = { textContent: '' };
  const app = sandbox.document.getElementById('app');
  const inert = { value: false, calls: [] };
  app.setAttribute = (name) => { if (name === 'inert') { inert.value = true; inert.calls.push('set'); } };
  app.removeAttribute = (name) => { if (name === 'inert') { inert.value = false; inert.calls.push('remove'); } };
  const previous = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => {
    if (id === 'story-player') return root;
    if (id === 'story-announcer') return region;
    if (id === 'player-canvas') return /id="player-canvas"/.test(root.innerHTML) ? (canvas = canvas || fakeCanvas()) : null;
    return previous.call(sandbox.document, id);
  };
  Object.defineProperty(sandbox.document, 'activeElement', { get: () => dom.active, configurable: true });
  if (opts.fullscreen) {
    sandbox.document.fullscreenEnabled = true;
    root.requestFullscreen = opts.fullscreen.request;
  }
  if (home && home.plateau) {
    sandbox.drawPlateau(home.plateau, { compare: home.compare || '' });
    await page.show();
  } else {
    await page.show();
  }
  Object.assign(page, { dom, root, region, app, inert, playerCanvas: () => (/id="player-canvas"/.test(root.innerHTML) ? (canvas = canvas || fakeCanvas()) : null) });
  return page;
}

/** Waits until the player shows the scene of the step it is on (the answer of `storyStepScene` has come and been drawn). */
async function sceneShown(page, expectedStep) {
  const { waitFor } = require('./harness');
  return waitFor(() => {
    const player = run(page.sandbox, 'storyPlayer');
    return player && player.scene && player.scene.index === player.step && (expectedStep === undefined || player.step === expectedStep) ? player : null;
  }, 'the scene of the step shown by the player');
}

/** A click on a control of the player, as the container's listener receives it. */
function playerClick(page, action) {
  const control = action === 'menu' ? page.root.querySelector('[data-player-step-menu]') : page.root.querySelector('[data-player-action="' + action + '"]');
  if (!control) throw new Error('no control ' + action + ' in the player');
  for (const fn of page.root.listeners.click || []) fn({ target: control });
  return control;
}

/** The menu of the steps changed to `index`, as the container's `change` listener receives it. */
function playerChoose(page, index) {
  const menu = page.root.querySelector('[data-player-step-menu]');
  menu.value = String(index);
  for (const fn of page.root.listeners.change || []) fn({ target: menu });
}

/** A key as the player's document listener reads it; `target` defaults to the control that has the focus. */
function keyEvent(page, key, extra) {
  const target = (extra && extra.target) || page.dom.active || { tagName: 'BODY', closest: () => null };
  const event = Object.assign({ key, target, defaultPrevented: false, preventDefault() { event.defaultPrevented = true; }, stopPropagation() { event.stopped = true; } }, extra);
  return event;
}
function press(page, key, extra) {
  const event = keyEvent(page, key, extra);
  page.sandbox.handleStoryPlayerKeydown(event);
  return event;
}

/** A click on a Play button: the control as the page draws it, with the story it plays. */
function playButton(page, story) {
  const opener = {
    attrs: { 'data-action': 'story-player-open', 'data-story': story },
    getAttribute(name) { return name in opener.attrs ? opener.attrs[name] : null; },
    closest(selector) { return selector === '[data-action]' ? opener : null; },
    focused: 0,
    focus() { opener.focused++; page.dom.active = opener; }
  };
  return opener;
}
function pressPlay(page, story) {
  const opener = playButton(page, story);
  page.dom.active = opener;
  page.sandbox.handleAppClick({ target: opener, preventDefault() {}, stopPropagation() {}, detail: 1 });
  return opener;
}

/** Everything of the editor that the player must leave alone, by value and by identity. */
function editorOf(page) {
  const { sandbox, state } = page;
  return {
    state: cloneDeep(state),
    identity: [state.index, state.baseline, state.layers, state.layers && state.layers.compare, state.selection, state.plateauTree, state.workspace],
    perspective: run(sandbox, 'currentPerspective'),
    hash: sandbox.location.hash,
    version: run(sandbox, 'modelVersion'),
    activeStory: cloneDeep(run(sandbox, 'activeStory')),
    storyHome: cloneDeep(run(sandbox, 'storyHome')),
    selectedStoryId: run(sandbox, 'selectedStoryId'),
    storyBarNotice: run(sandbox, 'storyBarNotice'),
    removedStep: run(sandbox, 'removedStep'),
    diagramScene: run(sandbox, 'diagramScene'),
    diagramCache: run(sandbox, 'diagramCache'),
    comparisonCache: run(sandbox, 'comparisonCache'),
    shown: run(sandbox, 'diagramShownView'),
    html: page.html(),
    files: Object.fromEntries(Array.from(page.mem.files, ([p, f]) => [p, f.text])),
    writes: page.mem.writes.slice()
  };
}

module.exports = { REPO, LAYERED, DOMAIN_PLATEAUS, shippedFiles, SHIPPED, cloneDeep, boxesAndLinks, openPlayerPage, sceneShown, playerClick, playerChoose, press, keyEvent, playButton, pressPlay, editorOf };
