// A small unlayered workspace the specs write themselves (wave 023, run 0175): comments, a trailing comment, a
// single-quoted and a double-quoted string, a person and a relationship, so that a save is judged on the lines it must
// leave alone. The shipped examples are layered or bare; none has comments in the lines an edit touches.

const CORNER_SHOP = {
  '.archicode.yaml': `# The workspace of the end-to-end suite
settings:
  name: "Corner shop"
  manifests:
    paths: ["manifests"]
`,
  'manifests/shop.yaml': `# The shop, as the end-to-end suite writes it
header:
  kind: "archicode.morin.io/system"
  version: "1"
content:
  id: "shop"
  name: "Shop"
  elements:
    # the front
    - kind: "container"
      id: "web"
      name: "Web site"   # what the visitor sees
      description: "The front of the shop."
      relationships:
        - destination: "shop.catalog"
          label: "reads"
    - kind: "container"
      id: "catalog"
      name: 'Catalog'
      description: "The books on sale."   # kept
`,
  'manifests/customer.yaml': `header:
  kind: "archicode.morin.io/person"
  version: "1"
content:
  id: "customer"
  name: "Customer"
  relationships:
    - destination: "shop.web"
      label: "browses"
`
};

// The lines of `after` that are not the line at the same place in `before`, when both have as many lines; else the
// whole of `after` (a test that counts on the shape of the file sees the shape move first).
function changedLines(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length !== b.length) {
    return { lengthChanged: [a.length, b.length], lines: b };
  }
  return { lines: b.filter((line, index) => line !== a[index]) };
}

module.exports = { CORNER_SHOP, changedLines };
