'use strict';
// The page of a view in the Library, played in Node: the real `render()` over the real kernel, a fake layout engine and a fake canvas (runs 0027-0029).
// `startPage()` opens the fixture workspace; `startPage({ mem: true })` opens it from an in-memory folder, to save and to cancel.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle, openFixture } = require('./harness');
const { memFolder, fixtureFiles } = require('./mem-folder');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const NONE = { kind: 'none', key: null, mode: 'view' };

function fakeLayout(graph) {
  const place = (node, x) =>
    Object.assign({}, node, {
      x,
      y: 0,
      width: node.width || 400,
      height: node.height || 200,
      children: (node.children || []).map((child, i) => place(child, 10 + i * 20))
    });
  return Object.assign(place(graph, 0), {
    width: 900,
    height: 600,
    edges: graph.edges.map((edge) =>
      Object.assign({}, edge, {
        sections: [{ startPoint: { x: 1, y: 1 }, bendPoints: [{ x: 5, y: 1 }], endPoint: { x: 9, y: 9 } }],
        labels: (edge.labels || []).map((label) => Object.assign({ x: 3, y: 3 }, label))
      })
    )
  });
}

/** A DOM element just big enough for the marks the page puts on the drawing (classes and attributes). */
function fakeMark(attributes, classes) {
  const classSet = new Set(classes);
  const attrs = Object.assign({}, attributes);
  return {
    attrs,
    classes: classSet,
    classList: {
      add: (c) => classSet.add(c),
      remove: (c) => classSet.delete(c),
      toggle: (c, on) => (on ? classSet.add(c) : classSet.delete(c)),
      contains: (c) => classSet.has(c)
    },
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: (name, value) => {
      attrs[name] = String(value);
    }
  };
}

async function startPage(options) {
  let opened;
  let mem = null;
  if (options && (options.mem || options.only)) {
    // a workspace in an in-memory folder, to save and to cancel; `only`: exactly these files (path -> text), not the fixture's
    mem = memFolder(options.only || Object.assign(fixtureFiles(), options.files || {}));
    const app = createApp();
    await app.loadWorkspace(mem.handle);
    const appState = app.__state();
    appState.folder = { handle: mem.handle, name: 'ws' };
    appState.permissionState = 'granted';
    opened = { sandbox: app, state: appState, kernel: await app.loadViewpointKernel() };
  } else if (options && options.dir) {
    // a folder of the repository, read in place (the layered Brightcart), on the plateau asked for
    const app = createApp();
    const handle = makeDirHandle(options.dir);
    const appState = app.__state();
    appState.folder = { handle, name: path.basename(options.dir) };
    appState.permissionState = 'granted';
    await app.loadWorkspace(handle);
    if (options.plateau) app.drawPlateau(options.plateau); // a click on a node of the band
    opened = { sandbox: app, state: appState, kernel: await app.loadViewpointKernel() };
  } else {
    opened = await openFixture();
  }
  const { sandbox, state, kernel } = opened;
  sandbox.window.showDirectoryPicker = function showDirectoryPicker() {};
  sandbox.__elk = { layout: async (graph) => fakeLayout(graph) };
  run(sandbox, 'loadElk = async () => __elk;');
  const app = sandbox.document.getElementById('app');
  if (!app.querySelector) app.querySelector = () => null; // no focus to give back in Node (a control asked for it)
  const originalGet = sandbox.document.getElementById;
  const originalQuery = sandbox.document.querySelector;
  let html = '';
  let canvas = null;
  let marks = null;
  Object.defineProperty(app, 'innerHTML', {
    get: () => html,
    set: (value) => {
      html = value;
      canvas = null;
      marks = null;
    },
    configurable: true
  });
  /** The nodes, links and captions of the scene on the canvas, as the elements `showDiagramScene` marks. */
  const marksOf = () => {
    if (marks) return marks;
    const scene = run(sandbox, 'diagramScene');
    marks = { nodes: [], links: [], labels: [] };
    if (!scene || !scene.html) return marks;
    for (const m of scene.html.matchAll(/<g class="(dg-node[^"]*)"([^>]*)>/g))
      marks.nodes.push(
        fakeMark(
          Object.fromEntries(Array.from(m[2].matchAll(/([\w-]+)="([^"]*)"/g), (a) => [a[1], a[2]])),
          m[1].split(' ')
        )
      );
    for (const m of scene.html.matchAll(/<g class="(dg-link)"([^>]*)>/g))
      marks.links.push(
        fakeMark(
          Object.fromEntries(Array.from(m[2].matchAll(/([\w-]+)="([^"]*)"/g), (a) => [a[1], a[2]])),
          m[1].split(' ')
        )
      );
    for (const m of scene.html.matchAll(/<text class="(dg-label)"([^>]*)>/g))
      marks.labels.push(
        fakeMark(
          Object.fromEntries(Array.from(m[2].matchAll(/([\w-]+)="([^"]*)"/g), (a) => [a[1], a[2]])),
          m[1].split(' ')
        )
      );
    return marks;
  };
  const canvasOf = () => {
    if (canvas) return canvas;
    const tag = /<div class="diagram-canvas" id="diagram-canvas"([^>]*)>/.exec(html);
    if (!tag) return null;
    const attributes = {};
    for (const m of tag[1].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attributes[m[1]] = m[2] === undefined ? '' : m[2];
    canvas = {
      attributes,
      innerHTML: '',
      clientWidth: 800,
      clientHeight: 600,
      parentElement: null,
      classList: { add() {}, remove() {}, contains: () => false },
      getAttribute: (name) => (name in attributes ? attributes[name] : null),
      hasAttribute: (name) => name in attributes,
      querySelector: () => null,
      querySelectorAll: (selector) => {
        const found = marksOf();
        if (selector === '.dg-selected') return found.nodes.filter((el) => el.classes.has('dg-selected'));
        if (selector === '.dg-node') return found.nodes;
        if (selector === '.dg-link, .dg-label') return found.links.concat(found.labels);
        if (selector === '.dg-link') return found.links;
        return [];
      },
      contains: () => false,
      focus() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
    };
    return canvas;
  };
  // the panel of the page, as `refreshInspection` and the scroll after a selection find it; `sectionTop` is where the top of the selection
  // sits in the window of the panel (800 px high): below it by default, so that the selection has to be brought into sight
  const panel = { removed: false, scrolled: 0, sectionTop: 1500, right: null };
  const rightPanel = {
    scrollTop: 0,
    getBoundingClientRect: () => ({ top: 0, bottom: 800, left: 0, right: 288, width: 288, height: 800 })
  };
  panel.right = rightPanel;
  sandbox.document.getElementById = (id) =>
    id === 'diagram-canvas' ? canvasOf() : id === 'panel-right' ? rightPanel : originalGet(id);
  sandbox.document.querySelector = (selector) => {
    if (selector === '.library-selection')
      return html.includes('class="library-selection"')
        ? {
            remove() {
              panel.removed = true;
            },
            scrollIntoView() {
              panel.scrolled++;
            },
            getBoundingClientRect: () => ({
              top: panel.sectionTop,
              bottom: panel.sectionTop + 400,
              left: 0,
              right: 288
            })
          }
        : null;
    if (selector === '.inspection')
      return html.includes('class="inspection')
        ? {
            set outerHTML(value) {
              panel.refreshed = value;
            }
          }
        : null;
    return originalQuery ? originalQuery.call(sandbox.document, selector) : null;
  };
  const page = {
    sandbox,
    state,
    kernel,
    panel,
    mem,
    html: () => html,
    canvas: canvasOf,
    marks: marksOf,
    resetMarks() {
      marks = null;
    },
    async drawn() {
      for (let i = 0; i < 400; i++) {
        const c = canvasOf();
        if (c && c.innerHTML !== '') return c;
        await new Promise((resolve) => setImmediate(resolve));
      }
      throw new Error('the diagram was never put on the canvas');
    },
    async show() {
      sandbox.render();
      return canvasOf() ? page.drawn() : null;
    },
    scene: () => run(sandbox, 'diagramScene'),
    async go(perspective) {
      sandbox.setPerspective(perspective);
      return page.drawn().catch(() => null);
    },
    /** The panel on the right, as the page returns it. */
    right: () => sandbox.renderLibraryPerspectiveHtml().right,
    center: () => sandbox.renderLibraryPerspectiveHtml().center
  };
  return page;
}

function addView(page, content) {
  return page.sandbox.createManifestEntry('view', Object.assign({ layer: 'application' }, content));
}

async function openView(page, view) {
  run(page.sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(view.id) + ';');
  page.sandbox.setPerspective('library');
  return page.drawn().catch(() => null);
}

/** A click on an element carrying these attributes (what a browser gives the delegated handler). */
function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({
    target: { closest: (selector) => (selector === '[data-action]' ? target : null) },
    preventDefault() {},
    stopPropagation() {},
    detail: 1
  });
}

/** The attributes of every box of the drawing that selects (the ones with an action), as written in the markup. */
function boxesOf(page) {
  return Array.from(
    page
      .scene()
      .html.matchAll(
        /<g class="dg-node[^>]*? data-id="([^"]*)" data-action="goto-element" data-ref="([^"]*)" data-layer="([^"]*)"/g
      ),
    (m) => ({ 'data-action': 'goto-element', 'data-id': m[1], 'data-ref': m[2], 'data-layer': m[3] })
  );
}

/** The attributes of every link of the drawing, as written in the markup. */
function linksOf(page) {
  return Array.from(
    page
      .scene()
      .html.matchAll(
        /<g class="dg-link" data-from="([^"]*)" data-to="([^"]*)"( data-nth="[^"]*")? data-layer="([^"]*)" data-action="select-link"/g
      ),
    (m) => {
      const attributes = { 'data-action': 'select-link', 'data-from': m[1], 'data-to': m[2], 'data-layer': m[4] };
      if (m[3]) attributes['data-nth'] = /"([^"]*)"/.exec(m[3])[1];
      return attributes;
    }
  );
}

module.exports = { run, plain, NONE, fakeLayout, startPage, addView, openView, click, boxesOf, linksOf };
