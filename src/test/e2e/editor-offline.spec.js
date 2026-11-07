// The editor with the network cut: every URL whose host is not 127.0.0.1 is aborted and recorded, and the editor still
// draws a diagram (ELK, from assets/elk.js; the kernel, from assets/viewpoint_kernel.wasm) and edits YAML in CodeMirror (assets/codemirror.js). A build that imports
// from a remote host again records a request and fails the last assertion of its test. `g.dg-node` exists only when ELK
// laid the view out; `.cm-editor` exists only when CodeMirror mounted.

const { test, expect, openPerspective } = require('./fixtures');
const { CORNER_SHOP } = require('./workspace');

// Aborts and records every request that does not go to 127.0.0.1.
async function blockOutsideWorld(page) {
  const blocked = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') {
      return route.continue();
    }
    blocked.push(route.request().url());
    return route.abort();
  });
  return blocked;
}

// Records the answers for the kernel file, and the time from goto to the first drawn node.
function watchKernel(page) {
  const answers = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('/assets/viewpoint_kernel.wasm')) {
      answers.push({ status: response.status(), type: response.headers()['content-type'] });
    }
  });
  return answers;
}

async function expectKernelFromFile(page, answers) {
  expect(answers.length, 'requests for the kernel file').toBeGreaterThan(0);
  for (const answer of answers) {
    expect(answer.status).toBe(200);
    expect(answer.type).toContain('application/wasm');
  }
  expect(await page.content(), 'the page carries no kernel block').not.toMatch(/<script[^>]*id="viewpoint-kernel/);
}

async function editInCodeMirror(page, relpath, text) {
  await openPerspective(page, 'Files');
  await page.locator('[data-action="select-file"]', { hasText: relpath }).first().click();
  const editor = page.locator('#file-edit-codemirror-host .cm-editor');
  await expect(editor).toBeVisible();
  await page.locator('#file-edit-codemirror-host .cm-content').click();
  await page.keyboard.press('ControlOrMeta+Home');
  await page.keyboard.type(text);
}

test('a served folder: the view is laid out and a file is edited in CodeMirror with every other host blocked', async ({
  page,
  serve
}) => {
  const blocked = await blockOutsideWorld(page);
  const kernel = watchKernel(page);
  const server = await serve(null, CORNER_SHOP);
  const started = Date.now();
  await page.goto(server.url);

  await page.locator('[data-action="set-page"]', { hasText: 'Elements' }).click();
  await page.locator('[data-action="select-element"]', { hasText: 'Shop' }).first().click();
  await page.locator('[data-action="set-element-tab"]', { hasText: 'Detailed' }).click();
  await expect(page.locator('g.dg-node[data-ref="shop.web"]')).toBeVisible();
  console.log(`offline load, served folder: ${Date.now() - started} ms from goto to the first g.dg-node`);
  await expectKernelFromFile(page, kernel);

  const marker = '# typed in CodeMirror by the offline spec\n';
  await editInCodeMirror(page, 'manifests/shop.yaml', marker);
  await page.locator('[data-action="save-all-changes"]').click();
  await expect(page.locator('body')).toContainText('Saved.');
  expect(server.read('manifests/shop.yaml')).toContain(marker.trim());

  expect(blocked, 'requests to a host other than 127.0.0.1').toEqual([]);
});

test('the hosted-style page: the sample is drawn and CodeMirror mounts with every other host blocked', async ({
  page,
  hosted
}) => {
  const blocked = await blockOutsideWorld(page);
  const kernel = watchKernel(page);
  const started = Date.now();
  await page.goto(hosted.url + '#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart');
  await expect(page.locator('[data-action="save-all-changes"]')).toBeVisible();
  await expect(page.locator('g.dg-node').first()).toBeVisible();
  console.log(`offline load, hosted page: ${Date.now() - started} ms from goto to the first g.dg-node`);
  await expectKernelFromFile(page, kernel);

  await openPerspective(page, 'Files');
  await page.locator('[data-action="select-file"]').first().click();
  await expect(page.locator('#file-edit-codemirror-host .cm-editor')).toBeVisible();

  expect(hosted.requests).toContain('/editor/assets/elk.js');
  expect(hosted.requests).toContain('/editor/assets/codemirror.js');
  expect(hosted.requests).toContain('/editor/assets/viewpoint_kernel.wasm');
  expect(blocked, 'requests to a host other than 127.0.0.1').toEqual([]);
});
