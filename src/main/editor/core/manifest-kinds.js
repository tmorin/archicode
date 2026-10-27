// =====================================================================
// header.kind prefix mapping + recursive element indexing +
// relationship resolution (TDD DEC-5, ASM-3, ASM-4; PRD FR-6/FR-7).
// =====================================================================

const ARCHICODE_KIND_PREFIX = 'archicode.morin.io/';

// Mirrors ManifestKind's seven element constants (it has three more, `view`, `story` and `plateau`: manifests that are not elements,
// see "Stories" and "The plateaus of a workspace") (ASM-3a's fully-qualified vocabulary). A group is no kind any more, here and on the command line
// (issue #114): `group`, `container-group`, `solution-group` and `system-group` give the sentence of `GROUP_IS_GONE`.
const ARCHICODE_KIND_MAP = {
  component: { category: 'application', rootKind: 'component' },
  container: { category: 'application', rootKind: 'container' },
  person: { category: 'application', rootKind: 'person' },
  solution: { category: 'application', rootKind: 'solution' },
  system: { category: 'application', rootKind: 'system' },
  environment: { category: 'technology', rootKind: 'environment' },
  node: { category: 'technology', rootKind: 'node' }
};

function stripArchicodeKindPrefix(fullKind) {
  if (typeof fullKind === 'string') {
    const written = fullKind.trim().toLowerCase(); // the command line reads a kind in any case, and with spaces around it
    if (written.indexOf(ARCHICODE_KIND_PREFIX) === 0) return written.slice(ARCHICODE_KIND_PREFIX.length);
  }
  return fullKind;
}
