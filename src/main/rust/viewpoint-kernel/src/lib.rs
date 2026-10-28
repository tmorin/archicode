//! The ArchiCode viewpoints (overview, detailed, deep, and the focal-less map) as one pure function: a graph of references and relationships
//! goes in as JSON, the items and links of the view come out as JSON. It never sees YAML, files or the CLI.
//!
//! It mirrors io.morin.archicode.viewpoint (OverviewViewpointFactory, DetailedViewpointFactory,
//! ApplicationDeepViewpointFactory, TechnologyDeepViewpointFactory, MetaLinkFinderFor*, MetaLinkGroomer, Level), and
//! is checked against what the Java code generates (see src/test/javascript/viewpoint-kernel).
//!
//! Contract (version 3)
//!   input : { viewpoint: "overview"|"detailed"|"deep"|"map", layer: "application"|"technology", focal,
//!             default_synthetic_label, elements: [{reference, parent, applications, uses, relationships}],
//!             app_elements (technology deep only), collapsed: [item id], expanded: [item id],
//!             facet: {name, actions: [{operator: "REMOVE", json_path}]} }
//!           an element may carry more than `reference` and the rest above (kind, name, description, qualifiers, tags):
//!           a facet reads it, as a JSONPath can select on it, and so do the `stereotypes` of an item (below)
//!   output: { version, items: [{id, reference, parent, collapsed, hidden, expandable, stereotypes,
//!                                change?, natures?, context?}],
//!             links: [{from, to, label, synthetic, qualifiers, tags, secondary,
//!                      relationships: [{from, destination, label, qualifiers, tags, application, change?}], change?}] }
//!                      + warnings: [text] when there is something to say (omitted otherwise) }
//!         | { error }
//! `stereotypes` of an item are what the diagram says about its element: the `qualifiers` of the element (declared order),
//! then the words of its `rendering-stereotypes` tag (a whitespace-separated list, so that `"external changed"` is the two
//! stereotypes `external` and `changed`, each one a key `styles` can style), without duplicate, the first occurrence
//! winning. A qualifier is never split (`Spring Boot` is one). The kind of the element and how the box is drawn are not
//! in the list: the renderer adds them. Added to version 2: `qualifiers` and `tags` of an element are optional, and an
//! item that has none of them has an empty list.
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
//! standard JSONPath (RFC 9535), see `facet.rs`; the earlier dialect (Jayway: `anyof`, `noneof`, `== null`) is refused with one sentence that names the standard form (0.17).
//!
//! In the deep viewpoint of the technology layer, the applications deployed on the nodes of the view are drawn inside
//! them. Inside an environment, a relationship between two deployed applications is a "secondary" link (the CLI does not
//! draw it), unless `application_links` is true, which a `facet` in the input turns on: the view is then about one flow,
//! and its links are drawn, with their label and qualifiers, in the three viewpoints. `hide_unlinked` (a facet asks for
//! it with `hide_unlinked`) leaves out the boxes no link goes through, the focal element staying. Between two environments, it is drawn, as a link between the two deployed applications, when the first
//! environment `uses` (lists in `uses`) the second one or a node of it, and when the environment does not host the
//! destination itself: what it hosts wins, and an application hosted by several environments is reached in the ones the
//! environment uses, and nowhere else. `uses` is a scope, never a link of its own; its entries must be elements of the
//! layer. `application` is true for a relationship that an application declares, the view being a technology one:
//! the caller finds it in the application layer. `uses`, `application`, `application_links` and `hide_unlinked` were added to version 2: all optional.
//!
//! A second entry point serves the CLI, which filters the JSON of the whole workspace: `apply_facet`,
//!   input : { workspace, actions: [{operator: "REMOVE", json_path}] }
//!   output: { version, workspace, warnings } | { error }
//! Version 2: the paths of a facet are standard JSONPath, `apply_facet` exists, and `warnings` may be in the output.
//! A facet that removes an element removes what points at it (a relationship, an entry of `uses`, an entry of the
//! `applications` of a node: see `facet.rs`), so the same input gives a view where it gave `dangling reference: x`. No
//! version moves for it: an input that worked gives the same output.
//!
//! What changed (version 3). An element, and a relationship, may carry `change`: `none`, `new`, `changed` or `removed`, and an
//! element also `moved`, `split` or `merged` (version 4: it replaces others, see `compare.rs`) (what `compare` gives, see below;
//! `natures` of an element travel with it). Nothing else is needed: the fields of the union
//! of `compare` are free-form fields like `kind` or `qualifiers`, so a facet reads them as it reads any field, and the
//! caller hands the union to `compute` as the elements of the layer, each with the union relationships of its `from`.
//! As soon as one element or one relationship carries `change`, the view is a *comparison*: every item has `change`
//! (and `natures` when the element has them), every link has `change` (its relationships' changes, aggregated: all new is
//! new, all removed is removed, all `none` is `none`, any other mixture is `changed`), and the relationships listed in a
//! link have the `change` they were given. A view of an input without any `change` is what it was in version 2, byte for byte.
//! The `stereotypes` of a comparison item end with the state of its element: `new`, `changed` or `removed` (the author's
//! own tag of the same name is not repeated, it moves last, so the computed state is the one that wins in the CLI and in the
//! editor), or, for an element that did not change but has a new, changed or removed element below it in the reference
//! tree, `contains-changes`.
//! `only_changes` keeps the items and links whose `change` is not `none`, the ends of those links and the focal item, and what
//! encloses them; an item kept for no change of its own has `context: true`. It runs after the facets, `hide_unlinked`
//! and the folds, on the items and links as drawn.
//!
//! A third entry point compares two plateaus of an architecture, `compare` (see `compare.rs` for the rules):
//!   input : { base: {application: [element], technology: [element]}, target: {application: [..], technology: [..]} }
//!   output: { version, elements: [union element + change, natures], relationships: [.. + change, natures],
//!             changes: [row of the table], counts } | { error }
//! It was added to version 2 and changed neither the input nor the output of the other entry points; the views that carry
//! `change` (above) are what moved the version to 3.
//! Version 4 added what an element can say it replaces (`replaces`), the words `moved`, `split` and `merged`, the `candidates` and
//! `warnings` of `compare`; nothing of it appears without a `replaces` in the input (but the empty list of candidates).
//! A fourth entry point changes the graph of a plateau, `apply_patches` (see `patch.rs` for the rules):
//!   input : { workspace, plateau?, patches: [{operator: "REMOVE"|"SET"|"ADD"|"MERGE", target? | json-path?, expect?, layer?, field?, where?, value?}] }
//!   output: { version, workspace, patches: [{rank, operator, selector, matched, touched, removed?, dropped?}] }
//!         | { error, patch?: {plateau?, rank, operator?, selector?} }
//! It is additive: it changed neither the input nor the output of the other entry points and did not move the version (the
//! answer says the version, 4). A patch that selects nothing is an `error` that names the plateau, the rank and the selector.
//! Since wave 017 (run 0126, issue #94) a `REMOVE` may name a `field`: it then takes that field out of the elements it selects (the element stays; `id`,
//! `parent`, `elements` and `kind` are refused) and its report has `matched` and `touched` only. Additive: a `REMOVE` with a `field` was an `error`
//! before, a `REMOVE` without one is what it was, and the version stays 5.
//! A map that fails on `pinned`, `opened` or `hidden` (`dangling reference: x`, the first of them) also lists all the entries it cannot find, in
//! `dangling` of the error: a key of the error only, added to version 4 (an input that worked gives the same output).
//! `links` (wave 026, run 0197, issue #143; additive, the version stays 5): a map of the application layer may list `{source, destination, label?}`; it then draws
//! those relationships (the ones the element `source` declares, same destination, same label after trimming, none matching only no label), the boxes of their ends,
//! the pinned elements with what is open inside them, and what encloses these, and no other element. An entry that matches nothing is an `error`; an unknown end is
//! `dangling reference: x` (and joins `dangling`); the technology layer refuses the key. Absent, null or empty: the map as it was.
//!
//! What changed (version 5, wave 014, issues #70 and #34). It is breaking for a host of `compare`, and for it only:
//!   - `compare` takes `on_one_chain`, whether one of the two plateaus is the past of the other (an ancestor in the tree of plateaus, which only the host
//!     knows). It is required: an input without it, or with `null`, is an `error` that says so. Between siblings the only two elements of a kind under a
//!     parent are two alternatives, so the reason `parent` of a candidate is not given there and a pair that has no other reason is not listed.
//!   - an item of a comparison says `contains_changes: true` when the kernel computed that it did not change and holds a change (the stereotype
//!     `contains-changes` that ended its list was also a word an author could write by hand). The key is absent otherwise, and in a view that does not compare.
//!   - a fifth entry point, `states`, says the seven state words once (`relationship`, `identity`, `container`, `states`); the hosts keep no list of their own.
//!   - the elements of `compare`'s union say `contains_changes` (and `contains_more_than_wording`), additive keys (issue #96, wave 015): the number stays 5.
//!     `compute` removes them from its input, so they are no free-form field for a facet.
//!
//! `compute`, `apply_facet` and `apply_patches` take what they took; their answers say the version, 5, and an item of a comparison gained `contains_changes`.
//!
//! The map of the technology layer draws the applications and the dependencies they give (wave 016, run 0114, issue #107; additive, the number stays 5). Given the application
//! layer (`app_elements`, which the map did not take before), the map of the technology layer draws, as the viewpoints of an element do, the applications deployed on the
//! nodes (`applications` of a node): a box for each, inside its node, when that node is open (`opened`, or encloses a pinned element) and visible, and the dependencies
//! between environments (`derived_dependencies`: an application of an environment that has a relationship towards an application the environment does not host, deployed in an
//! environment or a node it `uses`). A dependency is a link between the boxes of the two applications when both are drawn, else between the boxes the nodes that host them land
//! on (the first closed box, as for any relationship of the map); it is natural when its ends are the applications or the nodes themselves, grouped when an end was brought up to a
//! closed box above. The dependencies inside one environment stay out, as they do in the viewpoints of an element (they are "secondary" there). The id of the box of an application is
//! the one the deep viewpoint gives (`node_app`, or the path of the node when that is ambiguous or is the reference of an element), settled over the whole layer so that opening
//! or hiding a box does not rename another. A node that hosts applications is `expandable` while it is closed. Two optional booleans choose what is drawn, absent or null being
//! true: `applications` (false: the nodes only; the dependencies are then between the nodes) and `relationships` (false: no link at all, declared or derived). Both mean nothing in
//! the map of the application layer, and `applications` and the dependencies nothing without `app_elements`: an input of the technology map that did not give it is drawn as it was.
//! A sixth entry point says which elements have nothing to draw, `quiet` (issue #81, wave 015; additive, the number stays 5; see `quiet_json`):
//!   input : the input of `compute` without `focal`, and `focals: [{reference, viewpoint?}]`
//!   output: { version, quiet: [reference] } | { error }
mod compare;
mod facet;
mod patch;

pub use compare::compare_json;
pub use facet::apply_facet_json;
pub use patch::apply_patches_json;

use serde::{Deserialize, Serialize};
use std::cell::OnceCell;
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

/// Bumped when the shape of the input or output changes in a way a caller must know about.
pub const CONTRACT_VERSION: u32 = 5;

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
fn null_as_default<'de, D: serde::Deserializer<'de>, T: Deserialize<'de> + Default>(
    d: D,
) -> Result<T, D::Error> {
    Ok(Option::<T>::deserialize(d)?.unwrap_or_default())
}

fn null_as_default_label<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    Ok(Option::<String>::deserialize(d)?.unwrap_or_else(default_label))
}

/// What happened to an element or a relationship between two plateaus (what `compare` says), as a caller gives it in `change`.
#[derive(Serialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
#[serde(rename_all = "lowercase")]
enum Change {
    None,
    New,
    Changed,
    Removed,
    /// an element that replaces one other (`replaces`): it moved or was renamed
    Moved,
    /// an element that replaces one that others replace too
    Split,
    /// an element that replaces several
    Merged,
}

impl Change {
    fn parse(text: &str) -> Option<Change> {
        match text {
            "none" => Some(Change::None),
            "new" => Some(Change::New),
            "changed" => Some(Change::Changed),
            "removed" => Some(Change::Removed),
            "moved" => Some(Change::Moved),
            "split" => Some(Change::Split),
            "merged" => Some(Change::Merged),
            _ => None,
        }
    }

    /// Anything but none: new, changed, removed, moved, split or merged.
    fn is_change(self) -> bool {
        self != Change::None
    }

    /// Moved, split or merged: what an element says that replaces others (`replaces`).
    fn is_identity(self) -> bool {
        matches!(self, Change::Moved | Change::Split | Change::Merged)
    }

    /// The stereotype that tells the state, for the states that are drawn.
    fn stereotype(self) -> Option<&'static str> {
        match self {
            Change::None => None,
            Change::New => Some("new"),
            Change::Changed => Some("changed"),
            Change::Removed => Some("removed"),
            Change::Moved => Some("moved"),
            Change::Split => Some("split"),
            Change::Merged => Some("merged"),
        }
    }
}

/// The change of an optional value: none when not given.
fn is_change(change: Option<Change>) -> bool {
    change.is_some_and(Change::is_change)
}

/// The stereotype of a container whose own state is `none` but that has a new, changed or removed element below it.
const STEREOTYPE_CONTAINS_CHANGES: &str = "contains-changes";
/// The states that an element or a relationship has in a comparison (`change`): what a relationship can say.
const STATES_RELATIONSHIP: [&str; 3] = ["new", "changed", "removed"];
/// The states that only an element has, when it replaces others.
const STATES_IDENTITY: [&str; 3] = ["moved", "split", "merged"];

/// The seven state words, said once (contract 5, issue #34): `relationship` (what a relationship or an element can be), `identity` (what an element that
/// replaces others can also be), `container` (the computed state of an element that did not change and holds a change, `contains_changes` in an item) and
/// `states`, the three lists in that order. The hosts read the words here and write none of their own. It takes no input.
pub fn states_json() -> String {
    let mut states: Vec<&str> = STATES_RELATIONSHIP.to_vec();
    states.extend(STATES_IDENTITY);
    states.push(STEREOTYPE_CONTAINS_CHANGES);
    serde_json::json!({ "version": CONTRACT_VERSION, "relationship": STATES_RELATIONSHIP, "identity": STATES_IDENTITY, "container": STEREOTYPE_CONTAINS_CHANGES, "states": states }).to_string()
}

/// A relationship. Two of them are the same when they read the same (`change` is what happened to it, not what it says), so
/// that a view groups, counts and captions them as it does without any comparison.
#[derive(Deserialize, Clone)]
struct Rel {
    destination: String,
    #[serde(default)]
    label: Option<String>,
    #[serde(default, deserialize_with = "null_as_default")]
    qualifiers: QSet,
    #[serde(default, deserialize_with = "null_as_default")]
    tags: BTreeMap<String, String>,
    /// `none`, `new`, `changed` or `removed`: what `compare` says of this relationship (checked by `compute_json`)
    #[serde(default)]
    change: Option<String>,
}

impl Rel {
    fn key(&self) -> (&String, &Option<String>, &QSet, &BTreeMap<String, String>) {
        (&self.destination, &self.label, &self.qualifiers, &self.tags)
    }

    /// The change the relationship carries; none when it does not, or when `compute_json` would have refused it.
    fn change(&self) -> Option<Change> {
        self.change.as_deref().and_then(Change::parse)
    }
}

impl PartialEq for Rel {
    fn eq(&self, other: &Self) -> bool {
        self.key() == other.key()
    }
}
impl Eq for Rel {}
impl PartialOrd for Rel {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Rel {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.key().cmp(&other.key())
    }
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
    /// technology environments: references (of an environment, or of a node of one) whose deployed applications the
    /// applications deployed in this environment may reach. It is a scope for the dependencies the deep viewpoint of the
    /// technology layer derives, never a link by itself.
    #[serde(default, deserialize_with = "null_as_default")]
    uses: Vec<String>,
    #[serde(default, deserialize_with = "null_as_default")]
    relationships: Vec<Rel>,
    /// whatever else the caller knows of the element (kind, name, description, qualifiers, tags): only a facet reads it
    #[serde(flatten)]
    other: serde_json::Map<String, serde_json::Value>,
}

impl Elem {
    /// What `compare` says of the element (`change` among its free-form fields); none when it does not, or when
    /// `compute_json` would have refused it.
    fn change(&self) -> Option<Change> {
        self.other
            .get("change")
            .and_then(|c| c.as_str())
            .and_then(Change::parse)
    }

    /// The `natures` of the change, as `compare` lists them (free-form: they only travel).
    fn natures(&self) -> Vec<String> {
        self.other
            .get("natures")
            .and_then(|n| n.as_array())
            .into_iter()
            .flatten()
            .filter_map(|n| n.as_str())
            .map(str::to_string)
            .collect()
    }
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
    /// deep viewpoint of the technology layer: draw the links between the applications deployed in the same environment
    /// (they are "secondary", and not drawn, otherwise). It is what a facet is for: a view about one flow. A `facet` in
    /// the input turns it on; the CLI, which applies the facets to the workspace before it asks for a view, says it itself.
    #[serde(default, deserialize_with = "null_as_default")]
    application_links: bool,
    /// technology layer, overview, detailed and deep: leave out the boxes no link goes through (the focal element stays). A
    /// `facet` of the input can ask for it (`hide_unlinked`); the CLI says it itself, for the workspace of such a facet.
    #[serde(default, deserialize_with = "null_as_default")]
    hide_unlinked: bool,
    /// map: references of the elements that are open (their children are shown)
    #[serde(default, deserialize_with = "null_as_default")]
    opened: Vec<String>,
    /// map: references of the elements the view is about (none: the whole layer)
    #[serde(default, deserialize_with = "null_as_default")]
    pinned: Vec<String>,
    /// map: references of the elements left out, with what is inside them
    #[serde(default, deserialize_with = "null_as_default")]
    hidden: Vec<String>,
    /// map of the application layer (wave 026, run 0197, #143): the relationships to draw, each `{source, destination, label?}`. The boxes are then the ends of those
    /// relationships (projected on the first closed box, as ever), the pinned elements with what is open inside them, and what encloses all of these; the links are
    /// those relationships, still filtered by `hidden` and `pinned`. Absent, null or empty: the map is drawn as before. Kept as JSON so that the technology layer is refused
    /// before the shape of an entry is looked at (see `map_links`).
    #[serde(default, deserialize_with = "null_as_default")]
    links: Vec<serde_json::Value>,
    /// map of the technology layer, with `app_elements`: draw the applications deployed on the nodes that are open, as boxes inside them (absent or null: true; false:
    /// the nodes only). Without `app_elements`, or in the map of the application layer, it changes nothing.
    #[serde(default)]
    applications: Option<bool>,
    /// map: draw the links (absent or null: true; false: none, the boxes only). In the technology layer the links are the relationships the elements declare and the
    /// dependencies between environments the deployed applications give (see `derived_dependencies`), the second ones when `app_elements` is given.
    #[serde(default)]
    relationships: Option<bool>,
    /// show only what changed: the items and links whose `change` is new, changed or removed, the ends of those links and the
    /// focal item, and what encloses them (those kept for no change of their own are `context`). Without any `change` in
    /// the input, nothing changed: only the focal item and what encloses it stay.
    #[serde(default, deserialize_with = "null_as_default")]
    only_changes: bool,
    /// some element or relationship of the input carries `change`: the view is a comparison. Read before the facets run.
    #[serde(skip)]
    compared: bool,
}

/// An entry of `links`: the relationship an element declares, named by its source, its destination and its label (none: the relationship with no label).
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LinkRef {
    source: String,
    destination: String,
    #[serde(default)]
    label: Option<String>,
}

impl LinkRef {
    /// The label as the relationships are compared: trimmed, and none when empty.
    fn label(&self) -> Option<String> {
        normal_label(self.label.as_deref())
    }
}

fn normal_label(label: Option<&str>) -> Option<String> {
    label
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .map(str::to_string)
}

/// The entries of `links`, read; none when the input names none. Refused in the technology layer, then checked for shape.
fn map_links(input: &Input) -> Result<Vec<LinkRef>, String> {
    if input.links.is_empty() {
        return Ok(Vec::new());
    }
    if input.layer == "technology" {
        return Err("links is read in the map of the application layer only".to_string());
    }
    input
        .links
        .iter()
        .map(|entry| {
            serde_json::from_value::<LinkRef>(entry.clone())
                .map_err(|e| format!("invalid input: {e}"))
        })
        .collect()
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
    /// true when the relationship is declared by an element of the application layer, in a view of the technology
    /// layer (the applications deployed on its nodes): the caller finds it in the other layer
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    application: bool,
    /// what happened to the relationship, when the input said
    #[serde(skip_serializing_if = "Option::is_none")]
    change: Option<Change>,
}

impl OutRel {
    fn of(from: &str, rel: &Rel) -> OutRel {
        OutRel {
            from: from.to_string(),
            destination: rel.destination.clone(),
            label: rel.label.clone(),
            qualifiers: rel.qualifiers.clone(),
            tags: rel.tags.clone(),
            application: false,
            change: rel.change(),
        }
    }

    /// A relationship of a deployed application.
    fn of_application(from: &str, rel: &Rel) -> OutRel {
        OutRel {
            application: true,
            ..OutRel::of(from, rel)
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
    /// comparison only: what the relationships the link stands for add up to (see `aggregate`)
    #[serde(skip_serializing_if = "Option::is_none")]
    change: Option<Change>,
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
    /// the qualifiers of the element, then the words of its `rendering-stereotypes` tag (see `stereotypes_of`), then, in a
    /// comparison, the state of the element (see `add_stereotypes`)
    stereotypes: Vec<String>,
    /// comparison only: what happened to the element (the element itself, whatever is inside it)
    #[serde(skip_serializing_if = "Option::is_none")]
    change: Option<Change>,
    /// comparison only: why the element changed, as the input says
    #[serde(skip_serializing_if = "Vec::is_empty")]
    natures: Vec<String>,
    /// `only_changes`: the item is kept to give the changes their place, it has no change of its own
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    context: bool,
    /// comparison only: the element did not change, an element below it did. It is what the kernel computed, as opposed to the word
    /// `contains-changes` that an author may have written by hand and that the stereotypes then hold too (contract 5, issue #34)
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    contains_changes: bool,
}

impl OutItem {
    fn new(id: &str, reference: &str, parent: Option<String>) -> OutItem {
        OutItem {
            id: id.to_string(),
            reference: reference.to_string(),
            parent,
            collapsed: false,
            hidden: 0,
            expandable: false,
            stereotypes: Vec::new(),
            change: None,
            natures: Vec::new(),
            context: false,
            contains_changes: false,
        }
    }
}

/// The tag whose value lists the stereotypes (the names in `styles`) an element is drawn with, separated by whitespace.
const TAG_STEREOTYPES: &str = "rendering-stereotypes";

/// What a diagram says about an element: its qualifiers, as declared, then the words of its `rendering-stereotypes` tag;
/// nothing twice. Both come from the free-form properties of the element, where a caller that knows them puts them.
fn stereotypes_of(element: &Elem) -> Vec<String> {
    let qualifiers = element
        .other
        .get("qualifiers")
        .and_then(|q| q.as_array())
        .into_iter()
        .flatten()
        .filter_map(|q| q.as_str());
    let tagged = element
        .other
        .get("tags")
        .and_then(|t| t.get(TAG_STEREOTYPES))
        .and_then(|v| v.as_str())
        .into_iter()
        .flat_map(|v| v.split_whitespace());
    let mut out: Vec<String> = Vec::new();
    for stereotype in qualifiers.chain(tagged).filter(|s| !s.is_empty()) {
        if !out.iter().any(|known| known == stereotype) {
            out.push(stereotype.to_string());
        }
    }
    out
}

/// `name` is the last stereotype of the list, once: if the list already has it, it moves there.
fn push_last(stereotypes: &mut Vec<String>, name: &str) {
    stereotypes.retain(|known| known != name);
    stereotypes.push(name.to_string());
}

/// Tells each item what its element is drawn with. A deployed application (an item whose id is not its reference) is an
/// element of the application layer.
///
/// In a comparison the list ends with what the comparison says of the element: `new`, `changed` or `removed`, or
/// `contains-changes` for an element that did not change and has something below it that did. It goes last because the
/// last stereotype of a box is the one that wins, property by property, in the editor and in the CLI (which writes them
/// in reverse): the computed state has the last word over the same word written by hand, and over any other. A word
/// that was already there is not repeated, it moves.
fn add_stereotypes(items: &mut [OutItem], input: &Input) {
    let main: HashMap<&str, &Elem> = input
        .elements
        .iter()
        .map(|e| (e.reference.as_str(), e))
        .collect();
    let apps: HashMap<&str, &Elem> = input
        .app_elements
        .iter()
        .map(|e| (e.reference.as_str(), e))
        .collect();
    for item in items.iter_mut() {
        let layer = if item.id == item.reference {
            &main
        } else {
            &apps
        };
        if let Some(element) = layer.get(item.reference.as_str()) {
            item.stereotypes = stereotypes_of(element);
        }
        if let Some(state) = item.change.and_then(Change::stereotype) {
            push_last(&mut item.stereotypes, state);
        }
        if item.contains_changes {
            push_last(&mut item.stereotypes, STEREOTYPE_CONTAINS_CHANGES);
        }
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
fn is_descendant_of(candidate: &str, reference: &str) -> bool {
    // the segments of `reference` are the first ones of `candidate`, and `candidate` has more (no allocation: this is called for every pair of elements)
    candidate.len() > reference.len()
        && candidate.starts_with(reference)
        && candidate.as_bytes()[reference.len()] == b'.'
}
fn starts_with_parts(actual: &[&str], expected: &[&str]) -> bool {
    actual.len() >= expected.len() && actual[..expected.len()] == *expected
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
    /// the element (an application or one of its descendants) that declares `rel`, when the relationship is a dependency derived between
    /// two environments: the ends are then the nodes that host the applications, not the applications themselves
    application: Option<String>,
}

impl MetaLink {
    /// The relationship, as the link it ends up in stands for it.
    fn declared(&self) -> OutRel {
        match &self.application {
            Some(application) => OutRel::of_application(application, &self.rel),
            None => OutRel::of(&self.from, &self.rel),
        }
    }
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
    if is_ancestor_of(
        &down_reference(&down_reference_to(&ml.from, from_t)),
        &ml.to,
    ) {
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
    while out != real && expanded.contains(&out) && out != focal && !is_ancestor_of(&out, focal) {
        out = down_reference_to(real, level_from(&out) + 1);
    }
    out
}

fn groom(
    metas: &[MetaLink],
    dir: Direction,
    from_t: usize,
    to_t: usize,
    expanded: &[String],
    focal: &str,
) -> Vec<Groomed> {
    let mut by_key: BTreeMap<String, Groomed> = BTreeMap::new();
    for ml in metas {
        let (mut local_from, mut local_to) = (from_t, to_t);
        match dir {
            Direction::Egress => local_to = resolve_local_to(ml, local_from, local_to),
            Direction::Ingress => local_from = resolve_local_from(ml, local_from, local_to),
        }
        let mut gfrom = ml.from.clone();
        if level_from(&ml.from) > local_from {
            gfrom = open_down(
                &ml.from,
                down_reference_to(&ml.from, local_from),
                expanded,
                focal,
            );
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
            g.synthetic_src.insert(ml.declared());
        } else {
            g.natural.insert(ml.rel.clone());
            g.natural_src.insert(ml.declared());
        }
    }
    by_key.into_values().collect()
}

type Known<'a> = HashMap<&'a str, &'a Elem>;

/// What a view reads of the two layers and does not change from one view of the same input to the next (`quiet` builds one view per element, the map builds one
/// per box it could open): the elements by reference, the relationships of each element once, without duplicates and in order, the dependencies the deployed
/// applications give and the references that have a change below them. Each is worked out when it is first asked for. It borrows the two lists of elements only, not the
/// input, so that the viewpoint, the focal element and the lists of boxes of the input can change while it is held.
struct Shared<'a> {
    elements: &'a [Elem],
    app_elements: &'a [Elem],
    known: Known<'a>,
    app_known: OnceCell<Known<'a>>,
    rels: OnceCell<Vec<Vec<&'a Rel>>>,
    derived: OnceCell<Vec<Derived<'a>>>,
    local: OnceCell<Vec<Derived<'a>>>,
    main_above: OnceCell<HashSet<String>>,
    apps_above: OnceCell<HashSet<String>>,
}

impl<'a> Shared<'a> {
    fn new(elements: &'a [Elem], app_elements: &'a [Elem]) -> Self {
        Shared {
            elements,
            app_elements,
            known: elements.iter().map(|e| (e.reference.as_str(), e)).collect(),
            app_known: OnceCell::new(),
            rels: OnceCell::new(),
            derived: OnceCell::new(),
            local: OnceCell::new(),
            main_above: OnceCell::new(),
            apps_above: OnceCell::new(),
        }
    }

    /// The elements of the application layer by reference.
    fn app_known(&self) -> &Known<'a> {
        self.app_known.get_or_init(|| {
            self.app_elements
                .iter()
                .map(|e| (e.reference.as_str(), e))
                .collect()
        })
    }

    /// The relationships of each element, in the order of the elements: each distinct one once, sorted (what a `BTreeSet` of them gives).
    fn rels(&self) -> &[Vec<&'a Rel>] {
        self.rels.get_or_init(|| {
            self.elements
                .iter()
                .map(|e| {
                    e.relationships
                        .iter()
                        .collect::<BTreeSet<_>>()
                        .into_iter()
                        .collect()
                })
                .collect()
        })
    }

    /// The dependencies between environments (`derived_dependencies`).
    fn derived(&self) -> &[Derived<'a>] {
        self.derived.get_or_init(|| {
            derived_dependencies(self.elements, self.app_elements, self.app_known())
        })
    }

    /// The dependencies between applications of one environment (`local_dependencies`).
    fn local(&self) -> &[Derived<'a>] {
        self.local
            .get_or_init(|| local_dependencies(self.elements, self.app_elements, self.app_known()))
    }

    fn main_above(&self) -> &HashSet<String> {
        self.main_above.get_or_init(|| above_changes(self.elements))
    }

    fn apps_above(&self) -> &HashSet<String> {
        self.apps_above
            .get_or_init(|| above_changes(self.app_elements))
    }
}

fn require(known: &Known, dest: &str) -> Result<(), String> {
    if known.contains_key(dest) {
        Ok(())
    } else {
        Err(format!("dangling reference: {dest}"))
    }
}

/// MetaLinkFinderForEgress: relationships leaving the subtree rooted at `root`.
fn find_egress(shared: &Shared, root: &str) -> Result<Vec<MetaLink>, String> {
    let mut out = Vec::new();
    for (e, rels) in shared.elements.iter().zip(shared.rels()) {
        if e.reference == root || is_descendant_of(&e.reference, root) {
            for r in rels {
                if !is_descendant_of(&r.destination, root) {
                    require(&shared.known, &r.destination)?;
                    out.push(MetaLink {
                        from: e.reference.clone(),
                        to: r.destination.clone(),
                        rel: (*r).clone(),
                        application: None,
                    });
                }
            }
        }
    }
    Ok(out)
}

/// MetaLinkFinderForIngress: relationships coming from outside the subtree and targeting it.
fn find_ingress(shared: &Shared, root: &str) -> Result<Vec<MetaLink>, String> {
    let mut out = Vec::new();
    for (e, rels) in shared.elements.iter().zip(shared.rels()) {
        if is_descendant_of(&e.reference, root) {
            continue;
        }
        for r in rels {
            if r.destination == root || is_descendant_of(&r.destination, root) {
                require(&shared.known, &r.destination)?;
                out.push(MetaLink {
                    from: e.reference.clone(),
                    to: r.destination.clone(),
                    rel: (*r).clone(),
                    application: None,
                });
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

/// What makes two relationships read the same: destination, label, qualifiers and tags.
type ReadsTheSame<'a> = (
    &'a String,
    &'a Option<String>,
    &'a QSet,
    &'a BTreeMap<String, String>,
);
type Content = (BTreeSet<OutItem>, BTreeSet<OutLink>);

fn to_items(refs: &BTreeSet<String>) -> BTreeSet<OutItem> {
    refs.iter()
        .map(|r| OutItem::new(r, r, r.rfind('.').map(|i| r[..i].to_string())))
        .collect()
}

/// The links of a set of groomed ends: a grouped (synthetic) pair is one link, a natural pair is one link per distinct
/// relationship. Every end is added to `refs`.
fn emit_links(
    groomed: &[Groomed],
    default_label: &str,
    refs: &mut Vec<String>,
) -> BTreeSet<OutLink> {
    let mut links: BTreeSet<OutLink> = BTreeSet::new();
    for g in groomed {
        refs.push(g.from.clone());
        refs.push(g.to.clone());
        if !g.synthetic.is_empty() {
            let qualifiers = g
                .synthetic
                .iter()
                .flat_map(|r| r.qualifiers.iter().cloned())
                .collect();
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
                change: None,
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
                        .filter(|o| {
                            o.destination == r.destination
                                && o.label == r.label
                                && o.qualifiers == r.qualifiers
                                && o.tags == r.tags
                        })
                        .cloned()
                        .collect(),
                    change: None,
                });
            }
        }
    }
    links
}

/// OverviewViewpointFactory
fn overview(input: &Input, shared: &Shared, focal: &str) -> Result<Content, String> {
    let known = &shared.known;
    require(known, focal)?;
    let mut egress = find_egress(shared, focal)?;
    let mut ingress = find_ingress(shared, focal)?;
    if input.layer == "technology" {
        // the dependencies of the applications deployed in an environment on those of another one it uses are relationships
        // of the nodes that host them
        let mut dependencies: Vec<&Derived> = shared.derived().iter().collect();
        if input.application_links {
            dependencies.extend(shared.local());
        }
        for d in dependencies {
            let meta = MetaLink {
                from: d.from_node.to_string(),
                to: d.to_node.to_string(),
                rel: d.rel.clone(),
                application: Some(d.source.to_string()),
            };
            match (within(d.from_node, focal), within(d.to_node, focal)) {
                (true, false) => egress.push(meta),
                (false, true) => ingress.push(meta),
                _ => {}
            }
        }
    }
    let focal_level = level_from(focal);
    let mut groomed = groom(
        &egress,
        Direction::Egress,
        focal_level,
        0,
        &input.expanded,
        focal,
    );
    groomed.extend(groom(
        &ingress,
        Direction::Ingress,
        0,
        focal_level,
        &input.expanded,
        focal,
    ));

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
///
/// The map of the technology layer given the application layer (`app_elements`) draws, like the viewpoints of an element, the applications deployed on the nodes
/// (a box inside its node, drawn when the node is open: `applications`) and the dependencies the applications of an environment have on those of the environments it
/// `uses` (`derived_dependencies`, the ones the overview, the detailed and the deep viewpoints draw; the dependencies inside one environment stay out, as they are
/// "secondary" there), as links between the deployed applications when both boxes are drawn, else between the boxes they land on (`relationships`).
fn map(input: &Input, shared: &Shared) -> Result<Content, String> {
    let known = &shared.known;
    let link_refs = map_links(input)?;
    for reference in input
        .pinned
        .iter()
        .chain(input.opened.iter())
        .chain(input.hidden.iter())
    {
        require(known, reference)?;
    }
    for link in &link_refs {
        require(known, &link.source)?;
        require(known, &link.destination)?;
    }
    // the relationships the entries name, decided on the model before any filter: (source, destination, label)
    let selected: HashSet<(&str, &str, Option<String>)> = link_refs
        .iter()
        .map(|l| (l.source.as_str(), l.destination.as_str(), l.label()))
        .collect();
    for (n, link) in link_refs.iter().enumerate() {
        let matches = input
            .elements
            .iter()
            .filter(|e| e.reference == link.source)
            .flat_map(|e| e.relationships.iter())
            .any(|r| {
                r.destination == link.destination
                    && normal_label(r.label.as_deref()) == link.label()
            });
        if !matches {
            let label = match link.label() {
                Some(l) => format!("the label `{l}`"),
                None => "no label".to_string(),
            };
            return Err(format!(
                "`links[{n}]` names a relationship from `{}` to `{}` with {label}, which does not exist",
                link.source, link.destination
            ));
        }
    }
    let selecting = !link_refs.is_empty();
    let opened: HashSet<&str> = input.opened.iter().map(String::as_str).collect();
    let within = |x: &str, roots: &[String]| roots.iter().any(|r| x == r || is_descendant_of(x, r));
    let is_hidden = |x: &str| within(x, &input.hidden);
    let in_pinned = |x: &str| within(x, &input.pinned);
    let open =
        |node: &str| opened.contains(node) || input.pinned.iter().any(|p| is_ancestor_of(node, p));
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
    let draw_links = input.relationships.unwrap_or(true) || input.layer != "technology"; // the key means nothing in the map of the application layer
    let app_known = shared.app_known();

    // the applications deployed on the nodes that are open (and, when the map is pinned, inside what it is pinned on), by (node, application)
    let mut deployed_items: Vec<(String, String, String)> = Vec::new();
    if applies_applications(input) {
        for (node, app, id) in deployed_ids(input) {
            if visible(&node) && open(&node) && (input.pinned.is_empty() || in_pinned(&node)) {
                if !app_known.contains_key(app.as_str()) {
                    return Err(format!("dangling application reference: {app}"));
                }
                deployed_items.push((node, app, id));
            }
        }
    }
    let deployed_id: HashMap<(&str, &str), &str> = deployed_items
        .iter()
        .map(|(node, app, id)| ((node.as_str(), app.as_str()), id.as_str()))
        .collect();

    let mut by_key: BTreeMap<String, Groomed> = BTreeMap::new();
    if draw_links {
        for e in &input.elements {
            for r in e.relationships.iter().collect::<BTreeSet<_>>() {
                if selecting
                    && !selected.contains(&(
                        e.reference.as_str(),
                        r.destination.as_str(),
                        normal_label(r.label.as_deref()),
                    ))
                {
                    continue;
                }
                if is_hidden(&e.reference) || is_hidden(&r.destination) {
                    continue;
                }
                if !input.pinned.is_empty()
                    && !(in_pinned(&e.reference) || in_pinned(&r.destination))
                {
                    continue;
                }
                require(known, &r.destination)?;
                let (from, to) = (project(&e.reference), project(&r.destination));
                if from == to {
                    continue; // inside a closed element
                }
                let grouped = from != e.reference || to != r.destination;
                let g = by_key
                    .entry(format!("{} -> {}", from, to))
                    .or_insert_with(|| Groomed {
                        from: from.clone(),
                        to: to.clone(),
                        ..Default::default()
                    });
                if grouped {
                    g.synthetic.insert(r.clone());
                    g.synthetic_src.insert(OutRel::of(&e.reference, r));
                } else {
                    g.natural.insert(r.clone());
                    g.natural_src.insert(OutRel::of(&e.reference, r));
                }
            }
        }
        if input.layer == "technology" {
            for d in shared.derived() {
                let destination = d.to_app;
                if is_hidden(d.from_node) || is_hidden(d.to_node) {
                    continue;
                }
                if !input.pinned.is_empty() && !(in_pinned(d.from_node) || in_pinned(d.to_node)) {
                    continue;
                }
                // an end is the box of the application when it is drawn, else the first closed box met going down to its node
                let end = |node: &str, app: &str| -> (String, bool) {
                    match deployed_id.get(&(node, app)) {
                        Some(id) => (id.to_string(), true),
                        None => (project(node), false),
                    }
                };
                let ((from, from_app_box), (to, to_app_box)) =
                    (end(d.from_node, d.from_app), end(d.to_node, destination));
                if from == to {
                    continue;
                }
                let grouped =
                    (!from_app_box && from != d.from_node) || (!to_app_box && to != d.to_node);
                let g = by_key
                    .entry(format!("{} -> {}", from, to))
                    .or_insert_with(|| Groomed {
                        from: from.clone(),
                        to: to.clone(),
                        ..Default::default()
                    });
                if grouped {
                    g.synthetic.insert(d.rel.clone());
                    g.synthetic_src
                        .insert(OutRel::of_application(d.source, d.rel));
                } else {
                    g.natural.insert(d.rel.clone());
                    g.natural_src
                        .insert(OutRel::of_application(d.source, d.rel));
                }
            }
        }
    }
    let groomed: Vec<Groomed> = by_key.into_values().collect();
    let mut refs: Vec<String> = Vec::new();
    let links = emit_links(&groomed, &input.default_synthetic_label, &mut refs);
    // the ends of a link that are boxes of an application are not elements of the layer: they are added as items below
    let app_ids: HashSet<&str> = deployed_items
        .iter()
        .map(|(_, _, id)| id.as_str())
        .collect();
    refs.retain(|r| !app_ids.contains(r.as_str()));
    if input.pinned.is_empty() {
        if !selecting {
            refs.extend(
                input
                    .elements
                    .iter()
                    .filter(|e| visible(&e.reference))
                    .map(|e| e.reference.clone()),
            );
        }
    } else {
        refs.extend(input.pinned.iter().cloned());
        // the children of what is open inside a pinned element are all shown, linked or not
        refs.extend(
            input
                .elements
                .iter()
                .filter(|e| in_pinned(&e.reference) && visible(&e.reference))
                .map(|e| e.reference.clone()),
        );
    }
    let item_refs: BTreeSet<String> = with_ancestors(refs)
        .into_iter()
        .filter(|r| !is_hidden(r))
        .collect();
    for r in &item_refs {
        require(known, r)?;
    }
    let mut items = to_items(&item_refs);
    for (node, app, id) in &deployed_items {
        items.insert(OutItem::new(id, app, Some(node.clone())));
    }
    Ok((items, links))
}

/// The map of the technology layer draws the applications deployed on its nodes: it was given the application layer, and `applications` is not false.
fn applies_applications(input: &Input) -> bool {
    input.viewpoint == "map"
        && input.layer == "technology"
        && !input.app_elements.is_empty()
        && input.applications.unwrap_or(true)
}

/// The id of the box of each application deployed on each node, in the map of the technology layer: (node, application, id). The id is the last segment of the node and the
/// application, as the deep viewpoint names them, unless that reads the same for several of them or is the reference of an element: they are then named after the whole path of
/// their node. It is settled over every deployed application of the layer, not over the ones drawn, so that opening or hiding a box does not rename another.
fn deployed_ids(input: &Input) -> Vec<(String, String, String)> {
    let mut pairs: Vec<(&str, &str)> = Vec::new();
    for node in &input.elements {
        for app in node.applications.iter().collect::<BTreeSet<_>>() {
            pairs.push((node.reference.as_str(), app.as_str()));
        }
    }
    let short = |node: &str, app: &str| {
        format!(
            "{}_{}",
            parts(node).last().copied().unwrap_or(""),
            app.replace('.', "_")
        )
    };
    let mut uses: HashMap<String, usize> = HashMap::new();
    for (node, app) in &pairs {
        *uses.entry(short(node, app)).or_default() += 1;
    }
    let mut taken: HashSet<String> = input.elements.iter().map(|e| e.reference.clone()).collect();
    let mut out = Vec::new();
    for (node, app) in &pairs {
        let mut id = short(node, app);
        if uses[&id] > 1 || taken.contains(&id) {
            id = format!("{}_{}", node.replace('.', "_"), app.replace('.', "_"));
        }
        let base = id.clone();
        let mut n = 1;
        while !taken.insert(id.clone()) {
            n += 1;
            id = format!("{base}_{n}");
        }
        out.push((node.to_string(), app.to_string(), id));
    }
    out
}

/// DetailedViewpointFactory: the union of the overview of every direct child of the focal parent.
fn detailed(input: &Input, shared: &Shared) -> Result<Content, String> {
    let known = &shared.known;
    let focal = input.focal.as_str();
    let focal_elem = known
        .get(focal)
        .ok_or_else(|| format!("unknown focal element: {focal}"))?;
    if !focal_elem.parent {
        return Err(format!("the element {focal} is not a parent one"));
    }
    let mut items = BTreeSet::new();
    let mut links = BTreeSet::new();
    for e in &input.elements {
        if is_descendant_of(&e.reference, focal) && down_reference(&e.reference) == focal {
            let (i, l) = overview(input, shared, &e.reference)?;
            items.extend(i);
            links.extend(l);
        }
    }
    Ok((items, links))
}

/// Deep viewpoint (application layer): every relationship touching the focal subtree, no grooming.
fn deep(input: &Input, shared: &Shared) -> Result<(Content, Vec<String>), String> {
    let known = &shared.known;
    let focal = input.focal.as_str();
    require(known, focal)?;
    let mut metas = Vec::new();
    for e in &input.elements {
        if e.reference == focal || is_descendant_of(&e.reference, focal) {
            metas.extend(find_egress(shared, &e.reference)?);
            metas.extend(find_ingress(shared, &e.reference)?);
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
            change: None,
        });
    }
    let item_refs = with_ancestors(refs);
    for r in &item_refs {
        require(known, r)?;
    }
    let node_refs: Vec<String> = item_refs.iter().cloned().collect();
    Ok(((to_items(&item_refs), links), node_refs))
}

/// The environment of a technology element: the first segment of its reference.
fn environment_of(reference: &str) -> &str {
    reference.split('.').next().unwrap_or(reference)
}

/// `reference` is `scope` or is inside it.
fn within(reference: &str, scope: &str) -> bool {
    reference == scope || is_descendant_of(reference, scope)
}

/// A dependency between two deployed applications that live in two environments: `from_app`, deployed on `from_node`,
/// has the relationship `rel` towards `to_app`, deployed on `to_node`.
#[derive(Clone, Copy)]
struct Derived<'a> {
    from_node: &'a str,
    from_app: &'a str,
    /// the element that declares `rel`: `from_app` itself or one of its descendants
    source: &'a str,
    /// the deployed application the destination of `rel` is, or is inside (issue #139, decision T5)
    to_app: &'a str,
    to_node: &'a str,
    rel: &'a Rel,
}

/// Where each application is deployed, by application reference.
fn hosts_of_applications(elements: &[Elem]) -> BTreeMap<&str, BTreeSet<&str>> {
    let mut hosts: BTreeMap<&str, BTreeSet<&str>> = BTreeMap::new();
    for node in elements {
        for app in &node.applications {
            hosts
                .entry(app.as_str())
                .or_default()
                .insert(node.reference.as_str());
        }
    }
    hosts
}

/// The deployed application that `reference` is or is inside (the nearest one when applications are nested), if any: a relationship
/// towards a component of `shop.app` is a relationship towards the deployed application `shop.app` (issue #139, decision T5).
fn deployed_application_of<'a>(
    hosts: &BTreeMap<&'a str, BTreeSet<&'a str>>,
    reference: &str,
) -> Option<&'a str> {
    let mut end = reference.len();
    loop {
        if let Some((app, _)) = hosts.get_key_value(&reference[..end]) {
            return Some(*app);
        }
        end = reference[..end].rfind('.')?;
    }
}

/// The relationships that stand for the dependencies of a deployed application: its own and those of everything inside it
/// (issue #124: a relationship of `shop.app.payments` is a dependency of the node that hosts `shop.app`), each with the element
/// that declares it. One that ends inside the application itself is internal, not a dependency.
fn relationships_of_deployed<'a>(
    app_elements: &'a [Elem],
    app: &'a str,
) -> Vec<(&'a str, &'a Rel)> {
    let mut out = Vec::new();
    for elem in app_elements.iter().filter(|e| within(&e.reference, app)) {
        for rel in elem.relationships.iter().collect::<BTreeSet<_>>() {
            if within(&rel.destination, app) {
                continue; // internal to the application
            }
            out.push((elem.reference.as_str(), rel));
        }
    }
    out
}

/// The dependencies the applications of an environment have on applications deployed in another one. A relationship of
/// an application, or of anything inside it, towards another application, or anything inside it (issue #139), is a dependency of the node that hosts the first on the node that hosts
/// the second. An environment reaches what it hosts itself first; what it does not host, it finds in the environments
/// (or the nodes) it `uses`, and nowhere else: an application deployed in several environments is therefore reached
/// where the environment says so.
fn derived_dependencies<'a>(
    elements: &'a [Elem],
    app_elements: &'a [Elem],
    app_known: &Known<'a>,
) -> Vec<Derived<'a>> {
    let hosts = hosts_of_applications(elements);
    let scopes: HashMap<&str, &Vec<String>> = elements
        .iter()
        .filter(|e| !e.uses.is_empty())
        .map(|e| (e.reference.as_str(), &e.uses))
        .collect();
    let mut out = Vec::new();
    for (app, from_nodes) in &hosts {
        if !app_known.contains_key(app) {
            continue;
        }
        for (source, rel) in relationships_of_deployed(app_elements, app) {
            let Some(to_app) = deployed_application_of(&hosts, &rel.destination) else {
                continue;
            };
            let Some(to_nodes) = hosts.get(to_app) else {
                continue;
            };
            for from_node in from_nodes {
                let environment = environment_of(from_node);
                if to_nodes
                    .iter()
                    .any(|to_node| environment_of(to_node) == environment)
                {
                    continue; // hosted by the environment itself
                }
                let Some(scope) = scopes.get(environment) else {
                    continue;
                };
                for to_node in to_nodes
                    .iter()
                    .filter(|to_node| scope.iter().any(|used| within(to_node, used)))
                {
                    out.push(Derived {
                        from_node,
                        from_app: app,
                        source,
                        to_app,
                        to_node,
                        rel,
                    });
                }
            }
        }
    }
    out
}

/// The dependencies between the applications deployed in one environment, on different nodes: the node that hosts the
/// first depends on the node that hosts the second. Only a view about a flow (`application_links`) draws them.
fn local_dependencies<'a>(
    elements: &'a [Elem],
    app_elements: &'a [Elem],
    app_known: &Known<'a>,
) -> Vec<Derived<'a>> {
    let hosts = hosts_of_applications(elements);
    let mut out = Vec::new();
    for (app, from_nodes) in &hosts {
        if !app_known.contains_key(app) {
            continue;
        }
        for (source, rel) in relationships_of_deployed(app_elements, app) {
            let Some(to_app) = deployed_application_of(&hosts, &rel.destination) else {
                continue;
            };
            let Some(to_nodes) = hosts.get(to_app) else {
                continue;
            };
            for from_node in from_nodes {
                for to_node in to_nodes.iter().filter(|to_node| {
                    *to_node != from_node && environment_of(to_node) == environment_of(from_node)
                }) {
                    out.push(Derived {
                        from_node,
                        from_app: app,
                        source,
                        to_app,
                        to_node,
                        rel,
                    });
                }
            }
        }
    }
    out
}

/// TechnologyDeepViewpointFactory: the deep viewpoint plus every node inside the focal element, and the applications
/// deployed on the nodes. Inside an
/// environment, the applications are linked together with "secondary" links (which are not drawn, unless the view is about
/// a flow chosen by a facet: `application_links`) when one has a relationship towards another deployed one. Between two environments, the relationships of the applications are drawn
/// as links between the deployed applications, as far as the first environment `uses` the second.
fn deep_technology(input: &Input, shared: &Shared) -> Result<Content, String> {
    let known = &shared.known;
    let focal = input.focal.as_str();
    let ((mut items, mut links), tech_refs) = deep(input, shared)?;
    for e in &input.elements {
        for used in &e.uses {
            require(known, used)?;
        }
    }
    let app_known = shared.app_known();
    let hosts = hosts_of_applications(&input.elements);
    // the dependencies between environments that touch the focal element, with the nodes they end on
    let derived: Vec<Derived> = shared
        .derived()
        .iter()
        .copied()
        .filter(|d| within(d.from_node, focal) || within(d.to_node, focal))
        .collect();
    let mut node_refs: BTreeSet<String> = tech_refs.into_iter().collect();
    // an environment, or a node, is shown with everything it is made of, whether or not it takes part in a link
    node_refs.extend(with_ancestors(
        input
            .elements
            .iter()
            .filter(|e| within(&e.reference, focal))
            .map(|e| e.reference.clone()),
    ));
    node_refs.extend(with_ancestors(
        derived
            .iter()
            .flat_map(|d| [d.from_node.to_string(), d.to_node.to_string()]),
    ));
    for r in &node_refs {
        require(known, r)?;
    }
    items.extend(to_items(&node_refs));
    // (node, application, id) of the application items to create, one per hosting node and deployed application. The id
    // is the last segment of the node and the application, unless that reads the same for several of them (or for a
    // node of the view): they are then all named after the whole path of their node.
    let mut deployed: Vec<(&String, &String, String)> = Vec::new();
    for r in &node_refs {
        let node = known
            .get(r.as_str())
            .ok_or_else(|| format!("dangling reference: {r}"))?;
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
    // application reference -> (id of the item created for it, node that hosts it), one per hosting node
    let mut by_app: BTreeMap<String, Vec<(String, String)>> = BTreeMap::new();
    let mut item_of: HashMap<(String, String), String> = HashMap::new();
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
        by_app
            .entry((*app).clone())
            .or_default()
            .push((item_id.clone(), (*r).clone()));
        item_of.insert(((*r).clone(), (*app).clone()), item_id);
    }
    for (app, from_items) in &by_app {
        if !app_known.contains_key(app.as_str()) {
            return Err(format!("dangling application reference: {app}"));
        }
        for (from_id, from_node) in from_items {
            for (source, rel) in relationships_of_deployed(&input.app_elements, app) {
                let to_app = deployed_application_of(&hosts, &rel.destination);
                if let Some(to_items) = to_app.and_then(|to_app| by_app.get(to_app)) {
                    for (to_id, to_node) in to_items {
                        if environment_of(from_node) != environment_of(to_node) {
                            continue; // between two environments, only what the environment uses is drawn (below)
                        }
                        links.insert(OutLink {
                            from: from_id.clone(),
                            to: to_id.clone(),
                            label: if input.application_links {
                                rel.label.clone()
                            } else {
                                None
                            },
                            synthetic: false,
                            qualifiers: if input.application_links {
                                rel.qualifiers.clone()
                            } else {
                                QSet::default()
                            },
                            tags: rel.tags.clone(),
                            secondary: !input.application_links,
                            relationships: BTreeSet::from([OutRel::of_application(source, rel)]),
                            change: None,
                        });
                    }
                }
            }
        }
    }
    for d in &derived {
        let (Some(from), Some(to)) = (
            item_of.get(&(d.from_node.to_string(), d.from_app.to_string())),
            item_of.get(&(d.to_node.to_string(), d.to_app.to_string())),
        ) else {
            continue;
        };
        links.insert(OutLink {
            from: from.clone(),
            to: to.clone(),
            label: d.rel.label.clone(),
            synthetic: false,
            qualifiers: d.rel.qualifiers.clone(),
            tags: d.rel.tags.clone(),
            secondary: false,
            relationships: BTreeSet::from([OutRel::of_application(d.source, d.rel)]),
            change: None,
        });
    }
    Ok((items, links))
}

/// Two links that look the same (same ends, caption and kind) are one link standing for all their relationships.
fn merge_links(links: impl IntoIterator<Item = OutLink>) -> Vec<OutLink> {
    type Key = (
        String,
        String,
        Option<String>,
        bool,
        QSet,
        BTreeMap<String, String>,
        bool,
    );
    let mut merged: BTreeMap<Key, OutLink> = BTreeMap::new();
    for l in links {
        let key = (
            l.from.clone(),
            l.to.clone(),
            l.label.clone(),
            l.synthetic,
            l.qualifiers.clone(),
            l.tags.clone(),
            l.secondary,
        );
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
fn collapse(
    items: BTreeSet<OutItem>,
    links: Vec<OutLink>,
    input: &Input,
) -> (Vec<OutItem>, Vec<OutLink>) {
    if input.collapsed.is_empty() {
        return (items.into_iter().collect(), links);
    }
    let parent_of: HashMap<String, Option<String>> = items
        .iter()
        .map(|i| (i.id.clone(), i.parent.clone()))
        .collect();
    // the focal item must stay visible: a fold on one of its enclosing items is ignored
    let mut protected: HashSet<String> = HashSet::new();
    let mut cur = parent_of.get(&input.focal).cloned().flatten();
    while let Some(p) = cur {
        protected.insert(p.clone());
        cur = parent_of.get(&p).cloned().flatten();
    }
    let folded: HashSet<&String> = input
        .collapsed
        .iter()
        .filter(|c| parent_of.contains_key(*c) && !protected.contains(*c))
        .collect();
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
        let relationships: BTreeSet<OutRel> = group
            .iter()
            .flat_map(|(l, _)| l.relationships.iter().cloned())
            .collect();
        let qualifiers: QSet = group
            .iter()
            .flat_map(|(l, _)| l.qualifiers.iter().cloned())
            .collect();
        // like the overview: relationships that read the same (whoever declares them) count once
        let distinct: BTreeSet<ReadsTheSame> = relationships
            .iter()
            .map(|r| (&r.destination, &r.label, &r.qualifiers, &r.tags))
            .collect();
        let label = if distinct.len() == 1 {
            relationships
                .iter()
                .next()
                .and_then(|r| r.label.clone())
                .filter(|l| !l.trim().is_empty())
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
            change: None,
        });
    }
    (kept, merge_links(out))
}

/// A view that hides what is unlinked (`hide_unlinked`, technology layer) keeps what the links go through: the ends of the links,
/// what encloses them and the focal element; the boxes with no link are left out.
fn keep_the_flow(items: BTreeSet<OutItem>, links: BTreeSet<OutLink>, focal: &str) -> Content {
    let parents: HashMap<&str, &str> = items
        .iter()
        .filter_map(|i| i.parent.as_deref().map(|p| (i.id.as_str(), p)))
        .collect();
    let mut keep: HashSet<String> = HashSet::new();
    let mut pending: Vec<&str> = links
        .iter()
        .filter(|l| !l.secondary)
        .flat_map(|l| [l.from.as_str(), l.to.as_str()])
        .chain([focal])
        .collect();
    while let Some(id) = pending.pop() {
        if keep.insert(id.to_string()) {
            pending.extend(parents.get(id).copied());
        }
    }
    let kept = items
        .iter()
        .filter(|i| keep.contains(&i.id))
        .cloned()
        .collect();
    let links = links
        .into_iter()
        .filter(|l| keep.contains(&l.from) && keep.contains(&l.to))
        .collect();
    (kept, links)
}

/// What a link says of what changed: the changes of the relationships it stands for. All new is new, all removed is removed,
/// all `none` (or no change given) is `none`, and any other mixture is `changed`: a link that groups a new relationship
/// and an unchanged one has grown, and one that groups a new and a removed one has been replaced by something else.
fn aggregate(relationships: &BTreeSet<OutRel>) -> Change {
    let all = |wanted: Change| {
        relationships
            .iter()
            .all(|r| r.change.unwrap_or(Change::None) == wanted)
    };
    if relationships.is_empty() || all(Change::None) {
        Change::None
    } else if all(Change::New) {
        Change::New
    } else if all(Change::Removed) {
        Change::Removed
    } else {
        Change::Changed
    }
}

/// The references that have an element below them (in the reference tree, not only the elements that are listed) that is new,
/// changed or removed.
fn above_changes(elements: &[Elem]) -> HashSet<String> {
    let mut out = HashSet::new();
    for element in elements.iter().filter(|e| is_change(e.change())) {
        let p = parts(&element.reference);
        for i in 1..p.len() {
            out.insert(p[..i].join("."));
        }
    }
    out
}

/// A comparison: tells each item and each link what changed (`change`, `natures`, `contains-changes`). Then, for `only_changes`,
/// leaves out the rest.
fn annotate(
    mut items: Vec<OutItem>,
    mut links: Vec<OutLink>,
    input: &Input,
    shared: &Shared,
) -> (Vec<OutItem>, Vec<OutLink>) {
    if input.compared {
        let (main, apps) = (&shared.known, shared.app_known());
        let (main_above, apps_above) = (shared.main_above(), shared.apps_above());
        for item in items.iter_mut() {
            let main_layer = item.id == item.reference;
            let element = if main_layer { main } else { apps }.get(item.reference.as_str());
            let change = element.and_then(|e| e.change()).unwrap_or(Change::None);
            item.change = Some(change);
            item.natures = element.map(|e| e.natures()).unwrap_or_default();
            // an element that changed says so itself; a container is not `changed` because of what is inside it
            item.contains_changes = change == Change::None
                && if main_layer { main_above } else { apps_above }.contains(&item.reference);
        }
        for link in links.iter_mut() {
            link.change = Some(aggregate(&link.relationships));
        }
    }
    if input.only_changes {
        return keep_changes(items, links, input);
    }
    (items, links)
}

/// `only_changes`: what changed, with its context. Kept: the items and the links whose change is new, changed or removed, the
/// ends of the links that are drawn, a folded item that hides changes, the focal item, and what encloses all of them. An
/// item kept for none of its own changes is `context`. A link is kept for its own change only: the unchanged links between
/// the items that stay are left out.
fn keep_changes(
    items: Vec<OutItem>,
    links: Vec<OutLink>,
    input: &Input,
) -> (Vec<OutItem>, Vec<OutLink>) {
    let parents: HashMap<&str, &str> = items
        .iter()
        .filter_map(|i| i.parent.as_deref().map(|p| (i.id.as_str(), p)))
        .collect();
    let mut keep: HashSet<String> = HashSet::new();
    let mut pending: Vec<&str> = Vec::new();
    pending.extend(
        items
            .iter()
            .filter(|i| is_change(i.change) || (i.collapsed && i.contains_changes))
            .map(|i| i.id.as_str()),
    );
    pending.extend(
        links
            .iter()
            .filter(|l| is_change(l.change) && !l.secondary)
            .flat_map(|l| [l.from.as_str(), l.to.as_str()]),
    );
    if input.viewpoint != "map" {
        pending.extend(
            items
                .iter()
                .filter(|i| i.id == input.focal)
                .map(|i| i.id.as_str()),
        );
    }
    while let Some(id) = pending.pop() {
        if keep.insert(id.to_string()) {
            pending.extend(parents.get(id).copied());
        }
    }
    let kept: Vec<OutItem> = items
        .iter()
        .filter(|i| keep.contains(&i.id))
        .cloned()
        .map(|mut i| {
            i.context = !is_change(i.change);
            i
        })
        .collect();
    let links = links
        .into_iter()
        .filter(|l| is_change(l.change) && keep.contains(&l.from) && keep.contains(&l.to))
        .collect();
    (kept, links)
}

/// The view of the input: the viewpoint, then the folds, then what changed.
fn build(input: &Input) -> Result<(Vec<OutItem>, Vec<OutLink>), String> {
    build_in(input, &Shared::new(&input.elements, &input.app_elements))
}

/// `build` with what the views of the same elements share already at hand (see `Shared`).
fn build_in(input: &Input, shared: &Shared) -> Result<(Vec<OutItem>, Vec<OutLink>), String> {
    let (items, links) = match input.viewpoint.as_str() {
        "overview" => overview(input, shared, &input.focal),
        "map" => map(input, shared),
        "detailed" => detailed(input, shared),
        "deep" if input.layer == "technology" => deep_technology(input, shared),
        "deep" => deep(input, shared).map(|(c, _)| c),
        other => Err(format!("unsupported viewpoint: {other}")),
    }?;
    let (items, links) =
        if input.hide_unlinked && input.layer == "technology" && input.viewpoint != "map" {
            keep_the_flow(items, links, &input.focal)
        } else {
            (items, links)
        };
    let (items, links) = collapse(items, merge_links(links), input);
    Ok(annotate(items, links, input, shared))
}

/// Flags the items that hide children of the model, and whose opening changes the view: a leaf of the view whose element
/// has children, that is not folded. Whether opening it (`expanded`, or `opened` in the map) changes anything is asked
/// to the view itself, so that a box is never offered when the focal element, a fold or the links make it a no-op.
fn mark_expandable(items: &mut [OutItem], links: &[OutLink], input: &mut Input) {
    let with_children: HashSet<String> = input
        .elements
        .iter()
        .filter(|e| e.reference.contains('.'))
        .map(|e| down_reference(&e.reference))
        .collect();
    let shown_parents: HashSet<String> = items.iter().filter_map(|i| i.parent.clone()).collect();
    let map = input.viewpoint == "map";
    // the map of the technology layer: a node that hosts applications has children to show too
    let hosts: HashSet<String> = if applies_applications(input) {
        input
            .elements
            .iter()
            .filter(|e| !e.applications.is_empty())
            .map(|e| e.reference.clone())
            .collect()
    } else {
        HashSet::new()
    };
    let shown: Vec<OutItem> = items.to_vec();
    // the lists of boxes to open change from one try to the next, the elements do not
    let shared = Shared::new(&input.elements, &input.app_elements);
    for item in items.iter_mut() {
        if item.collapsed
            || item.id != item.reference
            || !(with_children.contains(&item.id) || hosts.contains(&item.id))
            || shown_parents.contains(&item.id)
        {
            continue;
        }
        let opened = if map {
            &mut input.opened
        } else {
            &mut input.expanded
        };
        opened.push(item.id.clone());
        let opens = build_in(input, &shared);
        let opened = if map {
            &mut input.opened
        } else {
            &mut input.expanded
        };
        opened.pop();
        item.expandable = matches!(opens, Ok((i, l)) if i != shown || l != links);
    }
}

/// Every `change` of the input must be one of the four words; a view is a comparison when any element or relationship has one.
/// Read before the facets run, so that a facet that removes everything that changed does not turn the comparison into a view.
fn check_changes(input: &mut Input) -> Result<(), String> {
    // `compare` says `contains_changes` on the elements of its union, and `compute` works the state out for the elements it is given (after the
    // facets): the key is not a free-form field here, a facet does not see it and it does not travel (contract 5, issue #96)
    for element in input
        .elements
        .iter_mut()
        .chain(input.app_elements.iter_mut())
    {
        element.other.remove("contains_changes");
        element.other.remove("contains_more_than_wording");
    }
    for element in input.elements.iter().chain(input.app_elements.iter()) {
        match element.other.get("change") {
            None | Some(serde_json::Value::Null) => {}
            Some(value) => {
                if !value.as_str().is_some_and(|c| Change::parse(c).is_some()) {
                    return Err(format!("invalid change: {value} in {}", element.reference));
                }
                input.compared = true;
            }
        }
        for rel in &element.relationships {
            if let Some(change) = &rel.change {
                // a relationship is new, changed or removed; moved, split and merged are for elements
                if Change::parse(change).is_none_or(Change::is_identity) {
                    return Err(format!(
                        "invalid change: \"{change}\" in a relationship of {}",
                        element.reference
                    ));
                }
                input.compared = true;
            }
        }
    }
    Ok(())
}

/// What `compute` and `quiet` do to an input before they build a view: check the `change`s, then apply the facet to the elements (it is taken out of
/// the input, which then says `application_links` and `hide_unlinked` for it). Returns the warnings of the facet.
fn prepare(input: &mut Input) -> Result<Vec<String>, String> {
    check_changes(input)?;
    match input.facet.take() {
        Some(facet) => {
            input.application_links = true;
            input.hide_unlinked |= facet.hide_unlinked;
            facet::apply_to_input(input, &facet)
        }
        None => Ok(Vec::new()),
    }
}

/// An element `quiet` is asked about: its reference, and the viewpoint to draw it in when it is not the one of the input.
#[derive(Deserialize)]
struct QuietFocal {
    reference: String,
    #[serde(default, deserialize_with = "null_as_default")]
    viewpoint: String,
}

/// Which elements have nothing to draw (the sixth entry point, issue #81): the input of `compute`, without `focal`, and `focals`, the
/// elements to ask about (each `{reference, viewpoint?}`, the viewpoint of the input when it says none). The facet and the checks of the input are
/// done once, then the view of each focal element is built as `compute` would build it, and the answer is the references, in the order given, whose view
/// has no link that is not `secondary` (the view an author sees empty). A view that cannot be built is one of them when the input has a `facet` (the
/// facet removed the element, or what it needs: the same answer `compute` gives as an error) and none otherwise. An input that cannot be read, a
/// facet that fails and a `change` that is not a word are the one `{error}` for all the focal elements, as they are for `compute`. The map has no focal
/// element and is refused. `warnings` of the facet are not repeated: `compute` says them.
pub fn quiet_json(input: &str) -> String {
    let result = serde_json::from_str::<serde_json::Value>(input)
        .map_err(|e| format!("invalid input: {e}"))
        .and_then(|mut value| {
            let focals = value
                .as_object_mut()
                .and_then(|object| object.remove("focals"))
                .ok_or_else(|| "invalid input: missing field `focals`".to_string())?;
            let focals = serde_json::from_value::<Vec<QuietFocal>>(focals)
                .map_err(|e| format!("invalid input: {e}"))?;
            let mut input = serde_json::from_value::<Input>(value)
                .map_err(|e| format!("invalid input: {e}"))?;
            let through_facet = input.facet.is_some();
            prepare(&mut input)?;
            let default_viewpoint = input.viewpoint.clone();
            // what every focal element shares is worked out once (`input.viewpoint` and `input.focal` change below, the elements do not)
            let shared = Shared::new(&input.elements, &input.app_elements);
            let mut quiet: Vec<String> = Vec::new();
            for focal in focals {
                input.viewpoint = if focal.viewpoint.is_empty() {
                    default_viewpoint.clone()
                } else {
                    focal.viewpoint
                };
                if input.viewpoint == "map" {
                    return Err(
                        "the map has no focal element: nothing to ask quiet about".to_string()
                    );
                }
                input.focal = focal.reference.clone();
                let nothing_to_draw = match build_in(&input, &shared) {
                    Ok((_, links)) => links.iter().all(|link| link.secondary),
                    Err(_) => through_facet,
                };
                if nothing_to_draw {
                    quiet.push(focal.reference);
                }
            }
            Ok(serde_json::json!({ "version": CONTRACT_VERSION, "quiet": quiet }).to_string())
        });
    result.unwrap_or_else(|e| serde_json::json!({ "error": e }).to_string())
}

pub fn compute_json(input: &str) -> String {
    // the entries of `pinned`, `opened` and `hidden` that the map cannot find, when it fails on one of them (see `dangling_in_lists`)
    let mut dangling: Vec<String> = Vec::new();
    let result = serde_json::from_str::<Input>(input)
        .map_err(|e| format!("invalid input: {e}"))
        .and_then(|mut input| {
            let warnings = prepare(&mut input)?;
            let (mut items, links) = build(&input).inspect_err(|_| {
                dangling = dangling_in_lists(&input);
            })?;
            if input.viewpoint != "deep" {
                mark_expandable(&mut items, &links, &mut input);
            }
            add_stereotypes(&mut items, &input);
            Ok(Output {
                version: CONTRACT_VERSION,
                items,
                links,
                warnings,
            })
        })
        .and_then(|out| {
            serde_json::to_string(&out).map_err(|e| format!("cannot write the view: {e}"))
        });
    result.unwrap_or_else(|e| {
        let mut out = serde_json::json!({ "error": e });
        if !dangling.is_empty() {
            out["dangling"] = serde_json::json!(dangling);
        }
        out.to_string()
    })
}

/// The entries of `pinned`, `opened` and `hidden` (in this order, each once) that are not elements of the layer, when the
/// map is the view that failed: the map checks the three lists before it draws, so a failure of the map with such an entry
/// is that failure, and `error` names the first of them. A caller that edits the lists (the editor, after a facet removed
/// what they name) asks for all of them at once instead of one computation each. Empty for any other failure.
fn dangling_in_lists(input: &Input) -> Vec<String> {
    if input.viewpoint != "map" {
        return Vec::new();
    }
    let known: HashSet<&str> = input
        .elements
        .iter()
        .map(|e| e.reference.as_str())
        .collect();
    let mut seen: HashSet<&str> = HashSet::new();
    // the ends of the links come after the three lists; an input whose links cannot be read has none to list
    let ends: Vec<String> = map_links(input)
        .unwrap_or_default()
        .into_iter()
        .flat_map(|l| [l.source, l.destination])
        .collect();
    input
        .pinned
        .iter()
        .chain(input.opened.iter())
        .chain(input.hidden.iter())
        .chain(ends.iter())
        .filter(|r| !known.contains(r.as_str()) && seen.insert(r.as_str()))
        .cloned()
        .collect()
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

/// # Safety
///
/// `ptr` and `len` must be the pointer and the capacity of a buffer that `alloc` returned for `len` and that nothing has freed.
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
///
/// # Safety
///
/// `ptr` must point to `len` bytes that the caller owns and can read for the whole call (the buffer of `alloc`).
#[no_mangle]
pub unsafe extern "C" fn compute(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, compute_json)
}

/// The facets: see `apply_facet_json`.
///
/// # Safety
///
/// `ptr` must point to `len` bytes that the caller owns and can read for the whole call (the buffer of `alloc`).
#[no_mangle]
pub unsafe extern "C" fn apply_facet(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, apply_facet_json)
}

/// The comparison of two plateaus: see `compare_json`.
///
/// # Safety
///
/// `ptr` must point to `len` bytes that the caller owns and can read for the whole call (the buffer of `alloc`).
#[no_mangle]
pub unsafe extern "C" fn compare(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, compare_json)
}

/// Which elements have nothing to draw (contract 5, issue #81): see `quiet_json`.
///
/// # Safety
///
/// `ptr` must point to `len` bytes that the caller owns and can read for the whole call (the buffer of `alloc`).
#[no_mangle]
pub unsafe extern "C" fn quiet(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, quiet_json)
}

/// The patches of a plateau: see `apply_patches_json`.
///
/// # Safety
///
/// `ptr` must point to `len` bytes that the caller owns and can read for the whole call (the buffer of `alloc`).
#[no_mangle]
pub unsafe extern "C" fn apply_patches(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, apply_patches_json)
}

/// The seven state words (contract 5): see `states_json`. The input is not read (not even checked to be UTF-8), so it takes the same two arguments as
/// the other entry points and any caller may send anything.
///
/// # Safety
///
/// Nothing is read from `_ptr`; the one requirement is that the host calls it as it calls the others, from a single thread.
#[no_mangle]
pub unsafe extern "C" fn states(_ptr: *const u8, _len: usize) -> usize {
    #[allow(static_mut_refs)]
    {
        RESULT = states_json().into_bytes();
        RESULT.len()
    }
}

/// The address of the bytes the last call left; `RESULT` is read after the call that wrote it, never during one.
///
/// # Safety
///
/// Call it from the single thread of the module, and read the bytes before the next entry point runs.
#[no_mangle]
pub unsafe extern "C" fn result_ptr() -> *const u8 {
    #[allow(static_mut_refs)]
    RESULT.as_ptr()
}

#[cfg(test)]
mod abi_tests;

#[cfg(test)]
mod change_tests;

#[cfg(test)]
mod patch_tests;

#[cfg(test)]
mod quiet_tests;

#[cfg(test)]
#[path = "lib_tests.rs"]
mod tests;
