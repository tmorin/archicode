// =====================================================================
// The edges of the bundle in the page (wave 025, run 0193, TDD-0193 DEC-4, DEC-5, DEC-6, DEC-13, CTR-2, IMP-5, CON-8): what Export, Import and
// Open sample touch outside the codec of persistence/bundle.js. The network, the file input and the download are in four small top-level
// functions (`fetchSampleBundle`, `bundleFilePicker`, `startBundleDownload`, `readBundleFile`) and nowhere else, so the flows of
// application/bundle-flows.js can be tested by replacing them on the sandbox and the e2e spec runs the real ones. No page state, no drawing.
// =====================================================================

/* exported BROWSER_SAMPLES, fetchSampleBundle, bundleFilePicker, readBundleFile, startBundleDownload, bundleFileName,
   bundleProblemsSentence, bundleImportName --
   the entry points of this part: the flows of application/bundle-flows.js call them (run 0193, task 009). */

/** The samples the page can open (DEC-6): the id, the name of the workspace made from it and its address, relative so that it works under `/editor/` and at `/`. */
const BROWSER_SAMPLES = {
  brightcart: { name: 'Brightcart', url: 'samples/brightcart.yaml' },
  archicode: { name: 'ArchiCode', url: 'samples/archicode.yaml' }
};

const BUNDLE_NOT_UTF8 = 'The file is not UTF-8 text.';
const BUNDLE_IMPORT_FALLBACK_NAME = 'Imported workspace';

let bundleFileInput = null; // the file input of the picker in progress: held until its `change`, outside `#app`, so a redraw cannot take it away (ASM-4)

/** DEC-4: `<slug>-bundle.yaml`; the slug is the name in lowercase, every run of characters outside a-z0-9 a dash, trimmed, at most 60 characters, `workspace` when none is left. */
function bundleFileName(rawName) {
  const slug = String(rawName === undefined || rawName === null ? '' : rawName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return (slug === '' ? 'workspace' : slug) + '-bundle.yaml';
}

/** The text of bytes that must be UTF-8 (DEC-5: `file.text()` would replace invalid bytes silently); a leading byte-order mark is dropped. Throws when they are not. */
function bundleDecodeBytes(buffer) {
  return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(buffer));
}

/** DEC-5: the text of a bundle file the visitor chose, `{ text, problem }`: `problem` is null, or `text` is '' and `problem` the sentence. A file over the limit is refused by its size, unread. */
async function readBundleFile(file) {
  if (file.size > BUNDLE_MAX_BYTES) {
    return {
      text: '',
      problem:
        'The file is ' + file.size + ' bytes, over the limit of ' + BUNDLE_MAX_BYTES + ' bytes for a workspace file.'
    };
  }
  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (e) {
    return { text: '', problem: 'The file could not be read.' };
  }
  try {
    return { text: bundleDecodeBytes(buffer), problem: null };
  } catch (e) {
    return { text: '', problem: BUNDLE_NOT_UTF8 };
  }
}

/** The first sentences of the codec for a file it refuses (DEC-5): up to three, joined by `; `, then how many more. */
function bundleProblemsSentence(problems) {
  const list = Array.from(problems);
  return (
    'The file cannot be imported: ' +
    list.slice(0, 3).join('; ') +
    (list.length > 3 ? ' (and ' + (list.length - 3) + ' more)' : '')
  );
}

/** Why the answer for a sample is no workspace: the reason as a phrase without its final dot, or null when `buffer` unbundles into a workspace; the files when it does. */
function bundleSampleFromBytes(buffer) {
  if (buffer.byteLength === 0) return { reason: 'the file is empty' };
  let text;
  try {
    text = bundleDecodeBytes(buffer);
  } catch (e) {
    return { reason: 'the file is not UTF-8 text' };
  }
  const unbundled = unbundleWorkspaceFiles(text);
  if (unbundled.problems.length > 0) return { reason: String(unbundled.problems[0]).replace(/\.$/, '') };
  if (!unbundled.files.some((file) => file.path === WORKSPACE_FILE_NAME)) {
    return { reason: 'it holds no ' + WORKSPACE_FILE_NAME + ', so it is not a workspace' };
  }
  return { files: unbundled.files };
}

/**
 * DEC-6: the sample `id` unbundled, `{ files: [{ path, bytes }], problem }`; with no file, `problem` is the whole sentence
 * `The <Name> sample could not be loaded: <reason>. Check your connection and try again.` It never rejects. The request is a GET of the
 * relative address that skips the cache, with the token of the server in a page served by `archicode editor serve` and no header otherwise.
 */
async function fetchSampleBundle(id) {
  const sample = Object.prototype.hasOwnProperty.call(BROWSER_SAMPLES, id) ? BROWSER_SAMPLES[id] : null;
  if (sample === null) return { files: [], problem: 'There is no sample called “' + id + '”.' };
  const refused = (reason) => ({
    files: [],
    problem: 'The ' + sample.name + ' sample could not be loaded: ' + reason + '. Check your connection and try again.'
  });
  try {
    const headers = {};
    if (isServedByArchiCode()) headers['X-ArchiCode-Token'] = serverToken();
    const response = await fetch(sample.url, { method: 'GET', cache: 'no-cache', headers });
    if (!response.ok) {
      return refused('the server answered ' + response.status + (response.statusText ? ' ' + response.statusText : ''));
    }
    const read = bundleSampleFromBytes(await response.arrayBuffer());
    return read.reason !== undefined ? refused(read.reason) : { files: read.files, problem: null };
  } catch (e) {
    return refused(String((e && e.message) || e).replace(/\.$/, ''));
  }
}

/**
 * DEC-5, ASM-4: opens the picker of a file and calls `onFile(file)` when the visitor has chosen one (never when they cancel). It must be called
 * synchronously in the click that asks for it. The input is made outside `#app` and held in `bundleFileInput` until its `change`.
 */
function bundleFilePicker(onFile) {
  if (bundleFileInput !== null) bundleFileInput.remove();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.yaml,.yml,text/yaml,text/plain';
  input.style.display = 'none';
  const done = () => {
    input.remove();
    if (bundleFileInput === input) bundleFileInput = null;
  };
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    done();
    if (file) onFile(file);
  });
  input.addEventListener('cancel', done);
  bundleFileInput = input;
  document.body.appendChild(input);
  input.click();
}

/** DEC-4: starts the download of `text` as `fileName` (UTF-8, no byte-order mark); true when it was started, false when the browser refused. */
function startBundleDownload(fileName, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/yaml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * DEC-5: the name an import proposes: `settings.name` of the root `.archicode.yaml` when it is a text that is a valid name; else the name of the
 * file without its last extension when that is a valid name; else `Imported workspace`. A file `parseYaml` refuses is no refusal, it falls
 * back. Making it unique against the names in the list is for the flow.
 */
function bundleImportName(files, fileName) {
  const root = files.find((file) => file.path === WORKSPACE_FILE_NAME);
  if (root) {
    try {
      const document = parseYaml(new TextDecoder().decode(root.bytes));
      const settings = document && typeof document === 'object' ? document.settings : null;
      const name = settings && typeof settings === 'object' ? settings.name : null;
      if (
        typeof name === 'string' &&
        !plainNumberOf(settings, 'name') &&
        browserWorkspaceNameProblem(name, []) === null
      ) {
        return name.trim();
      }
    } catch (e) {
      /* an unreadable root file is the error card's to tell once the workspace is opened */
    }
  }
  const base = typeof fileName === 'string' ? fileName.replace(/\.[^./\\]*$/, '').trim() : '';
  return base !== '' && browserWorkspaceNameProblem(base, []) === null ? base : BUNDLE_IMPORT_FALLBACK_NAME;
}
