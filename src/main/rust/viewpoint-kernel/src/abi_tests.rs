//! The C ABI the hosts call (Chicory on the JVM, the browser and Node on the page): `alloc`, the six entry points, `result_ptr`
//! and `dealloc`, driven the way a host drives them, on the native pointers of the test process. Each entry point must answer
//! the very bytes of the function it wraps, and the ABI must say what is wrong with an input that is not text.
//! `RESULT` is one buffer for the whole module, so the tests of this file take turns (`ONE_HOST`), as a host does.
use super::*;
use serde_json::{json, Value};
use std::sync::Mutex;

static ONE_HOST: Mutex<()> = Mutex::new(());

type EntryPoint = unsafe extern "C" fn(*const u8, usize) -> usize;

/// What a host does: `alloc`, write the bytes, call, read `len` bytes at `result_ptr`, `dealloc`.
fn call_entry(entry: EntryPoint, input: &[u8]) -> Vec<u8> {
    let _turn = ONE_HOST
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    unsafe {
        let ptr = alloc(input.len());
        std::ptr::copy_nonoverlapping(input.as_ptr(), ptr, input.len());
        let len = entry(ptr, input.len());
        let out = std::slice::from_raw_parts(result_ptr(), len).to_vec();
        dealloc(ptr, input.len());
        out
    }
}

fn call_text(entry: EntryPoint, input: &str) -> String {
    String::from_utf8(call_entry(entry, input.as_bytes())).expect("the answer is UTF-8")
}

/// An entry point of the ABI, the function it wraps, and a request that is valid for it.
struct Request {
    name: &'static str,
    entry: EntryPoint,
    wrapped: fn(&str) -> String,
    input: Value,
}

fn requests() -> Vec<Request> {
    let overview = json!({
        "viewpoint": "overview", "layer": "application", "focal": "sys",
        "elements": [
            { "reference": "sys", "parent": true },
            { "reference": "sys.a", "relationships": [{ "destination": "other", "label": "calls" }] },
            { "reference": "other", "parent": true }
        ]
    });
    let side = |references: &[&str]| {
        let elements: Vec<Value> = references
            .iter()
            .map(|r| json!({ "reference": r, "parent": true }))
            .collect();
        json!({ "application": elements, "technology": [] })
    };
    let facet = json!({
        "workspace": { "application": { "elements": [{ "id": "a" }, { "id": "b" }] } },
        "actions": [{ "operator": "REMOVE", "json_path": "$.application.elements[0]" }]
    });
    let quiet_input = json!({
        "viewpoint": "overview", "layer": "application",
        "elements": [
            { "reference": "sys", "parent": true },
            { "reference": "sys.a", "relationships": [{ "destination": "other", "label": "calls" }] },
            { "reference": "sys.lonely" },
            { "reference": "other", "parent": true }
        ],
        "focals": [{ "reference": "sys.a" }, { "reference": "sys.lonely" }]
    });
    let patches = json!({
        "workspace": { "application": { "elements": [{ "id": "shop", "name": "Shop" }] }, "technology": { "elements": [] } },
        "plateau": "saas",
        "patches": [{ "operator": "SET", "target": "shop", "field": "name", "value": "Store" }]
    });
    vec![
        Request {
            name: "compute",
            entry: compute,
            wrapped: compute_json,
            input: overview,
        },
        Request {
            name: "apply_facet",
            entry: apply_facet,
            wrapped: apply_facet_json,
            input: facet,
        },
        Request {
            name: "compare",
            entry: compare,
            wrapped: compare_json,
            input: json!({ "base": side(&["a"]), "target": side(&["a", "b"]), "on_one_chain": true }),
        },
        Request {
            name: "quiet",
            entry: quiet,
            wrapped: quiet_json,
            input: quiet_input,
        },
        Request {
            name: "apply_patches",
            entry: apply_patches,
            wrapped: apply_patches_json,
            input: patches,
        },
    ]
}

#[test]
fn every_entry_point_answers_the_bytes_of_the_function_it_wraps() {
    for Request {
        name,
        entry,
        wrapped,
        input,
    } in requests()
    {
        let request = input.to_string();
        let answer = call_text(entry, &request);
        assert_eq!(answer, wrapped(&request), "{name}");
        let json: Value =
            serde_json::from_str(&answer).unwrap_or_else(|e| panic!("{name}: {e}: {answer}"));
        assert!(json.get("error").is_none(), "{name}: {answer}");
        assert_eq!(json["version"], CONTRACT_VERSION, "{name}");
    }
}

#[test]
fn the_answers_say_what_the_entry_point_did() {
    let answer = |wanted: &str| -> Value {
        let request = requests().into_iter().find(|r| r.name == wanted).unwrap();
        serde_json::from_str(&call_text(request.entry, &request.input.to_string())).unwrap()
    };
    // the facet removed the first element and nothing else
    let facet = answer("apply_facet");
    assert_eq!(
        facet["workspace"]["application"]["elements"],
        json!([{ "id": "b" }])
    );
    // the patch set the name where the target is
    let patched = answer("apply_patches");
    assert_eq!(
        patched["workspace"]["application"]["elements"][0]["name"],
        "Store"
    );
    // the one element with nothing to draw is the quiet one
    assert_eq!(answer("quiet")["quiet"], json!(["sys.lonely"]));
    // the comparison found the new element
    let compared = answer("compare");
    let b = compared["elements"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["reference"] == "b")
        .unwrap_or_else(|| panic!("{compared}"));
    assert_eq!(b["change"], "new");
}

#[test]
fn an_input_that_is_not_utf8_is_refused_by_every_entry_point_but_states() {
    for Request { name, entry, .. } in requests() {
        assert_eq!(
            call_entry(entry, &[0xff, 0xfe, 0x7b]),
            br#"{"error":"input is not UTF-8"}"#,
            "{name}"
        );
        // an empty input is text, and not JSON
        assert_eq!(
            call_text(entry, ""),
            r#"{"error":"invalid input: EOF while parsing a value at line 1 column 0"}"#,
            "{name}"
        );
    }
}

#[test]
fn states_ignores_its_input_and_says_the_seven_words() {
    let expected = states_json();
    // nothing is read: not a text, not even a pointer to something
    assert_eq!(call_entry(states, &[0xff, 0xfe]), expected.as_bytes());
    assert_eq!(call_entry(states, b""), expected.as_bytes());
    let words: Value = serde_json::from_str(&expected).unwrap();
    assert_eq!(words["states"].as_array().unwrap().len(), 7, "{expected}");
}

#[test]
fn a_buffer_from_alloc_holds_the_bytes_it_was_asked_for_and_can_be_given_back() {
    let _turn = ONE_HOST
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    for len in [0usize, 1, 4096] {
        unsafe {
            let ptr = alloc(len);
            assert!(!ptr.is_null());
            for i in 0..len {
                ptr.add(i).write((i % 251) as u8);
            }
            let back = std::slice::from_raw_parts(ptr, len);
            assert!(back.iter().enumerate().all(|(i, b)| *b == (i % 251) as u8));
            dealloc(ptr, len);
        }
    }
}
