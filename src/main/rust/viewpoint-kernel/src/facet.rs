//! Facets. A facet is a list of actions, each one a JSONPath (RFC 9535) that selects parts of the workspace; the
//! views of a facet are those of the workspace once the selected parts are removed.
//!
//! This is the only place that evaluates a facet: the CLI hands it the JSON of the workspace
//! ([`apply_facet_json`]), the editor hands it the elements of the view ([`apply_to_input`], which builds the same
//! document from them) — so the two cannot read a facet differently.
//!
//! The document a path is evaluated against is the one the CLI writes for a workspace, with the empty values left out (`change` and
//! `natures` are there when the input of a comparison has them, on an element and, `change`, on a relationship):
//!
//! ```text
//! { application: { elements: [ { id, kind, name, description, qualifiers, tags, change, natures, relationships: [
//!                                 { destination, label, qualifiers, tags, change } ], elements: [ … ] } ] },
//!   technology:  { elements: [ { … applications: [reference], uses: [reference] … } ] } }
//! ```
//!
//! An action is `{operator: "REMOVE", json_path}`: every node the path selects is deleted (RFC 9535 selects, it does
//! not delete). A path that selects nothing changes nothing; a path that does not parse, or an operator other than
//! REMOVE, is an error naming it — never ignored.
//!
//! Removing an element removes what points at it: when an action takes an element out of the document (with the
//! elements inside it), the relationships that point at it or at one of its children, the entries of `uses` that name
//! it and the entries of `applications` of a node that name it are removed too, in the same step, so that the views of
//! the facet do not end in a `dangling reference`. A reference that already led nowhere before the action is not
//! touched: it is still an error.
//!
//! The paths of the earlier, Jayway dialect (`@.f anyof [...]`, `@.f noneof [...]` and `@.f == null` / `!= null`) are no longer
//! read (contract 5, 0.17): the path is refused with one sentence that names the standard form to write ([`refuse_legacy`]).
use super::{null_as_default, Elem, Input, Rel};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use serde_json_path::{JsonPath, PathElement};
use std::collections::{HashMap, HashSet};

#[derive(Deserialize)]
pub(crate) struct Facet {
    #[serde(default, deserialize_with = "null_as_default")]
    pub actions: Vec<Action>,
    /// the views of the technology layer leave out what the facet's links do not go through
    #[serde(default, deserialize_with = "null_as_default")]
    pub hide_unlinked: bool,
}

#[derive(Deserialize)]
pub(crate) struct Action {
    pub operator: String,
    pub json_path: String,
}

/// A step of the normalized path of a node. Ordered, so that deleting from the greatest path down keeps the indexes
/// of the nodes still to delete valid, and a node goes before the one that contains it.
#[derive(PartialEq, Eq, PartialOrd, Ord)]
pub(crate) enum Step {
    Name(String),
    Index(usize),
}

impl From<&PathElement<'_>> for Step {
    fn from(e: &PathElement<'_>) -> Step {
        match e {
            PathElement::Name(n) => Step::Name((*n).to_string()),
            PathElement::Index(i) => Step::Index(*i),
        }
    }
}

fn remove_at(doc: &mut Value, steps: &[Step]) {
    let Some((last, parents)) = steps.split_last() else { return };
    let mut node = doc;
    for step in parents {
        node = match (step, node) {
            (Step::Name(n), Value::Object(m)) => match m.get_mut(n) {
                Some(v) => v,
                None => return,
            },
            (Step::Index(i), Value::Array(a)) => match a.get_mut(*i) {
                Some(v) => v,
                None => return,
            },
            _ => return,
        };
    }
    match (last, node) {
        (Step::Name(n), Value::Object(m)) => {
            m.remove(n);
        }
        (Step::Index(i), Value::Array(a)) if *i < a.len() => {
            a.remove(*i);
        }
        _ => {}
    }
}

/// Runs the actions on the document, in order. Returns the warnings (none today: the Jayway dialect is an error, not a warning).
pub(crate) fn apply(doc: &mut Value, actions: &[Action]) -> Result<Vec<String>, String> {
    let warnings = Vec::new();
    let mut known: Option<RefCounts> = None;
    for action in actions {
        if action.operator != "REMOVE" {
            return Err(format!("unsupported facet action: {} {}", action.operator, action.json_path));
        }
        refuse_legacy(&action.json_path)?;
        let parsed = JsonPath::parse(&action.json_path).map_err(|e| format!("invalid facet JSONPath {}: {e}", action.json_path))?;
        let found: Vec<Vec<Step>> = parsed
            .query_located(doc)
            .iter()
            .map(|node| node.location().iter().map(Step::from).collect())
            .collect();
        if found.iter().any(Vec::is_empty) {
            return Err(format!("a facet cannot remove the whole workspace: {}", action.json_path));
        }
        remove_nodes(doc, found, &mut known);
    }
    Ok(warnings)
}

/// What a removal took out of the elements that stay.
pub(crate) struct Dropped {
    pub layer: &'static str,
    /// the reference of the element that held the entry
    pub holder: String,
    /// `relationships`, `uses` or `applications`
    pub field: &'static str,
    /// the entry as it was: the relationship, or the reference
    pub entry: Value,
}

/// What `remove_nodes` did besides deleting the nodes.
#[derive(Default)]
pub(crate) struct Removal {
    /// the references of the elements that left the document, with the elements inside them (both layers)
    pub gone: References,
    pub dropped: Vec<Dropped>,
}

/// Deletes the nodes at these paths (from the greatest path down, so that the indexes still to delete stay valid and a node goes before
/// the one that contains it), and, when an element left, takes out in the same step what points at it. This is the one place that
/// decides what a removal takes: a facet and a `REMOVE` patch both come here.
///
/// `known` is how many times each reference is held by the document when the caller already has it (what the previous removal left, if nothing has changed an id since):
/// it is read from the document otherwise, and left in `known` for the next removal, so that a run of removals reads the whole document once, not twice for each. When the
/// removed nodes are elements (the usual patch) the references that leave are those of the subtrees, worked out from them and not by reading the document again. The caller
/// that changes the references of the document by another way must empty it.
pub(crate) fn remove_nodes(doc: &mut Value, mut found: Vec<Vec<Step>>, known: &mut Option<RefCounts>) -> Removal {
    found.sort_unstable_by(|a, b| b.cmp(a));
    found.dedup();
    let mut removal = Removal::default();
    // the references of the elements are only worth reading when the action may remove an element: not for the common facet, which removes relationships
    if !found.iter().any(|steps| may_remove_element(steps)) {
        *known = None; // a node that is no element was removed (a field of one may be its `id`): what was read is no longer the document
        for steps in &found {
            remove_at(doc, steps);
        }
        return removal;
    }
    let mut counts = known.take().unwrap_or_else(|| RefCounts::of(doc));
    let mut gone = References::default();
    if let Some(leaving) = subtrees_of(doc, &found) {
        // every removed node is an element, none inside another: what leaves is what the subtrees hold, once each
        for (layer, reference) in leaving {
            counts.release(layer, &reference, &mut gone);
        }
        for steps in &found {
            remove_at(doc, steps);
        }
    } else {
        for steps in &found {
            remove_at(doc, steps);
        }
        let after = RefCounts::of(doc);
        gone = counts.without(&after);
        counts = after;
    }
    *known = Some(counts);
    if !gone.is_empty() {
        removal.dropped = drop_references_to(doc, &gone);
        removal.gone = gone;
    }
    removal
}

/// How many times each reference of the elements of the two layers is held by a document (more than once when two elements declare it).
#[derive(Default)]
pub(crate) struct RefCounts {
    application: HashMap<String, u32>,
    technology: HashMap<String, u32>,
}

impl RefCounts {
    pub fn of(doc: &Value) -> RefCounts {
        let mut out = RefCounts::default();
        for (name, counts) in [("application", &mut out.application), ("technology", &mut out.technology)] {
            walk_references(doc.get(name).and_then(|l| l.get("elements")), None, &mut |reference| {
                *counts.entry(reference.to_string()).or_default() += 1;
            });
        }
        out
    }

    /// One holder less of the reference; when it was the last, the reference is gone, and is added to `gone`.
    fn release(&mut self, layer: &'static str, reference: &str, gone: &mut References) {
        let (counts, left) = if layer == "application" { (&mut self.application, &mut gone.application) } else { (&mut self.technology, &mut gone.technology) };
        if let Some(n) = counts.get_mut(reference) {
            *n -= 1;
            if *n == 0 {
                counts.remove(reference);
                left.insert(reference.to_string());
            }
        }
    }

    /// The references that `self` has and `after` does not have any more.
    fn without(&self, after: &RefCounts) -> References {
        References {
            application: self.application.keys().filter(|r| !after.application.contains_key(*r)).cloned().collect(),
            technology: self.technology.keys().filter(|r| !after.technology.contains_key(*r)).cloned().collect(),
        }
    }
}

/// The references (layer, reference) held by the subtrees at these paths, one for each element, when every path is an element of a layer (`layer.elements[i]`, and
/// `elements[j]` again inside it), each with an `id` and with parents that have one, and no path is inside another. None otherwise: the document has to be read.
/// `found` is sorted: a path that is inside another is next to it.
fn subtrees_of(doc: &Value, found: &[Vec<Step>]) -> Option<Vec<(&'static str, String)>> {
    if found.windows(2).any(|pair| pair[0].starts_with(&pair[1])) {
        return None;
    }
    let mut out = Vec::new();
    for steps in found {
        let [Step::Name(layer), Step::Name(elements), Step::Index(first), rest @ ..] = steps.as_slice() else { return None };
        let mut tail: &[Step] = rest;
        let layer: &'static str = match layer.as_str() {
            "application" => "application",
            "technology" => "technology",
            _ => return None,
        };
        if elements != "elements" {
            return None;
        }
        let mut node = doc.get(layer)?.get("elements")?.as_array()?.get(*first)?;
        let mut reference = node.get("id")?.as_str()?.to_string();
        while let [Step::Name(elements), Step::Index(i), rest @ ..] = tail {
            if elements != "elements" {
                return None;
            }
            node = node.get("elements")?.as_array()?.get(*i)?;
            reference = join_reference(Some(&reference), node.get("id")?.as_str()?);
            tail = rest;
        }
        if !tail.is_empty() {
            return None;
        }
        out.push((layer, reference.clone()));
        walk_references(node.get("elements"), Some(&reference), &mut |inner| out.push((layer, inner.to_string())));
    }
    Some(out)
}

// ---- what points at an element that a facet removes ----

/// Whether removing the node at `steps` can remove an element: it is a layer, the `elements` of a layer or of an element, or an element (an
/// element is `application.elements[i]`, and `elements[j]` again inside it). A field of an element (`relationships`, `tags`, ...) is not.
fn may_remove_element(steps: &[Step]) -> bool {
    fn in_elements(rest: &[Step]) -> bool {
        match rest {
            [] | [Step::Index(_)] => true,
            [Step::Index(_), Step::Name(name), tail @ ..] if name == "elements" => in_elements(tail),
            _ => false,
        }
    }
    match steps {
        [Step::Name(layer), rest @ ..] if layer == "application" || layer == "technology" => match rest {
            [] => true,
            [Step::Name(name), tail @ ..] if name == "elements" => in_elements(tail),
            _ => false,
        },
        _ => false,
    }
}

/// The reference of the element `id` inside `parent` (none: at the top of its layer).
fn join_reference(parent: Option<&str>, id: &str) -> String {
    match parent {
        Some(p) => {
            let mut reference = String::with_capacity(p.len() + 1 + id.len());
            reference.push_str(p);
            reference.push('.');
            reference.push_str(id);
            reference
        }
        None => id.to_string(),
    }
}

/// Calls `visit` with the reference of each element of a list of elements and of the lists inside them (an element with no `id` that is a text is skipped, with what is
/// inside it). `parent` is the reference of the element that holds the list, none at the top of a layer.
fn walk_references(nodes: Option<&Value>, parent: Option<&str>, visit: &mut dyn FnMut(&str)) {
    for node in nodes.and_then(Value::as_array).into_iter().flatten() {
        let Some(object) = node.as_object() else { continue };
        // one pass over the few keys of the element: cheaper than hashing the two names
        let (mut id, mut inner) = (None, None);
        for (key, value) in object {
            match key.as_str() {
                "id" => id = Some(value),
                "elements" => inner = Some(value),
                _ => {}
            }
        }
        let Some(id) = id.and_then(Value::as_str) else { continue };
        let reference = join_reference(parent, id);
        walk_references(inner, Some(&reference), visit);
        visit(&reference);
    }
}

/// The references of the elements of the two layers of a document.
#[derive(Default, PartialEq, Eq)]
pub(crate) struct References {
    pub application: HashSet<String>,
    pub technology: HashSet<String>,
}

impl References {
    pub fn of(doc: &Value) -> References {
        let layer = |name: &str| {
            let mut out = HashSet::new();
            walk_references(doc.get(name).and_then(|l| l.get("elements")), None, &mut |reference| {
                out.insert(reference.to_string());
            });
            out
        };
        References { application: layer("application"), technology: layer("technology") }
    }

    pub fn is_empty(&self) -> bool {
        self.application.is_empty() && self.technology.is_empty()
    }
}

/// Takes out of the elements of the document what leads to one of the references `gone`: a relationship whose
/// destination is one (a destination is a reference of the layer of the element that declares it), an entry of `uses`
/// (a reference of the technology layer) and an entry of `applications` (a reference of the application layer).
/// Returns what it took out, in the order of the document.
fn drop_references_to(doc: &mut Value, gone: &References) -> Vec<Dropped> {
    /// `path` is the reference of the element that holds `nodes` (`nested` false at the top of a layer): a reference is copied out of it only for what is taken out.
    fn walk(layer: &'static str, nodes: Option<&mut Value>, nested: bool, path: &mut String, same_layer: &HashSet<String>, gone: &References, out: &mut Vec<Dropped>) {
        for node in nodes.and_then(Value::as_array_mut).into_iter().flatten() {
            let Some(object) = node.as_object_mut() else { continue };
            // one pass over the few keys of the element: cheaper than hashing the five names
            let (mut id, mut relationships, mut uses, mut applications, mut inner) = ("", None, None, None, None);
            for (key, value) in object.iter_mut() {
                match key.as_str() {
                    "id" => id = value.as_str().unwrap_or_default(),
                    "relationships" => relationships = Some(value),
                    "uses" => uses = Some(value),
                    "applications" => applications = Some(value),
                    "elements" => inner = Some(value),
                    _ => {}
                }
            }
            let before = path.len();
            if nested {
                path.push('.');
            }
            path.push_str(id);
            let mut take = |field: &'static str, list: Option<&mut Value>, keep: &dyn Fn(&Value) -> bool| {
                if let Some(Value::Array(list)) = list {
                    if list.iter().all(|entry| keep(entry)) {
                        return;
                    }
                    let (kept, taken): (Vec<Value>, Vec<Value>) = std::mem::take(list).into_iter().partition(|entry| keep(entry));
                    *list = kept;
                    out.extend(taken.into_iter().map(|entry| Dropped { layer, holder: path.clone(), field, entry }));
                }
            };
            take("relationships", relationships, &|r| !r.get("destination").and_then(Value::as_str).is_some_and(|d| same_layer.contains(d)));
            take("uses", uses, &|u| !u.as_str().is_some_and(|u| gone.technology.contains(u)));
            take("applications", applications, &|a| !a.as_str().is_some_and(|a| gone.application.contains(a)));
            walk(layer, inner, true, path, same_layer, gone, out);
            path.truncate(before);
        }
    }
    let mut out = Vec::new();
    for (name, same_layer) in [("application", &gone.application), ("technology", &gone.technology)] {
        if let Some(elements) = doc.get_mut(name).and_then(|l| l.get_mut("elements")) {
            walk(name, Some(elements), false, &mut String::new(), same_layer, gone, &mut out);
        }
    }
    out
}

// ---- the earlier dialect (Jayway) ----

fn is_ident(c: char) -> bool {
    c.is_alphanumeric() || c == '_' || c == '-'
}

/// The text split at the commas that are outside the quotes.
fn split_outside_quotes(list: &str) -> Vec<&str> {
    let (mut parts, mut start, mut quote) = (Vec::new(), 0, None);
    for (i, c) in list.char_indices() {
        match quote {
            Some(q) if c == q => quote = None,
            Some(_) => {}
            None if c == '\'' || c == '"' => quote = Some(c),
            None if c == ',' => {
                parts.push(&list[start..i]);
                start = i + 1;
            }
            None => {}
        }
    }
    parts.push(&list[start..]);
    parts
}

/// Where the list that starts with `[` ends: the first `]` that is outside the quotes.
fn closing_bracket(list: &str) -> Option<usize> {
    let mut quote = None;
    for (i, c) in list.char_indices().skip(1) {
        match quote {
            Some(q) if c == q => quote = None,
            Some(_) => {}
            None if c == '\'' || c == '"' => quote = Some(c),
            None if c == ']' => return Some(i),
            None => {}
        }
    }
    None
}

/// `'a', "b"` → the literals as written, or None when an item is not one quoted literal.
fn literals(list: &str) -> Option<Vec<String>> {
    if list.trim().is_empty() {
        return Some(Vec::new());
    }
    split_outside_quotes(list)
        .into_iter()
        .map(|item| {
            let item = item.trim();
            let b = item.as_bytes();
            let quoted = b.len() >= 2 && (b[0] == b'\'' || b[0] == b'"') && b[b.len() - 1] == b[0];
            (quoted && !item[1..item.len() - 1].contains(b[0] as char)).then(|| item.to_string())
        })
        .collect()
}

/// The earlier dialect at `chars[at..]` (which starts with `@.`): the standard form, and where the old one ends.
fn legacy_at(chars: &[char], at: usize) -> Option<(String, usize)> {
    let mut i = at + 2;
    let start = i;
    while i < chars.len() && is_ident(chars[i]) {
        i += 1;
    }
    if i == start {
        return None;
    }
    let field: String = chars[start..i].iter().collect();
    while i < chars.len() && chars[i].is_whitespace() {
        i += 1;
    }
    let rest: String = chars[i..].iter().collect();
    for (word, none) in [("anyof", false), ("noneof", true)] {
        if let Some(after) = rest.strip_prefix(word).map(str::trim_start).filter(|a| a.starts_with('[')) {
            let close = closing_bracket(after)?;
            let items = literals(&after[1..close])?;
            let test = items.iter().map(|l| format!("@ == {l}")).collect::<Vec<_>>().join(" || ");
            let used = rest.len() - after.len() + close + 1;
            let replacement = match (none, items.is_empty()) {
                (false, false) => format!("@.{field}[?({test})]"),
                (false, true) => format!("(@.{field} && !@.{field})"),
                (true, false) => format!("(@.{field} && !@.{field}[?({test})])"),
                (true, true) => format!("@.{field}"),
            };
            return Some((replacement, i + rest[..used].chars().count()));
        }
    }
    for (op, present) in [("==", false), ("!=", true)] {
        if let Some(after) = rest.strip_prefix(op).map(str::trim_start).and_then(|a| a.strip_prefix("null")) {
            if !after.starts_with(is_ident) {
                let used = rest.chars().count() - after.chars().count();
                let replacement = if present { format!("@.{field}") } else { format!("!@.{field}") };
                return Some((replacement, i + used));
            }
        }
    }
    None
}

/// The first use of the earlier dialect in the path, as `(as written, standard form)`, or None.
pub(crate) fn find_legacy(path: &str) -> Option<(String, String)> {
    let chars: Vec<char> = path.chars().collect();
    let (mut i, mut quote) = (0, None);
    while i < chars.len() {
        let c = chars[i];
        if let Some(q) = quote {
            quote = if c == q { None } else { quote };
        } else if c == '\'' || c == '"' {
            quote = Some(c);
        } else if c == '@' && chars.get(i + 1) == Some(&'.') {
            if let Some((replacement, end)) = legacy_at(&chars, i) {
                return Some((chars[i..end].iter().collect(), replacement));
            }
        }
        i += 1;
    }
    None
}

/// The Jayway dialect is not read any more: one sentence that says the standard form to write (the first use in the path).
pub(crate) fn refuse_legacy(path: &str) -> Result<(), String> {
    match find_legacy(path) {
        Some((old, replacement)) => Err(format!(
            "the facet path `{path}` uses `{old}`, which is not JSONPath (RFC 9535) and is no longer read: write `{replacement}`"
        )),
        None => Ok(()),
    }
}

// ---- the document of a set of elements ----

fn is_empty_value(v: &Value) -> bool {
    match v {
        Value::Null => true,
        Value::String(s) => s.is_empty(),
        Value::Array(a) => a.is_empty(),
        Value::Object(o) => o.is_empty(),
        _ => false,
    }
}

fn rel_to_value(rel: &Rel) -> Value {
    let mut out = Map::new();
    out.insert("destination".into(), json!(rel.destination));
    if let Some(label) = rel.label.as_ref().filter(|l| !l.is_empty()) {
        out.insert("label".into(), json!(label));
    }
    if !rel.qualifiers.is_empty() {
        out.insert("qualifiers".into(), json!(rel.qualifiers));
    }
    if !rel.tags.is_empty() {
        out.insert("tags".into(), json!(rel.tags));
    }
    // what `compare` says of the relationship: a path reads it as it reads the label
    if let Some(change) = &rel.change {
        out.insert("change".into(), json!(change));
    }
    Value::Object(out)
}

/// The reference of the parent of an element, if that parent is one of the elements.
fn parent_of<'a>(reference: &'a str, known: &HashSet<&str>) -> Option<&'a str> {
    reference.rfind('.').map(|i| &reference[..i]).filter(|p| known.contains(p))
}

/// `{ elements: [...] }`: the elements nested by reference. An element whose parent is not among them is a root,
/// and its id is its whole reference.
fn to_document(elements: &[Elem]) -> Value {
    let known: HashSet<&str> = elements.iter().map(|e| e.reference.as_str()).collect();
    let mut children: HashMap<Option<&str>, Vec<&Elem>> = HashMap::new();
    for e in elements {
        children.entry(parent_of(&e.reference, &known)).or_default().push(e);
    }
    fn nodes(of: Option<&str>, children: &HashMap<Option<&str>, Vec<&Elem>>) -> Vec<Value> {
        children
            .get(&of)
            .map(|list| {
                list.iter()
                    .map(|e| {
                        let id = of.map_or(e.reference.as_str(), |p| &e.reference[p.len() + 1..]);
                        let mut node = Map::new();
                        node.insert("id".into(), json!(id));
                        for (k, v) in &e.other {
                            if !is_empty_value(v) {
                                node.insert(k.clone(), v.clone());
                            }
                        }
                        if !e.applications.is_empty() {
                            node.insert("applications".into(), json!(e.applications));
                        }
                        if !e.uses.is_empty() {
                            node.insert("uses".into(), json!(e.uses));
                        }
                        if !e.relationships.is_empty() {
                            node.insert("relationships".into(), Value::Array(e.relationships.iter().map(rel_to_value).collect()));
                        }
                        let kids = nodes(Some(&e.reference), children);
                        if !kids.is_empty() {
                            node.insert("elements".into(), Value::Array(kids));
                        }
                        Value::Object(node)
                    })
                    .collect()
            })
            .unwrap_or_default()
    }
    let roots = nodes(None, &children);
    if roots.is_empty() { json!({}) } else { json!({ "elements": roots }) }
}

/// What is left of a document in the elements: the ones still in it, with the relationships they still have and the
/// environments they still use.
fn read_document(doc: &Value, elements: &mut Vec<Elem>) -> Result<(), String> {
    type Left = (Vec<Rel>, Vec<String>);
    fn walk(nodes: Option<&Value>, parent: Option<&str>, left: &mut HashMap<String, Left>) -> Result<(), String> {
        for node in nodes.and_then(Value::as_array).into_iter().flatten() {
            let id = node.get("id").and_then(Value::as_str).ok_or("a facet left an element without an id")?;
            let reference = join_reference(parent, id);
            let relationships = match node.get("relationships") {
                Some(Value::Array(list)) => list
                    .iter()
                    .map(|r| serde_json::from_value::<Rel>(r.clone()).map_err(|e| format!("a facet left an unreadable relationship of {reference}: {e}")))
                    .collect::<Result<Vec<Rel>, String>>()?,
                _ => Vec::new(),
            };
            let uses = match node.get("uses") {
                Some(Value::Array(list)) => list
                    .iter()
                    .map(|u| u.as_str().map(str::to_string).ok_or_else(|| format!("a facet left an unreadable `uses` in {reference}")))
                    .collect::<Result<Vec<String>, String>>()?,
                _ => Vec::new(),
            };
            walk(node.get("elements"), Some(&reference), left)?;
            left.insert(reference, (relationships, uses));
        }
        Ok(())
    }
    let mut left = HashMap::new();
    walk(doc.get("elements"), None, &mut left)?;
    elements.retain(|e| left.contains_key(&e.reference));
    for e in elements.iter_mut() {
        (e.relationships, e.uses) = left.remove(&e.reference).unwrap_or_default();
    }
    Ok(())
}

/// The editor's way in: the facet is applied to the elements of the view (the layer being viewed, and the application
/// layer that a technology view also reads). Returns the warnings.
pub(crate) fn apply_to_input(input: &mut Input, facet: &Facet) -> Result<Vec<String>, String> {
    let technology_view = input.layer == "technology";
    let mut doc = if technology_view {
        json!({ "application": to_document(&input.app_elements), "technology": to_document(&input.elements) })
    } else {
        json!({ "application": to_document(&input.elements), "technology": {} })
    };
    let warnings = apply(&mut doc, &facet.actions)?;
    if technology_view {
        read_document(&doc["application"], &mut input.app_elements)?;
        read_document(&doc["technology"], &mut input.elements)?;
    } else {
        read_document(&doc["application"], &mut input.elements)?;
    }
    Ok(warnings)
}

#[derive(Deserialize)]
struct Request {
    workspace: Value,
    #[serde(default, deserialize_with = "null_as_default")]
    actions: Vec<Action>,
}

/// The CLI's way in: `{workspace, actions}` → `{version, workspace, warnings}`, the workspace being its JSON.
pub fn apply_facet_json(input: &str) -> String {
    let result = serde_json::from_str::<Request>(input)
        .map_err(|e| format!("invalid input: {e}"))
        .and_then(|mut request| {
            let warnings = apply(&mut request.workspace, &request.actions)?;
            Ok(json!({ "version": super::CONTRACT_VERSION, "workspace": request.workspace, "warnings": warnings }))
        });
    result.unwrap_or_else(|e| json!({ "error": e })).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn name(n: &str) -> Step {
        Step::Name(n.to_string())
    }

    #[test]
    fn only_the_paths_that_can_remove_an_element_are_worth_a_snapshot_of_the_references() {
        // a layer, its elements, an element, the elements of an element, an element inside an element: they remove elements
        for steps in [
            vec![name("application")],
            vec![name("technology"), name("elements")],
            vec![name("application"), name("elements"), Step::Index(2)],
            vec![name("application"), name("elements"), Step::Index(0), name("elements")],
            vec![name("technology"), name("elements"), Step::Index(1), name("elements"), Step::Index(3)],
        ] {
            assert!(may_remove_element(&steps));
        }
        // a field of an element (a relationship, a tag, a nested field of a nested element) and anything out of the layers do not
        for steps in [
            vec![name("application"), name("elements"), Step::Index(0), name("relationships"), Step::Index(1)],
            vec![name("application"), name("elements"), Step::Index(0), name("tags"), name("zone")],
            vec![name("technology"), name("elements"), Step::Index(1), name("elements"), Step::Index(0), name("uses")],
            vec![name("application"), name("settings")],
            vec![name("header")],
            vec![],
        ] {
            assert!(!may_remove_element(&steps));
        }
    }
}
