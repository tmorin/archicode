'use strict';
// The presentation page at the root of the published site: its links to the manual and to the editor must land somewhere.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readPage } = require('./viewpoint-kernel/editor-files');
const vm = require('node:vm');

const PAGE = fs.readFileSync(path.resolve(__dirname, '../../site/index.html'), 'utf8');
const MANUAL = fs.readFileSync(path.resolve(__dirname, '../../doc/README.adoc'), 'utf8');

const STAMPED = {
  '../../site/index.html': () => fs.readFileSync(path.resolve(__dirname, '../../site/index.html'), 'utf8'),
  'the built editor page': readPage
};

test('the pages that the CI stamps with the release carry the stamp it replaces, once', () => {
  for (const [file, readText] of Object.entries(STAMPED)) {
    const text = readText();
    assert.equal(text.split('<meta name="archicode-version" content="dev">').length - 1, 1, file);
  }
});

/** Open the page at `hash` with the inline script of its head, and say where it was sent. */
function open(hash) {
  const script = PAGE.match(/<script>([\s\S]*?)<\/script>/)[1];
  const ids = new Set([...PAGE.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const sent = [];
  const loaded = [];
  const document = {
    documentElement: {},
    getElementById: (id) => (ids.has(id) ? {} : null),
    addEventListener: (name, listener) => loaded.push(listener)
  };
  vm.runInNewContext(script, { document, location: { hash, replace: (url) => sent.push(url) } });
  loaded.forEach((listener) => listener());
  return sent;
}

test('[redirect] a link to an anchor of the old manual is sent to the same anchor of docs/, an anchor of the page stays', () => {
  assert.deepEqual(open('#editor-map'), ['docs/#editor-map']);
  assert.deepEqual(open('#_domain'), ['docs/#_domain']);
  assert.deepEqual(open('#start'), []);
  assert.deepEqual(open(''), []);
});

test('a malformed hash neither throws nor sends anywhere', () => {
  assert.deepEqual(open('#%'), []);
  assert.deepEqual(open('#%E0%A4%A'), []);
});

test('every link into the manual is the manual itself, or an anchor that the manual writes', () => {
  const hrefs = [...PAGE.matchAll(/href="docs\/([^"]*)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length >= 1);
  for (const href of hrefs) {
    if (href === '') continue;
    assert.match(href, /^#[a-z-]+$/, href);
    assert.ok(MANUAL.includes('[[' + href.slice(1) + ']]'), 'the manual has no [[' + href.slice(1) + ']] anchor');
  }
});

test('every anchor of the page points at an id of the page', () => {
  const ids = new Set([...PAGE.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, anchor] of PAGE.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(anchor), '#' + anchor);
});

test('the page links to the editor, which is published next to it', () => {
  assert.ok(PAGE.includes('href="editor/"'));
});

test('the footer shows the version that the release stamps into the page, and nothing for a development build', () => {
  const script = PAGE.slice(PAGE.lastIndexOf('<script>') + 8, PAGE.lastIndexOf('</script>'));
  const show = (version) => {
    const footer = { textContent: '' };
    vm.runInNewContext(script, {
      document: {
        querySelector: () => ({ getAttribute: () => version }),
        getElementById: () => footer,
        querySelectorAll: () => []
      }
    });
    return footer.textContent;
  };
  assert.equal(show('1.2.3'), ' · v1.2.3');
  assert.equal(show('dev'), '');
});

test('the links to docs/ and editor/ are the folders that the CI assembles', () => {
  const workflow = fs.readFileSync(path.resolve(__dirname, '../../../.github/workflows/ci-build.yaml'), 'utf8');
  for (const target of ['target/site/index.html', 'target/site/docs/', 'target/site/editor/index.html']) {
    assert.ok(workflow.includes(target), 'the "Assemble website" step has no ' + target);
  }
});

/** The href of the button that opens the sample, as written in the page (the `&amp;` of the markup read as `&`). */
function sampleHrefs() {
  return [...PAGE.matchAll(/href="(editor\/#[^"]*)"/g)].map((match) => match[1].replace(/&amp;/g, '&'));
}

test('[links] every sample link opens the editor on a sample of the catalog, and Brightcart is one of them', () => {
  const hrefs = sampleHrefs();
  assert.ok(hrefs.length >= 2);
  assert.ok(hrefs.some((href) => href.includes('sample=brightcart')));
  const source = fs.readFileSync(path.resolve(__dirname, '../../main/editor/persistence/bundle-io.js'), 'utf8');
  const ids = Object.keys(
    vm.runInNewContext(source.match(/const BROWSER_SAMPLES = (\{[\s\S]*?\});/)[1].replace(/^/, '(') + ')')
  );
  for (const href of hrefs) {
    assert.ok(href.startsWith('editor/#'), href);
    const sample = new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('sample');
    assert.ok(ids.includes(sample), href);
  }
});

test('the hint no longer promises Chromium only', () => {
  assert.ok(!PAGE.includes('Chrome, Edge, Brave or Opera'));
  assert.ok(PAGE.includes('open the sample, create a workspace, or pick a folder where your browser allows it'));
});

const ROOT = path.resolve(__dirname, '../../..');
const SITE = 'https://tmorin.github.io/archicode/';
const HERO_TEXT = 'Try the editor on a realistic project';

/** Read a file of the repository, failing the test (not the module) when it is missing. */
function read(file) {
  assert.ok(fs.existsSync(path.resolve(ROOT, file)), file + ' does not exist');
  return fs.readFileSync(path.resolve(ROOT, file), 'utf8');
}

const squash = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const manualIds = () => new Set([...MANUAL.matchAll(/^\[\[([^\]]+)\]\]/gm)].map((match) => match[1]));

/** The links of the page whose address is the editor with a sample, as { href, text }. */
function sampleLinks() {
  return [...PAGE.matchAll(/<a\s[^>]*?href="(editor\/#[^"]*sample=[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: match[1].replace(/&amp;/g, '&'),
    text: squash(match[2])
  }));
}

test('[head] the page has exactly one h1', () => {
  assert.equal((PAGE.match(/<h1[\s>]/g) || []).length, 1);
});

test('[head] the title and the description say C4, ArchiMate and PlantUML', () => {
  const title = PAGE.match(/<title>([\s\S]*?)<\/title>/)[1];
  const description = (PAGE.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1] || '';
  for (const word of ['C4', 'ArchiMate', 'PlantUML']) {
    assert.ok(title.includes(word), 'title: ' + word);
    assert.ok(description.includes(word), 'description: ' + word);
  }
});

test('[head] the page has a canonical link, Open Graph tags and a JSON-LD SoftwareApplication', () => {
  assert.ok(PAGE.includes('<link rel="canonical" href="' + SITE + '">'), 'canonical');
  for (const name of ['og:title', 'og:description', 'og:type', 'og:url']) {
    assert.ok(PAGE.includes('property="' + name + '"'), name);
  }
  const blocks = [...PAGE.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'one JSON-LD block');
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data['@type'], 'SoftwareApplication');
});

test('[head] the JSON-LD block is not one of the bare scripts that the tests run', () => {
  assert.ok(/<script>/.test(PAGE));
  assert.ok(!/<script>\s*\{/.test(PAGE));
  assert.equal(PAGE.match(/<script>([\s\S]*?)<\/script>/)[1].includes('@context'), false);
  assert.ok(PAGE.lastIndexOf('<script>') > PAGE.indexOf('<script>'));
});

test('[links] the hero text names one link, the first one, which opens Brightcart', () => {
  const links = sampleLinks();
  const hero = links.filter((link) => link.text === HERO_TEXT);
  assert.equal(hero.length, 1);
  assert.equal(links[0].text, HERO_TEXT);
  assert.ok(hero[0].href.includes('sample=brightcart'));
  assert.match(hero[0].href, /^editor\/#\/timeline\/applications/);
});

test('[links] every other sample link has a text of its own, and none contains the hero text', () => {
  const others = sampleLinks().filter((link) => link.text !== HERO_TEXT);
  assert.ok(others.length >= 1);
  const texts = others.map((link) => link.text.toLowerCase());
  assert.equal(new Set(texts).size, texts.length, texts.join(' | '));
  for (const text of texts) assert.ok(!text.includes(HERO_TEXT.toLowerCase()), text);
});

test('[links] the model of ArchiCode is opened by sample=archicode', () => {
  assert.ok(sampleLinks().some((link) => link.href === 'editor/#/timeline/applications?sample=archicode'));
});

test('[links] no id of the page is an id of the manual', () => {
  const ids = [...PAGE.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const manual = manualIds();
  assert.ok(manual.size > 0);
  for (const id of ids) assert.ok(!manual.has(id), 'the page id "' + id + '" is a [[' + id + ']] of the manual');
});

test('[agents] the page has a For agents block with the four commands and a link to the model', () => {
  const start = PAGE.search(/id="agents"/);
  assert.ok(start >= 0, 'no id="agents"');
  const block = PAGE.slice(start, PAGE.indexOf('</section>', start));
  for (const command of [
    'archicode init',
    'archicode guide',
    'archicode query graph',
    'archicode query schemas manifest'
  ]) {
    assert.ok(block.includes(command), command);
  }
  assert.ok(block.includes('sample=archicode'));
  assert.ok(block.includes('llms.txt'));
});

test('[figure] the hero figure has a text alternative and a caption', () => {
  const figure = PAGE.match(/<figure[\s\S]*?<\/figure>/);
  assert.ok(figure, 'no figure');
  assert.match(figure[0], /aria-label="[^"]+"/);
  assert.match(figure[0], /<figcaption>[\s\S]*?\S[\s\S]*?<\/figcaption>/);
});

test('[commands] every archicode command on the page starts with a command of the application', () => {
  const names = [
    'init',
    'guide',
    'diff',
    'views generate',
    'query graph',
    'query impact',
    'query schemas',
    'query views',
    'editor serve',
    'plateau fold',
    'plateau list',
    'stories generate'
  ];
  const code = [...PAGE.matchAll(/<(code|pre)[^>]*>([\s\S]*?)<\/\1>/g)].map((match) =>
    match[2].replace(/<[^>]*>/g, '')
  );
  for (const text of code) {
    for (const [, rest] of text.matchAll(/(?:^|[\s$>])archicode\s+([^\n]*)/g)) {
      if (rest.startsWith('-')) continue;
      assert.ok(
        names.some((name) => rest === name || rest.startsWith(name + ' ')),
        'unknown command: archicode ' + rest
      );
    }
  }
});

test('[files] robots.txt names the sitemap', () => {
  assert.ok(read('src/site/robots.txt').includes('Sitemap: ' + SITE + 'sitemap.xml'));
});

test('[files] sitemap.xml lists exactly the site, the manual and the editor', () => {
  const locs = [...read('src/site/sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locs, [SITE, SITE + 'docs/', SITE + 'editor/']);
});

test('[files] llms.txt has one h1 and only links that the site or the repository answer', () => {
  const text = read('src/site/llms.txt');
  assert.equal((text.match(/^# /gm) || []).length, 1);
  const urls = [...text.matchAll(/\]\((https?:[^)\s]+)\)/g)].map((match) => match[1]);
  assert.ok(urls.length >= 1);
  const manual = manualIds();
  for (const url of urls) {
    if (url.startsWith('https://github.com/tmorin/archicode')) continue;
    assert.ok(url.startsWith(SITE), url);
    const rest = url.slice(SITE.length);
    if (rest.startsWith('docs/#')) assert.ok(manual.has(rest.slice(6)), url);
    else assert.ok(['', 'docs/', 'editor/'].includes(rest), url);
  }
});

test('[workflow] the step Assemble website copies and compares robots.txt, sitemap.xml and llms.txt', () => {
  const workflow = read('.github/workflows/ci-build.yaml');
  const from = workflow.indexOf('- name: "Assemble website"');
  assert.ok(from >= 0);
  const next = workflow.indexOf('\n      - name:', from + 1);
  const step = workflow.slice(from, next < 0 ? undefined : next);
  for (const file of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
    assert.match(step, new RegExp('cp src/site/' + file + ' target/site/' + file), 'cp ' + file);
    assert.match(step, new RegExp('cmp src/site/' + file + ' target/site/' + file), 'cmp ' + file);
    assert.match(step, new RegExp('test -f target/site/' + file), 'test -f ' + file);
  }
});
