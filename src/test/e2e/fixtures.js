// What every spec of the end-to-end suite starts from (wave 023, run 0175, T11): Playwright's `test` with two fixtures.
//
//   serve(example, files)  starts `archicode editor serve` on a copy of a shipped example (see harness.js) and stops it,
//                          and removes the copy, when the test ends, whatever the verdict. One server and one copy per
//                          call: no two tests share a folder. The start is a fixture, so that a slow JVM start (the
//                          machine is busy) has its own generous timeout and does not eat the test's.
//   pageErrors (automatic) collects what the page says on the console as an error and the exceptions it does not catch;
//                          the test fails at its end when there is one, whichever flow it was. A flow that expects an
//                          error has no place in this suite: the errors of the editor are sentences on the page.
//
// The order (wave 024, run 0181, W-10): `pageErrors` lists `serve` among its parameters, so that Playwright sets `serve`
// up first and tears it down last. `pageErrors` judges the page after the test body, while its server is still up: a
// fixture that does not depend on `serve` may end after it, and a request the page sends as the server stops is refused
// and reported as an error nobody did wrong. No filter and no wait stand in for that order.

const { test: base, expect } = require('@playwright/test');
const { startServer } = require('./harness');

const test = base.extend({
  serve: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads the fixtures a function uses from its first parameter
    async ({}, use) => {
      const started = [];
      await use(async (example, files) => {
        const server = await startServer(example, files);
        started.push(server);
        return server;
      });
      for (const server of started) {
        await server.stop();
      }
    },
    { timeout: 120000 }
  ],

  pageErrors: [
    async ({ page, serve }, use) => {
      void serve; // the dependency is the point: see the head comment
      const errors = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') {
          return;
        }
        errors.push(`console.error: ${message.text()}`);
      });
      page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
      await use(errors);
      expect(errors, 'what the page said on the console as an error').toEqual([]);
    },
    { auto: true }
  ]
});

// The pages of the editor, by the label of the button that opens them. `perspective` buttons are the top bar's,
// `page` buttons are the band's under Timeline.
async function openPerspective(page, label) {
  await page.locator('[data-action="set-perspective"]', { hasText: label }).click();
}

async function openPage(page, label) {
  await page.locator('[data-action="set-page"]', { hasText: label }).click();
}

module.exports = { test, expect, openPerspective, openPage };
