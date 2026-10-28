'use strict';
// The list of relationships of the page Applications (wave 026, run 0199, issue #143, TDD DEC-3, REQ-1): under the tree of the Map, a section "Relationships" in a <details>, one row per
// relationship of the model drawn (or of the union of a comparison), a checkbox on each, a filter on the source, the destination, the kind of either end and the text, a select of kinds,
// a "Ticked only" switch, at most 200 rows, a ticked entry the plateau lacks kept and told. The bookshop of the manual (src/doc/examples/domain_plateaus) is opened in memory.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { BOOKSHOP, entry, run, plain, click, openWorkspace, textOf } = require('./map-links-support');

const unescape = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** The rows of the list in the markup of the left panel (`<li class="map-link-row">`): the key of the entry, whether it is ticked, and the row as text. */
function rowsOf(html) {
  return Array.from(html.matchAll(/<li\b[^>]*class="[^"]*\bmap-link-row\b[^"]*"[\s\S]*?<\/li>/g), (m) => {
    const box = /<input[^>]*data-action="map-link-toggle"[^>]*>/.exec(m[0]);
    const key = box ? /data-key="([^"]*)"/.exec(box[0]) : null;
    return {
      key: key ? unescape(key[1]) : null,
      checked: !!box && /\schecked\b/.test(box[0]),
      text: textOf(m[0]),
      html: m[0]
    };
  });
}

async function mapPage(plateau, extra) {
  const page = await openWorkspace(BOOKSHOP, plateau, extra);
  await page.go('map');
  return page;
}

const left = (page) => page.sandbox.renderMapPerspectiveHtml().left;
const keyOf = (page, e) => run(page.sandbox, 'linkEntryKey(' + JSON.stringify(e) + ')');

test('the page Applications has a section Relationships under the tree, with one row per relationship, sorted by source, destination and label', async () => {
  const page = await mapPage('baseline');
  const html = left(page);
  assert.match(html, /<details[^>]*>\s*<summary[^>]*>[^<]*Relationships/);
  const rows = rowsOf(html);
  assert.deepEqual(
    rows.map((r) => r.key),
    [
      keyOf(page, entry('customer', 'shop.web', 'orders on')),
      keyOf(page, entry('shop.web', 'shop.catalog', 'reads')),
      keyOf(page, entry('shop.web', 'shop.mailer', 'sends mails with')),
      keyOf(page, entry('warehouse.picking', 'shop.inventory', 'counts with'))
    ]
  );
  assert.match(rows[0].text, /customer\s*→\s*shop\.web/);
  assert.match(rows[0].text, /orders on/);
  assert.match(rows[0].text, /person/, 'the kind of the source');
  assert.match(rows[0].text, /container/, 'the kind of the destination');
  assert.ok(
    rows.every((r) => !r.checked),
    'nothing is ticked: the whole map is drawn'
  );
});

test('the section is closed until the author opens it, and remembers it (view state, never in the address)', async () => {
  const page = await mapPage('baseline');
  assert.doesNotMatch(left(page), /<details[^>]*\bopen\b[^>]*>\s*<summary[^>]*>[^<]*Relationships/);
  run(page.sandbox, 'mapLinksListOpen = true;');
  assert.match(left(page), /<details[^>]*\bopen\b[^>]*>\s*<summary[^>]*>[^<]*Relationships/);
  assert.doesNotMatch(page.sandbox.currentRouteHash(), /open|list/);
});

test('the page Environments has no list of relationships, where the page Applications has one', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  await page.go('map');
  assert.match(page.sandbox.renderMapPerspectiveHtml().left, /map-link-toggle/, 'the page Applications has the list');
  await page.go('environments');
  assert.doesNotMatch(page.sandbox.renderMapPerspectiveHtml().left, /map-link-toggle|Relationships/);
});

test('a ticked row has its checkbox ticked and the summary counts the entries, with a live region that says so', async () => {
  const page = await mapPage('baseline');
  const e = entry('shop.web', 'shop.mailer', 'sends mails with');
  click(page.sandbox, { 'data-action': 'map-link-toggle', 'data-key': keyOf(page, e) });
  await page.drawn();
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), [e]);
  const html = left(page);
  const rows = rowsOf(html);
  assert.deepEqual(
    rows.filter((r) => r.checked).map((r) => r.key),
    [keyOf(page, e)]
  );
  assert.match(textOf(html.slice(html.indexOf('Relationships'))), /1 ticked/);
  assert.match(html, /aria-live="polite"[^>]*>[^<]*1 relationship(?:s)? ticked/);
  assert.ok(html.includes('1 relationship ticked'), 'the live region says 1 relationship ticked');
  assert.match(html, /data-action="map-links-clear"/, 'Clear is in the summary');
});

test('the filter keeps the rows whose source, destination, kind or text matches, without regard to case', async () => {
  const page = await mapPage('baseline');
  const filtered = (text) => {
    run(page.sandbox, 'mapLinksFilter = ' + JSON.stringify(text) + ';');
    return rowsOf(left(page)).map((r) => r.text.replace(/\s+/g, ' '));
  };
  assert.equal(filtered('WAREHOUSE').length, 1, 'by source');
  assert.equal(filtered('shop.inventory').length, 1, 'by destination');
  assert.equal(filtered('catalog').length, 1);
  assert.equal(filtered('MAILS').length, 1, 'by text');
  assert.equal(filtered('orders on').length, 1);
  assert.equal(filtered('person').length, 1, 'by the kind of an end');
  assert.equal(filtered('container').length, 3);
  assert.equal(filtered('no such thing').length, 0);
  assert.match(textOf(left(page)), /No relationship matches|Nothing matches/i);
  assert.equal(filtered('').length, 4, 'an empty filter keeps them all');
});

test('the select of kinds lists the kinds that exist among the ends, any kind first, and narrows the rows to a kind of either end', async () => {
  const page = await mapPage('baseline');
  const html = left(page);
  const select = /<select[^>]*id="map-links-kind"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  assert.ok(select, 'a select of kinds');
  const options = Array.from(select[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)</g), (m) => [m[1], m[2]]);
  assert.deepEqual(options[0], ['', 'Any kind']);
  assert.deepEqual(
    options
      .slice(1)
      .map((o) => o[0])
      .sort(),
    ['container', 'person']
  );
  run(page.sandbox, "mapLinksKind = 'person';");
  assert.equal(rowsOf(left(page)).length, 1);
  run(page.sandbox, "mapLinksKind = 'container';");
  assert.equal(rowsOf(left(page)).length, 4, 'a kind of either end');
});

test('Ticked only shows the ticked rows and the ones the plateau lacks, and nothing else', async () => {
  const page = await mapPage('baseline');
  const a = entry('customer', 'shop.web', 'orders on');
  const gone = entry('shop.web', 'shop.nowhere', 'reads');
  run(page.sandbox, 'mapLinks = ' + JSON.stringify([a, gone]) + '; mapLinksTickedOnly = true;');
  const rows = rowsOf(left(page));
  assert.deepEqual(rows.map((r) => r.key).sort(), [keyOf(page, a), keyOf(page, gone)].sort());
  run(page.sandbox, 'mapLinksTickedOnly = false;');
  assert.equal(rowsOf(left(page)).length, 5);
});

test('a ticked entry that names no relationship of the model drawn stays in the list, told, and can be unticked', async () => {
  const page = await mapPage('to-be');
  const lacking = entry('shop.web', 'shop.mailer', 'sends mails with'); // the baseline has it, the to-be removes it
  run(page.sandbox, 'mapLinks = ' + JSON.stringify([lacking]) + ';');
  const row = rowsOf(left(page)).find((r) => r.key === keyOf(page, lacking));
  assert.ok(row, 'the entry is still a row');
  assert.ok(row.checked);
  assert.match(row.text, /not in this plateau/);
  click(page.sandbox, { 'data-action': 'map-link-toggle', 'data-key': keyOf(page, lacking) });
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), [], 'unticked, so the choice is empty again');
  assert.equal(
    rowsOf(left(page)).find((r) => r.key === keyOf(page, lacking)),
    undefined,
    'and it is no row any more'
  );
});

test('with a comparison on, the list holds the relationships of the union, a removed one included', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  page.sandbox.drawPlateau('to-be', { compare: 'past' });
  await page.go('map');
  const keys = rowsOf(left(page)).map((r) => r.key);
  assert.ok(
    keys.includes(keyOf(page, entry('shop.web', 'shop.mailer', 'sends mails with'))),
    'removed by the to-be, still listed'
  );
  assert.ok(keys.includes(keyOf(page, entry('shop.web', 'shop.payments', 'pays with'))), 'new in the to-be');
});

test('at most 200 rows are drawn and the rest is told', async () => {
  const labels = Array.from(
    { length: 250 },
    (_, i) => '    - destination: "shop.web"\n      label: "call ' + String(i).padStart(3, '0') + '"\n'
  ).join('');
  const many =
    'header:\n  kind: "archicode.morin.io/person"\n  version: "1"\ncontent:\n  id: "many"\n  name: "Many"\n  relationships:\n' +
    labels;
  const page = await mapPage('baseline', { 'plateaus/baseline/many.yaml': many });
  const html = left(page);
  assert.equal(rowsOf(html).length, 200);
  assert.match(textOf(html), /200 of 254 shown: type to narrow/);
  run(page.sandbox, "mapLinksFilter = 'call 249';");
  assert.equal(rowsOf(left(page)).length, 1, 'the filter reaches a row past the cap');
});

test('the controls have accessible names: the filter, the select, the rows and the clear button', async () => {
  const page = await mapPage('baseline');
  run(page.sandbox, 'mapLinks = [' + JSON.stringify(entry('customer', 'shop.web', 'orders on')) + '];');
  const html = left(page);
  assert.match(
    html,
    /<input[^>]*id="map-links-filter"[^>]*aria-label="[^"]+"|<input[^>]*aria-label="[^"]+"[^>]*id="map-links-filter"/
  );
  assert.match(
    html,
    /<select[^>]*id="map-links-kind"[^>]*aria-label="[^"]+"|<select[^>]*aria-label="[^"]+"[^>]*id="map-links-kind"/
  );
  for (const row of rowsOf(html))
    assert.match(row.html, /<input[^>]*aria-label="[^"]*\S[^"]*"/, 'the checkbox of ' + row.text + ' has a name');
  assert.match(rowsOf(html)[0].html, /aria-label="[^"]*customer[^"]*shop\.web/);
  assert.match(html, /map-links-clear[^>]*>[^<]*Clear|aria-label="Clear/);
});

test('a label with a quote, an ampersand, a bracket and an angle bracket is escaped in the key of its row and found again', async () => {
  const label = 'say "hi" & <b>[x]</b>';
  const quoter =
    'header:\n  kind: "archicode.morin.io/person"\n  version: "1"\ncontent:\n  id: "quoter"\n  name: "Quoter"\n  relationships:\n    - destination: "shop.web"\n      label: ' +
    JSON.stringify(label) +
    '\n';
  const page = await mapPage('baseline', { 'plateaus/baseline/quoter.yaml': quoter });
  const html = left(page);
  assert.doesNotMatch(html, /<b>\[x\]/, 'the label is text, not markup');
  const e = entry('quoter', 'shop.web', label);
  const row = rowsOf(html).find((r) => r.key === keyOf(page, e));
  assert.ok(row, 'the key of the row, once unescaped, is the key of the entry');
  assert.match(row.html, /data-key="[^"]*\\&quot;hi\\&quot;[^"]*"/);
  click(page.sandbox, { 'data-action': 'map-link-toggle', 'data-key': keyOf(page, e) });
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), [e]);
});

test('Clear gives the whole map back, and the filter and the open state stay as they were', async () => {
  const page = await mapPage('baseline');
  run(
    page.sandbox,
    'mapLinks = [' +
      JSON.stringify(entry('customer', 'shop.web', 'orders on')) +
      "]; mapLinksFilter = 'shop'; mapLinksListOpen = true;"
  );
  click(page.sandbox, { 'data-action': 'map-links-clear' });
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), []);
  assert.equal(run(page.sandbox, 'mapLinksFilter'), 'shop');
  assert.equal(run(page.sandbox, 'mapLinksListOpen'), true);
});
