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
  description: "Every system of the layer, the storefront and the platform opened."
  viewpoint: "map"
  layer: "application"
  properties:
    opened: ["storefront", "platform"]
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
      controls: [...group.querySelectorAll('.tool-group-controls button, .tool-group-controls select')].map(
        (control) => {
          const suffix =
            control.getAttribute('data-show') || control.getAttribute('data-part') || control.getAttribute('data-dir');
          return control.tagName === 'SELECT'
            ? control.id
            : (control.getAttribute('data-action') || control.id) + (suffix ? ':' + suffix : '');
        }
      )
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
        group.controls.map((control) => control.id || control).filter((control) => present.includes(control))
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
      // the first control that is shown: under 40 rem the group buttons are, over it they are not
      const first = [...document.querySelectorAll('.diagram-toolbar button, .diagram-toolbar select')].find(
        (el) => el.offsetParent !== null
      );
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

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// The state the toolbar shows (wave 030, run 0218, TDD REQ-1, REQ-3, REQ-4, REQ-5, REQ-6): the dot on what a view keeps, Reset, what a named view
// writes, Unfold all on the page of a Map view, and the toolbar at 360 by 740 as four buttons with their counts. The node test proves the markup; here
// the browser proves what it does with it (aria-disabled read as disabled, the focus after Escape, the heights, the width of the document).

const SAVED = ['Draw', 'Texts', 'Layout'];
const DOT = 'Saved with the view';
const resetOf = (page) => page.locator('#diagram-reset-button');

// The files of the workspace that hold a text (the view a test names is written under a file name the editor chooses).
function filesWith(dir, text, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      filesWith(file, text, found);
    } else if (fs.readFileSync(file, 'utf8').includes(text)) {
      found.push(file);
    }
  }
  return found;
}

// An action of the diagram's header: in the "More actions" menu when the row is narrow.
async function headerAction(page, selector) {
  const button = page.locator(selector).first();
  if (!(await button.isVisible())) await page.getByRole('button', { name: 'More actions' }).click();
  await button.click();
}

// A page that is ready to be read: the drawing is settled and, where the surface needs one, a comparison is on.
async function opened(page, server, name) {
  await SURFACES[name].open(page, server);
  await settled(page);
  await withComparison(page, name);
  await settled(page);
}

for (const name of Object.keys(SURFACES)) {
  test(`the ${name} marks the three groups a view keeps with a dot, and Reset (where there is one) is disabled, then restores`, async ({
    page,
    serve
  }) => {
    const server = await serve(null, brightcart());
    await opened(page, server, name);
    const toolbar = page.getByRole('toolbar', { name: 'Diagram tools' });

    // the dot is an image with a name, on exactly Draw, Texts and Layout, and on no other group
    await expect(toolbar.getByRole('img', { name: DOT })).toHaveCount(3);
    for (const group of GROUPS) {
      await expect(
        toolbar.getByRole('group', { name: group, exact: true }).getByRole('img', { name: DOT }),
        `${group} and the dot`
      ).toHaveCount(SAVED.includes(group) ? 1 : 0);
    }

    if (name === 'saved view') {
      // the page of a view edits the view: nothing to put back, so no Reset
      await expect(resetOf(page)).toHaveCount(0);
      return;
    }

    // Reset reads aria-disabled as disabled, and names its target
    const reset = resetOf(page);
    await expect(reset).toBeVisible();
    await expect(reset).toBeDisabled();
    const before = page.url();

    // a change to Draw enables it ...
    const hide = toolbar.getByRole('button', { name: 'Hide unlinked' });
    await expect(hide).toHaveAttribute('aria-pressed', 'false');
    await hide.click();
    await expect(toolbar.getByRole('button', { name: 'Hide unlinked', pressed: true })).toHaveCount(1);
    await expect(reset).toBeEnabled();
    // ... and a press puts it back, with the address it had
    await reset.click();
    await expect(toolbar.getByRole('button', { name: 'Hide unlinked', pressed: false })).toHaveCount(1);
    await expect(reset).toBeDisabled();
    await settled(page);
    expect(page.url(), 'the address after Reset is the one before the change').toBe(before);

    // a press on the disabled Reset changes nothing and keeps the focus on it
    await reset.focus();
    await reset.click({ force: true });
    await expect(reset).toBeFocused();
    await expect(reset).toBeDisabled();
  });
}

test('Reset to a view puts Draw, Texts and Layout back to that view, and leaves Changes only and the zoom', async ({
  page,
  serve
}) => {
  const server = await serve(null, brightcart());
  await opened(page, server, 'saved view');
  await headerAction(page, '[data-action="saved-view-open"]');
  await settled(page);
  const toolbar = page.getByRole('toolbar', { name: 'Diagram tools' });
  const reset = resetOf(page);
  await expect(reset).toContainText(`Reset to "${WIDE_VIEW}"`);
  await expect(reset).toBeDisabled();

  const labels = toolbar.getByRole('button', { name: 'Labels' });
  const wasLabels = await labels.getAttribute('aria-pressed');
  await labels.click();
  await expect(labels).not.toHaveAttribute('aria-pressed', wasLabels);
  await expect(reset).toBeEnabled();
  // Compare and Frame are the session's: Reset leaves them
  await page.locator('#band-compare').selectOption('past');
  await toolbar.getByRole('button', { name: 'Changes only' }).click();
  await settled(page);
  await toolbar.getByRole('button', { name: 'Fit' }).click();
  await reset.click();
  await expect(toolbar.getByRole('button', { name: 'Labels' })).toHaveAttribute('aria-pressed', wasLabels);
  await expect(reset).toBeDisabled();
  await expect(toolbar.getByRole('button', { name: 'Changes only', pressed: true })).toHaveCount(1);
  await expect(toolbar.getByRole('button', { name: 'Fit', pressed: true })).toHaveCount(1);
});

for (const name of ['element', 'application Map']) {
  test(`a view named from the ${name} writes the keys of Draw, Texts and Layout and none of Compare or Frame`, async ({
    page,
    serve
  }) => {
    const server = await serve(null, brightcart());
    await opened(page, server, name);
    const toolbar = page.getByRole('toolbar', { name: 'Diagram tools' });

    // one change in each group that a view keeps, and one in each group that it does not
    await toolbar.getByRole('button', { name: 'Hide unlinked' }).click();
    await toolbar.getByRole('button', { name: 'Wrap' }).click();
    await toolbar.getByRole('combobox', { name: 'Columns' }).selectOption({ index: 1 });
    await toolbar.getByRole('button', { name: 'Changes only' }).click();
    await settled(page);
    await toolbar.getByRole('button', { name: 'Zoom in' }).click();

    const view = `Toolbar state ${name}`;
    await headerAction(page, '[data-action="name-view"]');
    await page.getByRole('dialog').getByRole('textbox').fill(view);
    await page.getByRole('dialog').getByRole('button', { name: 'Save view' }).click();
    await page.locator('[data-action="save-all-changes"]').click();

    await expect.poll(() => filesWith(server.dir, view).length).toBe(1);
    const written = fs.readFileSync(filesWith(server.dir, view)[0], 'utf8');
    for (const key of ['hide-unlinked', 'wrap', 'layout']) {
      expect(written, `the written view has ${key}`).toMatch(new RegExp(`\\b${key}\\b`));
    }
    for (const key of ['changes-only', 'changes', 'zoom', 'scale', 'compare']) {
      expect(written, `the written view has no ${key}`).not.toMatch(new RegExp(`\\b${key}\\b`));
    }
  });
}

test('Unfold all on the page of a Map view edits the view: its opened list grows', async ({ page, serve }) => {
  const server = await serve(null, brightcart());
  await opened(page, server, 'saved view');
  page.on('dialog', (dialog) => dialog.accept()); // a big map asks first
  const toolbar = page.getByRole('toolbar', { name: 'Diagram tools' });
  await expect(toolbar.getByRole('button', { name: 'Fold all', exact: true })).toBeVisible();
  const unfold = toolbar.getByRole('button', { name: 'Unfold all' });
  await expect(unfold).toBeVisible();
  const opening = () => {
    const text = fs.readFileSync(path.join(server.dir, WIDE_VIEW_FILE), 'utf8');
    const match = text.match(/opened:\s*\[([^\]]*)\]/) || text.match(/opened:\n((?:\s+-.*\n?)*)/);
    return match ? (match[1].match(/[\w.]+/g) || []).length : 0;
  };
  const was = opening();
  await unfold.click();
  await settled(page);
  await page.locator('[data-action="save-all-changes"]').click();
  await expect.poll(opening).toBeGreaterThan(was);
});

for (const name of Object.keys(SURFACES)) {
  test(`at 360 by 740 the toolbar of the ${name} is four buttons with their counts, a panel that Escape closes, and the zoom in Frame`, async ({
    page,
    serve
  }) => {
    const server = await serve(null, brightcart());
    await page.setViewportSize({ width: 360, height: 740 });
    await opened(page, server, name);
    const toolbar = page.getByRole('toolbar', { name: 'Diagram tools' });

    // the document is the window's width and the bar is at most a fifth of it high
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      'the document is 360 px wide'
    ).toBeLessThanOrEqual(360);
    expect((await toolbar.boundingBox()).height, 'the toolbar is at most 148 px high').toBeLessThanOrEqual(148);

    // each group button's name includes its count, the number of the controls that are on in its own markup; Compare has no button, its toggle is inline
    for (const group of [...SAVED, 'Frame']) {
      const button = toolbar.locator(`.tool-group-button[data-group="${group.toLowerCase()}"]`);
      await expect(button, `${group} has one button`).toHaveCount(1);
      await expect(button).toBeVisible();
      if (group === 'Frame') {
        // the zoom the diagram opened at, as the zoom label of the Frame panel says it
        const zoom = (await page.locator('#diagram-zoom-label').textContent()).trim();
        await expect(button).toHaveAccessibleName(`Frame ${zoom}`);
      } else {
        const on = await toolbar
          .locator(`.tool-group[data-group="${group.toLowerCase()}"] .tool-group-controls`)
          .evaluate((panel) => panel.querySelectorAll('[aria-pressed="true"], [data-on="true"]').length);
        await expect(button, `${group} shows its count`).toHaveAccessibleName(`${group} ${on}`);
      }
    }
    await expect(toolbar.locator('[data-group="compare"] .tool-group-button')).toHaveCount(0);
    await expect(toolbar.getByRole('button', { name: 'Changes only' })).toBeVisible();

    // the panel: a press opens it (the controls show), Escape from inside closes it and puts the focus back on its button
    const draw = toolbar.locator('.tool-group-button[data-group="draw"]');
    await expect(draw).toHaveAttribute('aria-expanded', 'false');
    await expect(toolbar.locator('#tool-panel-draw')).toBeHidden();
    await draw.click();
    await expect(draw).toHaveAttribute('aria-expanded', 'true');
    const panel = toolbar.locator('#tool-panel-draw');
    await expect(panel).toBeVisible();
    await panel.locator('button, select').first().focus();
    await page.keyboard.press('Escape');
    await expect(draw).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();
    await expect(draw).toBeFocused();
    // another group's button replaces the open panel
    await draw.click();
    await toolbar.locator('.tool-group-button[data-group="texts"]').click();
    await expect(draw).toHaveAttribute('aria-expanded', 'false');
    await expect(toolbar.locator('#tool-panel-texts')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toolbar.locator('#tool-panel-texts')).toBeHidden();

    // Frame shows the zoom after a zoom key, with the focus on a button of the toolbar
    const frame = toolbar.locator('.tool-group-button[data-group="frame"]');
    const opening = (await frame.locator('.tool-group-zoom').innerText()).trim();
    await draw.focus();
    await page.keyboard.press('+');
    await expect(frame.locator('.tool-group-zoom')).not.toHaveText(opening);
    const zoom = await frame.locator('.tool-group-zoom').innerText();
    expect(zoom, 'Frame shows a percentage').toMatch(/^\d+%$/);
    await expect(frame).toHaveAccessibleName(`Frame ${zoom}`);
    expect((await page.locator('#diagram-zoom-label').textContent()).trim(), 'the zoom label says the same').toBe(zoom);
  });
}
