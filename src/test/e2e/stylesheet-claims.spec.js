// What the stylesheet of the editor does in a browser, which no test of its text can say: the key under a comparison, the header of
// an element page at three widths of the centre, the outline of a styled box and the story player on a phone. Each claim used to be
// a pattern on the text of the stylesheet in the node suite; here the computed style and the boxes of a real page are read, so
// the order of the rules, the specificity and the `!important` are judged by their effect.
//
// It asserts sizes, display values and colours that the rules decide, never the position of a box of the drawing.

const { test, expect, openPage, openPerspective } = require('./fixtures');
const { CORNER_SHOP } = require('./workspace');

const REM = 16;

// The layout width of the centre of the editor, set by the test: the header answers to the width of its container (`center`), not to
// the window's, so the window stays large and the container is given the width the claim is about.
async function centreWidth(page, rem) {
  await page.addStyleTag({ content: `.center-panel { flex: none !important; width: ${rem}rem !important; }` });
  await expect
    .poll(() => page.locator('.center-panel').evaluate((element) => element.getBoundingClientRect().width))
    .toBe(rem * REM);
}

test('the key of a comparison is folded to one row, is capped at 30 percent of the diagram area once open and scrolls inside', async ({
  page,
  serve
}) => {
  const server = await serve('domain_plateaus');
  await page.goto(server.url);
  await page.locator('#band-plateau').selectOption('to-be');
  await page.locator('#band-compare').selectOption({ label: 'As is · 2026-Q3' });

  const key = page.locator('#diagram-key');
  const toggle = key.locator('[data-action="toggle-diagram-key"]');
  await expect(key).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  // folded: the sentences and the note are hidden, only the states and the button are in the row
  for (const hidden of ['.dg-legend-how', '.dg-legend-note', '.dg-legend-title']) {
    const parts = key.locator(hidden);
    for (let i = 0; i < (await parts.count()); i++) {
      await expect(parts.nth(i), `${hidden} is hidden while the key is folded`).toBeHidden();
    }
  }

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(key.locator('.dg-legend-how').first()).toBeVisible();
  const open = await key.evaluate((element) => {
    const style = getComputedStyle(element);
    const area = element.closest('.diagram-status').parentElement;
    return {
      overflowY: style.overflowY,
      maxHeight: parseFloat(style.maxHeight),
      height: element.getBoundingClientRect().height,
      area: area.clientHeight
    };
  });
  expect(open.overflowY).toBe('auto');
  expect(open.maxHeight, 'the cap is 30 percent of the diagram area').toBeCloseTo(
    Math.max(48, Math.round(open.area * 0.3)),
    0
  );
  expect(open.height).toBeLessThanOrEqual(open.maxHeight + 1);

  // folded again, on a phone: the row stays one row and scrolls along
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 600, height: 800 });
  const row = await key.evaluate((element) => {
    const style = getComputedStyle(element);
    return { wrap: style.flexWrap, overflowX: style.overflowX };
  });
  expect(row).toEqual({ wrap: 'nowrap', overflowX: 'auto' });
});

test('the header of an element page keeps its actions at three widths of the centre: labels, the "..." button with its menu, two rows', async ({
  page,
  serve
}) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(server.url);
  await openPage(page, 'Elements');
  await page.locator('[data-action="select-element"]', { hasText: 'Shop' }).first().click();
  await page.locator('[data-action="set-element-tab"]', { hasText: 'Detailed' }).click();
  await expect(page.locator('g.dg-node[data-ref="shop"]')).toBeVisible();
  await page.setViewportSize({ width: 1800, height: 900 });

  const header = page.locator('.element-header');
  const more = page.locator('.header-more-button');
  const overflow = page.locator('.header-overflow');
  const labels = () =>
    header.locator('.with-icon .control-label').evaluateAll((all) => all.filter((l) => l.offsetParent !== null).length);
  const heightOf = () => header.evaluate((element) => element.getBoundingClientRect().height);

  // wide: the words are on the buttons and there is no "..." button
  await centreWidth(page, 90);
  await expect(more).toBeHidden();
  expect(await labels(), 'the labels are on the buttons').toBeGreaterThan(0);

  // compact: the words are gone, the buttons are 2rem wide icons, and there is still no "..." button
  await centreWidth(page, 80);
  await expect(more).toBeHidden();
  expect(await labels(), 'no label is shown').toBe(0);
  const icon = await header
    .locator('.with-icon')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: element.getBoundingClientRect().width, left: style.paddingLeft, right: style.paddingRight };
    });
  expect(icon).toEqual({ width: 2 * REM, left: '0px', right: '0px' });

  // minimal: the "..." button of 2rem, without padding, and its menu, closed, then open above the chips
  await centreWidth(page, 55);
  await expect(more).toBeVisible();
  const button = await more.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: element.getBoundingClientRect().width, left: style.paddingLeft, right: style.paddingRight };
  });
  expect(button, 'the "..." button keeps 2rem and no padding').toEqual({ width: 2 * REM, left: '0px', right: '0px' });
  await expect(overflow).toBeHidden();
  await more.click();
  await expect(overflow).toBeVisible();
  await expect(overflow).toHaveAttribute('data-open', 'true');
  expect(await header.evaluate((element) => getComputedStyle(element).zIndex), 'the open menu is raised').toBe('5');
  await more.click();
  await expect(overflow).toBeHidden();
  const oneRow = await heightOf();

  // tight: the header takes two rows
  await centreWidth(page, 28);
  expect(await heightOf(), 'the header takes a second row').toBeGreaterThan(oneRow + 10);
  expect(await header.evaluate((element) => getComputedStyle(element).flexWrap)).toBe('wrap');
});

test('a styled box shows its fill and its own stroke, and the focal box keeps the accent stroke over its style', async ({
  page,
  serve
}) => {
  const tags = '      tags:\n        rendering-stereotypes: "marked"\n';
  const files = {
    ...CORNER_SHOP,
    '.archicode.yaml': `settings:
  name: "Corner shop"
  manifests:
    paths: ["manifests"]
styles:
  by-tags:
    marked:
      background-color: "#ffe9a8"
      line-color: "#cc3300"
      line-thickness: 4
`,
    // the catalog and the shop itself, which is the focal box of its own view, wear the style
    'manifests/shop.yaml': CORNER_SHOP['manifests/shop.yaml']
      .replace(
        '      description: "The books on sale."   # kept\n',
        '      description: "The books on sale."   # kept\n' + tags
      )
      .replace('  name: "Shop"\n', '  name: "Shop"\n  tags:\n    rendering-stereotypes: "marked"\n')
  };
  const server = await serve(null, files);
  await page.goto(server.url);
  await openPage(page, 'Elements');
  await page.locator('[data-action="select-element"]', { hasText: 'Shop' }).first().click();
  await page.locator('[data-action="set-element-tab"]', { hasText: 'Detailed' }).click();

  const paint = (ref) =>
    page
      .locator(`g.dg-node[data-ref="${ref}"] > .dg-box, g.dg-node[data-ref="${ref}"] > .dg-group`)
      .first()
      .evaluate((rect) => {
        const style = getComputedStyle(rect);
        return { fill: style.fill, stroke: style.stroke, width: style.strokeWidth };
      });
  await expect(page.locator('g.dg-node[data-ref="shop.catalog"]')).toHaveClass(/dg-styled/);
  // a styled box has the fill and the stroke of its style; a plain box has neither
  expect(await paint('shop.catalog')).toEqual({ fill: 'rgb(255, 233, 168)', stroke: 'rgb(204, 51, 0)', width: '4px' });
  const plain = await paint('shop.web');
  expect(plain.fill).not.toBe('rgb(255, 233, 168)');
  expect(plain.stroke).not.toBe('rgb(204, 51, 0)');

  // the focal box is styled too: it keeps the fill of its style, and the accent of the page wins over the line of the style
  const accent = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  const focal = await paint('shop');
  expect(focal.fill).toBe('rgb(255, 233, 168)');
  expect(focal.stroke, 'the accent wins over the line colour of the style').toBe(accent);
  expect(focal.width).toBe('2.5px');
});

test('the story player opened on a phone is not wider than the window and keeps its bar, its step menu and its words inside it', async ({
  page,
  serve
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const server = await serve('domain_plateaus');
  await page.goto(server.url);
  await openPerspective(page, 'Stories');
  await page.locator('[data-action="story-player-open"]').click();
  const player = page.getByRole('dialog', { name: 'From the shop to the new shop' });
  await expect(player).toBeVisible();

  const shell = player;
  const box = await shell.boundingBox();
  expect(box.width, 'not wider than the window').toBeLessThanOrEqual(360);
  expect(box.height, 'not taller than the window').toBeLessThanOrEqual(640);
  expect(await page.evaluate(() => document.documentElement.scrollWidth), 'no sideways scroll').toBeLessThanOrEqual(
    360
  );
  for (const part of ['.player-bar', '[data-player-step-menu]', '.player-words']) {
    const inside = await player.locator(part).first().boundingBox();
    expect(inside, `${part} is drawn`).not.toBeNull();
    expect(inside.x, `${part} starts inside the window`).toBeGreaterThanOrEqual(0);
    expect(inside.x + inside.width, `${part} ends inside the window`).toBeLessThanOrEqual(360 + 0.5);
  }
  expect(await shell.evaluate((element) => getComputedStyle(element).overflow)).toBe('hidden');
});
