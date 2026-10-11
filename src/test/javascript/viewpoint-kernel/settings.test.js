'use strict';
// The facets of the settings, as the editor reads and writes them (the Diagram perspective draws through them).
const test = require('node:test');
const assert = require('node:assert/strict');
const { openFixture } = require('./harness');

test('the actions of a facet are read with their JSON path, and written back under the name the CLI documents', async () => {
  const { sandbox, state } = await openFixture();
  const facet = state.workspace.settings.facets.customs.find((f) => f.name === 'rest-only');
  assert.equal(facet.actions.length, 2);
  assert.equal(facet.actions[0].jsonPath, "$.application..relationships[?(@.qualifiers noneof ['REST'])]");
  assert.equal(facet.actions[0].operator, 'REMOVE');
  assert.ok(!('json-path' in facet.actions[0]), 'one spelling only inside the editor');

  const raw = sandbox.serializeSettingsToRaw(state.workspace.settings);
  const written = raw.facets.customs.find((f) => f.name === 'rest-only');
  assert.equal(written.actions[0]['json-path'], facet.actions[0].jsonPath);
  assert.ok(!('jsonPath' in written.actions[0]));
});
