'use strict';
// Tests of scripts/changes.mjs and of the workflow that uses it (wave 030, run 0211, #192). The groups, each the start of a
// test title in square brackets: [map] the rules on example paths, [decide] the decision of an event, [list] --list,
// [diff] the changed files of a temporary git repository, [outputs] GITHUB_OUTPUT and GITHUB_STEP_SUMMARY, [audit] the map
// against the readers of the four jobs, [workflow] the text of ci-build.yaml, [gate] the shell of the first step of Build.
// Nothing here depends on the number of tracked files or on the number of rules.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const REPO = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(REPO, 'scripts/changes.mjs');
const WORKFLOW = path.join(REPO, '.github/workflows/ci-build.yaml');
const JOBS = ['java', 'page', 'kernel', 'e2e'];
const ALL = [...JOBS].sort().join(',');
const EDITOR_CUT = 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/editor-cut.json';

const loadModule = () => import(pathToFileURL(SCRIPT).href);

/** The jobs of a rule or of a decision, as the sorted list of their names whatever shape the script gives them. */
function jobNames(value) {
  let names;
  if (Array.isArray(value)) names = value;
  else if (value instanceof Set) names = [...value];
  else if (typeof value === 'string') names = value.split(/[\s,]+/);
  else if (value && value.jobs !== undefined) return jobNames(value.jobs);
  else names = JOBS.filter((job) => value && value[job] === true);
  return names.filter((name) => name && name !== 'none').sort();
}

const sorted = (csv) => (csv === 'none' ? [] : csv.split(',').sort());

function run(args, { cwd = REPO, env = {} } = {}) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    cwd,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env }
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

/** A failed run reports its stderr, which names scripts/changes.mjs when the script is missing. */
function assertRan(result, label) {
  assert.equal(result.code, 0, `${label}: exit ${result.code}\n${result.err}`);
}

function decisionOf(out) {
  const decision = {};
  for (const line of out.split('\n')) {
    const match = /^(java|page|kernel|e2e)=(true|false)$/.exec(line);
    if (match) decision[match[1]] = match[2] === 'true';
  }
  return decision;
}

const wanted = (decision) => JOBS.filter((job) => decision[job]).sort();

function git(root, ...args) {
  return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

const tracked = () =>
  execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean)
    .filter((file) => fs.existsSync(path.join(REPO, file)));

// [map] ---------------------------------------------------------------------------------------------------------------

// path, jobs (the sorted names, '' for none); each row of the table of DEC-3 at least once, the five cases of REQ-1 first
const EXAMPLES = [
  ['src/doc/README.adoc', 'java,page'],
  ['src/main/editor/page.html', ALL],
  ['.github/workflows/ci-build.yaml', ALL],
  ['CLAUDE.md', ''],
  ['some-new-folder/x.txt', ALL],
  ['src/main/editor/CLAUDE.md', ''],
  ['README.md', ''],
  ['LICENSE', ''],
  ['.claude/settings.json', ''],
  [EDITOR_CUT, 'page'],
  ['docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md', ''],
  ['docs/run/run-0001-x/prd-0001-x.md', ''],
  ['docs/architecture/.archicode.yaml', 'java,page'],
  ['docs/fixtures/brightcart-spec.md', 'java,page'],
  ['scripts/changes.mjs', ALL],
  ['scripts/build-editor.mjs', 'java,kernel,page'],
  ['src/main/rust/viewpoint-kernel/src/lib.rs', ALL],
  ['src/main/wasm/viewpoint_kernel.wasm', ALL],
  ['src/main/resources/editor-webapp/standalone.html', ALL],
  ['src/main/java/io/morin/archicode/Anything.java', 'e2e,java,page'],
  ['src/test/java/io/morin/archicode/AnythingTest.java', 'java,page'],
  ['pom.xml', 'e2e,java'],
  ['mvnw', 'e2e,java'],
  ['src/main/pmd/ruleset.xml', 'e2e,java'],
  ['src/doc/examples/some-example/.archicode.yaml', 'e2e,java,page'],
  ['src/site/index.html', 'e2e,java,page'],
  ['src/site/robots.txt', 'java,page'],
  ['src/test/e2e/some.spec.js', 'e2e,page'],
  ['playwright.config.js', 'e2e,page'],
  ['package.json', 'e2e,page'],
  ['package-lock.json', 'e2e,page'],
  ['src/test/javascript/viewpoint-kernel/fold-cases.json', 'java,kernel,page'],
  ['src/test/javascript/architecture/impact-questions.json', 'java,kernel,page'],
  ['src/test/javascript/some-thing.test.js', 'page'],
  ['src/test/resources/some/file.yaml', 'e2e,java,page'],
  ['src/test/workspaces/some/file.yaml', 'e2e,java,page'],
  ['eslint.config.mjs', 'page'],
  ['.prettierrc.yaml', 'page']
];

test('[map] the rules are an ordered list that ends with the default, which runs all four', async () => {
  const { JOBS: jobs, RULES } = await loadModule();
  assert.deepEqual([...jobs].sort(), [...JOBS].sort());
  assert.ok(Array.isArray(RULES) && RULES.length > 1, 'RULES is a list');
  const ids = RULES.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length, 'the ids are unique');
  for (const rule of RULES) {
    assert.ok(rule.id && rule.reason, `a rule has an id and a reason: ${JSON.stringify(rule)}`);
    assert.ok(Array.isArray(rule.patterns) && rule.patterns.length > 0, `${rule.id} has patterns`);
    assert.deepEqual(
      jobNames(rule.jobs).filter((job) => !JOBS.includes(job)),
      [],
      `${rule.id} names only known jobs`
    );
  }
  assert.deepEqual(jobNames(RULES.at(-1)), [...JOBS].sort(), 'the last rule is the default and runs all four');
});

test('[map] the example paths run the jobs the table of the design gives them', async () => {
  const { classify } = await loadModule();
  for (const [file, expected] of EXAMPLES) {
    assert.deepEqual(jobNames(classify(file)), expected === '' ? [] : expected.split(',').sort(), `jobs of ${file}`);
  }
});

test('[map] the order of the rules: the specific path comes before the general one', async () => {
  const { classify, RULES } = await loadModule();
  assert.equal(classify('.github/CLAUDE.md').id, 'R-01', 'a CLAUDE.md under .github runs nothing');
  assert.notEqual(classify('.github/workflows/ci-build.yaml').id, 'R-01');
  assert.deepEqual(jobNames(classify('src/site/robots.txt')), ['java', 'page']);
  assert.ok(jobNames(classify('src/site/index.html')).includes('e2e'), 'the home page is served to the e2e suite');
  assert.deepEqual(jobNames(classify('src/test/javascript/viewpoint-kernel/x.js')), ['page']);
  assert.deepEqual(jobNames(classify(EDITOR_CUT)), ['page']);
  assert.deepEqual(jobNames(classify(EDITOR_CUT.replace('editor-cut.json', 'other.json'))), []);
  assert.equal(classify('some-new-folder/x.txt').id, RULES.at(-1).id, 'a path with no rule falls to the default');
});

// [decide] ------------------------------------------------------------------------------------------------------------

test('[decide] a pull request runs the union of the jobs of its files', async () => {
  const { decide } = await loadModule();
  assert.deepEqual(wanted(await decide({ event: 'pull_request', files: ['src/doc/README.adoc', 'CLAUDE.md'] })), [
    'java',
    'page'
  ]);
  assert.deepEqual(wanted(await decide({ event: 'pull_request', files: ['CLAUDE.md', 'README.md'] })), []);
  assert.deepEqual(
    wanted(await decide({ event: 'pull_request', files: ['src/doc/README.adoc', 'src/test/e2e/x.spec.js'] })),
    ['e2e', 'java', 'page']
  );
});

test('[decide] only a pull request is filtered: any other event runs all four', async () => {
  const { decide } = await loadModule();
  for (const event of ['push', 'workflow_dispatch', 'schedule', '', undefined]) {
    assert.deepEqual(wanted(await decide({ event, files: ['CLAUDE.md'] })), [...JOBS].sort(), `event ${event}`);
  }
});

test('[decide] an empty list and a path with no rule run all four, even on a pull request', async () => {
  const { decide } = await loadModule();
  assert.deepEqual(wanted(await decide({ event: 'pull_request', files: [] })), [...JOBS].sort());
  assert.deepEqual(
    wanted(await decide({ event: 'pull_request', files: ['CLAUDE.md', 'some-new-folder/x.txt'] })),
    [...JOBS].sort()
  );
});

// [list] --------------------------------------------------------------------------------------------------------------

test('[list] --list prints a line per tracked path with its rule and jobs, and a count per rule on stderr', async () => {
  const { RULES } = await loadModule();
  const result = run(['--list']);
  assertRan(result, '--list');
  const lines = result.out.split('\n').filter(Boolean);
  const files = tracked();
  assert.equal(lines.length, files.length, 'one line per tracked path');
  const ids = new Set(RULES.map((rule) => rule.id));
  const used = new Set();
  lines.forEach((line, index) => {
    const fields = line.split('\t');
    assert.equal(fields.length, 3, `three fields: ${line}`);
    assert.equal(fields[0], files[index], 'in the order of git ls-files');
    assert.ok(ids.has(fields[1]), `${fields[1]} is a rule of RULES`);
    assert.ok(
      sorted(fields[2]).every((job) => JOBS.includes(job)),
      `jobs of ${line}`
    );
    used.add(fields[1]);
  });
  for (const id of used) assert.ok(result.err.includes(id), `stderr counts the rule ${id}`);
});

test('[list] the jobs of a line are those of classify, and the default is the last rule', async () => {
  const { RULES, classify } = await loadModule();
  const result = run(['--list']);
  assertRan(result, '--list');
  const last = RULES.at(-1);
  for (const line of result.out.split('\n').filter(Boolean)) {
    const [file, id, jobs] = line.split('\t');
    assert.deepEqual(sorted(jobs), jobNames(classify(file)), `jobs of ${file}`);
    assert.equal(id, classify(file).id, `rule of ${file}`);
    if (id === last.id) assert.deepEqual(sorted(jobs), [...JOBS].sort(), 'the default runs all four');
  }
});

// [diff] --------------------------------------------------------------------------------------------------------------

/** A repository with a base commit, a main that moved on by a Java file, and a branch cut before that move. */
function makeRepository(branch) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'changes-map-'));
  git(root, 'init', '-q', '-b', 'main');
  write(root, 'src/main/editor/page.html', '<html></html>\n');
  write(root, 'src/test/e2e/some.spec.js', 'x\n');
  write(root, 'docs/wav/wav-001-x/note.md', 'one\n');
  write(root, 'CLAUDE.md', 'notes\n');
  write(root, 'README.md', 'readme\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'base');
  git(root, 'checkout', '-q', '-b', 'branch');
  branch(root);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'branch');
  git(root, 'checkout', '-q', 'main');
  write(root, 'src/main/java/A.java', 'class A {}\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'main moves on');
  return root;
}

const decideIn = (root, base = 'main', head = 'branch') =>
  run(['--event', 'pull_request', '--base', base, '--head', head], { cwd: root });

test('[diff] a rename out of the editor sources into docs/wav classifies both sides', () => {
  const root = makeRepository((dir) => {
    fs.renameSync(path.join(dir, 'src/main/editor/page.html'), path.join(dir, 'docs/wav/wav-001-x/page.html'));
  });
  const result = decideIn(root);
  assertRan(result, 'rename');
  assert.deepEqual(wanted(decisionOf(result.out)), [...JOBS].sort(), 'the old side is a change to the page');
});

test('[diff] a modification and a deletion are the union of their jobs, and the base that moved on is not counted', () => {
  const root = makeRepository((dir) => {
    write(dir, 'docs/wav/wav-001-x/note.md', 'two\n');
    fs.rmSync(path.join(dir, 'src/test/e2e/some.spec.js'));
  });
  const result = decideIn(root);
  assertRan(result, 'modification and deletion');
  assert.deepEqual(wanted(decisionOf(result.out)), ['e2e', 'page'], 'java is not asked: three dots');
});

test('[diff] a branch that touches only notes runs nothing, and says four false', () => {
  const root = makeRepository((dir) => {
    write(dir, 'docs/wav/wav-001-x/note.md', 'two\n');
    write(dir, 'CLAUDE.md', 'other notes\n');
  });
  const result = decideIn(root);
  assertRan(result, 'notes');
  assert.deepEqual(decisionOf(result.out), { java: false, page: false, kernel: false, e2e: false });
});

test('[diff] a diff that fails or is empty runs all four with exit 0', () => {
  const root = makeRepository((dir) => write(dir, 'docs/wav/wav-001-x/note.md', 'two\n'));
  const failed = decideIn(root, '0000000000000000000000000000000000000000');
  assertRan(failed, 'unknown base');
  assert.deepEqual(wanted(decisionOf(failed.out)), [...JOBS].sort());
  const empty = decideIn(root, 'main', 'main');
  assertRan(empty, 'same commit');
  assert.deepEqual(wanted(decisionOf(empty.out)), [...JOBS].sort());
});

test('[diff] a push, a tag and a dispatch run all four whatever the diff', () => {
  const root = makeRepository((dir) => write(dir, 'CLAUDE.md', 'other notes\n'));
  for (const event of ['push', 'workflow_dispatch']) {
    const result = run(['--event', event, '--base', 'main', '--head', 'branch'], { cwd: root });
    assertRan(result, event);
    assert.deepEqual(wanted(decisionOf(result.out)), [...JOBS].sort(), event);
  }
  const noRefs = run(['--event', 'push'], { cwd: root });
  assertRan(noRefs, 'push without refs');
  assert.deepEqual(wanted(decisionOf(noRefs.out)), [...JOBS].sort());
});

test('[diff] a mistake in the arguments exits 2 with one line on stderr', () => {
  const cases = [[], ['--event'], ['--event', 'pull_request'], ['--event', 'pull_request', '--base', 'a'], ['--nope']];
  for (const args of cases) {
    const result = run(args);
    assert.equal(result.code, 2, `arguments ${JSON.stringify(args)}: exit ${result.code}\n${result.err}`);
    assert.equal(result.err.trim().split('\n').length, 1, `one line on stderr for ${JSON.stringify(args)}`);
  }
});

// [outputs] -----------------------------------------------------------------------------------------------------------

function runWithFiles(files, event = 'pull_request') {
  const root = makeRepository((dir) => {
    for (const file of files) write(dir, file, 'changed\n');
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changes-map-out-'));
  const output = path.join(dir, 'output');
  const summary = path.join(dir, 'summary');
  fs.writeFileSync(output, 'before=1\n');
  fs.writeFileSync(summary, '');
  const result = run(['--event', event, '--base', 'main', '--head', 'branch'], {
    cwd: root,
    env: { GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary }
  });
  assertRan(result, 'with GITHUB_OUTPUT');
  return { result, output: fs.readFileSync(output, 'utf8'), summary: fs.readFileSync(summary, 'utf8') };
}

test('[outputs] GITHUB_OUTPUT receives four name=value lines, appended, the same as stdout', () => {
  const { result, output } = runWithFiles(['src/doc/README.adoc']);
  const lines = output.split('\n').filter(Boolean);
  assert.equal(lines[0], 'before=1', 'appended, not overwritten');
  assert.deepEqual(lines.slice(1), ['java=true', 'page=true', 'kernel=false', 'e2e=false']);
  assert.deepEqual(decisionOf(result.out), { java: true, page: true, kernel: false, e2e: false });
});

test('[outputs] the summary names the skipped jobs, the rule that raised a job and a path of it', () => {
  const { summary } = runWithFiles(['src/doc/README.adoc']);
  const rows = summary.split('\n').filter((line) => line.startsWith('|'));
  const rowOf = (job) => rows.find((row) => row.toLowerCase().includes(job));
  assert.ok(rowOf('kernel') && rowOf('e2e'), `a row per job:\n${summary}`);
  for (const job of ['kernel', 'e2e']) assert.match(rowOf(job), /no changed file needs it/, job);
  assert.match(rowOf('java'), /R-12/, 'the rule that raised java');
  assert.ok(rowOf('java').includes('src/doc/README.adoc'), 'an example path');
  assert.doesNotMatch(rowOf('java'), /no changed file needs it/);
});

test('[outputs] a path with a pipe is escaped, and a path with no rule is listed', () => {
  const { summary } = runWithFiles(['odd|name.txt']);
  assert.ok(summary.includes('odd\\|name.txt'), `the pipe is escaped:\n${summary}`);
  assert.ok(!/[^\\]odd\|name\.txt/.test(summary), 'no unescaped pipe in a name');
});

test('[outputs] a push says that everything runs', () => {
  const { output, summary } = runWithFiles(['CLAUDE.md'], 'push');
  assert.deepEqual(output.split('\n').filter(Boolean).slice(1), ['java=true', 'page=true', 'kernel=true', 'e2e=true']);
  assert.match(summary, /everything runs/i);
});

// [audit] -------------------------------------------------------------------------------------------------------------
// The files the four jobs are known to read, found by regular expressions over the sources of the checks; the helpers are
// here and not in the script (DEC-10). What a pattern cannot resolve is skipped. A tracked file must run the job; a
// tracked folder is satisfied only when every tracked file under it runs the job.

const read = (file) => fs.readFileSync(path.join(REPO, file), 'utf8');
const under = (files, glob) => files.filter((file) => glob.test(file));

function resolveLiteral(base, literal) {
  if (/[${}*%]/.test(literal)) return null;
  const resolved = path.posix.normalize(path.posix.join(base, literal)).replace(/\/+$/, '');
  return resolved === '.' || resolved === '' || resolved.startsWith('..') ? null : resolved;
}

/** The tracked files a path stands for: the file itself, or those under the folder; empty when it is not tracked. */
function filesOf(files, resolved) {
  if (files.includes(resolved)) return [resolved];
  // a CLAUDE.md under a folder is not a file a test reads (ASM-4, the notes for agents): a walk does not need it to run
  return files.filter((file) => file.startsWith(`${resolved}/`) && path.posix.basename(file) !== 'CLAUDE.md');
}

/** The findings of one reader: `<job>: <reader> reads <path> (<file> does not run it)`. */
function check(findings, files, jobsOf, job, reader, resolved, { onlyFile = false } = {}) {
  if (!resolved || (onlyFile && !files.includes(resolved))) return;
  // a top-level folder (`src`) is a base that a test walks and filters, not a file it reads: skipped as not resolvable
  if (!files.includes(resolved) && !resolved.includes('/')) return;
  for (const file of filesOf(files, resolved)) {
    if (!jobsOf(file).includes(job)) findings.push(`${job}: ${reader} reads ${resolved} (${file} does not run ${job})`);
  }
}

const quoted = String.raw`(?:'[^']*'|"[^"]*"|\x60[^\x60$]*\x60)`;
const unquote = (text) => text.slice(1, -1);

function audit(files, jobsOf) {
  const findings = [];
  // A1: include_str! and include_bytes! of the kernel, against the folder of the Rust file
  for (const reader of under(files, /^src\/main\/rust\/.*\.rs$/)) {
    for (const match of read(reader).matchAll(/include_(?:str|bytes)!\(\s*"([^"]+)"\s*\)/g)) {
      check(findings, files, jobsOf, 'kernel', reader, resolveLiteral(path.posix.dirname(reader), match[1]));
    }
  }
  // A2: literals of the Java tests that start with a folder of the repository, and Path.of / Paths.get of literals
  for (const reader of under(files, /^src\/test\/java\/.*\.java$/)) {
    const source = read(reader);
    for (const match of source.matchAll(/"((?:src|docs|scripts|\.github)\/[^"\\\n]*)"/g)) {
      check(findings, files, jobsOf, 'java', reader, resolveLiteral('', match[1]));
    }
    for (const match of source.matchAll(/Paths?\.(?:of|get)\(\s*("[^"\n]*"(?:\s*,\s*"[^"\n]*")*)\s*[,)]/g)) {
      const parts = match[1].split(',').map((part) => unquote(part.trim()));
      check(findings, files, jobsOf, 'java', reader, resolveLiteral('', parts.join('/')));
    }
  }
  // A3: tags.path of the model, split on ', '; a folder is not read as a whole, only a tracked file counts
  for (const reader of under(files, /^docs\/architecture\/manifests\/.*\.ya?ml$/)) {
    for (const match of read(reader).matchAll(/^\s+path:\s*"([^"]+)"/gm)) {
      for (const part of match[1].split(', '))
        check(findings, files, jobsOf, 'java', reader, resolveLiteral('', part), { onlyFile: true });
    }
  }
  // A4: path.resolve and path.join of literals after __dirname, REPO or ROOT, in the node tests (page) and the e2e (e2e)
  const nodeCall = new RegExp(String.raw`path\.(?:resolve|join)\(\s*(__dirname|REPO|ROOT)((?:\s*,\s*${quoted})*)`, 'g');
  const readers = [
    ['page', /^src\/test\/javascript\/.*\.js$/],
    ['e2e', /^src\/test\/e2e\/.*\.js$/]
  ];
  for (const [job, glob] of readers) {
    for (const reader of under(files, glob)) {
      for (const match of read(reader).matchAll(nodeCall)) {
        const literals = [...match[2].matchAll(new RegExp(quoted, 'g'))].map((part) => unquote(part[0]));
        if (literals.length === 0) continue;
        const base = match[1] === '__dirname' ? path.posix.dirname(reader) : '';
        check(findings, files, jobsOf, job, reader, resolveLiteral(base, literals.join('/')));
      }
    }
  }
  return findings;
}

test('[audit] the map runs every job whose reader the repository names (A1 to A4)', async () => {
  const { classify } = await loadModule();
  const files = tracked();
  const findings = audit(files, (file) => jobNames(classify(file)));
  assert.deepEqual(findings, [], `a job does not run for a file it reads:\n${findings.join('\n')}`);
});

test('[audit] a map that runs no kernel for the shared cases fails, naming the Rust file and the path', async () => {
  const { classify } = await loadModule();
  const files = tracked();
  const sabotaged = (file) => {
    const jobs = jobNames(classify(file));
    return /^src\/test\/javascript\/viewpoint-kernel\/.*\.json$/.test(file)
      ? jobs.filter((job) => job !== 'kernel')
      : jobs;
  };
  const findings = audit(files, sabotaged);
  assert.ok(
    findings.some((line) => line.startsWith('kernel:') && /\.rs reads /.test(line) && /-cases\.json/.test(line)),
    `the audit names the Rust file and the path:\n${findings.join('\n')}`
  );
});

test('[audit] the readers find something to check (the audit is not empty by accident)', () => {
  const files = tracked();
  const none = () => [];
  const findings = audit(files, none);
  for (const job of ['kernel', 'java', 'page', 'e2e']) {
    assert.ok(
      findings.some((line) => line.startsWith(`${job}:`)),
      `a reader of ${job} is found`
    );
  }
});

// [workflow] ----------------------------------------------------------------------------------------------------------

const workflow = () => fs.readFileSync(WORKFLOW, 'utf8');

/** The text of a job, from its key at two spaces to the next job key. */
function jobBlock(text, name) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line === `  ${name}:`);
  assert.ok(start >= 0, `the workflow has a job ${name}`);
  let end = lines.findIndex((line, index) => index > start && /^ {2}[A-Za-z][A-Za-z0-9_-]*:\s*$/.test(line));
  if (end < 0) end = lines.length;
  return lines.slice(start, end).join('\n');
}

const needsOf = (block) => {
  const match = /^ {4}needs:\s*(.*)$/m.exec(block);
  assert.ok(match, 'the job has a needs');
  if (match[1].trim())
    return match[1]
      .replace(/[[\]]/g, '')
      .split(',')
      .map((name) => name.trim());
  return [...block.slice(match.index + match[0].length).matchAll(/^ {6}- (\S+)/gm)].map((item) => item[1]);
};

test('[workflow] the job Changes runs the script on the event and the two shas, with contents: read only', () => {
  const block = jobBlock(workflow(), 'Changes');
  assert.match(block, /if: \$\{\{ github\.event_name != 'workflow_dispatch' \}\}/);
  assert.match(block, /permissions:\n\s+contents: read\n/);
  assert.ok(!/contents: write|packages: write/.test(block), 'no write scope');
  for (const job of JOBS) assert.ok(block.includes(`${job}: \${{ steps.`), `an output ${job}`);
  assert.match(block, /node scripts\/changes\.mjs --event "\$EVENT" --base "\$BASE_SHA" --head "\$HEAD_SHA"/);
  assert.ok(block.includes('github.event.pull_request.base.sha'), 'the base sha');
  assert.ok(block.includes('github.event.pull_request.head.sha'), 'the head sha');
});

test('[workflow] the checkout of Changes is deep on a pull request, written with strings (an Actions 0 is falsy)', () => {
  const block = jobBlock(workflow(), 'Changes');
  assert.ok(
    block.includes("fetch-depth: ${{ github.event_name == 'pull_request' && '0' || '1' }}"),
    'the exact fetch-depth expression, with quoted strings'
  );
  assert.ok(!block.includes('&& 0 || 1'), 'the unquoted form always yields 1');
});

test('[workflow] each of the four jobs needs Changes and runs on its output and not on a dispatch', () => {
  const text = workflow();
  for (const [job, name] of [
    ['java', 'Java'],
    ['page', 'Page'],
    ['kernel', 'Kernel'],
    ['e2e', 'E2E']
  ]) {
    const block = jobBlock(text, name);
    assert.ok(needsOf(block).includes('Changes'), `${name} needs Changes`);
    const condition = /^ {4}if: (.*)$/m.exec(block);
    assert.ok(condition, `${name} has an if`);
    assert.ok(condition[1].includes(`needs.Changes.outputs.${job} == 'true'`), `${name} reads its output`);
    assert.ok(condition[1].includes("github.event_name != 'workflow_dispatch'"), `${name} keeps the dispatch test`);
  }
});

test('[workflow] Build needs Changes and the four jobs, and still runs unless cancelled', () => {
  const block = jobBlock(workflow(), 'Build');
  assert.deepEqual(needsOf(block).sort(), ['Changes', 'E2E', 'Java', 'Kernel', 'Page']);
  assert.match(block, /^ {4}if: \$\{\{ !cancelled\(\) && github\.event_name != 'workflow_dispatch' \}\}$/m);
});

// [gate] --------------------------------------------------------------------------------------------------------------

const NAMES = [
  'CHANGES',
  'JAVA_WANTED',
  'JAVA_RESULT',
  'PAGE_WANTED',
  'PAGE_RESULT',
  'KERNEL_WANTED',
  'KERNEL_RESULT',
  'E2E_WANTED',
  'E2E_RESULT'
];

/** The first step of Build: its env lines and the body of its first `run: |`. */
function gateStep() {
  const block = jobBlock(workflow(), 'Build');
  const lines = block.split('\n');
  const steps = lines.findIndex((line) => line === '    steps:');
  assert.ok(steps >= 0, 'Build has steps');
  const first = lines.slice(steps + 1);
  const next = first.findIndex((line, index) => index > 0 && /^ {6}- /.test(line));
  const step = first.slice(0, next < 0 ? first.length : next);
  const runAt = step.findIndex((line) => /^ {8}run: \|\s*$/.test(line));
  assert.ok(runAt >= 0, 'the first step of Build has a run: | block');
  const body = [];
  for (const line of step.slice(runAt + 1)) {
    if (line.trim() !== '' && !line.startsWith(' '.repeat(10))) break;
    body.push(line.slice(10));
  }
  return { env: step.slice(0, runAt).join('\n'), script: `${body.join('\n')}\n` };
}

const BASE = {
  CHANGES: 'success',
  JAVA_WANTED: 'true',
  JAVA_RESULT: 'success',
  PAGE_WANTED: 'true',
  PAGE_RESULT: 'success',
  KERNEL_WANTED: 'true',
  KERNEL_RESULT: 'success',
  E2E_WANTED: 'true',
  E2E_RESULT: 'success'
};

function runGate(values) {
  const env = { PATH: process.env.PATH, ...Object.fromEntries(NAMES.map((name) => [name, values[name] ?? ''])) };
  const result = spawnSync('bash', ['-e', '-c', gateStep().script], { encoding: 'utf8', env });
  return { code: result.status, text: `${result.stdout}${result.stderr}` };
}

const errorLines = (text) => text.split('\n').filter((line) => line.startsWith('::error::'));

test('[gate] the first step of Build reads the nine names from the outputs and the results of the needs', () => {
  const { env } = gateStep();
  assert.ok(/CHANGES: \$\{\{ needs\.Changes\.result \}\}/.test(env), 'CHANGES');
  for (const [job, name] of [
    ['java', 'Java'],
    ['page', 'Page'],
    ['kernel', 'Kernel'],
    ['e2e', 'E2E']
  ]) {
    const prefix = job.toUpperCase();
    assert.ok(env.includes(`${prefix}_WANTED: \${{ needs.Changes.outputs.${job} }}`), `${prefix}_WANTED`);
    assert.ok(env.includes(`${prefix}_RESULT: \${{ needs.${name}.result }}`), `${prefix}_RESULT`);
  }
  assert.deepEqual(
    [...env.matchAll(/^ {10}([A-Z0-9_]+):/gm)].map((match) => match[1]).sort(),
    [...NAMES].sort(),
    'exactly the nine names'
  );
});

test('[gate] everything asked and succeeded passes, and so does a mix of ran and skipped by the filter', () => {
  const all = runGate(BASE);
  assert.equal(all.code, 0, all.text);
  assert.deepEqual(errorLines(all.text), []);
  const mixed = runGate({
    ...BASE,
    PAGE_WANTED: 'false',
    PAGE_RESULT: 'skipped',
    KERNEL_WANTED: 'false',
    KERNEL_RESULT: 'skipped'
  });
  assert.equal(mixed.code, 0, mixed.text);
  const none = runGate(
    Object.fromEntries(
      NAMES.map((name) => [name, name === 'CHANGES' ? 'success' : name.endsWith('WANTED') ? 'false' : 'skipped'])
    )
  );
  assert.equal(none.code, 0, none.text);
});

test('[gate] each job alone: a pair other than true/success or false/skipped fails, naming the job', () => {
  for (const [job, name] of [
    ['JAVA', 'Java'],
    ['PAGE', 'Page'],
    ['KERNEL', 'Kernel'],
    ['E2E', 'E2E']
  ]) {
    for (const [wantedValue, result] of [
      ['true', 'success'],
      ['false', 'skipped']
    ]) {
      const ok = runGate({ ...BASE, [`${job}_WANTED`]: wantedValue, [`${job}_RESULT`]: result });
      assert.equal(ok.code, 0, `${name} ${wantedValue}/${result}\n${ok.text}`);
    }
    for (const [wantedValue, result] of [
      ['true', 'skipped'],
      ['true', 'failure'],
      ['true', 'cancelled'],
      ['false', 'success'],
      ['false', 'failure'],
      ['', 'skipped'],
      ['', 'success']
    ]) {
      const bad = runGate({ ...BASE, [`${job}_WANTED`]: wantedValue, [`${job}_RESULT`]: result });
      assert.notEqual(bad.code, 0, `${name} ${wantedValue || 'empty'}/${result} must fail\n${bad.text}`);
      assert.ok(
        errorLines(bad.text).some((line) => line.includes(name)),
        `${name} ${wantedValue || 'empty'}/${result}: an ::error:: line names the job\n${bad.text}`
      );
    }
  }
});

test('[gate] a failed Changes fails the gate, whatever the four say', () => {
  const alone = runGate({ ...BASE, CHANGES: 'failure' });
  assert.notEqual(alone.code, 0, alone.text);
  assert.ok(
    errorLines(alone.text).some((line) => line.includes('Changes')),
    alone.text
  );
  const skipped = runGate({
    CHANGES: 'failure',
    JAVA_RESULT: 'skipped',
    PAGE_RESULT: 'skipped',
    KERNEL_RESULT: 'skipped',
    E2E_RESULT: 'skipped'
  });
  assert.notEqual(skipped.code, 0, 'the four skipped with empty outputs: a skipped job cannot pass the gate');
  assert.notEqual(runGate({ ...BASE, CHANGES: 'cancelled' }).code, 0);
  assert.notEqual(runGate({ ...BASE, CHANGES: '' }).code, 0);
});

test('[gate] several wrong jobs are all named, and the right ones are not', () => {
  const result = runGate({
    ...BASE,
    JAVA_WANTED: 'false',
    JAVA_RESULT: 'skipped',
    PAGE_RESULT: 'failure',
    KERNEL_WANTED: 'false',
    KERNEL_RESULT: 'skipped',
    E2E_RESULT: 'skipped'
  });
  assert.notEqual(result.code, 0, result.text);
  const lines = errorLines(result.text);
  assert.ok(
    lines.some((line) => line.includes('Page')),
    'Page is named'
  );
  assert.ok(
    lines.some((line) => line.includes('E2E')),
    'E2E is named'
  );
  assert.ok(!lines.some((line) => line.includes('Java') || line.includes('Kernel')), 'Java and Kernel are fine');
});
