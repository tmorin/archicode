'use strict';
// The two how-to pages of the manual (wave 030, W-5, run 0215, DEC-6): the ids, the strings, the command lines, the dropped topics and llms.txt.
// It reads src/doc/README.adoc as text, or the file named by MANUAL_HOWTO_PATH (the mutation checks run it on a copy).
// The checks are words and structure, not prose; the output of a command is checked by the run and by the Java tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MANUAL_PATH = process.env.MANUAL_HOWTO_PATH || path.resolve(__dirname, '../../doc/README.adoc');
const LLMS_PATH = process.env.MANUAL_HOWTO_LLMS_PATH || path.resolve(__dirname, '../../site/llms.txt');
const MANUAL = fs.readFileSync(MANUAL_PATH, 'utf8');
const LLMS = fs.readFileSync(LLMS_PATH, 'utf8');
const LINES = MANUAL.split('\n');

const IMAGE = 'ghcr.io/tmorin/archicode';
const DROPPED_TOPICS = ['Diagrams Styling', 'Label Formatting', 'Viewpoint Utilization', 'CI/CD Integration'];

/** The index of the line that defines the explicit id at the start of a line, or -1. */
function lineOfId(id) {
  return LINES.findIndex((line) => line.startsWith(`[[${id}]]`));
}

/** The index of the heading line of the given level (number of =) and title, or -1. */
function lineOfHeading(level, title) {
  return LINES.indexOf(`${'='.repeat(level)} ${title}`);
}

/** The index of the first line after `from` that is a heading of the level or a higher one (fewer =), or the end. */
function endOfSection(from, level) {
  for (let index = from + 1; index < LINES.length; index += 1) {
    const match = /^(=+) /.exec(LINES[index]);
    if (match && match[1].length <= level) return index;
  }
  return LINES.length;
}

/** The lines of a section from its id: the id line to the next heading of the same level or above. Null if absent. */
function section(id, level) {
  const at = lineOfId(id);
  if (at < 0) return null;
  const heading = LINES.findIndex((line, index) => index > at && /^=+ /.test(line));
  const end = endOfSection(heading, level);
  return { start: at, end, text: LINES.slice(at, end).join('\n'), lines: LINES.slice(at, end) };
}

function need(id, level) {
  const found = section(id, level);
  assert.ok(found, `the section [[${id}]] is not defined`);
  return found;
}

const commandsStart = lineOfHeading(2, 'Commands');
const COMMANDS = commandsStart < 0 ? '' : LINES.slice(commandsStart, endOfSection(commandsStart, 2)).join('\n');

/** The archicode command lines of the listings of a section, with their line number: the arguments are the words after `archicode`. */
function commandLines(found) {
  const out = [];
  const lines = found.lines;
  let inListing = false;
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    if (/^-{4,}$/.test(line)) {
      inListing = !inListing;
      continue;
    }
    // Only the listings hold command lines, whatever their language (shell or YAML); the prose is not read.
    if (!inListing || !/(?:^|[\s$])archicode\s|ghcr\.io\/tmorin\/archicode/.test(line)) continue;
    // A command that continues on the next line with a backslash.
    while (line.trimEnd().endsWith('\\') && index + 1 < lines.length) {
      index += 1;
      line = line.trimEnd().slice(0, -1) + ' ' + lines[index].trim();
    }
    line = line.replace(/\s#\s.*$/, '');
    let args;
    const image = line.indexOf(IMAGE);
    if (image >= 0) args = line.slice(image + IMAGE.length).trim();
    else {
      const bin = /(?:^|\s)archicode\s+(.*)$/.exec(line);
      if (!bin) continue;
      args = bin[1].trim();
    }
    out.push({ line: found.start + index + 1, args });
  }
  return out;
}

/** The words of an argument list: the command (one or two words) and the options, `-w FILE` skipped before and after. */
function readCommandLine(args) {
  const words = args.split(/\s+/).filter(Boolean);
  const options = [];
  const commandWords = [];
  let optionAfterCommand = false;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word.startsWith('-')) {
      options.push(word.replace(/=.*$/, ''));
      if (commandWords.length > 0) optionAfterCommand = true;
      // A short option or a long option that takes the next word as its value is not told apart here: a word after
      // an option is a value, not a command word, once the command has been read.
      if (commandWords.length === 0 && (word === '-w' || word === '--workspace')) index += 1;
      else if (commandWords.length > 0 && index + 1 < words.length && !words[index + 1].startsWith('-')) index += 1;
    } else if (commandWords.length < 2 && !/[/.=$"'{}]/.test(word) && !optionAfterCommand) {
      commandWords.push(word);
    }
  }
  return { commandWords, options };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function documented(option) {
  return new RegExp(`(?<![\\w-])${escapeRegExp(option)}(?![\\w-])`).test(COMMANDS);
}

test('the Commands part is found (the test is not vacuous)', () => {
  assert.ok(commandsStart >= 0, 'no == Commands section');
  assert.ok(COMMANDS.includes('--fail-on'), 'the Commands part does not document --fail-on');
});

test('[[howto-ci]] and [[howto-agent]] are == sections of = How-to guides, in that order, before == Best Practices', () => {
  const part = LINES.indexOf('= How-to guides');
  const reference = LINES.indexOf('= Reference');
  const best = lineOfHeading(2, 'Best Practices');
  assert.ok(part >= 0 && best > part && reference > best, 'How-to guides or Best Practices is not found');
  const ci = lineOfId('howto-ci');
  const agent = lineOfId('howto-agent');
  assert.ok(ci >= 0, 'the id howto-ci is not defined');
  assert.ok(agent >= 0, 'the id howto-agent is not defined');
  assert.ok(
    part < ci && ci < agent && agent < best,
    'the order is not How-to guides, howto-ci, howto-agent, Best Practices'
  );
  for (const at of [ci, agent]) {
    assert.match(LINES[at + 1], /^== \S/, `the line after ${LINES[at]} is not a == heading`);
  }
});

test('the CI section names diff --fail-on, archicode query graph and the exit codes 1, 2 and 3', () => {
  const ci = need('howto-ci', 2);
  for (const text of ['diff --fail-on', 'archicode query graph', '<<errors-and-warnings>>']) {
    assert.ok(ci.text.includes(text), `the CI section lacks "${text}"`);
  }
  for (const code of [1, 2, 3]) {
    const asCell = new RegExp(`^\\|\\s*\`?${code}\`?\\s*(?:\\||$)`, 'm');
    const asPhrase = new RegExp(`\\bcodes? \`?${code}\\b`);
    assert.ok(asCell.test(ci.text) || asPhrase.test(ci.text), `the CI section does not give the exit code ${code}`);
  }
});

test('the CI section has the GitHub Actions job on the image', () => {
  const ci = need('howto-ci', 2);
  assert.ok(ci.text.includes(IMAGE), `the CI section does not name ${IMAGE}`);
});

test('the agent section names archicode guide, archicode init, query graph, query schemas manifest and docs/architecture', () => {
  const agent = need('howto-agent', 2);
  for (const text of [
    'archicode guide',
    'archicode init',
    'query graph',
    'query schemas manifest',
    'docs/architecture'
  ]) {
    assert.ok(agent.text.includes(text), `the agent section lacks "${text}"`);
  }
});

for (const [id, level] of [
  ['howto-ci', 2],
  ['howto-agent', 2]
]) {
  test(`every archicode command line of ${id} starts with a command of the Commands part and uses only options it documents`, () => {
    const found = need(id, level);
    const lines = commandLines(found);
    assert.ok(lines.length > 0, `no archicode command line in the listings of ${id}`);
    for (const { line, args } of lines) {
      const { commandWords, options } = readCommandLine(args);
      assert.ok(commandWords.length > 0, `line ${line}: no command in "${args}"`);
      assert.ok(
        COMMANDS.includes(`archicode ${commandWords[0]}`),
        `line ${line}: "${commandWords[0]}" is not a command of the Commands part`
      );
      for (const option of options) {
        assert.ok(documented(option), `line ${line}: the option ${option} is not documented in the Commands part`);
      }
    }
  });
}

test('the CI job runs an archicode command line after the image name', () => {
  const ci = need('howto-ci', 2);
  const afterImage = ci.lines.filter((line) => line.includes(IMAGE) && /\bdocker\b/.test(line));
  assert.ok(afterImage.length > 0, 'no docker run line on the image in the CI section');
  for (const line of afterImage) {
    const args = line.slice(line.indexOf(IMAGE) + IMAGE.length).trim();
    const { commandWords } = readCommandLine(args);
    assert.ok(
      commandWords.length > 0 && COMMANDS.includes(`archicode ${commandWords[0]}`),
      `not an archicode command line: "${args}"`
    );
  }
});

test('the parts Reference and Concepts have the explicit ids reference and concepts on the line before their heading', () => {
  for (const [id, title] of [
    ['reference', 'Reference'],
    ['concepts', 'Concepts']
  ]) {
    const at = lineOfId(id);
    assert.ok(at >= 0, `the id ${id} is not defined at the start of a line`);
    assert.equal(LINES[at + 1], `= ${title}`, `[[${id}]] is not just before = ${title}`);
  }
});

test('Best Practices has no bullet for the dropped topics', () => {
  const best = lineOfHeading(2, 'Best Practices');
  assert.ok(best >= 0, 'no == Best Practices section');
  const end = endOfSection(best, 2);
  const bullets = LINES.slice(best, end).filter((line) => /^- /.test(line));
  for (const topic of DROPPED_TOPICS) {
    assert.deepEqual(
      bullets.filter((line) => line.startsWith(`- ${topic}`)),
      [],
      `a bullet of Best Practices still promises ${topic}`
    );
  }
});

test('llms.txt links docs/#reference, docs/#concepts, docs/#howto-ci and docs/#howto-agent', () => {
  for (const id of ['reference', 'concepts', 'howto-ci', 'howto-agent']) {
    assert.ok(LLMS.includes(`https://tmorin.github.io/archicode/docs/#${id})`), `llms.txt has no link to docs/#${id}`);
  }
});

// Run 0216 (generated command reference): the shape of the section and of its two markers, not the generated content (CommandReferenceTest checks that).
test('[[command-reference]] is a === section that holds the BEGIN marker line and then the END marker line, once each', () => {
  const found = need('command-reference', 3);
  const begin = 'BEGIN generated by CommandReferenceTest, do not edit';
  const end = 'END generated by CommandReferenceTest';
  const beginLines = found.lines
    .map((line, index) => (line === `:command-reference-begin: ${begin}` ? index : -1))
    .filter((index) => index >= 0);
  const endLines = found.lines
    .map((line, index) => (line === `:command-reference-end: ${end}` ? index : -1))
    .filter((index) => index >= 0);
  assert.equal(beginLines.length, 1, 'the BEGIN marker line must be in the section once');
  assert.equal(endLines.length, 1, 'the END marker line must be in the section once');
  assert.ok(beginLines[0] < endLines[0], 'the END marker comes before the BEGIN marker');
  assert.equal(
    MANUAL.split('\n').filter((line) => line.startsWith(':command-reference-')).length,
    2,
    'the manual holds other marker lines'
  );
});
