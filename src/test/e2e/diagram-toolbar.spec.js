// The toolbar of a diagram (wave 030, run 0217, issue #194, TDD DEC-8, REQ-1, REQ-2 and REQ-6): docked above the canvas, five named groups in the
// order Draw, Texts, Layout, Compare and Frame, a pressed state that is `aria-pressed` on a button whose name does not change, and the keys of the
// Frame that act with the focus on a button of the toolbar. The node test (toolbar.test.js) proves the markup of the six surfaces in a fake DOM; here
// a real browser, on the layered Brightcart, proves what only a browser knows: the toolbar's box against the canvas's, the Tab order, the key, the
// width of a phone. One test per surface: an element, the Map of each layer, a saved view and a story step. The controls of a surface are the
// table `toolbar-controls.json` that toolbar.test.js reads (the control of a page is a subsequence of the table's, in its order).
//
// It asserts structure and attributes, never the position of a box of the drawing (RISK-5: ELK's rows are a tendency in a browser).

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('./fixtures');
const { ROOT } = require('./harness');

const BRIGHTCART = path.join(ROOT, 'src', 'test', 'resources', 'brightcart', 'layered');
const TABLE = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'test', 'javascript', 'viewpoint-kernel', 'toolbar-controls.json'), 'utf8')
);
const GROUPS = TABLE.groupOrder;
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

// The layered Brightcart and a saved Map of the application layer (the page of a saved view).
function brightcart() {
  const files = readTree(BRIGHTCART);
  files[WIDE_VIEW_FILE] = `header:
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
`;
  return files;
}

async function settled(page) {
  await expect(page.locator('g.dg-node').first()).toBeVisible();
  let last = '';
  await expect
    .poll(
      async () => {
        const now = await page.evaluate(() =>
          [...document.querySelectorAll('g.dg-node')]
            .map((g) => g.getAttribute('data-ref'))
            .sort()
            .join('|')
        );
        const same = now === last && now !== '';
        last = now;
        return same;
      },
      { intervals: [300], timeout: 20000 }
    )
    .toBe(true);
}

async function goTo(page, server, address) {
  await page.goto('about:blank');
  await page.goto(server.url + address);
}

// What the surfaces open on. `table` is the surface of toolbar-controls.json the page is checked against.
const SURFACES = {
  element: {
    table: 'element',
    async open(page, server) {
      await goTo(page, server, '#/timeline/elements?plateau=marketplace');
      await page.locator('[data-action="select-element"]', { hasText: 'Commerce services' }).first().click();
      await page.locator('[data-action="set-element-tab"]', { hasText: 'Detailed' }).click();
    }
  },
  'application Map': {
    table: 'map-application',
    async open(page, server) {
      await goTo(page, server, '#/timeline/applications?plateau=marketplace');
    }
  },
  'technology Map': {
    table: 'map-technology',
    async open(page, server) {
      await goTo(page, server, '#/timeline/environments?plateau=marketplace');
    }
  },
  'saved view': {
    table: 'view-map-application',
    async open(page, server) {
      // the page of the views has no band: the comparison is the address's
      await goTo(page, server, '#/stories/views?plateau=marketplace&compare=past');
      await page.locator('#app', { hasText: WIDE_VIEW }).first().waitFor();
      await page.getByText(WIDE_VIEW, { exact: true }).first().click();
    }
  },
  'story step': {
    // the second step of fork_tour: the overview of an element, drawn at saas against baseline, so a comparison is on
    table: 'element',
    async open(page, server) {
      await goTo(page, server, '#/stories?story=fork_tour&plateau=marketplace');
      await page.locator('[data-action="story-play"][data-story="fork_tour"][data-step="1"]').first().click();
    }
  }
};

// The comparison of the page, for the surfaces that do not bring one (a story step does).
async function withComparison(page, name) {
  if (name !== 'story step' && name !== 'saved view') {
    await page.locator('#band-compare').selectOption('past');
  }
  await expect(page.locator('[data-action="set-changes-only"]').first()).toBeVisible();
}

const toolbarOf = (page) => page.locator('.diagram-toolbar').first();

// The groups of the toolbar in markup order, each with the key of its controls (the action, and what tells apart the controls that share one).
async function groupsOf(page) {
  return toolbarOf(page).evaluate((toolbar) =>
    [...toolbar.querySelectorAll('.tool-group')].map((group) => ({
      name: group.getAttribute('aria-label'),
      role: group.getAttribute('role'),
      controls: [...group.querySelectorAll('button, select')].map((control) => {
        const suffix =
          control.getAttribute('data-show') || control.getAttribute('data-part') || control.getAttribute('data-dir');
        return control.tagName === 'SELECT'
          ? control.id
          : (control.getAttribute('data-action') || control.id) + (suffix ? ':' + suffix : '');
      })
    }))
  );
}

for (const [name, surface] of Object.entries(SURFACES)) {
  test(`the toolbar of the ${name} is docked above the canvas, in five groups, and its keys and toggles act`, async ({
    page,
    serve
  }) => {
    const server = await serve(null, brightcart());
    await surface.open(page, server);
    await settled(page);
    await withComparison(page, name);
    await settled(page);

    if (name === 'story step') {
      // the story bar is over the header, and the toolbar is the page's own, not a second one of the story
      const bar = await page.locator('.story-bar').boundingBox();
      const header = await page.locator('.element-header').boundingBox();
      expect(bar.y, 'the story bar is over the header').toBeLessThan(header.y);
    }
    const toolbar = page.getByRole('toolbar', { name: 'Diagram tools' });
    await expect(toolbar).toHaveCount(1);

    // five groups, named, found by role, in the order of the table, each control in exactly one of them and in the table's order
    const groups = await groupsOf(page);
    expect(
      groups.map((g) => g.name),
      'the groups, in order'
    ).toEqual(GROUPS);
    for (const group of groups) {
      expect(group.role, `${group.name} is a group`).toBe('group');
      await expect(toolbar.getByRole('group', { name: group.name, exact: true })).toHaveCount(1);
    }
    const seen = groups.flatMap((g) => g.controls);
    expect(new Set(seen).size, `a control is in two groups: ${seen.join(', ')}`).toBe(seen.length);
    for (const group of TABLE.surfaces[surface.table].groups) {
      const present = groups.find((g) => g.name === group.name).controls;
      expect(present, `${group.name}: the controls of the page are those of the table, in its order`).toEqual(
        group.controls.filter((control) => present.includes(control))
      );
      expect(present.length, `${group.name} has a control`).toBeGreaterThan(0);
    }

    // the toolbar is above the canvas, not over it, and the status line is under it
    const toolbarBox = await toolbar.boundingBox();
    const canvasBox = await page.locator('#diagram-canvas').boundingBox();
    expect(toolbarBox.y + toolbarBox.height, 'the toolbar ends where the canvas starts, or before').toBeLessThanOrEqual(
      canvasBox.y + 1
    );

    // from the header, the first Tab reaches the first control of the toolbar, before the chips and the canvas
    const lastOfHeader = await page.evaluate(() => {
      const header = document.querySelector('.element-header');
      const focusable = [...header.querySelectorAll('button, select, a[href], input, [tabindex="0"]')].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
      const last = focusable[focusable.length - 1];
      last.focus();
      return document.activeElement === last;
    });
    expect(lastOfHeader, 'the last control of the header takes the focus').toBe(true);
    await page.keyboard.press('Tab');
    const reached = await page.evaluate(() => {
      const active = document.activeElement;
      const first = document.querySelector('.diagram-toolbar button, .diagram-toolbar select');
      return { inToolbar: !!active.closest('.diagram-toolbar'), first: active === first };
    });
    expect(reached, 'Tab from the header lands on the first control of the toolbar').toEqual({
      inToolbar: true,
      first: true
    });

    // toggles: the name does not change, the state is aria-pressed
    const fit = toolbar.getByRole('button', { name: 'Fit', pressed: false });
    const center = toolbar.getByRole('button', { name: 'Center', pressed: true });
    await expect(fit).toHaveCount(1);
    await expect(center).toHaveCount(1);
    await fit.click();
    await expect(toolbar.getByRole('button', { name: 'Fit', pressed: true })).toHaveCount(1);
    await expect(toolbar.getByRole('button', { name: 'Center', pressed: false })).toHaveCount(1);
    await toolbar.getByRole('button', { name: 'Center' }).click();
    await expect(toolbar.getByRole('button', { name: 'Center', pressed: true })).toHaveCount(1);
    await expect(toolbar.getByRole('button', { name: 'Fit', pressed: false })).toHaveCount(1);

    // a key, with the focus on a button of the toolbar, acts as it does on the canvas
    await toolbar.getByRole('button', { name: 'Center' }).focus();
    await page.keyboard.press('f');
    await expect(toolbar.getByRole('button', { name: 'Fit', pressed: true })).toHaveCount(1);
    await page.keyboard.press('c');
    await expect(toolbar.getByRole('button', { name: 'Center', pressed: true })).toHaveCount(1);

    // Changes only: one button, one name, pressed on and off, and the address says it
    const changes = toolbar.getByRole('button', { name: 'Changes only' });
    await expect(changes).toHaveCount(1);
    await expect(changes).toHaveAttribute('aria-pressed', 'false');
    await changes.click();
    await expect(toolbar.getByRole('button', { name: 'Changes only', pressed: true })).toHaveCount(1);
    if (name !== 'story step') {
      await expect(page).toHaveURL(/changes-only=1/);
    }
    await settled(page);
    await toolbar.getByRole('button', { name: 'Changes only', pressed: true }).click();
    await expect(toolbar.getByRole('button', { name: 'Changes only', pressed: false })).toHaveCount(1);
    if (name !== 'story step') {
      await expect(page).not.toHaveURL(/changes-only=/);
    }
    await expect(page.locator('[data-action="set-changes-only"]')).toHaveCount(1);

    // a phone: the page is not wider than the window and every control is inside it
    await page.setViewportSize({ width: 360, height: 740 });
    await settled(page);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, 'the document is not wider than the window').toBeLessThanOrEqual(360);
    const outside = await toolbarOf(page).evaluate((bar) =>
      [...bar.querySelectorAll('button, select')]
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.left < -0.5 || box.right > 360.5)
        .map(({ el }) => el.getAttribute('data-action') || el.id)
    );
    expect(outside, 'the controls outside the window').toEqual([]);
  });
}
