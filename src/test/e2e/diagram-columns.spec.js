// `layout.columns` on a real diagram (wave 027, run 0202, issue #178, TDD VER-6 and VER-7, REQ-9 and REQ-10): the number of
// boxes per row that a diagram aims at, set in `settings.views.properties.<viewpoint>.layout` of the workspace, in the
// `properties.layout` of a saved view and in the Columns list of the toolbar, in this order of strength. The resolver and the
// ELK graph are proved in Node; here the layout engine runs in a real browser, on the layered Brightcart, so the rows are
// the rows of the drawing: ELK's layer bound is a tendency (RISK-1), and what it does with links between containers is
// measured, not assumed.
//
// A row is the boxes of one container whose top is at the same height: the SVG has no nesting, so a box belongs to the
// smallest group box that encloses it. `rowsOf` is the helper, and `ROWS` lines are printed for the table of the run record.

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('./fixtures');
const { ROOT } = require('./harness');

const BRIGHTCART = path.join(ROOT, 'src', 'test', 'resources', 'brightcart', 'layered');
const MAP_ADDRESS = '#/timeline/applications?plateau=marketplace';
const VIEWS_ADDRESS = '#/stories/views?plateau=marketplace';
const WIDE_VIEW = 'The whole map, opened';
const WIDE_VIEW_FILE = 'shared/view.wide_map.yaml';

function readTree(dir, base = dir, out = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      readTree(file, base, out);
    } else {
      out[path.relative(base, file)] = fs.readFileSync(file, 'utf8');
    }
  }
  return out;
}

// The layered Brightcart, with a layout under `settings.views.properties` for the given viewpoints (none: as shipped) and a
// saved Map of the application layer, opened on `platform` and `shop`, that the page of a saved view can edit.
function brightcart({ workspace = null, view = null } = {}) {
  const files = readTree(BRIGHTCART);
  if (workspace !== null) {
    const properties = Object.keys(workspace)
      .map((viewpoint) => `      ${viewpoint}:\n        layout:\n          columns: ${workspace[viewpoint]}\n`)
      .join('');
    files['.archicode.yaml'] = files['.archicode.yaml'].replace(
      '  views:\n    path: "views"\n',
      `  views:\n    path: "views"\n    properties:\n${properties}`
    );
    expect(files['.archicode.yaml']).toContain('layout:');
  }
  files[WIDE_VIEW_FILE] = wideView(view);
  return files;
}

function wideView(columns) {
  const layout = columns === null ? '' : `    layout:\n      columns: ${columns}\n`;
  return `header:
  kind: "archicode.morin.io/view"
  version: "1"
content:
  id: "wide_map"
  name: "${WIDE_VIEW}"
  description: "Every system of the layer, the shop and the platform opened."
  viewpoint: "map"
  layer: "application"
  properties:
    opened: ["shop", "platform"]
${layout}`;
}

// For every container of the drawing (and the top level, `''`): its boxes, the number of distinct tops (rows) among them and
// the largest number of boxes that share a top. The tops are read from the rectangles of the SVG, with a tolerance of 6 px.
async function rowsOf(page) {
  return page.evaluate(() => {
    const TOLERANCE = 6;
    const rect = (g, selector) => {
      const r = g.querySelector(selector);
      return r
        ? {
            x: +r.getAttribute('x'),
            y: +r.getAttribute('y'),
            w: +r.getAttribute('width'),
            h: +r.getAttribute('height')
          }
        : null;
    };
    const boxes = [...document.querySelectorAll('g.dg-node')]
      .map((g) => ({
        ref: g.getAttribute('data-ref'),
        compound: g.classList.contains('dg-compound'),
        box: rect(g, g.classList.contains('dg-compound') ? 'rect.dg-group' : 'rect.dg-box')
      }))
      .filter((b) => b.box);
    const inside = (a, b) =>
      a !== b && a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
    const groups = new Map();
    for (const b of boxes) {
      const parents = boxes.filter((p) => p.compound && p !== b && inside(b.box, p.box));
      parents.sort((p, q) => p.box.w * p.box.h - q.box.w * q.box.h);
      const owner = parents.length ? parents[0].ref : '';
      if (!groups.has(owner)) groups.set(owner, []);
      groups.get(owner).push(b);
    }
    return [...groups.entries()].map(([container, members]) => {
      const tops = [];
      const perTop = [];
      for (const m of members.slice().sort((a, b) => a.box.y - b.box.y)) {
        const at = tops.findIndex((t) => Math.abs(t - m.box.y) <= TOLERANCE);
        if (at < 0) {
          tops.push(m.box.y);
          perTop.push(1);
        } else {
          perTop[at] += 1;
        }
      }
      return { container, boxes: members.length, rows: tops.length, widest: Math.max(...perTop) };
    });
  });
}

// The drawing as its box positions, to tell "the same" from "moved": one line per box, in the order of the references.
async function positionsOf(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('g.dg-node')]
      .map((g) => {
        const r = g.querySelector('rect.dg-group, rect.dg-box');
        return `${g.getAttribute('data-ref')} ${r.getAttribute('x')},${r.getAttribute('y')}`;
      })
      .sort()
  );
}

async function settled(page) {
  await expect(page.locator('g.dg-node').first()).toBeVisible();
  let last = '';
  await expect
    .poll(
      async () => {
        const now = (await positionsOf(page)).join('|');
        const same = now === last && now !== '';
        last = now;
        return same;
      },
      { intervals: [250], timeout: 20000 }
    )
    .toBe(true);
}

async function goTo(page, server, address, { draws = true } = {}) {
  // a fresh page each time: from a blank one, so that no request of the page before is cut short by this one
  await page.goto('about:blank');
  await page.goto(server.url + address);
  if (draws) {
    await settled(page);
  }
}

function widest(rows) {
  return Math.max(...rows.map((r) => r.widest));
}

function report(label, rows) {
  const line = rows.map((r) => `${r.container || '(top)'}:${r.boxes}b/${r.rows}r/${r.widest}w`).join(' ');
  console.log(`ROWS ${label} | ${line}`);
}

async function openElementPage(page, server, tab) {
  await goTo(page, server, '#/timeline/elements?plateau=marketplace', { draws: false });
  await page.locator('[data-action="select-element"]', { hasText: 'Commerce services' }).first().click();
  await page.locator('[data-action="set-element-tab"]', { hasText: tab }).click();
  await settled(page);
}

async function openWideView(page, server) {
  await goTo(page, server, VIEWS_ADDRESS);
  await page.locator('#app', { hasText: WIDE_VIEW }).first().waitFor();
  await page.getByText(WIDE_VIEW, { exact: true }).first().click();
  await settled(page);
}

const columnsList = (page) => page.locator('#diagram-columns').first();

test('the Map with columns 4 in the workspace has at most 5 boxes in a row in each container, and the file without it draws the run before', async ({
  page,
  serve
}) => {
  const before = await serve(null, brightcart());
  await goTo(page, before, MAP_ADDRESS);
  const baseline = await positionsOf(page);
  const baselineRows = await rowsOf(page);
  report('map before', baselineRows);
  // the whole layer folded is a wide top level: twenty boxes; the links already stack them (RISK-1 evidence: the row of the base is recorded)
  expect(baselineRows.find((r) => r.container === '').boxes).toBe(20);

  const after = await serve(null, brightcart({ workspace: { map: 4 } }));
  await goTo(page, after, MAP_ADDRESS);
  const rows = await rowsOf(page);
  report('map columns 4', rows);
  for (const row of rows) {
    expect(row.widest, `container ${row.container || '(top)'}`).toBeLessThanOrEqual(5);
  }
  await expect(columnsList(page)).toHaveValue('');
  await expect(columnsList(page).locator('option').first()).toHaveText('Default (4)');

  // removing the value from the file and reloading: the positions of the run before
  after.write('.archicode.yaml', brightcart()['.archicode.yaml']);
  await goTo(page, after, MAP_ADDRESS);
  expect(await positionsOf(page)).toEqual(baseline);
});

test('the page of an element and the page of a saved view keep at most 5 boxes in a row at columns 4', async ({
  page,
  serve
}) => {
  const before = await serve(null, brightcart());
  await openElementPage(page, before, 'Detailed');
  report('element detailed before', await rowsOf(page));
  await openElementPage(page, before, 'Deep');
  report('element deep before', await rowsOf(page));
  await openWideView(page, before);
  report('saved view before', await rowsOf(page));

  const after = await serve(null, brightcart({ workspace: { detailed: 4, deep: 4, map: 4 } }));
  await openElementPage(page, after, 'Detailed');
  const detailed = await rowsOf(page);
  report('element detailed columns 4', detailed);
  await openElementPage(page, after, 'Deep');
  const deep = await rowsOf(page);
  report('element deep columns 4', deep);
  await openWideView(page, after);
  const saved = await rowsOf(page);
  report('saved view columns 4 (workspace)', saved);
  for (const rows of [detailed, deep, saved]) {
    expect(widest(rows)).toBeLessThanOrEqual(5);
  }
});

test('a saved view with columns 2 overrides the workspace, the list of its page edits it, and Default takes its value out', async ({
  page,
  serve
}) => {
  const server = await serve(null, brightcart({ workspace: { map: 4 }, view: 2 }));
  await openWideView(page, server);
  const own = await rowsOf(page);
  report('saved view columns 2 (view)', own);
  expect(widest(own)).toBeLessThanOrEqual(3);
  const viewPositions = await positionsOf(page);
  // the list says the choice of the view (its own entry), the Default is the workspace's 4
  const list = page.locator('#diagram-columns').first();
  await expect(list.locator('option').first()).toHaveText('Default (4)');

  // the toolbar list: 6 overrides the view, the drawing moves
  await list.selectOption('6');
  await expect.poll(async () => (await positionsOf(page)).join('|')).not.toBe(viewPositions.join('|'));
  await settled(page);
  report('saved view columns 6 (toolbar)', await rowsOf(page));
  const toolbarPositions = await positionsOf(page);
  expect(toolbarPositions).not.toEqual(viewPositions);

  // on the page of a saved view the list edits the view (as the Columns field of its form does): Default takes the view's own
  // value out, and the workspace's 4 draws again
  await list.selectOption('');
  await expect(list).toHaveValue('');
  await settled(page);
  const back = await rowsOf(page);
  report('saved view default (workspace 4)', back);
  expect(widest(back)).toBeLessThanOrEqual(5);
  expect(await positionsOf(page)).not.toEqual(viewPositions);
});

test('on the page of a Map the toolbar value beats the workspace value and Default returns to it', async ({
  page,
  serve
}) => {
  const server = await serve(null, brightcart({ workspace: { map: 4 } }));
  await goTo(page, server, MAP_ADDRESS);
  const workspaceValue = await positionsOf(page);

  await columnsList(page).selectOption('2');
  await expect.poll(async () => (await positionsOf(page)).join('|')).not.toBe(workspaceValue.join('|'));
  await settled(page);
  const two = await rowsOf(page);
  report('map columns 2 (toolbar)', two);
  expect(widest(two)).toBeLessThanOrEqual(3);

  await columnsList(page).selectOption('');
  await expect.poll(async () => (await positionsOf(page)).join('|')).toBe(workspaceValue.join('|'));
});

test('at 360 px the Columns list is inside the box of the toolbar', async ({ page, serve }) => {
  const server = await serve(null, brightcart());
  await page.setViewportSize({ width: 360, height: 740 });
  await goTo(page, server, MAP_ADDRESS);
  const list = columnsList(page);
  await expect(list).toBeVisible();
  const box = await list.boundingBox();
  const bar = await page
    .locator('.diagram-columns')
    .first()
    .locator('xpath=ancestor::*[contains(@class, "diagram-tools") or contains(@class, "diagram-toolbar")][1]')
    .boundingBox();
  expect(bar, 'the toolbar of the diagram').not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(bar.x - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(bar.x + bar.width + 1);
  expect(box.y).toBeGreaterThanOrEqual(bar.y - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(bar.y + bar.height + 1);
});

// RISK-2: the time of the layout with and without the value, from the page being asked for to the drawing standing still.
// The report is a finding when the value costs more than twice the base; it is not an assertion, a busy machine is no failure.
test('the layout time with and without the value is recorded', async ({ page, serve }) => {
  const without = await serve(null, brightcart());
  const withValue = await serve(null, brightcart({ workspace: { map: 4 } }));
  const time = async (server) => {
    const runs = [];
    for (let i = 0; i < 3; i += 1) {
      const start = Date.now();
      await goTo(page, server, MAP_ADDRESS);
      runs.push(Date.now() - start);
    }
    return Math.min(...runs);
  };
  const base = await time(without);
  const bounded = await time(withValue);
  console.log(`TIME map without ${base} ms, with columns 4 ${bounded} ms, ratio ${(bounded / base).toFixed(2)}`);
  expect(bounded).toBeGreaterThan(0);
});
