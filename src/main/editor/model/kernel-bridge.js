/** The kernel, once the promise of `loadViewpointKernel` has settled: null before. */
let loadedKernel = null;

/**
 * Load the WebAssembly module that sits beside the page, as the script viewpoint_kernel.js that holds it in base64, and wrap its
 * tiny C ABI (alloc / compute / compare / result_ptr / dealloc). A script, not a fetch of the .wasm: a page opened from a disk
 * (file://) may load a script but not fetch a file.
 */
function loadViewpointKernel() {
  if (!viewpointKernelPromise) {
    viewpointKernelPromise = (async () => {
      const address = assetAddress('viewpoint_kernel.js');
      if (address === null) throw new Error('The page names no viewpoint_kernel.js file.');
      try {
        await loadClassicScript(address);
      } catch (e) {
        throw new Error(
          'The viewpoint kernel could not be loaded from ' + address + ': ' + (e && e.message ? e.message : e),
          {
            cause: e
          }
        );
      }
      const encoded = globalThis.ArchiCodeKernelWasm;
      if (typeof encoded !== 'string')
        throw new Error('The script ' + address + ' did not define the viewpoint kernel.');
      delete globalThis.ArchiCodeKernelWasm; // the string is about a megabyte: the bytes are all that is kept
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const { instance } = await WebAssembly.instantiate(bytes, {});
      const x = instance.exports;
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      // one call of the C ABI: the input as JSON in, the answer as JSON out (`compute` draws a view, `compare` compares two plateaus)
      const call = (name, input) => {
        const data = encoder.encode(JSON.stringify(input));
        const ptr = x.alloc(data.length);
        new Uint8Array(x.memory.buffer, ptr, data.length).set(data); // read memory.buffer after alloc: it may have grown
        const length = x[name](ptr, data.length);
        const output = decoder.decode(new Uint8Array(x.memory.buffer, x.result_ptr(), length));
        x.dealloc(ptr, data.length);
        const result = JSON.parse(output);
        if (!result.error && result.version !== KERNEL_CONTRACT_VERSION) {
          throw new Error(
            'The embedded viewpoint kernel speaks version ' +
              result.version +
              ', this editor expects ' +
              KERNEL_CONTRACT_VERSION +
              '.'
          );
        }
        return result;
      };
      // contract 5: the seven words of a comparison are the kernel's, read once here (the answer does not depend on the input)
      adoptKernelStates(call('states', {}));
      const kernel = {
        compute(input) {
          const result = call('compute', input);
          for (const warning of result.warnings || []) {
            if (!kernelWarningsShown.has(warning)) {
              kernelWarningsShown.add(warning);
              console.warn('ArchiCode: ' + warning);
            }
          }
          return result;
        },
        // wave 015 (run 0095, issue #81): which elements of a layer have nothing to draw, for all of them in one call (see `quietReferencesThroughFacet`)
        quiet(input) {
          return call('quiet', input);
        },
        // run 0039: the union of two plateaus, where every element and relationship says what changed (see `buildComparison`)
        compare(input) {
          return call('compare', input);
        },
        // wave 014 (run 0080): the ordered patches of a plateau applied to the elements of the graph the manifests of its layer gave (see `resolveLayerStep`)
        applyPatches(input) {
          return call('apply_patches', input);
        }
      };
      loadedKernel = kernel; // the synchronous builders of a comparison need it; the drawing waits for the promise before it asks
      return kernel;
    })();
    viewpointKernelPromise.catch(() => {
      viewpointKernelPromise = null;
    });
  }
  return viewpointKernelPromise;
}

/** After a failed import, ELK is not asked for again before this delay: a render is not a retry loop. */
const ELK_RETRY_AFTER_MS = 30000;
let elkFailedAt = 0;

/**
 * Adds a classic script to the page and resolves when it has run. A page opened from a disk (file://) may load a script but not
 * import a module or fetch a file, so the assets beside the page are scripts that set a global.
 */
function loadClassicScript(address) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = address;
    script.onload = resolve;
    script.onerror = () => reject(new Error('the script ' + address + ' could not be loaded'));
    document.head.appendChild(script);
  });
}

/**
 * The address of an asset that sits beside the page, read from the <meta name="archicode-asset:NAME"> that the build
 * writes; null when there is no document, no such meta, an empty content or an address that cannot be read.
 */
function assetAddress(name) {
  try {
    if (typeof document === 'undefined' || !document || typeof document.querySelector !== 'function') return null;
    const meta = document.querySelector('meta[name="archicode-asset:' + name + '"]');
    const content = meta ? meta.getAttribute('content') : null;
    if (!content) return null;
    return new URL(content, document.baseURI).href;
  } catch (e) {
    return null;
  }
}

/**
 * ELK (layered layout with nested boxes), lazily from the asset elk.js beside the page — null when it cannot be loaded (offline). A failure is
 * not remembered for good (it may have been a moment without network): a later render tries again, at most once per
 * ELK_RETRY_AFTER_MS.
 */
function loadElk() {
  if (!elkPromise) {
    if (elkFailedAt && Date.now() - elkFailedAt < ELK_RETRY_AFTER_MS) return Promise.resolve(null);
    const address = assetAddress('elk.js');
    // no address is a failure like any other: the same warning, the same wait before the next try
    elkPromise = (
      address === null ? Promise.reject(new Error('the page names no elk.js asset')) : loadClassicScript(address)
    )
      .then(() => new globalThis.ArchiCodeElk.default())
      .catch((e) => {
        console.warn('ELK failed to load — the diagram falls back to a plain list.', e);
        elkFailedAt = Date.now();
        elkPromise = null;
        return null;
      });
  }
  return elkPromise;
}

/** A relationship's tag values as strings (the YAML may hold booleans or numbers; ArchiCode reads them as text). */
function kernelTagsOf(tags) {
  const out = {};
  for (const key of Object.keys(tags || {})) setOwnKey(out, key, String(tags[key]));
  return out;
}

/** A scalar of the YAML as the kernel's String fields want it (Jackson reads `8080` into a String the same way); null for none. */
function kernelStringOf(value) {
  return value === undefined || value === null ? null : String(value);
}

/** A list of the YAML as a list of strings for the kernel; entries that are null are left out. */
function kernelStringsOf(list) {
  return (Array.isArray(list) ? list : []).map(kernelStringOf).filter((s) => s !== null);
}

/** One layer's elements as the kernel wants them; relationships to unknown elements are left out and counted. `withProperties`: also what only a facet reads (kind, name, description). The qualifiers and the tags always go: the kernel tells the stereotypes of a box from them. */
function toKernelElements(map, withProperties) {
  let dangling = 0;
  const elements = [];
  for (const record of map.values()) {
    const relationships = [];
    for (const rel of record.relationships) {
      if (!rel.resolved) {
        dangling++;
        continue;
      }
      relationships.push({
        destination: kernelStringOf(rel.destination),
        label: kernelStringOf(rel.rawLabel),
        qualifiers: kernelStringsOf(rel.qualifiers),
        tags: kernelTagsOf(rel.tags)
      });
    }
    const element = {
      reference: String(record.reference),
      parent: !LEAF_KINDS.includes(record.kind),
      applications: kernelStringsOf(record.applications),
      uses: kernelStringsOf(record.uses),
      qualifiers: kernelStringsOf(record.qualifiers), // the kernel tells the stereotypes of a box from these two (`rendering-stereotypes` is a tag)
      tags: kernelTagsOf(record.tags),
      relationships
    };
    if (withProperties) {
      // what a facet can select on besides the relationships and the two above; the viewpoints do not read it, so it only travels with a facet
      element.kind = kernelStringOf(record.kind);
      element.name = kernelStringOf(record.name);
      element.description = kernelStringOf(record.description);
      // the author's hint that this element is where others of the baseline went: only when there is one, so that the input of a workspace without it is what it was
      const replaces = kernelStringsOf(record.replaces);
      if (replaces.length) element.replaces = replaces;
    }
    elements.push(element);
  }
  return { elements, dangling };
}
