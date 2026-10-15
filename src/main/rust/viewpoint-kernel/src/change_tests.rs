//! The views of a comparison: `change` on the items and the links, the stereotypes that tell it, the marker of a container,
//! and `only_changes`. The input is the union `compare` gives (elements and relationships that carry `change`), written by hand.
use super::*;
use serde_json::{json, Value};

fn rel(destination: &str, label: &str, change: &str) -> Value {
    json!({ "destination": destination, "label": label, "change": change })
}

fn plain(destination: &str, label: &str) -> Value {
    json!({ "destination": destination, "label": label })
}

fn el(reference: &str, parent: bool, change: &str, relationships: Vec<Value>) -> Value {
    json!({ "reference": reference, "parent": parent, "change": change, "relationships": relationships })
}

fn view(viewpoint: &str, focal: &str, elements: Vec<Value>, extra: Value) -> Value {
    let mut input = json!({ "viewpoint": viewpoint, "layer": "application", "focal": focal, "elements": elements });
    for (k, v) in extra.as_object().unwrap() {
        input[k] = v.clone();
    }
    serde_json::from_str(&compute_json(&input.to_string())).unwrap()
}

fn item<'a>(out: &'a Value, id: &str) -> &'a Value {
    out["items"].as_array().unwrap().iter().find(|i| i["id"] == id).unwrap_or_else(|| panic!("no item {id} in {out}"))
}

fn link<'a>(out: &'a Value, from: &str, to: &str) -> &'a Value {
    out["links"].as_array().unwrap().iter().find(|l| l["from"] == from && l["to"] == to).unwrap_or_else(|| panic!("no link {from} -> {to} in {out}"))
}

fn has_link(out: &Value, from: &str, to: &str) -> bool {
    out["links"].as_array().unwrap().iter().any(|l| l["from"] == from && l["to"] == to)
}

fn ids(out: &Value) -> Vec<String> {
    out["items"].as_array().unwrap().iter().map(|i| i["id"].as_str().unwrap().to_string()).collect()
}

fn stereotypes(out: &Value, id: &str) -> Value {
    item(out, id)["stereotypes"].clone()
}

/// The union of a small architecture that changed:
///   sys{ a (changed: declares a new link to ext and keeps feeding b), b (unchanged: its link to other.b.c was removed),
///        old (removed, with its link to ext), fresh (new, with a new link to ext) },
///   other{ b{ c (unchanged), d (new, with a new link to ext) } } (containers that did not change themselves), ext (unchanged),
///   gone (removed). Elements without a link are not part of a deep view of the application layer.
fn union() -> Vec<Value> {
    vec![
        el("sys", true, "none", vec![]),
        el("sys.a", false, "changed", vec![rel("ext", "calls", "new"), plain("sys.b", "feeds")]),
        el("sys.b", false, "none", vec![rel("other.b.c", "calls", "removed")]),
        el("sys.old", false, "removed", vec![rel("ext", "legacy", "removed")]),
        el("sys.fresh", false, "new", vec![rel("ext", "pushes", "new")]),
        el("other", true, "none", vec![]),
        el("other.b", true, "none", vec![]),
        el("other.b.c", false, "none", vec![]),
        el("other.b.d", false, "new", vec![rel("ext", "emits", "new")]),
        el("ext", false, "none", vec![]),
        el("gone", false, "removed", vec![]),
    ]
}

#[test]
fn the_contract_is_version_4() {
    assert_eq!(CONTRACT_VERSION, 4);
    assert_eq!(view("deep", "sys", union(), json!({}))["version"], 4);
}

#[test]
fn the_items_and_the_links_of_a_view_carry_what_changed() {
    let out = view("deep", "sys", union(), json!({}));
    for (id, change) in [("sys", "none"), ("sys.a", "changed"), ("sys.b", "none"), ("sys.old", "removed"), ("sys.fresh", "new"), ("ext", "none")] {
        assert_eq!(item(&out, id)["change"], change, "{id}");
    }
    assert_eq!(link(&out, "sys.a", "ext")["change"], "new");
    assert_eq!(link(&out, "sys.a", "sys.b")["change"], "none");
    assert_eq!(link(&out, "sys.b", "other.b.c")["change"], "removed");
    assert_eq!(link(&out, "sys.old", "ext")["change"], "removed");
    assert_eq!(link(&out, "sys.fresh", "ext")["change"], "new");
    // the relationships a link stands for have the change they were given
    assert_eq!(link(&out, "sys.a", "ext")["relationships"][0]["change"], "new");
    assert_eq!(link(&out, "sys.a", "sys.b")["relationships"][0].get("change"), None, "a relationship that was not told stays as it was");
}

#[test]
fn a_removed_element_and_a_removed_relationship_take_part_in_the_view_under_their_parent() {
    let out = view("deep", "sys", union(), json!({}));
    assert!(ids(&out).contains(&"sys.old".to_string()));
    assert_eq!(item(&out, "sys.old")["parent"], "sys");
    assert_eq!(link(&out, "sys.old", "ext")["label"], "legacy");
    // a removed parent keeps its removed child under it
    let mut tree = union();
    tree.push(el("gone.child", false, "removed", vec![rel("ext", "bye", "removed")]));
    tree[10] = el("gone", true, "removed", vec![]);
    let out = view("deep", "gone", tree, json!({}));
    assert_eq!(item(&out, "gone.child")["parent"], "gone");
    assert_eq!(item(&out, "gone")["change"], "removed");
    assert_eq!(link(&out, "gone.child", "ext")["change"], "removed");
}

#[test]
fn the_overview_of_a_removed_element_is_drawn_like_any_other() {
    let out = view("overview", "sys.old", union(), json!({}));
    assert_eq!(item(&out, "sys.old")["change"], "removed");
    assert_eq!(item(&out, "ext")["change"], "none");
    assert_eq!(link(&out, "sys.old", "ext")["change"], "removed");
}

// ---- a grouped link ----

/// `sys` folds `sys.a` and `sys.b`, which both reach `other.b.c` with the same words.
fn grouped(a: &str, b: &str) -> Value {
    let elements = vec![
        el("sys", true, "none", vec![]),
        el("sys.a", false, "none", vec![rel("other.b.c", "calls", a)]),
        el("sys.b", false, "none", vec![rel("other.b.c", "calls", b)]),
        el("other", true, "none", vec![]),
        el("other.b", true, "none", vec![]),
        el("other.b.c", false, "none", vec![]),
    ];
    view("deep", "sys", elements, json!({ "collapsed": ["sys"] }))
}

#[test]
fn a_grouped_link_adds_up_the_changes_of_what_it_stands_for() {
    for (a, b, expected) in [
        ("new", "new", "new"),
        ("removed", "removed", "removed"),
        ("none", "none", "none"),
        ("new", "none", "changed"),
        ("removed", "none", "changed"),
        ("new", "removed", "changed"),
        ("changed", "changed", "changed"),
        ("changed", "none", "changed"),
        ("new", "changed", "changed"),
    ] {
        let out = grouped(a, b);
        let l = link(&out, "sys", "other.b.c");
        assert_eq!(l["synthetic"], true, "{a} {b}");
        assert_eq!(l["change"], expected, "{a} + {b}");
        assert_eq!(l["relationships"].as_array().unwrap().len(), 2);
    }
}

#[test]
fn what_changed_does_not_change_how_a_link_is_grouped_nor_its_caption() {
    // two relationships that read the same count once, whatever happened to each of them
    let with = grouped("new", "none");
    assert_eq!(link(&with, "sys", "other.b.c")["label"], "calls");
    let without = grouped("none", "none");
    assert_eq!(link(&with, "sys", "other.b.c")["label"], link(&without, "sys", "other.b.c")["label"]);
}

#[test]
fn a_link_of_the_overview_that_groups_by_folding_levels_adds_up_too() {
    let elements = vec![
        el("sys", true, "none", vec![]),
        el("sys.a", false, "none", vec![rel("other.b.c", "calls", "new"), rel("other.b.d", "calls", "none")]),
        el("other", true, "none", vec![]),
        el("other.b", true, "none", vec![]),
        el("other.b.c", false, "none", vec![]),
        el("other.b.d", false, "none", vec![]),
    ];
    let out = view("overview", "sys.a", elements, json!({}));
    assert_eq!(link(&out, "sys.a", "other")["change"], "changed", "a grouped link of a new and an unchanged relationship");
}

// ---- stereotypes ----

fn one(extra: Value) -> Value {
    let mut element = json!({ "reference": "a", "change": "none" });
    for (k, v) in extra.as_object().unwrap() {
        element[k] = v.clone();
    }
    view("overview", "a", vec![element], json!({}))
}

#[test]
fn the_state_of_an_element_ends_its_stereotypes() {
    for state in ["new", "changed", "removed"] {
        let out = one(json!({ "change": state, "qualifiers": ["Quarkus"], "tags": { "rendering-stereotypes": "external legacy" } }));
        assert_eq!(stereotypes(&out, "a"), json!(["Quarkus", "external", "legacy", state]), "{state}");
    }
    assert_eq!(stereotypes(&one(json!({ "qualifiers": ["Quarkus"] })), "a"), json!(["Quarkus"]), "nothing is added to an element that did not change");
}

#[test]
fn a_word_the_author_wrote_is_not_repeated_and_the_computed_state_comes_last() {
    // the same word, anywhere in the list: once, last
    let out = one(json!({ "change": "new", "qualifiers": ["new", "Quarkus"], "tags": { "rendering-stereotypes": "external" } }));
    assert_eq!(stereotypes(&out, "a"), json!(["Quarkus", "external", "new"]));
    let out = one(json!({ "change": "changed", "tags": { "rendering-stereotypes": "changed external" } }));
    assert_eq!(stereotypes(&out, "a"), json!(["external", "changed"]));
    let out = one(json!({ "change": "removed", "tags": { "rendering-stereotypes": "external removed" } }));
    assert_eq!(stereotypes(&out, "a"), json!(["external", "removed"]));
    // another word of the author stays, before the computed one that wins over it
    let out = one(json!({ "change": "new", "tags": { "rendering-stereotypes": "changed" } }));
    assert_eq!(stereotypes(&out, "a"), json!(["changed", "new"]));
    // an element that did not change keeps the tag the author wrote
    let out = one(json!({ "tags": { "rendering-stereotypes": "new changed" } }));
    assert_eq!(stereotypes(&out, "a"), json!(["new", "changed"]));
}

#[test]
fn the_stereotypes_of_a_view_without_any_change_are_what_they_were() {
    let out = view("overview", "a", vec![json!({ "reference": "a", "qualifiers": ["q"], "tags": { "rendering-stereotypes": "external changed" } })], json!({}));
    assert_eq!(stereotypes(&out, "a"), json!(["q", "external", "changed"]));
    assert!(item(&out, "a").get("change").is_none());
}

#[test]
fn the_natures_of_an_element_travel_with_its_item() {
    let out = one(json!({ "change": "changed", "natures": ["description", "relationships-added"] }));
    assert_eq!(item(&out, "a")["natures"], json!(["description", "relationships-added"]));
    assert!(item(&one(json!({})), "a").get("natures").is_none());
}

// ---- a container ----

#[test]
fn a_container_whose_descendants_changed_is_not_changed_and_says_so_discreetly() {
    let out = view("deep", "other", union(), json!({}));
    for id in ["other", "other.b"] {
        assert_eq!(item(&out, id)["change"], "none", "{id} is not changed because of what is inside it");
        assert_eq!(stereotypes(&out, id), json!(["contains-changes"]), "{id}");
    }
    assert_eq!(stereotypes(&out, "other.b.c"), json!([]), "a leaf that did not change says nothing");
    assert_eq!(stereotypes(&out, "other.b.d"), json!(["new"]));
}

#[test]
fn the_marker_follows_the_reference_tree_even_when_the_box_is_folded() {
    let out = view("deep", "other", union(), json!({ "collapsed": ["other.b"] }));
    let b = item(&out, "other.b");
    assert_eq!((b["collapsed"].as_bool(), b["hidden"].as_u64()), (Some(true), Some(2)));
    assert_eq!(b["change"], "none");
    assert_eq!(stereotypes(&out, "other.b"), json!(["contains-changes"]));
}

#[test]
fn a_container_that_changed_by_itself_has_no_marker_and_neither_has_one_that_nothing_changed_in() {
    let elements = vec![
        el("a", true, "changed", vec![]),
        el("a.x", false, "new", vec![]),
        el("b", true, "new", vec![]),
        el("b.x", false, "new", vec![]),
        el("c", true, "none", vec![]),
        el("c.x", false, "none", vec![]),
        el("d", true, "removed", vec![]),
        el("d.x", false, "removed", vec![]),
    ];
    let out = view("map", "", elements, json!({ "opened": ["a", "b", "c", "d"] }));
    assert_eq!(stereotypes(&out, "a"), json!(["changed"]));
    assert_eq!(stereotypes(&out, "b"), json!(["new"]));
    assert_eq!(stereotypes(&out, "c"), json!([]));
    assert_eq!(stereotypes(&out, "d"), json!(["removed"]));
}

#[test]
fn a_relationship_that_changed_counts_through_the_element_that_declares_it() {
    // `compare` marks the source `changed`: the container above it contains changes. The relationship's own change is not read for that.
    let elements = vec![
        el("a", true, "none", vec![]),
        el("a.x", false, "changed", vec![rel("z", "calls", "new")]),
        el("b", true, "none", vec![]),
        el("b.x", false, "none", vec![rel("z", "calls", "new")]),
        el("z", false, "none", vec![]),
    ];
    let out = view("map", "", elements, json!({ "opened": ["a", "b"] }));
    assert_eq!(stereotypes(&out, "a"), json!(["contains-changes"]));
    assert_eq!(stereotypes(&out, "b"), json!([]));
}

#[test]
fn a_deployed_application_is_judged_in_the_application_layer() {
    let out = serde_json::from_str::<Value>(&compute_json(
        &json!({
            "viewpoint": "deep", "layer": "technology", "focal": "dev",
            "elements": [
                { "reference": "dev", "parent": true, "change": "none" },
                { "reference": "dev.node", "change": "none", "applications": ["shop.api", "shop.old"] }
            ],
            "app_elements": [
                { "reference": "shop", "parent": true, "change": "none" },
                { "reference": "shop.api", "change": "new", "qualifiers": ["Quarkus"] },
                { "reference": "shop.old", "change": "removed" }
            ]
        })
        .to_string(),
    ))
    .unwrap();
    assert_eq!(item(&out, "node_shop_api")["change"], "new");
    assert_eq!(stereotypes(&out, "node_shop_api"), json!(["Quarkus", "new"]));
    assert_eq!(item(&out, "node_shop_old")["change"], "removed");
    assert_eq!(item(&out, "dev.node")["change"], "none", "the node did not change, the applications on it did");
}

// ---- only_changes ----

fn only(viewpoint: &str, focal: &str, elements: Vec<Value>, extra: Value) -> Value {
    let mut extra = extra;
    extra["only_changes"] = json!(true);
    view(viewpoint, focal, elements, extra)
}

#[test]
fn only_changes_keeps_what_changed_the_ends_of_changed_links_and_what_encloses_them() {
    let out = only("deep", "sys", union(), json!({}));
    // `sys.b` is unchanged but ends the changed link to other.b.c; `ext` ends changed links; `gone` has no link, `other.b.d`
    // none that touches `sys`: the deep view of `sys` does not show them
    assert_eq!(ids(&out), ["ext", "other", "other.b", "other.b.c", "sys", "sys.a", "sys.b", "sys.fresh", "sys.old"]);
    // nothing unchanged is left: every kept link changed
    assert!(!has_link(&out, "sys.a", "sys.b"), "an unchanged link between kept items is left out");
    for l in out["links"].as_array().unwrap() {
        assert_ne!(l["change"], "none", "{l}");
    }
    assert_eq!(out["links"].as_array().unwrap().len(), 4);
}

#[test]
fn an_item_kept_for_no_change_of_its_own_is_context() {
    let out = only("deep", "sys", union(), json!({}));
    for (id, context) in [
        ("sys", true),      // encloses changed items
        ("sys.b", true),    // end of a changed link
        ("ext", true),      // end of changed links
        ("other", true),    // encloses a new element
        ("other.b", true),
        ("other.b.c", true), // end of the removed link
        ("sys.a", false),
        ("sys.old", false),
        ("sys.fresh", false),
    ] {
        assert_eq!(item(&out, id).get("context").and_then(|c| c.as_bool()).unwrap_or(false), context, "{id}");
    }
    // context is not a state: the item still says it did not change, and a container still carries its marker
    assert_eq!(item(&out, "other")["change"], "none");
    assert_eq!(stereotypes(&out, "other"), json!(["contains-changes"]));
}

#[test]
fn an_unchanged_item_that_is_not_the_end_of_a_changed_link_is_left_out() {
    let elements = vec![
        el("sys", true, "none", vec![]),
        el("sys.a", false, "changed", vec![rel("sys.c", "calls", "new")]),
        el("sys.b", false, "none", vec![plain("sys.c", "feeds")]),
        el("sys.c", false, "none", vec![]),
        el("sys.d", false, "none", vec![plain("sys.a", "reads")]),
    ];
    let out = only("deep", "sys", elements, json!({}));
    assert_eq!(ids(&out), ["sys", "sys.a", "sys.c"]);
    assert_eq!(out["links"].as_array().unwrap().len(), 1);
    assert_eq!(item(&out, "sys.a").get("context"), None);
    assert_eq!(item(&out, "sys.c")["context"], true);
}

#[test]
fn only_changes_keeps_the_focal_item_so_that_a_view_without_changes_is_not_empty() {
    let elements = vec![el("sys", true, "none", vec![]), el("sys.a", false, "none", vec![plain("ext", "calls")]), el("ext", false, "none", vec![])];
    let out = only("deep", "sys", elements, json!({}));
    assert_eq!(ids(&out), ["sys"]);
    assert_eq!(item(&out, "sys")["context"], true);
    assert!(out["links"].as_array().unwrap().is_empty());
}

#[test]
fn only_changes_looks_at_the_links_as_they_are_drawn_after_a_fold() {
    // a fold groups a new link and an unchanged one: the grouped link changed, its ends stay
    let elements = vec![
        el("sys", true, "none", vec![]),
        el("sys.a", false, "none", vec![rel("ext", "calls", "new")]),
        el("sys.b", false, "none", vec![rel("ext", "calls", "none")]),
        el("ext", false, "none", vec![]),
        el("other", false, "none", vec![]),
    ];
    let out = only("deep", "sys", elements, json!({ "collapsed": ["sys"] }));
    assert_eq!(ids(&out), ["ext", "sys"]);
    assert_eq!(link(&out, "sys", "ext")["change"], "changed");
}

#[test]
fn a_folded_item_that_hides_changes_stays_as_context() {
    let elements = vec![
        el("focal", false, "none", vec![plain("sys.b", "calls")]),
        el("sys", true, "none", vec![]),
        el("sys.a", false, "changed", vec![]),
        el("sys.b", false, "none", vec![]),
    ];
    let out = only("deep", "focal", elements, json!({ "collapsed": ["sys"] }));
    assert_eq!(ids(&out), ["focal", "sys"]);
    assert_eq!(item(&out, "sys")["collapsed"], true);
    assert_eq!(item(&out, "sys")["context"], true);
    assert_eq!(stereotypes(&out, "sys"), json!(["contains-changes"]));
}

#[test]
fn only_changes_on_the_map_has_no_focal_item() {
    let elements = vec![
        el("sys", true, "none", vec![]),
        el("sys.a", false, "none", vec![]),
        el("sys.b", false, "new", vec![]),
        el("other", false, "none", vec![]),
    ];
    let out = only("map", "", elements, json!({ "opened": ["sys"] }));
    assert_eq!(ids(&out), ["sys", "sys.b"]);
    let none = only("map", "", vec![el("a", false, "none", vec![])], json!({}));
    assert!(ids(&none).is_empty());
}

#[test]
fn only_changes_without_any_change_in_the_input_says_nothing_changed() {
    let out = only("deep", "sys", vec![json!({ "reference": "sys" }), json!({ "reference": "sys.a", "relationships": [plain("ext", "calls")] }), json!({ "reference": "ext" })], json!({}));
    assert_eq!(ids(&out), ["sys"]);
    assert!(item(&out, "sys").get("change").is_none(), "it is not a comparison: nothing is told but the context");
    assert_eq!(item(&out, "sys")["context"], true);
}

#[test]
fn only_changes_and_hide_unlinked_work_together() {
    // technology layer: a view about a flow. `idle` has no link: hide_unlinked leaves it out; `quiet`'s link did not change.
    let out = serde_json::from_str::<Value>(&compute_json(
        &json!({
            "viewpoint": "deep", "layer": "technology", "focal": "dev", "hide_unlinked": true, "only_changes": true, "application_links": true,
            "elements": [
                { "reference": "dev", "parent": true, "change": "none" },
                { "reference": "dev.n1", "change": "none", "applications": ["shop.api"] },
                { "reference": "dev.n2", "change": "none", "applications": ["shop.db", "shop.cache"] },
                { "reference": "dev.idle", "change": "none" },
                { "reference": "dev.quiet", "change": "none", "applications": ["shop.mq"] }
            ],
            "app_elements": [
                { "reference": "shop", "parent": true, "change": "none" },
                { "reference": "shop.api", "change": "changed", "relationships": [
                    { "destination": "shop.db", "label": "sql", "change": "new" },
                    { "destination": "shop.mq", "label": "events", "change": "none" } ] },
                { "reference": "shop.db", "change": "none" },
                { "reference": "shop.cache", "change": "none" },
                { "reference": "shop.mq", "change": "none" }
            ]
        })
        .to_string(),
    ))
    .unwrap();
    assert!(out.get("error").is_none(), "{out}");
    let all = ids(&out);
    assert!(!all.contains(&"dev.idle".to_string()), "no link goes through it: {all:?}");
    assert!(!all.contains(&"n2_shop_cache".to_string()), "{all:?}");
    assert_eq!(link(&out, "n1_shop_api", "n2_shop_db")["change"], "new");
    assert!(all.contains(&"n1_shop_api".to_string()) && all.contains(&"n2_shop_db".to_string()));
    // the unchanged link to the queue is left out by only_changes, and so is its end
    assert!(!all.contains(&"quiet_shop_mq".to_string()), "{all:?}");
    assert_eq!(item(&out, "n2_shop_db")["context"], true);
    assert_eq!(item(&out, "n1_shop_api").get("context"), None);
    assert_eq!(out["links"].as_array().unwrap().len(), 1);
}

// ---- facets ----

#[test]
fn a_facet_reads_the_change_of_a_relationship_like_any_field() {
    let path = "$..relationships[?(@.change=='removed')]";
    let out = view("deep", "sys", union(), json!({ "facet": { "name": "f", "actions": [{ "operator": "REMOVE", "json_path": path }] } }));
    assert!(out.get("error").is_none(), "{out}");
    assert!(!has_link(&out, "sys.b", "other.b.c") && !has_link(&out, "sys.old", "ext"), "the removed relationships are gone");
    assert!(has_link(&out, "sys.a", "ext") && has_link(&out, "sys.fresh", "ext"), "the new ones stay");
    assert_eq!(link(&out, "sys.a", "ext")["change"], "new", "the surviving relationships keep their change");
}

#[test]
fn a_facet_reads_the_change_of_an_element_too_and_its_filter_runs_before_only_changes() {
    // the facet keeps the new things: it removes the relationships that are not new
    let path = "$..relationships[?(@.change!='new')]";
    let out = only("deep", "sys", union(), json!({ "facet": { "name": "f", "actions": [{ "operator": "REMOVE", "json_path": path }] } }));
    assert!(out.get("error").is_none(), "{out}");
    assert_eq!(out["links"].as_array().unwrap().len(), 2);
    assert!(has_link(&out, "sys.a", "ext") && has_link(&out, "sys.fresh", "ext"));
    // `sys.b` and `sys.old` have no link left, so the deep view does not show them
    assert_eq!(ids(&out), ["ext", "sys", "sys.a", "sys.fresh"]);
    // an element can be selected on its change as well
    let path = "$.application..elements[?(@.change=='removed')]";
    let kept = vec![el("sys", true, "none", vec![]), el("sys.a", false, "none", vec![]), el("sys.old", false, "removed", vec![])];
    let out = view("deep", "sys", kept, json!({ "facet": { "name": "f", "actions": [{ "operator": "REMOVE", "json_path": path }] } }));
    assert_eq!(ids(&out), ["sys"], "the facet saw the change of the element: {out}");
}

#[test]
fn a_facet_that_removes_every_change_leaves_a_comparison_that_has_none() {
    let path = "$..relationships[?(@.change!='none')]";
    let elements = vec![el("a", false, "none", vec![rel("b", "x", "new")]), el("b", false, "none", vec![])];
    let out = view("overview", "a", elements, json!({ "facet": { "name": "f", "actions": [{ "operator": "REMOVE", "json_path": path }] } }));
    assert_eq!(item(&out, "a")["change"], "none", "still a comparison: the items say they did not change");
}

// ---- no change at all ----

fn without_change(mut v: Value) -> Value {
    match &mut v {
        Value::Object(m) => {
            for key in ["change", "natures", "context"] {
                m.remove(key);
            }
            for child in m.values_mut() {
                *child = without_change(child.take());
            }
        }
        Value::Array(a) => {
            for child in a.iter_mut() {
                *child = without_change(child.take());
            }
        }
        _ => {}
    }
    v
}

fn quiet(viewpoint: &str, focal: &str, collapsed: &[&str]) -> Vec<Value> {
    let _ = (viewpoint, focal, collapsed);
    vec![
        json!({ "reference": "sys", "parent": true }),
        json!({ "reference": "sys.a", "qualifiers": ["q"], "tags": { "rendering-stereotypes": "external changed new" }, "relationships": [plain("other.b.c", "calls"), plain("sys.b", "feeds")] }),
        json!({ "reference": "sys.b", "relationships": [plain("other.b.c", "calls")] }),
        json!({ "reference": "other", "parent": true }),
        json!({ "reference": "other.b", "parent": true }),
        json!({ "reference": "other.b.c" }),
        json!({ "reference": "ext", "relationships": [plain("sys.b", "pushes")] }),
    ]
}

fn raw(viewpoint: &str, focal: &str, elements: Vec<Value>, extra: Value) -> String {
    let mut input = json!({ "viewpoint": viewpoint, "layer": "application", "focal": focal, "elements": elements });
    for (k, v) in extra.as_object().unwrap() {
        input[k] = v.clone();
    }
    compute_json(&input.to_string())
}

#[test]
fn an_input_without_change_gives_the_bytes_of_a_call_without_the_new_options() {
    for (viewpoint, focal, collapsed) in [("overview", "sys.a", vec![]), ("overview", "sys", vec![]), ("deep", "sys", vec!["sys"]), ("detailed", "sys", vec![]), ("map", "", vec![])] {
        let plain_call = raw(viewpoint, focal, quiet(viewpoint, focal, &collapsed), json!({ "collapsed": collapsed }));
        let with_options = raw(viewpoint, focal, quiet(viewpoint, focal, &collapsed), json!({ "collapsed": collapsed, "only_changes": false }));
        let with_null = raw(viewpoint, focal, quiet(viewpoint, focal, &collapsed), json!({ "collapsed": collapsed, "only_changes": null }));
        assert_eq!(plain_call, with_options, "{viewpoint} {focal}");
        assert_eq!(plain_call, with_null);
        for field in ["\"change\"", "\"natures\"", "\"context\"", "contains-changes"] {
            assert!(!plain_call.contains(field), "{viewpoint}: {field} in {plain_call}");
        }
        assert!(plain_call.contains("\"version\":4"));
    }
}

#[test]
fn a_comparison_in_which_nothing_changed_draws_the_same_boxes_and_links() {
    for (viewpoint, focal, collapsed) in [("overview", "sys.a", vec![]), ("overview", "sys", vec![]), ("deep", "sys", vec!["sys"]), ("detailed", "sys", vec![])] {
        let plain_view: Value = serde_json::from_str(&raw(viewpoint, focal, quiet(viewpoint, focal, &collapsed), json!({ "collapsed": collapsed }))).unwrap();
        // every element and every relationship says `none`
        let told: Vec<Value> = quiet(viewpoint, focal, &collapsed)
            .into_iter()
            .map(|mut e| {
                e["change"] = json!("none");
                if let Some(list) = e.get_mut("relationships").and_then(|r| r.as_array_mut()) {
                    for r in list {
                        r["change"] = json!("none");
                    }
                }
                e
            })
            .collect();
        let mut compared: Value = serde_json::from_str(&raw(viewpoint, focal, told, json!({ "collapsed": collapsed }))).unwrap();
        // the hand-written `changed` and `new` stay what they were
        assert_eq!(compared["items"].as_array().unwrap().iter().all(|i| i["change"] == "none"), true);
        assert_eq!(compared["links"].as_array().unwrap().iter().all(|l| l["change"] == "none"), true);
        // nothing is drawn differently: what is left once the new fields are taken away is the view of an input that did not say
        compared = without_change(compared);
        assert_eq!(compared["items"], plain_view["items"], "{viewpoint} {focal}");
        assert_eq!(compared["links"], plain_view["links"], "{viewpoint} {focal}");
    }
}

#[test]
fn the_same_comparison_gives_the_same_bytes_whatever_the_order_of_its_elements() {
    let first = raw("deep", "sys", union(), json!({ "only_changes": true }));
    assert_eq!(first, raw("deep", "sys", union(), json!({ "only_changes": true })));
    let mut shuffled = union();
    shuffled.reverse();
    shuffled.swap(2, 7);
    for e in shuffled.iter_mut() {
        if let Some(list) = e.get_mut("relationships").and_then(|r| r.as_array_mut()) {
            list.reverse();
        }
    }
    assert_eq!(first, raw("deep", "sys", shuffled, json!({ "only_changes": true })));
    let all = raw("overview", "sys", union(), json!({}));
    let mut shuffled = union();
    shuffled.reverse();
    assert_eq!(all, raw("overview", "sys", shuffled, json!({})));
}

// ---- mistakes ----

#[test]
fn a_change_that_is_not_one_of_the_words_is_an_error() {
    for (element, expected) in [
        (json!({ "reference": "a", "change": "teleported" }), "invalid change"),
        (json!({ "reference": "a", "relationships": [{ "destination": "a", "change": "moved" }] }), "invalid change"),
        (json!({ "reference": "a", "change": 3 }), "invalid change"),
        (json!({ "reference": "a", "relationships": [{ "destination": "a", "change": "gone" }] }), "invalid change"),
    ] {
        let out = view("overview", "a", vec![element], json!({}));
        assert!(out["error"].as_str().unwrap_or("").contains(expected), "{out}");
    }
    // null is "not given"
    let out = view("overview", "a", vec![json!({ "reference": "a", "change": null, "relationships": [{ "destination": "a", "change": null }] })], json!({}));
    assert!(out.get("error").is_none() && out["items"][0].get("change").is_none(), "{out}");
}

#[test]
fn the_union_of_compare_is_a_view_input() {
    // what `compare` gives for a small pair, handed to `compute` with the relationships nested under their `from`
    let side = |names: &[&str]| json!({ "application": names.iter().map(|n| json!({ "reference": n, "parent": false, "relationships": [] })).collect::<Vec<_>>() });
    let mut base = side(&["a", "b", "old"]);
    base["application"][0]["relationships"] = json!([plain("old", "uses")]);
    let mut target = side(&["a", "b", "fresh"]);
    target["application"][0]["relationships"] = json!([plain("fresh", "uses")]);
    let union: Value = serde_json::from_str(&compare_json(&json!({ "base": base, "target": target }).to_string())).unwrap();
    assert!(union.get("error").is_none(), "{union}");
    let elements: Vec<Value> = union["elements"]
        .as_array()
        .unwrap()
        .iter()
        .map(|e| {
            let mut e = e.clone();
            let reference = e["reference"].clone();
            e["relationships"] = Value::Array(union["relationships"].as_array().unwrap().iter().filter(|r| r["from"] == reference).cloned().collect());
            e
        })
        .collect();
    let out = view("overview", "a", elements, json!({}));
    assert!(out.get("error").is_none(), "{out}");
    assert_eq!(item(&out, "old")["change"], "removed");
    assert_eq!(item(&out, "fresh")["change"], "new");
    assert_eq!(item(&out, "a")["change"], "changed");
    assert_eq!(item(&out, "a")["natures"], json!(["relationships-added", "relationships-removed"]));
    assert_eq!(link(&out, "a", "old")["change"], "removed");
    assert_eq!(link(&out, "a", "fresh")["change"], "new");
    assert_eq!(stereotypes(&out, "a"), json!(["changed"]));
}

// ---- what an element that replaces others says (version 4) ----

#[test]
fn moved_split_and_merged_are_states_of_an_element_drawn_like_the_others() {
    for word in ["moved", "split", "merged"] {
        let out = view("overview", "a", vec![json!({ "reference": "a", "parent": false, "change": word, "replaces": ["old"] })], json!({}));
        assert!(out.get("error").is_none(), "{word}: {out}");
        assert_eq!(item(&out, "a")["change"], word);
        assert_eq!(stereotypes(&out, "a"), json!([word]), "the state ends the stereotypes, as `new` does");
    }
}

#[test]
fn an_element_that_replaces_another_is_a_change_for_the_container_above_and_for_only_changes() {
    let elements = vec![
        json!({ "reference": "sys", "parent": true, "change": "none" }),
        json!({ "reference": "sys.a", "parent": false, "change": "moved" }),
        json!({ "reference": "sys.b", "parent": false, "change": "none" }),
    ];
    let out = view("map", "", elements.clone(), json!({ "opened": ["sys"] }));
    assert_eq!(stereotypes(&out, "sys"), json!(["contains-changes"]));
    let out = view("map", "", elements, json!({ "opened": ["sys"], "only_changes": true }));
    let kept = ids(&out);
    assert!(kept.contains(&"sys.a".to_string()) && !kept.contains(&"sys.b".to_string()), "{kept:?}");
}

#[test]
fn the_union_of_a_pair_with_replaces_is_a_view_input_in_every_viewpoint() {
    // `old` is replaced by `fresh` but its child `old.gone` is not: the union keeps `old` as the place where `old.gone` was removed
    let side = |elements: Vec<Value>| json!({ "application": elements });
    let leaf = |r: &str| json!({ "reference": r, "parent": false });
    let base = side(vec![json!({ "reference": "old", "parent": true }), leaf("old.gone"), leaf("old.kept"), leaf("other")]);
    let target = side(vec![
        json!({ "reference": "fresh", "parent": true, "replaces": ["old"] }),
        json!({ "reference": "fresh.kept", "parent": false, "replaces": ["old.kept"] }),
        leaf("other"),
    ]);
    let union: Value = serde_json::from_str(&compare_json(&json!({ "base": base, "target": target }).to_string())).unwrap();
    assert!(union.get("error").is_none(), "{union}");
    let elements: Vec<Value> = union["elements"].as_array().unwrap().iter().map(|e| { let mut e = e.clone(); e["relationships"] = json!([]); e }).collect();
    for (viewpoint, focal, extra) in [("deep", "fresh", json!({})), ("deep", "old", json!({})), ("overview", "other", json!({})), ("detailed", "old", json!({})), ("map", "", json!({ "opened": ["fresh", "old"] }))] {
        let out = view(viewpoint, focal, elements.clone(), extra);
        assert!(out.get("error").is_none(), "{viewpoint} {focal}: {out}");
    }
    let out = view("map", "", elements, json!({ "opened": ["fresh", "old"] }));
    assert_eq!(item(&out, "fresh")["change"], "moved");
    assert_eq!(item(&out, "fresh.kept")["change"], "moved");
    assert_eq!(item(&out, "old")["change"], "removed");
    assert_eq!(item(&out, "old.gone")["change"], "removed");
}
