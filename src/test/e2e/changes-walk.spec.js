// The walk of the Changes list with the mouse (wave 027, run 0201, #179): on a long comparison (the harbour pair of
// `replaces-large-pair`, 360 changes) a reader presses Next change thirty times in a row. After every press the button
// must still be inside the right panel and the selected row must be below the sticky block (the tabs and the walk bar),
// at 1280 and at 360 px wide, on the page Plateaus (the panel alone) and on Applications (the panel with its tabs).

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('./fixtures');
const { ROOT } = require('./harness');

const HARBOUR = path.join(ROOT, 'src', 'test', 'resources', 'replaces-large-pair');
const PRESSES = 30;

// Every file of the harbour fixture as path -> text, the hidden .archicode.yaml included; the generator stays out.
function harbourFiles() {
  const files = {};
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(HARBOUR, relative), { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        walk(child);
      } else if (entry.name !== 'generate.mjs') {
        files[child] = fs.readFileSync(path.join(HARBOUR, child), 'utf8');
      }
    }
  };
  walk('');
  return files;
}

const SIZES = [
  { name: '1280 x 800', width: 1280, height: 800 },
  { name: '360 x 640', width: 360, height: 640 }
];
const PAGES = ['plateaus', 'applications'];

for (const size of SIZES) {
  for (const pageName of PAGES) {
    test(`thirty presses of Next change keep the button in the panel and the row below the sticky block (${pageName}, ${size.name})`, async ({
      page,
      serve
    }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width: size.width, height: size.height });
      const server = await serve(null, harbourFiles());
      await page.goto(`${server.url}#/timeline/${pageName}?plateau=after-declared&compare=other:before`);

      const panel = page.locator('#panel-right');
      const next = panel.locator('[data-action="change-next"]');
      await expect(next).toBeVisible({ timeout: 30000 });
      await expect(panel).toContainText('360 changes');

      for (let press = 1; press <= PRESSES; press += 1) {
        await next.click();
        const selected = panel.locator('.change-row.selected').first();
        await expect(selected).toBeVisible();
        await expect(panel.locator('.changes-position')).toContainText(`${press} of`);

        const measured = await page.evaluate(() => {
          const box = (element) => {
            if (!element) {
              return null;
            }
            const { top, bottom, left, right } = element.getBoundingClientRect();
            return { top, bottom, left, right };
          };
          const panelElement = document.querySelector('#panel-right');
          const row = panelElement.querySelector('.change-row.selected');
          const sticky = [...panelElement.querySelectorAll('.right-tabs, [data-changes-walkbar]')]
            .map((element) => element.getBoundingClientRect().bottom)
            .filter((bottom) => bottom > 0);
          return {
            panel: box(panelElement),
            button: box(panelElement.querySelector('[data-action="change-next"]')),
            row: box(row),
            stickyBottom: sticky.length ? Math.max(...sticky) : box(panelElement).top
          };
        });
        const message = `press ${press} (${pageName}, ${size.name}): ${JSON.stringify(measured)}`;
        expect(measured.button.top, `button top above the panel, ${message}`).toBeGreaterThanOrEqual(
          measured.panel.top - 0.5
        );
        expect(measured.button.bottom, `button bottom below the panel, ${message}`).toBeLessThanOrEqual(
          measured.panel.bottom + 0.5
        );
        expect(measured.row.top, `selected row under the sticky block, ${message}`).toBeGreaterThanOrEqual(
          measured.stickyBottom - 0.5
        );
      }
    });
  }
}
