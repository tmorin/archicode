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
//!                   description, qualifiers, tags, ... }. Both layers are optional lists, `null` is "not given".
//! output: { version, elements: [..], relationships: [..], changes: [Row], counts }  |  { error }
//! ```
//!
//! The rules (the *why* is in docs/wav/wav-008-plateaus-and-baseline-diff, run 0036):
//!
//! 1. **Identity is the dotted reference, per layer.** The same reference in both plateaus is the same thing; in the
//!    target only it is `new`, in the base only `removed`. A moved, renamed or split element is a `removed` and a `new`.
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
use super::{null_as_default, Elem, Rel, CONTRACT_VERSION};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet, HashMap};

const LAYERS: [&str; 2] = ["application", "technology"];
const RENDERING_PREFIX: &str = "rendering-";
/// What `OutElement` writes itself: an extra field of that name never reaches the union.
const RESERVED: [&str; 14] = [
    "layer", "reference", "parent", "parent_reference", "kind", "name", "description", "qualifiers", "tags", "applications", "uses", "relationships", "change", "natures",
];

const NEW: &str = "new";
const CHANGED: &str = "changed";
const REMOVED: &str = "removed";
const NONE: &str = "none";

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
    /// `none`, `new`, `changed` or `removed`
    change: &'static str,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    natures: Vec<&'static str>,
    /// the description is the only thing that changed
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    wording_only: bool,
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

#[derive(Serialize)]
struct CompareOutput {
    version: u32,
    elements: Vec<OutElement>,
    relationships: Vec<OutRelationship>,
    changes: Vec<Value>,
    counts: Counts,
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

fn relationships_of(side: &Side, layer: &'static str) -> Vec<R> {
    side.layer(layer).iter().flat_map(|e| e.relationships.iter().map(move |r| R::of(layer, &e.reference, r))).collect()
}

fn run(input: &str) -> Result<CompareOutput, String> {
    let input: CompareInput = serde_json::from_str(input).map_err(|e| format!("invalid input: {e}"))?;
    check(&input.base, "base")?;
    check(&input.target, "target")?;

    // the relationships first: the natures of an element depend on them
    let mut relationships: Vec<URel> = Vec::new();
    for layer in LAYERS {
        relationships.extend(compare_relationships(&relationships_of(&input.base, layer), &relationships_of(&input.target, layer)));
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
            match base.get(reference) {
                None => elements.push(out_element(layer, t, &tp, NEW)),
                Some(b) => {
                    let (mut natures, before, after) = compare_props(&props_of(b), &tp);
                    let flags = moved.get(&(layer, *reference)).copied().unwrap_or_default();
                    for (flag, nature) in [(flags.0, "relationships-added"), (flags.1, "relationships-removed"), (flags.2, "relationships-changed")] {
                        if flag {
                            natures.push(nature);
                        }
                    }
                    let mut element = out_element(layer, t, &tp, if natures.is_empty() { NONE } else { CHANGED });
                    element.wording_only = natures == ["description"];
                    element.natures = natures;
                    element.before = before;
                    element.after = after;
                    elements.push(element);
                }
            }
        }
        for (reference, b) in &base {
            if !target.contains_key(reference) {
                elements.push(out_element(layer, b, &props_of(b), REMOVED));
            }
        }
    }
    elements.sort_by(|a, b| (a.layer, &a.reference).cmp(&(b.layer, &b.reference)));

    let mut counts = Counts::default();
    let mut changes: Vec<Value> = Vec::new();
    for e in elements.iter().filter(|e| e.change != NONE) {
        match e.change {
            NEW => counts.elements.new += 1,
            CHANGED => {
                counts.elements.changed += 1;
                counts.elements.wording_only += usize::from(e.wording_only);
            }
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
        if e.change == CHANGED {
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
    Ok(CompareOutput { version: CONTRACT_VERSION, elements, relationships, changes, counts })
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
}
