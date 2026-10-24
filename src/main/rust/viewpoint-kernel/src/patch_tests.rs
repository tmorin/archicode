//! The tests of `apply_patches`. The cases are in `src/test/javascript/viewpoint-kernel/patch-cases.json` and are the same
//! ones `patches.test.js` runs through the embedded WebAssembly: a case is a call on the shared workspace, and it expects
//! either an error (the exact sentence, or pieces of it) or the workspace that results (the base with `edits` applied) and the
//! report of each patch. The tests below the cases are for what a list of cases cannot say.
use super::*;
use serde_json::{json, Value};

const CASES: &str = include_str!("../../../../test/javascript/viewpoint-kernel/patch-cases.json");

fn pointer_parent<'a>(doc: &'a mut Value, pointer: &str) -> (&'a mut Value, String) {
    let (parent, last) = pointer.rsplit_once('/').expect("a pointer has a slash");
    (
        doc.pointer_mut(parent)
            .unwrap_or_else(|| panic!("no node at {parent}")),
        last.to_string(),
    )
}

/// `set`, `append` and `remove` at a JSON pointer: how a case says what its workspace is, from the base.
fn edit(doc: &mut Value, step: &Value) {
    if let Some(pointer) = step.get("set").and_then(Value::as_str) {
        let (parent, last) = pointer_parent(doc, pointer);
        let value = step["value"].clone();
        match parent {
            Value::Object(object) => {
                object.insert(last, value);
            }
            Value::Array(list) => list[last.parse::<usize>().unwrap()] = value,
            _ => panic!("cannot set at {pointer}"),
        }
    } else if let Some(pointer) = step.get("append").and_then(Value::as_str) {
        doc.pointer_mut(pointer)
            .and_then(Value::as_array_mut)
            .unwrap_or_else(|| panic!("no list at {pointer}"))
            .push(step["value"].clone());
    } else if let Some(pointer) = step.get("remove").and_then(Value::as_str) {
        let (parent, last) = pointer_parent(doc, pointer);
        match parent {
            Value::Object(object) => {
                assert!(
                    object.remove(&last).is_some(),
                    "nothing to remove at {pointer}"
                );
            }
            Value::Array(list) => {
                list.remove(last.parse::<usize>().unwrap());
            }
            _ => panic!("cannot remove at {pointer}"),
        }
    } else {
        panic!("an edit is a set, an append or a remove: {step}");
    }
}

fn call(workspace: &Value, case: &Value) -> Value {
    let mut request = json!({ "workspace": workspace, "patches": case["patches"] });
    if let Some(plateau) = case.get("plateau") {
        request["plateau"] = plateau.clone();
    }
    serde_json::from_str(&apply_patches_json(&request.to_string())).expect("the answer is JSON")
}

#[test]
fn every_case_of_the_shared_list_gives_its_workspace_and_its_reports_or_its_error() {
    let file: Value = serde_json::from_str(CASES).expect("the list of cases is JSON");
    let base = &file["workspace"];
    let cases = file["cases"].as_array().expect("cases");
    assert!(cases.len() > 60, "the list is not empty");
    for case in cases {
        let name = case["name"].as_str().unwrap();
        let out = call(base, case);
        if case.get("error").is_some() || case.get("error_contains").is_some() {
            let message = out["error"]
                .as_str()
                .unwrap_or_else(|| panic!("{name}: expected an error, got {out}"));
            if let Some(exact) = case.get("error").and_then(Value::as_str) {
                assert_eq!(message, exact, "{name}");
            }
            for piece in case
                .get("error_contains")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                assert!(
                    message.contains(piece.as_str().unwrap()),
                    "{name}: {message:?} does not contain {piece}"
                );
            }
            assert_eq!(
                out.get("patch"),
                case.get("error_patch"),
                "{name}: error.patch"
            );
            assert!(
                out.get("workspace").is_none(),
                "{name}: an error returns no workspace"
            );
        } else {
            assert!(out.get("error").is_none(), "{name}: {out}");
            let mut expected = base.clone();
            for step in case["edits"]
                .as_array()
                .expect("a case without an error has edits")
            {
                edit(&mut expected, step);
            }
            assert_eq!(out["workspace"], expected, "{name}: workspace");
            assert_eq!(out["patches"], case["reports"], "{name}: reports");
            assert_eq!(out["version"], CONTRACT_VERSION, "{name}");
        }
    }
}

fn workspace() -> Value {
    serde_json::from_str::<Value>(CASES).unwrap()["workspace"].clone()
}

#[test]
fn a_patch_keeps_the_order_of_the_keys_of_the_workspace_and_of_the_element() {
    let request = json!({ "workspace": workspace(), "patches": [
        { "operator": "SET", "target": "shop", "field": "name", "value": "Store" },
        { "operator": "SET", "target": "shop", "field": "owner", "value": "team-a" }
    ]});
    let out = apply_patches_json(&request.to_string());
    let (name, application, styles) = (
        out.find("\"name\":\"Demo\"").unwrap(),
        out.find("\"application\"").unwrap(),
        out.find("\"styles\"").unwrap(),
    );
    assert!(name < application && application < styles, "{out}");
    let shop = &out[out.find("\"id\":\"shop\"").unwrap()..];
    // the replaced field stays where it was, the new one comes last
    assert!(shop.find("\"name\":\"Store\"").unwrap() < shop.find("\"description\"").unwrap());
    assert!(shop.find("\"elements\"").unwrap() < shop.find("\"owner\"").unwrap());
}

#[test]
fn the_same_input_gives_the_same_bytes() {
    let request = json!({ "workspace": workspace(), "plateau": "saas", "patches": [
        { "operator": "REMOVE", "target": "shop" },
        { "operator": "MERGE", "json-path": "$.application..elements[?(@.id == 'tax')]", "field": "tags", "value": { "a": "b" } }
    ]})
    .to_string();
    let first = apply_patches_json(&request);
    assert!(first.contains("\"patches\""), "{first}");
    assert_eq!(first, apply_patches_json(&request));
}

#[test]
fn a_call_without_patches_gives_the_workspace_back() {
    for request in [
        json!({ "workspace": workspace() }),
        json!({ "workspace": workspace(), "patches": null }),
        json!({ "workspace": workspace(), "patches": [] }),
    ] {
        let out: Value = serde_json::from_str(&apply_patches_json(&request.to_string())).unwrap();
        assert_eq!(out["workspace"], workspace());
        assert_eq!(out["patches"], json!([]));
        assert_eq!(out["version"], CONTRACT_VERSION);
    }
}

#[test]
fn what_is_not_a_request_is_an_error_not_a_trap() {
    for (input, piece) in [
        ("{", "invalid input"),
        ("{}", "missing field `workspace`"),
        (
            r#"{"workspace":[],"patches":[]}"#,
            "`workspace` is a list, not an object",
        ),
        (r#"{"workspace":{},"patches":{}}"#, "invalid input"),
        (r#"{"workspace":{},"patches":[],"extra":1}"#, ""),
    ] {
        let out: Value = serde_json::from_str(&apply_patches_json(input)).unwrap();
        if piece.is_empty() {
            // an unknown key of the request is ignored, like the other entry points
            assert!(out.get("error").is_none(), "{out}");
        } else {
            assert!(
                out["error"].as_str().unwrap().contains(piece),
                "{input}: {out}"
            );
            assert!(out.get("patch").is_none());
        }
    }
}

#[test]
fn a_reference_that_led_nowhere_before_is_not_touched_by_a_removal() {
    let mut ws = workspace();
    ws["application"]["elements"][0]["elements"][2]["relationships"] =
        json!([{ "destination": "nowhere" }]);
    let out: Value = serde_json::from_str(&apply_patches_json(
        &json!({ "workspace": ws, "patches": [{ "operator": "REMOVE", "target": "tax" }] })
            .to_string(),
    ))
    .unwrap();
    assert_eq!(
        out["workspace"]["application"]["elements"][0]["elements"][2]["relationships"],
        json!([{ "destination": "nowhere" }])
    );
    assert_eq!(
        out["patches"][0]["dropped"].as_array().unwrap().len(),
        3,
        "only what pointed at tax"
    );
}

#[test]
fn a_field_taken_out_leaves_the_other_keys_of_the_element_in_their_order() {
    let request = json!({ "workspace": workspace(), "patches": [{ "operator": "REMOVE", "target": "shop", "field": "name" }]});
    let out = apply_patches_json(&request.to_string());
    let shop = &out[out.find("\"id\":\"shop\"").unwrap()..];
    // `shop` is {id, kind, name, description, elements}: taking `name` out keeps id, kind, description, elements in that order
    let (kind, description, elements) = (
        shop.find("\"kind\"").unwrap(),
        shop.find("\"description\"").unwrap(),
        shop.find("\"elements\"").unwrap(),
    );
    assert!(kind < description && description < elements, "{out}");
    assert!(
        !out[out.find("\"id\":\"shop\"").unwrap()..out.find("\"id\":\"web\"").unwrap()]
            .contains("\"name\""),
        "{out}"
    );
}

#[test]
fn a_field_taken_out_is_not_a_removal_and_leaves_no_cascade() {
    let request = json!({ "workspace": workspace(), "patches": [{ "operator": "REMOVE", "target": "prod.vm", "layer": "technology", "field": "applications" }]});
    let out: Value = serde_json::from_str(&apply_patches_json(&request.to_string())).unwrap();
    let report = &out["patches"][0];
    assert!(
        report.get("removed").is_none() && report.get("dropped").is_none(),
        "{report}"
    );
    assert_eq!(report["matched"], 1);
    // the same element, without the key, and every other element as it was
    assert!(out["workspace"]["technology"]["elements"][0]["elements"][0]
        .get("applications")
        .is_none());
    assert_eq!(out["workspace"]["application"], workspace()["application"]);
}

// ---- run 0143 (issue #125): the patches of a plateau read the references of the document as few times as they need ----
// The oracle is the plain rule: every patch alone, on the workspace the one before left. A run of patches keeps what it counted between them, and must give the same
// workspace and the same reports.

/// A workspace with an element declared twice (`dup`), an element with no `id` (and one inside it), a nesting three deep, and links in both layers.
fn counted_workspace() -> Value {
    json!({
        "application": { "elements": [
            { "id": "a", "kind": "system", "relationships": [{ "destination": "b.c" }, { "destination": "dup" }, { "destination": "keep" }], "elements": [
                { "id": "x", "kind": "container", "relationships": [{ "destination": "b.c.d" }] } ] },
            { "id": "b", "kind": "system", "elements": [ { "id": "c", "kind": "container", "elements": [ { "id": "d", "kind": "component" } ] } ] },
            { "id": "dup", "kind": "system" },
            { "id": "dup", "kind": "system", "description": "the second one" },
            { "kind": "system", "elements": [ { "id": "orphan", "kind": "container" } ] },
            { "id": "keep", "kind": "system", "relationships": [{ "destination": "orphan" }] }
        ] },
        "technology": { "elements": [
            { "id": "env", "kind": "environment", "uses": ["env2", "env2.n"], "elements": [ { "id": "n", "kind": "node", "applications": ["a", "b.c", "keep"] } ] },
            { "id": "env2", "kind": "environment", "elements": [ { "id": "n", "kind": "node", "applications": ["dup"] } ] }
        ] }
    })
}

/// The patches one at a time, each on the workspace the one before gave: the reports in order, and the workspace at the end (or the first error).
fn one_by_one(workspace: &Value, patches: &[Value]) -> Value {
    let mut doc = workspace.clone();
    let mut reports = Vec::new();
    for (index, patch) in patches.iter().enumerate() {
        let answer: Value = serde_json::from_str(&apply_patches_json(
            &json!({ "workspace": doc, "patches": [patch] }).to_string(),
        ))
        .unwrap();
        if answer.get("error").is_some() {
            return json!({ "error": answer["error"], "rank": index + 1 });
        }
        let mut report = answer["patches"][0].clone();
        report["rank"] = json!(index + 1);
        reports.push(report);
        doc = answer["workspace"].clone();
    }
    json!({ "workspace": doc, "patches": reports })
}

fn in_one_call(workspace: &Value, patches: &[Value]) -> Value {
    let answer: Value = serde_json::from_str(&apply_patches_json(
        &json!({ "workspace": workspace, "patches": patches }).to_string(),
    ))
    .unwrap();
    if let Some(error) = answer.get("error") {
        let rank = answer["patch"]["rank"].clone();
        return json!({ "error": error, "rank": rank });
    }
    json!({ "workspace": answer["workspace"], "patches": answer["patches"] })
}

fn same_as_one_by_one(patches: Vec<Value>) {
    let workspace = counted_workspace();
    let (together, alone) = (
        in_one_call(&workspace, &patches),
        one_by_one(&workspace, &patches),
    );
    // an error sentence names the plateau and the rank: only whether and where it fails is compared
    if together.get("error").is_some() || alone.get("error").is_some() {
        assert_eq!(together["rank"], alone["rank"], "{together}\n{alone}");
        assert_eq!(
            together.get("error").is_some(),
            alone.get("error").is_some()
        );
        return;
    }
    assert_eq!(together, alone);
}

fn remove(target: &str) -> Value {
    json!({ "operator": "REMOVE", "target": target })
}

fn remove_layer(target: &str, layer: &str) -> Value {
    json!({ "operator": "REMOVE", "target": target, "layer": layer })
}

#[test]
fn removals_in_a_row_drop_what_points_at_each_as_one_patch_at_a_time_does() {
    same_as_one_by_one(vec![
        remove("a.x"),
        remove("b.c.d"),
        remove("b.c"),
        remove("keep"),
        remove("a"),
    ]);
    same_as_one_by_one(vec![remove("b"), remove("a.x"), remove("a")]);
    same_as_one_by_one(vec![
        remove("b.c"),
        remove_layer("env.n", "technology"),
        remove_layer("env", "technology"),
    ]);
}

#[test]
fn an_element_declared_twice_is_gone_when_both_are() {
    // the first removal leaves the reference to the second one: nothing points to nowhere yet, so nothing is dropped; the second makes it gone
    same_as_one_by_one(vec![remove("dup"), remove("dup"), remove("a")]);
    same_as_one_by_one(vec![remove("dup"), remove_layer("env2.n", "technology")]);
}

#[test]
fn a_removal_of_a_path_inside_another_in_one_patch_reads_the_document() {
    let path = |p: &str| json!({ "operator": "REMOVE", "json-path": p });
    same_as_one_by_one(vec![
        path("$.application..elements[?(@.id == 'c' || @.id == 'd')]"),
        remove("keep"),
    ]);
    same_as_one_by_one(vec![path("$.application.elements[0:2]"), remove("keep")]);
    same_as_one_by_one(vec![path("$.application"), remove("keep")]);
}

#[test]
fn patches_that_set_with_and_without_a_field_between_removals_leave_the_references_as_one_at_a_time_reads_them(
) {
    let set = |target: &str, field: &str| json!({ "operator": "SET", "target": target, "field": field, "value": "new" });
    same_as_one_by_one(vec![
        remove("b.c.d"),
        set("b.c", "description"),
        remove("b.c"),
        set("keep", "name"),
        remove("a.x"),
    ]);
    // without a field the nodes themselves are replaced: here an element gets another one inside it
    let replace = json!({ "operator": "SET", "json-path": "$.application.elements[2]", "value": { "id": "dup", "kind": "system", "elements": [{ "id": "kid", "kind": "container" }] } });
    same_as_one_by_one(vec![
        remove("a.x"),
        replace.clone(),
        remove("dup.kid"),
        remove("b.c"),
    ]);
    // a patch that renames an element is refused, and a removal before it changes nothing about that
    let rename = json!({ "operator": "SET", "json-path": "$.application.elements[1]", "value": { "id": "other", "kind": "system" } });
    same_as_one_by_one(vec![remove("a.x"), rename, remove("b")]);
}

#[test]
fn removing_a_field_that_is_an_id_is_still_refused_and_a_field_of_an_element_does_not_confuse_the_next_removal(
) {
    let field = |target: &str, field: &str| json!({ "operator": "REMOVE", "target": target, "field": field });
    same_as_one_by_one(vec![
        remove("a.x"),
        field("keep", "relationships"),
        remove("orphan"),
    ]);
    same_as_one_by_one(vec![
        remove("a.x"),
        json!({ "operator": "REMOVE", "json-path": "$.application.elements[5].id" }),
        remove("b"),
    ]);
}

#[test]
fn a_facet_that_removes_an_id_then_an_element_reads_the_references_again() {
    // the actions of a facet run one after the other on what the one before left: one call is the same as one call for each
    let actions = |paths: &[&str]| -> Vec<Value> {
        paths
            .iter()
            .map(|p| json!({ "operator": "REMOVE", "json_path": p }))
            .collect()
    };
    let apply = |workspace: &Value, list: &[Value]| -> Value {
        serde_json::from_str(&apply_facet_json(
            &json!({ "workspace": workspace, "actions": list }).to_string(),
        ))
        .unwrap()
    };
    let paths = [
        "$.application.elements[1].id",
        "$.application.elements[0].elements[0]",
        "$.application.elements[3]",
        "$.application.elements[0].relationships[0]",
        "$.technology.elements[0].elements[0]",
        "$.application.elements[2]",
    ];
    for take in 1..=paths.len() {
        let list = actions(&paths[..take]);
        let together = apply(&counted_workspace(), &list);
        let mut doc = counted_workspace();
        for action in &list {
            doc = apply(&doc, std::slice::from_ref(action))["workspace"].clone();
        }
        assert_eq!(together["workspace"], doc, "after {take} actions");
    }
}

#[test]
fn what_a_removal_says_is_gone_is_what_the_document_no_longer_holds() {
    use super::facet::{remove_nodes, References, Step};
    let name = |n: &str| Step::Name(n.to_string());
    let element = |layer: &str, path: &[usize]| -> Vec<Step> {
        let mut steps = vec![name(layer)];
        for index in path {
            steps.push(name("elements"));
            steps.push(Step::Index(*index));
        }
        steps
    };
    let cases: Vec<Vec<Vec<Step>>> = vec![
        vec![element("application", &[0, 0])],
        vec![
            element("application", &[1]),
            element("application", &[0, 0]),
        ],
        vec![
            element("application", &[1, 0]),
            element("application", &[1]),
        ], // one inside the other
        vec![element("application", &[2])], // declared twice: the other stays
        vec![element("application", &[2]), element("application", &[3])], // both go
        vec![element("application", &[4])], // no `id`, nor its children
        vec![element("application", &[4, 0])],
        vec![element("technology", &[0]), element("application", &[5])],
        vec![vec![name("application")]],
        vec![vec![name("application"), name("elements")]],
        vec![
            element("application", &[0, 0]),
            vec![
                name("application"),
                name("elements"),
                Step::Index(1),
                name("id"),
            ],
        ],
    ];
    for (n, found) in cases.into_iter().enumerate() {
        let mut fast = counted_workspace();
        let mut slow = counted_workspace();
        let before = References::of(&slow);
        let mut counts = None;
        let removal = remove_nodes(
            &mut fast,
            found
                .iter()
                .map(|steps| {
                    steps
                        .iter()
                        .map(|s| match s {
                            Step::Name(x) => name(x),
                            Step::Index(i) => Step::Index(*i),
                        })
                        .collect()
                })
                .collect(),
            &mut counts,
        );
        // the rule: what the document held before and does not hold after, taken out of the document through the same removal without the counts
        let mut sorted = found;
        sorted.sort_unstable_by(|a, b| b.cmp(a));
        sorted.dedup();
        for steps in &sorted {
            let mut node = &mut slow;
            let (last, parents) = steps.split_last().unwrap();
            for step in parents {
                node = match (step, node) {
                    (Step::Name(k), Value::Object(m)) => m.get_mut(k).unwrap(),
                    (Step::Index(i), Value::Array(a)) => a.get_mut(*i).unwrap(),
                    _ => unreachable!(),
                };
            }
            match (last, node) {
                (Step::Name(k), Value::Object(m)) => {
                    m.remove(k);
                }
                (Step::Index(i), Value::Array(a)) => {
                    a.remove(*i);
                }
                _ => unreachable!(),
            }
        }
        let after = References::of(&slow);
        let any_element = sorted.iter().any(|steps| {
            matches!(steps.as_slice(), [_, Step::Name(e), ..] if e == "elements")
                || steps.len() == 1
        });
        if any_element {
            assert!(
                removal.gone.application
                    == before
                        .application
                        .difference(&after.application)
                        .cloned()
                        .collect(),
                "case {n}: application"
            );
            assert!(
                removal.gone.technology
                    == before
                        .technology
                        .difference(&after.technology)
                        .cloned()
                        .collect(),
                "case {n}: technology"
            );
        }
    }
}

/// The error `apply_patches_json` answers for one patch on the shared workspace, with `rank` and `active` added to `shop`.
fn refusal(patch: Value) -> String {
    let mut ws = workspace();
    ws["application"]["elements"][0]["rank"] = json!(3);
    ws["application"]["elements"][0]["active"] = json!(true);
    let request = json!({ "workspace": ws, "plateau": "saas", "patches": [patch] });
    let out: Value = serde_json::from_str(&apply_patches_json(&request.to_string())).unwrap();
    assert!(out.get("workspace").is_none(), "{out}");
    out["error"]
        .as_str()
        .unwrap_or_else(|| panic!("{out}"))
        .to_string()
}

#[test]
fn a_merge_that_is_not_given_an_object_says_what_it_was_given() {
    for (value, said) in [
        (json!(true), "a boolean"),
        (json!(5), "a number"),
        (json!("x"), "a text"),
        (json!([1]), "a list"),
    ] {
        assert_eq!(
            refusal(json!({ "operator": "MERGE", "target": "shop", "field": "tags", "value": value })),
            format!("plateau saas: patch 1 (MERGE target shop): MERGE merges an object: `value` is {said}")
        );
    }
}

#[test]
fn a_where_that_is_not_given_an_object_says_what_it_was_given() {
    let patch = |value: Value| json!({ "operator": "SET", "target": "shop", "field": "relationships", "where": { "destination": "x" }, "value": value });
    assert_eq!(
        refusal(patch(json!(5))),
        "plateau saas: patch 1 (SET target shop): with `where`, `value` is an object (the fields of the relationship to replace), not a number"
    );
    // a null value is no value at all
    assert_eq!(
        refusal(patch(json!(null))),
        "plateau saas: patch 1 (SET target shop): needs a `value`"
    );
}

#[test]
fn merge_and_add_name_the_kind_of_the_field_they_cannot_change() {
    for (field, said) in [
        ("rank", "a number"),
        ("active", "a boolean"),
        ("name", "a text"),
    ] {
        assert_eq!(
            refusal(json!({ "operator": "MERGE", "target": "shop", "field": field, "value": { "a": 1 } })),
            format!("plateau saas: patch 1 (MERGE target shop): `{field}` of shop is {said}, and MERGE merges an object")
        );
        assert_eq!(
            refusal(json!({ "operator": "ADD", "target": "shop", "field": field, "value": "a" })),
            format!("plateau saas: patch 1 (ADD target shop): `{field}` of shop is {said}, and ADD appends to a list")
        );
    }
}

#[test]
fn a_path_that_selects_outside_the_elements_is_refused_with_the_path() {
    for path in ["$", "$.application"] {
        assert_eq!(
            refusal(json!({ "operator": "SET", "json-path": path, "field": "name", "value": "a" })),
            format!("plateau saas: patch 1 (SET json-path {path}): selects a node outside the elements of the two layers: {path}")
        );
    }
}

#[test]
fn a_workspace_that_is_a_list_is_refused_before_any_patch() {
    let request = json!({ "workspace": [1, 2], "plateau": "saas", "patches": [
        { "operator": "SET", "json-path": "$[0]", "field": "name", "value": "a" }] });
    assert_eq!(
        apply_patches_json(&request.to_string()),
        r#"{"error":"invalid input: `workspace` is a list, not an object"}"#
    );
}
