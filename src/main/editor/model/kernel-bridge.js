/** The kernel, once the promise of `loadViewpointKernel` has settled: null before. */
let loadedKernel = null;

/** Decode the embedded WebAssembly module and wrap its tiny C ABI (alloc / compute / compare / result_ptr / dealloc). */
function loadViewpointKernel() {
  if (!viewpointKernelPromise) {
    viewpointKernelPromise = (async () => {
      const node = document.getElementById('viewpoint-kernel-wasm');
      if (!node) throw new Error('The embedded viewpoint kernel is missing from this file.');
      const binary = atob(node.textContent.trim());
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
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
 * ELK (layered layout with nested boxes), lazily from a CDN — null when it cannot be loaded (offline). A failure is
 * not remembered for good (it may have been a moment without network): a later render tries again, at most once per
 * ELK_RETRY_AFTER_MS.
 */
function loadElk() {
  if (!elkPromise) {
    if (elkFailedAt && Date.now() - elkFailedAt < ELK_RETRY_AFTER_MS) return Promise.resolve(null);
    elkPromise = import('https://esm.sh/elkjs@0.9.3/lib/elk.bundled.js')
      .then((mod) => new mod.default())
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
