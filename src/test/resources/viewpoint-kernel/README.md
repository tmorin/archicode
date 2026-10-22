# Viewpoint kernel fixture

An invented workspace (an online shop) whose generated views are the reference the viewpoint kernel is checked
against. It exists so that the Java viewpoints, the Rust kernel embedded in the standalone editor and, later, the CLI
that runs the kernel can never drift apart unnoticed.

- `workspace/` is the workspace: nested elements at four depths, a person, an external system, links that
  get grouped under an enclosing element, links without a label, and a technology layer hosting applications. Its
  settings define four facets that exercise the supported JSONPath filters (see the kernel's `facet` section).
- `workspace/views*/` are the views the ArchiCode CLI generates for it, one directory for the workspace and one per
  facet. They are committed so that a change of the Java code or of the kernel shows up as a failing test.

## Checking

```bash
node --test "src/test/javascript/**/*.test.js"                               # kernel vs generated views
cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml   # the kernel's own unit tests
```

## Regenerating the views

Only when the manifests or the way the CLI draws views change on purpose:

```bash
./mvnw package -DskipTests
cd src/test/resources/viewpoint-kernel/workspace
rm -rf views views-*
java -jar ../../../../../target/quarkus-app/quarkus-run.jar views generate -w .archicode.yaml
```

Review the diff of the generated files like any other change: it is the behaviour of the viewpoints.
