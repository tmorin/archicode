// Builds the samples of the hosted editor: the bundle (one YAML text) of a folder, written to src/main/resources/editor-webapp/samples/<id>.yaml.
// Two samples: Brightcart (the folder src/test/resources/brightcart/layered) and ArchiCode (the model of ArchiCode, docs/architecture; wave 029).
// A bundle is made by the page's own codec (`bundleWorkspaceFiles`), the page's script run in Node through the harness of the unit suite, so the
// codec that writes a sample is the one that reads it (run 0193, DEC-1).
//   node scripts/build-sample.mjs                writes the samples, only those whose bytes differ
//   node scripts/build-sample.mjs --check        writes nothing; exit 0 when each committed sample is the bundle, else exit 1 and one line
//   node scripts/build-sample.mjs --root <dir>   another tree with the same layout (a copy: the fixtures, the samples and the page)
//   node scripts/build-sample.mjs --only <id>    one sample (`brightcart` or `archicode`)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLES = {
  brightcart: {
    fixture: 'src/test/resources/brightcart/layered',
    sample: 'src/main/resources/editor-webapp/samples/brightcart.yaml'
  },
  archicode: {
    fixture: 'docs/architecture',
    sample: 'src/main/resources/editor-webapp/samples/archicode.yaml'
  }
};
const PAGE = 'src/main/resources/editor-webapp/standalone.html';
const REBUILD = 'run `npm run sample:build`';

/** Every file of the folder, recursively, with `/` paths, sorted, as { path, bytes }. */
function filesOf(folder, relative = '', found = []) {
  const entries = fs.readdirSync(path.join(folder, relative), { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const rel = relative === '' ? entry.name : relative + '/' + entry.name;
    if (entry.isDirectory()) filesOf(folder, rel, found);
    else if (entry.isFile()) found.push({ path: rel, bytes: new Uint8Array(fs.readFileSync(path.join(folder, rel))) });
  }
  return found;
}

/** The bundle text of the fixture of `root`, made by the page of `root`; throws an Error whose message is one line when the bundle drops anything. */
export function buildSample(root, id = 'brightcart') {
  const { fixture: FIXTURE } = SAMPLES[id];
  const require = createRequire(import.meta.url);
  const { createApp } = require(path.join(REPOSITORY, 'src/test/javascript/viewpoint-kernel/harness.js'));
  const page = fs.readFileSync(path.join(root, PAGE), 'utf8');
  const files = filesOf(path.join(root, FIXTURE));
  const bundle = createApp({ html: page }).bundleWorkspaceFiles(files);
  if (bundle.skipped.length > 0) {
    const list = bundle.skipped.map((file) => file.path + ' (' + file.reason + ')').join(', ');
    throw new Error('the bundle skips ' + bundle.skipped.length + ' file(s) of the fixture: ' + list);
  }
  const carried = bundle.carried.map((file) => file.path);
  const read = files.map((file) => file.path);
  const missing = read.filter((p) => !carried.includes(p));
  if (carried.length !== read.length || missing.length > 0) {
    throw new Error(
      'the bundle carries ' + carried.length + ' of the ' + read.length + ' files of the fixture: ' + missing.join(', ')
    );
  }
  return bundle.text;
}

/** The first line (1-based) where the two texts differ, or 0 when they are the same. */
function firstDifferentLine(a, b) {
  const x = a.split('\n');
  const y = b.split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) return i + 1;
  }
  return 0;
}

function main(argv) {
  const check = argv.includes('--check');
  const at = argv.indexOf('--root');
  const root = at >= 0 ? path.resolve(argv[at + 1] || '.') : REPOSITORY;
  const only = argv.indexOf('--only');
  const ids = only >= 0 ? [argv[only + 1]] : Object.keys(SAMPLES);
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(SAMPLES, id)) throw new Error('there is no sample ' + id);
    const { fixture, sample } = SAMPLES[id];
    const target = path.join(root, sample);
    const text = buildSample(root, id);
    const bytes = Buffer.from(text, 'utf8');
    const committed = fs.existsSync(target) ? fs.readFileSync(target) : null;
    const same = committed !== null && committed.equals(bytes);
    if (check) {
      if (same) continue;
      if (committed === null) throw new Error(sample + ' is missing: ' + REBUILD);
      const line = firstDifferentLine(committed.toString('utf8'), text);
      throw new Error(
        sample + ' is not the bundle of ' + fixture + ' (first difference at line ' + line + '): ' + REBUILD
      );
    }
    if (same) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error('build-sample: ' + String(e.message).split('\n')[0]);
    process.exit(1);
  }
}
