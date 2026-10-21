//! The tests of `apply_patches`. The cases are in `src/test/javascript/viewpoint-kernel/patch-cases.json` and are the same
//! ones `patches.test.js` runs through the embedded WebAssembly: a case is a call on the shared workspace, and it expects
//! either an error (the exact sentence, or pieces of it) or the workspace that results (the base with `edits` applied) and the
//! report of each patch. The tests below the cases are for what a list of cases cannot say.
use super::*;
use serde_json::{json, Value};

const CASES: &str = include_str!("../../../../test/javascript/viewpoint-kernel/patch-cases.json");

fn pointer_parent<'a>(doc: &'a mut Value, pointer: &str) -> (&'a mut Value, String) {
    let (parent, last) = pointer.rsplit_once('/').expect("a pointer has a slash");
    (doc.pointer_mut(parent).unwrap_or_else(|| panic!("no node at {parent}")), last.to_string())
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
        doc.pointer_mut(pointer).and_then(Value::as_array_mut).unwrap_or_else(|| panic!("no list at {pointer}")).push(step["value"].clone());
    } else if let Some(pointer) = step.get("remove").and_then(Value::as_str) {
        let (parent, last) = pointer_parent(doc, pointer);
        match parent {
            Value::Object(object) => {
                assert!(object.remove(&last).is_some(), "nothing to remove at {pointer}");
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
            let message = out["error"].as_str().unwrap_or_else(|| panic!("{name}: expected an error, got {out}"));
            if let Some(exact) = case.get("error").and_then(Value::as_str) {
                assert_eq!(message, exact, "{name}");
            }
            for piece in case.get("error_contains").and_then(Value::as_array).into_iter().flatten() {
                assert!(message.contains(piece.as_str().unwrap()), "{name}: {message:?} does not contain {piece}");
            }
            assert_eq!(out.get("patch"), case.get("error_patch"), "{name}: error.patch");
            assert!(out.get("workspace").is_none(), "{name}: an error returns no workspace");
        } else {
            assert!(out.get("error").is_none(), "{name}: {out}");
            let mut expected = base.clone();
            for step in case["edits"].as_array().expect("a case without an error has edits") {
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
    let (name, application, styles) = (out.find("\"name\":\"Demo\"").unwrap(), out.find("\"application\"").unwrap(), out.find("\"styles\"").unwrap());
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
    for request in [json!({ "workspace": workspace() }), json!({ "workspace": workspace(), "patches": null }), json!({ "workspace": workspace(), "patches": [] })] {
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
        (r#"{"workspace":[],"patches":[]}"#, "`workspace` is a list, not an object"),
        (r#"{"workspace":{},"patches":{}}"#, "invalid input"),
        (r#"{"workspace":{},"patches":[],"extra":1}"#, ""),
    ] {
        let out: Value = serde_json::from_str(&apply_patches_json(input)).unwrap();
        if piece.is_empty() {
            // an unknown key of the request is ignored, like the other entry points
            assert!(out.get("error").is_none(), "{out}");
        } else {
            assert!(out["error"].as_str().unwrap().contains(piece), "{input}: {out}");
            assert!(out.get("patch").is_none());
        }
    }
}

#[test]
fn a_reference_that_led_nowhere_before_is_not_touched_by_a_removal() {
    let mut ws = workspace();
    ws["application"]["elements"][0]["elements"][2]["relationships"] = json!([{ "destination": "nowhere" }]);
    let out: Value = serde_json::from_str(&apply_patches_json(&json!({ "workspace": ws, "patches": [{ "operator": "REMOVE", "target": "tax" }] }).to_string())).unwrap();
    assert_eq!(out["workspace"]["application"]["elements"][0]["elements"][2]["relationships"], json!([{ "destination": "nowhere" }]));
    assert_eq!(out["patches"][0]["dropped"].as_array().unwrap().len(), 3, "only what pointed at tax");
}

#[test]
fn a_field_taken_out_leaves_the_other_keys_of_the_element_in_their_order() {
    let request = json!({ "workspace": workspace(), "patches": [{ "operator": "REMOVE", "target": "shop", "field": "name" }]});
    let out = apply_patches_json(&request.to_string());
    let shop = &out[out.find("\"id\":\"shop\"").unwrap()..];
    // `shop` is {id, kind, name, description, elements}: taking `name` out keeps id, kind, description, elements in that order
    let (kind, description, elements) = (shop.find("\"kind\"").unwrap(), shop.find("\"description\"").unwrap(), shop.find("\"elements\"").unwrap());
    assert!(kind < description && description < elements, "{out}");
    assert!(!out[out.find("\"id\":\"shop\"").unwrap()..out.find("\"id\":\"web\"").unwrap()].contains("\"name\""), "{out}");
}

#[test]
fn a_field_taken_out_is_not_a_removal_and_leaves_no_cascade() {
    let request = json!({ "workspace": workspace(), "patches": [{ "operator": "REMOVE", "target": "prod.vm", "layer": "technology", "field": "applications" }]});
    let out: Value = serde_json::from_str(&apply_patches_json(&request.to_string())).unwrap();
    let report = &out["patches"][0];
    assert!(report.get("removed").is_none() && report.get("dropped").is_none(), "{report}");
    assert_eq!(report["matched"], 1);
    // the same element, without the key, and every other element as it was
    assert!(out["workspace"]["technology"]["elements"][0]["elements"][0].get("applications").is_none());
    assert_eq!(out["workspace"]["application"], workspace()["application"]);
}
