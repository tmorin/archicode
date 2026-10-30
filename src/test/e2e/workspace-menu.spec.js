// The Workspace menu and the top bar of a browser workspace, measured as boxes (wave 028, run 0205, #182; TDD DEC-5, DEC-6, review F-1 to F-4, F-6).
// The page is served as the website serves it, from Node: no JVM (harness.js, startHostedPage). At each width, in the light and the dark scheme, with the menu
// open: the label and the note of an item lie inside the item, the items do not intersect, the menu lies inside the window, every button of the bar lies inside
// the window and the document is no wider than the window. The assertions collect their problems in a list so that a failure names every box that is wrong.

const fs = require('node:fs');
const { test, expect, openPage } = require('./fixtures');
const { SAMPLE_ADDRESS, openWorkspaceMenu, waitForEditor } = require('./hosted');

const WIDTHS = [1280, 900, 700, 560, 360];
const SCHEMES = ['light', 'dark'];
const TOLERANCE = 1;

// every box the assertions need, in window coordinates, read in the page
async function measure(page) {
  return page.evaluate(() => {
    const box = (element) => {
      const b = element.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    };
    const name = (element) =>
      (element.getAttribute('data-action') || element.className || element.tagName) +
      ' "' +
      element.textContent.trim().slice(0, 30) +
      '"';
    const menu = document.querySelector('.workspace-menu');
    return {
      innerWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      menu: menu ? box(menu) : null,
      items: [...document.querySelectorAll('.workspace-menu .workspace-item')].map((item) => ({
        name: name(item),
        box: box(item),
        scrollHeight: item.scrollHeight,
        clientHeight: item.clientHeight,
        background: getComputedStyle(item).backgroundColor,
        parts: [...item.children].map((part) => ({ name: name(part), box: box(part) }))
      })),
      asked: [...document.querySelectorAll('.workspace-menu .workspace-ask-actions button')].map((button) => ({
        name: name(button),
        box: box(button),
        scrollHeight: button.scrollHeight,
        clientHeight: button.clientHeight
      })),
      bar: [...document.querySelectorAll('.top-panel button, .top-panel .bundle-notice')].map((button) => ({
        name: name(button),
        box: box(button)
      }))
    };
  });
}

const inside = (inner, outer) =>
  inner.left >= outer.left - TOLERANCE &&
  inner.right <= outer.right + TOLERANCE &&
  inner.top >= outer.top - TOLERANCE &&
  inner.bottom <= outer.bottom + TOLERANCE;
const intersect = (a, b) =>
  a.left < b.right - TOLERANCE &&
  b.left < a.right - TOLERANCE &&
  a.top < b.bottom - TOLERANCE &&
  b.top < a.bottom - TOLERANCE;

// the problems of a measure: an empty list is a menu and a bar that hold
function problemsOf(m, { idleBackground }) {
  const problems = [];
  const window = { left: 0, right: m.innerWidth, top: -Infinity, bottom: Infinity };
  if (m.documentWidth > m.innerWidth + TOLERANCE) {
    problems.push('the document is ' + m.documentWidth + ' px wide in a window of ' + m.innerWidth);
  }
  if (m.menu && !inside(m.menu, window)) {
    problems.push('the menu (left ' + m.menu.left + ', right ' + m.menu.right + ') is not inside the window');
  }
  for (const control of m.bar) {
    if (!inside(control.box, window)) {
      problems.push(
        'the bar button ' +
          control.name +
          ' (left ' +
          control.box.left +
          ', right ' +
          control.box.right +
          ') is not inside the window'
      );
    }
  }
  for (const item of m.items) {
    if (item.scrollHeight > item.clientHeight + TOLERANCE) {
      problems.push(
        'the item ' + item.name + ' holds ' + item.scrollHeight + ' px of content in ' + item.clientHeight + ' px'
      );
    }
    for (const part of item.parts) {
      if (!inside(part.box, item.box)) {
        problems.push(
          'the ' +
            part.name +
            ' of the item ' +
            item.name +
            ' is not inside the item (bottom ' +
            part.box.bottom +
            ' against ' +
            item.box.bottom +
            ')'
        );
      }
    }
    if (m.menu && !inside(item.box, m.menu)) {
      problems.push('the item ' + item.name + ' is not inside the menu');
    }
    if (idleBackground && item.background !== 'rgba(0, 0, 0, 0)') {
      problems.push('the idle item ' + item.name + ' has the background ' + item.background + ', not rgba(0, 0, 0, 0)');
    }
  }
  for (let i = 0; i < m.items.length; i++) {
    for (let j = i + 1; j < m.items.length; j++) {
      if (intersect(m.items[i].box, m.items[j].box)) {
        problems.push('the items ' + m.items[i].name + ' and ' + m.items[j].name + ' intersect');
      }
    }
  }
  for (let i = 0; i < m.asked.length; i++) {
    const button = m.asked[i];
    if (button.scrollHeight > button.clientHeight + TOLERANCE) {
      problems.push(
        'the question button ' + button.name + ' holds ' + button.scrollHeight + ' px in ' + button.clientHeight
      );
    }
    if (m.menu && !inside(button.box, m.menu)) {
      problems.push('the question button ' + button.name + ' is not inside the menu');
    }
    for (let j = i + 1; j < m.asked.length; j++) {
      if (intersect(button.box, m.asked[j].box)) {
        problems.push('the question buttons ' + button.name + ' and ' + m.asked[j].name + ' intersect');
      }
    }
  }
  return problems;
}

async function expectHolds(page, label, options = {}) {
  const problems = problemsOf(await measure(page), options);
  expect(problems, label).toEqual([]);
}

for (const width of WIDTHS) {
  test(
    'the Workspace menu and the bar of the sample hold at ' + width + ' px, light and dark',
    async ({ page, hosted }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(hosted.url + SAMPLE_ADDRESS);
      await waitForEditor(page);

      for (const scheme of SCHEMES) {
        await page.emulateMedia({ colorScheme: scheme });
        // the menu opened: Export as a file with its note, Reset to the sample
        await openWorkspaceMenu(page);
        await expect(page.locator('.workspace-menu .workspace-item')).toHaveCount(2);
        await expectHolds(page, 'the open menu, ' + scheme + ', ' + width + ' px', { idleBackground: true });

        // the question of Reset to the sample: two buttons side by side or wrapped, inside the menu
        await page.getByRole('button', { name: /Reset to the sample/ }).click();
        await expect(page.locator('.workspace-ask-actions button')).toHaveCount(2);
        await expectHolds(page, 'the reset question, ' + scheme + ', ' + width + ' px');
        await page.locator('[data-action="workspace-cancel-question"]').click();
      }
      await page.emulateMedia({ colorScheme: 'light' });

      // after an export the bar holds the notice of the bundle
      await openWorkspaceMenu(page);
      const downloading = page.waitForEvent('download');
      await page.getByRole('button', { name: /Export as a file/ }).click();
      const download = await downloading;
      expect(fs.existsSync(await download.path())).toBe(true);
      await expect(page.locator('.bundle-notice')).toBeVisible();
      await expectHolds(page, 'the bar with the notice of the bundle, menu closed, ' + width + ' px');
      await openWorkspaceMenu(page);
      await expectHolds(page, 'the bar with the notice of the bundle, menu open, ' + width + ' px');
    }
  );
}

test('with a change pending the note of Export wraps inside its item, at 360 px', async ({ page, hosted }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(hosted.url + SAMPLE_ADDRESS);
  await waitForEditor(page);

  // text typed in a form and not applied: Export waits and says why
  await openPage(page, 'Elements');
  await page
    .locator('.tree-node-row[role="treeitem"]')
    .filter({ hasText: /Back office/ })
    .first()
    .click();
  await page.locator('[data-action="toggle-element-edit"]').first().click();
  await page.locator('#edit-description-input').fill('A change that is typed and not saved.');

  await openWorkspaceMenu(page);
  await expect(page.locator('.workspace-menu .workspace-item[aria-disabled="true"]')).toHaveCount(1);
  await expectHolds(page, 'the open menu with a change pending, 360 px', { idleBackground: false });
});

test('a workspace with the longest name holds the bar and the menu, at 360 px', async ({ page, hosted }) => {
  const longName = 'a'.repeat(80);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(hosted.url);
  await page.getByRole('button', { name: /New workspace in this browser/ }).click();
  await page.getByRole('textbox').fill(longName);
  await page.getByRole('button', { name: 'Create' }).click();
  await waitForEditor(page);

  await expectHolds(page, 'the bar with a name of 80 characters, menu closed');
  await openWorkspaceMenu(page);
  await expectHolds(page, 'the bar with a name of 80 characters, menu open', { idleBackground: true });
});
