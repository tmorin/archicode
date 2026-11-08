// Which of the four checks of ci-build.yaml a pull request needs, from the files it changes (wave 030, run 0211, #192).
// RULES is the one place that knows which path needs which job: the first rule that matches a path wins, the jobs of a pull
// request are the union over its files, and a path with no rule falls to the last rule, which runs all four.
//
//   node scripts/changes.mjs --event <name> [--base <sha>] [--head <sha>]   decide and publish (exit 0; exit 2 on a mistake)
//   node scripts/changes.mjs --list                                          every tracked path with its rule and its jobs
//
// Only a pull request is filtered; any other event, an empty diff and a failed diff run all four.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const JOBS = ['java', 'page', 'kernel', 'e2e'];

const J = 'java';
const P = 'page';
const K = 'kernel';
const E = 'e2e';

const EDITOR_CUT = 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/editor-cut.json';

export const RULES = [
  {
    id: 'R-01',
    patterns: ['**/CLAUDE.md'],
    jobs: [],
    reason: 'notes for agents; no test reads one; first so .github/CLAUDE.md and src/main/editor/CLAUDE.md run nothing'
  },
  {
    id: 'R-02',
    patterns: ['README.md', 'LICENSE', '.claude/**', '.idea/**', '.vscode/**'],
    jobs: [],
    reason: 'not read by a job'
  },
  { id: 'R-03', patterns: [EDITOR_CUT], jobs: [P], reason: 'check-editor.test.js reads it; before R-04' },
  { id: 'R-04', patterns: ['docs/wav/**', 'docs/run/**'], jobs: [], reason: 'the records of the waves' },
  {
    id: 'R-05',
    patterns: ['docs/architecture/**', 'docs/fixtures/**'],
    jobs: [J, P, E],
    reason:
      'the model and the fixtures are read by Java tests and node tests; the model is bundled into the sample of the page, so into the jar E2E runs'
  },
  {
    id: 'R-06',
    patterns: ['.github/**', 'scripts/changes.mjs'],
    jobs: [J, P, K, E],
    reason: 'the workflow and the map itself'
  },
  {
    id: 'R-07',
    patterns: ['src/main/rust/**', 'src/main/editor/**', 'src/main/resources/**'],
    jobs: [J, P, K, E],
    reason:
      'the Rust is built into the kernel of the jar and the page and tested by the Kernel job, so all four jobs read it'
  },
  {
    id: 'R-08',
    patterns: ['src/main/java/**'],
    jobs: [J, P, E],
    reason: 'the jar is what E2E runs; src/**/*.java is in format:check (Page)'
  },
  {
    id: 'R-09',
    patterns: ['src/test/java/**'],
    jobs: [J, P],
    reason:
      'Java runs the tests; Page checks the format of src/**/*.java; E2E builds the jar with -Dmaven.test.skip, so a test class cannot reach it'
  },
  {
    id: 'R-10',
    patterns: ['pom.xml', 'lombok.config', '.mvn/**', 'mvnw', 'mvnw.cmd', 'src/main/pmd/**'],
    jobs: [J, E],
    reason: 'build of the jar; PMD'
  },
  {
    id: 'R-11',
    patterns: ['src/doc/examples/**'],
    jobs: [J, P, E],
    reason: 'harness.js copies an example per test; Java and node tests load them'
  },
  {
    id: 'R-12',
    patterns: ['src/doc/**'],
    jobs: [J, P],
    reason: 'the manual is built by ./mvnw verify; Java and node tests read README.adoc'
  },
  {
    id: 'R-13',
    patterns: ['src/site/index.html'],
    jobs: [J, P, E],
    reason: 'harness.js serves it as GET / for hosted-acceptance.spec.js'
  },
  {
    id: 'R-14',
    patterns: ['src/site/**'],
    jobs: [J, P],
    reason: 'the rest of the website: robots.txt, sitemap.xml, llms.txt'
  },
  {
    id: 'R-15',
    patterns: ['src/test/e2e/**', 'playwright.config.js'],
    jobs: [P, E],
    reason: 'lint and format (Page), the suite (E2E)'
  },
  {
    id: 'R-16',
    patterns: ['package.json', 'package-lock.json'],
    jobs: [J, P, E],
    reason: 'npm ci in Page and E2E, and in the Maven build of the page (Java, and the jar E2E runs)'
  },
  {
    id: 'R-17a',
    patterns: ['src/test/javascript/viewpoint-kernel/toolbar-controls.json'],
    jobs: [J, P, K, E],
    reason: 'diagram-toolbar.spec.js reads it; before R-17'
  },
  {
    id: 'R-17',
    patterns: ['src/test/javascript/**/*.json'],
    jobs: [J, P, K],
    reason: 'shared cases: Java and the node tests read them; Rust reads three by include_str!'
  },
  {
    id: 'R-17b',
    patterns: [
      'src/test/javascript/viewpoint-kernel/harness.js',
      'src/test/javascript/viewpoint-kernel/editor-files.js'
    ],
    jobs: [J, P, E],
    reason:
      'the Maven build runs them to make the samples of the page (Java, and the jar E2E runs); the node suite (Page)'
  },
  { id: 'R-18', patterns: ['src/test/javascript/**'], jobs: [P], reason: 'the node suite' },
  {
    id: 'R-19',
    patterns: ['src/test/resources/**', 'src/test/workspaces/**'],
    jobs: [J, P, E],
    reason: 'Java and node tests; E2E copies brightcart/layered and replaces-large-pair'
  },
  {
    id: 'R-20',
    patterns: ['scripts/**'],
    jobs: [J, P, E],
    reason:
      'build-editor.mjs and build-sample.mjs are run by the Maven build (Java, and the jar E2E runs) and by the node suite and the lint (Page); a tags.path of the model can name a script (Java)'
  },
  {
    id: 'R-21',
    patterns: ['eslint.config.mjs', '.prettierrc.yaml', '.prettierignore'],
    jobs: [P],
    reason: 'lint and format'
  },
  { id: 'R-22', patterns: ['**'], jobs: [J, P, K, E], reason: 'the safe default: a path with no rule runs everything' }
];

/** A glob as a regular expression: `**` any number of segments, `*` anything but `/`, a leading `**` + `/` also the root. */
function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        source += '(?:.*/)?';
        i += 2;
      } else {
        source += '.*';
        i += 1;
      }
    } else if (c === '*') source += '[^/]*';
    else source += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

const COMPILED = RULES.map((rule) => ({ rule, matchers: rule.patterns.map(globToRegExp) }));

/** The first rule that matches a path; the last rule (the default) matches every path. */
export function classify(file) {
  const found = COMPILED.find(({ matchers }) => matchers.some((matcher) => matcher.test(file)));
  return found ? found.rule : RULES.at(-1);
}

/**
 * The decision of an event: `{ java, page, kernel, e2e, why, reasons, defaults }`. Only a pull request with a non-empty list
 * is filtered; `reasons` maps a job to the rule that first raised it and an example path.
 */
export async function decide({ event, files = [] } = {}) {
  const all = Object.fromEntries(JOBS.map((job) => [job, true]));
  if (event !== 'pull_request')
    return { ...all, why: `${event || 'unknown event'}: everything runs`, reasons: {}, defaults: [] };
  if (!files || files.length === 0)
    return { ...all, why: 'no changed file listed: everything runs', reasons: {}, defaults: [] };
  const reasons = {};
  const defaults = [];
  const last = RULES.at(-1);
  for (const file of files) {
    const rule = classify(file);
    if (rule === last) defaults.push(file);
    for (const job of rule.jobs) if (!reasons[job]) reasons[job] = { rule: rule.id, example: file };
  }
  const decision = Object.fromEntries(JOBS.map((job) => [job, Boolean(reasons[job])]));
  return { ...decision, why: `pull_request: ${files.length} changed file(s)`, reasons, defaults };
}

const gitLines = (args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
    .split('\0')
    .filter(Boolean);

function parseArguments(argv) {
  const options = {};
  const known = new Set(['--event', '--base', '--head']);
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i];
    if (argument === '--list') options.list = true;
    else if (known.has(argument)) {
      if (i + 1 >= argv.length) return { error: `${argument} needs a value` };
      options[argument.slice(2)] = argv[++i];
    } else return { error: `unknown option ${argument}` };
  }
  if (!options.list && options.event === undefined) return { error: 'missing --event (or --list)' };
  if (!options.list && options.event === 'pull_request' && (!options.base || !options.head)) {
    return { error: 'a pull_request event needs --base and --head' };
  }
  return { options };
}

function list() {
  const files = gitLines(['ls-files', '-z']).filter((file) => fs.existsSync(file));
  const counts = new Map();
  const lines = files.map((file) => {
    const rule = classify(file);
    counts.set(rule.id, (counts.get(rule.id) ?? 0) + 1);
    return `${file}\t${rule.id}\t${rule.jobs.length ? JOBS.filter((job) => rule.jobs.includes(job)).join(',') : 'none'}`;
  });
  if (lines.length) process.stdout.write(`${lines.join('\n')}\n`);
  for (const rule of RULES) process.stderr.write(`${rule.id}\t${counts.get(rule.id) ?? 0}\t${rule.reason}\n`);
}

const cell = (text) => text.replace(/\|/g, '\\|');

function summary(decision) {
  const rows = JOBS.map((job) => {
    const reason = decision.reasons[job];
    let why = 'no changed file needs it';
    if (decision[job] && !reason) why = decision.why;
    else if (reason) why = `${reason.rule}: ${cell(reason.example)}`;
    return `| ${job} | ${decision[job] ? 'yes' : 'no'} | ${why} |`;
  });
  const out = [`${cell(decision.why)}`, '', '| Job | Runs | Why |', '|---|---|---|', ...rows, ''];
  if (decision.defaults.length) {
    out.push('Changed paths that fell to the default rule (the first 20):', '');
    for (const file of decision.defaults.slice(0, 20)) out.push(`- ${cell(file)}`);
    out.push('');
  }
  return out.join('\n');
}

async function main(argv) {
  const { options, error } = parseArguments(argv);
  if (error) {
    process.stderr.write(`error: ${error}\n`);
    return 2;
  }
  if (options.list) {
    list();
    return 0;
  }
  let files = [];
  let failed = false;
  if (options.event === 'pull_request') {
    try {
      files = gitLines(['diff', '--name-only', '--no-renames', '-z', `${options.base}...${options.head}`]);
    } catch (cause) {
      failed = true;
      process.stderr.write(`::warning::git diff failed, everything runs: ${String(cause.message).split('\n')[0]}\n`);
    }
  }
  const decision = await decide({ event: options.event, files });
  if (failed) decision.why = 'git diff failed: everything runs';
  const lines = JOBS.map((job) => `${job}=${decision[job]}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary(decision)}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
