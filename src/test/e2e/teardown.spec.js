// The order in which the fixtures end (wave 024, run 0181, W-10): `pageErrors` judges the page after the test body, and
// the server of `serve` must still be there then, or a request the page sends while the server stops is refused and
// the page says an error nobody did wrong. These two tests hold that order.

const { test, expect } = require('./fixtures');
const { CORNER_SHOP } = require('./workspace');

test('a request the page sends while its server stops is no error of the test', async ({ page, serve }) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(server.url);

  // The page keeps fetching, as the editor does while it works, and says an error itself when the server refuses.
  await page.evaluate(() => {
    window.__fetched = 0;
    setInterval(() => {
      fetch('/')
        .then(() => {
          window.__fetched += 1;
        })
        .catch((error) => console.error(`fetch refused: ${error.message}`));
    }, 20);
  });
  await page.waitForFunction(() => window.__fetched > 0);
  // the body returns here: the server stops while the interval is still running
});

test.fail('an error the page raises while the test runs still fails the test', async ({ page, serve }) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(server.url);

  await page.evaluate(() => console.error('raised on purpose while the test runs'));
  await expect(page.locator('body')).toBeVisible();
});
