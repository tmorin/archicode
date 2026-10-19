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
//! standard JSONPath (RFC 9535), see `facet.rs`; the earlier dialect still works and is reported in `warnings`.
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
//! A map that fails on `pinned`, `opened` or `hidden` (`dangling reference: x`, the first of them) also lists all the entries it cannot find, in
//! `dangling` of the error: a key of the error only, added to version 4 (an input that worked gives the same output).
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
//! `compute`, `apply_facet` and `apply_patches` take what they took; their answers say the version, 5, and an item of a comparison gained `contains_changes`.
mod compare;
mod facet;
mod patch;

pub use compare::compare_json;
pub use facet::apply_facet_json;
pub use patch::apply_patches_json;

use serde::{Deserialize, Serialize};
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
fn null_as_default<'de, D: serde::Deserializer<'de>, T: Deserialize<'de> + Default>(d: D) -> Result<T, D::Error> {
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
        self.other.get("change").and_then(|c| c.as_str()).and_then(Change::parse)
    }

    /// The `natures` of the change, as `compare` lists them (free-form: they only travel).
    fn natures(&self) -> Vec<String> {
        self.other.get("natures").and_then(|n| n.as_array()).into_iter().flatten().filter_map(|n| n.as_str()).map(str::to_string).collect()
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
    /// show only what changed: the items and links whose `change` is new, changed or removed, the ends of those links and the
    /// focal item, and what encloses them (those kept for no change of their own are `context`). Without any `change` in
    /// the input, nothing changed: only the focal item and what encloses it stay.
    #[serde(default, deserialize_with = "null_as_default")]
    only_changes: bool,
    /// some element or relationship of the input carries `change`: the view is a comparison. Read before the facets run.
    #[serde(skip)]
    compared: bool,
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
        OutRel { application: true, ..OutRel::of(from, rel) }
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
        OutItem { id: id.to_string(), reference: reference.to_string(), parent, collapsed: false, hidden: 0, expandable: false, stereotypes: Vec::new(), change: None, natures: Vec::new(), context: false, contains_changes: false }
    }
}

/// The tag whose value lists the stereotypes (the names in `styles`) an element is drawn with, separated by whitespace.
const TAG_STEREOTYPES: &str = "rendering-stereotypes";

/// What a diagram says about an element: its qualifiers, as declared, then the words of its `rendering-stereotypes` tag;
/// nothing twice. Both come from the free-form properties of the element, where a caller that knows them puts them.
fn stereotypes_of(element: &Elem) -> Vec<String> {
    let qualifiers = element.other.get("qualifiers").and_then(|q| q.as_array()).into_iter().flatten().filter_map(|q| q.as_str());
    let tagged = element.other.get("tags").and_then(|t| t.get(TAG_STEREOTYPES)).and_then(|v| v.as_str()).into_iter().flat_map(|v| v.split_whitespace());
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
    let main: HashMap<&str, &Elem> = input.elements.iter().map(|e| (e.reference.as_str(), e)).collect();
    let apps: HashMap<&str, &Elem> = input.app_elements.iter().map(|e| (e.reference.as_str(), e)).collect();
    for item in items.iter_mut() {
        let layer = if item.id == item.reference { &main } else { &apps };
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
    /// the application that declares `rel`, when the relationship is a dependency derived between two environments:
    /// the ends are then the nodes that host the applications, not the applications themselves
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
            g.synthetic_src.insert(ml.declared());
        } else {
            g.natural.insert(ml.rel.clone());
            g.natural_src.insert(ml.declared());
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
                    out.push(MetaLink { from: e.reference.clone(), to: r.destination.clone(), rel: r.clone(), application: None });
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
                out.push(MetaLink { from: e.reference.clone(), to: r.destination.clone(), rel: r.clone(), application: None });
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
                        .filter(|o| o.destination == r.destination && o.label == r.label && o.qualifiers == r.qualifiers && o.tags == r.tags)
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
fn overview(input: &Input, known: &Known, focal: &str) -> Result<Content, String> {
    require(known, focal)?;
    let mut egress = find_egress(&input.elements, known, focal)?;
    let mut ingress = find_ingress(&input.elements, known, focal)?;
    if input.layer == "technology" {
        // the dependencies of the applications deployed in an environment on those of another one it uses are relationships
        // of the nodes that host them
        let app_known: Known = input.app_elements.iter().map(|e| (e.reference.as_str(), e)).collect();
        let mut dependencies = derived_dependencies(input, &app_known);
        if input.application_links {
            dependencies.extend(local_dependencies(input, &app_known));
        }
        for d in dependencies {
            let meta = MetaLink { from: d.from_node.to_string(), to: d.to_node.to_string(), rel: d.rel.clone(), application: Some(d.from_app.to_string()) };
            match (within(d.from_node, focal), within(d.to_node, focal)) {
                (true, false) => egress.push(meta),
                (false, true) => ingress.push(meta),
                _ => {}
            }
        }
    }
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
struct Derived<'a> {
    from_node: &'a str,
    from_app: &'a str,
    to_node: &'a str,
    rel: &'a Rel,
}

/// Where each application is deployed, by application reference.
fn hosts_of_applications(elements: &[Elem]) -> BTreeMap<&str, BTreeSet<&str>> {
    let mut hosts: BTreeMap<&str, BTreeSet<&str>> = BTreeMap::new();
    for node in elements {
        for app in &node.applications {
            hosts.entry(app.as_str()).or_default().insert(node.reference.as_str());
        }
    }
    hosts
}

/// The dependencies the applications of an environment have on applications deployed in another one. A relationship of
/// an application towards another application is a dependency of the node that hosts the first on the node that hosts
/// the second. An environment reaches what it hosts itself first; what it does not host, it finds in the environments
/// (or the nodes) it `uses`, and nowhere else: an application deployed in several environments is therefore reached
/// where the environment says so.
fn derived_dependencies<'a>(input: &'a Input, app_known: &Known<'a>) -> Vec<Derived<'a>> {
    let hosts = hosts_of_applications(&input.elements);
    let scopes: HashMap<&str, &Vec<String>> = input.elements.iter().filter(|e| !e.uses.is_empty()).map(|e| (e.reference.as_str(), &e.uses)).collect();
    let mut out = Vec::new();
    for (app, from_nodes) in &hosts {
        let Some(elem) = app_known.get(app) else { continue };
        for rel in elem.relationships.iter().collect::<BTreeSet<_>>() {
            let Some(to_nodes) = hosts.get(rel.destination.as_str()) else { continue };
            for from_node in from_nodes {
                let environment = environment_of(from_node);
                if to_nodes.iter().any(|to_node| environment_of(to_node) == environment) {
                    continue; // hosted by the environment itself
                }
                let Some(scope) = scopes.get(environment) else { continue };
                for to_node in to_nodes.iter().filter(|to_node| scope.iter().any(|used| within(to_node, used))) {
                    out.push(Derived { from_node, from_app: app, to_node, rel });
                }
            }
        }
    }
    out
}

/// The dependencies between the applications deployed in one environment, on different nodes: the node that hosts the
/// first depends on the node that hosts the second. Only a view about a flow (`application_links`) draws them.
fn local_dependencies<'a>(input: &'a Input, app_known: &Known<'a>) -> Vec<Derived<'a>> {
    let hosts = hosts_of_applications(&input.elements);
    let mut out = Vec::new();
    for (app, from_nodes) in &hosts {
        let Some(elem) = app_known.get(app) else { continue };
        for rel in elem.relationships.iter().collect::<BTreeSet<_>>() {
            let Some(to_nodes) = hosts.get(rel.destination.as_str()) else { continue };
            for from_node in from_nodes {
                for to_node in to_nodes.iter().filter(|to_node| *to_node != from_node && environment_of(to_node) == environment_of(from_node)) {
                    out.push(Derived { from_node, from_app: app, to_node, rel });
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
fn deep_technology(input: &Input, known: &Known) -> Result<Content, String> {
    let focal = input.focal.as_str();
    let ((mut items, mut links), tech_refs) = deep(input, known)?;
    for e in &input.elements {
        for used in &e.uses {
            require(known, used)?;
        }
    }
    let app_known: Known = input.app_elements.iter().map(|e| (e.reference.as_str(), e)).collect();
    // the dependencies between environments that touch the focal element, with the nodes they end on
    let derived: Vec<Derived> = derived_dependencies(input, &app_known)
        .into_iter()
        .filter(|d| within(d.from_node, focal) || within(d.to_node, focal))
        .collect();
    let mut node_refs: BTreeSet<String> = tech_refs.into_iter().collect();
    // an environment, or a node, is shown with everything it is made of, whether or not it takes part in a link
    node_refs.extend(with_ancestors(input.elements.iter().filter(|e| within(&e.reference, focal)).map(|e| e.reference.clone())));
    node_refs.extend(with_ancestors(derived.iter().flat_map(|d| [d.from_node.to_string(), d.to_node.to_string()])));
    for r in &node_refs {
        require(known, r)?;
    }
    items.extend(to_items(&node_refs));
    // (node, application, id) of the application items to create, one per hosting node and deployed application. The id
    // is the last segment of the node and the application, unless that reads the same for several of them (or for a
    // node of the view): they are then all named after the whole path of their node.
    let mut deployed: Vec<(&String, &String, String)> = Vec::new();
    for r in &node_refs {
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
        by_app.entry((*app).clone()).or_default().push((item_id.clone(), (*r).clone()));
        item_of.insert(((*r).clone(), (*app).clone()), item_id);
    }
    for (app, from_items) in &by_app {
        let app_elem = app_known.get(app.as_str()).ok_or_else(|| format!("dangling application reference: {app}"))?;
        for (from_id, from_node) in from_items {
            for rel in app_elem.relationships.iter().collect::<BTreeSet<_>>() {
                if let Some(to_items) = by_app.get(&rel.destination) {
                    for (to_id, to_node) in to_items {
                        if environment_of(from_node) != environment_of(to_node) {
                            continue; // between two environments, only what the environment uses is drawn (below)
                        }
                        links.insert(OutLink {
                            from: from_id.clone(),
                            to: to_id.clone(),
                            label: if input.application_links { rel.label.clone() } else { None },
                            synthetic: false,
                            qualifiers: if input.application_links { rel.qualifiers.clone() } else { QSet::default() },
                            tags: rel.tags.clone(),
                            secondary: !input.application_links,
                            relationships: BTreeSet::from([OutRel::of_application(app, rel)]),
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
            item_of.get(&(d.to_node.to_string(), d.rel.destination.clone())),
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
            relationships: BTreeSet::from([OutRel::of_application(d.from_app, d.rel)]),
            change: None,
        });
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
            change: None,
        });
    }
    (kept, merge_links(out))
}

/// A view that hides what is unlinked (`hide_unlinked`, technology layer) keeps what the links go through: the ends of the links,
/// what encloses them and the focal element; the boxes with no link are left out.
fn keep_the_flow(items: BTreeSet<OutItem>, links: BTreeSet<OutLink>, focal: &str) -> Content {
    let parents: HashMap<&str, &str> = items.iter().filter_map(|i| i.parent.as_deref().map(|p| (i.id.as_str(), p))).collect();
    let mut keep: HashSet<String> = HashSet::new();
    let mut pending: Vec<&str> = links.iter().filter(|l| !l.secondary).flat_map(|l| [l.from.as_str(), l.to.as_str()]).chain([focal]).collect();
    while let Some(id) = pending.pop() {
        if keep.insert(id.to_string()) {
            pending.extend(parents.get(id).copied());
        }
    }
    let kept = items.iter().filter(|i| keep.contains(&i.id)).cloned().collect();
    let links = links.into_iter().filter(|l| keep.contains(&l.from) && keep.contains(&l.to)).collect();
    (kept, links)
}

/// What a link says of what changed: the changes of the relationships it stands for. All new is new, all removed is removed,
/// all `none` (or no change given) is `none`, and any other mixture is `changed`: a link that groups a new relationship
/// and an unchanged one has grown, and one that groups a new and a removed one has been replaced by something else.
fn aggregate(relationships: &BTreeSet<OutRel>) -> Change {
    let all = |wanted: Change| relationships.iter().all(|r| r.change.unwrap_or(Change::None) == wanted);
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
fn annotate(mut items: Vec<OutItem>, mut links: Vec<OutLink>, input: &Input) -> (Vec<OutItem>, Vec<OutLink>) {
    if input.compared {
        let main: HashMap<&str, &Elem> = input.elements.iter().map(|e| (e.reference.as_str(), e)).collect();
        let apps: HashMap<&str, &Elem> = input.app_elements.iter().map(|e| (e.reference.as_str(), e)).collect();
        let (main_above, apps_above) = (above_changes(&input.elements), above_changes(&input.app_elements));
        for item in items.iter_mut() {
            let main_layer = item.id == item.reference;
            let element = if main_layer { &main } else { &apps }.get(item.reference.as_str());
            let change = element.and_then(|e| e.change()).unwrap_or(Change::None);
            item.change = Some(change);
            item.natures = element.map(|e| e.natures()).unwrap_or_default();
            // an element that changed says so itself; a container is not `changed` because of what is inside it
            item.contains_changes = change == Change::None && if main_layer { &main_above } else { &apps_above }.contains(&item.reference);
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
fn keep_changes(items: Vec<OutItem>, links: Vec<OutLink>, input: &Input) -> (Vec<OutItem>, Vec<OutLink>) {
    let parents: HashMap<&str, &str> = items.iter().filter_map(|i| i.parent.as_deref().map(|p| (i.id.as_str(), p))).collect();
    let mut keep: HashSet<String> = HashSet::new();
    let mut pending: Vec<&str> = Vec::new();
    pending.extend(items.iter().filter(|i| is_change(i.change) || (i.collapsed && i.contains_changes)).map(|i| i.id.as_str()));
    pending.extend(links.iter().filter(|l| is_change(l.change) && !l.secondary).flat_map(|l| [l.from.as_str(), l.to.as_str()]));
    if input.viewpoint != "map" {
        pending.extend(items.iter().filter(|i| i.id == input.focal).map(|i| i.id.as_str()));
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
    let links = links.into_iter().filter(|l| is_change(l.change) && keep.contains(&l.from) && keep.contains(&l.to)).collect();
    (kept, links)
}

/// The view of the input: the viewpoint, then the folds, then what changed.
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
    let (items, links) = if input.hide_unlinked && input.layer == "technology" && input.viewpoint != "map" {
        keep_the_flow(items, links, &input.focal)
    } else {
        (items, links)
    };
    let (items, links) = collapse(items, merge_links(links), input);
    Ok(annotate(items, links, input))
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

/// Every `change` of the input must be one of the four words; a view is a comparison when any element or relationship has one.
/// Read before the facets run, so that a facet that removes everything that changed does not turn the comparison into a view.
fn check_changes(input: &mut Input) -> Result<(), String> {
    // `compare` says `contains_changes` on the elements of its union, and `compute` works the state out for the elements it is given (after the
    // facets): the key is not a free-form field here, a facet does not see it and it does not travel (contract 5, issue #96)
    for element in input.elements.iter_mut().chain(input.app_elements.iter_mut()) {
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
                    return Err(format!("invalid change: \"{change}\" in a relationship of {}", element.reference));
                }
                input.compared = true;
            }
        }
    }
    Ok(())
}

pub fn compute_json(input: &str) -> String {
    // the entries of `pinned`, `opened` and `hidden` that the map cannot find, when it fails on one of them (see `dangling_in_lists`)
    let mut dangling: Vec<String> = Vec::new();
    let result = serde_json::from_str::<Input>(input)
        .map_err(|e| format!("invalid input: {e}"))
        .and_then(|mut input| {
            check_changes(&mut input)?;
            let warnings = match input.facet.take() {
                Some(facet) => {
                    input.application_links = true;
                    input.hide_unlinked |= facet.hide_unlinked;
                    facet::apply_to_input(&mut input, &facet)?
                }
                None => Vec::new(),
            };
            let (mut items, links) = build(&input).map_err(|e| {
                dangling = dangling_in_lists(&input);
                e
            })?;
            if input.viewpoint != "deep" {
                mark_expandable(&mut items, &links, &mut input);
            }
            add_stereotypes(&mut items, &input);
            Ok(Output { version: CONTRACT_VERSION, items, links, warnings })
        })
        .and_then(|out| serde_json::to_string(&out).map_err(|e| format!("cannot write the view: {e}")));
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
    let known: HashSet<&str> = input.elements.iter().map(|e| e.reference.as_str()).collect();
    let mut seen: HashSet<&str> = HashSet::new();
    input
        .pinned
        .iter()
        .chain(input.opened.iter())
        .chain(input.hidden.iter())
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

/// The comparison of two plateaus: see `compare_json`.
#[no_mangle]
pub unsafe extern "C" fn compare(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, compare_json)
}

/// The patches of a plateau: see `apply_patches_json`.
#[no_mangle]
pub unsafe extern "C" fn apply_patches(ptr: *const u8, len: usize) -> usize {
    respond(ptr, len, apply_patches_json)
}

/// The seven state words (contract 5): see `states_json`. The input is not read (not even checked to be UTF-8), so it takes the same two arguments as
/// the other entry points and any caller may send anything.
#[no_mangle]
pub unsafe extern "C" fn states(_ptr: *const u8, _len: usize) -> usize {
    #[allow(static_mut_refs)]
    {
        RESULT = states_json().into_bytes();
        RESULT.len()
    }
}

#[no_mangle]
pub unsafe extern "C" fn result_ptr() -> *const u8 {
    #[allow(static_mut_refs)]
    RESULT.as_ptr()
}

#[cfg(test)]
mod change_tests;

#[cfg(test)]
mod patch_tests;

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

    fn link_between(out: &Value, from: &str, to: &str) -> bool {
        link(out, from, to).is_some()
    }

    fn has_item(out: &Value, id: &str) -> bool {
        out["items"].as_array().unwrap().iter().any(|i| i["id"] == id)
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
                        { "destination": "b", "label": "yes", "tags": { "gate-point": "yes" } },
                        { "destination": "b", "label": "no", "tags": { "gate-point": "no" } },
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
        assert_eq!(run("$..relationships[?(@.tags['gate-point'] == 'yes')]"), ["no", "none", "other"]);
        assert_eq!(run("$..relationships[?(@.tags[\"gate-point\"] != 'yes')]"), ["yes"]);
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
    fn a_facet_can_remove_an_element_and_what_points_at_it_goes_with_it() {
        let out = with_facet("deep", "a", "application", remove("$.application.elements[?(@.id == 'b')]"));
        assert!(out.get("error").is_none(), "no more dangling reference: {out}");
        assert!(out["links"].as_array().unwrap().is_empty(), "the three relationships of a pointed at b: {out}");
        assert!(out["items"].as_array().unwrap().iter().all(|i| i["id"] != "b"));
        let out = with_facet("deep", "a", "application", remove("$.application.elements[?(@.id == 'a')]"));
        assert!(!error(&out).is_empty(), "the focal element is gone: {out}");
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(length(@.qualifiers) == 1)]"));
        assert_eq!(labels(&out), [None], "functions are available: only the relationship without qualifiers is left");
        let out = with_facet("deep", "a", "application", remove("$..relationships[?(match(@.label, 'r.*'))]"));
        assert!(error(&out).contains("invalid facet JSONPath"), "regular expressions are left out of the module: {out}");
    }

    // ---- removing an element removes what points at it ----

    /// The workspace of the CLI after the facet: `{application, technology}` of a small model, with `path` removed.
    fn after_removing(workspace: Value, path: &str) -> Value {
        let request = json!({ "workspace": workspace, "actions": remove(path) });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert!(out.get("error").is_none(), "{out}");
        out["workspace"].clone()
    }

    fn destinations(workspace: &Value, pointer: &str) -> Vec<String> {
        let list = workspace.pointer(pointer).and_then(Value::as_array).cloned().unwrap_or_default();
        list.iter().map(|r| r["destination"].as_str().unwrap().to_string()).collect()
    }

    fn shop() -> Value {
        json!({ "application": { "elements": [
            { "id": "shop", "kind": "system", "relationships": [{ "destination": "payments" }], "elements": [
                { "id": "web", "relationships": [{ "destination": "shop.catalog", "label": "browses" }, { "destination": "shop.catalog.items" },
                                                  { "destination": "shop.cart" }, { "destination": "payments" }] },
                { "id": "catalog", "relationships": [{ "destination": "shop.cart" }], "elements": [{ "id": "items", "relationships": [{ "destination": "payments" }] }] },
                { "id": "cart" }
            ] },
            { "id": "payments", "relationships": [{ "destination": "shop.catalog" }] },
            { "id": "ghost-hunter", "relationships": [{ "destination": "ghost" }] }
        ] } })
    }

    #[test]
    fn removing_an_element_removes_the_relationships_that_point_at_it_and_at_what_is_inside_it() {
        let kept = after_removing(shop(), "$.application..elements[?(@.id == 'catalog')]");
        assert_eq!(destinations(&kept, "/application/elements/0/elements/0/relationships"), ["shop.cart", "payments"], "the link to the catalog and to its child are gone, the others stay in order");
        assert_eq!(destinations(&kept, "/application/elements/1/relationships"), Vec::<String>::new(), "the last one of a list leaves an empty list");
        let children = kept.pointer("/application/elements/0/elements").unwrap().as_array().unwrap();
        assert_eq!(children.len(), 2, "web and cart; the catalog went with its child");
        assert_eq!(destinations(&kept, "/application/elements/0/relationships"), ["payments"], "the system keeps what leads elsewhere");
    }

    #[test]
    fn removing_an_element_that_holds_children_removes_what_points_at_any_of_them() {
        let kept = after_removing(shop(), "$.application.elements[?(@.id == 'shop')]");
        assert_eq!(kept["application"]["elements"].as_array().unwrap().len(), 2, "shop and all that it holds are gone");
        assert_eq!(destinations(&kept, "/application/elements/0/relationships"), Vec::<String>::new(), "payments pointed at shop.catalog");
        assert_eq!(destinations(&kept, "/application/elements/1/relationships"), ["ghost"], "see the next test");
    }

    #[test]
    fn a_map_that_fails_on_its_lists_names_every_entry_it_cannot_find() {
        let out = map_of(&["sys", "gone-1", "sys"], &["gone-2", "ext"], &["gone-1", "gone-3", "other"]);
        assert_eq!(error(&out), "dangling reference: gone-2", "the message is the first one, pinned before opened before hidden");
        assert_eq!(out["dangling"], json!(["gone-2", "gone-1", "gone-3"]), "all of them, each once, in the order they are checked");
        // a map whose lists are all known has no such key, and neither has a map that fails for another reason
        assert!(map_of(&["sys"], &["ext"], &["other"]).get("dangling").is_none());
        let elsewhere = compute(json!({
            "viewpoint": "map", "layer": "application", "pinned": ["a"],
            "elements": [{ "reference": "a", "relationships": [{ "destination": "z" }] }]
        }));
        assert_eq!(error(&elsewhere), "dangling reference: z");
        assert!(elsewhere.get("dangling").is_none(), "the lists are not what failed: {elsewhere}");
        // the other viewpoints have no lists
        let overview = run("overview", "nowhere", &[]);
        assert!(overview.get("dangling").is_none(), "{overview}");
    }

    #[test]
    fn a_reference_that_led_nowhere_before_the_facet_is_left_alone() {
        let kept = after_removing(shop(), "$.application..elements[?(@.id == 'cart')]");
        assert_eq!(destinations(&kept, "/application/elements/2/relationships"), ["ghost"], "it is still the author's mistake to see");
        let out = compute(json!({
            "viewpoint": "deep", "layer": "application", "focal": "a",
            "facet": { "name": "f", "actions": remove("$.application.elements[?(@.id == 'c')]") },
            "elements": [{ "reference": "a", "relationships": [{ "destination": "z" }] }, { "reference": "c" }]
        }));
        assert_eq!(error(&out), "dangling reference: z");
    }

    #[test]
    fn removing_two_elements_that_point_at_each_other_leaves_the_others_clean() {
        let workspace = json!({ "application": { "elements": [
            { "id": "a", "relationships": [{ "destination": "b" }, { "destination": "c" }] },
            { "id": "b", "relationships": [{ "destination": "a" }] },
            { "id": "c", "relationships": [{ "destination": "a" }, { "destination": "b" }] }
        ] } });
        let kept = after_removing(workspace.clone(), "$.application.elements[?(@.id == 'a' || @.id == 'b')]");
        assert_eq!(kept["application"]["elements"], json!([{ "id": "c", "relationships": [] }]));
        // one action after the other: the second one reads what the first left
        let request = json!({ "workspace": workspace, "actions": [
            { "operator": "REMOVE", "json_path": "$.application.elements[?(@.id == 'b')]" },
            { "operator": "REMOVE", "json_path": "$.application.elements[?(@.relationships[?(@.destination == 'b')])]" }
        ] });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert_eq!(out["workspace"]["application"]["elements"][0]["id"], "a", "a lost its link to b before the second action looked: it stays");
        assert_eq!(out["workspace"]["application"]["elements"].as_array().unwrap().len(), 2, "{out}");
    }

    #[test]
    fn a_facet_that_removes_only_relationships_or_nothing_changes_nothing_else() {
        let workspace = shop();
        let kept = after_removing(workspace.clone(), "$.application..relationships[?(@.destination == 'shop.catalog')]");
        assert_eq!(destinations(&kept, "/application/elements/0/elements/0/relationships"), ["shop.catalog.items", "shop.cart", "payments"]);
        assert_eq!(after_removing(workspace.clone(), "$.application..elements[?(@.id == 'nobody')]"), workspace);
        assert_eq!(after_removing(workspace.clone(), "$.application..relationships[?(@.destination == 'nobody')]"), workspace);
    }

    fn deployed_model() -> Value {
        json!({
            "application": { "elements": [{ "id": "shop", "elements": [{ "id": "api" }, { "id": "web" }] }, { "id": "registry" }] },
            "technology": { "elements": [
                { "id": "dev", "uses": ["int", "int.a", "registry"], "elements": [{ "id": "app", "applications": ["shop.api", "shop.web", "registry"] }] },
                { "id": "int", "elements": [{ "id": "a", "applications": ["registry"] }] }
            ] }
        })
    }

    #[test]
    fn removing_an_application_removes_the_deployment_on_the_nodes() {
        let kept = after_removing(deployed_model(), "$.application.elements[?(@.id == 'shop')]");
        assert_eq!(kept["technology"]["elements"][0]["elements"][0]["applications"], json!(["registry"]), "shop.api and shop.web are not deployed any more");
        assert_eq!(kept["technology"]["elements"][0]["uses"], json!(["int", "int.a", "registry"]), "a name of the other layer is not a reference to it");
        assert_eq!(kept["technology"]["elements"][1]["elements"][0]["applications"], json!(["registry"]));
    }

    #[test]
    fn removing_an_environment_or_a_node_removes_the_entries_of_uses_that_name_it() {
        let kept = after_removing(deployed_model(), "$.technology.elements[?(@.id == 'int')]");
        assert_eq!(kept["technology"]["elements"][0]["uses"], json!(["registry"]), "int and int.a, which was inside it");
        assert_eq!(kept["application"], deployed_model()["application"], "the applications are untouched");
        let kept = after_removing(deployed_model(), "$.technology.elements[?(@.id == 'int')].elements[?(@.id == 'a')]");
        assert_eq!(kept["technology"]["elements"][0]["uses"], json!(["int", "registry"]));
        assert_eq!(kept["technology"]["elements"][0]["elements"][0]["applications"], json!(["shop.api", "shop.web", "registry"]));
    }

    #[test]
    fn the_views_of_the_editor_get_the_same_answer_as_the_workspace_of_the_command_line() {
        // application layer: the focal element keeps its links but the ones that led to the removed element
        let elements = json!([
            { "reference": "s", "parent": true },
            { "reference": "s.web", "relationships": [{ "destination": "s.catalog" }, { "destination": "s.cart", "label": "fills" }] },
            { "reference": "s.catalog" }, { "reference": "s.cart" }
        ]);
        let out = compute(json!({
            "viewpoint": "deep", "layer": "application", "focal": "s", "elements": elements,
            "facet": { "name": "f", "actions": remove("$.application..elements[?(@.id == 'catalog')]") }
        }));
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(labels(&out), [Some("fills".to_string())]);
        assert!(out["items"].as_array().unwrap().iter().all(|i| i["reference"] != "s.catalog"));
        // technology layer: the application leaves the node that hosted it
        let out = environments("dev", json!(["int"]), json!({ "facet": { "name": "f", "actions": remove("$.application.elements[?(@.id == 'ext')]") } }));
        assert!(out.get("error").is_none(), "{out}");
        assert!(out["links"].as_array().unwrap().is_empty() && !has_item(&out, "a_ext_registry"), "{out}");
        // an environment that is used and removed
        let out = environments("dev", json!(["int", "prd"]), json!({ "facet": { "name": "f", "actions": remove("$.technology.elements[?(@.id == 'int')]") } }));
        assert!(out.get("error").is_none(), "{out}");
        assert!(link_between(&out, "app_shop_api", "a_ext_registry") && !has_item(&out, "int.a"), "{out}");
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

    // ---- dependencies between environments ----

    /// `dev` hosts `shop.api`, which calls `ext.registry`; `int` and `prd` host `ext.registry`. `dev_uses` is what `dev` uses.
    fn environments(focal: &str, dev_uses: Value, extra: Value) -> Value {
        let mut input = json!({
            "viewpoint": "deep", "layer": "technology", "focal": focal,
            "elements": [
                { "reference": "dev", "parent": true, "uses": dev_uses },
                { "reference": "dev.app", "applications": ["shop.api"] },
                { "reference": "int", "parent": true },
                { "reference": "int.a", "applications": ["ext.registry"] },
                { "reference": "int.b", "applications": ["ext.registry"] },
                { "reference": "prd", "parent": true },
                { "reference": "prd.a", "applications": ["ext.registry"] }
            ],
            "app_elements": [
                { "reference": "shop", "parent": true },
                { "reference": "shop.api", "relationships": [
                    { "destination": "ext.registry", "label": "reads patients from", "qualifiers": ["REST"], "tags": { "tcp-port": "443" } }
                ] },
                { "reference": "ext", "parent": true },
                { "reference": "ext.registry" }
            ]
        });
        for (key, value) in extra.as_object().cloned().unwrap_or_default() {
            input[key] = value;
        }
        compute(input)
    }

    #[test]
    fn an_environment_reaches_the_applications_of_the_environments_it_uses() {
        let out = environments("dev", json!(["int"]), json!({}));
        let link = link(&out, "app_shop_api", "a_ext_registry").expect("the dependency is drawn between the deployed applications");
        assert!(!link["secondary"].as_bool().unwrap(), "unlike a link inside an environment, it is drawn");
        assert_eq!(link["label"], "reads patients from");
        assert_eq!(link["qualifiers"], json!(["REST"]));
        assert_eq!(link["tags"], json!({ "tcp-port": "443" }));
        assert_eq!(link["relationships"][0]["from"], "shop.api");
        assert!(link["relationships"][0]["application"].as_bool().unwrap(), "declared in the application layer");
        assert_eq!(item(&out, "a_ext_registry")["parent"], "int.a");
        assert!(link_between(&out, "app_shop_api", "b_ext_registry"), "every host of the application in the used environment");
        assert!(!has_item(&out, "prd") && !has_item(&out, "prd.a"), "an environment that is not used stays out");
    }

    #[test]
    fn the_overview_of_an_environment_shows_the_environments_it_uses() {
        for viewpoint in ["overview", "detailed"] {
            let out = environments("dev", json!(["int"]), json!({ "viewpoint": viewpoint }));
            let from = if viewpoint == "overview" { "dev" } else { "dev.app" };
            let link = link(&out, from, "int").unwrap_or_else(|| panic!("{viewpoint}: the dependency is drawn up to the environments"));
            assert_eq!(link["label"], "reads patients from", "{viewpoint}: it keeps its caption");
            assert_eq!(link["relationships"][0]["from"], "shop.api");
            assert!(link["relationships"][0]["application"].as_bool().unwrap(), "{viewpoint}: declared in the application layer");
            assert!(!has_item(&out, "prd"), "{viewpoint}: an environment that is not used stays out");
        }
        let out = environments("dev", json!([]), json!({ "viewpoint": "overview" }));
        assert!(out["links"].as_array().unwrap().is_empty(), "nothing is used, nothing is shown");
    }

    #[test]
    fn the_overview_of_a_used_environment_shows_who_depends_on_it() {
        let out = environments("int", json!(["int"]), json!({ "viewpoint": "overview", "elements": [
            { "reference": "dev", "parent": true, "uses": ["int"] },
            { "reference": "dev.app", "applications": ["shop.api"] },
            { "reference": "int", "parent": true },
            { "reference": "int.a", "applications": ["ext.registry"] }
        ] }));
        assert!(link_between(&out, "dev", "int"), "the dependent environment, linked to the one it uses");
    }

    #[test]
    fn the_overview_of_a_node_shows_what_leaves_it_and_not_what_stays_inside() {
        let out = environments("dev.app", json!(["int"]), json!({ "viewpoint": "overview" }));
        assert!(link_between(&out, "dev.app", "int"), "the node hosting the application depends on the environment");
        let inside = environments("dev", json!(["int"]), json!({ "viewpoint": "overview", "elements": [
            { "reference": "dev", "parent": true, "uses": ["int"] },
            { "reference": "dev.app", "applications": ["shop.api"] },
            { "reference": "dev.db", "applications": ["ext.registry"] },
            { "reference": "int", "parent": true },
            { "reference": "int.a", "applications": ["ext.registry"] }
        ] }));
        assert!(inside["links"].as_array().unwrap().is_empty(), "what the environment hosts itself wins: nothing leaves it");
    }

    #[test]
    fn the_deep_view_of_a_node_shows_everything_inside_it_linked_or_not() {
        let out = compute(json!({
            "viewpoint": "deep", "layer": "technology", "focal": "dev",
            "elements": [
                { "reference": "dev", "parent": true },
                { "reference": "dev.ns", "parent": true },
                { "reference": "dev.ns.quiet" },
                { "reference": "dev.other", "parent": true },
                { "reference": "dev.other.pod" },
                { "reference": "prd", "parent": true },
                { "reference": "prd.pod" }
            ]
        }));
        assert_eq!(ids(&out), ["dev", "dev.ns", "dev.ns.quiet", "dev.other", "dev.other.pod"], "all of it, and nothing of the other environment");
        let part = compute(json!({
            "viewpoint": "deep", "layer": "technology", "focal": "dev.ns",
            "elements": [
                { "reference": "dev", "parent": true },
                { "reference": "dev.ns", "parent": true },
                { "reference": "dev.ns.quiet" },
                { "reference": "dev.other", "parent": true }
            ]
        }));
        assert_eq!(ids(&part), ["dev", "dev.ns", "dev.ns.quiet"], "a node is shown with its ancestors and its content, not with its siblings");
    }

    #[test]
    fn the_applications_of_an_environment_are_linked_without_being_drawn_unless_the_view_is_a_flow() {
        let input = |extra: Value| {
            let mut input = json!({
                "viewpoint": "deep", "layer": "technology", "focal": "dev",
                "elements": [
                    { "reference": "dev", "parent": true },
                    { "reference": "dev.web", "applications": ["shop.web"] },
                    { "reference": "dev.api", "applications": ["shop.api"] }
                ],
                "app_elements": [
                    { "reference": "shop", "parent": true },
                    { "reference": "shop.web", "relationships": [
                        { "destination": "shop.api", "label": "calls", "qualifiers": ["REST"], "tags": { "flow": "yes" } },
                        { "destination": "shop.api", "label": "logs to", "tags": { "flow": "no" } }
                    ] },
                    { "reference": "shop.api" }
                ]
            });
            for (key, value) in extra.as_object().cloned().unwrap_or_default() {
                input[key] = value;
            }
            compute(input)
        };

        let plain = input(json!({}));
        let link = link(&plain, "web_shop_web", "api_shop_api").expect("the dependency exists");
        assert!(link["secondary"].as_bool().unwrap(), "inside an environment it is not drawn");
        assert!(link["label"].is_null());

        let flow = input(json!({ "application_links": true }));
        let drawn: Vec<&Value> = flow["links"].as_array().unwrap().iter().filter(|l| !l["secondary"].as_bool().unwrap()).collect();
        assert_eq!(drawn.len(), 2, "one link per relationship, drawn");
        assert!(drawn.iter().any(|l| l["label"] == "calls" && l["qualifiers"] == json!(["REST"]) && l["tags"] == json!({ "flow": "yes" })));
        assert_eq!(drawn[0]["relationships"][0]["from"], "shop.web");
        assert!(drawn[0]["relationships"][0]["application"].as_bool().unwrap());

        let faceted = input(json!({ "facet": { "name": "flow", "actions": [
            { "operator": "REMOVE", "json_path": "$.application..relationships[?(@.tags.flow != 'yes')]" }
        ] } }));
        let drawn: Vec<&Value> = faceted["links"].as_array().unwrap().iter().filter(|l| !l["secondary"].as_bool().unwrap()).collect();
        assert_eq!(drawn.len(), 1, "through a facet the flow is drawn, and only the flow");
        assert_eq!(drawn[0]["label"], "calls");
    }

    #[test]
    fn a_view_about_a_flow_shows_it_in_every_viewpoint_and_hides_what_has_no_link_when_asked() {
        let flow_with = |viewpoint: &str, focal: &str, hide: bool| {
            compute(json!({
                "viewpoint": viewpoint, "layer": "technology", "focal": focal, "application_links": true, "hide_unlinked": hide,
                "elements": [
                    { "reference": "dev", "parent": true },
                    { "reference": "dev.front", "parent": true },
                    { "reference": "dev.front.web", "applications": ["shop.web"] },
                    { "reference": "dev.back", "parent": true },
                    { "reference": "dev.back.api", "applications": ["shop.api"] },
                    { "reference": "dev.data", "parent": true },
                    { "reference": "dev.data.db", "applications": ["shop.db"] }
                ],
                "app_elements": [
                    { "reference": "shop", "parent": true },
                    { "reference": "shop.web", "relationships": [{ "destination": "shop.api", "label": "calls" }] },
                    { "reference": "shop.api" },
                    { "reference": "shop.db" }
                ]
            }))
        };

        let flow = |viewpoint: &str, focal: &str| flow_with(viewpoint, focal, true);

        let shown = flow_with("detailed", "dev", false);
        assert!(link_between(&shown, "dev.front", "dev.back") && has_item(&shown, "dev.data"), "the option off: the link, and the child with no link");

        let detailed = flow("detailed", "dev");
        let link = link(&detailed, "dev.front", "dev.back").expect("the dependency is lifted to the children of the focal element");
        assert_eq!(link["label"], "calls");
        assert!(link["relationships"][0]["application"].as_bool().unwrap());
        assert_eq!(ids(&detailed), ["dev", "dev.back", "dev.front"], "the child with no link is left out");

        let deep = flow("deep", "dev");
        assert!(link_between(&deep, "web_shop_web", "api_shop_api"), "the applications are linked");
        assert!(!has_item(&deep, "dev.data") && !has_item(&deep, "db_shop_db"), "what the flow does not go through is left out");
        assert!(has_item(&deep, "dev.front") && has_item(&deep, "dev.back"), "what encloses the ends is kept");

        let overview = flow("overview", "dev.front");
        assert!(link_between(&overview, "dev.front", "dev.back"), "what leaves a node is its dependency on the other nodes");
        assert_eq!(ids(&overview), ["dev", "dev.back", "dev.front"]);

        let alone = flow("overview", "dev.data");
        assert_eq!(ids(&alone), ["dev", "dev.data"], "the focal element is always there, with nothing around it");
    }

    #[test]
    fn an_environment_that_uses_nothing_reaches_nothing() {
        for uses in [json!([]), json!(null)] {
            let out = environments("dev", uses, json!({}));
            assert!(out["links"].as_array().unwrap().is_empty());
            assert_eq!(ids(&out), ["app_shop_api", "dev", "dev.app"], "the environment is shown with what it is made of, linked to nothing");
        }
    }

    #[test]
    fn an_environment_can_use_a_node_of_another_one_only() {
        let out = environments("dev", json!(["int.b", "prd"]), json!({}));
        assert!(link_between(&out, "app_shop_api", "b_ext_registry") && link_between(&out, "app_shop_api", "a_ext_registry"));
        assert!(!has_item(&out, "int.a"), "the sibling node is not used");
    }

    #[test]
    fn what_an_environment_hosts_itself_wins_over_what_it_uses() {
        let out = environments("dev", json!(["int"]), json!({
            "elements": [
                { "reference": "dev", "parent": true, "uses": ["int"] },
                { "reference": "dev.app", "applications": ["shop.api"] },
                { "reference": "dev.db", "applications": ["ext.registry"] },
                { "reference": "int", "parent": true },
                { "reference": "int.a", "applications": ["ext.registry"] }
            ]
        }));
        assert!(out["links"].as_array().unwrap().iter().all(|l| l["secondary"].as_bool().unwrap()), "the application is found in the environment: nothing leaves it");
        assert!(!has_item(&out, "int.a"), "the used environment is not even drawn");
    }

    #[test]
    fn the_view_of_a_used_environment_shows_who_depends_on_it() {
        let out = environments("int", json!(["int.a"]), json!({}));
        let link = link(&out, "app_shop_api", "a_ext_registry").expect("seen from the used environment");
        assert_eq!(link["relationships"][0]["from"], "shop.api");
        assert_eq!(item(&out, "app_shop_api")["parent"], "dev.app");
        assert!(!link_between(&out, "app_shop_api", "b_ext_registry"), "only what is used is linked");
    }

    #[test]
    fn the_dependencies_between_environments_fold_with_their_nodes() {
        let out = environments("dev", json!(["int"]), json!({ "collapsed": ["dev.app", "int.a", "int.b"] }));
        let grouped = link(&out, "dev.app", "int.a").expect("grouped under the folded nodes");
        assert!(grouped["synthetic"].as_bool().unwrap());
        assert_eq!(grouped["label"], "reads patients from", "the caption of a single relationship is kept");
        assert!(link(&out, "dev.app", "int.b").is_some());
    }

    #[test]
    fn a_facet_that_removes_the_relationship_removes_the_dependency() {
        let facet = json!({ "facet": { "name": "f", "actions": [
            { "operator": "REMOVE", "json_path": "$.application..relationships[?(@.tags['tcp-port'] == '443')]" }
        ] } });
        let out = environments("dev", json!(["int"]), facet);
        assert!(out["links"].as_array().unwrap().is_empty(), "nothing is left to derive the dependency from");
    }

    #[test]
    fn a_facet_can_take_an_environment_out_of_the_ones_that_are_used() {
        let facet = json!({ "facet": { "name": "f", "actions": [
            { "operator": "REMOVE", "json_path": "$.technology.elements[?(@.id == 'dev')].uses[?(@ == 'int')]" }
        ] } });
        let out = environments("dev", json!(["int", "prd"]), facet);
        assert!(link_between(&out, "app_shop_api", "a_ext_registry"), "prd.a");
        assert!(!has_item(&out, "int.a"));
    }

    #[test]
    fn a_dangling_environment_in_uses_is_an_error() {
        let out = environments("dev", json!(["nowhere"]), json!({}));
        assert_eq!(out["error"], "dangling reference: nowhere");
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

    #[test]
    fn a_legacy_list_may_hold_a_bracket_or_a_comma_inside_its_literals() {
        let (path, warnings) = facet::translate_legacy("$..relationships[?(@.qualifiers anyof ['a]b', \"c,d\"] && @.label == 'x')]");
        assert_eq!(path, "$..relationships[?(@.qualifiers[?(@ == 'a]b' || @ == \"c,d\")] && @.label == 'x')]");
        assert_eq!(warnings.len(), 1);
        let (path, _) = facet::translate_legacy("$..relationships[?(@.qualifiers anyof ['it\"s'])]");
        assert_eq!(path, "$..relationships[?(@.qualifiers[?(@ == 'it\"s')])]", "the other quote may be inside a literal");
    }

    #[test]
    fn the_workspace_keeps_the_order_of_its_keys() {
        let request = r#"{"workspace":{"styles":{"by-tags":{"external":{"b":1},"new":{"a":1},"changed":{"c":1}}},"application":{"elements":[{"id":"z","tags":{"tag-y":"1","tag-a":"2"}}]}},"actions":[]}"#;
        let out = apply_facet_json(request);
        let at = |needle: &str| out.find(needle).unwrap_or_else(|| panic!("{needle} in {out}"));
        assert!(at("\"external\"") < at("\"new\"") && at("\"new\"") < at("\"changed\""), "{out}");
        assert!(at("tag-y") < at("tag-a"), "{out}");
        assert!(at("\"styles\"") < at("\"application\""), "{out}");
    }

    // ---- stereotypes ----

    fn stereotypes(out: &Value, id: &str) -> Value {
        out["items"].as_array().unwrap().iter().find(|i| i["id"] == id).unwrap_or_else(|| panic!("item {id} in {out}"))["stereotypes"].clone()
    }

    fn with_properties(properties: Value) -> Value {
        let mut element = json!({ "reference": "a" });
        for (key, value) in properties.as_object().unwrap() {
            element[key] = value.clone();
        }
        compute(json!({ "viewpoint": "overview", "layer": "application", "focal": "a", "elements": [element, { "reference": "b" }] }))
    }

    #[test]
    fn the_tag_is_a_list_of_stereotypes_and_not_one_of_them() {
        let out = with_properties(json!({ "tags": { "rendering-stereotypes": "external changed" } }));
        assert_eq!(stereotypes(&out, "a"), json!(["external", "changed"]));
    }

    #[test]
    fn a_tag_of_one_word_is_the_one_stereotype_it_always_was() {
        let out = with_properties(json!({ "tags": { "rendering-stereotypes": "external" } }));
        assert_eq!(stereotypes(&out, "a"), json!(["external"]));
    }

    #[test]
    fn the_qualifiers_come_first_in_the_order_they_were_declared_and_are_not_split() {
        let out = with_properties(json!({ "qualifiers": ["Spring Boot", "PostgreSQL"], "tags": { "rendering-stereotypes": "  new\tchanged  " } }));
        assert_eq!(stereotypes(&out, "a"), json!(["Spring Boot", "PostgreSQL", "new", "changed"]));
    }

    #[test]
    fn a_stereotype_is_named_once_wherever_it_comes_from() {
        let out = with_properties(json!({ "qualifiers": ["external", "external"], "tags": { "rendering-stereotypes": "changed external changed" } }));
        assert_eq!(stereotypes(&out, "a"), json!(["external", "changed"]));
    }

    #[test]
    fn an_element_that_says_nothing_has_no_stereotype() {
        let out = with_properties(json!({}));
        assert_eq!(stereotypes(&out, "a"), json!([]));
        let out = with_properties(json!({ "qualifiers": null, "tags": { "rendering-stereotypes": "", "other": "x" } }));
        assert_eq!(stereotypes(&out, "a"), json!([]), "empty, or another tag, or a null: nothing");
        let out = with_properties(json!({ "qualifiers": ["", "q"], "tags": { "rendering-stereotypes": 3 } }));
        assert_eq!(stereotypes(&out, "a"), json!(["q"]), "an empty qualifier and a tag that is not a text are left out");
    }

    #[test]
    fn a_deployed_application_is_told_by_the_element_of_the_application_layer() {
        let out = compute(json!({
            "viewpoint": "deep", "layer": "technology", "focal": "dev",
            "elements": [
                { "reference": "dev", "parent": true, "qualifiers": ["K8s"] },
                { "reference": "dev.app", "applications": ["shop.api"], "qualifiers": ["not the application"] }
            ],
            "app_elements": [
                { "reference": "shop", "parent": true },
                { "reference": "shop.api", "qualifiers": ["Quarkus"], "tags": { "rendering-stereotypes": "external changed" } }
            ]
        }));
        assert_eq!(stereotypes(&out, "dev"), json!(["K8s"]));
        assert_eq!(stereotypes(&out, "dev.app"), json!(["not the application"]));
        assert_eq!(stereotypes(&out, "app_shop_api"), json!(["Quarkus", "external", "changed"]));
    }

    #[test]
    fn a_facet_still_reads_the_qualifiers_and_the_tags_the_stereotypes_come_from() {
        let out = compute(json!({
            "viewpoint": "overview", "layer": "application", "focal": "a",
            "facet": { "name": "f", "actions": remove("$.application..relationships[?(@.label == 'x')]") },
            "elements": [
                { "reference": "a", "qualifiers": ["q"], "tags": { "rendering-stereotypes": "external changed" }, "relationships": [{ "destination": "b", "label": "x" }] },
                { "reference": "b" }
            ]
        }));
        assert_eq!(stereotypes(&out, "a"), json!(["q", "external", "changed"]));
        assert!(out["links"].as_array().unwrap().is_empty());
    }
}
