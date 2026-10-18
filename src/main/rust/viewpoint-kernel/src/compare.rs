//! `compare`: what changes between two plateaus of an architecture, as one pure function.
//!
//! Two plateaus go in, each as the flat lists of elements the viewpoints already take (one list per layer); out comes
//! a *union model* (every element and relationship of the target, plus those of the base that the target no longer
//! has, each one saying what happened to it), a *table* of the changes and the *counts* of them. The CLI and the editor
//! both call it, so that they list the same new, changed and removed things.
//!
//! ```text
//! input : { base:   { application: [Element], technology: [Element] },
//!           target: { application: [Element], technology: [Element] } }
//!         Element = the one of `compute`: { reference, parent, applications, uses, relationships: [Rel], kind, name,
//!                   description, qualifiers, tags, replaces?, ... }. Both layers are optional lists, `null` is "not given".
//! output: { version, elements: [..], relationships: [..], changes: [Row], counts, candidates: [..], warnings? }  |  { error }
//! ```
//!
//! The rules (the *why* is in docs/wav/wav-008-plateaus-and-baseline-diff, run 0036):
//!
//! 1. **Identity is the dotted reference, per layer.** The same reference in both plateaus is the same thing; in the
//!    target only it is `new`, in the base only `removed`. An author who says otherwise says it on the element of the
//!    target: `replaces: [reference, ...]` (see rule 6). Without it, a moved, renamed or split element is a `removed` and
//!    a `new`.
//! 2. **Changed** is judged on the element's own properties, normalised, and on its own outgoing relationships, never
//!    on its children: `kind`, `name`, `description` (text compared trimmed, line ends unified), `qualifiers` (a set),
//!    `tags` (a map, every `rendering-*` tag ignored) and the deployment links `applications` and `uses` (sets).
//!    The list of the *natures* of the change is closed, in this order: `kind`, `name`, `description`, `qualifiers`,
//!    `tags`, `deployment`, `relationships-added`, `relationships-removed`, `relationships-changed`. A change of the
//!    description alone is `wording_only`. The other free-form fields of an element are not properties: they travel
//!    in the union (those of the side that is shown) and are never compared.
//! 3. **A relationship is keyed by (layer, source, destination, label)**; an empty label is no label. In both plateaus
//!    it is unchanged, or `changed` when its `qualifiers` (a set) or its tags (`rendering-*` ignored) differ; in one
//!    only, `new` or `removed`. When, for one (source, destination), exactly one relationship was removed and exactly
//!    one is new, they are one relationship whose label changed (`changed`, nature `label`, and `qualifiers` / `tags`
//!    if those moved too); with more than one on either side they stay `removed` and `new`. Relationships that share a
//!    key (they differ by their tags) are matched when equal, then in order.
//! 4. **The output is sorted and byte-stable**: elements by (layer, reference), relationships by (layer, source,
//!    destination, label, ...), the table lists the elements, then the relationships, in the same order. The order of
//!    the input lists never shows; sets (`applications`, `uses`) are written sorted; `qualifiers` keep the order they
//!    were declared in on the side that is shown, because that is the order a box is drawn in.
//! 5. A plateau compared with itself gives an empty table and zero counts. A relationship, an `uses` entry or an
//!    application that points at an element its own plateau does not have is an `error` (`dangling reference: ..`),
//!    as in `compute`; a base relationship that ends on an element only the base has is not one: it is a removed one.
//!    A reference declared twice in one layer of one plateau is an `error`.
//! 6. **`replaces` is the author's word, never a guess** (wave 009). An element of the target may list the references
//!    of the base that it replaces. A reference counts when the base has it, the target no longer does and the element
//!    does not list it twice; any other is ignored with a warning (`warnings`), never an error: the author may have
//!    compared with another baseline. The element then says what it is, in `change`: `moved` (it replaces one element
//!    that nothing else replaces), `split` (what it replaces is replaced by others too) or `merged` (it replaces several
//!    elements, or one and it is itself in the base). An element that is replaced is not `removed` any more: it has no row
//!    and no count, and it is not in the union, unless something below it was removed, which a view cannot place without
//!    it (then it is in the union as `removed`, with `replaced_by`, and still has no row and no count). A `removed` element,
//!    that place included, says its `applications` and `uses` as the target does (what points at a replaced element points at
//!    the one that replaces it, and what points at a split element is left out), so that the union points at nothing it does
//!    not hold and `compute` can draw it. The element that
//!    replaces it carries `replaces`, and its own changes in `natures` (the properties
//!    compared with the replaced element for a `moved` one, with its own base version for a `merged` one that had one,
//!    and the relationships of what was replaced, which follow it when exactly one element replaces it; the relationships
//!    of an element that is split are not compared). What is replaced is read from the target only: a `replaces` on a
//!    base element is not read. There is no recursion, so no cycle: an element that is replaced is not in the target,
//!    so it cannot replace anything.
//! 7. **Candidates are listed, never applied.** An element only the base has and that nothing replaces, and one only the
//!    target has that replaces nothing, are a *candidate* pair when they have the same kind in the same layer and at
//!    least one of: the same name (ignoring case) **when no other removed element and no other new element of that kind
//!    has it**, a close description (at least 60 percent of the words in common, three words or more on each side), or
//!    the same parent when they are the only two of that kind under it. A name that repeats (a `Cache` under each
//!    container, a `Message Broker` in each environment) says nothing about which one is which: n removed and m new of
//!    that name would give n x m pairs for n answers (wave 013, issue #60, measured on `replaces-large-pair`). The pair is
//!    listed with its reasons; the author decides, by writing `replaces`.
use super::{null_as_default, Elem, Rel, CONTRACT_VERSION};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

const LAYERS: [&str; 2] = ["application", "technology"];
const RENDERING_PREFIX: &str = "rendering-";
/// What `OutElement` writes itself: an extra field of that name never reaches the union.
const RESERVED: [&str; 17] = [
    "layer", "reference", "parent", "parent_reference", "kind", "name", "description", "qualifiers", "tags", "applications", "uses", "relationships", "change", "natures", "wording_only", "replaces", "replaced_by",
];

const NEW: &str = "new";
const CHANGED: &str = "changed";
const REMOVED: &str = "removed";
const NONE: &str = "none";
const MOVED: &str = "moved";
const SPLIT: &str = "split";
const MERGED: &str = "merged";
/// How close two descriptions must be to make a candidate: the share of the words they have in common, and the least words.
const CLOSE_DESCRIPTION: f64 = 0.6;
const LEAST_WORDS: usize = 3;

#[derive(Deserialize)]
struct Side {
    #[serde(default, deserialize_with = "null_as_default")]
    application: Vec<Elem>,
    #[serde(default, deserialize_with = "null_as_default")]
    technology: Vec<Elem>,
}

impl Side {
    fn layer(&self, layer: &str) -> &[Elem] {
        if layer == "application" {
            &self.application
        } else {
            &self.technology
        }
    }
}

#[derive(Deserialize)]
struct CompareInput {
    base: Side,
    target: Side,
}

// ---- the properties of an element, as the comparison reads them ----

#[derive(Clone)]
struct Props {
    kind: Option<String>,
    name: Option<String>,
    description: Option<String>,
    /// as declared (a box is drawn in this order), without duplicates
    qualifiers: Vec<String>,
    tags: BTreeMap<String, String>,
    applications: Vec<String>,
    uses: Vec<String>,
}

fn text_of(e: &Elem, key: &str) -> Option<String> {
    match e.other.get(key) {
        None | Some(Value::Null) => None,
        Some(Value::String(s)) => Some(s.clone()),
        Some(other) => Some(other.to_string()),
    }
}

fn unique(list: impl IntoIterator<Item = String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for s in list {
        if !out.contains(&s) {
            out.push(s);
        }
    }
    out
}

fn sorted_unique(list: &[String]) -> Vec<String> {
    list.iter().cloned().collect::<BTreeSet<_>>().into_iter().collect()
}

fn tags_of(value: Option<&Value>) -> BTreeMap<String, String> {
    match value {
        Some(Value::Object(m)) => m
            .iter()
            .map(|(k, v)| (k.clone(), if let Value::String(s) = v { s.clone() } else { v.to_string() }))
            .collect(),
        _ => BTreeMap::new(),
    }
}

fn props_of(e: &Elem) -> Props {
    let qualifiers = match e.other.get("qualifiers") {
        Some(Value::Array(a)) => unique(a.iter().map(|q| if let Value::String(s) = q { s.clone() } else { q.to_string() })),
        _ => Vec::new(),
    };
    Props {
        kind: text_of(e, "kind"),
        name: text_of(e, "name"),
        description: text_of(e, "description"),
        qualifiers,
        tags: tags_of(e.other.get("tags")),
        applications: sorted_unique(&e.applications),
        uses: sorted_unique(&e.uses),
    }
}

/// The properties of an element of the base, its references (`applications`, `uses`) said as the target says them.
fn base_props_of(e: &Elem, rewrite: &Rewrite) -> Props {
    let mut p = props_of(e);
    p.applications = rewrite.list("application", &p.applications);
    p.uses = rewrite.list("technology", &p.uses);
    p
}

/// A text, as it is compared: line ends unified, the edges trimmed, nothing at all being the empty text.
fn norm_text(s: &Option<String>) -> String {
    s.as_deref().unwrap_or("").replace("\r\n", "\n").trim().to_string()
}

/// The tags that count: the ones that say something about the thing, not about how it is drawn.
fn compared_tags(tags: &BTreeMap<String, String>) -> BTreeMap<String, String> {
    tags.iter().filter(|(k, _)| !k.starts_with(RENDERING_PREFIX)).map(|(k, v)| (k.clone(), v.clone())).collect()
}

fn text_value(s: &Option<String>) -> Value {
    s.as_ref().map_or(Value::Null, |s| Value::String(s.clone()))
}

fn strings_value(list: &[String]) -> Value {
    Value::Array(list.iter().cloned().map(Value::String).collect())
}

fn tags_value(tags: &BTreeMap<String, String>) -> Value {
    Value::Object(tags.iter().map(|(k, v)| (k.clone(), Value::String(v.clone()))).collect())
}

/// The natures that come from the properties of an element, and what was before and after for each one.
fn compare_props(b: &Props, t: &Props) -> (Vec<&'static str>, Map<String, Value>, Map<String, Value>) {
    let (mut natures, mut before, mut after) = (Vec::new(), Map::new(), Map::new());
    let mut note = |nature: Option<&'static str>, key: &str, b: Value, t: Value| {
        if let Some(nature) = nature {
            if !natures.contains(&nature) {
                natures.push(nature);
            }
        }
        before.insert(key.to_string(), b);
        after.insert(key.to_string(), t);
    };
    if norm_text(&b.kind) != norm_text(&t.kind) {
        note(Some("kind"), "kind", text_value(&b.kind), text_value(&t.kind));
    }
    if norm_text(&b.name) != norm_text(&t.name) {
        note(Some("name"), "name", text_value(&b.name), text_value(&t.name));
    }
    if norm_text(&b.description) != norm_text(&t.description) {
        note(Some("description"), "description", text_value(&b.description), text_value(&t.description));
    }
    if sorted_unique(&b.qualifiers) != sorted_unique(&t.qualifiers) {
        note(Some("qualifiers"), "qualifiers", strings_value(&sorted_unique(&b.qualifiers)), strings_value(&sorted_unique(&t.qualifiers)));
    }
    if compared_tags(&b.tags) != compared_tags(&t.tags) {
        note(Some("tags"), "tags", tags_value(&compared_tags(&b.tags)), tags_value(&compared_tags(&t.tags)));
    }
    if b.applications != t.applications {
        note(Some("deployment"), "applications", strings_value(&b.applications), strings_value(&t.applications));
    }
    if b.uses != t.uses {
        note(Some("deployment"), "uses", strings_value(&b.uses), strings_value(&t.uses));
    }
    (natures, before, after)
}

// ---- identity: what an element of the target says it replaces ----

/// What an element of the target is, once its `replaces` is read: `moved`, `split` or `merged`.
struct Identity {
    kind: &'static str,
    /// the references of the base it replaces, sorted, each one in the base and not in the target
    replaces: Vec<String>,
    /// the element of the base the properties of this one are compared with: its own, else (for a `moved` one) the one it replaces
    counterpart: Option<String>,
}

/// Where a reference of the base goes in the comparison. An element that exactly one element replaces goes to it; one that
/// several replace (it was split) goes nowhere: which of them would own what it had is a guess. Anything else stays.
struct Rewrite {
    /// (layer, replaced) -> who replaces it, sorted
    by: BTreeMap<(&'static str, String), Vec<String>>,
}

impl Rewrite {
    fn is_replaced(&self, layer: &'static str, reference: &str) -> bool {
        self.by.contains_key(&(layer, reference.to_string()))
    }

    /// `None`: the reference is that of a split element, and what mentions it is not compared.
    fn get(&self, layer: &'static str, reference: &str) -> Option<String> {
        match self.by.get(&(layer, reference.to_string())) {
            Some(who) if who.len() == 1 => Some(who[0].clone()),
            Some(_) => None,
            None => Some(reference.to_string()),
        }
    }

    fn list(&self, layer: &'static str, list: &[String]) -> Vec<String> {
        sorted_unique(&list.iter().filter_map(|r| self.get(layer, r)).collect::<Vec<_>>())
    }
}

struct Resolved {
    identities: BTreeMap<(&'static str, String), Identity>,
    rewrite: Rewrite,
    warnings: Vec<String>,
}

/// Reads the `replaces` of the target. See rule 6 at the top of this file.
fn resolve(input: &CompareInput) -> Resolved {
    let mut warnings: Vec<String> = Vec::new();
    // (layer, replacing) -> the valid references it replaces
    let mut valid: BTreeMap<(&'static str, String), Vec<String>> = BTreeMap::new();
    for layer in LAYERS {
        let base: HashSet<&str> = input.base.layer(layer).iter().map(|e| e.reference.as_str()).collect();
        let target: HashSet<&str> = input.target.layer(layer).iter().map(|e| e.reference.as_str()).collect();
        let mut elements: Vec<&Elem> = input.target.layer(layer).iter().collect();
        elements.sort_by(|a, b| a.reference.cmp(&b.reference));
        for e in elements {
            let declared = match e.other.get("replaces") {
                None | Some(Value::Null) => continue,
                Some(Value::Array(list)) => list,
                Some(_) => {
                    warnings.push(format!("replaces of {} ({layer} layer) is not a list of references, ignored", e.reference));
                    continue;
                }
            };
            let mut kept: Vec<String> = Vec::new();
            for entry in declared {
                let Some(reference) = entry.as_str().map(str::trim).filter(|s| !s.is_empty()) else {
                    warnings.push(format!("replaces of {} ({layer} layer) has an entry that is not a reference, ignored", e.reference));
                    continue;
                };
                if kept.iter().any(|k| k == reference) {
                    warnings.push(format!("replaces of {} ({layer} layer) lists {reference} twice, counted once", e.reference));
                } else if !base.contains(reference) {
                    warnings.push(format!("replaces of {} ({layer} layer): {reference} is not an element of the base plateau, ignored", e.reference));
                } else if target.contains(reference) {
                    warnings.push(format!("replaces of {} ({layer} layer): {reference} is still an element of the target plateau, ignored", e.reference));
                } else {
                    kept.push(reference.to_string());
                }
            }
            if !kept.is_empty() {
                kept.sort();
                valid.insert((layer, e.reference.clone()), kept);
            }
        }
    }
    // (layer, replaced) -> who replaces it
    let mut replacers: BTreeMap<(&'static str, String), Vec<String>> = BTreeMap::new();
    for ((layer, replacing), replaced) in &valid {
        for r in replaced {
            replacers.entry((*layer, r.clone())).or_default().push(replacing.clone());
        }
    }
    let mut identities = BTreeMap::new();
    for ((layer, replacing), replaced) in valid {
        let in_base = input.base.layer(layer).iter().any(|e| e.reference == replacing);
        let kind = if replaced.len() > 1 {
            MERGED
        } else if replacers[&(layer, replaced[0].clone())].len() > 1 {
            SPLIT
        } else if in_base {
            MERGED
        } else {
            MOVED
        };
        let counterpart = if in_base {
            Some(replacing.clone())
        } else if kind == MOVED {
            Some(replaced[0].clone())
        } else {
            None
        };
        identities.insert((layer, replacing), Identity { kind, replaces: replaced, counterpart });
    }
    Resolved { identities, rewrite: Rewrite { by: replacers }, warnings }
}

// ---- relationships ----

#[derive(Clone)]
struct R {
    layer: &'static str,
    from: String,
    destination: String,
    /// an empty label is no label
    label: Option<String>,
    /// as declared
    qualifiers: Vec<String>,
    tags: BTreeMap<String, String>,
}

impl R {
    fn of(layer: &'static str, from: &str, rel: &Rel) -> R {
        R {
            layer,
            from: from.to_string(),
            destination: rel.destination.clone(),
            label: rel.label.as_ref().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()),
            qualifiers: unique(rel.qualifiers.iter().cloned()),
            tags: rel.tags.clone(),
        }
    }
    fn nq(&self) -> Vec<String> {
        sorted_unique(&self.qualifiers)
    }
    fn nt(&self) -> BTreeMap<String, String> {
        compared_tags(&self.tags)
    }
    fn same_as(&self, other: &R) -> bool {
        self.nq() == other.nq() && self.nt() == other.nt()
    }
    /// A total order, so that nothing depends on the order of the input.
    fn order(&self) -> (&'static str, &str, &str, &Option<String>, Vec<String>, BTreeMap<String, String>, &Vec<String>, &BTreeMap<String, String>) {
        (self.layer, &self.from, &self.destination, &self.label, self.nq(), self.nt(), &self.qualifiers, &self.tags)
    }
}

struct URel {
    r: R,
    change: &'static str,
    natures: Vec<&'static str>,
    before: Map<String, Value>,
    after: Map<String, Value>,
}

impl URel {
    fn plain(r: &R, change: &'static str) -> URel {
        URel { r: r.clone(), change, natures: Vec::new(), before: Map::new(), after: Map::new() }
    }

    /// `t` is what the base's `b` became: the same relationship, said differently.
    fn changed(b: &R, t: &R) -> URel {
        let (mut natures, mut before, mut after) = (Vec::new(), Map::new(), Map::new());
        if b.label != t.label {
            natures.push("label");
            before.insert("label".into(), text_value(&b.label));
            after.insert("label".into(), text_value(&t.label));
        }
        if b.nq() != t.nq() {
            natures.push("qualifiers");
            before.insert("qualifiers".into(), strings_value(&b.nq()));
            after.insert("qualifiers".into(), strings_value(&t.nq()));
        }
        if b.nt() != t.nt() {
            natures.push("tags");
            before.insert("tags".into(), tags_value(&b.nt()));
            after.insert("tags".into(), tags_value(&t.nt()));
        }
        URel { r: t.clone(), change: CHANGED, natures, before, after }
    }
}

type Key = (String, String, Option<String>);

fn group<'a>(list: &'a [R]) -> BTreeMap<Key, Vec<&'a R>> {
    let mut out: BTreeMap<Key, Vec<&R>> = BTreeMap::new();
    for r in list {
        out.entry((r.from.clone(), r.destination.clone(), r.label.clone())).or_default().push(r);
    }
    for list in out.values_mut() {
        list.sort_by(|a, b| a.order().cmp(&b.order()));
    }
    out
}

/// The relationships of one layer, compared. The order of the result is not final.
fn compare_relationships(base: &[R], target: &[R]) -> Vec<URel> {
    let (bg, tg) = (group(base), group(target));
    let keys: BTreeSet<&Key> = bg.keys().chain(tg.keys()).collect();
    let mut out: Vec<URel> = Vec::new();
    let (mut removed, mut new): (Vec<&R>, Vec<&R>) = (Vec::new(), Vec::new());
    for key in keys {
        let (bl, tl) = (bg.get(key).cloned().unwrap_or_default(), tg.get(key).cloned().unwrap_or_default());
        let mut taken = vec![false; tl.len()];
        let mut b_rest: Vec<&R> = Vec::new();
        for b in &bl {
            match (0..tl.len()).find(|&i| !taken[i] && b.same_as(tl[i])) {
                Some(i) => {
                    taken[i] = true;
                    out.push(URel::plain(tl[i], NONE));
                }
                None => b_rest.push(b),
            }
        }
        let t_rest: Vec<&R> = tl.iter().enumerate().filter(|(i, _)| !taken[*i]).map(|(_, t)| *t).collect();
        let paired = b_rest.len().min(t_rest.len());
        for i in 0..paired {
            out.push(URel::changed(b_rest[i], t_rest[i]));
        }
        removed.extend(&b_rest[paired..]);
        new.extend(&t_rest[paired..]);
    }
    // one removed and one new for the same pair of elements: the label changed
    let mut pairs: BTreeMap<(&str, &str), (Vec<&R>, Vec<&R>)> = BTreeMap::new();
    for r in &removed {
        pairs.entry((r.from.as_str(), r.destination.as_str())).or_default().0.push(r);
    }
    for r in &new {
        pairs.entry((r.from.as_str(), r.destination.as_str())).or_default().1.push(r);
    }
    for (_, (rem, add)) in pairs {
        if rem.len() == 1 && add.len() == 1 {
            out.push(URel::changed(rem[0], add[0]));
        } else {
            out.extend(rem.iter().map(|r| URel::plain(r, REMOVED)));
            out.extend(add.iter().map(|r| URel::plain(r, NEW)));
        }
    }
    out
}

// ---- the union model ----

#[derive(Serialize)]
struct OutElement {
    layer: &'static str,
    reference: String,
    /// as sent: whether the element can contain others
    parent: bool,
    /// the enclosing element, read from the dotted reference. It is in the union (as `removed` if the base had it
    /// alone) whenever the plateau it comes from is consistent.
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    qualifiers: Vec<String>,
    tags: BTreeMap<String, String>,
    applications: Vec<String>,
    uses: Vec<String>,
    /// `none`, `new`, `changed`, `removed`, `moved`, `split` or `merged`
    change: &'static str,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    natures: Vec<&'static str>,
    /// the description is the only thing that changed
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    wording_only: bool,
    /// `moved`, `split` or `merged` elements: the references of the base they replace
    #[serde(skip_serializing_if = "Vec::is_empty")]
    replaces: Vec<String>,
    /// an element of the base that was replaced and is in the union only because something below it was removed
    #[serde(skip_serializing_if = "Vec::is_empty")]
    replaced_by: Vec<String>,
    #[serde(flatten)]
    other: BTreeMap<String, Value>,
    #[serde(skip)]
    before: Map<String, Value>,
    #[serde(skip)]
    after: Map<String, Value>,
}

/// An object with its keys in order, all the way down: what a free-form field of an element is written as.
fn canonical(v: &Value) -> Value {
    match v {
        Value::Object(m) => Value::Object(m.iter().map(|(k, v)| (k.clone(), canonical(v))).collect::<BTreeMap<_, _>>().into_iter().collect()),
        Value::Array(a) => Value::Array(a.iter().map(canonical).collect()),
        other => other.clone(),
    }
}

fn out_element(layer: &'static str, e: &Elem, p: &Props, change: &'static str) -> OutElement {
    OutElement {
        layer,
        reference: e.reference.clone(),
        parent: e.parent,
        parent_reference: e.reference.rfind('.').map(|i| e.reference[..i].to_string()),
        kind: p.kind.clone(),
        name: p.name.clone(),
        description: p.description.clone(),
        qualifiers: p.qualifiers.clone(),
        tags: p.tags.clone(),
        applications: p.applications.clone(),
        uses: p.uses.clone(),
        change,
        natures: Vec::new(),
        wording_only: false,
        replaces: Vec::new(),
        replaced_by: Vec::new(),
        other: e
            .other
            .iter()
            .filter(|(k, _)| !RESERVED.contains(&k.as_str()))
            .map(|(k, v)| (k.clone(), canonical(v)))
            .collect(),
        before: Map::new(),
        after: Map::new(),
    }
}

#[derive(Serialize)]
struct OutRelationship {
    layer: &'static str,
    from: String,
    destination: String,
    label: Option<String>,
    qualifiers: Vec<String>,
    tags: BTreeMap<String, String>,
    change: &'static str,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    natures: Vec<&'static str>,
}

#[derive(Serialize, Default)]
struct ElementCounts {
    new: usize,
    changed: usize,
    removed: usize,
    /// among the `changed` ones: those whose description is the only thing that changed
    wording_only: usize,
    /// the elements that replace others (not in `changed`, whatever else they changed); left out when there are none
    #[serde(skip_serializing_if = "is_zero")]
    moved: usize,
    #[serde(skip_serializing_if = "is_zero")]
    split: usize,
    #[serde(skip_serializing_if = "is_zero")]
    merged: usize,
}

fn is_zero(n: &usize) -> bool {
    *n == 0
}

#[derive(Serialize, Default)]
struct RelationshipCounts {
    new: usize,
    changed: usize,
    removed: usize,
}

#[derive(Serialize, Default)]
struct Counts {
    elements: ElementCounts,
    relationships: RelationshipCounts,
}

/// A pair the author might want to say with `replaces`: listed, never applied.
#[derive(Serialize)]
struct Candidate {
    layer: &'static str,
    /// the element only the base has
    from: String,
    /// the element only the target has
    to: String,
    /// why, in this order: `name`, `description`, `parent`
    reasons: Vec<&'static str>,
}

#[derive(Serialize)]
struct CompareOutput {
    version: u32,
    elements: Vec<OutElement>,
    relationships: Vec<OutRelationship>,
    changes: Vec<Value>,
    counts: Counts,
    candidates: Vec<Candidate>,
    /// what the author should know without it being an error (a `replaces` that is ignored)
    #[serde(skip_serializing_if = "Vec::is_empty")]
    warnings: Vec<String>,
}

fn index<'a>(list: &'a [Elem], which: &str, layer: &str) -> Result<HashMap<&'a str, &'a Elem>, String> {
    let mut known: HashMap<&str, &Elem> = HashMap::new();
    for e in list {
        if known.insert(e.reference.as_str(), e).is_some() {
            return Err(format!("duplicate reference: {} (in the {which} plateau, {layer} layer)", e.reference));
        }
    }
    Ok(known)
}

/// What `compute` refuses in one plateau, refused in the same words: a reference to an element the plateau does not have.
fn check(side: &Side, which: &str) -> Result<(), String> {
    let apps = index(&side.application, which, "application")?;
    for layer in LAYERS {
        let known = index(side.layer(layer), which, layer)?;
        let mut elements: Vec<&Elem> = side.layer(layer).iter().collect();
        elements.sort_by(|a, b| a.reference.cmp(&b.reference));
        for e in elements {
            let mut rels: Vec<&String> = e.relationships.iter().map(|r| &r.destination).collect();
            rels.sort();
            for dest in rels {
                if !known.contains_key(dest.as_str()) {
                    return Err(format!("dangling reference: {dest} (relationship of {}, in the {which} plateau)", e.reference));
                }
            }
            let mut used: Vec<&String> = e.uses.iter().collect();
            used.sort();
            for u in used {
                if !known.contains_key(u.as_str()) {
                    return Err(format!("dangling reference: {u} (uses of {}, in the {which} plateau)", e.reference));
                }
            }
            if layer == "technology" {
                let mut deployed: Vec<&String> = e.applications.iter().collect();
                deployed.sort();
                for a in deployed {
                    if !apps.contains_key(a.as_str()) {
                        return Err(format!("dangling application reference: {a} (deployed on {}, in the {which} plateau)", e.reference));
                    }
                }
            }
        }
    }
    Ok(())
}

/// The relationships of a layer. For the base, `rewrite` says them as the target does (an element that was replaced is the one that
/// replaces it); the ones that end at an element that was split, or start from it, are left out.
fn relationships_of(side: &Side, layer: &'static str, rewrite: Option<&Rewrite>) -> Vec<R> {
    let all = side.layer(layer).iter().flat_map(|e| e.relationships.iter().map(move |r| R::of(layer, &e.reference, r)));
    match rewrite {
        None => all.collect(),
        Some(rewrite) => all
            .filter_map(|mut r| {
                r.from = rewrite.get(layer, &r.from)?;
                r.destination = rewrite.get(layer, &r.destination)?;
                Some(r)
            })
            .collect(),
    }
}

// ---- candidates ----

fn words(text: &Option<String>) -> BTreeSet<String> {
    norm_text(text).to_lowercase().split(|c: char| !c.is_alphanumeric()).filter(|w| !w.is_empty()).map(str::to_string).collect()
}

/// Shares at least `CLOSE_DESCRIPTION` of its words (of the union of the two) with the other, and has `LEAST_WORDS` of them.
fn close_descriptions(a: &Option<String>, b: &Option<String>) -> bool {
    let (a, b) = (words(a), words(b));
    if a.len() < LEAST_WORDS || b.len() < LEAST_WORDS {
        return false;
    }
    let common = a.intersection(&b).count() as f64;
    common / a.union(&b).count() as f64 >= CLOSE_DESCRIPTION
}

/// How many of the elements, of each (kind, name ignoring the case), there are.
fn count_names(list: &[(&Elem, Props)]) -> HashMap<(String, String), usize> {
    let mut counts = HashMap::new();
    for (_, p) in list {
        *counts.entry((norm_text(&p.kind), norm_text(&p.name).to_lowercase())).or_default() += 1;
    }
    counts
}

/// The pairs (removed, new) that look like one thing said twice: same layer, same kind, and a name (when it is the only one of its kind
/// among the removed and among the new), a description or (when they are the only two of their kind under a parent) a parent in common.
/// Nothing that is replaced, nothing that replaces.
fn candidates(input: &CompareInput, identities: &BTreeMap<(&'static str, String), Identity>, rewrite: &Rewrite) -> Vec<Candidate> {
    let mut out = Vec::new();
    for layer in LAYERS {
        let target_refs: HashSet<&str> = input.target.layer(layer).iter().map(|e| e.reference.as_str()).collect();
        let base_refs: HashSet<&str> = input.base.layer(layer).iter().map(|e| e.reference.as_str()).collect();
        let mut gone: Vec<(&Elem, Props)> = input
            .base
            .layer(layer)
            .iter()
            .filter(|e| !target_refs.contains(e.reference.as_str()) && !rewrite.is_replaced(layer, &e.reference))
            .map(|e| (e, props_of(e)))
            .collect();
        let mut fresh: Vec<(&Elem, Props)> = input
            .target
            .layer(layer)
            .iter()
            .filter(|e| !base_refs.contains(e.reference.as_str()) && !identities.contains_key(&(layer, e.reference.clone())))
            .map(|e| (e, props_of(e)))
            .collect();
        gone.sort_by(|a, b| a.0.reference.cmp(&b.0.reference));
        fresh.sort_by(|a, b| a.0.reference.cmp(&b.0.reference));
        let parent_of = |e: &Elem| e.reference.rfind('.').map(|i| e.reference[..i].to_string());
        // (parent, kind) -> how many of each
        let mut siblings: HashMap<(String, String), (usize, usize)> = HashMap::new();
        for (e, p) in &gone {
            if let Some(parent) = parent_of(e) {
                siblings.entry((parent, norm_text(&p.kind))).or_default().0 += 1;
            }
        }
        for (e, p) in &fresh {
            if let Some(parent) = parent_of(e) {
                siblings.entry((parent, norm_text(&p.kind))).or_default().1 += 1;
            }
        }
        // (kind, name) -> how many removed, how many new: a name that is on several of them does not tell which is which
        let (gone_names, fresh_names) = (count_names(&gone), count_names(&fresh));
        for (from, fp) in &gone {
            for (to, tp) in &fresh {
                let kind = norm_text(&fp.kind);
                if kind.is_empty() || kind != norm_text(&tp.kind) {
                    continue;
                }
                let mut reasons: Vec<&'static str> = Vec::new();
                let name = norm_text(&fp.name).to_lowercase();
                if !name.is_empty() && name == norm_text(&tp.name).to_lowercase() {
                    let key = (kind.clone(), name);
                    if gone_names.get(&key) == Some(&1) && fresh_names.get(&key) == Some(&1) {
                        reasons.push("name");
                    }
                }
                if close_descriptions(&fp.description, &tp.description) {
                    reasons.push("description");
                }
                if let (Some(a), Some(b)) = (parent_of(from), parent_of(to)) {
                    if a == b && siblings.get(&(a, kind)) == Some(&(1, 1)) {
                        reasons.push("parent");
                    }
                }
                if !reasons.is_empty() {
                    out.push(Candidate { layer, from: from.reference.clone(), to: to.reference.clone(), reasons });
                }
            }
        }
    }
    out
}

/// The natures that come from the relationships an element declares: added, removed, changed.
fn relationship_natures(flags: (bool, bool, bool)) -> Vec<&'static str> {
    [(flags.0, "relationships-added"), (flags.1, "relationships-removed"), (flags.2, "relationships-changed")].into_iter().filter(|(flag, _)| *flag).map(|(_, nature)| nature).collect()
}

fn run(input: &str) -> Result<CompareOutput, String> {
    let input: CompareInput = serde_json::from_str(input).map_err(|e| format!("invalid input: {e}"))?;
    check(&input.base, "base")?;
    check(&input.target, "target")?;
    let Resolved { identities, rewrite, warnings } = resolve(&input);

    // the relationships first: the natures of an element depend on them
    let mut relationships: Vec<URel> = Vec::new();
    for layer in LAYERS {
        relationships.extend(compare_relationships(&relationships_of(&input.base, layer, Some(&rewrite)), &relationships_of(&input.target, layer, None)));
    }
    relationships.sort_by(|a, b| a.r.order().cmp(&b.r.order()).then(a.change.cmp(b.change)));
    // (layer, source) -> (added, removed, changed)
    let mut moved: HashMap<(&str, &str), (bool, bool, bool)> = HashMap::new();
    for u in &relationships {
        let flags = moved.entry((u.r.layer, u.r.from.as_str())).or_default();
        match u.change {
            NEW => flags.0 = true,
            REMOVED => flags.1 = true,
            CHANGED => flags.2 = true,
            _ => {}
        }
    }

    let mut elements: Vec<OutElement> = Vec::new();
    for layer in LAYERS {
        let base = index(input.base.layer(layer), "base", layer)?;
        let target = index(input.target.layer(layer), "target", layer)?;
        for (reference, t) in &target {
            let tp = props_of(t);
            let identity = identities.get(&(layer, reference.to_string()));
            // the element of the base this one is compared with: itself, else the one it is the new place of
            let counterpart = match base.get(reference) {
                Some(b) => Some(*b),
                None => identity.and_then(|i| i.counterpart.as_deref()).and_then(|c| base.get(c).copied()),
            };
            match (counterpart, identity) {
                (None, None) => elements.push(out_element(layer, t, &tp, NEW)),
                (None, Some(_)) => {
                    let mut element = out_element(layer, t, &tp, NONE);
                    element.natures = relationship_natures(moved.get(&(layer, *reference)).copied().unwrap_or_default());
                    elements.push(element);
                }
                (Some(b), _) => {
                    let (mut natures, before, after) = compare_props(&base_props_of(b, &rewrite), &tp);
                    natures.extend(relationship_natures(moved.get(&(layer, *reference)).copied().unwrap_or_default()));
                    let mut element = out_element(layer, t, &tp, if natures.is_empty() { NONE } else { CHANGED });
                    element.wording_only = natures == ["description"];
                    element.natures = natures;
                    element.before = before;
                    element.after = after;
                    elements.push(element);
                }
            }
            if let (Some(identity), Some(element)) = (identity, elements.last_mut()) {
                element.change = identity.kind;
                element.wording_only = false;
                element.replaces = identity.replaces.clone();
            }
        }
        for (reference, b) in &base {
            if !target.contains_key(reference) && !rewrite.is_replaced(layer, reference) {
                elements.push(out_element(layer, b, &base_props_of(b, &rewrite), REMOVED));
            }
        }
        // what a replaced element held is removed unless it is replaced too, and a view needs the element it was held by to place it:
        // the replaced element is then in the union as a place where something was removed, and `replaced_by` says who replaced it
        let held: BTreeSet<String> = elements
            .iter()
            .filter(|e| e.layer == layer && e.change == REMOVED)
            .flat_map(|e| {
                let parts: Vec<&str> = e.reference.split('.').collect();
                (1..parts.len()).map(|i| parts[..i].join(".")).collect::<Vec<_>>()
            })
            .filter(|ancestor| rewrite.is_replaced(layer, ancestor))
            .collect();
        for reference in held {
            if let Some(b) = base.get(reference.as_str()) {
                let mut place = out_element(layer, b, &base_props_of(b, &rewrite), REMOVED);
                place.replaced_by = rewrite.by[&(layer, reference.clone())].clone();
                elements.push(place);
            }
        }
    }
    elements.sort_by(|a, b| (a.layer, &a.reference).cmp(&(b.layer, &b.reference)));

    let mut counts = Counts::default();
    let mut changes: Vec<Value> = Vec::new();
    for e in elements.iter().filter(|e| e.change != NONE && e.replaced_by.is_empty()) {
        match e.change {
            NEW => counts.elements.new += 1,
            CHANGED => {
                counts.elements.changed += 1;
                counts.elements.wording_only += usize::from(e.wording_only);
            }
            MOVED => counts.elements.moved += 1,
            SPLIT => counts.elements.split += 1,
            MERGED => counts.elements.merged += 1,
            _ => counts.elements.removed += 1,
        }
        let mut row = Map::new();
        row.insert("thing".into(), "element".into());
        row.insert("layer".into(), e.layer.into());
        row.insert("reference".into(), e.reference.clone().into());
        if let Some(kind) = &e.kind {
            row.insert("kind".into(), kind.clone().into());
        }
        if let Some(name) = &e.name {
            row.insert("name".into(), name.clone().into());
        }
        row.insert("change".into(), e.change.into());
        if !e.natures.is_empty() {
            row.insert("natures".into(), Value::Array(e.natures.iter().map(|n| (*n).into()).collect()));
        }
        if e.wording_only {
            row.insert("wording_only".into(), true.into());
        }
        if !e.replaces.is_empty() {
            row.insert("replaces".into(), Value::Array(e.replaces.iter().cloned().map(Value::String).collect()));
        }
        if e.change == CHANGED || (!e.replaces.is_empty() && !e.before.is_empty()) {
            row.insert("before".into(), Value::Object(e.before.clone()));
            row.insert("after".into(), Value::Object(e.after.clone()));
        }
        changes.push(Value::Object(row));
    }
    for u in relationships.iter().filter(|u| u.change != NONE) {
        match u.change {
            NEW => counts.relationships.new += 1,
            CHANGED => counts.relationships.changed += 1,
            _ => counts.relationships.removed += 1,
        }
        let mut row = Map::new();
        row.insert("thing".into(), "relationship".into());
        row.insert("layer".into(), u.r.layer.into());
        row.insert("reference".into(), u.r.from.clone().into());
        row.insert("destination".into(), u.r.destination.clone().into());
        row.insert("label".into(), text_value(&u.r.label));
        row.insert("change".into(), u.change.into());
        if !u.natures.is_empty() {
            row.insert("natures".into(), Value::Array(u.natures.iter().map(|n| (*n).into()).collect()));
        }
        if u.change == CHANGED {
            row.insert("before".into(), Value::Object(u.before.clone()));
            row.insert("after".into(), Value::Object(u.after.clone()));
        }
        changes.push(Value::Object(row));
    }

    let relationships = relationships
        .into_iter()
        .map(|u| OutRelationship {
            layer: u.r.layer,
            from: u.r.from,
            destination: u.r.destination,
            label: u.r.label,
            qualifiers: u.r.qualifiers,
            tags: u.r.tags,
            change: u.change,
            natures: u.natures,
        })
        .collect();
    let candidates = candidates(&input, &identities, &rewrite);
    Ok(CompareOutput { version: CONTRACT_VERSION, elements, relationships, changes, counts, candidates, warnings })
}

/// The comparison of two plateaus: see the top of this file.
pub fn compare_json(input: &str) -> String {
    run(input)
        .and_then(|out| serde_json::to_string(&out).map_err(|e| format!("cannot write the comparison: {e}")))
        .unwrap_or_else(|e| serde_json::json!({ "error": e }).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// An element of the application layer: `{reference, parent, ...extra}`.
    fn el(reference: &str, extra: Value) -> Value {
        let mut e = json!({ "reference": reference, "parent": !reference.contains('.') });
        for (k, v) in extra.as_object().unwrap() {
            e[k] = v.clone();
        }
        e
    }

    fn rel(destination: &str, label: &str) -> Value {
        json!({ "destination": destination, "label": label })
    }

    fn plateau(application: Vec<Value>, technology: Vec<Value>) -> Value {
        json!({ "application": application, "technology": technology })
    }

    fn compare(base: Value, target: Value) -> Value {
        serde_json::from_str(&compare_json(&json!({ "base": base, "target": target }).to_string())).unwrap()
    }

    fn app(base: Vec<Value>, target: Vec<Value>) -> Value {
        compare(plateau(base, vec![]), plateau(target, vec![]))
    }

    fn element<'a>(out: &'a Value, reference: &str) -> &'a Value {
        out["elements"].as_array().unwrap().iter().find(|e| e["reference"] == reference).unwrap_or_else(|| panic!("no element {reference} in {out}"))
    }

    fn relationship<'a>(out: &'a Value, from: &str, destination: &str, label: &str) -> &'a Value {
        out["relationships"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["from"] == from && r["destination"] == destination && r["label"] == label)
            .unwrap_or_else(|| panic!("no relationship {from} -{label}-> {destination} in {out}"))
    }

    fn row<'a>(out: &'a Value, thing: &str, reference: &str) -> &'a Value {
        out["changes"].as_array().unwrap().iter().find(|r| r["thing"] == thing && r["reference"] == reference).unwrap_or_else(|| panic!("no {thing} row for {reference} in {}", out["changes"]))
    }

    fn natures(v: &Value) -> Vec<&str> {
        v["natures"].as_array().map_or(vec![], |a| a.iter().map(|n| n.as_str().unwrap()).collect())
    }

    fn error(out: &Value) -> &str {
        out["error"].as_str().unwrap_or_else(|| panic!("expected an error, got {out}"))
    }

    fn rows(out: &Value) -> usize {
        out["changes"].as_array().unwrap().len()
    }

    /// The same element in both plateaus, `with` applied to the target's one: what it takes to change one property.
    fn one(base_extra: Value, target_extra: Value) -> Value {
        app(vec![el("a", base_extra)], vec![el("a", target_extra)])
    }

    // ---- identity ----

    #[test]
    fn a_reference_only_the_target_has_is_new_and_one_only_the_base_has_is_removed() {
        let out = app(vec![el("kept", json!({})), el("gone", json!({ "name": "Gone" }))], vec![el("kept", json!({})), el("fresh", json!({ "name": "Fresh" }))]);
        assert_eq!(element(&out, "kept")["change"], "none");
        assert_eq!(element(&out, "fresh")["change"], "new");
        assert_eq!(element(&out, "gone")["change"], "removed");
        assert_eq!(element(&out, "gone")["name"], "Gone", "a removed element keeps its properties, so that it can be drawn");
        assert_eq!(out["counts"]["elements"], json!({ "new": 1, "changed": 0, "removed": 1, "wording_only": 0 }));
        assert_eq!(rows(&out), 2);
        assert_eq!(row(&out, "element", "fresh")["change"], "new");
        assert!(row(&out, "element", "fresh").get("before").is_none());
    }

    #[test]
    fn a_moved_or_renamed_element_is_a_removal_and_an_addition() {
        let out = app(vec![el("old", json!({ "name": "X" }))], vec![el("new", json!({ "name": "X" }))]);
        assert_eq!(element(&out, "old")["change"], "removed");
        assert_eq!(element(&out, "new")["change"], "new");
    }

    #[test]
    fn the_same_reference_in_the_two_layers_is_two_things() {
        let base = plateau(vec![el("shop", json!({}))], vec![el("shop", json!({}))]);
        let target = plateau(vec![el("shop", json!({}))], vec![]);
        let out = compare(base, target);
        let shops: Vec<(&str, &str)> = out["elements"].as_array().unwrap().iter().map(|e| (e["layer"].as_str().unwrap(), e["change"].as_str().unwrap())).collect();
        assert_eq!(shops, [("application", "none"), ("technology", "removed")]);
    }

    // ---- the natures of an element ----

    #[test]
    fn each_property_has_its_nature() {
        let cases = [
            ("name", json!({ "name": "A" }), json!({ "name": "B" })),
            ("kind", json!({ "kind": "system" }), json!({ "kind": "service" })),
            ("qualifiers", json!({ "qualifiers": ["x"] }), json!({ "qualifiers": ["x", "y"] })),
            ("tags", json!({ "tags": { "owner": "a" } }), json!({ "tags": { "owner": "b" } })),
            ("tags", json!({ "tags": {} }), json!({ "tags": { "owner": "b" } })),
            ("description", json!({ "description": "one" }), json!({ "description": "two" })),
        ];
        for (nature, before, after) in cases {
            let out = one(before.clone(), after.clone());
            assert_eq!(element(&out, "a")["change"], "changed", "{nature}: {out}");
            assert_eq!(natures(element(&out, "a")), [nature], "{nature}");
            let r = row(&out, "element", "a");
            assert!(r["before"].get(nature).is_some() && r["after"].get(nature).is_some(), "{nature}: the row says before and after: {r}");
            assert_eq!(out["counts"]["elements"]["changed"], 1);
        }
    }

    #[test]
    fn the_row_of_a_changed_element_says_what_it_was_and_what_it_is_and_nothing_else() {
        let out = one(json!({ "name": "A", "description": "same", "qualifiers": ["x", "y"], "tags": { "k": "1", "rendering-a": "x" } }), json!({ "name": "B", "description": "same", "qualifiers": ["y", "z"], "tags": { "k": "1", "rendering-a": "z" } }));
        let r = row(&out, "element", "a");
        assert_eq!(r["natures"], json!(["name", "qualifiers"]));
        assert_eq!(r["before"], json!({ "name": "A", "qualifiers": ["x", "y"] }));
        assert_eq!(r["after"], json!({ "name": "B", "qualifiers": ["y", "z"] }));
        assert_eq!(r["name"], "B");
    }

    #[test]
    fn a_change_of_description_alone_is_wording_and_is_counted_apart() {
        let out = app(
            vec![el("a", json!({ "description": "one" })), el("b", json!({ "name": "B", "description": "one" })), el("c", json!({}))],
            vec![el("a", json!({ "description": "two" })), el("b", json!({ "name": "B2", "description": "two" })), el("c", json!({}))],
        );
        assert_eq!(element(&out, "a")["wording_only"], true);
        assert!(element(&out, "b").get("wording_only").is_none(), "a name changed too");
        assert_eq!(natures(element(&out, "b")), ["name", "description"], "the natures come in their own order");
        assert_eq!(out["counts"]["elements"], json!({ "new": 0, "changed": 2, "removed": 0, "wording_only": 1 }));
        assert_eq!(row(&out, "element", "a")["wording_only"], true);
    }

    #[test]
    fn deployment_is_the_applications_and_the_uses_of_a_node() {
        let apps = vec![el("one", json!({})), el("two", json!({}))];
        let node = |applications: Value, uses: Value| el("env", json!({ "applications": applications, "uses": uses }));
        let side = |env: Value| plateau(apps.clone(), vec![env, el("other", json!({}))]);
        let out = compare(side(node(json!(["one"]), json!([]))), side(node(json!(["one", "two"]), json!([]))));
        assert_eq!(natures(element(&out, "env")), ["deployment"]);
        assert_eq!(row(&out, "element", "env")["before"], json!({ "applications": ["one"] }));
        assert_eq!(row(&out, "element", "env")["after"], json!({ "applications": ["one", "two"] }));
        let out = compare(side(node(json!([]), json!([]))), side(node(json!([]), json!(["other"]))));
        assert_eq!(natures(element(&out, "env")), ["deployment"]);
        assert_eq!(row(&out, "element", "env")["after"], json!({ "uses": ["other"] }));
        let out = compare(side(node(json!(["one"]), json!(["other"]))), side(node(json!(["two"]), json!([]))));
        assert_eq!(natures(element(&out, "env")), ["deployment"], "one nature, however many links moved");
    }

    // ---- what is not a change ----

    #[test]
    fn a_rendering_tag_is_not_a_change() {
        let out = one(json!({ "tags": { "owner": "a", "rendering-stereotypes": "external" } }), json!({ "tags": { "owner": "a", "rendering-stereotypes": "internal", "rendering-new": "x" } }));
        assert_eq!(element(&out, "a")["change"], "none");
        assert_eq!(element(&out, "a")["tags"]["rendering-stereotypes"], "internal", "the union shows the target as it is");
        assert_eq!(rows(&out), 0);
        let out = one(json!({ "tags": {} }), json!({ "tags": { "rendering-stereotypes": "external" } }));
        assert_eq!(element(&out, "a")["change"], "none");
    }

    #[test]
    fn the_order_of_lists_is_not_a_change() {
        let node = |apps: Value, uses: Value, qualifiers: Value, rels: Value| {
            el("n", json!({ "applications": apps, "uses": uses, "qualifiers": qualifiers, "relationships": rels }))
        };
        let side = |n: Value| plateau(vec![el("p", json!({})), el("q", json!({}))], vec![n, el("m", json!({})), el("k", json!({}))]);
        let base = side(node(json!(["p", "q"]), json!(["m", "k"]), json!(["x", "y"]), json!([rel("m", "r1"), rel("k", "r2")])));
        let target = side(node(json!(["q", "p"]), json!(["k", "m"]), json!(["y", "x"]), json!([rel("k", "r2"), rel("m", "r1")])));
        let out = compare(base, target);
        assert_eq!(rows(&out), 0, "{}", out["changes"]);
        assert!(out["elements"].as_array().unwrap().iter().all(|e| e["change"] == "none"));
        assert!(out["relationships"].as_array().unwrap().iter().all(|r| r["change"] == "none"));
        assert_eq!(element(&out, "n")["qualifiers"], json!(["y", "x"]), "the qualifiers keep the order of the target, which is how the box is drawn");
    }

    #[test]
    fn text_is_compared_trimmed_and_an_empty_text_is_none() {
        let out = one(json!({ "name": "A", "description": "a\nb\n" }), json!({ "name": " A ", "description": "a\r\nb" }));
        assert_eq!(element(&out, "a")["change"], "none");
        let out = one(json!({ "description": "" }), json!({}));
        assert_eq!(element(&out, "a")["change"], "none");
        let out = one(json!({ "name": null }), json!({ "name": "A" }));
        assert_eq!(natures(element(&out, "a")), ["name"]);
    }

    #[test]
    fn the_other_fields_travel_and_are_not_compared() {
        let out = one(json!({ "file": "a.yaml", "extra": { "z": 1, "a": 2 } }), json!({ "file": "b.yaml", "extra": { "a": 2, "z": 1 }, "change": "fake", "natures": ["fake"] }));
        let e = element(&out, "a");
        assert_eq!(e["change"], "none");
        assert_eq!(e["file"], "b.yaml");
        assert!(e.get("natures").is_none(), "an extra field cannot pose as the answer");
        assert!(compare_json(&json!({ "base": plateau(vec![el("a", json!({ "extra": { "z": 1, "a": 2 } }))], vec![]), "target": plateau(vec![], vec![]) }).to_string()).contains(r#""extra":{"a":2,"z":1}"#), "keys of a free-form object are sorted");
    }

    #[test]
    fn a_free_form_field_cannot_pose_as_a_field_of_the_answer() {
        // every field `OutElement` writes is reserved, `wording_only` included: it would be a second key of the same name
        let base = plateau(vec![el("a", json!({ "description": "one", "wording_only": "base" }))], vec![]);
        let target = plateau(vec![el("a", json!({ "description": "two", "wording_only": "target" }))], vec![]);
        let raw = compare_json(&json!({ "base": base, "target": target }).to_string());
        let text = raw.to_string();
        let out: Value = serde_json::from_str(&text).unwrap();
        assert_eq!(out["elements"].to_string().matches("\"wording_only\":").count(), 1, "one key of that name in the element: {}", text);
        assert_eq!(element(&out, "a")["wording_only"], json!(true));
        let unchanged = one(json!({ "wording_only": "x", "natures": ["fake"] }), json!({ "wording_only": "y" }));
        assert!(element(&unchanged, "a").get("wording_only").is_none(), "a field of the answer that is not set is not written, and not borrowed");
        // and the fields of the answer, one by one, are not let through from the input
        for name in ["layer", "parent_reference", "change", "natures", "wording_only"] {
            assert!(RESERVED.contains(&name), "{} is reserved", name);
            let out = one(json!({}), json!({ name: "free" }));
            let e = element(&out, "a");
            assert_ne!(e.get(name), Some(&json!("free")), "{} is the answer's own", name);
        }
    }

    #[test]
    fn a_container_is_not_changed_because_a_child_is() {
        let out = app(
            vec![el("sys", json!({ "name": "S" })), el("sys.a", json!({ "name": "A" })), el("sys.b", json!({})), el("other", json!({ "relationships": [rel("sys.a", "calls")] }))],
            vec![el("sys", json!({ "name": "S" })), el("sys.a", json!({ "name": "A2" })), el("sys.b", json!({})), el("other", json!({ "relationships": [rel("sys.a", "calls")] }))],
        );
        assert_eq!(element(&out, "sys")["change"], "none");
        assert_eq!(element(&out, "sys.a")["change"], "changed");
        assert_eq!(element(&out, "other")["change"], "none", "pointing at a changed element is not changing");
        assert_eq!(out["counts"]["elements"]["changed"], 1);
    }

    #[test]
    fn a_child_of_a_container_that_is_new_or_removed_is_too_and_keeps_its_parent() {
        let out = app(
            vec![el("old", json!({})), el("old.child", json!({ "name": "Child" })), el("stay", json!({})), el("stay.gone", json!({}))],
            vec![el("fresh", json!({})), el("fresh.child", json!({})), el("stay", json!({}))],
        );
        for (reference, change, parent) in [("old", "removed", None), ("old.child", "removed", Some("old")), ("stay", "none", None), ("stay.gone", "removed", Some("stay")), ("fresh", "new", None), ("fresh.child", "new", Some("fresh"))] {
            let e = element(&out, reference);
            assert_eq!(e["change"], change, "{reference}");
            assert_eq!(e.get("parent_reference").and_then(|p| p.as_str()), parent, "{reference}");
        }
        assert_eq!(element(&out, "old")["parent"], true);
        assert_eq!(element(&out, "old.child")["parent"], false);
        assert_eq!(element(&out, "old.child")["name"], "Child");
        assert_eq!(element(&out, "stay")["change"], "none", "losing a child does not change the container");
    }

    // ---- relationships ----

    #[test]
    fn a_relationship_is_new_removed_or_unchanged_by_its_source_destination_and_label() {
        let out = app(
            vec![el("a", json!({ "relationships": [rel("b", "calls"), rel("b", "reads"), rel("c", "keeps")] })), el("b", json!({})), el("c", json!({}))],
            vec![el("a", json!({ "relationships": [rel("b", "calls"), rel("c", "keeps"), rel("c", "also"), rel("b", "writes"), rel("b", "pings")] })), el("b", json!({})), el("c", json!({}))],
        );
        assert_eq!(relationship(&out, "a", "b", "calls")["change"], "none");
        assert_eq!(relationship(&out, "a", "c", "keeps")["change"], "none");
        assert_eq!(relationship(&out, "a", "c", "also")["change"], "new");
        assert_eq!(relationship(&out, "a", "b", "reads")["change"], "removed", "one removed, two new for the pair: ambiguous, no pairing");
        assert_eq!(relationship(&out, "a", "b", "writes")["change"], "new");
        assert_eq!(relationship(&out, "a", "b", "pings")["change"], "new");
        assert_eq!(out["counts"]["relationships"], json!({ "new": 3, "changed": 0, "removed": 1 }));
        assert_eq!(natures(element(&out, "a")), ["relationships-added", "relationships-removed"]);
    }

    #[test]
    fn a_removed_label_and_a_new_one_for_the_same_pair_are_one_relationship_whose_label_changed() {
        let out = app(
            vec![el("a", json!({ "relationships": [rel("b", "sends")] })), el("b", json!({}))],
            vec![el("a", json!({ "relationships": [rel("b", "publishes")] })), el("b", json!({}))],
        );
        assert_eq!(out["relationships"].as_array().unwrap().len(), 1);
        let r = relationship(&out, "a", "b", "publishes");
        assert_eq!((r["change"].as_str().unwrap(), natures(r)), ("changed", vec!["label"]));
        let row = row(&out, "relationship", "a");
        assert_eq!((row["before"].clone(), row["after"].clone()), (json!({ "label": "sends" }), json!({ "label": "publishes" })));
        assert_eq!(natures(element(&out, "a")), ["relationships-changed"]);
        assert_eq!(out["counts"]["relationships"], json!({ "new": 0, "changed": 1, "removed": 0 }));
    }

    #[test]
    fn a_label_that_changed_with_its_qualifiers_says_both() {
        let mut before = rel("b", "sends");
        before["qualifiers"] = json!(["REST"]);
        let mut after = rel("b", "publishes");
        after["qualifiers"] = json!(["AMQP"]);
        let out = app(vec![el("a", json!({ "relationships": [before] })), el("b", json!({}))], vec![el("a", json!({ "relationships": [after] })), el("b", json!({}))]);
        assert_eq!(natures(relationship(&out, "a", "b", "publishes")), ["label", "qualifiers"]);
    }

    #[test]
    fn two_removed_or_two_new_for_a_pair_are_not_paired() {
        let out = app(
            vec![el("a", json!({ "relationships": [rel("b", "one"), rel("b", "two")] })), el("b", json!({}))],
            vec![el("a", json!({ "relationships": [rel("b", "three")] })), el("b", json!({}))],
        );
        let changes: Vec<&str> = out["relationships"].as_array().unwrap().iter().map(|r| r["change"].as_str().unwrap()).collect();
        assert_eq!(changes, ["removed", "new", "removed"], "sorted by label: one, three, two");
    }

    #[test]
    fn a_label_is_paired_with_another_one_of_the_same_pair_only() {
        let out = app(
            vec![el("a", json!({ "relationships": [rel("b", "x")] })), el("b", json!({})), el("c", json!({}))],
            vec![el("a", json!({ "relationships": [rel("c", "y")] })), el("b", json!({})), el("c", json!({}))],
        );
        assert_eq!(relationship(&out, "a", "b", "x")["change"], "removed");
        assert_eq!(relationship(&out, "a", "c", "y")["change"], "new");
    }

    #[test]
    fn qualifiers_and_tags_make_a_relationship_changed_but_not_rendering_tags_nor_order() {
        let r = |qualifiers: Value, tags: Value| json!({ "destination": "b", "label": "l", "qualifiers": qualifiers, "tags": tags });
        let compare_rels = |before: Value, after: Value| {
            app(vec![el("a", json!({ "relationships": [before] })), el("b", json!({}))], vec![el("a", json!({ "relationships": [after] })), el("b", json!({}))])
        };
        let out = compare_rels(r(json!(["x", "y"]), json!({ "k": "1" })), r(json!(["y", "x"]), json!({ "k": "1", "rendering-w": "3" })));
        assert_eq!(relationship(&out, "a", "b", "l")["change"], "none");
        assert_eq!(rows(&out), 0);
        let out = compare_rels(r(json!(["x"]), json!({})), r(json!(["x", "z"]), json!({})));
        assert_eq!(natures(relationship(&out, "a", "b", "l")), ["qualifiers"]);
        let out = compare_rels(r(json!([]), json!({ "k": "1" })), r(json!([]), json!({ "k": "2" })));
        let changed = relationship(&out, "a", "b", "l");
        assert_eq!(natures(changed), ["tags"]);
        assert_eq!(row(&out, "relationship", "a")["before"], json!({ "tags": { "k": "1" } }));
        assert_eq!(element(&out, "a")["change"], "changed");
        assert_eq!(natures(element(&out, "a")), ["relationships-changed"]);
    }

    #[test]
    fn an_empty_label_is_no_label() {
        let out = app(vec![el("a", json!({ "relationships": [json!({ "destination": "b" })] })), el("b", json!({}))], vec![el("a", json!({ "relationships": [json!({ "destination": "b", "label": "" })] })), el("b", json!({}))]);
        assert_eq!(rows(&out), 0);
        assert_eq!(out["relationships"][0]["label"], Value::Null);
    }

    #[test]
    fn relationships_that_differ_by_their_tags_are_matched_one_to_one() {
        let tagged = |t: &str| json!({ "destination": "b", "label": "l", "tags": { "k": t } });
        let out = app(
            vec![el("a", json!({ "relationships": [tagged("1"), tagged("2")] })), el("b", json!({}))],
            vec![el("a", json!({ "relationships": [tagged("2"), tagged("1")] })), el("b", json!({}))],
        );
        assert_eq!(rows(&out), 0);
        let out = app(
            vec![el("a", json!({ "relationships": [tagged("1"), tagged("2")] })), el("b", json!({}))],
            vec![el("a", json!({ "relationships": [tagged("2"), tagged("3"), tagged("4")] })), el("b", json!({}))],
        );
        let changes: Vec<&str> = out["relationships"].as_array().unwrap().iter().map(|r| r["change"].as_str().unwrap()).collect();
        assert_eq!(changes, ["none", "changed", "new"], "2 is kept; 1 became 3 (equal ones first, then in order); 4 is new");
    }

    #[test]
    fn the_relationships_of_a_new_or_removed_element_are_new_or_removed_and_do_not_change_it() {
        let out = app(
            vec![el("a", json!({})), el("gone", json!({ "relationships": [rel("a", "calls")] }))],
            vec![el("a", json!({})), el("fresh", json!({ "relationships": [rel("a", "calls")] }))],
        );
        assert_eq!(relationship(&out, "gone", "a", "calls")["change"], "removed");
        assert_eq!(relationship(&out, "fresh", "a", "calls")["change"], "new");
        assert_eq!(element(&out, "fresh")["change"], "new");
        assert!(element(&out, "fresh").get("natures").is_none());
        assert_eq!(element(&out, "a")["change"], "none", "being pointed at is not a change");
    }

    #[test]
    fn a_base_relationship_may_end_on_a_removed_element_and_a_new_one_on_a_new_element() {
        let out = app(
            vec![el("a", json!({ "relationships": [rel("gone", "calls")] })), el("gone", json!({}))],
            vec![el("a", json!({ "relationships": [rel("fresh", "calls")] })), el("fresh", json!({}))],
        );
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(relationship(&out, "a", "gone", "calls")["change"], "removed");
        assert_eq!(relationship(&out, "a", "fresh", "calls")["change"], "new");
        assert_eq!(natures(element(&out, "a")), ["relationships-added", "relationships-removed"]);
    }

    // ---- both layers ----

    #[test]
    fn the_technology_layer_is_compared_with_its_deployment_and_its_own_relationships() {
        let apps = |names: &[&str]| names.iter().map(|n| el(n, json!({}))).collect::<Vec<_>>();
        let base = plateau(apps(&["web", "api"]), vec![el("env", json!({ "applications": ["web"], "relationships": [rel("env.db", "stores")] })), el("env.db", json!({ "applications": [] }))]);
        let target = plateau(apps(&["web", "api"]), vec![el("env", json!({ "applications": ["web", "api"], "relationships": [rel("env.db", "stores")] })), el("env.db", json!({ "relationships": [rel("env", "backs")] }))]);
        let out = compare(base, target);
        assert_eq!(natures(element(&out, "env")), ["deployment"]);
        assert_eq!(natures(element(&out, "env.db")), ["relationships-added"]);
        let r = relationship(&out, "env.db", "env", "backs");
        assert_eq!((r["layer"].as_str().unwrap(), r["change"].as_str().unwrap()), ("technology", "new"));
        assert_eq!(element(&out, "web")["change"], "none");
    }

    #[test]
    fn a_deployed_application_that_is_removed_is_an_error_in_the_plateau_that_still_deploys_it_but_not_in_the_union() {
        let out = compare(plateau(vec![el("web", json!({}))], vec![el("env", json!({ "applications": ["web"] }))]), plateau(vec![], vec![el("env", json!({ "applications": [] }))]));
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(element(&out, "web")["change"], "removed");
        let out = compare(plateau(vec![], vec![]), plateau(vec![], vec![el("env", json!({ "applications": ["ghost"] }))]));
        assert!(error(&out).starts_with("dangling application reference: ghost"), "{out}");
    }

    // ---- the output ----

    #[test]
    fn the_table_lists_the_elements_then_the_relationships_sorted() {
        let out = compare(
            plateau(vec![el("b", json!({ "name": "1" })), el("c", json!({ "relationships": [rel("b", "x")] }))], vec![el("t", json!({}))]),
            plateau(vec![el("b", json!({ "name": "2" })), el("a", json!({})), el("c", json!({ "relationships": [rel("b", "y")] }))], vec![]),
        );
        let table: Vec<(String, String, String)> = out["changes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|r| (r["thing"].as_str().unwrap().to_string(), r["layer"].as_str().unwrap().to_string(), r["reference"].as_str().unwrap().to_string()))
            .collect();
        let expected = [("element", "application", "a"), ("element", "application", "b"), ("element", "application", "c"), ("element", "technology", "t"), ("relationship", "application", "c")];
        assert_eq!(table, expected.map(|(a, b, c)| (a.to_string(), b.to_string(), c.to_string())));
    }

    #[test]
    fn a_plateau_compared_with_itself_has_an_empty_table_and_zero_counts() {
        let side = || {
            plateau(
                vec![el("sys", json!({ "name": "S", "qualifiers": ["x"], "tags": { "rendering-a": "b", "k": "v" } })), el("sys.a", json!({ "relationships": [rel("sys.b", "calls"), rel("ext", "feeds")] })), el("sys.b", json!({})), el("ext", json!({}))],
                vec![el("env", json!({ "applications": ["sys.a"], "uses": ["env.n"] })), el("env.n", json!({}))],
            )
        };
        let out = compare(side(), side());
        assert_eq!(out["changes"], json!([]));
        assert_eq!(out["counts"], json!({ "elements": { "new": 0, "changed": 0, "removed": 0, "wording_only": 0 }, "relationships": { "new": 0, "changed": 0, "removed": 0 } }));
        assert_eq!(out["elements"].as_array().unwrap().len(), 6);
        assert_eq!(out["relationships"].as_array().unwrap().len(), 2);
        assert_eq!(out["version"], CONTRACT_VERSION);
    }

    /// Every list that is a set or a collection, in another order: what a caller that walks its files differently sends.
    fn reordered(v: &Value) -> Value {
        match v {
            Value::Object(m) => Value::Object(
                m.iter()
                    .rev()
                    .map(|(k, v)| {
                        let v = reordered(v);
                        let v = match (k.as_str(), v) {
                            ("application" | "technology" | "relationships" | "applications" | "uses", Value::Array(mut a)) => {
                                a.reverse();
                                let n = 1.min(a.len());
                                a.rotate_left(n);
                                Value::Array(a)
                            }
                            (_, v) => v,
                        };
                        (k.clone(), v)
                    })
                    .collect(),
            ),
            Value::Array(a) => Value::Array(a.iter().map(reordered).collect()),
            other => other.clone(),
        }
    }

    fn busy_pair() -> Value {
        let rels = |l: &[(&str, &str)]| l.iter().map(|(d, l)| rel(d, l)).collect::<Vec<_>>();
        json!({
            "base": plateau(
                vec![
                    el("a", json!({ "name": "A", "description": "x", "qualifiers": ["p", "q"], "relationships": rels(&[("b", "sends"), ("c", "reads"), ("c", "feeds")]) })),
                    el("b", json!({ "tags": { "rendering-a": "1", "k": "v" } })), el("c", json!({})), el("gone", json!({})), el("gone.kid", json!({})),
                ],
                vec![el("env", json!({ "applications": ["a", "b"], "uses": ["env.n", "env.m"] })), el("env.n", json!({})), el("env.m", json!({}))],
            ),
            "target": plateau(
                vec![
                    el("a", json!({ "name": "A2", "description": "y", "qualifiers": ["q", "p", "r"], "relationships": rels(&[("b", "publishes"), ("c", "reads"), ("d", "feeds")]) })),
                    el("b", json!({ "tags": { "rendering-a": "2", "k": "v" } })), el("c", json!({})), el("d", json!({ "kind": "service" })), el("d.sub", json!({})),
                ],
                vec![el("env", json!({ "applications": ["b", "a", "c"], "uses": ["env.n"] })), el("env.n", json!({})), el("env.m", json!({}))],
            ),
        })
    }

    #[test]
    fn the_same_input_gives_the_same_bytes_whatever_the_order_of_its_lists() {
        let input = busy_pair();
        let first = compare_json(&input.to_string());
        assert_eq!(first, compare_json(&input.to_string()), "twice");
        let shuffled = reordered(&input);
        assert_ne!(shuffled.to_string(), input.to_string(), "the test must really shuffle");
        assert_eq!(first, compare_json(&shuffled.to_string()));
        assert_eq!(first, compare_json(&reordered(&shuffled).to_string()));
        let out: Value = serde_json::from_str(&first).unwrap();
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(out["counts"]["elements"], json!({ "new": 2, "changed": 2, "removed": 2, "wording_only": 0 }));
        assert_eq!(natures(element(&out, "a")), ["name", "description", "qualifiers", "relationships-added", "relationships-removed", "relationships-changed"]);
        assert_eq!(element(&out, "b")["change"], "none");
        assert_eq!(natures(element(&out, "env")), ["deployment"]);
        assert_eq!(out["counts"]["relationships"], json!({ "new": 1, "changed": 1, "removed": 1 }));
    }

    // ---- errors ----

    #[test]
    fn a_dangling_reference_is_an_error_in_the_plateau_that_has_it() {
        let dangling = |side: &str| {
            let broken = plateau(vec![el("a", json!({ "relationships": [rel("nowhere", "x")] }))], vec![]);
            let fine = plateau(vec![el("a", json!({}))], vec![]);
            if side == "base" { compare(broken, fine) } else { compare(fine, broken) }
        };
        for side in ["base", "target"] {
            let out = dangling(side);
            assert!(error(&out).starts_with("dangling reference: nowhere"), "{out}");
            assert!(error(&out).contains(side), "the message says which plateau: {out}");
        }
        let out = compare(plateau(vec![], vec![el("env", json!({ "uses": ["nowhere"] }))]), plateau(vec![], vec![]));
        assert!(error(&out).starts_with("dangling reference: nowhere"), "{out}");
    }

    #[test]
    fn a_reference_declared_twice_in_a_layer_is_an_error() {
        let out = app(vec![el("a", json!({})), el("a", json!({}))], vec![]);
        assert!(error(&out).starts_with("duplicate reference: a"), "{out}");
        let out = compare(plateau(vec![el("a", json!({}))], vec![el("a", json!({}))]), plateau(vec![], vec![]));
        assert!(out.get("error").is_none(), "{out}");
    }

    #[test]
    fn a_missing_plateau_or_a_missing_layer_is_read_as_empty_or_refused() {
        let out: Value = serde_json::from_str(&compare_json(r#"{"base":{},"target":{"application":null,"technology":[{"reference":"t"}]}}"#)).unwrap();
        assert_eq!(out["counts"]["elements"]["new"], 1);
        let out: Value = serde_json::from_str(&compare_json(r#"{"base":{}}"#)).unwrap();
        assert!(error(&out).starts_with("invalid input"), "{out}");
        let out: Value = serde_json::from_str(&compare_json("nope")).unwrap();
        assert!(error(&out).starts_with("invalid input"), "{out}");
    }

    // ---- `replaces`: what an element of the target says it is the new place of (wave 009) ----

    fn replacing(reference: &str, replaces: Value, extra: Value) -> Value {
        let mut e = el(reference, extra);
        e["replaces"] = replaces;
        e
    }

    fn warnings(out: &Value) -> Vec<&str> {
        out["warnings"].as_array().map_or(vec![], |a| a.iter().map(|w| w.as_str().unwrap()).collect())
    }

    fn has_element(out: &Value, reference: &str) -> bool {
        out["elements"].as_array().unwrap().iter().any(|e| e["reference"] == reference)
    }

    fn candidate_pairs(out: &Value) -> Vec<(String, String)> {
        out["candidates"].as_array().unwrap().iter().map(|c| (c["from"].as_str().unwrap().to_string(), c["to"].as_str().unwrap().to_string())).collect()
    }

    #[test]
    fn one_element_that_replaces_one_in_another_place_is_moved_and_the_replaced_one_is_not_removed() {
        let out = app(
            vec![el("a", json!({})), el("b", json!({})), el("a.svc", json!({ "kind": "container", "name": "Billing" }))],
            vec![el("a", json!({})), el("b", json!({})), replacing("b.svc", json!(["a.svc"]), json!({ "kind": "container", "name": "Billing" }))],
        );
        assert!(out.get("error").is_none(), "{out}");
        let moved = element(&out, "b.svc");
        assert_eq!(moved["change"], "moved");
        assert_eq!(moved["replaces"], json!(["a.svc"]));
        assert!(natures(moved).is_empty(), "nothing else changed: {moved}");
        assert!(!has_element(&out, "a.svc"), "the replaced element is not in the union: {out}");
        assert_eq!(out["counts"]["elements"], json!({ "new": 0, "changed": 0, "removed": 0, "wording_only": 0, "moved": 1 }));
        assert_eq!(rows(&out), 1);
        let r = row(&out, "element", "b.svc");
        assert_eq!((r["change"].clone(), r["replaces"].clone()), (json!("moved"), json!(["a.svc"])));
        assert!(r.get("before").is_none(), "no property differs, so no before and after");
        assert!(out.get("warnings").is_none());
    }

    #[test]
    fn a_moved_element_keeps_its_own_changes_next_to_its_identity() {
        let out = app(
            vec![el("a", json!({})), el("b", json!({})), el("a.svc", json!({ "name": "Billing", "description": "charges" }))],
            vec![el("a", json!({})), el("b", json!({})), replacing("b.svc", json!(["a.svc"]), json!({ "name": "Invoicing", "description": "charges" }))],
        );
        let moved = element(&out, "b.svc");
        assert_eq!(moved["change"], "moved");
        assert_eq!(natures(moved), ["name"]);
        let r = row(&out, "element", "b.svc");
        assert_eq!((r["before"]["name"].clone(), r["after"]["name"].clone()), (json!("Billing"), json!("Invoicing")));
        assert_eq!(out["counts"]["elements"]["changed"], 0, "a moved element is counted as moved, not also as changed");
        assert_eq!(moved.get("wording_only"), None);
    }

    #[test]
    fn a_description_change_of_a_moved_element_is_not_wording_only() {
        let out = app(vec![el("a", json!({ "description": "one" }))], vec![replacing("b", json!(["a"]), json!({ "description": "two" }))]);
        assert_eq!(element(&out, "b")["change"], "moved");
        assert_eq!(natures(element(&out, "b")), ["description"]);
        assert!(element(&out, "b").get("wording_only").is_none());
        assert_eq!(out["counts"]["elements"]["wording_only"], 0);
    }

    #[test]
    fn the_relationships_follow_the_element_that_was_replaced() {
        // c -> a.svc becomes c -> b.svc; a.svc -> db becomes b.svc -> db: neither is a change
        let out = app(
            vec![el("a", json!({})), el("b", json!({})), el("c", json!({ "relationships": [rel("a.svc", "calls")] })), el("db", json!({})), el("a.svc", json!({ "relationships": [rel("db", "reads")] }))],
            vec![
                el("a", json!({})),
                el("b", json!({})),
                el("c", json!({ "relationships": [rel("b.svc", "calls")] })),
                el("db", json!({})),
                replacing("b.svc", json!(["a.svc"]), json!({ "relationships": [rel("db", "reads")] })),
            ],
        );
        assert_eq!(out["counts"]["relationships"], json!({ "new": 0, "changed": 0, "removed": 0 }), "{out}");
        assert_eq!(element(&out, "c")["change"], "none");
        assert!(natures(element(&out, "b.svc")).is_empty());
        // and one that really changed is still told
        let out = app(
            vec![el("a", json!({})), el("b", json!({})), el("db", json!({})), el("a.svc", json!({ "relationships": [rel("db", "reads")] }))],
            vec![el("a", json!({})), el("b", json!({})), el("db", json!({})), replacing("b.svc", json!(["a.svc"]), json!({ "relationships": [rel("db", "writes")] }))],
        );
        assert_eq!(natures(element(&out, "b.svc")), ["relationships-changed"]);
        assert_eq!(relationship(&out, "b.svc", "db", "writes")["change"], "changed");
    }

    #[test]
    fn the_deployment_follows_an_application_that_was_replaced() {
        let base = plateau(vec![el("a", json!({})), el("a.svc", json!({}))], vec![el("env", json!({ "applications": ["a.svc"] }))]);
        let target = plateau(vec![el("a", json!({})), replacing("a.api", json!(["a.svc"]), json!({}))], vec![el("env", json!({ "applications": ["a.api"] }))]);
        let out = compare(base, target);
        assert_eq!(element(&out, "a.api")["change"], "moved");
        assert_eq!(element(&out, "env")["change"], "none", "{out}");
    }

    /// What `compute` is handed for the comparison: the elements of a layer of the union, each with the relationships of the union it declares.
    fn union_of(out: &Value, layer: &str) -> Value {
        let mut elements = Vec::new();
        for e in out["elements"].as_array().unwrap().iter().filter(|e| e["layer"] == layer) {
            let mut e = e.clone();
            let declared: Vec<Value> = out["relationships"]
                .as_array()
                .unwrap()
                .iter()
                .filter(|r| r["layer"] == layer && r["from"] == e["reference"])
                .cloned()
                .collect();
            e["relationships"] = Value::Array(declared);
            elements.push(e);
        }
        Value::Array(elements)
    }

    /// Every viewpoint of the union, for every focal element of the technology layer and the map: the views of a comparison.
    fn views_of_the_union(out: &Value) {
        for viewpoint in ["overview", "detailed", "deep"] {
            for layer in ["application", "technology"] {
                let elements = union_of(out, layer);
                for focal in elements.as_array().unwrap().iter().filter(|e| e["parent"] == true).map(|e| e["reference"].clone()) {
                    let answer: Value = serde_json::from_str(&crate::compute_json(
                        &json!({ "viewpoint": viewpoint, "layer": layer, "focal": focal, "elements": elements, "app_elements": union_of(out, "application") }).to_string(),
                    ))
                    .unwrap();
                    assert!(answer.get("error").is_none(), "{viewpoint} of {focal} in the {layer} layer: {answer}");
                }
            }
        }
    }

    #[test]
    fn what_a_removed_node_deploys_is_said_as_the_target_says_it_and_the_union_can_be_drawn() {
        // E1 of the Brightcart document: the node `n` is removed, and it deployed `s.x`, which `s.y` replaced
        let base = plateau(vec![el("s", json!({})), el("s.x", json!({}))], vec![el("e", json!({})), el("e.n", json!({ "applications": ["s.x"] }))]);
        let target = plateau(
            vec![el("s", json!({})), replacing("s.y", json!(["s.x"]), json!({}))],
            vec![el("e", json!({})), el("e.m", json!({ "applications": ["s.y"] }))],
        );
        let out = compare(base, target);
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(element(&out, "e.n")["change"], "removed");
        assert_eq!(element(&out, "e.n")["applications"], json!(["s.y"]), "the application that took the place of the one it deployed: {out}");
        assert!(!has_element(&out, "s.x"), "the replaced application is still not in the union");
        assert_eq!(out["counts"]["elements"], json!({ "new": 1, "changed": 0, "removed": 1, "wording_only": 0, "moved": 1 }), "the counts are what they were");
        views_of_the_union(&out);
    }

    #[test]
    fn what_a_removed_element_uses_follows_the_element_that_was_replaced() {
        let base = plateau(
            vec![],
            vec![el("env", json!({ "uses": ["old"] })), el("old", json!({})), el("env2", json!({})), el("env2.gone", json!({ "uses": ["old"] }))],
        );
        let target = plateau(vec![], vec![el("env", json!({ "uses": ["new"] })), replacing("new", json!(["old"]), json!({})), el("env2", json!({}))]);
        let out = compare(base, target);
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(element(&out, "env2.gone")["change"], "removed");
        assert_eq!(element(&out, "env2.gone")["uses"], json!(["new"]), "{out}");
        views_of_the_union(&out);
    }

    #[test]
    fn what_a_removed_node_deploys_is_dropped_when_the_application_was_split() {
        // `s.x` became `s.y` and `s.z`: which of them the removed node would deploy is a guess, so it deploys none
        let base = plateau(vec![el("s", json!({})), el("s.x", json!({}))], vec![el("e", json!({})), el("e.n", json!({ "applications": ["s.x", "s.keep"] }))]);
        let base = {
            let mut b = base;
            b["application"].as_array_mut().unwrap().push(el("s.keep", json!({})));
            b
        };
        let target = plateau(
            vec![el("s", json!({})), el("s.keep", json!({})), replacing("s.y", json!(["s.x"]), json!({})), replacing("s.z", json!(["s.x"]), json!({}))],
            vec![el("e", json!({}))],
        );
        let out = compare(base, target);
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(element(&out, "e.n")["applications"], json!(["s.keep"]), "{out}");
        views_of_the_union(&out);
    }

    #[test]
    fn the_place_that_holds_something_removed_says_its_references_as_the_target_does() {
        // the replaced node `e.old` is in the union because its child was removed; the application it deployed was replaced
        let base = plateau(
            vec![el("s", json!({})), el("s.x", json!({}))],
            vec![el("e", json!({})), el("e.old", json!({ "applications": ["s.x"] })), el("e.old.child", json!({}))],
        );
        let target = plateau(
            vec![el("s", json!({})), replacing("s.y", json!(["s.x"]), json!({}))],
            vec![el("e", json!({})), replacing("e.fresh", json!(["e.old"]), json!({ "applications": ["s.y"] }))],
        );
        let out = compare(base, target);
        assert!(out.get("error").is_none(), "{out}");
        let place = element(&out, "e.old");
        assert_eq!((place["change"].clone(), place["replaced_by"].clone()), (json!("removed"), json!(["e.fresh"])));
        assert_eq!(place["applications"], json!(["s.y"]), "{out}");
        views_of_the_union(&out);
    }

    #[test]
    fn one_element_that_replaces_several_is_merged_and_several_that_replace_one_are_split() {
        // merge: x1 and x2 become y; split: s becomes t1 and t2
        let out = app(
            vec![el("x1", json!({ "name": "X1" })), el("x2", json!({})), el("s", json!({})), el("keep", json!({}))],
            vec![replacing("y", json!(["x2", "x1"]), json!({})), replacing("t1", json!(["s"]), json!({})), replacing("t2", json!(["s"]), json!({})), el("keep", json!({}))],
        );
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(element(&out, "y")["change"], "merged");
        assert_eq!(element(&out, "y")["replaces"], json!(["x1", "x2"]), "sorted, whatever the author's order");
        assert_eq!(element(&out, "t1")["change"], "split");
        assert_eq!(element(&out, "t2")["change"], "split");
        for gone in ["x1", "x2", "s"] {
            assert!(!has_element(&out, gone), "{gone} is replaced, not removed");
        }
        assert_eq!(out["counts"]["elements"], json!({ "new": 0, "changed": 0, "removed": 0, "wording_only": 0, "split": 2, "merged": 1 }));
        assert_eq!(rows(&out), 3);
        assert_eq!(row(&out, "element", "t1")["replaces"], json!(["s"]));
    }

    #[test]
    fn an_element_that_was_already_there_and_replaces_another_is_merged_with_it() {
        let out = app(
            vec![el("a", json!({ "name": "A" })), el("b", json!({ "name": "B" }))],
            vec![replacing("b", json!(["a"]), json!({ "name": "B2" }))],
        );
        let b = element(&out, "b");
        assert_eq!(b["change"], "merged");
        assert_eq!(b["replaces"], json!(["a"]));
        assert_eq!(natures(b), ["name"], "compared with its own base version: {out}");
        assert_eq!(row(&out, "element", "b")["before"]["name"], "B");
        assert!(!has_element(&out, "a"));
    }

    #[test]
    fn merged_wins_over_split_for_an_element_that_is_both() {
        // a is replaced by b1 and b2 (a split), and b2 also replaces c (a merge)
        let out = app(
            vec![el("a", json!({})), el("c", json!({}))],
            vec![replacing("b1", json!(["a"]), json!({})), replacing("b2", json!(["a", "c"]), json!({}))],
        );
        assert_eq!(element(&out, "b1")["change"], "split");
        assert_eq!(element(&out, "b2")["change"], "merged");
    }

    #[test]
    fn the_relationships_of_a_split_element_are_not_compared_and_those_of_merged_ones_follow() {
        let out = app(
            vec![el("s", json!({ "relationships": [rel("db", "reads")] })), el("m1", json!({ "relationships": [rel("db", "reads")] })), el("m2", json!({})), el("db", json!({}))],
            vec![
                replacing("t1", json!(["s"]), json!({ "relationships": [rel("db", "reads")] })),
                replacing("t2", json!(["s"]), json!({})),
                replacing("m", json!(["m1", "m2"]), json!({ "relationships": [rel("db", "reads")] })),
                el("db", json!({})),
            ],
        );
        assert_eq!(out["counts"]["relationships"]["removed"], 0, "nothing is invented as removed: {out}");
        assert!(natures(element(&out, "m")).is_empty(), "m1 -> db became m -> db, which m still has: {out}");
    }

    #[test]
    fn a_reference_unknown_in_the_base_is_a_warning_and_changes_nothing() {
        let out = app(vec![el("a", json!({}))], vec![el("a", json!({})), replacing("b", json!(["nowhere"]), json!({}))]);
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(element(&out, "b")["change"], "new");
        assert!(element(&out, "b").get("replaces").is_none(), "an ignored replaces does not travel: {out}");
        assert_eq!(warnings(&out).len(), 1);
        assert!(warnings(&out)[0].contains("nowhere") && warnings(&out)[0].contains("not an element of the base plateau"), "{out}");
        assert_eq!(out["counts"]["elements"]["new"], 1);
    }

    #[test]
    fn a_reference_that_is_still_in_the_target_is_ignored_with_a_warning() {
        let out = app(vec![el("a", json!({})), el("b", json!({}))], vec![el("a", json!({})), replacing("b", json!(["a"]), json!({}))]);
        assert_eq!(element(&out, "a")["change"], "none", "{out}");
        assert_eq!(element(&out, "b")["change"], "none");
        assert_eq!(warnings(&out).len(), 1);
        assert!(warnings(&out)[0].contains("still an element of the target plateau"), "{out}");
    }

    #[test]
    fn a_replaces_that_is_malformed_is_a_warning_not_an_error() {
        let out = app(
            vec![el("a", json!({})), el("c", json!({}))],
            vec![replacing("b", json!("a"), json!({})), replacing("d", json!([3, null, "", "c"]), json!({}))],
        );
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(element(&out, "b")["change"], "new", "a text instead of a list is ignored");
        assert_eq!(element(&out, "d")["change"], "moved", "the entries that are references count");
        assert_eq!(warnings(&out).len(), 1 + 3);
        assert!(element(&out, "a")["change"] == "removed");
    }

    #[test]
    fn a_reference_listed_twice_counts_once() {
        let out = app(vec![el("a", json!({}))], vec![replacing("b", json!(["a", "a"]), json!({}))]);
        assert_eq!(element(&out, "b")["change"], "moved", "twice the same one is still one: {out}");
        assert_eq!(element(&out, "b")["replaces"], json!(["a"]));
        assert_eq!(warnings(&out).len(), 1);
        assert!(warnings(&out)[0].contains("twice"));
    }

    #[test]
    fn cycles_and_self_references_are_ignored_and_never_loop() {
        // a and b replace each other, c replaces itself, d replaces e that replaces d: all of them are in both plateaus
        let both = |replaces_a: Value, replaces_b: Value, replaces_c: Value, replaces_d: Value, replaces_e: Value| {
            vec![
                replacing("a", replaces_a, json!({})),
                replacing("b", replaces_b, json!({})),
                replacing("c", replaces_c, json!({})),
                replacing("d", replaces_d, json!({})),
                replacing("e", replaces_e, json!({})),
            ]
        };
        let out = app(
            both(json!([]), json!([]), json!([]), json!([]), json!([])),
            both(json!(["b"]), json!(["a"]), json!(["c"]), json!(["e"]), json!(["d"])),
        );
        assert!(out.get("error").is_none(), "{out}");
        for r in ["a", "b", "c", "d", "e"] {
            assert_eq!(element(&out, r)["change"], "none", "{r}");
        }
        assert_eq!(warnings(&out).len(), 5);
        // a self reference of a new element, and a chain through an element that is new: nothing in the base to replace
        let out = app(vec![el("old", json!({}))], vec![replacing("n1", json!(["n1"]), json!({})), replacing("n2", json!(["n1"]), json!({})), replacing("n3", json!(["old", "n3"]), json!({}))]);
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(element(&out, "n1")["change"], "new");
        assert_eq!(element(&out, "n2")["change"], "new");
        assert_eq!(element(&out, "n3")["change"], "moved");
        assert_eq!(warnings(&out).len(), 3);
    }

    #[test]
    fn what_a_replaced_element_contained_is_still_removed_unless_it_is_replaced_too() {
        let out = app(
            vec![el("a", json!({})), el("a.x", json!({})), el("a.y", json!({}))],
            vec![replacing("b", json!(["a"]), json!({})), replacing("b.x", json!(["a.x"]), json!({}))],
        );
        assert_eq!(element(&out, "b")["change"], "moved");
        assert_eq!(element(&out, "b.x")["change"], "moved");
        assert_eq!(element(&out, "a.y")["change"], "removed", "nobody said where it went: {out}");
        assert!(!has_element(&out, "a.x"), "replaced, and nothing below it");
        // a is replaced, not removed; it is in the union only because a.y, below it, was removed: a view needs it to place a.y
        let place = element(&out, "a");
        assert_eq!((place["change"].clone(), place["replaced_by"].clone()), (json!("removed"), json!(["b"])), "{out}");
        assert_eq!(out["counts"]["elements"], json!({ "new": 0, "changed": 0, "removed": 1, "wording_only": 0, "moved": 2 }), "the place is not counted");
        assert!(out["changes"].as_array().unwrap().iter().all(|r| r["reference"] != "a"), "and has no row: {}", out["changes"]);
    }

    #[test]
    fn replaces_works_in_the_technology_layer_and_never_across_layers() {
        let base = plateau(vec![el("shop", json!({}))], vec![el("old-env", json!({}))]);
        let target = plateau(vec![replacing("shop2", json!(["old-env"]), json!({}))], vec![replacing("new-env", json!(["old-env"]), json!({}))]);
        let out = compare(base, target);
        assert_eq!(element(&out, "new-env")["change"], "moved");
        assert_eq!(element(&out, "shop2")["change"], "new", "old-env is not an application: {out}");
        assert_eq!(element(&out, "shop")["change"], "removed");
        assert_eq!(warnings(&out).len(), 1);
    }

    #[test]
    fn a_replaces_on_a_base_element_is_not_read_and_never_leaks() {
        let out = app(vec![replacing("a", json!(["b"]), json!({})), el("b", json!({}))], vec![el("c", json!({}))]);
        assert_eq!(element(&out, "a")["change"], "removed");
        assert_eq!(element(&out, "b")["change"], "removed");
        for r in ["a", "b", "c"] {
            assert!(element(&out, r).get("replaces").is_none(), "{r}: {out}");
        }
        assert!(out.get("warnings").is_none());
    }

    #[test]
    fn a_free_form_field_named_like_a_reserved_word_does_not_reach_the_answer() {
        // `replaces` is the author's hint, read and written by the kernel only: the union writes it itself, and only when it applies
        let out = app(vec![el("a", json!({}))], vec![el("a", json!({})), replacing("n", json!("a text"), json!({ "extra": 1 }))]);
        assert!(element(&out, "n").get("replaces").is_none(), "{out}");
        assert_eq!(element(&out, "n")["extra"], 1, "the other fields still travel");
        let out = app(vec![replacing("a", json!(["x"]), json!({}))], vec![]);
        assert!(element(&out, "a").get("replaces").is_none(), "{out}");
    }

    #[test]
    fn candidates_are_listed_with_their_reasons_and_never_applied() {
        let out = app(
            vec![
                el("old", json!({})),
                el("old.billing", json!({ "kind": "container", "name": "Billing", "description": "charges the customers every month and sends the invoices" })),
                el("old.audit", json!({ "kind": "container", "name": "Audit trail", "description": "keeps a log" })),
                el("old.cache", json!({ "kind": "component", "name": "Cache" })),
            ],
            vec![
                el("old", json!({})),
                el("new", json!({})),
                el("new.invoicing", json!({ "kind": "container", "name": "Billing", "description": "a different text" })),
                el("new.finance", json!({ "kind": "container", "name": "Finance", "description": "charges the customers every month and sends the invoices by mail" })),
                el("new.cache", json!({ "kind": "container", "name": "Cache" })),
            ],
        );
        assert!(out.get("error").is_none(), "{out}");
        let pairs = candidate_pairs(&out);
        assert_eq!(pairs, [("old.billing".to_string(), "new.finance".to_string()), ("old.billing".to_string(), "new.invoicing".to_string())], "{}", out["candidates"]);
        assert_eq!(out["candidates"][0]["reasons"], json!(["description"]));
        assert_eq!(out["candidates"][1]["reasons"], json!(["name"]));
        // not applied: they are still removed and new
        assert_eq!(element(&out, "old.billing")["change"], "removed");
        assert_eq!(element(&out, "new.invoicing")["change"], "new");
        assert_eq!(out["counts"]["elements"], json!({ "new": 4, "changed": 0, "removed": 3, "wording_only": 0 }));
    }

    #[test]
    fn the_same_parent_makes_a_candidate_only_for_the_only_two_of_their_kind_under_it() {
        let out = app(
            vec![el("p", json!({})), el("p.a", json!({ "kind": "container" })), el("p.x", json!({ "kind": "component" }))],
            vec![el("p", json!({})), el("p.b", json!({ "kind": "container" })), el("p.y", json!({ "kind": "component" })), el("p.z", json!({ "kind": "component" }))],
        );
        assert_eq!(candidate_pairs(&out), [("p.a".to_string(), "p.b".to_string())], "{}", out["candidates"]);
        assert_eq!(out["candidates"][0]["reasons"], json!(["parent"]));
    }

    #[test]
    fn a_name_that_repeats_among_the_removed_or_the_new_is_no_reason() {
        // `Cache` is on two removed and two new components: four pairs for two answers, and nothing says which is which
        let cache = |reference: &str| el(reference, json!({ "kind": "component", "name": "Cache" }));
        let out = app(
            vec![el("a", json!({})), cache("a.cache"), el("b", json!({})), cache("b.cache"), el("c", json!({})), el("c.broker", json!({ "kind": "component", "name": "Broker" }))],
            vec![el("a2", json!({})), cache("a2.cache"), el("b2", json!({})), cache("b2.cache"), el("c", json!({})), el("c.relay", json!({ "kind": "component", "name": "Broker" }))],
        );
        assert_eq!(candidate_pairs(&out), [("c.broker".to_string(), "c.relay".to_string())], "only the Broker is the one removed and the one new of its name: {}", out["candidates"]);
        assert_eq!(out["candidates"][0]["reasons"], json!(["name", "parent"]));
        // one side is enough to make the name say nothing: two removed `Cache`, one new
        let out = app(vec![el("a", json!({})), cache("a.cache"), cache("a.cache2")], vec![el("a", json!({})), cache("a.store")]);
        assert_eq!(candidate_pairs(&out), [] as [(String, String); 0], "{}", out["candidates"]);
        // the other reasons still stand for a name that repeats
        let described = |reference: &str, description: &str| el(reference, json!({ "kind": "component", "name": "Cache", "description": description }));
        let out = app(
            vec![el("a", json!({})), described("a.one", "keeps the recent answers of the catalogue in memory"), described("a.two", "holds the sessions of the signed in visitors")],
            vec![el("a", json!({})), described("a.three", "keeps the recent answers of the catalogue in memory for a minute"), described("a.four", "something else entirely written in other words")],
        );
        assert_eq!(candidate_pairs(&out), [("a.one".to_string(), "a.three".to_string())], "{}", out["candidates"]);
        assert_eq!(out["candidates"][0]["reasons"], json!(["description"]));
    }

    #[test]
    fn a_name_is_a_reason_again_once_the_author_has_settled_the_others_that_share_it() {
        let cache = |reference: &str| el(reference, json!({ "kind": "component", "name": "Cache" }));
        let out = app(vec![el("a", json!({})), cache("a.cache"), el("b", json!({})), cache("b.cache")], vec![el("a2", json!({})), replacing("a2.cache", json!(["a.cache"]), json!({ "kind": "component", "name": "Cache" })), el("b2", json!({})), cache("b2.cache")]);
        assert_eq!(candidate_pairs(&out), [("b.cache".to_string(), "b2.cache".to_string())], "a.cache is replaced, so the other Cache is now the only one of its name on each side: {}", out["candidates"]);
        assert_eq!(out["candidates"][0]["reasons"], json!(["name"]));
    }

    #[test]
    fn what_is_replaced_or_replaces_is_no_candidate_and_a_kind_is_needed() {
        let out = app(
            vec![el("a", json!({ "kind": "container", "name": "Same" })), el("b", json!({ "kind": "container", "name": "Other" })), el("c", json!({ "name": "Same" }))],
            vec![replacing("a2", json!(["a"]), json!({ "kind": "container", "name": "Same" })), el("b2", json!({ "kind": "container", "name": "Other" })), el("c2", json!({ "kind": "container", "name": "Same" }))],
        );
        assert_eq!(candidate_pairs(&out), [("b".to_string(), "b2".to_string())], "a is replaced, a2 replaces, c has no kind: {}", out["candidates"]);
    }

    #[test]
    fn without_replaces_the_answer_is_what_it_was_plus_an_empty_list_of_candidates() {
        let out = one(json!({ "name": "A" }), json!({ "name": "B" }));
        assert_eq!(out["candidates"], json!([]));
        assert!(out.get("warnings").is_none());
        assert_eq!(out["counts"]["elements"], json!({ "new": 0, "changed": 1, "removed": 0, "wording_only": 0 }));
        assert_eq!(out["version"], CONTRACT_VERSION);
    }

    #[test]
    fn the_same_pair_with_replaces_gives_the_same_bytes_whatever_the_order() {
        let input = json!({
            "base": plateau(
                vec![el("x1", json!({})), el("x2", json!({ "relationships": [rel("db", "reads")] })), el("s", json!({})), el("db", json!({})), el("gone", json!({ "kind": "container", "name": "Mail" }))],
                vec![]
            ),
            "target": plateau(
                vec![
                    replacing("y", json!(["x2", "x1", "x1", "nowhere"]), json!({ "relationships": [rel("db", "reads")] })),
                    replacing("t1", json!(["s"]), json!({})),
                    replacing("t2", json!(["s"]), json!({})),
                    el("db", json!({})),
                    el("fresh", json!({ "kind": "container", "name": "Mail" })),
                ],
                vec![]
            ),
        });
        let first = compare_json(&input.to_string());
        let out: Value = serde_json::from_str(&first).unwrap();
        assert!(out.get("error").is_none(), "{out}");
        assert_eq!(warnings(&out).len(), 2, "{out}");
        assert_eq!(candidate_pairs(&out), [("gone".to_string(), "fresh".to_string())]);
        assert_eq!(first, compare_json(&input.to_string()), "twice");
        let shuffled = reordered(&input);
        assert_ne!(shuffled.to_string(), input.to_string(), "the test must really shuffle");
        assert_eq!(first, compare_json(&shuffled.to_string()));
        assert_eq!(first, compare_json(&reordered(&shuffled).to_string()));
    }
}
