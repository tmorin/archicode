//! Unit tests of the facets (`apply_facet`, `quiet`), moved out of `facet.rs` so that the coverage of the kernel counts production code only.
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
        vec![
            name("application"),
            name("elements"),
            Step::Index(0),
            name("elements"),
        ],
        vec![
            name("technology"),
            name("elements"),
            Step::Index(1),
            name("elements"),
            Step::Index(3),
        ],
    ] {
        assert!(may_remove_element(&steps));
    }
    // a field of an element (a relationship, a tag, a nested field of a nested element) and anything out of the layers do not
    for steps in [
        vec![
            name("application"),
            name("elements"),
            Step::Index(0),
            name("relationships"),
            Step::Index(1),
        ],
        vec![
            name("application"),
            name("elements"),
            Step::Index(0),
            name("tags"),
            name("zone"),
        ],
        vec![
            name("technology"),
            name("elements"),
            Step::Index(1),
            name("elements"),
            Step::Index(0),
            name("uses"),
        ],
        vec![name("application"), name("settings")],
        vec![name("header")],
        vec![],
    ] {
        assert!(!may_remove_element(&steps));
    }
}

// ---- what a path of the earlier dialect is told as, and what is not one ----

#[test]
fn the_earlier_dialect_is_told_with_the_standard_form_of_each_of_its_shapes() {
    let cases = [
        // (path, as written, standard form)
        (
            "$..elements[?(@.qualifiers anyof ['a', \"b\"])]",
            "@.qualifiers anyof ['a', \"b\"]",
            "@.qualifiers[?(@ == 'a' || @ == \"b\")]",
        ),
        // nothing is in an empty list: the field is there and is not there
        (
            "$..elements[?(@.qualifiers anyof [])]",
            "@.qualifiers anyof []",
            "(@.qualifiers && !@.qualifiers)",
        ),
        (
            "$..elements[?(@.qualifiers noneof ['a'])]",
            "@.qualifiers noneof ['a']",
            "(@.qualifiers && !@.qualifiers[?(@ == 'a')])",
        ),
        // none of nothing: any field that is there
        (
            "$..elements[?(@.qualifiers noneof [ ])]",
            "@.qualifiers noneof [ ]",
            "@.qualifiers",
        ),
        (
            "$..elements[?(@.tags == null)]",
            "@.tags == null",
            "!@.tags",
        ),
        ("$..elements[?(@.tags!=null)]", "@.tags!=null", "@.tags"),
        // a field name is letters, digits, `_` and `-`
        (
            "$..elements[?(@.a_b-c9 == null)]",
            "@.a_b-c9 == null",
            "!@.a_b-c9",
        ),
        // the old form ends the path, or is followed by spaces and nothing else
        ("$..[?(@.tags == null", "@.tags == null", "!@.tags"),
        ("$..[?(@.tags == null   ", "@.tags == null", "!@.tags"),
    ];
    for (path, written, standard) in cases {
        assert_eq!(
            find_legacy(path),
            Some((written.to_string(), standard.to_string())),
            "{path}"
        );
        assert_eq!(
            refuse_legacy(path),
            Err(format!(
                "the facet path `{path}` uses `{written}`, which is not JSONPath (RFC 9535) and is no longer read: write `{standard}`"
            ))
        );
    }
}

#[test]
fn what_only_looks_like_the_earlier_dialect_is_read_as_the_standard_path_it_is() {
    for path in [
        // the list is not closed, or an item is not one quoted text
        "$..elements[?(@.qualifiers anyof ['a')]",
        "$..elements[?(@.qualifiers anyof ['a'",
        "$..elements[?(@.qualifiers anyof [a])]",
        "$..elements[?(@.qualifiers anyof ['a' 'b'])]",
        // a name that only starts with null
        "$..elements[?(@.tags == nullable)]",
        // `@.` with no field, a field with no test, another operator
        "$..elements[?(@. == null)]",
        "$..elements[?(@.tags)]",
        "$..elements[?(@.tags == 'null')]",
        // the old form is not met at the end of the path, nor out of a filter
        "$..[?(@.tags",
        "$..[?(@.tags   ",
        "$.tags == null",
        // an item with the quote of its own inside is not one quoted text
        "$..elements[?(@.qualifiers anyof ['a'b'])]",
        "$..elements[?(@.qualifiers anyof ['a''b'])]",
        // the words are in a text
        "$..elements[?(@.name == 'is @.tags == null')]",
        "$..elements[?(@.name == '@.tags == null')]",
        "$..elements[?(@.name == \"@.q anyof ['a']\")]",
    ] {
        assert_eq!(find_legacy(path), None, "{path}");
        assert_eq!(refuse_legacy(path), Ok(()), "{path}");
    }
}

// ---- the editor's way in: the facet is applied to the elements of a view ----

fn view(layer: &str, elements: Value, app_elements: Value) -> Input {
    serde_json::from_value(json!({
        "viewpoint": "overview", "layer": layer, "focal": "a",
        "elements": elements, "app_elements": app_elements
    }))
    .expect("an input")
}

fn facet(path: &str) -> Facet {
    serde_json::from_value(json!({ "actions": [{ "operator": "REMOVE", "json_path": path }] }))
        .expect("a facet")
}

fn references(elements: &[Elem]) -> Vec<&str> {
    elements.iter().map(|e| e.reference.as_str()).collect()
}

#[test]
fn a_technology_view_with_no_application_is_a_view_of_the_nodes_alone() {
    let mut input = view(
        "technology",
        json!([{ "reference": "prod" }, { "reference": "prod.vm" }, { "reference": "test" }]),
        json!([]),
    );
    let warnings = apply_to_input(
        &mut input,
        &facet("$.technology.elements[?(@.id == 'test')]"),
    )
    .expect("the facet applies");
    assert!(warnings.is_empty());
    assert_eq!(references(&input.elements), ["prod", "prod.vm"]);
    assert!(input.app_elements.is_empty());
}

#[test]
fn a_layer_with_no_element_is_an_empty_document() {
    assert_eq!(to_document(&[]), json!({}));
}

#[test]
fn a_facet_that_takes_away_what_an_element_needs_is_an_error_of_the_view() {
    let elements = json!([
        { "reference": "a", "relationships": [{ "destination": "b" }, { "destination": "c" }] },
        { "reference": "b" },
        { "reference": "c" }
    ]);
    // a relationship with no destination
    let mut input = view("application", elements.clone(), json!([]));
    assert_eq!(
        apply_to_input(
            &mut input,
            &facet("$.application.elements[0].relationships[1].destination"),
        )
        .unwrap_err()
        .split(':')
        .next()
        .unwrap(),
        "a facet left an unreadable relationship of a"
    );
    // an element with no id
    let mut input = view("application", elements, json!([]));
    assert_eq!(
        apply_to_input(&mut input, &facet("$.application.elements[1].id")).unwrap_err(),
        "a facet left an element without an id"
    );
}

// ---- a document that has things which are not elements ----

#[test]
fn what_is_in_the_list_of_elements_and_is_not_an_element_is_left_where_it_is() {
    let workspace = json!({
        "application": { "elements": [
            7, null, "text",
            { "id": "a", "relationships": [{ "destination": "b" }], "uses": ["env"] },
            { "id": "b" }
        ] },
        "technology": { "elements": [ [1], { "id": "env", "applications": ["a", "b"] } ] }
    });
    let request = json!({ "workspace": workspace, "actions": [
        { "operator": "REMOVE", "json_path": "$.application.elements[?(@.id == 'b')]" },
        { "operator": "REMOVE", "json_path": "$.technology.elements[?(@.id == 'zzz')]" }
    ]});
    let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
    assert!(out.get("error").is_none(), "{out}");
    // b is gone with the relationship that pointed at it (the list stays, empty) and its place on the node; what is not an element stays
    assert_eq!(
        out["workspace"]["application"]["elements"],
        json!([7, null, "text", { "id": "a", "relationships": [], "uses": ["env"] }])
    );
    assert_eq!(
        out["workspace"]["technology"]["elements"],
        json!([[1], { "id": "env", "applications": ["a"] }])
    );
}

#[test]
fn a_facet_cannot_remove_the_workspace_and_an_operator_is_removal() {
    let ask = |action: Value| -> Value {
        serde_json::from_str(&apply_facet_json(
            &json!({ "workspace": { "application": { "elements": [] } }, "actions": [action] })
                .to_string(),
        ))
        .unwrap()
    };
    assert_eq!(
        ask(json!({ "operator": "REMOVE", "json_path": "$" }))["error"],
        "a facet cannot remove the whole workspace: $"
    );
    assert_eq!(
        ask(json!({ "operator": "SET", "json_path": "$.application" }))["error"],
        "unsupported facet action: SET $.application"
    );
}

#[test]
fn a_removal_that_takes_a_node_of_the_workspace_with_the_elements_still_cleans_up_after_the_elements(
) {
    // `$..[0]` selects the first item of every list: an element, and the first item of lists that are no element's
    for (extra_layer, extra_key) in [("settings", "paths"), ("application", "notes")] {
        let mut workspace = json!({
            "application": { "elements": [
                { "id": "a" },
                { "id": "b", "relationships": [{ "destination": "c" }, { "destination": "a" }] },
                { "id": "c" }
            ] },
            "settings": { "paths": ["manifests/**"] }
        });
        if extra_layer != "settings" {
            // the first item of `settings.paths` would be met first (the paths are taken from the greatest down)
            workspace.as_object_mut().unwrap().remove("settings");
        }
        workspace[extra_layer][extra_key] = json!(["kept?"]);
        let request = json!({ "workspace": workspace, "actions": [{ "operator": "REMOVE", "json_path": "$..[0]" }] });
        let out: Value = serde_json::from_str(&apply_facet_json(&request.to_string())).unwrap();
        assert!(out.get("error").is_none(), "{out}");
        let kept = &out["workspace"];
        // `a` left, and with it the relationship of `b` that pointed at it (the first of its relationships went with the first item of every list)
        assert_eq!(
            kept["application"]["elements"],
            json!([{ "id": "b", "relationships": [] }, { "id": "c" }]),
            "{extra_layer}.{extra_key}"
        );
        assert_eq!(kept[extra_layer][extra_key], json!([]));
    }
}

#[test]
fn the_document_of_a_view_leaves_out_what_an_element_has_empty() {
    let elements: Vec<Elem> = serde_json::from_value(json!([
        { "reference": "a", "kind": "system", "description": null, "name": "", "tags": {}, "qualifiers": [] }
    ]))
    .unwrap();
    assert_eq!(
        to_document(&elements),
        json!({ "elements": [{ "id": "a", "kind": "system" }] })
    );
}
