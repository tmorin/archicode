// The address carries what changes the diagram (wave 027, run 0203, issue #178, TDD VER-4 and VER-5, REQ-4 and REQ-6): a link
// copied from the address bar, opened in a new browser context (no remembered flag, no cache, no history), draws the same
// diagram: the same box references and the same number of links. Positions are not compared (RISK-5: ELK's order may differ
// between two drawings); the references of the boxes and the count of `g.dg-link` are the contract.
//
// The page is the layered Brightcart at `marketplace`, with a comparison, Changes only, two boxes unfolded, one hidden and
// the toolbar's 4 columns on the Map; the same on the page of an element and on the page of a saved view. `ADDRESS_LENGTH`
// lines are printed for the run record (REQ-6).

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('./fixtures');
const { ROOT } = require('./harness');

const BRIGHTCART = path.join(ROOT, 'src', 'test', 'resources', 'brightcart', 'layered');
const MAP_ADDRESS = '#/timeline/applications?plateau=marketplace';
const ELEMENT_ADDRESS = '#/timeline/elements?plateau=marketplace';
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

// What a diagram is, for this spec: the references of its boxes and the number of its links.
async function signatureOf(page) {
  return page.evaluate(() => ({
    boxes: [...document.querySelectorAll('g.dg-node')].map((g) => g.getAttribute('data-ref')).sort(),
    links: document.querySelectorAll('g.dg-link').length
  }));
}

async function settled(page) {
  await expect(page.locator('g.dg-node').first()).toBeVisible();
  let last = '';
  await expect
    .poll(
      async () => {
        const now = JSON.stringify(await signatureOf(page));
        const same = now === last;
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
  await settled(page);
}

async function compareWithPast(page) {
  await page.locator('#band-compare').selectOption('past');
  await expect(page.locator('[data-action="set-changes-only"]').first()).toBeVisible();
  await settled(page);
}

async function changesOnly(page) {
  await page.locator('[data-action="set-changes-only"][data-value="1"]').first().click();
  await expect(page).toHaveURL(/changes-only=1/);
  await settled(page);
}

async function columns(page, value) {
  await page.locator('#diagram-columns').first().selectOption(value);
  await expect(page).toHaveURL(new RegExp(`layout=${value}`));
  await settled(page);
}

async function unfoldAll(page) {
  await page.locator('[data-action="unfold-all"]').click();
  await expect(page).toHaveURL(/open=/);
  await settled(page);
}

async function hideFirstHideable(page) {
  const button = page.locator('[data-action="map-hide"][aria-pressed="false"]').first();
  await button.waitFor({ state: 'attached' });
  await button.dispatchEvent('click');
  await expect(page).toHaveURL(/hide=/);
  await settled(page);
}

// The copied address, opened in a new context: the same workspace served, nothing the first page remembered.
async function openedElsewhere(browser, server, url) {
  const context = await browser.newContext();
  const other = await context.newPage();
  // the server's own address carries its token, which the page drops from what it shows: the hash is the copied part
  await other.goto(server.url + url.slice(url.indexOf('#')));
  await settled(other);
  return { context, page: other, signature: await signatureOf(other) };
}

async function expectSameInNewContext(browser, server, page, label) {
  const url = page.url();
  const signature = await signatureOf(page);
  expect(signature.boxes.length, `${label}: boxes drawn`).toBeGreaterThan(0);
  const { context, page: other, signature: reopened } = await openedElsewhere(browser, server, url);
  try {
    expect(reopened.boxes, `${label}: the boxes of ${url}`).toEqual(signature.boxes);
    expect(reopened.links, `${label}: the links of ${url}`).toBe(signature.links);
    expect(other.url().slice(other.url().indexOf('#')), `${label}: the address is written back as it was`).toBe(
      url.slice(url.indexOf('#'))
    );
  } finally {
    await context.close();
  }
  return url;
}

test('the application Map with a comparison, Changes only, two boxes unfolded, one hidden and 4 columns opens the same from its address', async ({
  page,
  browser,
  serve
}) => {
  const server = await serve(null, brightcart());
  // the folded map with no comparison, as an address says it: `compare=` empty names none
  const FOLDED = MAP_ADDRESS + '&compare=';
  await goTo(page, server, FOLDED);
  const folded = await signatureOf(page);

  await compareWithPast(page);
  await changesOnly(page);
  await unfoldAll(page);
  await hideFirstHideable(page);
  await columns(page, '4');
  const url = await expectSameInNewContext(browser, server, page, 'application Map');
  expect(url).toMatch(/compare=/);
  expect(url).toMatch(/changes-only=1/);
  expect(url).toMatch(/open=/);
  expect(url).toMatch(/hide=/);
  expect(url).toMatch(/layout=4/);
  expect(url).toMatch(/plateau=marketplace/);

  // Back and Forward: the comparison is an entry of the history; the fold state comes with the address of each entry
  const drawn = await signatureOf(page);
  await page.goto('about:blank');
  await page.goto(server.url + FOLDED);
  await settled(page);
  expect(await signatureOf(page)).toEqual(folded);
  await page.evaluate(
    (address) => {
      location.hash = address;
    },
    url.slice(url.indexOf('#'))
  );
  await settled(page);
  expect(await signatureOf(page)).toEqual(drawn);
  await page.evaluate((address) => {
    location.hash = address;
  }, FOLDED);
  await settled(page);
  expect(await signatureOf(page), 'a fold the address lacks is folded').toEqual(folded);
  await page.goBack();
  await settled(page);
  expect(await signatureOf(page), 'Back returns the folds').toEqual(drawn);
  await page.goForward();
  await settled(page);
  expect(await signatureOf(page), 'Forward returns the folded map').toEqual(folded);
});

test('the page of an element with a comparison, Changes only and 4 columns opens the same from its address', async ({
  page,
  browser,
  serve
}) => {
  const server = await serve(null, brightcart());
  await page.goto(server.url + ELEMENT_ADDRESS);
  await page.locator('[data-action="select-element"]', { hasText: 'Commerce services' }).first().click();
  await page.locator('[data-action="set-element-tab"]', { hasText: 'Detailed' }).click();
  await settled(page);
  await compareWithPast(page);
  await changesOnly(page);
  await columns(page, '4');
  const url = await expectSameInNewContext(browser, server, page, 'element page');
  expect(url).toMatch(/compare=/);
  expect(url).toMatch(/changes-only=1/);
  expect(url).toMatch(/layout=4/);
});

test('the page of a saved view with a comparison and Changes only opens the same from its address', async ({
  page,
  browser,
  serve
}) => {
  const server = await serve(null, brightcart());
  await page.goto(server.url + VIEWS_ADDRESS + '&compare=past');
  await page.getByText(WIDE_VIEW, { exact: true }).first().click();
  await settled(page);
  await changesOnly(page);
  const url = await expectSameInNewContext(browser, server, page, 'saved view');
  expect(url).toMatch(/compare=/);
  expect(url).toMatch(/changes-only=1/);
});

const TECHNOLOGY_ADDRESS = '#/timeline/environments?plateau=marketplace';

async function leaveOut(page, part) {
  await page.locator(`[data-action="toggle-map-part"][data-part="${part}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${part}=0`));
  await settled(page);
}

// REQ-4, gate of P2: the technology Map, every option that applies to it set at once, opens the same from the copied address.
test('the technology Map with a comparison, Changes only, boxes unfolded, one hidden, 4 columns and its applications left out opens the same from its address', async ({
  page,
  browser,
  serve
}) => {
  const server = await serve(null, brightcart());
  await goTo(page, server, TECHNOLOGY_ADDRESS + '&compare=');
  const folded = await signatureOf(page);

  await compareWithPast(page);
  await changesOnly(page);
  await unfoldAll(page);
  await hideFirstHideable(page);
  await leaveOut(page, 'applications');
  await columns(page, '4');
  const url = await expectSameInNewContext(browser, server, page, 'technology Map');
  expect(url).toMatch(/compare=/);
  expect(url).toMatch(/changes-only=1/);
  expect(url).toMatch(/open=/);
  expect(url).toMatch(/hide=/);
  expect(url).toMatch(/applications=0/);
  expect(url).not.toMatch(/relationships=0/);
  expect(url).toMatch(/layout=4/);
  expect(url).toMatch(/plateau=marketplace/);
  expect(await signatureOf(page), 'the options changed what is drawn').not.toEqual(folded);
});

test('the technology Map with its relationships left out, boxes unfolded and 4 columns opens the same from its address', async ({
  page,
  browser,
  serve
}) => {
  const server = await serve(null, brightcart());
  await goTo(page, server, TECHNOLOGY_ADDRESS + '&compare=');
  await unfoldAll(page);
  await leaveOut(page, 'relationships');
  await columns(page, '4');
  const url = await expectSameInNewContext(browser, server, page, 'technology Map without relationships');
  expect(url).toMatch(/open=/);
  expect(url).toMatch(/relationships=0/);
  expect(url).not.toMatch(/applications=0/);
  expect(url).toMatch(/layout=4/);
});

test('the technology Map with both parts left out opens the same from its address', async ({
  page,
  browser,
  serve
}) => {
  const server = await serve(null, brightcart());
  await goTo(page, server, TECHNOLOGY_ADDRESS + '&compare=');
  await unfoldAll(page);
  await leaveOut(page, 'applications');
  await leaveOut(page, 'relationships');
  const url = await expectSameInNewContext(
    browser,
    server,
    page,
    'technology Map without applications and relationships'
  );
  expect(url).toMatch(/applications=0/);
  expect(url).toMatch(/relationships=0/);
});

// REQ-6: the longest address the page writes on the layered Brightcart, every parent of the layer opened and some boxes pinned.
test('the longest address of the application Map and of the technology Map is recorded', async ({ page, serve }) => {
  const server = await serve(null, brightcart());
  await goTo(page, server, MAP_ADDRESS);
  let url = page.url();
  for (let i = 0; i < 6; i += 1) {
    await page.locator('[data-action="unfold-all"]').click();
    await settled(page);
    if (page.url() === url) break;
    url = page.url();
  }
  for (const pin of await page.locator('[data-action="map-pin"][aria-pressed="false"]').all()) {
    if (page.url().split('pin=')[1]?.split(',').length >= 2) break;
    await pin.dispatchEvent('click');
    await expect(page).toHaveURL(/pin=/);
    await settled(page);
  }
  // a pinned Map may have nothing changed to draw: the address is what is read, so the page is only given time
  await compareWithPast(page).catch(() => {});
  await page.locator('[data-action="set-changes-only"][data-value="1"]').first().click();
  await expect(page).toHaveURL(/changes-only=1/);
  await page.locator('#diagram-columns').first().selectOption('4');
  await expect(page).toHaveURL(/layout=4/);
  console.log(`ADDRESS_LENGTH application ${page.url().length} ${page.url()}`);
  expect(page.url().length).toBeLessThan(600);

  await goTo(page, server, '#/timeline/environments?plateau=marketplace');
  await compareWithPast(page);
  await changesOnly(page);
  let technology = page.url();
  for (let i = 0; i < 6; i += 1) {
    await page.locator('[data-action="unfold-all"]').click();
    await settled(page);
    if (page.url() === technology) break;
    technology = page.url();
  }
  await columns(page, '4');
  console.log(`ADDRESS_LENGTH technology ${page.url().length} ${page.url()}`);
  expect(page.url().length).toBeLessThan(600);
});
