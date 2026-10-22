//! Patches. A plateau is a layer over its parent: the host adds the manifests of the layer to the graph of the parent, then
//! hands this module the JSON of that graph and the ordered `patches` of the layer, which change it.
//!
//! ```text
//! input : { workspace, plateau?, patches: [patch] }
//! patch : { operator: "REMOVE"|"SET"|"ADD"|"MERGE",
//!           target? (a full reference: one element), layer? ("application" by default, or "technology"),
//!           json-path? (RFC 9535, also written json_path), expect? (an integer, 1 or more),
//!           field?, where? { destination, label? }, value? }
//! output: { version, workspace, patches: [ { rank, operator, selector, matched, touched: [{layer, reference}],
//!                                            removed?: [{layer, reference}], dropped?: [{layer, reference, field, entry}] } ] }
//!         | { error, patch?: { plateau?, rank, operator?, selector? } }
//! ```
//!
//! The workspace is the document `apply_facet` takes (`application.elements`, `technology.elements`, each element nested with its
//! `id`); a patch can only select an element or something inside one. The patches run in order, each on the result of the one
//! before, and the first one that fails ends the call: there is no partial result.
//!
//! **Selecting.** `target` is a full reference in `layer` and selects exactly that element. `json-path` is evaluated against the
//! whole document, like a facet's, and selects at least one node, or exactly `expect` of them. A patch that selects nothing, or not
//! the number it expects, is an error that names the plateau, the rank (from 1) and the selector. Nothing is guessed: a key the
//! patch should not have, or a combination that has no meaning, is an error too. `plateau` only names the layer in the sentences
//! of the errors (an empty one is none). A relationship added, or a value set, is not checked: the references of a layer are the
//! host's to validate once the layer is built, and it names the layer.
//!
//! **Operators.** `REMOVE` takes the selected nodes out; when an element goes, what points at it goes in the same step (a
//! relationship towards it or what is inside it, its entries in `uses` and `applications`), and not the node that hosted it
//! (`facet.rs` is the one code of that cascade). `REMOVE` with a `field` takes that field out of the selected elements instead
//! (an inherited description is gone: the element stays, the key does not; additive, a `REMOVE` without `field` is what it
//! was): any field but `id`, `parent`, `elements` and `kind`; a field the element does not have is already gone, which is no
//! error (a bulk `REMOVE` of a field over a `json-path` is not a miss for the elements that never had it, and a plateau that
//! says "gone" over a layer below that already took it out still resolves); a selected node that is not an object has no field
//! to take out, as for `SET`; `where` and `value` are refused. A field taken out is no cascade: nothing leaves the graph, so the
//! report has `matched` and `touched` and no `removed` or `dropped`. `SET` replaces a field (a list is replaced, an object is replaced); with `where`
//! (a relationship is found by `(destination, label)`, an absent label being none) the keys of `value` replace the fields of that
//! one relationship. `ADD` appends to a list (each item if `value` is a list; a missing list is created). `MERGE` sets the keys
//! of `value` in an object, one level deep, and keeps the others (a missing object is created). With a `target`, `field` says which
//! field of the element changes; with a `json-path`, `field` is optional: without it the selected nodes themselves are replaced,
//! appended to or merged into.
//!
//! A patch never changes an `id` or a `parent`: the fields `id`, `parent` and `elements` are refused, a `REMOVE` cannot select an
//! `id`, and after every patch other than `REMOVE` the references of both layers must be the ones they were. An element is
//! always of a kind: `kind` cannot be taken out either.
//!
//! **Reporting.** `touched` lists the elements the patch selected (the element a selected node is, or lies in), sorted by (layer,
//! reference). For `REMOVE`, `removed` lists every element that left the graph (the subtree included) and `dropped` the entries
//! taken out of the elements that stay, in the order of the document: an element that only lost an entry to the cascade is in
//! `dropped`, not in `touched`.
use super::facet::{remove_nodes, RefCounts, References, Step};
use super::{null_as_default, CONTRACT_VERSION};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use serde_json_path::JsonPath;
use std::collections::BTreeSet;

const LAYERS: [&str; 2] = ["application", "technology"];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Patch {
    operator: String,
    target: Option<String>,
    layer: Option<String>,
    #[serde(rename = "json-path", alias = "json_path")]
    json_path: Option<String>,
    expect: Option<u64>,
    field: Option<String>,
    #[serde(rename = "where")]
    condition: Option<Where>,
    value: Option<Value>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Where {
    destination: String,
    label: Option<String>,
}

#[derive(Deserialize)]
struct Request {
    workspace: Value,
    plateau: Option<String>,
    #[serde(default, deserialize_with = "null_as_default")]
    patches: Vec<Value>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Op {
    Remove,
    Set,
    Add,
    Merge,
}

enum Selector<'a> {
    Target { layer: &'static str, reference: &'a str },
    Path { path: &'a str, expect: Option<usize> },
}

/// A failure: the sentence, and which patch it is about.
struct Fail {
    message: String,
    patch: Option<Value>,
}

/// Who a patch is, for the sentence of an error and for `error.patch`.
struct Who<'a> {
    plateau: Option<&'a str>,
    rank: usize,
    operator: Option<String>,
    selector: Option<String>,
}

impl Who<'_> {
    fn fail(&self, problem: impl std::fmt::Display) -> Fail {
        let plateau = self.plateau.map(|p| format!("plateau {p}: ")).unwrap_or_default();
        let patch = match (&self.operator, &self.selector) {
            (Some(o), Some(s)) => format!(" ({o} {s})"),
            (Some(o), None) => format!(" ({o})"),
            _ => String::new(),
        };
        let mut data = Map::new();
        if let Some(p) = self.plateau {
            data.insert("plateau".into(), json!(p));
        }
        data.insert("rank".into(), json!(self.rank));
        if let Some(o) = &self.operator {
            data.insert("operator".into(), json!(o));
        }
        if let Some(s) = &self.selector {
            data.insert("selector".into(), json!(s));
        }
        Fail { message: format!("{plateau}patch {}{patch}: {problem}", self.rank), patch: Some(Value::Object(data)) }
    }
}

/// How a patch says what it selects, read from the patch as it was written (also when the patch is not a valid one).
fn selector_text(raw: &Value) -> Option<String> {
    let text = |key: &str| raw.get(key).and_then(Value::as_str);
    let target = text("target").map(|t| match text("layer") {
        Some(l) => format!("target {t} layer {l}"),
        None => format!("target {t}"),
    });
    let path = text("json-path").or(text("json_path")).map(|p| format!("json-path {p}"));
    match (target, path) {
        (Some(t), Some(p)) => Some(format!("{t} {p}")),
        (t, p) => t.or(p),
    }
}

fn kind(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "a boolean",
        Value::Number(_) => "a number",
        Value::String(_) => "a text",
        Value::Array(_) => "a list",
        Value::Object(_) => "an object",
    }
}

fn nodes(n: usize) -> String {
    if n == 1 { "1 node".into() } else { format!("{n} nodes") }
}

fn shown(layer: &str, reference: &str) -> String {
    if layer == "technology" { format!("{reference} (technology)") } else { reference.to_string() }
}

fn path_text(steps: &[Step]) -> String {
    let mut out = String::from("$");
    for step in steps {
        match step {
            Step::Name(n) => {
                out.push('.');
                out.push_str(n);
            }
            Step::Index(i) => out.push_str(&format!("[{i}]")),
        }
    }
    out
}

/// What a patch asks, checked without the document: the combinations of keys that mean something.
fn check(patch: &Patch) -> Result<(Op, Selector<'_>), String> {
    let op = match patch.operator.as_str() {
        "REMOVE" => Op::Remove,
        "SET" => Op::Set,
        "ADD" => Op::Add,
        "MERGE" => Op::Merge,
        other => return Err(format!("unsupported operator {other}: REMOVE, SET, ADD and MERGE are the operators of a patch")),
    };
    let selector = match (&patch.target, &patch.json_path) {
        (Some(_), Some(_)) => return Err("has a `target` and a `json-path`: write one of them".into()),
        (None, None) => return Err("has no selector: write a `target` or a `json-path`".into()),
        (Some(reference), None) => {
            if patch.expect.is_some() {
                return Err("`expect` goes with a `json-path`: a `target` selects exactly one element".into());
            }
            let layer = match patch.layer.as_deref() {
                None | Some("application") => "application",
                Some("technology") => "technology",
                Some(other) => return Err(format!("unknown layer {other}: application or technology")),
            };
            Selector::Target { layer, reference }
        }
        (None, Some(path)) => {
            if patch.layer.is_some() {
                return Err("`layer` goes with a `target`: a `json-path` starts at `$.application` or `$.technology`".into());
            }
            if patch.expect == Some(0) {
                return Err("`expect` is 1 or more: a patch that selects nothing is an error".into());
            }
            Selector::Path { path, expect: patch.expect.map(|e| e as usize) }
        }
    };
    if let Some(field) = &patch.field {
        match field.as_str() {
            "" => return Err("`field` is empty".into()),
            "id" | "parent" => return Err(format!("`{field}` cannot be changed: a patch never changes an id or a parent")),
            "elements" => return Err("`elements` cannot be changed: the elements are declared by manifests, and a patch never changes an id or a parent".into()),
            _ => {}
        }
    }
    let on_target = matches!(selector, Selector::Target { .. });
    if patch.condition.is_some() {
        if !on_target {
            return Err("`where` goes with a `target`".into());
        }
        if op != Op::Set {
            return Err("`where` goes with SET: it finds the relationship whose fields `value` replaces".into());
        }
        if patch.field.as_deref() != Some("relationships") {
            return Err("`where` finds a relationship: write `field: relationships`".into());
        }
    }
    if op == Op::Remove {
        let what = if patch.field.is_some() { "takes a field out of what the selector selects" } else { "removes what the selector selects" };
        for (name, given) in [("where", patch.condition.is_some()), ("value", patch.value.is_some())] {
            if given {
                return Err(format!("REMOVE takes no `{name}`: it {what}"));
            }
        }
        if patch.field.as_deref() == Some("kind") {
            return Err("`kind` cannot be taken out: an element always has a kind".into());
        }
        return Ok((op, selector));
    }
    let Some(value) = &patch.value else { return Err("needs a `value`".into()) };
    if on_target && patch.field.is_none() {
        return Err("needs a `field`: a `target` is an element, and `field` says which of its fields changes".into());
    }
    if op == Op::Merge && !value.is_object() {
        return Err(format!("MERGE merges an object: `value` is {}", kind(value)));
    }
    if patch.condition.is_some() && !value.is_object() {
        return Err(format!("with `where`, `value` is an object (the fields of the relationship to replace), not {}", kind(value)));
    }
    Ok((op, selector))
}

/// The path of the element with this reference in this layer.
fn find_element(doc: &Value, layer: &'static str, reference: &str) -> Option<Vec<Step>> {
    let mut steps = vec![Step::Name(layer.to_string())];
    let mut current = doc.get(layer)?;
    for id in reference.split('.') {
        let list = current.get("elements")?.as_array()?;
        let index = list.iter().position(|n| n.get("id").and_then(Value::as_str) == Some(id))?;
        steps.push(Step::Name("elements".to_string()));
        steps.push(Step::Index(index));
        current = &list[index];
    }
    Some(steps)
}

/// The element a node is, or lies in: its layer and its reference. None for a node that is in no element (a layer, the list of its
/// elements, anything outside the two layers).
fn element_of(doc: &Value, steps: &[Step]) -> Option<(&'static str, String)> {
    let (Step::Name(layer), mut rest) = steps.split_first()? else { return None };
    let layer = LAYERS.into_iter().find(|l| l == layer)?;
    let mut node = doc.get(layer)?;
    let mut reference: Option<String> = None;
    while let [Step::Name(name), Step::Index(i), tail @ ..] = rest {
        if name != "elements" {
            break;
        }
        node = node.get("elements")?.get(*i)?;
        let id = node.get("id")?.as_str()?;
        reference = Some(match reference {
            Some(parent) => format!("{parent}.{id}"),
            None => id.to_string(),
        });
        rest = tail;
    }
    reference.map(|r| (layer, r))
}

fn node_at_mut<'a>(doc: &'a mut Value, steps: &[Step]) -> Option<&'a mut Value> {
    let mut node = doc;
    for step in steps {
        node = match (step, node) {
            (Step::Name(n), Value::Object(m)) => m.get_mut(n)?,
            (Step::Index(i), Value::Array(a)) => a.get_mut(*i)?,
            _ => return None,
        };
    }
    Some(node)
}

/// The nodes a patch selects, each once, sorted by path.
fn select(doc: &Value, selector: &Selector<'_>) -> Result<Vec<Vec<Step>>, String> {
    match selector {
        Selector::Target { layer, reference } => find_element(doc, *layer, reference).map(|steps| vec![steps]).ok_or_else(|| {
            let other = if *layer == "application" { "technology" } else { "application" };
            let hint = if find_element(doc, other, reference).is_some() { format!(" (the {other} layer has it: write `layer: {other}`)") } else { String::new() };
            format!("selects nothing, there is no element {reference} in the {layer} layer{hint}")
        }),
        Selector::Path { path, expect } => {
            let parsed = JsonPath::parse(path).map_err(|e| format!("invalid JSONPath: {e}"))?;
            let mut found: Vec<Vec<Step>> = parsed.query_located(doc).iter().map(|node| node.location().iter().map(Step::from).collect()).collect();
            found.sort_unstable();
            found.dedup();
            match (found.len(), expect) {
                (0, None) => Err("selects nothing, at least one node is expected".into()),
                (0, Some(e)) => Err(format!("selects nothing, {} expected", nodes(*e))),
                (n, Some(e)) if n != *e => Err(format!("selects {}, {e} expected", nodes(n))),
                _ => Ok(found),
            }
        }
    }
}

fn label_of(relationship: &Value) -> &str {
    relationship.get("label").and_then(Value::as_str).unwrap_or("")
}

fn merge_into(slot: &mut Value, value: &Value, what: &str) -> Result<(), String> {
    if slot.is_null() {
        *slot = json!({});
    }
    let Value::Object(object) = slot else { return Err(format!("{what} is {}, and MERGE merges an object", kind(slot))) };
    for (key, v) in value.as_object().into_iter().flatten() {
        object.insert(key.clone(), v.clone());
    }
    Ok(())
}

fn push_into(slot: &mut Value, value: &Value, what: &str) -> Result<(), String> {
    if slot.is_null() {
        *slot = json!([]);
    }
    let Value::Array(list) = slot else { return Err(format!("{what} is {}, and ADD appends to a list", kind(slot))) };
    match value {
        Value::Array(items) => list.extend(items.iter().cloned()),
        one => list.push(one.clone()),
    }
    Ok(())
}

/// SET, ADD or MERGE on one selected node.
fn change(node: &mut Value, op: Op, patch: &Patch, owner: &str) -> Result<(), String> {
    let value = patch.value.as_ref().expect("checked: SET, ADD and MERGE have a value");
    let Some(field) = &patch.field else {
        return match op {
            Op::Set => {
                *node = value.clone();
                Ok(())
            }
            Op::Merge => merge_into(node, value, &format!("a selected node of {owner}")),
            _ => push_into(node, value, &format!("a selected node of {owner}")),
        };
    };
    let kind_of_node = kind(node);
    let Value::Object(object) = node else {
        return Err(format!("a selected node of {owner} is {kind_of_node}, it has no field `{field}`"));
    };
    if let Some(condition) = &patch.condition {
        let label = condition.label.as_deref().unwrap_or("");
        let named = if label.is_empty() { "no label".to_string() } else { format!("the label `{label}`") };
        let hits: Vec<&mut Value> = object
            .get_mut("relationships")
            .and_then(Value::as_array_mut)
            .into_iter()
            .flatten()
            .filter(|r| r.get("destination").and_then(Value::as_str) == Some(condition.destination.as_str()) && label_of(r) == label)
            .collect();
        return match hits.len() {
            0 => Err(format!("{owner} has no relationship to {} with {named}", condition.destination)),
            1 => merge_into(hits.into_iter().next().expect("one hit"), value, &format!("a relationship of {owner}")),
            n => Err(format!("{n} relationships of {owner} go to {} with {named}: `where` finds one (they differ by their tags only)", condition.destination)),
        };
    }
    match op {
        Op::Set => {
            object.insert(field.clone(), value.clone());
            Ok(())
        }
        Op::Merge => merge_into(object.entry(field.clone()).or_insert(Value::Null), value, &format!("`{field}` of {owner}")),
        _ => push_into(object.entry(field.clone()).or_insert(Value::Null), value, &format!("`{field}` of {owner}")),
    }
}

fn reference_json(layer: &str, reference: &str) -> Value {
    json!({ "layer": layer, "reference": reference })
}

fn sorted(set: &std::collections::HashSet<String>) -> Vec<&String> {
    let mut list: Vec<&String> = set.iter().collect();
    list.sort();
    list
}

/// The first reference (by layer, then name) that `a` has and `b` does not.
fn differing<'a>(a: &'a References, b: &'a References) -> Option<(&'static str, &'a String)> {
    let application = a.application.difference(&b.application).map(|r| ("application", r));
    let technology = a.technology.difference(&b.technology).map(|r| ("technology", r));
    application.chain(technology).min()
}

/// Applies one patch. Returns what it says about itself: `matched`, `touched` and, for REMOVE, `removed` and `dropped`.
fn apply_one(doc: &mut Value, patch: &Patch, known: &mut Option<RefCounts>) -> Result<Map<String, Value>, String> {
    let (op, selector) = check(patch)?;
    let found = select(doc, &selector)?;
    let mut touched: BTreeSet<(&'static str, String)> = BTreeSet::new();
    for steps in &found {
        match element_of(doc, steps) {
            Some(owner) => {
                touched.insert(owner);
            }
            None => return Err(format!("selects a node outside the elements of the two layers: {}", path_text(steps))),
        }
    }
    let mut report = Map::new();
    report.insert("matched".into(), json!(found.len()));
    report.insert("touched".into(), Value::Array(touched.iter().map(|(l, r)| reference_json(l, r)).collect()));
    if let (Op::Remove, Some(field)) = (op, &patch.field) {
        // a field taken out of the elements selected: nothing leaves the graph, so no cascade and no `removed` or `dropped`
        for steps in found.iter().rev() {
            let (layer, reference) = element_of(doc, steps).expect("checked: every selected node is in an element");
            let owner = shown(layer, &reference);
            let node = node_at_mut(doc, steps).ok_or_else(|| format!("{owner} changed under the patch"))?;
            let kind_of_node = kind(node);
            let Value::Object(object) = node else {
                return Err(format!("a selected node of {owner} is {kind_of_node}, it has no field `{field}`"));
            };
            object.shift_remove(field);
        }
        return Ok(report);
    }
    if op == Op::Remove {
        if let Some(steps) = found.iter().find(|steps| matches!(steps.last(), Some(Step::Name(name)) if name == "id")) {
            return Err(format!("would remove an `id`: a patch never changes an id or a parent ({})", path_text(steps)));
        }
        let removal = remove_nodes(doc, found, known);
        let mut removed: Vec<Value> = sorted(&removal.gone.application).into_iter().map(|r| reference_json("application", r)).collect();
        removed.extend(sorted(&removal.gone.technology).into_iter().map(|r| reference_json("technology", r)));
        report.insert("removed".into(), Value::Array(removed));
        let dropped = removal.dropped.into_iter().map(|d| json!({ "layer": d.layer, "reference": d.holder, "field": d.field, "entry": d.entry }));
        report.insert("dropped".into(), Value::Array(dropped.collect()));
        return Ok(report);
    }
    // a patch with a `field` sets, appends to or merges into that field of an object, and `check` refuses `id`, `parent` and `elements`: the references of the two layers
    // cannot change, and are not read. Without a `field` the selected nodes themselves are replaced, and may be elements, or lists of them.
    let reads_references = patch.field.is_none();
    let before = reads_references.then(|| References::of(doc));
    for steps in found.iter().rev() {
        let (layer, reference) = element_of(doc, steps).expect("checked: every selected node is in an element");
        let owner = shown(layer, &reference);
        let node = node_at_mut(doc, steps).ok_or_else(|| format!("{owner} changed under the patch"))?;
        change(node, op, patch, &owner)?;
    }
    let Some(before) = before else { return Ok(report) };
    let after = References::of(doc);
    if after != before {
        // what disappeared first (that is the reference the patch changed), else what appeared
        let (layer, reference) = differing(&before, &after).or_else(|| differing(&after, &before)).expect("the references differ");
        return Err(format!("would change the reference {}: a patch never changes an id or a parent", shown(layer, reference)));
    }
    *known = None; // the references were read as sets: the next removal counts them again
    Ok(report)
}

fn run(input: &str) -> Result<Value, Fail> {
    let plain = |message: String| Fail { message, patch: None };
    let request: Request = serde_json::from_str(input).map_err(|e| plain(format!("invalid input: {e}")))?;
    let mut doc = request.workspace;
    if !doc.is_object() {
        return Err(plain(format!("invalid input: `workspace` is {}, not an object", kind(&doc))));
    }
    let plateau = request.plateau.as_deref().filter(|p| !p.is_empty());
    let mut reports = Vec::with_capacity(request.patches.len());
    // the references of the document after the last patch that read them, for the next one (see `remove_nodes`)
    let mut known: Option<RefCounts> = None;
    for (index, raw) in request.patches.iter().enumerate() {
        let who = Who { plateau, rank: index + 1, operator: raw.get("operator").and_then(Value::as_str).map(str::to_string), selector: selector_text(raw) };
        let patch = Patch::deserialize(raw).map_err(|e| who.fail(format!("invalid patch: {e}")))?;
        let body = apply_one(&mut doc, &patch, &mut known).map_err(|problem| who.fail(problem))?;
        let mut report = Map::new();
        report.insert("rank".into(), json!(who.rank));
        report.insert("operator".into(), json!(patch.operator));
        report.insert("selector".into(), json!(who.selector));
        report.extend(body);
        reports.push(Value::Object(report));
    }
    Ok(json!({ "version": CONTRACT_VERSION, "workspace": doc, "patches": reports }))
}

/// The patches of a plateau: `{workspace, plateau?, patches}` → `{version, workspace, patches}`, or `{error, patch?}`.
pub fn apply_patches_json(input: &str) -> String {
    match run(input) {
        Ok(answer) => answer,
        Err(fail) => {
            let mut out = Map::new();
            out.insert("error".into(), json!(fail.message));
            if let Some(patch) = fail.patch {
                out.insert("patch".into(), patch);
            }
            Value::Object(out)
        }
    }
    .to_string()
}
