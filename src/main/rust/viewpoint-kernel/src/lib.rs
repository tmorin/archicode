//! The ArchiCode viewpoints (overview, detailed, deep, and the focal-less map) as one pure function: a graph of references and relationships
//! goes in as JSON, the items and links of the view come out as JSON. It never sees YAML, files or the CLI.
//!
//! It mirrors io.morin.archicode.viewpoint (OverviewViewpointFactory, DetailedViewpointFactory,
//! ApplicationDeepViewpointFactory, TechnologyDeepViewpointFactory, MetaLinkFinderFor*, MetaLinkGroomer, Level), and
//! is checked against what the Java code generates (see src/test/javascript/viewpoint-kernel).
//!
//! Contract (version 1)
//!   input : { viewpoint: "overview"|"detailed"|"deep"|"map", layer: "application"|"technology", focal,
//!             default_synthetic_label, elements: [{reference, parent, applications, relationships}],
//!             app_elements (technology deep only), collapsed: [item id], expanded: [item id],
//!             facet: {name, actions: [{operator: "REMOVE", json_path}]} }
//!   output: { version, items: [{id, reference, parent, collapsed, hidden, expandable}],
//!             links: [{from, to, label, synthetic, qualifiers, secondary, relationships}] }
//!         | { error }
//! Qualifiers keep the order they were declared in. `relationships` lists the declared relationships a link stands for (several when a link groups some); `collapsed`
//! items hide everything inside them, their links being re-attached to the collapsed item. In the overview and the
//! detailed viewpoints, an item flagged `expandable` has children the view does not show; listing it in `expanded`
//! shows them and the grouped links end on them (`expandable` and `expanded` were added to version 1: both optional).
//! The `map` viewpoint has no focal element: every element of the layer is in play, what is `opened` shows its
//! children, and a relationship is drawn between the boxes its two ends land on (a link per pair of boxes, grouped
//! when it stands for several). `pinned` keeps the relationships that touch one of those elements (or what is inside
//! it); `hidden` leaves out an element, what is inside it, and every relationship that reaches it. All three are
//! optional lists of references, added to version 1.
//! A `facet` is applied to the elements first (it removes relationships), as the CLI does before it generates the views
//! of a facet. Only the documented kind of JSONPath is understood — see `facet` below; anything else is an error.
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

/// Bumped when the shape of the input or output changes in a way a caller must know about.
pub const CONTRACT_VERSION: u32 = 1;

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

#[derive(Deserialize, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct Rel {
    destination: String,
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    qualifiers: QSet,
    #[serde(default)]
    tags: BTreeMap<String, String>,
}

#[derive(Deserialize)]
struct Elem {
    reference: String,
    /// true for elements that can contain children (Parent<?> in Java)
    #[serde(default)]
    parent: bool,
    /// technology nodes: references of the application elements deployed on them
    #[serde(default)]
    applications: Vec<String>,
    #[serde(default)]
    relationships: Vec<Rel>,
}

#[derive(Deserialize)]
struct Input {
    viewpoint: String,
    /// every viewpoint but the map is about one element
    #[serde(default)]
    focal: String,
    #[serde(default = "default_label")]
    default_synthetic_label: String,
    elements: Vec<Elem>,
    /// application layer, only needed by the deep viewpoint on the technology layer
    #[serde(default)]
    app_elements: Vec<Elem>,
    #[serde(default)]
    layer: String,
    /// ids of the items to fold: everything inside them is hidden (a strict ancestor of the focal item is ignored)
    #[serde(default)]
    collapsed: Vec<String>,
    /// overview and detailed: ids of the items to open, so that their children are shown and the grouped links
    /// regroup under them (an item that is the focal one, or encloses it, is ignored)
    #[serde(default)]
    expanded: Vec<String>,
    /// a facet of the workspace's settings, applied before the viewpoint
    #[serde(default)]
    facet: Option<Facet>,
    /// map: references of the elements that are open (their children are shown)
    #[serde(default)]
    opened: Vec<String>,
    /// map: references of the elements the view is about (none: the whole layer)
    #[serde(default)]
    pinned: Vec<String>,
    /// map: references of the elements left out, with what is inside them
    #[serde(default)]
    hidden: Vec<String>,
}

#[derive(Deserialize)]
struct Facet {
    #[serde(default)]
    actions: Vec<FacetAction>,
}

#[derive(Deserialize)]
struct FacetAction {
    operator: String,
    json_path: String,
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
}

impl OutRel {
    fn of(from: &str, rel: &Rel) -> OutRel {
        OutRel { from: from.to_string(), destination: rel.destination.clone(), label: rel.label.clone(), qualifiers: rel.qualifiers.clone() }
    }
}

#[derive(Serialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
struct OutLink {
    from: String,
    to: String,
    label: Option<String>,
    synthetic: bool,
    qualifiers: QSet,
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

// ---- facets ----
//
// In the CLI a facet is the workspace JSON with some JSONPath expressions deleted (Jayway JsonPath), and the views of
// that smaller workspace are generated in their own directory. Jayway's dialect is far larger than what is useful
// here, so this handles the shape every documented facet has — it removes relationships that match a filter:
//
//   $.application..relationships[?(@.qualifiers anyof ['a', 'b'])]      (or $.technology…, or $..relationships…)
//   $.application..relationships[?(@.qualifiers noneof ['a'])]
//   $.application..relationships[?(@.qualifiers == null)]              (also != null)
//   $.application..relationships[?(@.label == 'text')]                 (also !=, == null, != null)
//
// `anyof` / `noneof` never match a relationship that has no qualifier, as in Jayway (that is what `== null` is for).
// Any other expression is refused with an error naming it, never silently ignored.

#[derive(PartialEq)]
enum Field {
    Qualifiers,
    Label,
}

enum Test {
    AnyOf(Vec<String>),
    NoneOf(Vec<String>),
    Eq(Option<String>),
    Ne(Option<String>),
}

struct Selector {
    application: bool,
    technology: bool,
    field: Field,
    test: Test,
}

fn unquote(s: &str) -> Option<String> {
    let s = s.trim();
    let b = s.as_bytes();
    if b.len() >= 2 && (b[0] == b'\'' || b[0] == b'"') && b[b.len() - 1] == b[0] {
        Some(s[1..s.len() - 1].to_string())
    } else {
        None
    }
}

fn parse_list(s: &str) -> Option<Vec<String>> {
    let inner = s.trim().strip_prefix('[')?.strip_suffix(']')?;
    if inner.trim().is_empty() {
        return Some(Vec::new());
    }
    inner.split(',').map(unquote).collect()
}

fn parse_scalar(s: &str) -> Option<Option<String>> {
    if s.trim() == "null" {
        Some(None)
    } else {
        unquote(s).map(Some)
    }
}

fn parse_facet_action(action: &FacetAction) -> Result<Selector, String> {
    let unsupported = || format!("unsupported facet action: {} {}", action.operator, action.json_path);
    if action.operator != "REMOVE" {
        return Err(unsupported());
    }
    let path = action.json_path.trim().strip_prefix('$').ok_or_else(unsupported)?;
    let (application, technology, rest) = if let Some(r) = path.strip_prefix(".application") {
        (true, false, r)
    } else if let Some(r) = path.strip_prefix(".technology") {
        (false, true, r)
    } else {
        (true, true, path)
    };
    let filter = rest
        .strip_prefix("..relationships[?(")
        .and_then(|r| r.strip_suffix(")]"))
        .and_then(|r| r.trim().strip_prefix("@."))
        .ok_or_else(unsupported)?;
    let (field_name, after) = filter.split_once(char::is_whitespace).ok_or_else(unsupported)?;
    let field = match field_name {
        "qualifiers" => Field::Qualifiers,
        "label" => Field::Label,
        _ => return Err(unsupported()),
    };
    let after = after.trim();
    let (op, rhs) = after.split_once(char::is_whitespace).ok_or_else(unsupported)?;
    let test = match op {
        "anyof" if field == Field::Qualifiers => Test::AnyOf(parse_list(rhs).ok_or_else(unsupported)?),
        "noneof" if field == Field::Qualifiers => Test::NoneOf(parse_list(rhs).ok_or_else(unsupported)?),
        "==" => Test::Eq(parse_scalar(rhs).ok_or_else(unsupported)?),
        "!=" => Test::Ne(parse_scalar(rhs).ok_or_else(unsupported)?),
        _ => return Err(unsupported()),
    };
    if field == Field::Qualifiers && matches!(&test, Test::Eq(Some(_)) | Test::Ne(Some(_))) {
        return Err(unsupported());
    }
    Ok(Selector { application, technology, field, test })
}

impl Selector {
    fn matches(&self, rel: &Rel) -> bool {
        match (&self.field, &self.test) {
            (Field::Qualifiers, Test::AnyOf(list)) => rel.qualifiers.iter().any(|q| list.contains(q)),
            (Field::Qualifiers, Test::NoneOf(list)) => !rel.qualifiers.is_empty() && !rel.qualifiers.iter().any(|q| list.contains(q)),
            (Field::Qualifiers, Test::Eq(_)) => rel.qualifiers.is_empty(),
            (Field::Qualifiers, Test::Ne(_)) => !rel.qualifiers.is_empty(),
            (Field::Label, Test::Eq(v)) => &rel.label == v,
            (Field::Label, Test::Ne(v)) => &rel.label != v,
            (Field::Label, _) => false,
        }
    }
}

/// Removes from the elements what the facet's actions remove. `elements` is the layer being viewed, `app_elements` the
/// application layer that a technology view also reads.
fn apply_facet(input: &mut Input) -> Result<(), String> {
    let Some(facet) = input.facet.take() else { return Ok(()) };
    let technology_view = input.layer == "technology";
    for action in &facet.actions {
        let selector = parse_facet_action(action)?;
        let strip = |elems: &mut Vec<Elem>| {
            for e in elems.iter_mut() {
                e.relationships.retain(|r| !selector.matches(r));
            }
        };
        if technology_view {
            if selector.technology {
                strip(&mut input.elements);
            }
            if selector.application {
                strip(&mut input.app_elements);
            }
        } else if selector.application {
            strip(&mut input.elements);
        }
    }
    Ok(())
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
            links.insert(OutLink { from: g.from.clone(), to: g.to.clone(), label: Some(label), synthetic: true, qualifiers, secondary: false, relationships: g.synthetic_src.clone() });
        } else {
            for r in &g.natural {
                links.insert(OutLink {
                    from: g.from.clone(),
                    to: g.to.clone(),
                    label: r.label.clone(),
                    synthetic: false,
                    qualifiers: r.qualifiers.clone(),
                    secondary: false,
                    relationships: g.natural_src.iter().filter(|o| o.destination == r.destination && o.label == r.label && o.qualifiers == r.qualifiers).cloned().collect(),
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
            secondary: false,
            relationships: BTreeSet::from([OutRel::of(&m.from, &m.rel)]),
        });
    }
    let item_refs = with_ancestors(refs);
    let node_refs: Vec<String> = item_refs.iter().cloned().collect();
    Ok(((to_items(&item_refs), links), node_refs))
}

/// TechnologyDeepViewpointFactory: the deep viewpoint plus the applications deployed on the nodes, linked together
/// with "secondary" links when one application has a relationship towards another deployed one.
fn deep_technology(input: &Input, known: &Known) -> Result<Content, String> {
    let ((mut items, mut links), tech_refs) = deep(input, known)?;
    let app_known: Known = input.app_elements.iter().map(|e| (e.reference.as_str(), e)).collect();
    // application reference -> ids of the items created for it (one per hosting node)
    let mut by_app: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for r in &tech_refs {
        let node = known[r.as_str()];
        let node_id = parts(r).last().copied().unwrap_or("").to_string();
        for app in node.applications.iter().collect::<BTreeSet<_>>() {
            if !app_known.contains_key(app.as_str()) {
                return Err(format!("dangling application reference: {app}"));
            }
            let item_id = format!("{}_{}", node_id, app.replace('.', "_"));
            items.insert(OutItem::new(&item_id, app, Some(r.clone())));
            by_app.entry(app.clone()).or_default().push(item_id);
        }
    }
    for (app, from_ids) in &by_app {
        let app_elem = app_known[app.as_str()];
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
    type Key = (String, String, Option<String>, bool, QSet, bool);
    let mut merged: BTreeMap<Key, OutLink> = BTreeMap::new();
    for l in links {
        let key = (l.from.clone(), l.to.clone(), l.label.clone(), l.synthetic, l.qualifiers.clone(), l.secondary);
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
        let distinct: BTreeSet<(&String, &Option<String>, &QSet)> =
            relationships.iter().map(|r| (&r.destination, &r.label, &r.qualifiers)).collect();
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
            secondary: group.iter().all(|(l, _)| l.secondary),
            relationships,
        });
    }
    (kept, merge_links(out))
}

/// Flags the items that hide children of the model: a leaf of the view whose element has children, other than the
/// focal item (its own links are the subject of the view) and the items that are folded.
fn mark_expandable(items: &mut [OutItem], input: &Input) {
    let with_children: HashSet<String> = input.elements.iter().filter(|e| e.reference.contains('.')).map(|e| down_reference(&e.reference)).collect();
    let shown_parents: HashSet<String> = items.iter().filter_map(|i| i.parent.clone()).collect();
    for item in items.iter_mut() {
        item.expandable = !item.collapsed
            && item.id == item.reference
            && item.id != input.focal
            && with_children.contains(&item.id)
            && !shown_parents.contains(&item.id);
    }
}

pub fn compute_json(input: &str) -> String {
    let result = serde_json::from_str::<Input>(input)
        .map_err(|e| format!("invalid input: {e}"))
        .and_then(|mut input| {
            apply_facet(&mut input)?;
            let known: Known = input.elements.iter().map(|e| (e.reference.as_str(), e)).collect();
            let content = match input.viewpoint.as_str() {
                "overview" => overview(&input, &known, &input.focal),
                "map" => map(&input, &known),
                "detailed" => detailed(&input, &known),
                "deep" if input.layer == "technology" => deep_technology(&input, &known),
                "deep" => deep(&input, &known).map(|(c, _)| c),
                other => Err(format!("unsupported viewpoint: {other}")),
            };
            content.map(|(items, links)| {
                let (mut items, links) = collapse(items, merge_links(links), &input);
                if input.viewpoint != "deep" {
                    mark_expandable(&mut items, &input);
                }
                Output { version: CONTRACT_VERSION, items, links }
            })
        });
    match result {
        Ok(out) => serde_json::to_string(&out).unwrap(),
        Err(e) => serde_json::json!({ "error": e }).to_string(),
    }
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

/// Runs the kernel on `len` bytes of UTF-8 JSON at `ptr`; the result is read back with `result_ptr`/`result_len`.
#[no_mangle]
pub unsafe extern "C" fn compute(ptr: *const u8, len: usize) -> usize {
    let bytes = std::slice::from_raw_parts(ptr, len);
    let out = match std::str::from_utf8(bytes) {
        Ok(s) => compute_json(s),
        Err(_) => r#"{"error":"input is not UTF-8"}"#.to_string(),
    };
    #[allow(static_mut_refs)]
    {
        RESULT = out.into_bytes();
        RESULT.len()
    }
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
    fn what_the_facet_support_does_not_know_is_an_error_not_a_guess() {
        for path in [
            "$.application.elements[?(@.id == 'x')]",
            "$.application..relationships[?(@.tags.k == 'v')]",
            "$.application..relationships[?(@.label =~ /x/)]",
        ] {
            let out = with_facet("deep", "a", "application", remove(path));
            assert!(out["error"].as_str().unwrap().contains("unsupported facet action"), "{path}");
        }
        let out = with_facet("deep", "a", "application", json!([{ "operator": "KEEP", "json_path": "$..relationships[?(@.label == 'x')]" }]));
        assert!(out["error"].as_str().unwrap().contains("unsupported facet action"));
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
}
