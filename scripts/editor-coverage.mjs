#!/usr/bin/env node
// How much of the editor page's script the node suite runs, by area, and a floor that cannot go down
// (wave 023, run 0173, W-10, Q6). Run it with `npm run test:coverage`.
//
// The editor is one inline script of about 22,000 lines in src/main/resources/editor-webapp/standalone.html. The unit and
// integration suite (`npm run test:unit`, `node --test`) runs it in Node, in a `vm` context: the harness
// (src/test/javascript/viewpoint-kernel/harness.js) runs the script of the page under the file name
// `standalone.html-script.js`, and a page that is not the one of the repository (a released one, ARCHICODE_EDITOR_HTML)
// under another name. V8 reports what ran of every script it compiled, with the name; this script
//
//   1. extracts the scripts of the page as ESLint reads them (scripts/extract-editor-script.mjs, line numbers = lines of the HTML),
//   2. runs the suite with NODE_V8_COVERAGE (every test file is a process; the test output is the one of `test:unit`),
//   3. merges what each process ran of `standalone.html-script.js`: a line or a function is covered when ANY process ran it,
//   4. prints the figure by area and in total, writes target/editor-coverage/ (report.json, report.txt and
//      uncovered-functions.txt, with the line of the HTML), and
//   5. fails (exit 1) when the total, or an area, is below the floor of scripts/editor-coverage-floor.json.
//
// What is counted. LINES: a line of code is a line of the script that is not blank and not a comment (// or inside
// /* */); it is covered when the innermost V8 block range at its first character has a count above zero (a line whose
// first character runs and whose end does not, such as `a ? b : c`, is covered). FUNCTIONS: every function V8 reports
// (named, anonymous, arrow, method), the script itself excepted; it is covered when it was called once. The V8 ranges
// are those of precise coverage with block counts (`NODE_V8_COVERAGE`), nothing is sampled, so the figure does not
// depend on timing: the same suite gives the same figure (the tests are the same, and a test that waits for a timer
// would be the only way it moved; the run document of 0173 shows three runs).
//
// The areas are sections of the script, each named by a marker: a line of the page that must match exactly once, the
// section running up to the next marker. A heading comment directly above a marker belongs to the section. The markers
// are checked, so a heading that is renamed or removed fails this script (naming it) instead of moving lines from one
// area to another. The areas are the ones of the brief of Q6 (YAML and the save, layers and plateaus, diagram, pages,
// story player) with the parts of the page that are none of them split as far as the page's own sections go
// (workspace and files, editing, stories) and an `other` area (what comes before the first marker, the landing screen and
// the bootstrap), so that the areas add up to the total. The functions and lines belong to the area of the line they start on.
//
// The floor is the figure rounded DOWN to a tenth of a point (a ratchet: CI refuses to lower it, raising it is an edit of
// the file, `--write-floor`, and lowering it is `--write-floor --lower` and a conscious one), and never more than 90.
//
// Usage: node scripts/editor-coverage.mjs [options] [test files or globs...]
//   --floor <file>     the floor file (default scripts/editor-coverage-floor.json)
//   --write-floor      write the floor from this measure (it only raises; refuses to lower unless --lower), then exit 0
//   --lower            with --write-floor: allow a floor to go down
//   --no-floor         print and write the report, judge nothing
//   --reuse            do not run the suite: read the V8 coverage of the last run in target/editor-coverage/v8 (to look at a figure again)
//   test files         the files to run, instead of the whole suite (a subset: the figure is lower, the floor fails)

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(root, 'src/main/resources/editor-webapp/standalone.html');
const OUT = join(root, 'target/editor-coverage');
const SCRIPT_URL = 'standalone.html-script.js'; // the name harness.js gives the script of the page of the repository
const SUITE = 'src/test/javascript/**/*.test.js';
const CAP = 90; // a floor is never above this: the brief of Q6

// ---- the areas -------------------------------------------------------------------------------------------------------

/** Sections of the script in order: the area, and the line of the page (comment or code) that starts the section. */
const SECTIONS = [
  { area: 'yaml-and-save', marker: /^\/\/ YAML parser \(TDD DEC-2/ }, // the YAML reader and writer
  { area: 'workspace-and-files', marker: /^\/\/ IndexedDB: the remembered folders/ },
  { area: 'layers-and-plateaus', marker: /^\/\/ AppState \(TDD CTR-1\)/ }, // state, settings, comparison, plateau tree, layers, band, patches, plateau edits
  { area: 'workspace-and-files', marker: /^\/\/ Workspace \+ manifest loading \(TDD FLOW-1/ }, // loading, folder pick, served folder
  { area: 'pages', marker: /^\/\/ Real three-panel read-only UI/ }, // the shell, the perspectives
  { area: 'editing', marker: /^\/\/ Commit-and-rebuild pipeline/ }, // commit, create, delete
  { area: 'yaml-and-save', marker: /^\/\/ Save \(TDD-0010 DEC-7/ }, // the line-preserving save
  { area: 'editing', marker: /^\/\/ Move an element under another parent/ },
  { area: 'editing', marker: /^\/\/ Structured-form validation rules/ },
  { area: 'pages', marker: /^\/\/ ---- Top panel \(DEC-11/ }, // the panels, the help, the theme
  { area: 'editing', marker: /^\/\/ ---- Element edition form/ }, // the forms of an element, `replaces` by hand
  { area: 'pages', marker: /^\/\/ ---- Shell assembly \+ delegated event handling/ }, // then the Changes panel and the page Plateaus
  { area: 'diagram', marker: /^\/\/ ---- Diagram: viewpoints computed by the shared kernel/ }, // the diagram, the comparison drawn, the styles
  { area: 'stories', marker: /^\/\/ Stories — diagrams put in order/ }, // the library of views and stories, their editing, the dialogs, the actions
  { area: 'story-player', marker: /^\/\/ ---- The announcer of the story player/ }, // the announcer, the scene of a step, the player
  { area: 'stories', marker: /^function renderStoryBarHtml\(/ },
  { area: 'pages', marker: /^function renderActivePerspectiveHtml\(/ }, // the shell and the delegated events
  { area: 'other', marker: /^\/\/ Landing screen — everything shown before/ }, // the landing screen, the bootstrap
  { area: 'other', marker: /^\/\/ Bootstrap$/ }
];
const AREAS = [
  'yaml-and-save',
  'layers-and-plateaus',
  'workspace-and-files',
  'editing',
  'pages',
  'diagram',
  'stories',
  'story-player',
  'other'
];

// ---- arguments -------------------------------------------------------------------------------------------------------

const args = process.argv.slice(2);
const options = {
  floor: join(root, 'scripts/editor-coverage-floor.json'),
  writeFloor: false,
  lower: false,
  judge: true
};
const tests = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--floor') options.floor = resolve(args[++i]);
  else if (a === '--write-floor') options.writeFloor = true;
  else if (a === '--lower') options.lower = true;
  else if (a === '--no-floor') options.judge = false;
  else if (a === '--reuse') options.reuse = true;
  else if (a.startsWith('--')) fail(`unknown option ${a}`);
  else tests.push(a);
}

function fail(message) {
  console.error(`editor-coverage: ${message}`);
  process.exit(1);
}

// ---- the script of the page ------------------------------------------------------------------------------------------

/** The text the harness runs (the first `<script>` of the page), the line of its tag, and the lines of the extract ESLint reads. */
function readPage() {
  const extract = spawnSync(
    process.execPath,
    [join(root, 'scripts/extract-editor-script.mjs'), HTML, join(OUT, 'script')],
    {
      encoding: 'utf8'
    }
  );
  if (extract.status !== 0) fail(`the extraction of the script failed: ${extract.stderr || extract.stdout}`);
  const html = readFileSync(HTML, 'utf8');
  const match = /<script>([\s\S]*?)<\/script>/.exec(html); // the expression of harness.js
  if (!match) fail('standalone.html: the script of the page was not found');
  const tagLine = html.slice(0, match.index).split('\n').length;
  const harnessText = match[1]; // offsets of the V8 ranges are in this text
  // line L of the harness text is line tagLine + L - 1 of the HTML, and of page.js, the copy ESLint reads
  const pageJs = readFileSync(join(OUT, 'script/page.js'), 'utf8').split('\n');
  const harnessLines = harnessText.split('\n');
  for (let l = 1; l < harnessLines.length; l++)
    if (pageJs[tagLine + l - 1] !== harnessLines[l])
      fail(`the extracted script differs from the one the harness runs at line ${tagLine + l}`);
  return { harnessText, harnessLines, tagLine, htmlLines: pageJs };
}

/** For each line of the harness text (index = line - 1): is it a line of code (not blank, not a comment)? */
function codeLines(lines) {
  const code = [];
  let inBlock = false;
  for (const raw of lines) {
    let line = raw.trim();
    let isCode = false;
    while (line.length > 0) {
      if (inBlock) {
        const end = line.indexOf('*/');
        if (end === -1) {
          line = '';
        } else {
          inBlock = false;
          line = line.slice(end + 2).trim();
        }
      } else if (line.startsWith('//')) {
        line = '';
      } else if (line.startsWith('/*')) {
        inBlock = true;
        line = line.slice(2);
      } else {
        isCode = true;
        break;
      }
    }
    code.push(isCode);
  }
  return code;
}

/** The area of every line of the HTML (index = line - 1), from the markers. */
function areaOfLines(htmlLines, firstLine) {
  const positions = SECTIONS.map((section) => {
    const hits = [];
    htmlLines.forEach((text, index) => {
      if (index + 1 >= firstLine && section.marker.test(text)) hits.push(index + 1);
    });
    if (hits.length !== 1)
      fail(
        `the area marker ${section.marker} (${section.area}) matches ${hits.length} lines of the script, not one: update SECTIONS`
      );
    let line = hits[0];
    // the comment lines right above the marker are its heading
    while (line - 1 >= firstLine && /^\s*(\/\/|\/\*|\*)/.test(htmlLines[line - 2])) line--;
    return line;
  });
  for (let i = 1; i < positions.length; i++)
    if (positions[i] <= positions[i - 1])
      fail(`the area markers are not in the order of the script: ${SECTIONS[i].marker}`);
  const area = new Array(htmlLines.length).fill('other');
  for (let i = 0; i < SECTIONS.length; i++) {
    const to = i + 1 < SECTIONS.length ? positions[i + 1] : htmlLines.length + 1;
    for (let line = positions[i]; line < to; line++) area[line - 1] = SECTIONS[i].area;
  }
  return area;
}

// ---- the run ---------------------------------------------------------------------------------------------------------

function runSuite() {
  const v8 = join(OUT, 'v8');
  if (options.reuse) return { v8, status: 0 }; // the coverage of the last run, to look at it again
  rmSync(v8, { recursive: true, force: true });
  mkdirSync(v8, { recursive: true });
  const result = spawnSync(process.execPath, ['--test', ...(tests.length ? tests : [SUITE])], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_V8_COVERAGE: v8 }
  });
  return { v8, status: result.status ?? 1 };
}

/** Merges the processes: the lines (by harness line) and the functions (by range) that any of them ran. */
function merge(v8, page, isCode) {
  const probes = []; // offset of the first character of each line of code, in order
  const probeLine = []; // and its line (1-based) in the harness text
  let offset = 0;
  page.harnessLines.forEach((text, index) => {
    if (isCode[index]) {
      probes.push(offset + text.length - text.trimStart().length);
      probeLine.push(index + 1);
    }
    offset += text.length + 1;
  });
  const lineCovered = new Uint8Array(page.harnessLines.length + 1);
  const functions = new Map(); // "start:end" -> { name, start, end, covered }
  let scripts = 0;
  for (const file of readdirSync(v8).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(v8, file), 'utf8'));
    for (const entry of data.result) {
      if (entry.url !== SCRIPT_URL) continue;
      scripts++;
      const ranges = [];
      for (const fn of entry.functions) {
        const [first] = fn.ranges;
        const isScript = first.startOffset === 0 && fn.functionName === ''; // the script itself: its ranges count for the lines, it is no function
        if (!isScript) {
          const key = `${first.startOffset}:${first.endOffset}`;
          const known = functions.get(key);
          if (known) known.covered ||= first.count > 0;
          else
            functions.set(key, {
              name: fn.functionName,
              start: first.startOffset,
              end: first.endOffset,
              covered: first.count > 0
            });
        }
        for (const r of fn.ranges)
          ranges.push({ start: r.startOffset, end: r.endOffset, count: r.count, order: ranges.length });
      }
      // the innermost range at a point decides: outer first (earlier start, later end, then listed order)
      ranges.sort((a, b) => a.start - b.start || b.end - a.end || a.order - b.order);
      const stack = [];
      let next = 0;
      for (let p = 0; p < probes.length; p++) {
        while (next < ranges.length && ranges[next].start <= probes[p]) stack.push(ranges[next++]);
        while (stack.length && stack[stack.length - 1].end <= probes[p]) stack.pop();
        if (stack.length && stack[stack.length - 1].count > 0) lineCovered[probeLine[p]] = 1;
      }
    }
  }
  return { lineCovered, functions, scripts };
}

// ---- the figure ------------------------------------------------------------------------------------------------------

/** hundredths of a percent, rounded down, as an integer: 52.34 % is 5234. */
const centi = (covered, total) => (total === 0 ? 10000 : Math.floor((covered * 10000) / total));
const tenths = (c) => Math.floor(c / 10); // a tenth of a point, rounded down: 52.3 % is 523
const show = (c) => (c / 100).toFixed(2).padStart(6);

function measure(page, isCode, merged, areaOfLine) {
  const zero = () => ({ lines: 0, linesCovered: 0, functions: 0, functionsCovered: 0 });
  const areas = Object.fromEntries(AREAS.map((a) => [a, zero()]));
  const total = zero();
  const lineOfHarness = (l) => page.tagLine + l - 1;
  isCode.forEach((code, index) => {
    if (!code) return;
    const area = areas[areaOfLine[lineOfHarness(index + 1) - 1]];
    const covered = merged.lineCovered[index + 1];
    area.lines++;
    area.linesCovered += covered;
    total.lines++;
    total.linesCovered += covered;
  });
  // the line of a function, from its offset
  const lineStarts = [0];
  page.harnessText.split('\n').forEach((text, index, all) => {
    if (index + 1 < all.length) lineStarts.push(lineStarts[index] + text.length + 1);
  });
  const lineAt = (offsetInText) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offsetInText) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const uncoveredLines = []; // lines of the HTML, in order
  isCode.forEach((code, index) => {
    if (code && !merged.lineCovered[index + 1]) uncoveredLines.push(lineOfHarness(index + 1));
  });
  const uncovered = [];
  for (const fn of merged.functions.values()) {
    const htmlLine = lineOfHarness(lineAt(fn.start));
    const area = areas[areaOfLine[htmlLine - 1]];
    area.functions++;
    total.functions++;
    if (fn.covered) {
      area.functionsCovered++;
      total.functionsCovered++;
    } else
      uncovered.push({
        area: areaOfLine[htmlLine - 1],
        line: htmlLine,
        name: fn.name || '(anonymous)',
        lines: lineAt(fn.end) - lineAt(fn.start) + 1
      });
  }
  uncovered.sort((a, b) => a.line - b.line);
  return { areas, total, uncovered, uncoveredLines };
}

/** The lines of code that no process ran, as ranges of consecutive code lines (blank and comment lines between two of them do not break a range), with their area. */
function rangesOf(lines, areaOfLine) {
  const out = [];
  let from = null;
  let to = null;
  const flush = () => {
    if (from !== null) out.push(`${String(from).padStart(6)}-${String(to).padEnd(6)} ${areaOfLine[from - 1]}`);
  };
  for (const line of lines) {
    if (from !== null && line - to <= 1) to = line;
    else {
      flush();
      from = line;
      to = line;
    }
  }
  flush();
  return out.join('\n');
}

const figures = (x) => ({ lines: centi(x.linesCovered, x.lines), functions: centi(x.functionsCovered, x.functions) });

function table(result) {
  const rows = [['area', 'lines', 'covered', 'of', 'functions', 'covered', 'of']];
  const row = (name, x) => {
    const f = figures(x);
    rows.push(
      [
        name,
        show(f.lines) + ' %',
        x.linesCovered,
        x.lines,
        show(f.functions) + ' %',
        x.functionsCovered,
        x.functions
      ].map(String)
    );
  };
  for (const name of AREAS) row(name, result.areas[name]);
  row('TOTAL', result.total);
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
  return rows
    .map(
      (r, i) =>
        r.map((cell, c) => (c === 0 ? cell.padEnd(widths[c]) : cell.padStart(widths[c]))).join('  ') +
        (i === rows.length - 2 ? '\n' + '-'.repeat(widths.reduce((s, w) => s + w + 2, -2)) : '')
    )
    .join('\n');
}

// ---- the floor -------------------------------------------------------------------------------------------------------

/** The floor this measure would set: the figure in tenths, rounded down, never above CAP. */
function floorOf(result) {
  const one = (x) => ({
    lines: Math.min(tenths(figures(x).lines), CAP * 10) / 10,
    functions: Math.min(tenths(figures(x).functions), CAP * 10) / 10
  });
  return { total: one(result.total), areas: Object.fromEntries(AREAS.map((a) => [a, one(result.areas[a])])) };
}

function judge(result, floor) {
  const problems = [];
  const check = (name, x, f) => {
    const got = figures(x);
    for (const metric of ['lines', 'functions']) {
      const have = tenths(got[metric]);
      const need = Math.round(f[metric] * 10);
      if (have < need)
        problems.push(`${name}: ${metric} ${(have / 10).toFixed(1)} % is below the floor ${(need / 10).toFixed(1)} %`);
    }
  };
  check('total', result.total, floor.total);
  for (const area of AREAS) {
    if (!floor.areas[area]) problems.push(`${area}: no floor in the floor file`);
    else check(area, result.areas[area], floor.areas[area]);
  }
  for (const area of Object.keys(floor.areas))
    if (!AREAS.includes(area)) problems.push(`${area}: a floor for an area that does not exist`);
  return problems;
}

// ---- main ------------------------------------------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const page = readPage();
const isCode = codeLines(page.harnessLines);
const areaOfLine = areaOfLines(page.htmlLines, page.tagLine + 1);
const { v8, status } = runSuite();
const merged = merge(v8, page, isCode);
if (merged.scripts === 0)
  fail(`V8 saw no script named ${SCRIPT_URL}: did the harness stop running the page under that name?`);
const result = measure(page, isCode, merged, areaOfLine);

const report = {
  script: 'src/main/resources/editor-webapp/standalone.html (the first <script>, lines are lines of the HTML)',
  processesThatRanThePage: merged.scripts,
  total: { ...result.total, ...figuresReadable(result.total) },
  areas: Object.fromEntries(AREAS.map((a) => [a, { ...result.areas[a], ...figuresReadable(result.areas[a]) }])),
  floor: floorOf(result)
};
function figuresReadable(x) {
  const f = figures(x);
  return { linesPercent: f.lines / 100, functionsPercent: f.functions / 100 };
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
writeFileSync(join(OUT, 'report.txt'), table(result) + '\n');
writeFileSync(
  join(OUT, 'uncovered-functions.txt'),
  result.uncovered
    .map((u) => `${String(u.line).padStart(6)}  ${u.area.padEnd(20)} ${String(u.lines).padStart(5)} lines  ${u.name}`)
    .join('\n') + '\n'
);
writeFileSync(join(OUT, 'uncovered-lines.txt'), rangesOf(result.uncoveredLines, areaOfLine) + '\n');
console.log(`\nEditor script coverage (${merged.scripts} runs of the page merged; report in target/editor-coverage/)`);
console.log(table(result));

if (status !== 0) fail(`the tests failed (exit ${status}): the coverage of a failing run is not judged`);

if (options.writeFloor) {
  const next = floorOf(result);
  const current = existsSync(options.floor) ? JSON.parse(readFileSync(options.floor, 'utf8')) : null;
  if (current && !options.lower) {
    const lowered = [];
    const compare = (name, a, b) => {
      for (const m of ['lines', 'functions']) if (b[m] < a[m]) lowered.push(`${name} ${m}: ${a[m]} -> ${b[m]}`);
    };
    compare('total', current.total, next.total);
    for (const a of AREAS) if (current.areas[a]) compare(a, current.areas[a], next.areas[a]);
    if (lowered.length)
      fail(
        `this measure would lower the floor (${lowered.join('; ')}): the floor only goes up. --lower lowers it, on purpose`
      );
  }
  writeFileSync(options.floor, JSON.stringify({ ...next, note: FLOOR_NOTE() }, null, 2) + '\n');
  console.log(`floor written to ${options.floor}`);
  process.exit(0);
}

function FLOOR_NOTE() {
  return 'Percent of the lines of code and of the functions of the editor script that the node suite runs, rounded down to a tenth. Written by `node scripts/editor-coverage.mjs --write-floor`, which only raises it. Lowering it is a decision (--lower).';
}

if (options.judge) {
  if (!existsSync(options.floor)) fail(`no floor file at ${options.floor}`);
  const floor = JSON.parse(readFileSync(options.floor, 'utf8'));
  const problems = judge(result, floor);
  if (problems.length) {
    for (const p of problems) console.error(`editor-coverage: ${p}`);
    fail(`the coverage of the editor script is below its floor (${relative(root, options.floor)})`);
  }
  const next = floorOf(result);
  const raise = [];
  if (next.total.lines > floor.total.lines) raise.push(`lines ${floor.total.lines} -> ${next.total.lines}`);
  if (next.total.functions > floor.total.functions)
    raise.push(`functions ${floor.total.functions} -> ${next.total.functions}`);
  console.log(`the figure holds the floor of ${relative(root, options.floor)}`);
  if (raise.length)
    console.log(`it could be raised (total ${raise.join(', ')}): node scripts/editor-coverage.mjs --write-floor`);
}
