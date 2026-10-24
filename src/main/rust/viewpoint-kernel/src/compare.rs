//! `compare`: what changes between two plateaus of an architecture, as one pure function.
//!
//! Two plateaus go in, each as the flat lists of elements the viewpoints already take (one list per layer); out comes
//! a *union model* (every element and relationship of the target, plus those of the base that the target no longer
//! has, each one saying what happened to it), a *table* of the changes and the *counts* of them. The CLI and the editor
//! both call it, so that they list the same new, changed and removed things.
//!
//! ```text
//! input : { base:   { application: [Element], technology: [Element] },
//!           target: { application: [Element], technology: [Element] },
//!           on_one_chain: bool,      (contract 5: one of the two plateaus is the past of the other; required, see rule 7)
//!           chain: [ { application: [{reference, replaces?}], technology: [..] } ] }   (optional: the plateaus the target stands on, see rule 8)
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
//!    in the union (those of the side that is shown) and are never compared. The union says the state of a box itself (issue #96):
//!    `contains_changes` on an element that did not change and has a new, changed, removed, moved, split or merged one below it in the
//!    reference tree, and `contains_more_than_wording` when the same is true leaving out the changes that are `wording_only`.
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
//!    listed with its reasons; the author decides, by writing `replaces`. The same parent is a reason only when the two
//!    plateaus are on one chain (`on_one_chain`, contract 5: one is the past of the other): between two siblings, two
//!    alternatives of one plateau, the only two of a kind under a parent are not one thing said twice, so the reason is not
//!    given and a pair that has no other is not listed (wave 014, issue #70). The name and the description are reasons
//!    between siblings as anywhere. `on_one_chain` is required, `null` is not given: a caller that does not say is refused,
//!    because the kernel cannot read the tree of plateaus and neither answer is right for every caller.
//! 8. **A target several layers above the base composes the `replaces` of the layers in between** (wave 017, issue #89; optional `chain`, an
//!    additive key of contract 5). Each layer writes `replaces` relative to the plateau it overrides, so a move made in two steps
//!    (`z` replaces `y`, which replaced `x`) is, between the plateaus two steps apart, a move from `x`: `z` replaces `x`. The host gives
//!    the plateaus the target stands on (`chain`, oldest first, the last one being the plateau it overrides; the first is the base, or
//!    the plateau the target and the base have in common when they are siblings) and the kernel rewrites the `replaces` of the target
//!    before it reads them (rule 6): an entry that names an element of the plateau just above that the target no longer has is read
//!    through the step that made that element, and so on down to the first plateau of the chain. An element created in a layer in between and
//!    moved by the next one replaces nothing of the first plateau (it is `new`); one that a layer in between removed ends its own
//!    chain; a move then a split, or a merge, is a split or a merge. An entry that is no entry of the last step (it names nothing of the
//!    plateau above) is left as written, so rule 6 ignores it with its warning, as without `chain`. An element whose `replaces` the host
//!    does not give (the base says the same) is not rewritten. Fewer than two plateaus in `chain`: nothing to compose, the target is
//!    read as it is.
use super::{null_as_default, Elem, Rel, CONTRACT_VERSION};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

const LAYERS: [&str; 2] = ["application", "technology"];
const RENDERING_PREFIX: &str = "rendering-";
/// What `OutElement` writes itself: an extra field of that name never reaches the union.
const RESERVED: [&str; 19] = [
    "layer",
    "reference",
    "parent",
    "parent_reference",
    "kind",
    "name",
    "description",
    "qualifiers",
    "tags",
    "applications",
    "uses",
    "relationships",
    "change",
    "natures",
    "wording_only",
    "replaces",
    "replaced_by",
    "contains_changes",
    "contains_more_than_wording",
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
    /// Contract 5: whether one of the two plateaus is the past of the other (an ancestor in the tree of plateaus). The host knows it from the
    /// tree and the kernel cannot: it is asked, and a caller that does not say is refused (`ON_ONE_CHAIN_MISSING`).
    #[serde(default)]
    on_one_chain: Option<bool>,
    /// Additive to contract 5 (wave 017, issue #89): the plateaus the target is built on, oldest first, the last one being the plateau the target overrides
    /// (the target itself is `target`). Optional, and read only when it holds two plateaus or more: then the `replaces` of the target, which each layer writes
    /// relative to the plateau it overrides, are composed back to the first of them (rule 8).
    #[serde(default, deserialize_with = "null_as_default")]
    chain: Vec<ChainSide>,
}

/// One plateau of `chain`: only what composing the `replaces` reads of its elements (anything else the caller sends is ignored).
#[derive(Deserialize)]
struct ChainSide {
    #[serde(default, deserialize_with = "null_as_default")]
    application: Vec<ChainElem>,
    #[serde(default, deserialize_with = "null_as_default")]
    technology: Vec<ChainElem>,
}

#[derive(Deserialize)]
struct ChainElem {
    reference: String,
    /// as the layer that declared the element wrote it (an inherited element keeps it)
    #[serde(default)]
    replaces: Option<Value>,
}

/// The answer to an input without `on_one_chain` (or with `null`). Contract 5 asks for it; no default is taken, since the right one depends on the
/// plateaus and not on the kernel: `true` would offer the pairs of two alternatives (issue #70), `false` would hide the pairs of a chain.
const ON_ONE_CHAIN_MISSING: &str = "invalid input: `on_one_chain` is missing: say whether one of the two plateaus is the past of the other (an ancestor in the tree of plateaus), `true`, or whether they are siblings, `false` (contract 5)";

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
    list.iter()
        .cloned()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn tags_of(value: Option<&Value>) -> BTreeMap<String, String> {
    match value {
        Some(Value::Object(m)) => m
            .iter()
            .map(|(k, v)| {
                (
                    k.clone(),
                    if let Value::String(s) = v {
                        s.clone()
                    } else {
                        v.to_string()
                    },
                )
            })
            .collect(),
        _ => BTreeMap::new(),
    }
}

fn props_of(e: &Elem) -> Props {
    let qualifiers = match e.other.get("qualifiers") {
        Some(Value::Array(a)) => unique(a.iter().map(|q| {
            if let Value::String(s) = q {
                s.clone()
            } else {
                q.to_string()
            }
        })),
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
    s.as_deref()
        .unwrap_or("")
        .replace("\r\n", "\n")
        .trim()
        .to_string()
}

/// The tags that count: the ones that say something about the thing, not about how it is drawn.
fn compared_tags(tags: &BTreeMap<String, String>) -> BTreeMap<String, String> {
    tags.iter()
        .filter(|(k, _)| !k.starts_with(RENDERING_PREFIX))
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect()
}

fn text_value(s: &Option<String>) -> Value {
    s.as_ref().map_or(Value::Null, |s| Value::String(s.clone()))
}

fn strings_value(list: &[String]) -> Value {
    Value::Array(list.iter().cloned().map(Value::String).collect())
}

fn tags_value(tags: &BTreeMap<String, String>) -> Value {
    Value::Object(
        tags.iter()
            .map(|(k, v)| (k.clone(), Value::String(v.clone())))
            .collect(),
    )
}

/// The natures that come from the properties of an element, and what was before and after for each one.
fn compare_props(
    b: &Props,
    t: &Props,
) -> (Vec<&'static str>, Map<String, Value>, Map<String, Value>) {
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
        note(
            Some("kind"),
            "kind",
            text_value(&b.kind),
            text_value(&t.kind),
        );
    }
    if norm_text(&b.name) != norm_text(&t.name) {
        note(
            Some("name"),
            "name",
            text_value(&b.name),
            text_value(&t.name),
        );
    }
    if norm_text(&b.description) != norm_text(&t.description) {
        note(
            Some("description"),
            "description",
            text_value(&b.description),
            text_value(&t.description),
        );
    }
    if sorted_unique(&b.qualifiers) != sorted_unique(&t.qualifiers) {
        note(
            Some("qualifiers"),
            "qualifiers",
            strings_value(&sorted_unique(&b.qualifiers)),
            strings_value(&sorted_unique(&t.qualifiers)),
        );
    }
    if compared_tags(&b.tags) != compared_tags(&t.tags) {
        note(
            Some("tags"),
            "tags",
            tags_value(&compared_tags(&b.tags)),
            tags_value(&compared_tags(&t.tags)),
        );
    }
    if b.applications != t.applications {
        note(
            Some("deployment"),
            "applications",
            strings_value(&b.applications),
            strings_value(&t.applications),
        );
    }
    if b.uses != t.uses {
        note(
            Some("deployment"),
            "uses",
            strings_value(&b.uses),
            strings_value(&t.uses),
        );
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
        sorted_unique(
            &list
                .iter()
                .filter_map(|r| self.get(layer, r))
                .collect::<Vec<_>>(),
        )
    }
}

struct Resolved {
    identities: BTreeMap<(&'static str, String), Identity>,
    rewrite: Rewrite,
    warnings: Vec<String>,
}

// ---- composing the `replaces` of the layers between the base and the target (rule 8) ----

/// What a plateau of the chain says of one layer: the references it holds and, for each, the `replaces` its layer wrote.
struct Step<'a> {
    holds: HashSet<&'a str>,
    written: HashMap<&'a str, &'a Value>,
}

impl<'a> Step<'a> {
    fn of_chain(elements: &'a [ChainElem]) -> Step<'a> {
        let mut step = Step {
            holds: HashSet::new(),
            written: HashMap::new(),
        };
        for e in elements {
            step.holds.insert(e.reference.as_str());
            if let Some(v) = e.replaces.as_ref().filter(|v| says_something(v)) {
                step.written.insert(e.reference.as_str(), v);
            }
        }
        step
    }

    fn of_target(elements: &'a [Elem]) -> Step<'a> {
        let mut step = Step {
            holds: HashSet::new(),
            written: HashMap::new(),
        };
        for e in elements {
            step.holds.insert(e.reference.as_str());
            if let Some(v) = e.other.get("replaces").filter(|v| says_something(v)) {
                step.written.insert(e.reference.as_str(), v);
            }
        }
        step
    }
}

/// No value, `null` and an empty list say nothing.
fn says_something(v: &Value) -> bool {
    !(v.is_null() || v.as_array().is_some_and(|a| a.is_empty()))
}

/// The references a `replaces` value lists, as rule 6 reads them: the strings, trimmed, blank ones left out, each once. Anything that is not a list lists none.
fn listed(v: &Value) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for entry in v.as_array().into_iter().flatten() {
        if let Some(r) = entry.as_str().map(str::trim).filter(|s| !s.is_empty()) {
            if !out.iter().any(|o| o == r) {
                out.push(r.to_string());
            }
        }
    }
    out
}

/// The layers of one side, one `Step` for each plateau of the chain and one more for the target (the last).
struct Composer<'a> {
    steps: Vec<Step<'a>>,
    memo: HashMap<(usize, String), BTreeSet<String>>,
}

impl<'a> Composer<'a> {
    /// The entries the layer `j` (1 is the plateau just above the first of the chain) wrote on `x`, an element it holds, that are its own and
    /// count: `x` is new in that layer or says another thing than the plateau above, and the entry names an element of that plateau that the
    /// layer no longer has. What an inherited element says again is the word of the layer that wrote it.
    fn entries(&self, j: usize, x: &str) -> Vec<String> {
        let (above, here) = (&self.steps[j - 1], &self.steps[j]);
        let Some(written) = here.written.get(x) else {
            return Vec::new();
        };
        if above.holds.contains(x) && above.written.get(x) == Some(written) {
            return Vec::new();
        }
        listed(written)
            .into_iter()
            .filter(|r| above.holds.contains(r.as_str()) && !here.holds.contains(r.as_str()))
            .collect()
    }

    /// The elements of the first plateau of the chain that `x`, an element of plateau `j`, stands for: itself when the plateau above holds it,
    /// and what it replaced, read through the layers down to the first plateau.
    fn stands_for(&mut self, j: usize, x: &str) -> BTreeSet<String> {
        if j == 0 {
            return BTreeSet::from([x.to_string()]);
        }
        let key = (j, x.to_string());
        if let Some(known) = self.memo.get(&key) {
            return known.clone();
        }
        let mut out = BTreeSet::new();
        if self.steps[j - 1].holds.contains(x) {
            out.extend(self.stands_for(j - 1, x));
        }
        for r in self.entries(j, x) {
            out.extend(self.stands_for(j - 1, &r));
        }
        self.memo.insert(key, out.clone());
        out
    }
}

/// Rule 8: the `replaces` of the target, composed back to the first plateau of `chain`.
fn compose(chain: &[ChainSide], target: &mut Side) {
    if chain.len() < 2 {
        return;
    }
    for layer in LAYERS {
        let mut steps: Vec<Step> = chain
            .iter()
            .map(|c| {
                Step::of_chain(if layer == "application" {
                    &c.application
                } else {
                    &c.technology
                })
            })
            .collect();
        let list: &mut Vec<Elem> = if layer == "application" {
            &mut target.application
        } else {
            &mut target.technology
        };
        steps.push(Step::of_target(list));
        let last = steps.len() - 1;
        let mut composer = Composer {
            steps,
            memo: HashMap::new(),
        };
        let mut composed: Vec<(usize, Option<Vec<Value>>)> = Vec::new();
        for (at, e) in list.iter().enumerate() {
            // what the host did not give (the base says the same), and what is not a list, is read as it is: rule 6 warns of the latter
            let Some(Value::Array(declared)) =
                e.other.get("replaces").filter(|v| says_something(v))
            else {
                continue;
            };
            let x = e.reference.as_str();
            let mut stands: BTreeSet<String> = BTreeSet::new();
            let mut as_written: Vec<Value> = Vec::new();
            if composer.steps[last - 1].holds.contains(x) {
                stands.extend(composer.stands_for(last - 1, x));
            }
            let own = composer.entries(last, x);
            let word = composer.steps[last].written.get(x).copied();
            let carried = !(composer.steps[last - 1].holds.contains(x)
                && composer.steps[last - 1].written.get(x).copied() == word);
            for entry in declared {
                match entry.as_str().map(str::trim).filter(|s| !s.is_empty()) {
                    Some(r) if own.iter().any(|o| o == r) => {
                        stands.extend(composer.stands_for(last - 1, r))
                    }
                    // an inherited word is explained by the layer that wrote it; the others are the mistakes of rule 6, which warns of them
                    _ if !carried => {}
                    _ => as_written.push(entry.clone()),
                }
            }
            stands.remove(x);
            stands.retain(|r| !composer.steps[last].holds.contains(r.as_str()));
            let mut out: Vec<Value> = stands.into_iter().map(Value::String).collect();
            out.extend(as_written);
            composed.push((at, if out.is_empty() { None } else { Some(out) }));
        }
        for (at, out) in composed {
            match out {
                Some(list_out) => {
                    list[at]
                        .other
                        .insert("replaces".into(), Value::Array(list_out));
                }
                None => {
                    list[at].other.remove("replaces");
                }
            }
        }
    }
}

/// Reads the `replaces` of the target. See rule 6 at the top of this file.
fn resolve(input: &CompareInput) -> Resolved {
    let mut warnings: Vec<String> = Vec::new();
    // (layer, replacing) -> the valid references it replaces
    let mut valid: BTreeMap<(&'static str, String), Vec<String>> = BTreeMap::new();
    for layer in LAYERS {
        let base: HashSet<&str> = input
            .base
            .layer(layer)
            .iter()
            .map(|e| e.reference.as_str())
            .collect();
        let target: HashSet<&str> = input
            .target
            .layer(layer)
            .iter()
            .map(|e| e.reference.as_str())
            .collect();
        let mut elements: Vec<&Elem> = input.target.layer(layer).iter().collect();
        elements.sort_by(|a, b| a.reference.cmp(&b.reference));
        for e in elements {
            let declared = match e.other.get("replaces") {
                None | Some(Value::Null) => continue,
                Some(Value::Array(list)) => list,
                Some(_) => {
                    warnings.push(format!(
                        "replaces of {} ({layer} layer) is not a list of references, ignored",
                        e.reference
                    ));
                    continue;
                }
            };
            let mut kept: Vec<String> = Vec::new();
            for entry in declared {
                let Some(reference) = entry.as_str().map(str::trim).filter(|s| !s.is_empty())
                else {
                    warnings.push(format!("replaces of {} ({layer} layer) has an entry that is not a reference, ignored", e.reference));
                    continue;
                };
                if kept.iter().any(|k| k == reference) {
                    warnings.push(format!(
                        "replaces of {} ({layer} layer) lists {reference} twice, counted once",
                        e.reference
                    ));
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
            replacers
                .entry((*layer, r.clone()))
                .or_default()
                .push(replacing.clone());
        }
    }
    let mut identities = BTreeMap::new();
    for ((layer, replacing), replaced) in valid {
        let in_base = input
            .base
            .layer(layer)
            .iter()
            .any(|e| e.reference == replacing);
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
        identities.insert(
            (layer, replacing),
            Identity {
                kind,
                replaces: replaced,
                counterpart,
            },
        );
    }
    Resolved {
        identities,
        rewrite: Rewrite { by: replacers },
        warnings,
    }
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
            label: rel
                .label
                .as_ref()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty()),
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
    fn order(&self) -> RelationshipOrder<'_> {
        (
            self.layer,
            &self.from,
            &self.destination,
            &self.label,
            self.nq(),
            self.nt(),
            &self.qualifiers,
            &self.tags,
        )
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
        URel {
            r: r.clone(),
            change,
            natures: Vec::new(),
            before: Map::new(),
            after: Map::new(),
        }
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
        URel {
            r: t.clone(),
            change: CHANGED,
            natures,
            before,
            after,
        }
    }
}

type Key = (String, String, Option<String>);
/// The total order of a relationship (see `R::order`).
type RelationshipOrder<'a> = (
    &'static str,
    &'a str,
    &'a str,
    &'a Option<String>,
    Vec<String>,
    BTreeMap<String, String>,
    &'a Vec<String>,
    &'a BTreeMap<String, String>,
);
/// The removed and the new relationships of one pair of elements.
type PairsOfElements<'a> = BTreeMap<(&'a str, &'a str), (Vec<&'a R>, Vec<&'a R>)>;

fn group(list: &[R]) -> BTreeMap<Key, Vec<&R>> {
    let mut out: BTreeMap<Key, Vec<&R>> = BTreeMap::new();
    for r in list {
        out.entry((r.from.clone(), r.destination.clone(), r.label.clone()))
            .or_default()
            .push(r);
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
        let (bl, tl) = (
            bg.get(key).cloned().unwrap_or_default(),
            tg.get(key).cloned().unwrap_or_default(),
        );
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
        let t_rest: Vec<&R> = tl
            .iter()
            .enumerate()
            .filter(|(i, _)| !taken[*i])
            .map(|(_, t)| *t)
            .collect();
        let paired = b_rest.len().min(t_rest.len());
        for i in 0..paired {
            out.push(URel::changed(b_rest[i], t_rest[i]));
        }
        removed.extend(&b_rest[paired..]);
        new.extend(&t_rest[paired..]);
    }
    // one removed and one new for the same pair of elements: the label changed
    let mut pairs: PairsOfElements = BTreeMap::new();
    for r in &removed {
        pairs
            .entry((r.from.as_str(), r.destination.as_str()))
            .or_default()
            .0
            .push(r);
    }
    for r in &new {
        pairs
            .entry((r.from.as_str(), r.destination.as_str()))
            .or_default()
            .1
            .push(r);
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
    /// the element did not change itself and something below it in the reference tree is new, changed, removed, moved, split or
    /// merged: the state `contains-changes`, said once here and not worked out again by a host (contract 5, issue #96)
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    contains_changes: bool,
    /// something below it in the reference tree changed otherwise than in its description alone, whatever the element itself did:
    /// what a host that sets the wording-only changes aside reads in place of `contains_changes`
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    contains_more_than_wording: bool,
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
        Value::Object(m) => Value::Object(
            m.iter()
                .map(|(k, v)| (k.clone(), canonical(v)))
                .collect::<BTreeMap<_, _>>()
                .into_iter()
                .collect(),
        ),
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
        contains_changes: false,
        contains_more_than_wording: false,
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

fn index<'a>(
    list: &'a [Elem],
    which: &str,
    layer: &str,
) -> Result<HashMap<&'a str, &'a Elem>, String> {
    let mut known: HashMap<&str, &Elem> = HashMap::new();
    for e in list {
        if known.insert(e.reference.as_str(), e).is_some() {
            return Err(format!(
                "duplicate reference: {} (in the {which} plateau, {layer} layer)",
                e.reference
            ));
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
                    return Err(format!(
                        "dangling reference: {dest} (relationship of {}, in the {which} plateau)",
                        e.reference
                    ));
                }
            }
            let mut used: Vec<&String> = e.uses.iter().collect();
            used.sort();
            for u in used {
                if !known.contains_key(u.as_str()) {
                    return Err(format!(
                        "dangling reference: {u} (uses of {}, in the {which} plateau)",
                        e.reference
                    ));
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
    let all = side.layer(layer).iter().flat_map(|e| {
        e.relationships
            .iter()
            .map(move |r| R::of(layer, &e.reference, r))
    });
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
    norm_text(text)
        .to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(str::to_string)
        .collect()
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
        *counts
            .entry((norm_text(&p.kind), norm_text(&p.name).to_lowercase()))
            .or_default() += 1;
    }
    counts
}

/// The pairs (removed, new) that look like one thing said twice: same layer, same kind, and a name (when it is the only one of its kind
/// among the removed and among the new), a description or (when they are the only two of their kind under a parent) a parent in common.
/// Nothing that is replaced, nothing that replaces.
///
/// `on_one_chain` says whether one plateau is the past of the other. Between two siblings the only two elements of a kind under a parent are not one
/// thing said twice, they are two alternatives, so the parent is no reason there (issue #70): a pair that has no other reason is not listed.
fn candidates(
    input: &CompareInput,
    identities: &BTreeMap<(&'static str, String), Identity>,
    rewrite: &Rewrite,
    on_one_chain: bool,
) -> Vec<Candidate> {
    let mut out = Vec::new();
    for layer in LAYERS {
        let target_refs: HashSet<&str> = input
            .target
            .layer(layer)
            .iter()
            .map(|e| e.reference.as_str())
            .collect();
        let base_refs: HashSet<&str> = input
            .base
            .layer(layer)
            .iter()
            .map(|e| e.reference.as_str())
            .collect();
        let mut gone: Vec<(&Elem, Props)> = input
            .base
            .layer(layer)
            .iter()
            .filter(|e| {
                !target_refs.contains(e.reference.as_str())
                    && !rewrite.is_replaced(layer, &e.reference)
            })
            .map(|e| (e, props_of(e)))
            .collect();
        let mut fresh: Vec<(&Elem, Props)> = input
            .target
            .layer(layer)
            .iter()
            .filter(|e| {
                !base_refs.contains(e.reference.as_str())
                    && !identities.contains_key(&(layer, e.reference.clone()))
            })
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
                    if on_one_chain && a == b && siblings.get(&(a, kind)) == Some(&(1, 1)) {
                        reasons.push("parent");
                    }
                }
                if !reasons.is_empty() {
                    out.push(Candidate {
                        layer,
                        from: from.reference.clone(),
                        to: to.reference.clone(),
                        reasons,
                    });
                }
            }
        }
    }
    out
}

/// The natures that come from the relationships an element declares: added, removed, changed.
fn relationship_natures(flags: (bool, bool, bool)) -> Vec<&'static str> {
    [
        (flags.0, "relationships-added"),
        (flags.1, "relationships-removed"),
        (flags.2, "relationships-changed"),
    ]
    .into_iter()
    .filter(|(flag, _)| *flag)
    .map(|(_, nature)| nature)
    .collect()
}

fn run(input: &str) -> Result<CompareOutput, String> {
    let mut input: CompareInput =
        serde_json::from_str(input).map_err(|e| format!("invalid input: {e}"))?;
    let on_one_chain = input
        .on_one_chain
        .ok_or_else(|| ON_ONE_CHAIN_MISSING.to_string())?;
    check(&input.base, "base")?;
    check(&input.target, "target")?;
    compose(&input.chain, &mut input.target);
    let Resolved {
        identities,
        rewrite,
        warnings,
    } = resolve(&input);

    // the relationships first: the natures of an element depend on them
    let mut relationships: Vec<URel> = Vec::new();
    for layer in LAYERS {
        relationships.extend(compare_relationships(
            &relationships_of(&input.base, layer, Some(&rewrite)),
            &relationships_of(&input.target, layer, None),
        ));
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
                None => identity
                    .and_then(|i| i.counterpart.as_deref())
                    .and_then(|c| base.get(c).copied()),
            };
            match (counterpart, identity) {
                (None, None) => elements.push(out_element(layer, t, &tp, NEW)),
                (None, Some(_)) => {
                    let mut element = out_element(layer, t, &tp, NONE);
                    element.natures = relationship_natures(
                        moved.get(&(layer, *reference)).copied().unwrap_or_default(),
                    );
                    elements.push(element);
                }
                (Some(b), _) => {
                    let (mut natures, before, after) =
                        compare_props(&base_props_of(b, &rewrite), &tp);
                    natures.extend(relationship_natures(
                        moved.get(&(layer, *reference)).copied().unwrap_or_default(),
                    ));
                    let mut element = out_element(
                        layer,
                        t,
                        &tp,
                        if natures.is_empty() { NONE } else { CHANGED },
                    );
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
                (1..parts.len())
                    .map(|i| parts[..i].join("."))
                    .collect::<Vec<_>>()
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
    mark_containers(&mut elements);

    let mut counts = Counts::default();
    let mut changes: Vec<Value> = Vec::new();
    for e in elements
        .iter()
        .filter(|e| e.change != NONE && e.replaced_by.is_empty())
    {
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
            row.insert(
                "natures".into(),
                Value::Array(e.natures.iter().map(|n| (*n).into()).collect()),
            );
        }
        if e.wording_only {
            row.insert("wording_only".into(), true.into());
        }
        if !e.replaces.is_empty() {
            row.insert(
                "replaces".into(),
                Value::Array(e.replaces.iter().cloned().map(Value::String).collect()),
            );
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
            row.insert(
                "natures".into(),
                Value::Array(u.natures.iter().map(|n| (*n).into()).collect()),
            );
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
    let candidates = candidates(&input, &identities, &rewrite, on_one_chain);
    Ok(CompareOutput {
        version: CONTRACT_VERSION,
        elements,
        relationships,
        changes,
        counts,
        candidates,
        warnings,
    })
}

/// `contains_changes` and `contains_more_than_wording` on the elements of the union (the rule of `compute`, which draws the union: an
/// element that did not change itself and has below it, in the reference tree and not only among the elements listed, one that is new,
/// changed, removed, moved, split or merged). A reference is looked at in its own layer.
fn mark_containers(elements: &mut [OutElement]) {
    let mut above: HashSet<(&'static str, String)> = HashSet::new();
    let mut above_more: HashSet<(&'static str, String)> = HashSet::new();
    for e in elements.iter().filter(|e| e.change != NONE) {
        let p: Vec<&str> = e.reference.split('.').collect();
        for i in 1..p.len() {
            above.insert((e.layer, p[..i].join(".")));
            if !e.wording_only {
                above_more.insert((e.layer, p[..i].join(".")));
            }
        }
    }
    for e in elements.iter_mut() {
        let key = (e.layer, e.reference.clone());
        e.contains_changes = e.change == NONE && above.contains(&key);
        e.contains_more_than_wording = above_more.contains(&key);
    }
}

/// The comparison of two plateaus: see the top of this file.
pub fn compare_json(input: &str) -> String {
    run(input)
        .and_then(|out| {
            serde_json::to_string(&out).map_err(|e| format!("cannot write the comparison: {e}"))
        })
        .unwrap_or_else(|e| serde_json::json!({ "error": e }).to_string())
}

#[cfg(test)]
#[path = "compare_tests.rs"]
mod tests;
