//! Facets. A facet is a list of actions, each one a JSONPath (RFC 9535) that selects parts of the workspace; the
//! views of a facet are those of the workspace once the selected parts are removed.
//!
//! This is the only place that evaluates a facet: the CLI hands it the JSON of the workspace
//! ([`apply_facet_json`]), the editor hands it the elements of the view ([`apply_to_input`], which builds the same
//! document from them) — so the two cannot read a facet differently.
//!
//! The document a path is evaluated against is the one the CLI writes for a workspace, with the empty values left out:
//!
//! ```text
//! { application: { elements: [ { id, kind, name, description, qualifiers, tags, relationships: [
//!                                 { destination, label, qualifiers, tags } ], elements: [ … ] } ] },
//!   technology:  { elements: [ { … applications: [reference], uses: [reference] … } ] } }
//! ```
//!
//! An action is `{operator: "REMOVE", json_path}`: every node the path selects is deleted (RFC 9535 selects, it does
//! not delete). A path that selects nothing changes nothing; a path that does not parse, or an operator other than
//! REMOVE, is an error naming it — never ignored.
//!
//! The paths of the earlier, Jayway dialect keep working for now: `@.f anyof [...]`, `@.f noneof [...]` and
//! `@.f == null` / `!= null` are rewritten to their standard form, and the rewrite is reported as a warning.
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
enum Step {
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

/// Runs the actions on the document, in order. Returns the warnings (deprecated syntax that was rewritten).
pub(crate) fn apply(doc: &mut Value, actions: &[Action]) -> Result<Vec<String>, String> {
    let mut warnings = Vec::new();
    for action in actions {
        if action.operator != "REMOVE" {
            return Err(format!("unsupported facet action: {} {}", action.operator, action.json_path));
        }
        let (path, rewrites) = translate_legacy(&action.json_path);
        warnings.extend(rewrites);
        let parsed = JsonPath::parse(&path).map_err(|e| format!("invalid facet JSONPath {}: {e}", action.json_path))?;
        let mut found: Vec<Vec<Step>> = parsed
            .query_located(doc)
            .iter()
            .map(|node| node.location().iter().map(Step::from).collect())
            .collect();
        if found.iter().any(Vec::is_empty) {
            return Err(format!("a facet cannot remove the whole workspace: {}", action.json_path));
        }
        found.sort_unstable_by(|a, b| b.cmp(a));
        found.dedup();
        for steps in &found {
            remove_at(doc, steps);
        }
    }
    Ok(warnings)
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

/// The path with the earlier dialect rewritten to the standard one, and one warning per rewrite.
pub(crate) fn translate_legacy(path: &str) -> (String, Vec<String>) {
    let chars: Vec<char> = path.chars().collect();
    let (mut out, mut warnings) = (String::new(), Vec::new());
    let (mut i, mut quote) = (0, None);
    while i < chars.len() {
        let c = chars[i];
        if let Some(q) = quote {
            quote = if c == q { None } else { quote };
        } else if c == '\'' || c == '"' {
            quote = Some(c);
        } else if c == '@' && chars.get(i + 1) == Some(&'.') {
            if let Some((replacement, end)) = legacy_at(&chars, i) {
                let old: String = chars[i..end].iter().collect();
                warnings.push(format!("deprecated facet syntax `{old}`: write `{replacement}`"));
                out.push_str(&replacement);
                i = end;
                continue;
            }
        }
        out.push(c);
        i += 1;
    }
    (out, warnings)
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
            let reference = parent.map_or(id.to_string(), |p| format!("{p}.{id}"));
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
