// ESLint finds bugs; Prettier owns the style (wave 023, run 0169, #160 step 4). No rule here is about layout, quotes or
// semicolons. Run it with `npm run lint`, which first extracts the inline scripts of the editor page
// (scripts/extract-editor-script.mjs) into target/eslint-editor/, where the copies keep the line numbers of the HTML.
//
// Every finding is fixed, none is baselined (decision T8). A rule that is off is a decision (T9): it is written in
// RULES_OFF_IN_THE_PAGE below with its count and the reason, and the run document of 0169 lists it.
//
// The rules are those ESLint calls recommended (undefined names, duplicate keys, unreachable code, empty blocks,
// useless escapes, ...), plus no-shadow and eqeqeq. `no-unused-vars` does not look at function arguments (a callback
// that ignores its first argument is not a bug) nor at the name caught by a `catch (e)`.

import js from '@eslint/js';
import globals from 'globals';

// Rules that find bugs. Each one reports nothing on the tree as committed.
const rules = {
  ...js.configs.recommended.rules, // the bugs ESLint itself lists: undefined names, duplicate keys, unreachable code...
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
  'no-shadow': 'error',
  eqeqeq: ['error', 'always']
};

// Rules deliberately off, with the reason (T9). The only place a finding may stay.
const RULES_OFF_IN_THE_PAGE = {
  // 16 findings in the editor script: the save and the YAML reader match control characters on purpose (the marks
  // \u0001 to \u0007 that stand in for a comment or a collection while a line is rewritten, the \u0000-\u001f class that
  // decides whether a scalar needs quotes, the NUL a change key is joined with). Rewriting them as code points would
  // change the bytes the editor writes; the node suite and the comparison with the released page guard these lines.
  'no-control-regex': 'off'
};

const base = rules;
const page = { ...rules, ...RULES_OFF_IN_THE_PAGE };

export default [
  { ignores: ['node_modules/**'] },
  {
    // the unit and integration tests: CommonJS run by node --test
    files: ['src/test/javascript/**/*.js'],
    languageOptions: { sourceType: 'commonjs', ecmaVersion: 'latest', globals: { ...globals.node } },
    rules: base
  },
  {
    // the end-to-end suite and its config: CommonJS run by Playwright's test runner. The browser globals are for the
    // few callbacks a test hands to the page (page.evaluate); the code of the test itself runs in Node.
    files: ['src/test/e2e/**/*.js', 'playwright.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
      globals: { ...globals.node, ...globals.browser }
    },
    rules: base
  },
  {
    // the generators of the fixtures: ES modules
    files: ['src/test/resources/**/*.mjs'],
    languageOptions: { sourceType: 'module', ecmaVersion: 'latest', globals: { ...globals.node } },
    rules: base
  },
  {
    // the inline scripts of the editor page, extracted: classic browser scripts
    files: ['target/eslint-editor/*.js'],
    languageOptions: { sourceType: 'script', ecmaVersion: 'latest', globals: { ...globals.browser } },
    rules: page
  },
  {
    // the CodeMirror loader of the page, an ES module
    files: ['target/eslint-editor/*.mjs'],
    languageOptions: { sourceType: 'module', ecmaVersion: 'latest', globals: { ...globals.browser } },
    rules: page
  },
  {
    // this config and the scripts: ES modules run by node
    files: ['eslint.config.mjs', 'scripts/**/*.mjs'],
    languageOptions: { sourceType: 'module', ecmaVersion: 'latest', globals: { ...globals.node } },
    rules: base
  }
];
