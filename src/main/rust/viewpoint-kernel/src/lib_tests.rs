//! Unit tests of the views the kernel computes (`compute`), moved out of `lib.rs` so that the coverage of the kernel counts production code only.
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
    out["links"]
        .as_array()
        .unwrap()
        .iter()
        .find(|l| l["from"] == from && l["to"] == to)
}

fn link_between(out: &Value, from: &str, to: &str) -> bool {
    link(out, from, to).is_some()
}

fn has_item(out: &Value, id: &str) -> bool {
    out["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|i| i["id"] == id)
}

fn ids(out: &Value) -> Vec<String> {
    out["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| i["id"].as_str().unwrap().to_string())
        .collect()
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
    assert_eq!(
        l["label"], "calls",
        "identical relationships count once, as in Java"
    );
    assert_eq!(
        l["relationships"].as_array().unwrap().len(),
        2,
        "but the two declaring elements are both listed"
    );
}

#[test]
fn deep_keeps_every_relationship_ungrouped() {
    let out = run("deep", "sys", &[]);
    assert!(
        link(&out, "sys.a", "sys.b").is_some()
            && link(&out, "sys.a", "other.b.c").is_some()
            && link(&out, "ext", "sys.b").is_some()
    );
    assert_eq!(
        ids(&out),
        [
            "ext",
            "other",
            "other.b",
            "other.b.c",
            "sys",
            "sys.a",
            "sys.b"
        ]
    );
}

#[test]
fn folding_hides_the_inside_and_regroups_the_links() {
    let out = run("deep", "sys", &["sys"]);
    assert_eq!(ids(&out), ["ext", "other", "other.b", "other.b.c", "sys"]);
    let sys = out["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["id"] == "sys")
        .unwrap();
    assert_eq!(
        (sys["collapsed"].as_bool(), sys["hidden"].as_u64()),
        (Some(true), Some(2))
    );
    assert!(
        link(&out, "sys.a", "sys.b").is_none(),
        "a link that is now inside the folded item disappears"
    );
    let l = link(&out, "sys", "other.b.c")
        .expect("links that reached inside now reach the folded item");
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
    let other = out["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["id"] == "other")
        .unwrap();
    assert_eq!(other["expandable"], true);
    let focal = out["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["id"] == "sys.a")
        .unwrap();
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
    let sys = out["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["id"] == "sys")
        .unwrap();
    assert_eq!(sys["expandable"], false);
}

#[test]
fn folding_an_unrelated_or_unknown_item_changes_nothing() {
    let plain = run("deep", "sys", &[]);
    assert_eq!(run("deep", "sys", &["nope"])["links"], plain["links"]);
}

#[test]
fn mistakes_are_reported_not_thrown() {
    assert!(run("detailed", "sys.a", &[])["error"]
        .as_str()
        .unwrap()
        .contains("not a parent"));
    assert!(run("overview", "ghost", &[])["error"]
        .as_str()
        .unwrap()
        .contains("ghost"));
    assert!(run("sideways", "sys", &[])["error"]
        .as_str()
        .unwrap()
        .contains("unsupported viewpoint"));
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
    out["links"]
        .as_array()
        .unwrap()
        .iter()
        .map(|l| l["label"].as_str().map(String::from))
        .collect()
}

fn remove(path: &str) -> Value {
    json!([{ "operator": "REMOVE", "json_path": path }])
}

#[test]
fn a_facet_removes_the_relationships_its_filter_matches() {
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$.application..relationships[?(@.qualifiers[?(@ == 'REST' || @ == 'x')])]"),
    );
    assert_eq!(labels(&out), [None, Some("writes".to_string())]);
}

#[test]
fn the_standard_forms_of_noneof_and_null_spare_a_relationship_without_qualifiers_and_remove_it() {
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$.application..relationships[?(@.qualifiers && !@.qualifiers[?(@ == 'REST')])]"),
    );
    assert_eq!(labels(&out), [None, Some("reads".to_string())]);
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$.application..relationships[?(!@.qualifiers)]"),
    );
    assert_eq!(
        labels(&out),
        [Some("reads".to_string()), Some("writes".to_string())]
    );
}

#[test]
fn a_facet_can_filter_on_the_label_and_target_a_layer() {
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(@.label == 'writes')]"),
    );
    assert_eq!(out["links"].as_array().unwrap().len(), 2);
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$.technology..relationships[?(@.label == 'writes')]"),
    );
    assert_eq!(
        out["links"].as_array().unwrap().len(),
        3,
        "an action aimed at the other layer changes nothing"
    );
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
    assert_eq!(
        run("$..relationships[?(@.tags['gate-point'] == 'yes')]"),
        ["no", "none", "other"]
    );
    assert_eq!(
        run("$..relationships[?(@.tags[\"gate-point\"] != 'yes')]"),
        ["yes"]
    );
    assert_eq!(
        run("$..relationships[?(@.tags.k == 'yes')]"),
        ["no", "none", "yes"]
    );
}

#[test]
fn what_a_facet_cannot_do_is_an_error_not_a_guess() {
    for path in [
        "$.application..relationships[?(@.label =~ /x/)]",
        "$..relationships[?(@.label == ",
        "relationships",
        "$..relationships[?(@.label == 'x' ||)]",
    ] {
        let out = with_facet("deep", "a", "application", remove(path));
        assert!(
            error(&out).contains("invalid facet JSONPath"),
            "{path}: {out}"
        );
    }
    let out = with_facet(
        "deep",
        "a",
        "application",
        json!([{ "operator": "KEEP", "json_path": "$..relationships[?(@.label == 'x')]" }]),
    );
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
    assert_eq!(
        out["links"][0]["qualifiers"],
        json!(["UDP:8080", "HTTPs:443"]),
        "declared order, no duplicate"
    );
}

#[test]
fn detailed_combines_the_overview_of_each_child() {
    let out = run("detailed", "sys", &[]);
    assert!(
        link(&out, "sys.a", "other").is_some()
            && link(&out, "sys.b", "other").is_some()
            && link(&out, "ext", "sys.b").is_some()
    );
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
    out["links"]
        .as_array()
        .unwrap()
        .iter()
        .map(|l| l["relationships"].as_array().unwrap().len())
        .sum()
}

#[test]
fn the_map_starts_closed_and_groups_what_is_inside() {
    let out = map_of(&[], &[], &[]);
    assert_eq!(ids(&out), ["ext", "other", "sys"]);
    assert_eq!(
        link(&out, "sys", "other").expect("what sys sends to other")["synthetic"],
        true
    );
    assert!(link(&out, "ext", "sys").is_some());
    assert_eq!(
        out["links"].as_array().unwrap().len(),
        2,
        "what stays inside sys is not drawn"
    );
    let sys = out["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["id"] == "sys")
        .unwrap();
    assert_eq!(
        sys["expandable"], true,
        "a closed element with children can be opened"
    );
}

#[test]
fn opening_an_element_shows_its_children_and_splits_the_links() {
    let out = map_of(&["sys"], &[], &[]);
    assert_eq!(ids(&out), ["ext", "other", "sys", "sys.a", "sys.b"]);
    assert_eq!(link(&out, "sys.a", "sys.b").unwrap()["synthetic"], false);
    assert!(
        link(&out, "sys.a", "other").is_some()
            && link(&out, "sys.b", "other").is_some()
            && link(&out, "ext", "sys.b").is_some()
    );
    assert!(link(&out, "sys", "other").is_none());
    let deeper = map_of(&["sys", "other", "other.b"], &[], &[]);
    assert_eq!(
        link(&deeper, "sys.a", "other.b.c").unwrap()["synthetic"],
        false,
        "opened all the way down, nothing is grouped"
    );
}

#[test]
fn opening_never_loses_a_relationship_it_only_moves_it() {
    // 4 declared relationships, one of them (sys.a -> sys.b) inside sys: drawn only once sys is open
    assert_eq!(represented(&map_of(&[], &[], &[])), 3);
    assert_eq!(represented(&map_of(&["sys"], &[], &[])), 4);
    assert_eq!(
        represented(&map_of(&["sys", "other", "other.b"], &[], &[])),
        4
    );
}

#[test]
fn pinning_keeps_what_touches_the_pinned_element_and_opens_what_encloses_it() {
    let out = map_of(&[], &["sys.a"], &[]);
    assert_eq!(ids(&out), ["other", "sys", "sys.a", "sys.b"]);
    assert!(link(&out, "sys.a", "other").is_some() && link(&out, "sys.a", "sys.b").is_some());
    assert!(
        link(&out, "ext", "sys.b").is_none(),
        "ext does not touch sys.a"
    );
}

#[test]
fn pinning_one_element_with_nothing_open_is_its_overview() {
    let key = |out: &Value| {
        let mut v: Vec<String> = out["links"]
            .as_array()
            .unwrap()
            .iter()
            .map(|l| {
                format!(
                    "{}|{}|{}|{}",
                    l["from"], l["to"], l["label"], l["synthetic"]
                )
            })
            .collect();
        v.sort();
        (ids(out), v)
    };
    for focal in ["sys.a", "sys.b", "other.b.c", "ext"] {
        assert_eq!(
            key(&map_of(&[], &[focal], &[])),
            key(&run("overview", focal, &[])),
            "{focal}"
        );
    }
}

#[test]
fn a_hidden_element_takes_its_relationships_with_it() {
    let out = map_of(&["sys"], &[], &["other"]);
    assert_eq!(ids(&out), ["ext", "sys", "sys.a", "sys.b"]);
    assert_eq!(out["links"].as_array().unwrap().len(), 2);
    assert_eq!(
        ids(&map_of(&["sys"], &[], &["sys.a"])),
        ["ext", "other", "sys", "sys.b"]
    );
}

#[test]
fn the_map_refuses_a_reference_it_does_not_know() {
    assert!(map_of(&[], &["nope"], &[])["error"]
        .as_str()
        .unwrap()
        .contains("nope"));
}

fn compute(input: Value) -> Value {
    serde_json::from_str(&compute_json(&input.to_string())).unwrap()
}

fn item<'a>(out: &'a Value, id: &str) -> &'a Value {
    out["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["id"] == id)
        .unwrap_or_else(|| panic!("no item {id} in {out}"))
}

fn error(out: &Value) -> &str {
    out["error"]
        .as_str()
        .unwrap_or_else(|| panic!("expected an error, got {out}"))
}

// ---- standard JSONPath: what the first dialect could not say ----

#[test]
fn a_compound_facet_filter_is_evaluated() {
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(@.label == 'reads' || @.label == 'writes')]"),
    );
    assert_eq!(labels(&out), [None]);
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(@.label == 'reads' && @.label == 'writes')]"),
    );
    assert_eq!(out["links"].as_array().unwrap().len(), 3, "nothing is both");
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(!@.label || @.label == 'writes')]"),
    );
    assert_eq!(labels(&out), [Some("reads".to_string())]);
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(@.qualifiers[?(@ == 'REST')] || @.label == 'writes')]"),
    );
    assert_eq!(labels(&out), [None]);
}

#[test]
fn a_facet_can_remove_an_element_and_what_points_at_it_goes_with_it() {
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$.application.elements[?(@.id == 'b')]"),
    );
    assert!(
        out.get("error").is_none(),
        "no more dangling reference: {out}"
    );
    assert!(
        out["links"].as_array().unwrap().is_empty(),
        "the three relationships of a pointed at b: {out}"
    );
    assert!(out["items"]
        .as_array()
        .unwrap()
        .iter()
        .all(|i| i["id"] != "b"));
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$.application.elements[?(@.id == 'a')]"),
    );
    assert!(!error(&out).is_empty(), "the focal element is gone: {out}");
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(length(@.qualifiers) == 1)]"),
    );
    assert_eq!(
        labels(&out),
        [None],
        "functions are available: only the relationship without qualifiers is left"
    );
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(match(@.label, 'r.*'))]"),
    );
    assert!(
        error(&out).contains("invalid facet JSONPath"),
        "regular expressions are left out of the module: {out}"
    );
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
    let list = workspace
        .pointer(pointer)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    list.iter()
        .map(|r| r["destination"].as_str().unwrap().to_string())
        .collect()
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
    assert_eq!(
        destinations(&kept, "/application/elements/0/elements/0/relationships"),
        ["shop.cart", "payments"],
        "the link to the catalog and to its child are gone, the others stay in order"
    );
    assert_eq!(
        destinations(&kept, "/application/elements/1/relationships"),
        Vec::<String>::new(),
        "the last one of a list leaves an empty list"
    );
    let children = kept
        .pointer("/application/elements/0/elements")
        .unwrap()
        .as_array()
        .unwrap();
    assert_eq!(
        children.len(),
        2,
        "web and cart; the catalog went with its child"
    );
    assert_eq!(
        destinations(&kept, "/application/elements/0/relationships"),
        ["payments"],
        "the system keeps what leads elsewhere"
    );
}

#[test]
fn removing_an_element_that_holds_children_removes_what_points_at_any_of_them() {
    let kept = after_removing(shop(), "$.application.elements[?(@.id == 'shop')]");
    assert_eq!(
        kept["application"]["elements"].as_array().unwrap().len(),
        2,
        "shop and all that it holds are gone"
    );
    assert_eq!(
        destinations(&kept, "/application/elements/0/relationships"),
        Vec::<String>::new(),
        "payments pointed at shop.catalog"
    );
    assert_eq!(
        destinations(&kept, "/application/elements/1/relationships"),
        ["ghost"],
        "see the next test"
    );
}

#[test]
fn a_map_that_fails_on_its_lists_names_every_entry_it_cannot_find() {
    let out = map_of(
        &["sys", "gone-1", "sys"],
        &["gone-2", "ext"],
        &["gone-1", "gone-3", "other"],
    );
    assert_eq!(
        error(&out),
        "dangling reference: gone-2",
        "the message is the first one, pinned before opened before hidden"
    );
    assert_eq!(
        out["dangling"],
        json!(["gone-2", "gone-1", "gone-3"]),
        "all of them, each once, in the order they are checked"
    );
    // a map whose lists are all known has no such key, and neither has a map that fails for another reason
    assert!(map_of(&["sys"], &["ext"], &["other"])
        .get("dangling")
        .is_none());
    let elsewhere = compute(json!({
        "viewpoint": "map", "layer": "application", "pinned": ["a"],
        "elements": [{ "reference": "a", "relationships": [{ "destination": "z" }] }]
    }));
    assert_eq!(error(&elsewhere), "dangling reference: z");
    assert!(
        elsewhere.get("dangling").is_none(),
        "the lists are not what failed: {elsewhere}"
    );
    // the other viewpoints have no lists
    let overview = run("overview", "nowhere", &[]);
    assert!(overview.get("dangling").is_none(), "{overview}");
}

#[test]
fn a_reference_that_led_nowhere_before_the_facet_is_left_alone() {
    let kept = after_removing(shop(), "$.application..elements[?(@.id == 'cart')]");
    assert_eq!(
        destinations(&kept, "/application/elements/2/relationships"),
        ["ghost"],
        "it is still the author's mistake to see"
    );
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
    let kept = after_removing(
        workspace.clone(),
        "$.application.elements[?(@.id == 'a' || @.id == 'b')]",
    );
    assert_eq!(
        kept["application"]["elements"],
        json!([{ "id": "c", "relationships": [] }])
    );
    // one action after the other: the second one reads what the first left
    let request = json!({ "workspace": workspace, "actions": [
        { "operator": "REMOVE", "json_path": "$.application.elements[?(@.id == 'b')]" },
        { "operator": "REMOVE", "json_path": "$.application.elements[?(@.relationships[?(@.destination == 'b')])]" }
    ] });
    let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
    assert_eq!(
        out["workspace"]["application"]["elements"][0]["id"], "a",
        "a lost its link to b before the second action looked: it stays"
    );
    assert_eq!(
        out["workspace"]["application"]["elements"]
            .as_array()
            .unwrap()
            .len(),
        2,
        "{out}"
    );
}

#[test]
fn a_facet_that_removes_only_relationships_or_nothing_changes_nothing_else() {
    let workspace = shop();
    let kept = after_removing(
        workspace.clone(),
        "$.application..relationships[?(@.destination == 'shop.catalog')]",
    );
    assert_eq!(
        destinations(&kept, "/application/elements/0/elements/0/relationships"),
        ["shop.catalog.items", "shop.cart", "payments"]
    );
    assert_eq!(
        after_removing(
            workspace.clone(),
            "$.application..elements[?(@.id == 'nobody')]"
        ),
        workspace
    );
    assert_eq!(
        after_removing(
            workspace.clone(),
            "$.application..relationships[?(@.destination == 'nobody')]"
        ),
        workspace
    );
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
    let kept = after_removing(
        deployed_model(),
        "$.application.elements[?(@.id == 'shop')]",
    );
    assert_eq!(
        kept["technology"]["elements"][0]["elements"][0]["applications"],
        json!(["registry"]),
        "shop.api and shop.web are not deployed any more"
    );
    assert_eq!(
        kept["technology"]["elements"][0]["uses"],
        json!(["int", "int.a", "registry"]),
        "a name of the other layer is not a reference to it"
    );
    assert_eq!(
        kept["technology"]["elements"][1]["elements"][0]["applications"],
        json!(["registry"])
    );
}

#[test]
fn removing_an_environment_or_a_node_removes_the_entries_of_uses_that_name_it() {
    let kept = after_removing(deployed_model(), "$.technology.elements[?(@.id == 'int')]");
    assert_eq!(
        kept["technology"]["elements"][0]["uses"],
        json!(["registry"]),
        "int and int.a, which was inside it"
    );
    assert_eq!(
        kept["application"],
        deployed_model()["application"],
        "the applications are untouched"
    );
    let kept = after_removing(
        deployed_model(),
        "$.technology.elements[?(@.id == 'int')].elements[?(@.id == 'a')]",
    );
    assert_eq!(
        kept["technology"]["elements"][0]["uses"],
        json!(["int", "registry"])
    );
    assert_eq!(
        kept["technology"]["elements"][0]["elements"][0]["applications"],
        json!(["shop.api", "shop.web", "registry"])
    );
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
    assert!(out["items"]
        .as_array()
        .unwrap()
        .iter()
        .all(|i| i["reference"] != "s.catalog"));
    // technology layer: the application leaves the node that hosted it
    let out = environments(
        "dev",
        json!(["int"]),
        json!({ "facet": { "name": "f", "actions": remove("$.application.elements[?(@.id == 'ext')]") } }),
    );
    assert!(out.get("error").is_none(), "{out}");
    assert!(
        out["links"].as_array().unwrap().is_empty() && !has_item(&out, "a_ext_registry"),
        "{out}"
    );
    // an environment that is used and removed
    let out = environments(
        "dev",
        json!(["int", "prd"]),
        json!({ "facet": { "name": "f", "actions": remove("$.technology.elements[?(@.id == 'int')]") } }),
    );
    assert!(out.get("error").is_none(), "{out}");
    assert!(
        link_between(&out, "app_shop_api", "a_ext_registry") && !has_item(&out, "int.a"),
        "{out}"
    );
}

#[test]
fn an_operator_inside_a_quoted_literal_is_part_of_the_literal() {
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(@.label == 'reads || writes')]"),
    );
    assert_eq!(
        out["links"].as_array().unwrap().len(),
        3,
        "nothing is called like that: nothing is removed"
    );
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(@.label == \"reads\")]"),
    );
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
    let out = compute(
        json!({ "viewpoint": "deep", "layer": "application", "focal": "n.m", "elements": [{ "reference": "n.m" }] }),
    );
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
                assert!(
                    out.get("error").is_some() || out.get("items").is_some(),
                    "{viewpoint} {layer} {focal}: {out}"
                );
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
    assert_eq!(
        (l["label"].clone(), l["synthetic"].clone()),
        (json!("uses"), json!(true)),
        "the default label"
    );
    assert_eq!(l["qualifiers"], json!(["x"]));
    let out = compute(json!({
        "viewpoint": "facet", "layer": "application", "focal": "a", "facet": { "actions": null },
        "elements": [{ "reference": "a" }]
    }));
    assert!(
        error(&out).contains("unsupported viewpoint"),
        "a facet without actions is read, then the viewpoint is refused"
    );
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
    let deep = compute(
        json!({ "viewpoint": "deep", "layer": "application", "focal": "sys", "elements": elements }),
    );
    assert_eq!(ids(&deep), ["ext", "sys", "sys.a"]);
    assert_eq!(deep["links"].as_array().unwrap().len(), 1);
    let overview = compute(
        json!({ "viewpoint": "overview", "layer": "application", "focal": "sys", "elements": elements }),
    );
    assert_eq!(ids(&overview), ["ext", "sys"]);
    let detailed = compute(
        json!({ "viewpoint": "detailed", "layer": "application", "focal": "sys", "elements": elements }),
    );
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
    assert_eq!(
        (ids(&opened), &opened["links"]),
        (ids(&out), &out["links"]),
        "and indeed opening it changes nothing"
    );
    assert_eq!(
        item(&out, "big")["expandable"],
        true,
        "big hides big.x, where a reads"
    );
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
    assert_eq!(
        item(&out, "other")["expandable"],
        false,
        "no relationship reaches other.y"
    );
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
    assert_eq!(
        item(&out, "sys.b")["expandable"],
        false,
        "it is the focal of its own overview, and no one reaches into it"
    );
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
        let out = compute(
            json!({ "viewpoint": viewpoint, "layer": "application", "focal": "a", "elements": elements }),
        );
        let links = out["links"].as_array().unwrap();
        assert_eq!(links.len(), 3, "{viewpoint}: {out}");
        for l in links {
            assert_eq!(
                l["relationships"].as_array().unwrap().len(),
                1,
                "{viewpoint}: each link stands for its own relationship"
            );
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
    let out = compute(
        json!({ "viewpoint": "overview", "layer": "application", "focal": "s", "elements": elements }),
    );
    let l = link(&out, "s", "o").unwrap();
    assert_eq!(
        l["label"], "uses",
        "two relationships that differ by their tags do not read the same"
    );
    let tags: Vec<String> = l["relationships"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| r["tags"].to_string())
        .collect();
    assert_eq!(tags, ["{\"k\":\"1\"}", "{\"k\":\"2\"}"]);
    // folding regroups them in the same way
    let out = compute(
        json!({ "viewpoint": "deep", "layer": "application", "focal": "s", "collapsed": ["s"], "elements": elements }),
    );
    assert_eq!(link(&out, "s", "o").unwrap()["label"], "uses");
    // and with the same tags they read the same
    let same = json!([
        { "reference": "s", "parent": true },
        { "reference": "s.a", "relationships": [{ "destination": "o", "label": "x", "tags": { "k": "1" } }] },
        { "reference": "s.b", "relationships": [{ "destination": "o", "label": "x", "tags": { "k": "1" } }] },
        { "reference": "o" }
    ]);
    let out = compute(
        json!({ "viewpoint": "deep", "layer": "application", "focal": "s", "collapsed": ["s"], "elements": same }),
    );
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
    let out = deployment(
        json!([
            { "reference": "prod", "parent": true },
            { "reference": "prod.pod", "applications": ["shop.api"], "relationships": [{ "destination": "prod.vm" }] },
            { "reference": "prod.vm", "applications": ["shop.db"] }
        ]),
        json!([]),
    );
    assert_eq!(
        ids(&out),
        ["pod_shop_api", "prod", "prod.pod", "prod.vm", "vm_shop_db"]
    );
    assert_eq!(item(&out, "pod_shop_api")["parent"], "prod.pod");
    assert!(
        link(&out, "pod_shop_api", "vm_shop_db").unwrap()["secondary"]
            .as_bool()
            .unwrap()
    );
}

#[test]
fn nodes_of_the_same_name_hosting_the_same_application_get_distinct_items() {
    let out = deployment(
        json!([
            { "reference": "prod", "parent": true },
            { "reference": "prod.a", "parent": true },
            { "reference": "prod.a.pod", "applications": ["shop.api"], "relationships": [{ "destination": "prod.c.pod" }] },
            { "reference": "prod.b", "parent": true },
            { "reference": "prod.b.pod", "applications": ["shop.api"], "relationships": [{ "destination": "prod.c.pod" }] },
            { "reference": "prod.c", "parent": true },
            { "reference": "prod.c.pod", "applications": ["shop.db"] }
        ]),
        json!([]),
    );
    let items = out["items"].as_array().unwrap();
    let app_items: Vec<(&str, &str)> = items
        .iter()
        .filter(|i| i["reference"] != i["id"])
        .map(|i| (i["id"].as_str().unwrap(), i["parent"].as_str().unwrap()))
        .collect();
    assert_eq!(
        app_items,
        [
            ("pod_shop_db", "prod.c.pod"),
            ("prod_a_pod_shop_api", "prod.a.pod"),
            ("prod_b_pod_shop_api", "prod.b.pod"),
        ],
        "the unique id is kept, the colliding ones carry the path of their node"
    );
    let all: HashSet<&str> = items.iter().map(|i| i["id"].as_str().unwrap()).collect();
    assert_eq!(all.len(), items.len(), "an id is one box");
    // both instances are linked to the database
    assert!(
        link(&out, "prod_a_pod_shop_api", "pod_shop_db").is_some()
            && link(&out, "prod_b_pod_shop_api", "pod_shop_db").is_some()
    );
}

#[test]
fn a_deployed_application_item_never_takes_the_id_of_another_item() {
    // `pod_shop_api` is also the reference of a node of the view
    let out = deployment(
        json!([
            { "reference": "prod", "parent": true },
            { "reference": "prod.pod", "applications": ["shop.api"], "relationships": [{ "destination": "pod_shop_api" }] },
            { "reference": "pod_shop_api" }
        ]),
        json!([]),
    );
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
    let link = link(&out, "app_shop_api", "a_ext_registry")
        .expect("the dependency is drawn between the deployed applications");
    assert!(
        !link["secondary"].as_bool().unwrap(),
        "unlike a link inside an environment, it is drawn"
    );
    assert_eq!(link["label"], "reads patients from");
    assert_eq!(link["qualifiers"], json!(["REST"]));
    assert_eq!(link["tags"], json!({ "tcp-port": "443" }));
    assert_eq!(link["relationships"][0]["from"], "shop.api");
    assert!(
        link["relationships"][0]["application"].as_bool().unwrap(),
        "declared in the application layer"
    );
    assert_eq!(item(&out, "a_ext_registry")["parent"], "int.a");
    assert!(
        link_between(&out, "app_shop_api", "b_ext_registry"),
        "every host of the application in the used environment"
    );
    assert!(
        !has_item(&out, "prd") && !has_item(&out, "prd.a"),
        "an environment that is not used stays out"
    );
}

#[test]
fn the_overview_of_an_environment_shows_the_environments_it_uses() {
    for viewpoint in ["overview", "detailed"] {
        let out = environments("dev", json!(["int"]), json!({ "viewpoint": viewpoint }));
        let from = if viewpoint == "overview" {
            "dev"
        } else {
            "dev.app"
        };
        let link = link(&out, from, "int").unwrap_or_else(|| {
            panic!("{viewpoint}: the dependency is drawn up to the environments")
        });
        assert_eq!(
            link["label"], "reads patients from",
            "{viewpoint}: it keeps its caption"
        );
        assert_eq!(link["relationships"][0]["from"], "shop.api");
        assert!(
            link["relationships"][0]["application"].as_bool().unwrap(),
            "{viewpoint}: declared in the application layer"
        );
        assert!(
            !has_item(&out, "prd"),
            "{viewpoint}: an environment that is not used stays out"
        );
    }
    let out = environments("dev", json!([]), json!({ "viewpoint": "overview" }));
    assert!(
        out["links"].as_array().unwrap().is_empty(),
        "nothing is used, nothing is shown"
    );
}

#[test]
fn the_overview_of_a_used_environment_shows_who_depends_on_it() {
    let out = environments(
        "int",
        json!(["int"]),
        json!({ "viewpoint": "overview", "elements": [
        { "reference": "dev", "parent": true, "uses": ["int"] },
        { "reference": "dev.app", "applications": ["shop.api"] },
        { "reference": "int", "parent": true },
        { "reference": "int.a", "applications": ["ext.registry"] }
    ] }),
    );
    assert!(
        link_between(&out, "dev", "int"),
        "the dependent environment, linked to the one it uses"
    );
}

#[test]
fn the_overview_of_a_node_shows_what_leaves_it_and_not_what_stays_inside() {
    let out = environments(
        "dev.app",
        json!(["int"]),
        json!({ "viewpoint": "overview" }),
    );
    assert!(
        link_between(&out, "dev.app", "int"),
        "the node hosting the application depends on the environment"
    );
    let inside = environments(
        "dev",
        json!(["int"]),
        json!({ "viewpoint": "overview", "elements": [
        { "reference": "dev", "parent": true, "uses": ["int"] },
        { "reference": "dev.app", "applications": ["shop.api"] },
        { "reference": "dev.db", "applications": ["ext.registry"] },
        { "reference": "int", "parent": true },
        { "reference": "int.a", "applications": ["ext.registry"] }
    ] }),
    );
    assert!(
        inside["links"].as_array().unwrap().is_empty(),
        "what the environment hosts itself wins: nothing leaves it"
    );
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
    assert_eq!(
        ids(&out),
        [
            "dev",
            "dev.ns",
            "dev.ns.quiet",
            "dev.other",
            "dev.other.pod"
        ],
        "all of it, and nothing of the other environment"
    );
    let part = compute(json!({
        "viewpoint": "deep", "layer": "technology", "focal": "dev.ns",
        "elements": [
            { "reference": "dev", "parent": true },
            { "reference": "dev.ns", "parent": true },
            { "reference": "dev.ns.quiet" },
            { "reference": "dev.other", "parent": true }
        ]
    }));
    assert_eq!(
        ids(&part),
        ["dev", "dev.ns", "dev.ns.quiet"],
        "a node is shown with its ancestors and its content, not with its siblings"
    );
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
    assert!(
        link["secondary"].as_bool().unwrap(),
        "inside an environment it is not drawn"
    );
    assert!(link["label"].is_null());

    let flow = input(json!({ "application_links": true }));
    let drawn: Vec<&Value> = flow["links"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|l| !l["secondary"].as_bool().unwrap())
        .collect();
    assert_eq!(drawn.len(), 2, "one link per relationship, drawn");
    assert!(drawn.iter().any(|l| l["label"] == "calls"
        && l["qualifiers"] == json!(["REST"])
        && l["tags"] == json!({ "flow": "yes" })));
    assert_eq!(drawn[0]["relationships"][0]["from"], "shop.web");
    assert!(drawn[0]["relationships"][0]["application"]
        .as_bool()
        .unwrap());

    let faceted = input(json!({ "facet": { "name": "flow", "actions": [
        { "operator": "REMOVE", "json_path": "$.application..relationships[?(@.tags.flow != 'yes')]" }
    ] } }));
    let drawn: Vec<&Value> = faceted["links"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|l| !l["secondary"].as_bool().unwrap())
        .collect();
    assert_eq!(
        drawn.len(),
        1,
        "through a facet the flow is drawn, and only the flow"
    );
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
    assert!(
        link_between(&shown, "dev.front", "dev.back") && has_item(&shown, "dev.data"),
        "the option off: the link, and the child with no link"
    );

    let detailed = flow("detailed", "dev");
    let link = link(&detailed, "dev.front", "dev.back")
        .expect("the dependency is lifted to the children of the focal element");
    assert_eq!(link["label"], "calls");
    assert!(link["relationships"][0]["application"].as_bool().unwrap());
    assert_eq!(
        ids(&detailed),
        ["dev", "dev.back", "dev.front"],
        "the child with no link is left out"
    );

    let deep = flow("deep", "dev");
    assert!(
        link_between(&deep, "web_shop_web", "api_shop_api"),
        "the applications are linked"
    );
    assert!(
        !has_item(&deep, "dev.data") && !has_item(&deep, "db_shop_db"),
        "what the flow does not go through is left out"
    );
    assert!(
        has_item(&deep, "dev.front") && has_item(&deep, "dev.back"),
        "what encloses the ends is kept"
    );

    let overview = flow("overview", "dev.front");
    assert!(
        link_between(&overview, "dev.front", "dev.back"),
        "what leaves a node is its dependency on the other nodes"
    );
    assert_eq!(ids(&overview), ["dev", "dev.back", "dev.front"]);

    let alone = flow("overview", "dev.data");
    assert_eq!(
        ids(&alone),
        ["dev", "dev.data"],
        "the focal element is always there, with nothing around it"
    );
}

#[test]
fn an_environment_that_uses_nothing_reaches_nothing() {
    for uses in [json!([]), json!(null)] {
        let out = environments("dev", uses, json!({}));
        assert!(out["links"].as_array().unwrap().is_empty());
        assert_eq!(
            ids(&out),
            ["app_shop_api", "dev", "dev.app"],
            "the environment is shown with what it is made of, linked to nothing"
        );
    }
}

#[test]
fn an_environment_can_use_a_node_of_another_one_only() {
    let out = environments("dev", json!(["int.b", "prd"]), json!({}));
    assert!(
        link_between(&out, "app_shop_api", "b_ext_registry")
            && link_between(&out, "app_shop_api", "a_ext_registry")
    );
    assert!(!has_item(&out, "int.a"), "the sibling node is not used");
}

#[test]
fn what_an_environment_hosts_itself_wins_over_what_it_uses() {
    let out = environments(
        "dev",
        json!(["int"]),
        json!({
            "elements": [
                { "reference": "dev", "parent": true, "uses": ["int"] },
                { "reference": "dev.app", "applications": ["shop.api"] },
                { "reference": "dev.db", "applications": ["ext.registry"] },
                { "reference": "int", "parent": true },
                { "reference": "int.a", "applications": ["ext.registry"] }
            ]
        }),
    );
    assert!(
        out["links"]
            .as_array()
            .unwrap()
            .iter()
            .all(|l| l["secondary"].as_bool().unwrap()),
        "the application is found in the environment: nothing leaves it"
    );
    assert!(
        !has_item(&out, "int.a"),
        "the used environment is not even drawn"
    );
}

#[test]
fn the_view_of_a_used_environment_shows_who_depends_on_it() {
    let out = environments("int", json!(["int.a"]), json!({}));
    let link =
        link(&out, "app_shop_api", "a_ext_registry").expect("seen from the used environment");
    assert_eq!(link["relationships"][0]["from"], "shop.api");
    assert_eq!(item(&out, "app_shop_api")["parent"], "dev.app");
    assert!(
        !link_between(&out, "app_shop_api", "b_ext_registry"),
        "only what is used is linked"
    );
}

#[test]
fn the_dependencies_between_environments_fold_with_their_nodes() {
    let out = environments(
        "dev",
        json!(["int"]),
        json!({ "collapsed": ["dev.app", "int.a", "int.b"] }),
    );
    let grouped = link(&out, "dev.app", "int.a").expect("grouped under the folded nodes");
    assert!(grouped["synthetic"].as_bool().unwrap());
    assert_eq!(
        grouped["label"], "reads patients from",
        "the caption of a single relationship is kept"
    );
    assert!(link(&out, "dev.app", "int.b").is_some());
}

/// `dev.app` hosts the container `shop.app`, which has no relationship of its own: its component `shop.app.payments` calls `ext.registry`
/// (hosted by `int.a`), and also `shop.app.cart` (internal) and `ext.other` (hosted by `dev.db`, the same environment).
fn descendants(viewpoint: &str, focal: &str, extra: Value) -> Value {
    let mut input = json!({
        "viewpoint": viewpoint, "layer": "technology", "focal": focal,
        "elements": [
            { "reference": "dev", "parent": true, "uses": ["int"] },
            { "reference": "dev.app", "applications": ["shop.app"] },
            { "reference": "dev.db", "applications": ["ext.other"] },
            { "reference": "int", "parent": true },
            { "reference": "int.a", "applications": ["ext.registry"] }
        ],
        "app_elements": [
            { "reference": "shop", "parent": true },
            { "reference": "shop.app" },
            { "reference": "shop.app.payments", "relationships": [
                { "destination": "ext.registry", "label": "charges", "qualifiers": ["REST"] },
                { "destination": "shop.app.cart", "label": "reads" },
                { "destination": "ext.other", "label": "reads" }
            ] },
            { "reference": "shop.app.cart" },
            { "reference": "ext", "parent": true },
            { "reference": "ext.registry" },
            { "reference": "ext.other" }
        ]
    });
    for (key, value) in extra.as_object().cloned().unwrap_or_default() {
        input[key] = value;
    }
    compute(input)
}

#[test]
fn the_relationships_of_what_is_inside_a_deployed_application_are_dependencies_of_its_node() {
    let out = descendants("deep", "dev", json!({}));
    let found = link(&out, "app_shop_app", "a_ext_registry")
        .expect("the box of the container is linked through its component");
    assert_eq!(found["label"], "charges");
    assert_eq!(found["qualifiers"], json!(["REST"]));
    assert_eq!(
        found["relationships"][0]["from"], "shop.app.payments",
        "the relationship says who declares it"
    );
    assert!(found["relationships"][0]["application"].as_bool().unwrap());
    assert_eq!(
        out["links"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|l| !l["secondary"].as_bool().unwrap())
            .count(),
        1,
        "the internal and the same-environment ones are no dependency"
    );
    for viewpoint in ["overview", "detailed"] {
        let out = descendants(viewpoint, "dev", json!({}));
        let from = if viewpoint == "overview" {
            "dev"
        } else {
            "dev.app"
        };
        let l = link(&out, from, "int").unwrap_or_else(|| {
            panic!("{viewpoint}: the node that hosts the container depends on the environment")
        });
        assert_eq!(l["relationships"][0]["from"], "shop.app.payments");
    }
}

#[test]
fn several_descendants_with_the_same_relationship_fold_into_one_link_as_before() {
    let out = descendants(
        "deep",
        "dev",
        json!({ "app_elements": [
        { "reference": "shop", "parent": true },
        { "reference": "shop.app", "relationships": [ { "destination": "ext.registry", "label": "charges", "qualifiers": ["REST"] } ] },
        { "reference": "shop.app.payments", "relationships": [ { "destination": "ext.registry", "label": "charges", "qualifiers": ["REST"] } ] },
        { "reference": "shop.app.cart", "relationships": [ { "destination": "ext.registry", "label": "asks" } ] },
        { "reference": "ext", "parent": true },
        { "reference": "ext.registry" },
        { "reference": "ext.other" }
    ] }),
    );
    let drawn: Vec<&Value> = out["links"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|l| !l["secondary"].as_bool().unwrap())
        .collect();
    assert_eq!(
        drawn.len(),
        2,
        "one link per caption, as for any relationships"
    );
    let charges = drawn
        .iter()
        .find(|l| l["label"] == "charges")
        .unwrap_or_else(|| panic!("{out}"));
    assert_eq!(
        charges["relationships"].as_array().unwrap().len(),
        2,
        "both declarers are listed in the one link"
    );
}

#[test]
fn the_map_of_the_technology_layer_takes_the_dependencies_of_the_descendants() {
    let out = descendants("map", "", json!({ "opened": ["dev", "int"] }));
    let drawn = out["links"].as_array().unwrap().iter().any(|l| {
        l["relationships"]
            .as_array()
            .unwrap()
            .iter()
            .any(|r| r["from"] == "shop.app.payments" && r["destination"] == "ext.registry")
    });
    assert!(drawn, "{out}");
}

/// Issue #139 (decision T5), the other end: `dev.app` hosts `shop.app`, whose component `payments` calls `ext.registry.client`, a
/// component of the application `int.a` hosts; `shop.app.cart` calls `ext.other.sub`, inside the application `dev.db` hosts; `shop.app.audit`
/// calls `shop.app.cart` (internal) and `ext.nowhere.x` (inside no deployed application).
fn toward_inside(viewpoint: &str, focal: &str, extra: Value) -> Value {
    let mut input = json!({
        "viewpoint": viewpoint, "layer": "technology", "focal": focal,
        "elements": [
            { "reference": "dev", "parent": true, "uses": ["int"] },
            { "reference": "dev.app", "applications": ["shop.app"] },
            { "reference": "dev.db", "applications": ["ext.other"] },
            { "reference": "int", "parent": true },
            { "reference": "int.a", "applications": ["ext.registry"] }
        ],
        "app_elements": [
            { "reference": "shop", "parent": true },
            { "reference": "shop.app" },
            { "reference": "shop.app.payments", "relationships": [ { "destination": "ext.registry.client", "label": "charges" } ] },
            { "reference": "shop.app.cart", "relationships": [ { "destination": "ext.other.sub", "label": "stores" } ] },
            { "reference": "shop.app.audit", "relationships": [ { "destination": "shop.app.cart", "label": "reads" }, { "destination": "ext.nowhere.x", "label": "lost" } ] },
            { "reference": "ext", "parent": true },
            { "reference": "ext.registry" },
            { "reference": "ext.registry.client" },
            { "reference": "ext.other" },
            { "reference": "ext.other.sub" },
            { "reference": "ext.nowhere", "parent": true },
            { "reference": "ext.nowhere.x" }
        ]
    });
    for (key, value) in extra.as_object().cloned().unwrap_or_default() {
        input[key] = value;
    }
    compute(input)
}

#[test]
fn a_relationship_towards_the_inside_of_a_deployed_application_is_a_dependency_towards_its_node() {
    let out = toward_inside("deep", "dev", json!({}));
    let found = link(&out, "app_shop_app", "a_ext_registry").expect(
        "the box of the container is linked to the box of the application that holds the component",
    );
    assert_eq!(found["label"], "charges");
    assert_eq!(found["relationships"][0]["from"], "shop.app.payments");
    assert_eq!(
        found["relationships"][0]["destination"], "ext.registry.client",
        "the relationship says what it ends on"
    );
    assert!(!found["secondary"].as_bool().unwrap());
    assert_eq!(
        out["links"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|l| !l["secondary"].as_bool().unwrap())
            .count(),
        1,
        "internal, same-environment and undeployed ends give nothing: {out}"
    );
    for viewpoint in ["overview", "detailed"] {
        let out = toward_inside(viewpoint, "dev", json!({}));
        let from = if viewpoint == "overview" {
            "dev"
        } else {
            "dev.app"
        };
        let l = link(&out, from, "int")
            .unwrap_or_else(|| panic!("{viewpoint}: the node depends on the environment: {out}"));
        assert_eq!(l["relationships"][0]["destination"], "ext.registry.client");
    }
}

#[test]
fn the_map_of_the_technology_layer_takes_the_dependencies_towards_the_inside() {
    let out = toward_inside(
        "map",
        "",
        json!({ "opened": ["dev", "int", "dev.app", "int.a"] }),
    );
    let l = link(&out, "app_shop_app", "a_ext_registry").unwrap_or_else(|| panic!("{out}"));
    assert_eq!(l["relationships"][0]["destination"], "ext.registry.client");
    let closed = toward_inside("map", "", json!({ "opened": [] }));
    assert!(
        link(&closed, "dev", "int").is_some(),
        "grouped under the closed boxes: {closed}"
    );
}

#[test]
fn the_secondary_links_read_what_is_inside_the_deployed_element_on_both_ends() {
    let out = toward_inside("deep", "dev", json!({}));
    let secondary: Vec<&Value> = out["links"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|l| l["secondary"].as_bool().unwrap())
        .collect();
    assert_eq!(secondary.len(), 1, "the component of shop.app towards a component of ext.other, on another node of the environment: {out}");
    assert_eq!(
        (secondary[0]["from"].as_str(), secondary[0]["to"].as_str()),
        (Some("app_shop_app"), Some("db_ext_other"))
    );
    assert_eq!(secondary[0]["relationships"][0]["from"], "shop.app.cart");
    assert!(
        secondary[0]["label"].is_null(),
        "not drawn, so not captioned"
    );
    let flow = toward_inside("deep", "dev", json!({ "application_links": true }));
    let drawn = link(&flow, "app_shop_app", "db_ext_other").expect("a flow draws it");
    assert_eq!(drawn["label"], "stores");
    let overview = toward_inside("overview", "dev.app", json!({ "application_links": true }));
    let l = link(&overview, "dev.app", "dev.db").unwrap_or_else(|| panic!("{overview}"));
    assert_eq!(l["relationships"][0]["from"], "shop.app.cart");
}

#[test]
fn a_facet_that_removes_the_relationship_removes_the_dependency() {
    let facet = json!({ "facet": { "name": "f", "actions": [
        { "operator": "REMOVE", "json_path": "$.application..relationships[?(@.tags['tcp-port'] == '443')]" }
    ] } });
    let out = environments("dev", json!(["int"]), facet);
    assert!(
        out["links"].as_array().unwrap().is_empty(),
        "nothing is left to derive the dependency from"
    );
}

#[test]
fn a_facet_can_take_an_environment_out_of_the_ones_that_are_used() {
    let facet = json!({ "facet": { "name": "f", "actions": [
        { "operator": "REMOVE", "json_path": "$.technology.elements[?(@.id == 'dev')].uses[?(@ == 'int')]" }
    ] } });
    let out = environments("dev", json!(["int", "prd"]), facet);
    assert!(
        link_between(&out, "app_shop_api", "a_ext_registry"),
        "prd.a"
    );
    assert!(!has_item(&out, "int.a"));
}

#[test]
fn a_dangling_environment_in_uses_is_an_error() {
    let out = environments("dev", json!(["nowhere"]), json!({}));
    assert_eq!(out["error"], "dangling reference: nowhere");
}

// ---- the earlier dialect (Jayway): refused since 0.17, the cases are shared with the Java and the node tests ----

const DIALECT_CASES: &str =
    include_str!("../../../../test/javascript/viewpoint-kernel/facet-dialect-cases.json");

#[test]
fn the_earlier_dialect_is_refused_with_the_standard_form() {
    let cases: Value = serde_json::from_str(DIALECT_CASES).unwrap();
    for case in cases["refused"].as_array().unwrap() {
        let (id, path, sentence) = (
            case["id"].as_str().unwrap(),
            case["path"].as_str().unwrap(),
            case["error"].as_str().unwrap(),
        );
        assert_eq!(
            facet::refuse_legacy(path),
            Err(sentence.to_string()),
            "{id}"
        );
        // by compute (the editor's way in) and by apply_facet (the CLI's), the same sentence, and nothing is drawn
        let out = with_facet("deep", "a", "application", remove(path));
        assert_eq!(error(&out), sentence, "{id}: {out}");
        let request =
            json!({ "workspace": { "application": { "elements": [] } }, "actions": remove(path) });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert_eq!(error(&out), sentence, "{id}: {out}");
    }
    for path in cases["accepted"].as_array().unwrap() {
        assert_eq!(
            facet::refuse_legacy(path.as_str().unwrap()),
            Ok(()),
            "{path}"
        );
    }
}

#[test]
fn a_standard_facet_says_no_warning() {
    let out = with_facet(
        "deep",
        "a",
        "application",
        remove("$..relationships[?(@.qualifiers[?(@ == 'REST')])]"),
    );
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
    assert_eq!(
        kept["settings"], workspace["settings"],
        "the rest of the workspace is untouched"
    );
    assert_eq!(
        kept["application"]["elements"][0]["relationships"],
        json!([{ "destination": "t", "label": "x" }])
    );
    assert_eq!(
        kept["application"]["elements"][0]["elements"][0]["relationships"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    let request = json!({ "workspace": workspace, "actions": remove("$..relationships[?(@.tags['audited'] != 'yes')]") });
    let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
    assert_eq!(
        out["workspace"]["application"]["elements"][0]["relationships"],
        json!([{ "destination": "t", "tags": { "audited": "yes" } }])
    );
    assert!(
        out["workspace"]["application"]["elements"][0]["elements"][0]
            .get("relationships")
            .is_none()
            || out["workspace"]["application"]["elements"][0]["elements"][0]["relationships"]
                == json!([])
    );
    let request = json!({ "workspace": workspace, "actions": remove("$.application.elements[?(@.id == 't')]") });
    let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
    assert_eq!(
        out["workspace"]["application"]["elements"]
            .as_array()
            .unwrap()
            .len(),
        1,
        "an element can be removed too"
    );
    let out: Value = serde_json::from_str(&apply_facet_json(
        &json!({ "workspace": workspace, "actions": [{ "operator": "KEEP", "json_path": "$" }] })
            .to_string(),
    ))
    .unwrap();
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
    assert_eq!(
        out["workspace"]["application"]["elements"][0]["relationships"],
        json!([{ "destination": "z", "label": "2" }, { "destination": "z", "label": "4" }])
    );
    let request = json!({ "workspace": workspace, "actions": remove("$..elements[?(@.id == 'b' || @.id == 'z' || @.relationships)]") });
    let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
    assert_eq!(
        out["workspace"]["application"]["elements"],
        json!([{ "id": "c" }])
    );
}

#[test]
fn the_workspace_keeps_the_order_of_its_keys() {
    let request = r#"{"workspace":{"styles":{"by-tags":{"external":{"b":1},"new":{"a":1},"changed":{"c":1}}},"application":{"elements":[{"id":"z","tags":{"tag-y":"1","tag-a":"2"}}]}},"actions":[]}"#;
    let out = apply_facet_json(request);
    let at = |needle: &str| {
        out.find(needle)
            .unwrap_or_else(|| panic!("{needle} in {out}"))
    };
    assert!(
        at("\"external\"") < at("\"new\"") && at("\"new\"") < at("\"changed\""),
        "{out}"
    );
    assert!(at("tag-y") < at("tag-a"), "{out}");
    assert!(at("\"styles\"") < at("\"application\""), "{out}");
}

// ---- stereotypes ----

fn stereotypes(out: &Value, id: &str) -> Value {
    out["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["id"] == id)
        .unwrap_or_else(|| panic!("item {id} in {out}"))["stereotypes"]
        .clone()
}

fn with_properties(properties: Value) -> Value {
    let mut element = json!({ "reference": "a" });
    for (key, value) in properties.as_object().unwrap() {
        element[key] = value.clone();
    }
    compute(
        json!({ "viewpoint": "overview", "layer": "application", "focal": "a", "elements": [element, { "reference": "b" }] }),
    )
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
    let out = with_properties(
        json!({ "qualifiers": ["Spring Boot", "PostgreSQL"], "tags": { "rendering-stereotypes": "  new\tchanged  " } }),
    );
    assert_eq!(
        stereotypes(&out, "a"),
        json!(["Spring Boot", "PostgreSQL", "new", "changed"])
    );
}

#[test]
fn a_stereotype_is_named_once_wherever_it_comes_from() {
    let out = with_properties(
        json!({ "qualifiers": ["external", "external"], "tags": { "rendering-stereotypes": "changed external changed" } }),
    );
    assert_eq!(stereotypes(&out, "a"), json!(["external", "changed"]));
}

#[test]
fn an_element_that_says_nothing_has_no_stereotype() {
    let out = with_properties(json!({}));
    assert_eq!(stereotypes(&out, "a"), json!([]));
    let out = with_properties(
        json!({ "qualifiers": null, "tags": { "rendering-stereotypes": "", "other": "x" } }),
    );
    assert_eq!(
        stereotypes(&out, "a"),
        json!([]),
        "empty, or another tag, or a null: nothing"
    );
    let out =
        with_properties(json!({ "qualifiers": ["", "q"], "tags": { "rendering-stereotypes": 3 } }));
    assert_eq!(
        stereotypes(&out, "a"),
        json!(["q"]),
        "an empty qualifier and a tag that is not a text are left out"
    );
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
    assert_eq!(
        stereotypes(&out, "app_shop_api"),
        json!(["Quarkus", "external", "changed"])
    );
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

// ---- the map of the technology layer draws the deployed applications and the dependencies they give (wave 016, run 0114, issue #107) ----

/// Two environments: `dev` hosts `shop.api` (calls `shop.db` on the same node and `ext.registry`, in `int`), and uses `int`; `int` hosts `ext.registry` on two nodes and
/// declares a relationship of its own between nodes. `prd` is not used.
fn technology_map(extra: Value) -> Value {
    let mut input = json!({
        "viewpoint": "map", "layer": "technology",
        "elements": [
            { "reference": "dev", "parent": true, "uses": ["int"] },
            { "reference": "dev.app", "applications": ["shop.api", "shop.db"] },
            { "reference": "int", "parent": true },
            { "reference": "int.a", "applications": ["ext.registry"], "relationships": [{ "destination": "int.b", "label": "replicates to" }] },
            { "reference": "int.b", "applications": ["ext.registry"] },
            { "reference": "prd", "parent": true },
            { "reference": "prd.a", "applications": ["ext.registry"] }
        ],
        "app_elements": [
            { "reference": "shop", "parent": true },
            { "reference": "shop.api", "relationships": [{ "destination": "shop.db", "label": "reads" }, { "destination": "ext.registry", "label": "looks up" }] },
            { "reference": "shop.db" },
            { "reference": "ext", "parent": true },
            { "reference": "ext.registry" }
        ]
    });
    for (key, value) in extra.as_object().cloned().unwrap_or_default() {
        input[key] = value;
    }
    compute(input)
}

fn link_ids(out: &Value) -> Vec<String> {
    let mut links: Vec<String> = out["links"]
        .as_array()
        .unwrap()
        .iter()
        .map(|l| {
            format!(
                "{} -> {}",
                l["from"].as_str().unwrap(),
                l["to"].as_str().unwrap()
            )
        })
        .collect();
    links.sort();
    links
}

#[test]
fn the_technology_map_draws_the_applications_inside_the_nodes_that_are_open_and_the_dependencies_they_give(
) {
    // everything folded: the dependency of an application of `dev` on one of `int` is a link between the environments, and the nodes that host applications can be opened
    let out = technology_map(json!({}));
    assert_eq!(ids(&out), ["dev", "int", "prd"]);
    assert_eq!(link_ids(&out), ["dev -> int"]);
    let dependency = link(&out, "dev", "int").unwrap();
    assert!(
        dependency["synthetic"].as_bool().unwrap(),
        "the ends are the first closed boxes, not the applications: it is grouped"
    );
    assert_eq!(dependency["relationships"][0]["from"], "shop.api");
    assert!(dependency["relationships"][0]["application"]
        .as_bool()
        .unwrap());
    // opened down to the nodes: the nodes only, then the applications once a node is open
    let out = technology_map(json!({ "opened": ["dev", "int"] }));
    assert_eq!(
        ids(&out),
        ["dev", "dev.app", "int", "int.a", "int.b", "prd"]
    );
    assert!(
        item(&out, "dev.app")["expandable"].as_bool().unwrap(),
        "a node that hosts applications can be opened"
    );
    assert!(
        item(&out, "prd")["expandable"].as_bool().unwrap(),
        "prd has a node to open"
    );
    assert_eq!(
        link_ids(&out),
        ["dev.app -> int.a", "dev.app -> int.b", "int.a -> int.b"]
    );
    let out = technology_map(json!({ "opened": ["dev", "int", "dev.app", "int.a"] }));
    assert_eq!(
        ids(&out),
        [
            "app_shop_api",
            "app_shop_db",
            "dev",
            "dev.app",
            "int",
            "int.a",
            "int.b",
            "int_a_ext_registry",
            "prd"
        ]
    );
    assert_eq!(item(&out, "app_shop_api")["parent"], "dev.app");
    assert_eq!(item(&out, "app_shop_api")["reference"], "shop.api");
    assert_eq!(item(&out, "int_a_ext_registry")["parent"], "int.a");
    assert!(
        !item(&out, "app_shop_api")["expandable"].as_bool().unwrap(),
        "an application box has nothing to open"
    );
    // an application box is the end of the dependency when it is drawn, the node when it is not (int.b is open: its application is not drawn, the node is open and folded of it)
    let links = link_ids(&out);
    assert!(
        links.contains(&"app_shop_api -> int_a_ext_registry".to_string()),
        "{links:?}"
    );
    assert!(
        !links.contains(&"app_shop_api -> app_shop_db".to_string()),
        "inside an environment the dependencies stay out: {links:?}"
    );
    assert!(
        links.contains(&"app_shop_api -> int.b".to_string()),
        "int.b is a node whose application is not drawn: {links:?}"
    );
    assert_eq!(
        link(&out, "app_shop_api", "int_a_ext_registry").unwrap()["label"],
        "looks up"
    );
    assert!(
        !link(&out, "app_shop_api", "int_a_ext_registry").unwrap()["synthetic"]
            .as_bool()
            .unwrap(),
        "both ends are the boxes of the applications"
    );
    assert!(
        !link(&out, "app_shop_api", "int.b").unwrap()["synthetic"]
            .as_bool()
            .unwrap(),
        "a node is the real end of the dependency when its application is not drawn"
    );
    assert!(
        link(&out, "int.a", "int.b").is_some(),
        "what a node declares is still drawn"
    );
}

#[test]
fn the_technology_map_hides_the_applications_or_the_relationships_on_request() {
    let all = json!({ "opened": ["dev", "int", "dev.app", "int.a"] });
    let without_applications = technology_map(
        json!({ "opened": ["dev", "int", "dev.app", "int.a"], "applications": false }),
    );
    assert_eq!(
        ids(&without_applications),
        ["dev", "dev.app", "int", "int.a", "int.b", "prd"]
    );
    assert_eq!(
        link_ids(&without_applications),
        ["dev.app -> int.a", "dev.app -> int.b", "int.a -> int.b"],
        "the dependencies stay, between the nodes that host the applications"
    );
    assert!(
        !item(&without_applications, "dev.app")["expandable"]
            .as_bool()
            .unwrap(),
        "an open node with no application to show has nothing to open"
    );
    let mut without_relationships = all.clone();
    without_relationships["relationships"] = json!(false);
    let out = technology_map(without_relationships);
    assert!(
        out["links"].as_array().unwrap().is_empty(),
        "neither the declared relationships nor the dependencies"
    );
    assert_eq!(
        ids(&out).len(),
        9,
        "the boxes are the same with the links or without"
    );
    let mut neither = all.clone();
    neither["relationships"] = json!(false);
    neither["applications"] = json!(false);
    let out = technology_map(neither);
    assert!(out["links"].as_array().unwrap().is_empty());
    assert_eq!(
        ids(&out),
        ["dev", "dev.app", "int", "int.a", "int.b", "prd"]
    );
    // null is "not given": both are drawn
    let drawn = technology_map(
        json!({ "opened": ["dev", "dev.app"], "applications": null, "relationships": null }),
    );
    assert!(has_item(&drawn, "app_shop_api"));
}

#[test]
fn the_technology_map_only_derives_what_the_environment_uses() {
    // `prd` is not used by `dev`: nothing leads to it, and `int` is reached through `uses` only
    let out = technology_map(json!({ "opened": ["dev", "int", "prd", "dev.app"] }));
    assert!(
        link_ids(&out).iter().all(|l| !l.contains("prd.")),
        "{:?}",
        link_ids(&out)
    );
    // an environment that uses nothing reaches nothing
    let mut input = json!({ "opened": ["dev", "int", "dev.app"] });
    input["elements"] = json!([
        { "reference": "dev", "parent": true },
        { "reference": "dev.app", "applications": ["shop.api"] },
        { "reference": "int", "parent": true },
        { "reference": "int.a", "applications": ["ext.registry"] }
    ]);
    let out = technology_map(input);
    assert!(
        out["links"].as_array().unwrap().is_empty(),
        "uses is a scope, never a link: {:?}",
        link_ids(&out)
    );
}

#[test]
fn the_technology_map_changes_nothing_without_the_application_layer_or_in_the_application_layer() {
    // no `app_elements`: the nodes are drawn as they were, with the relationships they declare
    let bare = compute(json!({
        "viewpoint": "map", "layer": "technology", "opened": ["dev", "int", "dev.app"],
        "elements": [
            { "reference": "dev", "parent": true, "uses": ["int"] },
            { "reference": "dev.app", "applications": ["shop.api"] },
            { "reference": "int", "parent": true },
            { "reference": "int.a", "applications": ["ext.registry"], "relationships": [{ "destination": "int.b" }] },
            { "reference": "int.b" }
        ]
    }));
    assert_eq!(ids(&bare), ["dev", "dev.app", "int", "int.a", "int.b"]);
    assert_eq!(link_ids(&bare), ["int.a -> int.b"]);
    assert!(!item(&bare, "dev.app")["expandable"].as_bool().unwrap());
    // the application layer is a map of its own: the two keys mean nothing there
    let a = map_of(&["sys"], &[], &[]);
    let mut with_keys = json!({
        "viewpoint": "map", "layer": "application", "opened": ["sys"], "applications": false, "relationships": true,
        "elements": [
            { "reference": "sys", "parent": true },
            { "reference": "sys.a", "relationships": [{ "destination": "other.b.c", "label": "calls" }, { "destination": "sys.b", "label": "feeds" }] },
            { "reference": "sys.b", "relationships": [{ "destination": "other.b.c", "label": "calls" }] },
            { "reference": "other", "parent": true },
            { "reference": "other.b", "parent": true },
            { "reference": "other.b.c" },
            { "reference": "ext", "relationships": [{ "destination": "sys.b", "label": "pushes" }] }
        ]
    });
    with_keys["app_elements"] = json!([{ "reference": "z" }]);
    assert_eq!(compute(with_keys.clone()), a);
    with_keys["relationships"] = json!(false);
    assert_eq!(
        compute(with_keys),
        a,
        "`relationships: false` means nothing in the map of the application layer either"
    );
}

#[test]
fn the_technology_map_hides_and_pins_the_nodes_the_applications_are_on() {
    let out = technology_map(
        json!({ "opened": ["dev", "int", "dev.app", "int.a"], "hidden": ["int.a"] }),
    );
    assert!(
        !has_item(&out, "int_a_ext_registry") && !has_item(&out, "int.a"),
        "what is inside a hidden node goes with it"
    );
    assert!(
        link_ids(&out).iter().all(|l| !l.contains("int.a")),
        "{:?}",
        link_ids(&out)
    );
    assert!(link_between(&out, "app_shop_api", "int.b"));
    // pinned on a node: the applications on it, the links that touch it, the boxes at their other end folded
    let out = technology_map(json!({ "pinned": ["dev.app"], "opened": ["dev.app"] }));
    assert_eq!(
        ids(&out),
        ["app_shop_api", "app_shop_db", "dev", "dev.app", "int"]
    );
    assert_eq!(link_ids(&out), ["app_shop_api -> int"]);
    // an ancestor of what is pinned is open, its other nodes are not drawn, and neither are their applications
    let out = technology_map(json!({ "pinned": ["int.a"] }));
    assert!(
        !has_item(&out, "int_a_ext_registry"),
        "int.a is pinned, not open"
    );
    assert_eq!(
        ids(&out),
        ["dev", "int", "int.a", "int.b"],
        "int.b is the other end of what int.a declares"
    );
}

#[test]
fn a_deployed_application_box_of_the_map_is_named_after_its_node_and_never_takes_another_id() {
    let out = technology_map(json!({ "opened": ["dev", "int", "dev.app", "int.a", "int.b"] }));
    let apps: Vec<(String, String)> = out["items"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|i| i["id"] != i["reference"])
        .map(|i| {
            (
                i["id"].as_str().unwrap().to_string(),
                i["parent"].as_str().unwrap().to_string(),
            )
        })
        .collect();
    // `ext.registry` is on `int.a` and `prd.a`: the same short id, so both carry the path of their node, drawn or not; the one on `int.b` is alone of its name
    assert!(
        apps.contains(&("int_a_ext_registry".to_string(), "int.a".to_string())),
        "{apps:?}"
    );
    assert!(
        apps.contains(&("b_ext_registry".to_string(), "int.b".to_string())),
        "{apps:?}"
    );
    assert!(
        apps.contains(&("app_shop_api".to_string(), "dev.app".to_string())),
        "{apps:?}"
    );
    // the id of a box does not depend on what is open
    let some = technology_map(json!({ "opened": ["dev", "int", "int.a"] }));
    assert!(has_item(&some, "int_a_ext_registry") && !has_item(&some, "b_ext_registry"));
    // and it never takes the reference of an element
    let clash = compute(json!({
        "viewpoint": "map", "layer": "technology", "opened": ["prod", "prod.pod"],
        "elements": [{ "reference": "prod", "parent": true }, { "reference": "prod.pod", "applications": ["shop.api"] }, { "reference": "pod_shop_api" }],
        "app_elements": [{ "reference": "shop", "parent": true }, { "reference": "shop.api" }]
    }));
    assert_eq!(item(&clash, "prod_pod_shop_api")["reference"], "shop.api");
    // an application the layer does not have is an error, as in the deep viewpoint
    let dangling = compute(json!({
        "viewpoint": "map", "layer": "technology", "opened": ["prod", "prod.pod"],
        "elements": [{ "reference": "prod", "parent": true }, { "reference": "prod.pod", "applications": ["ghost"] }],
        "app_elements": [{ "reference": "shop" }]
    }));
    assert_eq!(dangling["error"], "dangling application reference: ghost");
}

#[test]
fn the_technology_map_tells_what_changed_on_the_applications_and_the_links_between_them() {
    let out = technology_map(json!({
        "opened": ["dev", "int", "dev.app", "int.a"],
        "elements": [
            { "reference": "dev", "parent": true, "uses": ["int"], "change": "none" },
            { "reference": "dev.app", "applications": ["shop.api"], "change": "none" },
            { "reference": "int", "parent": true, "change": "none" },
            { "reference": "int.a", "applications": ["ext.registry"], "change": "none" }
        ],
        "app_elements": [
            { "reference": "shop", "parent": true, "change": "none" },
            { "reference": "shop.api", "change": "new", "relationships": [{ "destination": "ext.registry", "label": "looks up", "change": "new" }] },
            { "reference": "ext", "parent": true, "change": "none" },
            { "reference": "ext.registry", "change": "none" }
        ]
    }));
    assert_eq!(item(&out, "app_shop_api")["change"], "new");
    assert_eq!(item(&out, "a_ext_registry")["change"], "none");
    assert_eq!(
        link(&out, "app_shop_api", "a_ext_registry").unwrap()["change"],
        "new"
    );
    assert!(item(&out, "app_shop_api")["stereotypes"]
        .as_array()
        .unwrap()
        .iter()
        .any(|s| s == "new"));
    // only what changed, with the boxes around it
    let only = technology_map(json!({
        "opened": ["dev", "int", "dev.app", "int.a"], "only_changes": true,
        "elements": [
            { "reference": "dev", "parent": true, "uses": ["int"], "change": "none" },
            { "reference": "dev.app", "applications": ["shop.api"], "change": "none" },
            { "reference": "int", "parent": true, "change": "none" },
            { "reference": "int.a", "applications": ["ext.registry"], "change": "none" }
        ],
        "app_elements": [
            { "reference": "shop", "parent": true, "change": "none" },
            { "reference": "shop.api", "change": "new", "relationships": [{ "destination": "ext.registry", "change": "new" }] },
            { "reference": "ext", "parent": true, "change": "none" },
            { "reference": "ext.registry", "change": "none" }
        ]
    }));
    assert_eq!(
        ids(&only),
        [
            "a_ext_registry",
            "app_shop_api",
            "dev",
            "dev.app",
            "int",
            "int.a"
        ]
    );
    assert!(item(&only, "a_ext_registry")["context"].as_bool().unwrap());
}

/// `e` hosts `c` on `e.a_b` and `b_c` on `e.a`: both read `a_b_c` when named after the last segment of their node and the application, and
/// `e_a_b_c` when named after the whole path of their node: the same word again.
fn two_applications_with_one_name(viewpoint: &str, extra: Value) -> Value {
    let mut input = json!({
        "viewpoint": viewpoint, "layer": "technology", "focal": "e",
        "elements": [
            { "reference": "e", "parent": true },
            { "reference": "e.a_b", "applications": ["c"] },
            { "reference": "e.a", "applications": ["b_c"] }
        ],
        "app_elements": [{ "reference": "c" }, { "reference": "b_c" }]
    });
    for (key, value) in extra.as_object().cloned().unwrap_or_default() {
        input[key] = value;
    }
    compute(input)
}

#[test]
fn two_boxes_that_would_have_one_id_in_the_technology_map_are_numbered_in_the_order_of_the_nodes_of_the_file(
) {
    let out = two_applications_with_one_name("map", json!({ "opened": ["e", "e.a_b", "e.a"] }));
    assert_eq!(ids(&out), ["e", "e.a", "e.a_b", "e_a_b_c", "e_a_b_c_2"]);
    assert_eq!(item(&out, "e_a_b_c")["reference"], "c");
    assert_eq!(item(&out, "e_a_b_c")["parent"], "e.a_b");
    assert_eq!(item(&out, "e_a_b_c_2")["reference"], "b_c");
    assert_eq!(item(&out, "e_a_b_c_2")["parent"], "e.a");
}

#[test]
fn two_boxes_that_would_have_one_id_in_the_deep_viewpoint_are_numbered_in_the_order_of_the_nodes_of_the_view(
) {
    let out = two_applications_with_one_name("deep", json!({}));
    assert_eq!(ids(&out), ["e", "e.a", "e.a_b", "e_a_b_c", "e_a_b_c_2"]);
    // the nodes of the view come in the order of their references: `e.a` before `e.a_b`
    assert_eq!(item(&out, "e_a_b_c")["reference"], "b_c");
    assert_eq!(item(&out, "e_a_b_c")["parent"], "e.a");
    assert_eq!(item(&out, "e_a_b_c_2")["reference"], "c");
    assert_eq!(item(&out, "e_a_b_c_2")["parent"], "e.a_b");
}

// ---- the `links` of a map: draw only the relationships an author names (wave 026, run 0197, #143) ----

const MAP_LINKS_CASES: &str =
    include_str!("../../../../test/javascript/viewpoint-kernel/map-links-cases.json");

fn map_links_table() -> Value {
    serde_json::from_str(MAP_LINKS_CASES).expect("map-links-cases.json is JSON")
}

/// The input of the case: the map of its workspace, the keys of `input` merged in, `links` left out when `with_links` is false.
fn map_links_input(table: &Value, case: &Value, with_links: bool) -> Value {
    let mut input = json!({
        "viewpoint": "map", "layer": "application",
        "elements": table["workspaces"][case["workspace"].as_str().unwrap()].clone()
    });
    for (key, value) in case["input"].as_object().unwrap() {
        if with_links || key != "links" {
            input[key] = value.clone();
        }
    }
    input
}

fn map_links_drawn(out: &Value) -> (Vec<String>, Vec<String>) {
    let mut items = ids(out);
    items.sort();
    let mut links: Vec<String> = out["links"]
        .as_array()
        .unwrap_or_else(|| panic!("no links in {out}"))
        .iter()
        .map(|l| {
            let (from, to) = (l["from"].as_str().unwrap(), l["to"].as_str().unwrap());
            match l["label"].as_str() {
                Some(label) => format!("{from}>{to}:{label}"),
                None => format!("{from}>{to}"),
            }
        })
        .collect();
    links.sort();
    (items, links)
}

fn strings(value: &Value) -> Vec<String> {
    let mut all: Vec<String> = value
        .as_array()
        .unwrap()
        .iter()
        .map(|s| s.as_str().unwrap().to_string())
        .collect();
    all.sort();
    all
}

fn check_map_links_case(name: &str) {
    let table = map_links_table();
    let case = table["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["name"] == name)
        .unwrap_or_else(|| panic!("no case {name} in map-links-cases.json"));
    let out = compute(map_links_input(&table, case, true));
    let expect = &case["expect"];
    if expect["same_as_without_links"] == true {
        let without = compute(map_links_input(&table, case, false));
        assert_eq!(
            out, without,
            "{name}: the map is drawn as if there were no links"
        );
    } else if let Some(sentence) = expect["error"].as_str() {
        assert_eq!(error(&out), sentence, "{name}: {out}");
    } else if let Some(prefix) = expect["error_prefix"].as_str() {
        assert!(error(&out).starts_with(prefix), "{name}: {out}");
    } else {
        assert!(out.get("error").is_none(), "{name}: {out}");
        let (items, links) = map_links_drawn(&out);
        assert_eq!(
            items,
            strings(&expect["items"]),
            "{name}: the boxes of {out}"
        );
        assert_eq!(
            links,
            strings(&expect["links"]),
            "{name}: the links of {out}"
        );
    }
    if expect.get("error").is_some() || expect.get("error_prefix").is_some() {
        match expect.get("dangling") {
            Some(dangling) => assert_eq!(&out["dangling"], dangling, "{name}: {out}"),
            None => assert!(out.get("dangling").is_none(), "{name}: {out}"),
        }
    }
}

macro_rules! map_links_cases {
    ($($name:ident),* $(,)?) => {
        $(
            #[test]
            fn $name() {
                check_map_links_case(stringify!($name));
            }
        )*
        const MAP_LINKS_CASE_NAMES: &[&str] = &[$(stringify!($name)),*];
    };
}

map_links_cases!(
    one_link,
    two_links_sharing_an_end,
    an_end_inside_a_closed_box,
    an_opened_box_keeps_only_what_a_link_reaches,
    hidden_drops_the_relationship_but_the_entry_still_matches,
    pinned_keeps_the_links_that_touch_it,
    a_pinned_element_no_link_reaches_is_drawn_with_what_is_open_inside_it,
    two_relationships_of_one_triple_are_shown_together,
    no_label_matches_the_relationship_with_no_label,
    a_label_matches_only_that_label_after_trimming,
    an_unknown_end,
    an_unknown_destination,
    an_empty_source,
    no_match,
    no_match_without_a_label,
    an_exact_match_on_references_not_on_descendants,
    both_ends_in_one_closed_box_draw_no_link_and_no_box,
    both_ends_in_one_closed_box_draw_the_box_when_it_is_pinned,
    both_ends_in_one_closed_box_draw_the_box_when_another_link_reaches_it,
    a_repeated_entry_is_harmless,
    the_technology_layer_refuses_links,
    the_technology_refusal_comes_before_the_shape,
    the_shape_comes_before_the_ends,
    an_entry_with_a_label_that_is_not_text,
    an_entry_that_is_not_a_mapping,
    the_ends_come_before_the_match,
    the_lists_come_before_the_ends_of_the_links,
    links_empty_is_links_absent,
    links_null_is_links_absent,
    a_union_with_a_removed_relationship_can_name_it,
);

#[test]
fn every_case_of_the_map_links_table_has_a_test_and_the_other_way_round() {
    let table = map_links_table();
    let mut in_table: Vec<&str> = table["cases"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["name"].as_str().unwrap())
        .collect();
    let mut tested: Vec<&str> = MAP_LINKS_CASE_NAMES.to_vec();
    in_table.sort_unstable();
    tested.sort_unstable();
    assert_eq!(in_table, tested);
}
