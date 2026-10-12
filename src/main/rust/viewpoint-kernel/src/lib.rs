//! The ArchiCode viewpoints (overview, detailed, deep, and the focal-less map) as one pure function: a graph of references and relationships
//! goes in as JSON, the items and links of the view come out as JSON. It never sees YAML, files or the CLI.
//!
//! It mirrors io.morin.archicode.viewpoint (OverviewViewpointFactory, DetailedViewpointFactory,
//! ApplicationDeepViewpointFactory, TechnologyDeepViewpointFactory, MetaLinkFinderFor*, MetaLinkGroomer, Level), and
//! is checked against what the Java code generates (see src/test/javascript/viewpoint-kernel).
//!
//! Contract (version 2)
//!   input : { viewpoint: "overview"|"detailed"|"deep"|"map", layer: "application"|"technology", focal,
//!             default_synthetic_label, elements: [{reference, parent, applications, relationships}],
//!             app_elements (technology deep only), collapsed: [item id], expanded: [item id],
//!             facet: {name, actions: [{operator: "REMOVE", json_path}]} }
//!           an element may carry more than `reference` and the rest above (kind, name, description, qualifiers, tags):
//!           only a facet reads it, as a JSONPath can select on it
//!   output: { version, items: [{id, reference, parent, collapsed, hidden, expandable}],
//!             links: [{from, to, label, synthetic, qualifiers, tags, secondary,
//!                      relationships: [{from, destination, label, qualifiers, tags}]}] }
//!                      + warnings: [text] when there is something to say (omitted otherwise) }
//!         | { error }
//! A JSON `null` is read as "not given" wherever a field is optional (an absent `default_synthetic_label` is "uses").
//! Two relationships that differ only by their tags are two relationships: a natural link carries the tags of its
//! relationship (a grouped one has none), and links that differ by tags are never merged.
//! The deep viewpoint follows the references as paths: the deep view of `sys` covers `sys` and `sys.…`, not `sys2`.
//! Qualifiers keep the order they were declared in. `relationships` lists the declared relationships a link stands for (several when a link groups some); `collapsed`
//! items hide everything inside them, their links being re-attached to the collapsed item. In the overview and the
//! detailed viewpoints, an item flagged `expandable` has children the view does not show; listing it in `expanded`
//! shows them and the grouped links end on them (`expandable` and `expanded` were added to version 1: both optional).
//! An item is flagged only when listing it does change the view (in the map: listing it in `opened`).
//! The `map` viewpoint has no focal element: every element of the layer is in play, what is `opened` shows its
//! children, and a relationship is drawn between the boxes its two ends land on (a link per pair of boxes, grouped
//! when it stands for several). `pinned` keeps the relationships that touch one of those elements (or what is inside
//! it); `hidden` leaves out an element, what is inside it, and every relationship that reaches it. All three are
//! optional lists of references, added to version 1.
//! A `facet` is applied to the elements first, as the CLI does before it generates the views of a facet. Its paths are
//! standard JSONPath (RFC 9535), see `facet.rs`; the earlier dialect still works and is reported in `warnings`.
//!
//! A second entry point serves the CLI, which filters the JSON of the whole workspace: `apply_facet`,
//!   input : { workspace, actions: [{operator: "REMOVE", json_path}] }
//!   output: { version, workspace, warnings } | { error }
//! Version 2: the paths of a facet are standard JSONPath, `apply_facet` exists, and `warnings` may be in the output.
mod facet;

pub use facet::apply_facet_json;

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

/// Bumped when the shape of the input or output changes in a way a caller must know about.
pub const CONTRACT_VERSION: u32 = 2;

/// Qualifiers: a set — two of them are equal whatever the order — that remembers the order they were declared in,
/// because that is the order the CLI draws them in.
#[derive(Clone, Default, Deserialize)]
#[serde(from = "Vec<String>")]
struct QSet(Vec<String>);

impl Serialize for QSet {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.0.serialize(serializer)
    }
}

impl From<Vec<String>> for QSet {
    fn from(list: Vec<String>) -> QSet {
        list.into_iter().collect()
    }
}

impl FromIterator<String> for QSet {
    fn from_iter<I: IntoIterator<Item = String>>(iter: I) -> QSet {
        let mut out: Vec<String> = Vec::new();
        for q in iter {
            if !out.contains(&q) {
                out.push(q);
            }
        }
        QSet(out)
    }
}

impl QSet {
    fn iter(&self) -> std::slice::Iter<'_, String> {
        self.0.iter()
    }
    fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
    fn sorted(&self) -> Vec<&String> {
        let mut v: Vec<&String> = self.0.iter().collect();
        v.sort();
        v
    }
}

impl PartialEq for QSet {
    fn eq(&self, other: &Self) -> bool {
        self.sorted() == other.sorted()
    }
}
impl Eq for QSet {}
impl PartialOrd for QSet {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for QSet {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.sorted().cmp(&other.sorted())
    }
}

/// A field that is `null` is a field that is not given.
fn null_as_default<'de, D: serde::Deserializer<'de>, T: Deserialize<'de> + Default>(d: D) -> Result<T, D::Error> {
    Ok(Option::<T>::deserialize(d)?.unwrap_or_default())
}

fn null_as_default_label<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    Ok(Option::<String>::deserialize(d)?.unwrap_or_else(default_label))
}

#[derive(Deserialize, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct Rel {
    destination: String,
    #[serde(default)]
    label: Option<String>,
    #[serde(default, deserialize_with = "null_as_default")]
    qualifiers: QSet,
    #[serde(default, deserialize_with = "null_as_default")]
    tags: BTreeMap<String, String>,
}

#[derive(Deserialize)]
struct Elem {
    reference: String,
    /// true for elements that can contain children (Parent<?> in Java)
    #[serde(default, deserialize_with = "null_as_default")]
    parent: bool,
    /// technology nodes: references of the application elements deployed on them
    #[serde(default, deserialize_with = "null_as_default")]
    applications: Vec<String>,
    #[serde(default, deserialize_with = "null_as_default")]
    relationships: Vec<Rel>,
    /// whatever else the caller knows of the element (kind, name, description, qualifiers, tags): only a facet reads it
    #[serde(flatten)]
    other: serde_json::Map<String, serde_json::Value>,
}

#[derive(Deserialize)]
struct Input {
    viewpoint: String,
    /// every viewpoint but the map is about one element
    #[serde(default, deserialize_with = "null_as_default")]
    focal: String,
    #[serde(default = "default_label", deserialize_with = "null_as_default_label")]
    default_synthetic_label: String,
    elements: Vec<Elem>,
    /// application layer, only needed by the deep viewpoint on the technology layer
    #[serde(default, deserialize_with = "null_as_default")]
    app_elements: Vec<Elem>,
    #[serde(default, deserialize_with = "null_as_default")]
    layer: String,
    /// ids of the items to fold: everything inside them is hidden (a strict ancestor of the focal item is ignored)
    #[serde(default, deserialize_with = "null_as_default")]
    collapsed: Vec<String>,
    /// overview and detailed: ids of the items to open, so that their children are shown and the grouped links
    /// regroup under them (an item that is the focal one, or encloses it, is ignored)
    #[serde(default, deserialize_with = "null_as_default")]
    expanded: Vec<String>,
    /// a facet of the workspace's settings, applied before the viewpoint
    #[serde(default)]
    facet: Option<facet::Facet>,
    /// map: references of the elements that are open (their children are shown)
    #[serde(default, deserialize_with = "null_as_default")]
    opened: Vec<String>,
    /// map: references of the elements the view is about (none: the whole layer)
    #[serde(default, deserialize_with = "null_as_default")]
    pinned: Vec<String>,
    /// map: references of the elements left out, with what is inside them
    #[serde(default, deserialize_with = "null_as_default")]
    hidden: Vec<String>,
}

fn default_label() -> String {
    "uses".to_string()
}

/// A declared relationship, as the link it ends up in stands for it.
#[derive(Serialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
struct OutRel {
    from: String,
    destination: String,
    label: Option<String>,
    qualifiers: QSet,
    tags: BTreeMap<String, String>,
}

impl OutRel {
    fn of(from: &str, rel: &Rel) -> OutRel {
        OutRel {
            from: from.to_string(),
            destination: rel.destination.clone(),
            label: rel.label.clone(),
            qualifiers: rel.qualifiers.clone(),
            tags: rel.tags.clone(),
        }
    }
}

#[derive(Serialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
struct OutLink {
    from: String,
    to: String,
    label: Option<String>,
    synthetic: bool,
    qualifiers: QSet,
    /// the tags of the relationship of a natural link (a grouped link has none)
    tags: BTreeMap<String, String>,
    /// "rendering-secondary" tag: application links drawn between deployed applications
    secondary: bool,
    relationships: BTreeSet<OutRel>,
}

/// One box of the diagram. `id` is what links refer to; `reference` is the element behind it (they differ for the
/// application items shown inside technology nodes); `parent` is the id of the enclosing item.
#[derive(Serialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
struct OutItem {
    id: String,
    reference: String,
    parent: Option<String>,
    /// true when the item is folded and hides `hidden` items
    collapsed: bool,
    hidden: usize,
    /// true when the item has children in the model that the view does not show: it can be opened with `expanded`
    expandable: bool,
}

impl OutItem {
    fn new(id: &str, reference: &str, parent: Option<String>) -> OutItem {
        OutItem { id: id.to_string(), reference: reference.to_string(), parent, collapsed: false, hidden: 0, expandable: false }
    }
}

#[derive(Serialize)]
struct Output {
    version: u32,
    items: Vec<OutItem>,
    links: Vec<OutLink>,
    /// what the caller should know without it being an error (a facet written in a syntax that is going away)
    #[serde(skip_serializing_if = "Vec::is_empty")]
    warnings: Vec<String>,
}

// ---- Level / reference helpers (Level.java, Workspace.Utilities) ----

fn parts(r: &str) -> Vec<&str> {
    r.split('.').collect()
}
fn level_from(r: &str) -> usize {
    parts(r).len() - 1
}
/// Arrays.copyOf(parts, level + 1) joined with "." (Java pads with null).
fn down_reference_to(r: &str, level: usize) -> String {
    let p = parts(r);
    let mut out: Vec<&str> = Vec::with_capacity(level + 1);
    for i in 0..=level {
        out.push(p.get(i).copied().unwrap_or("null"));
    }
    out.join(".")
}
fn down_reference(r: &str) -> String {
    match r.rfind('.') {
        Some(i) => r[..i].to_string(),
        None => r.to_string(),
    }
}
fn starts_with_parts(actual: &[&str], expected: &[&str]) -> bool {
    actual.len() >= expected.len() && actual[..expected.len()] == *expected
}
fn is_descendant_of(candidate: &str, reference: &str) -> bool {
    let (c, r) = (parts(candidate), parts(reference));
    c.len() > r.len() && starts_with_parts(&c, &r)
}
fn is_ancestor_of(candidate: &str, reference: &str) -> bool {
    let (c, r) = (parts(candidate), parts(reference));
    c.len() < r.len() && starts_with_parts(&r, &c)
}
fn level_down(l: usize) -> usize {
    l.saturating_sub(1)
}

// ---- MetaLink / groomer ----

struct MetaLink {
    from: String,
    to: String,
    rel: Rel,
}

#[derive(Clone, Copy, PartialEq)]
enum Direction {
    Egress,
    Ingress,
}

#[derive(Default)]
struct Groomed {
    from: String,
    to: String,
    natural: BTreeSet<Rel>,
    synthetic: BTreeSet<Rel>,
    /// the same relationships, with the element that declares each of them
    natural_src: BTreeSet<OutRel>,
    synthetic_src: BTreeSet<OutRel>,
}

fn resolve_local_to(ml: &MetaLink, from_t: usize, to_t: usize) -> usize {
    if is_ancestor_of(&down_reference(&down_reference_to(&ml.from, from_t)), &ml.to) {
        return from_t;
    }
    if down_reference_to(&ml.from, 0) == down_reference_to(&ml.to, 0) {
        return level_down(from_t).max(1);
    }
    to_t
}

fn resolve_local_from(ml: &MetaLink, from_t: usize, to_t: usize) -> usize {
    if is_ancestor_of(&down_reference(&down_reference_to(&ml.to, to_t)), &ml.from) {
        return to_t;
    }
    if down_reference_to(&ml.from, 0) == down_reference_to(&ml.to, 0) {
        return level_down(to_t).max(1);
    }
    from_t
}

/// An end that was groomed up to `grouped` is brought back down one level at a time while the item it landed on is open.
fn open_down(real: &str, grouped: String, expanded: &[String], focal: &str) -> String {
    let mut out = grouped;
    while out != real
        && expanded.contains(&out)
        && out != focal
        && !is_ancestor_of(&out, focal)
    {
        out = down_reference_to(real, level_from(&out) + 1);
    }
    out
}

fn groom(metas: &[MetaLink], dir: Direction, from_t: usize, to_t: usize, expanded: &[String], focal: &str) -> Vec<Groomed> {
    let mut by_key: BTreeMap<String, Groomed> = BTreeMap::new();
    for ml in metas {
        let (mut local_from, mut local_to) = (from_t, to_t);
        match dir {
            Direction::Egress => local_to = resolve_local_to(ml, local_from, local_to),
            Direction::Ingress => local_from = resolve_local_from(ml, local_from, local_to),
        }
        let mut gfrom = ml.from.clone();
        if level_from(&ml.from) > local_from {
            gfrom = open_down(&ml.from, down_reference_to(&ml.from, local_from), expanded, focal);
        }
        let mut gto = ml.to.clone();
        if level_from(&ml.to) > local_to {
            gto = open_down(&ml.to, down_reference_to(&ml.to, local_to), expanded, focal);
        }
        let from_upper = gfrom != ml.from;
        let to_upper = gto != ml.to;
        let key = format!("{} -> {}", gfrom, gto);
        let g = by_key.entry(key).or_insert_with(|| Groomed {
            from: gfrom,
            to: gto,
            ..Default::default()
        });
        if from_upper || to_upper {
            g.synthetic.insert(ml.rel.clone());
            g.synthetic_src.insert(OutRel::of(&ml.from, &ml.rel));
        } else {
            g.natural.insert(ml.rel.clone());
            g.natural_src.insert(OutRel::of(&ml.from, &ml.rel));
        }
    }
    by_key.into_values().collect()
}

type Known<'a> = HashMap<&'a str, &'a Elem>;

fn require(known: &Known, dest: &str) -> Result<(), String> {
    if known.contains_key(dest) { Ok(()) } else { Err(format!("dangling reference: {dest}")) }
}

/// MetaLinkFinderForEgress: relationships leaving the subtree rooted at `root`.
fn find_egress(elems: &[Elem], known: &Known, root: &str) -> Result<Vec<MetaLink>, String> {
    let mut out = Vec::new();
    for e in elems {
        if e.reference == root || is_descendant_of(&e.reference, root) {
            for r in e.relationships.iter().collect::<BTreeSet<_>>() {
                if !is_descendant_of(&r.destination, root) {
                    require(known, &r.destination)?;
                    out.push(MetaLink { from: e.reference.clone(), to: r.destination.clone(), rel: r.clone() });
                }
            }
        }
    }
    Ok(out)
}

/// MetaLinkFinderForIngress: relationships coming from outside the subtree and targeting it.
fn find_ingress(elems: &[Elem], known: &Known, root: &str) -> Result<Vec<MetaLink>, String> {
    let mut out = Vec::new();
    for e in elems {
        if is_descendant_of(&e.reference, root) {
            continue;
        }
        for r in e.relationships.iter().collect::<BTreeSet<_>>() {
            if r.destination == root || is_descendant_of(&r.destination, root) {
                require(known, &r.destination)?;
                out.push(MetaLink { from: e.reference.clone(), to: r.destination.clone(), rel: r.clone() });
            }
        }
    }
    Ok(out)
}

fn with_ancestors(refs: impl IntoIterator<Item = String>) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    for r in refs {
        let p = parts(&r);
        for i in 1..=p.len() {
            out.insert(p[..i].join("."));
        }
    }
    out
}

type Content = (BTreeSet<OutItem>, BTreeSet<OutLink>);

fn to_items(refs: &BTreeSet<String>) -> BTreeSet<OutItem> {
    refs.iter()
        .map(|r| OutItem::new(r, r, r.rfind('.').map(|i| r[..i].to_string())))
        .collect()
}

/// The links of a set of groomed ends: a grouped (synthetic) pair is one link, a natural pair is one link per distinct
/// relationship. Every end is added to `refs`.
fn emit_links(groomed: &[Groomed], default_label: &str, refs: &mut Vec<String>) -> BTreeSet<OutLink> {
    let mut links: BTreeSet<OutLink> = BTreeSet::new();
    for g in groomed {
        refs.push(g.from.clone());
        refs.push(g.to.clone());
        if !g.synthetic.is_empty() {
            let qualifiers = g.synthetic.iter().flat_map(|r| r.qualifiers.iter().cloned()).collect();
            let label = if g.synthetic.len() == 1 {
                g.synthetic
                    .iter()
                    .next()
                    .and_then(|r| r.label.clone())
                    .filter(|l| !l.trim().is_empty())
                    .unwrap_or_else(|| default_label.to_string())
            } else {
                default_label.to_string()
            };
            links.insert(OutLink {
                from: g.from.clone(),
                to: g.to.clone(),
                label: Some(label),
                synthetic: true,
                qualifiers,
                tags: BTreeMap::new(),
                secondary: false,
                relationships: g.synthetic_src.clone(),
            });
        } else {
            for r in &g.natural {
                links.insert(OutLink {
                    from: g.from.clone(),
                    to: g.to.clone(),
                    label: r.label.clone(),
                    synthetic: false,
                    qualifiers: r.qualifiers.clone(),
                    tags: r.tags.clone(),
                    secondary: false,
                    relationships: g
                        .natural_src
                        .iter()
                        .filter(|o| o.destination == r.destination && o.label == r.label && o.qualifiers == r.qualifiers && o.tags == r.tags)
                        .cloned()
                        .collect(),
                });
            }
        }
    }
    links
}

/// OverviewViewpointFactory
fn overview(input: &Input, known: &Known, focal: &str) -> Result<Content, String> {
    require(known, focal)?;
    let egress = find_egress(&input.elements, known, focal)?;
    let ingress = find_ingress(&input.elements, known, focal)?;
    let focal_level = level_from(focal);
    let mut groomed = groom(&egress, Direction::Egress, focal_level, 0, &input.expanded, focal);
    groomed.extend(groom(&ingress, Direction::Ingress, 0, focal_level, &input.expanded, focal));

    let mut refs = vec![focal.to_string()];
    let links = emit_links(&groomed, &input.default_synthetic_label, &mut refs);
    let item_refs = with_ancestors(refs);
    for r in &item_refs {
        require(known, r)?;
    }
    Ok((to_items(&item_refs), links))
}

/// The map: no focal element, every element of the layer is in play. An element is open when `opened` lists it (or it
/// encloses a pinned element); a relationship ends on the first closed element met going down from the root, so
/// opening an element splits the links that reached it among its children.
fn map(input: &Input, known: &Known) -> Result<Content, String> {
    for reference in input.pinned.iter().chain(input.opened.iter()).chain(input.hidden.iter()) {
        require(known, reference)?;
    }
    let opened: HashSet<&str> = input.opened.iter().map(String::as_str).collect();
    let within = |x: &str, roots: &[String]| roots.iter().any(|r| x == r || is_descendant_of(x, r));
    let is_hidden = |x: &str| within(x, &input.hidden);
    let in_pinned = |x: &str| within(x, &input.pinned);
    let open = |node: &str| opened.contains(node) || input.pinned.iter().any(|p| is_ancestor_of(node, p));
    let visible = |e: &str| -> bool {
        let p = parts(e);
        !is_hidden(e) && (1..p.len()).all(|i| open(&p[..i].join(".")))
    };
    let project = |e: &str| -> String {
        let p = parts(e);
        let mut cur = p[0].to_string();
        for i in 1..p.len() {
            if !open(&cur) {
                break;
            }
            cur = p[..=i].join(".");
        }
        cur
    };

    let mut by_key: BTreeMap<String, Groomed> = BTreeMap::new();
    for e in &input.elements {
        for r in e.relationships.iter().collect::<BTreeSet<_>>() {
            if is_hidden(&e.reference) || is_hidden(&r.destination) {
                continue;
            }
            if !input.pinned.is_empty() && !(in_pinned(&e.reference) || in_pinned(&r.destination)) {
                continue;
            }
            require(known, &r.destination)?;
            let (from, to) = (project(&e.reference), project(&r.destination));
            if from == to {
                continue; // inside a closed element
            }
            let grouped = from != e.reference || to != r.destination;
            let g = by_key.entry(format!("{} -> {}", from, to)).or_insert_with(|| Groomed { from: from.clone(), to: to.clone(), ..Default::default() });
            if grouped {
                g.synthetic.insert(r.clone());
                g.synthetic_src.insert(OutRel::of(&e.reference, r));
            } else {
                g.natural.insert(r.clone());
                g.natural_src.insert(OutRel::of(&e.reference, r));
            }
        }
    }
    let groomed: Vec<Groomed> = by_key.into_values().collect();
    let mut refs: Vec<String> = Vec::new();
    let links = emit_links(&groomed, &input.default_synthetic_label, &mut refs);
    if input.pinned.is_empty() {
        refs.extend(input.elements.iter().filter(|e| visible(&e.reference)).map(|e| e.reference.clone()));
    } else {
        refs.extend(input.pinned.iter().cloned());
        // the children of what is open inside a pinned element are all shown, linked or not
        refs.extend(input.elements.iter().filter(|e| in_pinned(&e.reference) && visible(&e.reference)).map(|e| e.reference.clone()));
    }
    let item_refs: BTreeSet<String> = with_ancestors(refs).into_iter().filter(|r| !is_hidden(r)).collect();
    for r in &item_refs {
        require(known, r)?;
    }
    Ok((to_items(&item_refs), links))
}

/// DetailedViewpointFactory: the union of the overview of every direct child of the focal parent.
fn detailed(input: &Input, known: &Known) -> Result<Content, String> {
    let focal = input.focal.as_str();
    let focal_elem = known.get(focal).ok_or_else(|| format!("unknown focal element: {focal}"))?;
    if !focal_elem.parent {
        return Err(format!("the element {focal} is not a parent one"));
    }
    let mut items = BTreeSet::new();
    let mut links = BTreeSet::new();
    for e in &input.elements {
        if is_descendant_of(&e.reference, focal) && down_reference(&e.reference) == focal {
            let (i, l) = overview(input, known, &e.reference)?;
            items.extend(i);
            links.extend(l);
        }
    }
    Ok((items, links))
}

/// Deep viewpoint (application layer): every relationship touching the focal subtree, no grooming.
fn deep(input: &Input, known: &Known) -> Result<(Content, Vec<String>), String> {
    let focal = input.focal.as_str();
    require(known, focal)?;
    let mut metas = Vec::new();
    for e in &input.elements {
        if e.reference == focal || is_descendant_of(&e.reference, focal) {
            metas.extend(find_egress(&input.elements, known, &e.reference)?);
            metas.extend(find_ingress(&input.elements, known, &e.reference)?);
        }
    }
    let mut refs = vec![focal.to_string()];
    let mut links = BTreeSet::new();
    for m in &metas {
        refs.push(m.from.clone());
        refs.push(m.to.clone());
        links.insert(OutLink {
            from: m.from.clone(),
            to: m.to.clone(),
            label: m.rel.label.clone(),
            synthetic: false,
            qualifiers: m.rel.qualifiers.clone(),
            tags: m.rel.tags.clone(),
            secondary: false,
            relationships: BTreeSet::from([OutRel::of(&m.from, &m.rel)]),
        });
    }
    let item_refs = with_ancestors(refs);
    for r in &item_refs {
        require(known, r)?;
    }
    let node_refs: Vec<String> = item_refs.iter().cloned().collect();
    Ok(((to_items(&item_refs), links), node_refs))
}

/// TechnologyDeepViewpointFactory: the deep viewpoint plus the applications deployed on the nodes, linked together
/// with "secondary" links when one application has a relationship towards another deployed one.
fn deep_technology(input: &Input, known: &Known) -> Result<Content, String> {
    let ((mut items, mut links), tech_refs) = deep(input, known)?;
    let app_known: Known = input.app_elements.iter().map(|e| (e.reference.as_str(), e)).collect();
    // (node, application, id) of the application items to create, one per hosting node and deployed application. The id
    // is the last segment of the node and the application, unless that reads the same for several of them (or for a
    // node of the view): they are then all named after the whole path of their node.
    let mut deployed: Vec<(&String, &String, String)> = Vec::new();
    for r in &tech_refs {
        let node = known.get(r.as_str()).ok_or_else(|| format!("dangling reference: {r}"))?;
        let node_id = parts(r).last().copied().unwrap_or("");
        for app in node.applications.iter().collect::<BTreeSet<_>>() {
            if !app_known.contains_key(app.as_str()) {
                return Err(format!("dangling application reference: {app}"));
            }
            deployed.push((r, app, format!("{}_{}", node_id, app.replace('.', "_"))));
        }
    }
    let mut taken: HashSet<String> = items.iter().map(|i| i.id.clone()).collect();
    let uses = |id: &str| deployed.iter().filter(|(_, _, short)| short == id).count();
    // application reference -> ids of the items created for it (one per hosting node)
    let mut by_app: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for (r, app, short) in &deployed {
        let mut item_id = short.clone();
        if uses(short) > 1 || taken.contains(short) {
            item_id = format!("{}_{}", r.replace('.', "_"), app.replace('.', "_"));
        }
        let base = item_id.clone();
        let mut n = 1;
        while !taken.insert(item_id.clone()) {
            n += 1;
            item_id = format!("{base}_{n}");
        }
        items.insert(OutItem::new(&item_id, app, Some((*r).clone())));
        by_app.entry((*app).clone()).or_default().push(item_id);
    }
    for (app, from_ids) in &by_app {
        let app_elem = app_known.get(app.as_str()).ok_or_else(|| format!("dangling application reference: {app}"))?;
        for from_id in from_ids {
            for rel in app_elem.relationships.iter().collect::<BTreeSet<_>>() {
                if let Some(to_ids) = by_app.get(&rel.destination) {
                    for to_id in to_ids {
                        links.insert(OutLink {
                            from: from_id.clone(),
                            to: to_id.clone(),
                            label: None,
                            synthetic: false,
                            qualifiers: QSet::default(),
                            tags: rel.tags.clone(),
                            secondary: true,
                            relationships: BTreeSet::from([OutRel::of(app, rel)]),
                        });
                    }
                }
            }
        }
    }
    Ok((items, links))
}

/// Two links that look the same (same ends, caption and kind) are one link standing for all their relationships.
fn merge_links(links: impl IntoIterator<Item = OutLink>) -> Vec<OutLink> {
    type Key = (String, String, Option<String>, bool, QSet, BTreeMap<String, String>, bool);
    let mut merged: BTreeMap<Key, OutLink> = BTreeMap::new();
    for l in links {
        let key = (l.from.clone(), l.to.clone(), l.label.clone(), l.synthetic, l.qualifiers.clone(), l.tags.clone(), l.secondary);
        match merged.get_mut(&key) {
            Some(existing) => existing.relationships.extend(l.relationships),
            None => {
                merged.insert(key, l);
            }
        }
    }
    merged.into_values().collect()
}

/// Folds the items listed in `input.collapsed`: what is inside them disappears and the links that reached inside now
/// reach the folded item, as one grouped link per pair of ends (the caption rule of a grouped link applies).
fn collapse(items: BTreeSet<OutItem>, links: Vec<OutLink>, input: &Input) -> (Vec<OutItem>, Vec<OutLink>) {
    if input.collapsed.is_empty() {
        return (items.into_iter().collect(), links);
    }
    let parent_of: HashMap<String, Option<String>> = items.iter().map(|i| (i.id.clone(), i.parent.clone())).collect();
    // the focal item must stay visible: a fold on one of its enclosing items is ignored
    let mut protected: HashSet<String> = HashSet::new();
    let mut cur = parent_of.get(&input.focal).cloned().flatten();
    while let Some(p) = cur {
        protected.insert(p.clone());
        cur = parent_of.get(&p).cloned().flatten();
    }
    let folded: HashSet<&String> = input.collapsed.iter().filter(|c| parent_of.contains_key(*c) && !protected.contains(*c)).collect();
    // the outermost folded item at or above `id`, or `id` itself
    let rep = |id: &str| -> String {
        let mut out = id.to_string();
        let mut cur = Some(id.to_string());
        while let Some(c) = cur {
            if folded.contains(&c) {
                out = c.clone();
            }
            cur = parent_of.get(&c).cloned().flatten();
        }
        out
    };
    let mut hidden: HashMap<String, usize> = HashMap::new();
    let mut kept = Vec::new();
    for item in items {
        let r = rep(&item.id);
        if r == item.id {
            kept.push(item);
        } else {
            *hidden.entry(r).or_default() += 1;
        }
    }
    for item in kept.iter_mut() {
        if let Some(n) = hidden.get(&item.id) {
            item.collapsed = true;
            item.hidden = *n;
        }
    }

    let mut groups: BTreeMap<(String, String), Vec<(OutLink, bool)>> = BTreeMap::new();
    for l in links {
        let (f, t) = (rep(&l.from), rep(&l.to));
        let remapped = f != l.from || t != l.to;
        if remapped && f == t {
            continue; // now inside a folded item
        }
        groups.entry((f, t)).or_default().push((l, remapped));
    }
    let mut out = Vec::new();
    for ((f, t), group) in groups {
        if !group.iter().any(|(_, remapped)| *remapped) {
            out.extend(group.into_iter().map(|(l, _)| l));
            continue;
        }
        let relationships: BTreeSet<OutRel> = group.iter().flat_map(|(l, _)| l.relationships.iter().cloned()).collect();
        let qualifiers: QSet = group.iter().flat_map(|(l, _)| l.qualifiers.iter().cloned()).collect();
        // like the overview: relationships that read the same (whoever declares them) count once
        let distinct: BTreeSet<(&String, &Option<String>, &QSet, &BTreeMap<String, String>)> =
            relationships.iter().map(|r| (&r.destination, &r.label, &r.qualifiers, &r.tags)).collect();
        let label = if distinct.len() == 1 {
            relationships.iter().next().and_then(|r| r.label.clone()).filter(|l| !l.trim().is_empty())
        } else {
            None
        }
        .unwrap_or_else(|| input.default_synthetic_label.clone());
        out.push(OutLink {
            from: f,
            to: t,
            label: Some(label),
            synthetic: true,
            qualifiers,
            tags: BTreeMap::new(),
            secondary: group.iter().all(|(l, _)| l.secondary),
            relationships,
        });
    }
    (kept, merge_links(out))
}

/// The view of the input: the viewpoint, then the folds.
fn build(input: &Input) -> Result<(Vec<OutItem>, Vec<OutLink>), String> {
    let known: Known = input.elements.iter().map(|e| (e.reference.as_str(), e)).collect();
    let (items, links) = match input.viewpoint.as_str() {
        "overview" => overview(input, &known, &input.focal),
        "map" => map(input, &known),
        "detailed" => detailed(input, &known),
        "deep" if input.layer == "technology" => deep_technology(input, &known),
        "deep" => deep(input, &known).map(|(c, _)| c),
        other => Err(format!("unsupported viewpoint: {other}")),
    }?;
    Ok(collapse(items, merge_links(links), input))
}

/// Flags the items that hide children of the model, and whose opening changes the view: a leaf of the view whose element
/// has children, that is not folded. Whether opening it (`expanded`, or `opened` in the map) changes anything is asked
/// to the view itself, so that a box is never offered when the focal element, a fold or the links make it a no-op.
fn mark_expandable(items: &mut [OutItem], links: &[OutLink], input: &mut Input) {
    let with_children: HashSet<String> = input.elements.iter().filter(|e| e.reference.contains('.')).map(|e| down_reference(&e.reference)).collect();
    let shown_parents: HashSet<String> = items.iter().filter_map(|i| i.parent.clone()).collect();
    let map = input.viewpoint == "map";
    let shown: Vec<OutItem> = items.to_vec();
    for item in items.iter_mut() {
        if item.collapsed || item.id != item.reference || !with_children.contains(&item.id) || shown_parents.contains(&item.id) {
            continue;
        }
        let opened = if map { &mut input.opened } else { &mut input.expanded };
        opened.push(item.id.clone());
        let opens = build(input);
        let opened = if map { &mut input.opened } else { &mut input.expanded };
        opened.pop();
        item.expandable = matches!(opens, Ok((i, l)) if i != shown || l != links);
    }
}

pub fn compute_json(input: &str) -> String {
    let result = serde_json::from_str::<Input>(input)
        .map_err(|e| format!("invalid input: {e}"))
        .and_then(|mut input| {
            let warnings = match input.facet.take() {
                Some(facet) => facet::apply_to_input(&mut input, &facet)?,
                None => Vec::new(),
            };
            let (mut items, links) = build(&input)?;
            if input.viewpoint != "deep" {
                mark_expandable(&mut items, &links, &mut input);
            }
            Ok(Output { version: CONTRACT_VERSION, items, links, warnings })
        })
        .and_then(|out| serde_json::to_string(&out).map_err(|e| format!("cannot write the view: {e}")));
    result.unwrap_or_else(|e| serde_json::json!({ "error": e }).to_string())
}

// ---- tiny C ABI, usable from any host (browser, Node, Chicory) without glue code ----

static mut RESULT: Vec<u8> = Vec::new();

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut buf = Vec::<u8>::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    drop(Vec::from_raw_parts(ptr, 0, len));
}

/// Runs `f` on `len` bytes of UTF-8 JSON at `ptr`; the result is read back with `result_ptr` and the length returned.
unsafe fn respond(ptr: *const u8, len: usize, f: fn(&str) -> String) -> usize {
    let bytes = std::slice::from_raw_parts(ptr, len);
    let out = match std::str::from_utf8(bytes) {
        Ok(s) => f(s),
        Err(_) => r#"{"error":"input is not UTF-8"}"#.to_string(),
    };
    #[allow(static_mut_refs)]
    {
        RESULT = out.into_bytes();
        RESULT.len()
    }
}

/// The viewpoint kernel: see `compute_json`.
#[no_mangle]
pub unsafe extern "C" fn compute(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, compute_json)
}

/// The facets: see `apply_facet_json`.
#[no_mangle]
pub unsafe extern "C" fn apply_facet(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, apply_facet_json)
}

#[no_mangle]
pub unsafe extern "C" fn result_ptr() -> *const u8 {
    #[allow(static_mut_refs)]
    RESULT.as_ptr()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};

    /// sys{a, b}, other{b{c}}, ext. a -calls-> other.b.c, a -feeds-> b, b -calls-> other.b.c, ext -pushes-> b.
    fn run(viewpoint: &str, focal: &str, collapsed: &[&str]) -> Value {
        let rel = |dest: &str, label: &str| json!({ "destination": dest, "label": label });
        let input = json!({
            "viewpoint": viewpoint, "layer": "application", "focal": focal, "collapsed": collapsed,
            "elements": [
                { "reference": "sys", "parent": true },
                { "reference": "sys.a", "relationships": [rel("other.b.c", "calls"), rel("sys.b", "feeds")] },
                { "reference": "sys.b", "relationships": [rel("other.b.c", "calls")] },
                { "reference": "other", "parent": true },
                { "reference": "other.b", "parent": true },
                { "reference": "other.b.c" },
                { "reference": "ext", "relationships": [rel("sys.b", "pushes")] }
            ]
        });
        serde_json::from_str(&compute_json(&input.to_string())).unwrap()
    }

    fn link<'a>(out: &'a Value, from: &str, to: &str) -> Option<&'a Value> {
        out["links"].as_array().unwrap().iter().find(|l| l["from"] == from && l["to"] == to)
    }

    fn ids(out: &Value) -> Vec<String> {
        out["items"].as_array().unwrap().iter().map(|i| i["id"].as_str().unwrap().to_string()).collect()
    }

    #[test]
    fn output_carries_the_contract_version() {
        assert_eq!(run("overview", "sys.a", &[])["version"], CONTRACT_VERSION);
    }

    #[test]
    fn overview_groups_a_link_under_the_nearest_visible_element() {
        let out = run("overview", "sys.a", &[]);
        let l = link(&out, "sys.a", "other").expect("a grouped link towards other");
        assert_eq!(l["synthetic"], true);
        assert_eq!(l["label"], "calls");
        assert_eq!(l["relationships"].as_array().unwrap().len(), 1);
        assert_eq!(l["relationships"][0]["destination"], "other.b.c");
    }

    #[test]
    fn a_grouped_link_lists_every_relationship_it_stands_for() {
        let out = run("overview", "sys", &[]);
        let l = link(&out, "sys", "other").expect("sys groups what its children send to other");
        assert_eq!(l["label"], "calls", "identical relationships count once, as in Java");
        assert_eq!(l["relationships"].as_array().unwrap().len(), 2, "but the two declaring elements are both listed");
    }

    #[test]
    fn deep_keeps_every_relationship_ungrouped() {
        let out = run("deep", "sys", &[]);
        assert!(link(&out, "sys.a", "sys.b").is_some() && link(&out, "sys.a", "other.b.c").is_some() && link(&out, "ext", "sys.b").is_some());
        assert_eq!(ids(&out), ["ext", "other", "other.b", "other.b.c", "sys", "sys.a", "sys.b"]);
    }

    #[test]
    fn folding_hides_the_inside_and_regroups_the_links() {
        let out = run("deep", "sys", &["sys"]);
        assert_eq!(ids(&out), ["ext", "other", "other.b", "other.b.c", "sys"]);
        let sys = out["items"].as_array().unwrap().iter().find(|i| i["id"] == "sys").unwrap();
        assert_eq!((sys["collapsed"].as_bool(), sys["hidden"].as_u64()), (Some(true), Some(2)));
        assert!(link(&out, "sys.a", "sys.b").is_none(), "a link that is now inside the folded item disappears");
        let l = link(&out, "sys", "other.b.c").expect("links that reached inside now reach the folded item");
        assert_eq!(l["synthetic"], true);
        assert_eq!(l["label"], "calls");
        assert!(link(&out, "ext", "sys").is_some());
    }

    #[test]
    fn folding_an_element_that_encloses_the_focal_one_is_ignored() {
        let out = run("deep", "sys.a", &["sys"]);
        assert!(ids(&out).contains(&"sys.a".to_string()));
    }

    fn run_expanded(focal: &str, expanded: &[&str]) -> Value {
        let mut input: Value = serde_json::from_str(&run_input(focal)).unwrap();
        input["expanded"] = json!(expanded);
        serde_json::from_str(&compute_json(&input.to_string())).unwrap()
    }

    fn run_input(focal: &str) -> String {
        let rel = |dest: &str, label: &str| json!({ "destination": dest, "label": label });
        json!({
            "viewpoint": "overview", "layer": "application", "focal": focal,
            "elements": [
                { "reference": "sys", "parent": true },
                { "reference": "sys.a", "relationships": [rel("other.b.c", "calls"), rel("sys.b", "feeds")] },
                { "reference": "sys.b", "relationships": [rel("other.b.c", "calls")] },
                { "reference": "other", "parent": true },
                { "reference": "other.b", "parent": true },
                { "reference": "other.b.c" },
                { "reference": "ext", "relationships": [rel("sys.b", "pushes")] }
            ]
        })
        .to_string()
    }

    #[test]
    fn an_item_with_hidden_children_says_it_can_be_opened() {
        let out = run_expanded("sys.a", &[]);
        let other = out["items"].as_array().unwrap().iter().find(|i| i["id"] == "other").unwrap();
        assert_eq!(other["expandable"], true);
        let focal = out["items"].as_array().unwrap().iter().find(|i| i["id"] == "sys.a").unwrap();
        assert_eq!(focal["expandable"], false);
    }

    #[test]
    fn opening_an_item_shows_its_children_and_regroups_the_links_under_them() {
        let out = run_expanded("sys.a", &["other"]);
        assert!(ids(&out).contains(&"other.b".to_string()));
        assert!(link(&out, "sys.a", "other").is_none());
        let l = link(&out, "sys.a", "other.b").expect("the link now ends on the child");
        assert_eq!(l["synthetic"], true);
        // one more level, and the link reaches the element itself: it is a natural link again
        let out = run_expanded("sys.a", &["other", "other.b"]);
        let l = link(&out, "sys.a", "other.b.c").expect("the link ends on the element");
        assert_eq!(l["synthetic"], false);
        assert_eq!(l["label"], "calls");
    }

    #[test]
    fn opening_the_focal_item_or_one_that_encloses_it_changes_nothing() {
        let base = ids(&run_expanded("sys.a", &[]));
        assert_eq!(ids(&run_expanded("sys.a", &["sys.a", "sys"])), base);
        let out = run_expanded("sys", &[]);
        let sys = out["items"].as_array().unwrap().iter().find(|i| i["id"] == "sys").unwrap();
        assert_eq!(sys["expandable"], false);
    }

    #[test]
    fn folding_an_unrelated_or_unknown_item_changes_nothing() {
        let plain = run("deep", "sys", &[]);
        assert_eq!(run("deep", "sys", &["nope"])["links"], plain["links"]);
    }

    #[test]
    fn mistakes_are_reported_not_thrown() {
        assert!(run("detailed", "sys.a", &[])["error"].as_str().unwrap().contains("not a parent"));
        assert!(run("overview", "ghost", &[])["error"].as_str().unwrap().contains("ghost"));
        assert!(run("sideways", "sys", &[])["error"].as_str().unwrap().contains("unsupported viewpoint"));
        assert!(compute_json("{").contains("invalid input"));
    }

    fn with_facet(viewpoint: &str, focal: &str, layer: &str, actions: Value) -> Value {
        let rel = |dest: &str, label: &str, q: &[&str]| json!({ "destination": dest, "label": label, "qualifiers": q });
        let input = json!({
            "viewpoint": viewpoint, "layer": layer, "focal": focal, "facet": { "name": "f", "actions": actions },
            "elements": [
                { "reference": "a", "relationships": [rel("b", "reads", &["REST"]), rel("b", "writes", &["JDBC"]), json!({ "destination": "b" })] },
                { "reference": "b" }
            ]
        });
        serde_json::from_str(&compute_json(&input.to_string())).unwrap()
    }

    fn labels(out: &Value) -> Vec<Option<String>> {
        out["links"].as_array().unwrap().iter().map(|l| l["label"].as_str().map(String::from)).collect()
    }

    fn remove(path: &str) -> Value {
        json!([{ "operator": "REMOVE", "json_path": path }])
    }

    #[test]
    fn a_facet_removes_the_relationships_its_filter_matches() {
        let out = with_facet("deep", "a", "application", remove("$.application..relationships[?(@.qualifiers anyof ['REST', 'x'])]"));
        assert_eq!(labels(&out), [None, Some("writes".to_string())]);
    }

    #[test]
    fn noneof_spares_a_relationship_without_qualifiers_and_null_removes_it() {
        let out = with_facet("deep", "a", "application", remove("$.application..relationships[?(@.qualifiers noneof ['REST'])]"));
        assert_eq!(labels(&out), [None, Some("reads".to_string())]);
        let out = with_facet("deep", "a", "application", remove("$.application..relationships[?(@.qualifiers == null)]"));
        assert_eq!(labels(&out), [Some("reads".to_string()), Some("writes".to_string())]);
    }

    #[test]
    fn a_facet_can_filter_on_the_label_and_target_a_layer() {
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(@.label == 'writes')]"));
        assert_eq!(out["links"].as_array().unwrap().len(), 2);
        let out = with_facet("deep", "a", "application", remove("$.technology..relationships[?(@.label == 'writes')]"));
        assert_eq!(out["links"].as_array().unwrap().len(), 3, "an action aimed at the other layer changes nothing");
    }

    #[test]
    fn a_facet_can_filter_on_a_tag() {
        let input = |path: &str| {
            json!({
                "viewpoint": "deep", "layer": "application", "focal": "a",
                "facet": { "name": "f", "actions": remove(path) },
                "elements": [
                    { "reference": "a", "relationships": [
                        { "destination": "b", "label": "yes", "tags": { "authn-enforcer-point": "yes" } },
                        { "destination": "b", "label": "no", "tags": { "authn-enforcer-point": "no" } },
                        { "destination": "b", "label": "none" },
                        { "destination": "b", "label": "other", "tags": { "k": "yes" } }
                    ] },
                    { "reference": "b" }
                ]
            })
        };
        let run = |path: &str| -> Vec<String> {
            let out: Value = serde_json::from_str(&compute_json(&input(path).to_string())).unwrap();
            assert!(out.get("error").is_none(), "{path}: {out}");
            let mut l: Vec<String> = labels(&out).into_iter().flatten().collect();
            l.sort();
            l
        };
        assert_eq!(run("$..relationships[?(@.tags['authn-enforcer-point'] == 'yes')]"), ["no", "none", "other"]);
        assert_eq!(run("$..relationships[?(@.tags[\"authn-enforcer-point\"] != 'yes')]"), ["yes"]);
        assert_eq!(run("$..relationships[?(@.tags.k == 'yes')]"), ["no", "none", "yes"]);
    }

    #[test]
    fn what_a_facet_cannot_do_is_an_error_not_a_guess() {
        for path in ["$.application..relationships[?(@.label =~ /x/)]", "$..relationships[?(@.label == ", "relationships", "$..relationships[?(@.label == 'x' ||)]"] {
            let out = with_facet("deep", "a", "application", remove(path));
            assert!(error(&out).contains("invalid facet JSONPath"), "{path}: {out}");
        }
        let out = with_facet("deep", "a", "application", json!([{ "operator": "KEEP", "json_path": "$..relationships[?(@.label == 'x')]" }]));
        assert!(error(&out).contains("unsupported facet action: KEEP"));
        let out = with_facet("deep", "a", "application", remove("$"));
        assert!(error(&out).contains("whole workspace"), "{out}");
    }

    #[test]
    fn qualifiers_keep_the_order_they_were_declared_in() {
        let input = json!({
            "viewpoint": "deep", "layer": "application", "focal": "a",
            "elements": [
                { "reference": "a", "relationships": [{ "destination": "b", "qualifiers": ["UDP:8080", "HTTPs:443", "UDP:8080"] }] },
                { "reference": "b" }
            ]
        });
        let out: Value = serde_json::from_str(&compute_json(&input.to_string())).unwrap();
        assert_eq!(out["links"][0]["qualifiers"], json!(["UDP:8080", "HTTPs:443"]), "declared order, no duplicate");
    }

    #[test]
    fn detailed_combines_the_overview_of_each_child() {
        let out = run("detailed", "sys", &[]);
        assert!(link(&out, "sys.a", "other").is_some() && link(&out, "sys.b", "other").is_some() && link(&out, "ext", "sys.b").is_some());
    }

    /// The same elements as `run`, through the map.
    fn map_of(opened: &[&str], pinned: &[&str], hidden: &[&str]) -> Value {
        let rel = |dest: &str, label: &str| json!({ "destination": dest, "label": label });
        let input = json!({
            "viewpoint": "map", "layer": "application", "opened": opened, "pinned": pinned, "hidden": hidden,
            "elements": [
                { "reference": "sys", "parent": true },
                { "reference": "sys.a", "relationships": [rel("other.b.c", "calls"), rel("sys.b", "feeds")] },
                { "reference": "sys.b", "relationships": [rel("other.b.c", "calls")] },
                { "reference": "other", "parent": true },
                { "reference": "other.b", "parent": true },
                { "reference": "other.b.c" },
                { "reference": "ext", "relationships": [rel("sys.b", "pushes")] }
            ]
        });
        serde_json::from_str(&compute_json(&input.to_string())).unwrap()
    }

    fn represented(out: &Value) -> usize {
        out["links"].as_array().unwrap().iter().map(|l| l["relationships"].as_array().unwrap().len()).sum()
    }

    #[test]
    fn the_map_starts_closed_and_groups_what_is_inside() {
        let out = map_of(&[], &[], &[]);
        assert_eq!(ids(&out), ["ext", "other", "sys"]);
        assert_eq!(link(&out, "sys", "other").expect("what sys sends to other")["synthetic"], true);
        assert!(link(&out, "ext", "sys").is_some());
        assert_eq!(out["links"].as_array().unwrap().len(), 2, "what stays inside sys is not drawn");
        let sys = out["items"].as_array().unwrap().iter().find(|i| i["id"] == "sys").unwrap();
        assert_eq!(sys["expandable"], true, "a closed element with children can be opened");
    }

    #[test]
    fn opening_an_element_shows_its_children_and_splits_the_links() {
        let out = map_of(&["sys"], &[], &[]);
        assert_eq!(ids(&out), ["ext", "other", "sys", "sys.a", "sys.b"]);
        assert_eq!(link(&out, "sys.a", "sys.b").unwrap()["synthetic"], false);
        assert!(link(&out, "sys.a", "other").is_some() && link(&out, "sys.b", "other").is_some() && link(&out, "ext", "sys.b").is_some());
        assert!(link(&out, "sys", "other").is_none());
        let deeper = map_of(&["sys", "other", "other.b"], &[], &[]);
        assert_eq!(link(&deeper, "sys.a", "other.b.c").unwrap()["synthetic"], false, "opened all the way down, nothing is grouped");
    }

    #[test]
    fn opening_never_loses_a_relationship_it_only_moves_it() {
        // 4 declared relationships, one of them (sys.a -> sys.b) inside sys: drawn only once sys is open
        assert_eq!(represented(&map_of(&[], &[], &[])), 3);
        assert_eq!(represented(&map_of(&["sys"], &[], &[])), 4);
        assert_eq!(represented(&map_of(&["sys", "other", "other.b"], &[], &[])), 4);
    }

    #[test]
    fn pinning_keeps_what_touches_the_pinned_element_and_opens_what_encloses_it() {
        let out = map_of(&[], &["sys.a"], &[]);
        assert_eq!(ids(&out), ["other", "sys", "sys.a", "sys.b"]);
        assert!(link(&out, "sys.a", "other").is_some() && link(&out, "sys.a", "sys.b").is_some());
        assert!(link(&out, "ext", "sys.b").is_none(), "ext does not touch sys.a");
    }

    #[test]
    fn pinning_one_element_with_nothing_open_is_its_overview() {
        let key = |out: &Value| {
            let mut v: Vec<String> = out["links"].as_array().unwrap().iter()
                .map(|l| format!("{}|{}|{}|{}", l["from"], l["to"], l["label"], l["synthetic"])).collect();
            v.sort();
            (ids(out), v)
        };
        for focal in ["sys.a", "sys.b", "other.b.c", "ext"] {
            assert_eq!(key(&map_of(&[], &[focal], &[])), key(&run("overview", focal, &[])), "{focal}");
        }
    }

    #[test]
    fn a_hidden_element_takes_its_relationships_with_it() {
        let out = map_of(&["sys"], &[], &["other"]);
        assert_eq!(ids(&out), ["ext", "sys", "sys.a", "sys.b"]);
        assert_eq!(out["links"].as_array().unwrap().len(), 2);
        assert_eq!(ids(&map_of(&["sys"], &[], &["sys.a"])), ["ext", "other", "sys", "sys.b"]);
    }

    #[test]
    fn the_map_refuses_a_reference_it_does_not_know() {
        assert!(map_of(&[], &["nope"], &[])["error"].as_str().unwrap().contains("nope"));
    }

    fn compute(input: Value) -> Value {
        serde_json::from_str(&compute_json(&input.to_string())).unwrap()
    }

    fn item<'a>(out: &'a Value, id: &str) -> &'a Value {
        out["items"].as_array().unwrap().iter().find(|i| i["id"] == id).unwrap_or_else(|| panic!("no item {id} in {out}"))
    }

    fn error(out: &Value) -> &str {
        out["error"].as_str().unwrap_or_else(|| panic!("expected an error, got {out}"))
    }

    // ---- standard JSONPath: what the first dialect could not say ----

    #[test]
    fn a_compound_facet_filter_is_evaluated() {
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(@.label == 'reads' || @.label == 'writes')]"));
        assert_eq!(labels(&out), [None]);
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(@.label == 'reads' && @.label == 'writes')]"));
        assert_eq!(out["links"].as_array().unwrap().len(), 3, "nothing is both");
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(!@.label || @.label == 'writes')]"));
        assert_eq!(labels(&out), [Some("reads".to_string())]);
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(@.qualifiers[?(@ == 'REST')] || @.label == 'writes')]"));
        assert_eq!(labels(&out), [None]);
    }

    #[test]
    fn a_facet_can_remove_an_element_and_what_points_at_it_is_then_dangling() {
        let out = with_facet("deep", "a", "application", remove("$.application.elements[?(@.id == 'b')]"));
        assert_eq!(error(&out), "dangling reference: b");
        let out = with_facet("deep", "a", "application", remove("$.application.elements[?(@.id == 'a')]"));
        assert!(!error(&out).is_empty(), "the focal element is gone: {out}");
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(length(@.qualifiers) == 1)]"));
        assert_eq!(labels(&out), [None], "functions are available: only the relationship without qualifiers is left");
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(match(@.label, 'r.*'))]"));
        assert!(error(&out).contains("invalid facet JSONPath"), "regular expressions are left out of the module: {out}");
    }

    #[test]
    fn an_operator_inside_a_quoted_literal_is_part_of_the_literal() {
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(@.label == 'reads || writes')]"));
        assert_eq!(out["links"].as_array().unwrap().len(), 3, "nothing is called like that: nothing is removed");
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(@.label == \"reads\")]"));
        assert_eq!(labels(&out), [None, Some("writes".to_string())]);
    }

    // ---- hostile or inconsistent input ----

    #[test]
    fn the_deep_viewpoint_of_the_technology_layer_reports_a_missing_ancestor() {
        let out = compute(json!({
            "viewpoint": "deep", "layer": "technology", "focal": "n.m",
            "elements": [{ "reference": "n.m" }], "app_elements": []
        }));
        assert_eq!(error(&out), "dangling reference: n");
        // the same for the application layer, and for a node that hosts an application nobody declared
        let out = compute(json!({ "viewpoint": "deep", "layer": "application", "focal": "n.m", "elements": [{ "reference": "n.m" }] }));
        assert_eq!(error(&out), "dangling reference: n");
        let out = compute(json!({
            "viewpoint": "deep", "layer": "technology", "focal": "n",
            "elements": [{ "reference": "n", "applications": ["ghost"] }], "app_elements": []
        }));
        assert_eq!(error(&out), "dangling application reference: ghost");
    }

    #[test]
    fn inconsistent_references_are_errors_whatever_the_viewpoint() {
        let elements = json!([{ "reference": "a.b", "relationships": [{ "destination": "z" }] }, { "reference": "a" }]);
        for viewpoint in ["overview", "detailed", "deep", "map"] {
            for layer in ["application", "technology"] {
                for focal in ["a", "a.b", "z", "", "a.b.c", ".", "a..b"] {
                    let out = compute(json!({
                        "viewpoint": viewpoint, "layer": layer, "focal": focal, "elements": elements, "app_elements": elements,
                        "expanded": ["a", "z", "a.b"], "collapsed": ["a", "a.b"], "opened": ["a"], "pinned": [focal], "hidden": ["a.b"]
                    }));
                    assert!(out.get("error").is_some() || out.get("items").is_some(), "{viewpoint} {layer} {focal}: {out}");
                }
            }
        }
    }

    #[test]
    fn a_null_field_is_a_field_that_is_not_given() {
        let out = compute(json!({
            "viewpoint": "overview", "layer": null, "focal": "sys", "default_synthetic_label": null, "collapsed": null,
            "expanded": null, "facet": null, "opened": null, "pinned": null, "hidden": null, "app_elements": null,
            "elements": [
                { "reference": "sys", "parent": null, "applications": null, "relationships": null },
                { "reference": "sys.a", "parent": null, "applications": null, "relationships": [
                    { "destination": "o.p", "label": null, "qualifiers": null, "tags": null },
                    { "destination": "o.q", "label": "", "qualifiers": ["x"], "tags": null }
                ] },
                { "reference": "o", "parent": true }, { "reference": "o.p" }, { "reference": "o.q" }
            ]
        }));
        let l = link(&out, "sys", "o").unwrap_or_else(|| panic!("{out}"));
        assert_eq!((l["label"].clone(), l["synthetic"].clone()), (json!("uses"), json!(true)), "the default label");
        assert_eq!(l["qualifiers"], json!(["x"]));
        let out = compute(json!({
            "viewpoint": "facet", "layer": "application", "focal": "a", "facet": { "actions": null },
            "elements": [{ "reference": "a" }]
        }));
        assert!(error(&out).contains("unsupported viewpoint"), "a facet without actions is read, then the viewpoint is refused");
        let out = compute(json!({
            "viewpoint": "deep", "layer": "application", "focal": "a", "facet": { "actions": null },
            "elements": [{ "reference": "a" }]
        }));
        assert_eq!(ids(&out), ["a"]);
    }

    // ---- the references are paths ----

    #[test]
    fn a_sibling_whose_name_starts_like_the_focal_one_is_not_inside_it() {
        // the former Java used String.startsWith, and pulled `sys2` in the deep view of `sys`: the kernel compares paths
        let elements = json!([
            { "reference": "sys", "parent": true },
            { "reference": "sys.a", "relationships": [{ "destination": "ext" }] },
            { "reference": "sys2", "parent": true },
            { "reference": "sys2.b", "relationships": [{ "destination": "sys2.c" }] },
            { "reference": "sys2.c" },
            { "reference": "ext" }
        ]);
        let deep = compute(json!({ "viewpoint": "deep", "layer": "application", "focal": "sys", "elements": elements }));
        assert_eq!(ids(&deep), ["ext", "sys", "sys.a"]);
        assert_eq!(deep["links"].as_array().unwrap().len(), 1);
        let overview = compute(json!({ "viewpoint": "overview", "layer": "application", "focal": "sys", "elements": elements }));
        assert_eq!(ids(&overview), ["ext", "sys"]);
        let detailed = compute(json!({ "viewpoint": "detailed", "layer": "application", "focal": "sys", "elements": elements }));
        assert_eq!(ids(&detailed), ["ext", "sys", "sys.a"]);
    }

    // ---- expandable ----

    #[test]
    fn an_overview_box_is_expandable_only_when_opening_it_changes_the_view() {
        // a -calls-> other, and other has a child that no relationship touches
        let input = |expanded: Value| {
            compute(json!({
                "viewpoint": "overview", "layer": "application", "focal": "a", "expanded": expanded,
                "elements": [
                    { "reference": "a", "relationships": [{ "destination": "other", "label": "calls" }, { "destination": "big.x", "label": "reads" }] },
                    { "reference": "other", "parent": true }, { "reference": "other.c" },
                    { "reference": "big", "parent": true }, { "reference": "big.x" }, { "reference": "big.y" }
                ]
            }))
        };
        let out = input(json!([]));
        assert_eq!(item(&out, "other")["expandable"], false);
        let opened = input(json!(["other"]));
        assert_eq!((ids(&opened), &opened["links"]), (ids(&out), &out["links"]), "and indeed opening it changes nothing");
        assert_eq!(item(&out, "big")["expandable"], true, "big hides big.x, where a reads");
        assert_ne!(input(json!(["big"]))["links"], out["links"]);
    }

    #[test]
    fn a_detailed_box_that_is_the_focal_one_of_its_own_overview_is_not_expandable() {
        let input = |expanded: Value| {
            compute(json!({
                "viewpoint": "detailed", "layer": "application", "focal": "sys", "expanded": expanded,
                "elements": [
                    { "reference": "sys", "parent": true },
                    { "reference": "sys.a", "parent": true, "relationships": [{ "destination": "other" }] },
                    { "reference": "sys.a.x" },
                    { "reference": "other", "parent": true }, { "reference": "other.y" }
                ]
            }))
        };
        let out = input(json!([]));
        assert_eq!(item(&out, "sys.a")["expandable"], false);
        assert_eq!(item(&out, "other")["expandable"], false, "no relationship reaches other.y");
        assert_eq!(input(json!(["sys.a", "other"]))["links"], out["links"]);
    }

    #[test]
    fn a_detailed_box_is_expandable_when_it_is_the_end_of_a_link_of_a_sibling() {
        let input = |expanded: Value| {
            compute(json!({
                "viewpoint": "detailed", "layer": "application", "focal": "sys", "expanded": expanded,
                "elements": [
                    { "reference": "sys", "parent": true },
                    { "reference": "sys.a", "relationships": [{ "destination": "other.y" }] },
                    { "reference": "sys.b", "parent": true, "relationships": [{ "destination": "sys.c.z" }] },
                    { "reference": "sys.b.x" },
                    { "reference": "sys.c", "parent": true }, { "reference": "sys.c.z" },
                    { "reference": "other", "parent": true }, { "reference": "other.y" }
                ]
            }))
        };
        let out = input(json!([]));
        assert_eq!(item(&out, "other")["expandable"], true);
        assert_eq!(item(&out, "sys.b")["expandable"], false, "it is the focal of its own overview, and no one reaches into it");
        assert_ne!(input(json!(["other"]))["links"], out["links"]);
    }

    #[test]
    fn a_map_box_whose_children_are_all_hidden_is_not_expandable() {
        let out = compute(json!({
            "viewpoint": "map", "layer": "application", "hidden": ["p.c"],
            "elements": [{ "reference": "p", "parent": true }, { "reference": "p.c" }, { "reference": "q", "parent": true }, { "reference": "q.d" }]
        }));
        assert_eq!(item(&out, "p")["expandable"], false);
        assert_eq!(item(&out, "q")["expandable"], true);
    }

    // ---- tags ----

    #[test]
    fn relationships_that_differ_only_by_their_tags_stay_apart() {
        let elements = json!([
            { "reference": "a", "relationships": [
                { "destination": "b", "label": "x", "tags": { "k": "1" } },
                { "destination": "b", "label": "x", "tags": { "k": "2" } },
                { "destination": "b", "label": "x" }
            ] },
            { "reference": "b" }
        ]);
        for viewpoint in ["overview", "deep"] {
            let out = compute(json!({ "viewpoint": viewpoint, "layer": "application", "focal": "a", "elements": elements }));
            let links = out["links"].as_array().unwrap();
            assert_eq!(links.len(), 3, "{viewpoint}: {out}");
            for l in links {
                assert_eq!(l["relationships"].as_array().unwrap().len(), 1, "{viewpoint}: each link stands for its own relationship");
                assert_eq!(l["tags"], l["relationships"][0]["tags"]);
            }
            let mut tags: Vec<String> = links.iter().map(|l| l["tags"].to_string()).collect();
            tags.sort();
            assert_eq!(tags, ["{\"k\":\"1\"}", "{\"k\":\"2\"}", "{}"]);
        }
    }

    #[test]
    fn a_grouped_link_lists_the_tags_of_its_relationships_and_reads_them_as_different() {
        let elements = json!([
            { "reference": "s", "parent": true },
            { "reference": "s.a", "relationships": [{ "destination": "o", "label": "x", "tags": { "k": "1" } }] },
            { "reference": "s.b", "relationships": [{ "destination": "o", "label": "x", "tags": { "k": "2" } }] },
            { "reference": "o" }
        ]);
        let out = compute(json!({ "viewpoint": "overview", "layer": "application", "focal": "s", "elements": elements }));
        let l = link(&out, "s", "o").unwrap();
        assert_eq!(l["label"], "uses", "two relationships that differ by their tags do not read the same");
        let tags: Vec<String> = l["relationships"].as_array().unwrap().iter().map(|r| r["tags"].to_string()).collect();
        assert_eq!(tags, ["{\"k\":\"1\"}", "{\"k\":\"2\"}"]);
        // folding regroups them in the same way
        let out = compute(json!({ "viewpoint": "deep", "layer": "application", "focal": "s", "collapsed": ["s"], "elements": elements }));
        assert_eq!(link(&out, "s", "o").unwrap()["label"], "uses");
        // and with the same tags they read the same
        let same = json!([
            { "reference": "s", "parent": true },
            { "reference": "s.a", "relationships": [{ "destination": "o", "label": "x", "tags": { "k": "1" } }] },
            { "reference": "s.b", "relationships": [{ "destination": "o", "label": "x", "tags": { "k": "1" } }] },
            { "reference": "o" }
        ]);
        let out = compute(json!({ "viewpoint": "deep", "layer": "application", "focal": "s", "collapsed": ["s"], "elements": same }));
        assert_eq!(link(&out, "s", "o").unwrap()["label"], "x");
    }

    // ---- deployed applications ----

    fn deployment(nodes: Value, collapsed: Value) -> Value {
        compute(json!({
            "viewpoint": "deep", "layer": "technology", "focal": "prod", "collapsed": collapsed,
            "elements": nodes,
            "app_elements": [
                { "reference": "shop", "parent": true },
                { "reference": "shop.api", "relationships": [{ "destination": "shop.db" }] },
                { "reference": "shop.db" }
            ]
        }))
    }

    #[test]
    fn a_deployed_application_item_is_named_after_its_node_and_the_application() {
        let out = deployment(json!([
            { "reference": "prod", "parent": true },
            { "reference": "prod.pod", "applications": ["shop.api"], "relationships": [{ "destination": "prod.vm" }] },
            { "reference": "prod.vm", "applications": ["shop.db"] }
        ]), json!([]));
        assert_eq!(ids(&out), ["pod_shop_api", "prod", "prod.pod", "prod.vm", "vm_shop_db"]);
        assert_eq!(item(&out, "pod_shop_api")["parent"], "prod.pod");
        assert!(link(&out, "pod_shop_api", "vm_shop_db").unwrap()["secondary"].as_bool().unwrap());
    }

    #[test]
    fn nodes_of_the_same_name_hosting_the_same_application_get_distinct_items() {
        let out = deployment(json!([
            { "reference": "prod", "parent": true },
            { "reference": "prod.a", "parent": true },
            { "reference": "prod.a.pod", "applications": ["shop.api"], "relationships": [{ "destination": "prod.c.pod" }] },
            { "reference": "prod.b", "parent": true },
            { "reference": "prod.b.pod", "applications": ["shop.api"], "relationships": [{ "destination": "prod.c.pod" }] },
            { "reference": "prod.c", "parent": true },
            { "reference": "prod.c.pod", "applications": ["shop.db"] }
        ]), json!([]));
        let items = out["items"].as_array().unwrap();
        let app_items: Vec<(&str, &str)> = items.iter().filter(|i| i["reference"] != i["id"]).map(|i| (i["id"].as_str().unwrap(), i["parent"].as_str().unwrap())).collect();
        assert_eq!(app_items, [
            ("pod_shop_db", "prod.c.pod"),
            ("prod_a_pod_shop_api", "prod.a.pod"),
            ("prod_b_pod_shop_api", "prod.b.pod"),
        ], "the unique id is kept, the colliding ones carry the path of their node");
        let all: HashSet<&str> = items.iter().map(|i| i["id"].as_str().unwrap()).collect();
        assert_eq!(all.len(), items.len(), "an id is one box");
        // both instances are linked to the database
        assert!(link(&out, "prod_a_pod_shop_api", "pod_shop_db").is_some() && link(&out, "prod_b_pod_shop_api", "pod_shop_db").is_some());
    }

    #[test]
    fn a_deployed_application_item_never_takes_the_id_of_another_item() {
        // `pod_shop_api` is also the reference of a node of the view
        let out = deployment(json!([
            { "reference": "prod", "parent": true },
            { "reference": "prod.pod", "applications": ["shop.api"], "relationships": [{ "destination": "pod_shop_api" }] },
            { "reference": "pod_shop_api" }
        ]), json!([]));
        let items = out["items"].as_array().unwrap();
        let all: HashSet<&str> = items.iter().map(|i| i["id"].as_str().unwrap()).collect();
        assert_eq!(all.len(), items.len());
        assert_eq!(item(&out, "prod_pod_shop_api")["reference"], "shop.api");
    }

    // ---- the earlier dialect ----

    #[test]
    fn the_earlier_dialect_is_rewritten_and_reported() {
        let cases = [
            ("$.application..relationships[?(@.qualifiers anyof ['REST', 'x'])]", "$.application..relationships[?(@.qualifiers[?(@ == 'REST' || @ == 'x')])]"),
            ("$..relationships[?(@.qualifiers noneof ['REST'])]", "$..relationships[?((@.qualifiers && !@.qualifiers[?(@ == 'REST')]))]"),
            ("$..relationships[?(@.qualifiers == null)]", "$..relationships[?(!@.qualifiers)]"),
            ("$..relationships[?(@.label != null)]", "$..relationships[?(@.label)]"),
            ("$..relationships[?(@.qualifiers == null && @.label == 'a anyof [x]')]", "$..relationships[?(!@.qualifiers && @.label == 'a anyof [x]')]"),
        ];
        for (old, new) in cases {
            let (path, warnings) = facet::translate_legacy(old);
            assert_eq!(path, new, "{old}");
            assert_eq!(warnings.len(), 1, "{old}");
        }
        for standard in ["$..relationships[?(@.tags['k'] == 'v')]", "$..relationships[?(@.label == 'null')]", "$..relationships[?(@.label == 'anyof [x]')]"] {
            assert_eq!(facet::translate_legacy(standard), (standard.to_string(), vec![]), "standard syntax is left alone");
        }
    }

    #[test]
    fn a_facet_in_the_earlier_dialect_warns() {
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(@.qualifiers anyof ['REST'])]"));
        assert_eq!(out["warnings"].as_array().unwrap().len(), 1, "{out}");
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(@.qualifiers[?(@ == 'REST')])]"));
        assert!(out.get("warnings").is_none(), "{out}");
    }

    #[test]
    fn the_workspace_of_the_cli_is_filtered_as_the_elements_of_the_editor_are() {
        let workspace = json!({
            "application": { "elements": [
                { "id": "s", "kind": "system", "relationships": [{ "destination": "t", "tags": { "audited": "yes" } }, { "destination": "t", "label": "x" }],
                  "elements": [{ "id": "c", "kind": "container", "relationships": [{ "destination": "t", "tags": { "audited": "no" } }] }] },
                { "id": "t", "kind": "system" }
            ] },
            "settings": { "views": { "path": "views" } }
        });
        let request = json!({ "workspace": workspace, "actions": remove("$..relationships[?(@.tags['audited'] == 'yes')]") });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert_eq!(out["version"], CONTRACT_VERSION);
        assert_eq!(out["warnings"], json!([]));
        let kept = &out["workspace"];
        assert_eq!(kept["settings"], workspace["settings"], "the rest of the workspace is untouched");
        assert_eq!(kept["application"]["elements"][0]["relationships"], json!([{ "destination": "t", "label": "x" }]));
        assert_eq!(kept["application"]["elements"][0]["elements"][0]["relationships"].as_array().unwrap().len(), 1);
        let request = json!({ "workspace": workspace, "actions": remove("$..relationships[?(@.tags['audited'] != 'yes')]") });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert_eq!(out["workspace"]["application"]["elements"][0]["relationships"], json!([{ "destination": "t", "tags": { "audited": "yes" } }]));
        assert!(out["workspace"]["application"]["elements"][0]["elements"][0].get("relationships").is_none() || out["workspace"]["application"]["elements"][0]["elements"][0]["relationships"] == json!([]));
        let request = json!({ "workspace": workspace, "actions": remove("$.application.elements[?(@.id == 't')]") });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert_eq!(out["workspace"]["application"]["elements"].as_array().unwrap().len(), 1, "an element can be removed too");
        let out: Value = serde_json::from_str(&apply_facet_json(&json!({ "workspace": workspace, "actions": [{ "operator": "KEEP", "json_path": "$" }] }).to_string())).unwrap();
        assert!(error(&out).contains("unsupported facet action"));
    }

    #[test]
    fn removing_several_nodes_of_one_array_and_what_is_inside_them_keeps_the_indexes_right() {
        let workspace = json!({ "application": { "elements": [
            { "id": "a", "relationships": [{ "destination": "z", "label": "1" }, { "destination": "z", "label": "2" }, { "destination": "z", "label": "3" }, { "destination": "z", "label": "4" }] },
            { "id": "b" }, { "id": "c" }, { "id": "z" }
        ] } });
        let request = json!({ "workspace": workspace, "actions": remove("$..relationships[?(@.label == '1' || @.label == '3')]") });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert_eq!(out["workspace"]["application"]["elements"][0]["relationships"], json!([{ "destination": "z", "label": "2" }, { "destination": "z", "label": "4" }]));
        let request = json!({ "workspace": workspace, "actions": remove("$..elements[?(@.id == 'b' || @.id == 'z' || @.relationships)]") });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert_eq!(out["workspace"]["application"]["elements"], json!([{ "id": "c" }]));
    }
}
