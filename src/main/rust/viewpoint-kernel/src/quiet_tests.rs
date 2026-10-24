//! `quiet` (issue #81): which elements have nothing to draw, in one call. The oracle is the rule the editor applied before it had the entry point: one `compute`
//! per element, and the element is quiet when the answer is an error through a facet, or has no link that is not `secondary`.
use super::*;
use serde_json::{json, Value};

fn remove(path: &str) -> Value {
    json!([{ "operator": "REMOVE", "json_path": path }])
}

/// sys{a, b, lonely}, other{b{c}}, ext, empty{x}. a -calls-> other.b.c, a -feeds-> b, b -calls-> other.b.c, ext -pushes-> b; lonely, empty and x link to nothing.
fn application(extra: Value) -> Value {
    let rel = |dest: &str, label: &str| json!({ "destination": dest, "label": label });
    let mut input = json!({
        "viewpoint": "overview", "layer": "application",
        "elements": [
            { "reference": "sys", "parent": true },
            { "reference": "sys.a", "relationships": [rel("other.b.c", "calls"), rel("sys.b", "feeds")] },
            { "reference": "sys.b", "relationships": [rel("other.b.c", "calls")] },
            { "reference": "sys.lonely" },
            { "reference": "other", "parent": true },
            { "reference": "other.b", "parent": true },
            { "reference": "other.b.c" },
            { "reference": "ext", "relationships": [rel("sys.b", "pushes")] },
            { "reference": "empty", "parent": true },
            { "reference": "empty.x" }
        ]
    });
    for (key, value) in extra.as_object().cloned().unwrap_or_default() {
        input[key] = value;
    }
    input
}

fn references(input: &Value) -> Vec<String> {
    input["elements"]
        .as_array()
        .unwrap()
        .iter()
        .map(|e| e["reference"].as_str().unwrap().to_string())
        .collect()
}

/// What the editor did: one `compute` per element, in the viewpoint it picked for it.
fn one_compute_each(input: &Value, focals: &[(String, Option<&str>)]) -> Vec<String> {
    let through_facet = input.get("facet").is_some_and(|facet| !facet.is_null());
    let mut quiet = Vec::new();
    for (reference, viewpoint) in focals {
        let mut one = input.clone();
        one["focal"] = json!(reference);
        if let Some(viewpoint) = viewpoint {
            one["viewpoint"] = json!(viewpoint);
        }
        let out: Value = serde_json::from_str(&compute_json(&one.to_string())).unwrap();
        let nothing = match out.get("error") {
            Some(_) => through_facet,
            None => !out["links"]
                .as_array()
                .unwrap()
                .iter()
                .any(|link| !link["secondary"].as_bool().unwrap()),
        };
        if nothing {
            quiet.push(reference.clone());
        }
    }
    quiet
}

fn ask(input: &Value, focals: &[(String, Option<&str>)]) -> Value {
    let mut request = input.clone();
    request["focals"] = json!(focals
        .iter()
        .map(|(reference, viewpoint)| match viewpoint {
            Some(viewpoint) => json!({ "reference": reference, "viewpoint": viewpoint }),
            None => json!({ "reference": reference }),
        })
        .collect::<Vec<_>>());
    serde_json::from_str(&quiet_json(&request.to_string())).unwrap()
}

fn quiet_of(answer: &Value) -> Vec<String> {
    assert!(answer.get("error").is_none(), "{answer}");
    assert_eq!(answer["version"], CONTRACT_VERSION);
    answer["quiet"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| r.as_str().unwrap().to_string())
        .collect()
}

fn each(input: &Value) -> Vec<(String, Option<&'static str>)> {
    references(input).into_iter().map(|r| (r, None)).collect()
}

#[test]
fn it_says_what_one_compute_per_element_said_in_every_viewpoint_with_and_without_a_facet() {
    let facets = [
        Value::Null,
        json!({ "name": "no-calls", "actions": remove("$.application..relationships[?(@.label == 'calls')]") }),
        json!({ "name": "no-b", "actions": remove("$.application..elements[?(@.id == 'b')]") }),
        json!({ "name": "no-lonely", "actions": remove("$.application..elements[?(@.id == 'lonely')]") }),
        json!({ "name": "no-sys", "actions": remove("$.application..elements[?(@.id == 'sys')]") }),
        json!({ "name": "nothing", "actions": remove("$.application..relationships[*]") }),
    ];
    for viewpoint in ["overview", "detailed", "deep"] {
        for facet in &facets {
            let input = application(json!({ "viewpoint": viewpoint, "facet": facet }));
            let focals = each(&input);
            let expected = one_compute_each(&input, &focals);
            assert_eq!(
                quiet_of(&ask(&input, &focals)),
                expected,
                "{viewpoint}, facet {facet}"
            );
        }
    }
}

#[test]
fn the_answer_is_not_empty_and_not_everything_for_the_facets_that_matter() {
    let input = application(
        json!({ "facet": { "name": "no-calls", "actions": remove("$.application..relationships[?(@.label == 'calls')]") } }),
    );
    let quiet = quiet_of(&ask(&input, &each(&input)));
    assert!(
        quiet.contains(&"other.b.c".to_string()) && quiet.contains(&"sys.lonely".to_string()),
        "{quiet:?}"
    );
    assert!(
        !quiet.contains(&"sys.a".to_string()) && !quiet.contains(&"ext".to_string()),
        "a still feeds b, ext still pushes to b: {quiet:?}"
    );
}

#[test]
fn a_focal_element_may_say_its_own_viewpoint() {
    // the editor draws a leaf in the overview and a parent in the viewpoint of the tab: detailed on a leaf is an error, and an error is not quiet without a facet
    let input = application(json!({ "viewpoint": "detailed" }));
    let focals: Vec<(String, Option<&str>)> = references(&input)
        .into_iter()
        .map(|r| {
            let leaf = !input["elements"]
                .as_array()
                .unwrap()
                .iter()
                .any(|e| e["reference"] == r.as_str() && e["parent"] == true);
            (r, if leaf { Some("overview") } else { None })
        })
        .collect();
    assert_eq!(
        quiet_of(&ask(&input, &focals)),
        one_compute_each(&input, &focals)
    );
    let leaves_only: Vec<(String, Option<&str>)> = vec![("sys.a".to_string(), None)];
    assert!(
        quiet_of(&ask(&input, &leaves_only)).is_empty(),
        "no facet: detailed on a leaf cannot be built, which is not the same as nothing to draw"
    );
    let through = application(
        json!({ "viewpoint": "detailed", "facet": { "name": "f", "actions": remove("$.application..relationships[?(@.label == 'x')]") } }),
    );
    assert_eq!(
        quiet_of(&ask(&through, &leaves_only)),
        ["sys.a"],
        "through a facet, the same error is what the facet did"
    );
}

#[test]
fn an_element_unknown_to_the_layer_is_an_error_of_its_view_and_quiet_only_through_a_facet() {
    let input = application(json!({}));
    let ghost = vec![("ghost".to_string(), None)];
    assert!(quiet_of(&ask(&input, &ghost)).is_empty());
    let through = application(
        json!({ "facet": { "name": "f", "actions": remove("$.application..relationships[?(@.label == 'x')]") } }),
    );
    assert_eq!(quiet_of(&ask(&through, &ghost)), ["ghost"]);
}

#[test]
fn no_focal_element_is_the_empty_answer() {
    let input = application(json!({}));
    assert!(quiet_of(&ask(&input, &[])).is_empty());
}

#[test]
fn the_links_between_applications_of_an_environment_are_not_drawn_unless_the_view_is_about_a_flow()
{
    // dev hosts shop.api and shop.db, and the first reads the second: a "secondary" link, which the CLI does not draw
    let model = |extra: Value| {
        let mut input = json!({
            "viewpoint": "deep", "layer": "technology",
            "elements": [
                { "reference": "dev", "parent": true },
                { "reference": "dev.app", "applications": ["shop.api", "shop.db"] },
                { "reference": "idle", "parent": true },
                { "reference": "idle.app" }
            ],
            "app_elements": [
                { "reference": "shop", "parent": true },
                { "reference": "shop.api", "relationships": [{ "destination": "shop.db", "label": "reads" }] },
                { "reference": "shop.db" }
            ]
        });
        for (key, value) in extra.as_object().cloned().unwrap_or_default() {
            input[key] = value;
        }
        input
    };
    let plain = model(json!({}));
    let focals = each(&plain);
    assert_eq!(
        quiet_of(&ask(&plain, &focals)),
        one_compute_each(&plain, &focals)
    );
    assert!(
        quiet_of(&ask(&plain, &focals)).contains(&"dev".to_string()),
        "only secondary links: nothing to draw"
    );
    let flow = model(
        json!({ "facet": { "name": "flow", "actions": remove("$.application..relationships[?(@.label == 'x')]") } }),
    );
    assert_eq!(
        quiet_of(&ask(&flow, &focals)),
        one_compute_each(&flow, &focals)
    );
    assert!(
        !quiet_of(&ask(&flow, &focals)).contains(&"dev".to_string()),
        "a facet is a flow: the links are drawn"
    );
}

#[test]
fn a_comparison_is_asked_about_as_a_view_is() {
    let mut input = application(json!({}));
    for element in input["elements"].as_array_mut().unwrap() {
        element["change"] = json!(if element["reference"] == "sys.b" {
            "removed"
        } else {
            "none"
        });
    }
    let focals = each(&input);
    assert_eq!(
        quiet_of(&ask(&input, &focals)),
        one_compute_each(&input, &focals)
    );
    input["only_changes"] = json!(true);
    assert_eq!(
        quiet_of(&ask(&input, &focals)),
        one_compute_each(&input, &focals)
    );
}

#[test]
fn what_cannot_be_read_is_the_one_error_it_is_for_compute() {
    let input = application(json!({}));
    let say = |request: Value| -> String {
        serde_json::from_str::<Value>(&quiet_json(&request.to_string())).unwrap()["error"]
            .as_str()
            .unwrap_or_default()
            .to_string()
    };
    assert!(quiet_json("{").contains("invalid input"));
    assert!(
        say(input.clone()).contains("focals"),
        "the list of the elements to ask about is required"
    );
    let mut request = input.clone();
    request["focals"] = json!("sys");
    assert!(say(request).contains("invalid input"));
    let mut request = input.clone();
    request["focals"] = json!([{ "reference": "sys.a" }]);
    request["viewpoint"] = json!("map");
    assert!(say(request).contains("map has no focal"));
    let mut request = input.clone();
    request["focals"] = json!([{ "reference": "sys.a", "viewpoint": "map" }]);
    assert!(say(request).contains("map has no focal"));
    let mut request = input.clone();
    request["focals"] = json!([{ "reference": "sys.a" }]);
    request["facet"] =
        json!({ "name": "f", "actions": [{ "operator": "KEEP", "json_path": "$" }] });
    assert!(
        !say(request).is_empty(),
        "a facet that fails fails for every element, as it does in compute"
    );
    let mut request = input;
    request["focals"] = json!([{ "reference": "sys.a" }]);
    request["elements"][0]["change"] = json!("sideways");
    assert!(say(request).contains("invalid change"));
}

#[test]
fn the_keys_compare_adds_to_its_union_are_no_free_form_field_here_either() {
    let mut input = application(
        json!({ "facet": { "name": "f", "actions": remove("$.application..elements[?(@.contains_changes == true)]") } }),
    );
    for element in input["elements"].as_array_mut().unwrap() {
        element["contains_changes"] = json!(true);
    }
    let focals = each(&input);
    let quiet = quiet_of(&ask(&input, &focals));
    assert_eq!(quiet, one_compute_each(&input, &focals));
    assert!(
        quiet.len() < focals.len(),
        "the facet selects nothing, because the key is not there: {quiet:?}"
    );
}

#[test]
fn a_facet_that_hides_the_unlinked_boxes_is_asked_about_as_it_is_drawn() {
    let model = |extra: Value| {
        let mut input = json!({
            "viewpoint": "overview", "layer": "technology",
            "elements": [
                { "reference": "dev", "parent": true },
                { "reference": "dev.app", "applications": ["shop.api"] },
                { "reference": "dev.other", "applications": ["shop.db"] },
                { "reference": "idle", "parent": true },
                { "reference": "idle.app" }
            ],
            "app_elements": [
                { "reference": "shop", "parent": true },
                { "reference": "shop.api", "relationships": [{ "destination": "shop.db", "label": "reads" }] },
                { "reference": "shop.db" }
            ]
        });
        for (key, value) in extra.as_object().cloned().unwrap_or_default() {
            input[key] = value;
        }
        input
    };
    for facet in [
        json!({ "name": "unlinked", "hide_unlinked": true, "actions": remove("$.application..relationships[?(@.label == 'x')]") }),
        json!({ "name": "unlinked-cut", "hide_unlinked": true, "actions": remove("$.application..relationships[?(@.label == 'reads')]") }),
    ] {
        let input = model(json!({ "facet": facet }));
        let focals = each(&input);
        assert_eq!(
            quiet_of(&ask(&input, &focals)),
            one_compute_each(&input, &focals),
            "{facet}"
        );
    }
}
