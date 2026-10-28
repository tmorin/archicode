archicode guide @VERSION@

# ArchiCode, a guide for an agent

ArchiCode draws an architecture that is written as files. You write a **workspace**: a folder with a `.archicode.yaml` at its root and YAML manifests. Each manifest is an element (a person, a system, a container, a component, an environment, a node), a view, a story or a plateau. The tools check the files, resolve the references between them and draw PlantUML files. This guide is printed by the binary you are running and is all you need: `guide` loads no workspace and reads nothing outside the application. The kinds and the commands below are generated from the code that reads the files; the rest is the conventions an agent cannot guess.

## Starting from nothing

```sh
archicode init my-architecture   # or `archicode init` in the current folder
cd my-architecture
archicode query graph
archicode views generate -i shop_overview
```

`init` writes `.archicode.yaml`, three manifests in `manifests/` (a person, a system with one container and a relationship between them, and a saved view of the system) and the line `/views*/` in `.gitignore` (added to a `.gitignore` that exists, once; nothing is removed). It overwrites nothing: a folder that already holds `.archicode.yaml`, or one of those manifests, is `error:` and exit 1 with nothing written. Edit those files, add manifests, and loop as below.

## The loop

1. Write or change a manifest under `manifests/`.
2. `archicode query graph` loads everything and prints the resolved elements and relationships as one line of JSON (`{"elements":[{"reference":...}],"relationships":[...]}`; exit 0 when the workspace is valid), for `jq` or any JSON reader; without a tool, `archicode query graph | grep -o '"reference"' | wc -l` counts the elements. It is the cheapest check.
3. `archicode views generate` draws: for every element the `overview`, `detailed` and `deep` views, into `views/plantuml/<layer>/<reference>-<viewpoint>.puml` (a `.` of the reference becomes `_`; with plateaus the folder is `views-<plateau>`). A saved view (a manifest of kind view) is drawn only when named: `views generate -i <view id>`.
4. Plateaus: `archicode plateau list`, then `archicode diff` to see what a plateau changes (it compares the plateau drawn with `--against <id>`, default the plateau it overrides; the root `baseline` has none, so `diff` on it is one `error:` line: name one with `--against`).

Output and exit codes:

- A problem the author can fix is one line on the error output, `error: <sentence>`, and exit 1. **Only the first problem is reported**: there is no `validate` command yet, so fix it and run again. The sentence names the file and the key (for example ``error: `manifests/a.yaml` is not valid: unknown key `foo` (known: ...) at `content.foo` ``); a reference that does not resolve (a relationship `destination`, a `uses` entry, a hosted application) says the element that holds it, the file and the key (``error: `shop.search` has a relationship towards `shop.nowhere`, which does not exist, in `manifests/shop.search.yaml` at `relationships[0].destination` ``): write the reference of an element that exists, as `query graph` prints it.
- A warning is `warning: <sentence>` on the error output; the exit code stays 0.
- A usage error (an unknown option or command) is exit 2, with the usage.
- `archicode diff --fail-on <states>` exits 3 when the comparison holds a change of one of the states (`new`, `changed`, `removed`, `moved`, `split`, `merged`, `contains-changes`, `any`), else 0: use it in a build.
- Files are written next to `.archicode.yaml`, never elsewhere. `-w <path>` chooses another workspace file, from any folder.

## The workspace file

`.archicode.yaml` may be empty (the defaults then apply) or hold `settings`. Unknown keys are refused.

- `settings.name`: the name of the workspace.
- `settings.manifests.paths`: where the manifests are, relative to the file; default `["manifests"]`. A path that ends in `/**` is read recursively (hidden files and folders, and the folders of generated views, are left out), any other path reads the files directly in its folder. `..` and absolute paths are refused. YAML, JSON and TOML files are read.
- `settings.views.path`: the folder of the generated views, default `views`. With plateaus the folders are `views-<plateau>` and, for a comparison, `views-<plateau>-vs-<against>`.
- `settings.current`: the plateau drawn when `--plateau` is not given (default: the last plateau when they form one line).
- `settings.relationships.default-synthetic-label`: the label of a link that has none.
- `settings.facets`: `customs` is a list of `name` (one folder name), `hide-unlinked` and `actions` (`operator: REMOVE`, `json-path` an RFC 9535 JSONPath over the workspace such as `$.application..elements[?(@.id == 'admin')]`); each facet draws its own folders of views; `global-enabled: false` draws only the facets.
- `styles` (`atomic`, `composite`, `by-tags`, `by-qualifiers`) and `formatters` only change how PlantUML is written.
- The workspace file may also hold `application`, `technology`, `views` and `stories` inline; prefer manifests.

## Manifests

A manifest is a file with a `header` and a `content`. The `header` says what the file is, the `content` is described by the kind. `archicode query schemas manifest` prints the full JSON Schema (kinds side by side under `kinds`, nested elements under `nested`); this section is the same information in short. Unknown keys of a content are refused, except in a view, a story and a step.

Value types: `element-id`: The identifier of the element: one level of its reference, so it holds no dot. Write lowercase letters, digits, `_` and `-`. `plateau-id`: The identifier of the plateau: lowercase letters, digits, `_` and `-`, declared once. `baseline` is the implicit root. `reference`: A reference to an element of the same layer: the ids from the root of the layer, joined by dots (`shop.web.api`). It must exist in the plateau. `view-id`: The identifier of a view declared in the workspace. An enum is read in any case. `*` marks a required key.

**header** (every manifest): `kind` is the id of a kind below.
- `kind`*: string
- `parent`: reference
- `plateau`: plateau-id
- `version`*: string

**component** `header.kind: archicode.morin.io/component`, application layer, never the top of the layer, holds nothing
- `description`: string
- `id`*: element-id
- `name`: string
- `qualifiers`: array of string
- `relationships`: array of objects
  - `destination`*: reference
  - `label`: string
  - `qualifiers`: array of string
  - `tags`: map of string
- `replaces`: array of reference
- `tags`: map of string

**container** `header.kind: archicode.morin.io/container`, application layer, never the top of the layer, holds component
- `description`: string
- `elements`: array of elements, each with `kind` (one of component) and the keys of that kind
- `id`*: element-id
- `name`: string
- `qualifiers`: array of string
- `relationships`: array of objects (as above)
- `replaces`: array of reference
- `tags`: map of string

**environment** `header.kind: archicode.morin.io/environment`, technology layer, may be the top of the layer, holds node
- `description`: string
- `elements`: array of elements, each with `kind` (one of node) and the keys of that kind
- `id`*: element-id
- `name`: string
- `qualifiers`: array of string
- `relationships`: array of objects (as above)
- `replaces`: array of reference
- `tags`: map of string
- `uses`: array of reference

**node** `header.kind: archicode.morin.io/node`, technology layer, never the top of the layer, holds node
- `applications`: array of reference
- `description`: string
- `elements`: array of elements, each with `kind` (one of node) and the keys of that kind
- `id`*: element-id
- `name`: string
- `qualifiers`: array of string
- `relationships`: array of objects (as above)
- `replaces`: array of reference
- `tags`: map of string

**person** `header.kind: archicode.morin.io/person`, application layer, may be the top of the layer, holds nothing
- `description`: string
- `id`*: element-id
- `name`: string
- `qualifiers`: array of string
- `relationships`: array of objects (as above)
- `replaces`: array of reference
- `tags`: map of string

**plateau** `header.kind: archicode.morin.io/plateau`
- `horizon`: string
- `id`*: plateau-id
- `name`: string
- `override`: plateau-id
- `patches`: array of objects
  - `expect`: integer
  - `field`: string
  - `json-path` (also `json_path`): string
  - `layer`: one of application, technology
  - `operator`*: one of add, merge, remove, set
  - `target`: reference
  - `value`: any
  - `where`: object
    - `destination`*: reference
    - `label`: string

**solution** `header.kind: archicode.morin.io/solution`, application layer, may be the top of the layer, holds system
- `description`: string
- `elements`: array of elements, each with `kind` (one of system) and the keys of that kind
- `id`*: element-id
- `name`: string
- `qualifiers`: array of string
- `relationships`: array of objects (as above)
- `replaces`: array of reference
- `tags`: map of string

**story** `header.kind: archicode.morin.io/story`
- `description`: string
- `id`*: string
- `name`: string
- `steps`: array of objects
  - `against`: plateau-id
  - `at`: plateau-id
  - `highlight`: any
  - `layer`: one of application, technology
  - `name`: string
  - `properties`: any
  - `text`: string
  - `view`: view-id
  - `viewpoint`: string

**system** `header.kind: archicode.morin.io/system`, application layer, may be the top of the layer, holds container
- `description`: string
- `elements`: array of elements, each with `kind` (one of container) and the keys of that kind
- `id`*: element-id
- `name`: string
- `qualifiers`: array of string
- `relationships`: array of objects (as above)
- `replaces`: array of reference
- `tags`: map of string

**view** `header.kind: archicode.morin.io/view`
- `description`: string
- `id`*: string
- `layer`: one of application, technology
- `name`: string
- `properties`: any
- `viewpoint`*: string

Conventions:

- **Ids and references.** An `id` is one level of a name: no dot (write lowercase letters, digits, `_`, `-`). A **reference** is the ids from the root of the layer joined by dots: `shop.web.api`. The application layer (person, solution, system, container, component) and the technology layer (environment, node) have separate references. A relationship `destination`, `replaces`, `uses`, `applications`, `target` and the elements a view or a step names are references; they must exist. A reference declared twice is an error.
- **Nesting.** An element is written in the `elements` of its parent (with a `kind`), or in a manifest of its own with `header.parent` set to the reference of the parent, and then its `kind` is in the header. Each kind holds only the kinds listed above; at the top of a layer only the kinds marked as such.
- **Relationships** are written on the source element and name the destination. A node lists in `applications` the application-layer references it hosts; an environment lists in `uses` the environments it depends on.
- **Tags and qualifiers.** `qualifiers` are words shown on the box (a technology: `React`; the diagram writes `[system: React]`) and each is also a PlantUML stereotype, so `styles.by-qualifiers` can style it. `tags.rendering-stereotypes` is a string of space-separated stereotypes that are not shown and that `styles.by-tags` can style (it overrides `by-qualifiers`). There is no `external` flag, no other key marks a system as external and the code gives no word a special meaning: write `qualifiers: ["external"]` on the system, the box then reads `[system: external]`, and style the stereotype `external` in `styles.by-qualifiers` if it should look different.
- **Views.** A view has an `id`, a `viewpoint` and `properties`. The viewpoints are `overview`, `detailed` and `deep` (about one element: the element and what it is linked to; the element opened to what it holds; opened down to its leaves) and `map` (a whole layer, folded). `layer` is `application` (default) or `technology`. The `properties` of a view are not in the schema (the code reads them by name); the keys that the command line reads are:

  | key | viewpoint | value |
  | --- | --- | --- |
  | `element` | overview, detailed, deep | the reference drawn (required) |
  | `pinned` | map | list of references: draw only these, with what they link to |
  | `hidden` | map | list of references left out |
  | `opened` | map | list of references whose box is opened to show its children |
  | `applications` | map, technology | `false` leaves out the applications drawn in the nodes |
  | `relationships` | map, technology | `false` leaves out the links |
  | `links` | map, application | list of `{source, destination, label}`: draw only these relationships, their ends and what encloses them; no label means a relationship with no label; one that matches nothing is an error |
  | `highlight` | map, application | list of `{source, destination, label}`, matched like `links`: the link of each entry is drawn heavy, with a `▶` and a bold label, and the other links calm (light grey); the layer is refused in the technology layer; one that matches nothing is an error |

  The keys `facet`, `hide-unlinked`, `labels`, `qualifiers`, `descriptions` and `wrap` are written by the editor and ignored by the command line: facets come from `settings.facets`.
- **Plateaus** are layers of the architecture in time. The root is `baseline` (implicit; it needs no manifest). A manifest of an element says `plateau: <id>` in its `header`; with none it belongs to `baseline`. A plateau is drawn by the command that is given `--plateau <id>`; without it the plateau is `settings.current`, else the last plateau when the plateaus form one line (a tree that forks needs `--plateau`, or the command is `error:`). Its views go to `views-<plateau>`, so a `views/` folder drawn before the first plateau existed stays behind, stale; a workspace with no plateau draws into `views`. A manifest of kind plateau gives `id`, `override` (the plateau it builds on; absent means `baseline`), `name`, `horizon` and `patches`. A plateau sees the elements of the plateaus it overrides, plus its own, then its patches are applied. A patch has an `operator`, a `target` reference (or a `json-path`), a `field`, a `value` and optionally a `where` (`destination`, `label`) that picks one relationship. `SET` replaces the `field` with `value` (with `where`, changes the keys of one relationship). `ADD` appends `value` to the list `field` (each item if `value` is a list; the list is created if it is missing): `field: relationships`, `value: [{destination: ..., label: ...}]` adds relationships. `MERGE` sets the keys of an object `field` (`tags`) and keeps the others. `REMOVE` takes no `value`: with a `field` it takes that field out, without one it removes the element and what points at it. An element of a plateau may say `replaces: [reference, ...]` (references of the plateau it is compared with) so that `diff` reads a move, a split or a merge instead of a removal and a new element. A patch that selects nothing, a relationship to an element that is gone and a cycle of plateaus are errors. Views and stories belong to no plateau (a `plateau:` in their header means nothing).
- **Stories** are a list of `steps`, each a view (`view`: the id of a saved view, or `viewpoint`, `layer` and `properties` in the step) and a `text`. A step may say `at` (a plateau id: where it is drawn), `against` (the plateau it is compared with) and `highlight` (a list as the `highlight` of a map, which replaces the `highlight` of the view the step draws). `archicode stories generate` draws them into `views-stories/<story>/<NN>-<view>/`.
- **A story of a flow** shows the relationships so far, one more at each step: a step's recipe (`viewpoint: map`, `layer: application`) has `properties.links` with one entry more than the step before, and the step's `highlight` names the newest one only, so that one link is drawn heavy and the others calm. A step adds one entry to `links` and moves `highlight` to it; the step's own `highlight` replaces the view's. The editor writes this form too.
- **Not in the schema**, so only the loader says it, one error at a time: a reference that does not resolve, an id or a view declared twice, a plateau cycle or an unknown plateau, a patch that selects nothing, an element a view or a step names that exists in no plateau, the name of a facet that is not a folder name, and everything of `.archicode.yaml`.

## Commands

Every command takes `-h`/`--help` and `-w`/`--workspace=<workspace file>` (default `.archicode.yaml`). The commands that load a workspace take `--plateau=<id>`. Each line is the first sentence of the command's help; `archicode <command> --help` says the rest.

- `archicode`: ArchiCode provides features to support architecture work with an as-code approach.
  - `-V, --version`: Print the version of ArchiCode and exit.
- `archicode diff`: Compare a plateau with another one: the elements and the relationships that are new, changed or removed, and what changed in each, as a table.
  - `--plateau=PLATEAU_ID`: The plateau to read, by its id (a plateau: key of a header or a Plateau manifest).
  - `--against=PLATEAU_ID`: The plateau to compare the plateau with, any plateau of the workspace (siblings too).
  - `-f, --format=FORMAT`: The format of the table: text, markdown or json.
  - `--no-wording`: Leave out of the table the elements whose description is the only thing that changed, and say how many are left out.
  - `--fail-on=STATE[,STATE...]`: Exit with code 3 when the comparison holds a change of one of these states, a list separated by commas (the option may be repeated): new, changed, removed, moved, split, merged, contains-changes, or any (any of the ...
  - `--width=COLUMNS`: Wrap the text table to this many columns, so that a long reference or a long cell does not make it unreadable: a cell wraps at the spaces, a reference without any is cut after a dot or a slash, then where the line ends.
- `archicode editor`: Manage the local manifest editor server.
- `archicode editor serve`: Serve the editor, with the workspace folder opened in it.
  - `-p, --port=port`: The TCP port to listen on.
  - `--host=host`: The address to bind to.
  - `--allowed-host=name`: A host name, besides localhost, 127.0.0.1 and [::1], that a request may be addressed to.
- `archicode guide`: Print the guide to ArchiCode for an agent that has only this program.
- `archicode init` `<folder>`: Write a small workspace (.archicode.yaml, a person, a system with a container, a relationship and a view) that loads and is drawn.
- `archicode plateau`: Manage the plateaus of the workspace.
- `archicode plateau list`: List the plateaus of the workspace, in the order of the tree: baseline, then what overrides it, each plateau followed by what overrides it.
- `archicode query`: Query the ArchiCode data model.
- `archicode query graph`: Print the resolved element/relationship graph of the workspace as JSON.
  - `--plateau=PLATEAU_ID`: The plateau to read, by its id (a plateau: key of a header or a Plateau manifest).
- `archicode query schemas` `TYPE`: Get JSON schemas related to the ArchiCode data model.
- `archicode query views`: List and filter the views of the workspace.
  - `--plateau=PLATEAU_ID`: The plateau to read, by its id (a plateau: key of a header or a Plateau manifest).
  - `-f, --output-format=FORMAT`: The output format.
  - `-q, --query=QUERY`: The query in JSON Path.
  - `-t, --template=TEMPLATE`: The template in Velocity with access to data in JSON Path.
- `archicode stories`: Manage the stories of the workspace.
- `archicode stories generate`: Draw the steps of the stories of the workspace.
  - `--plateau=PLATEAU_ID`: The plateau to read, by its id (a plateau: key of a header or a Plateau manifest).
  - `-s, --story=STORY_ID`: Draw only this story, by its identifier; the option may be repeated.
  - `-e, --engine=ENGINE`: The name of the rendering engine.
  - `-o, --output=PATH`: The beginning of the name of the output folder, as for views generate: PATH-stories, relative to the folder of the workspace file, or absolute.
- `archicode views`: Manage the views of the workspace.
- `archicode views generate`: Generate the views of the workspace.
  - `--plateau=PLATEAU_ID`: The plateau to read, by its id (a plateau: key of a header or a Plateau manifest).
  - `--against=PLATEAU_ID`: The plateau to compare the plateau with, any plateau of the workspace (siblings too).
  - `-i, --view[=VIEW_ID]`: When specified, render only views matching the given identifier.
  - `-v, --viewpoint[=VIEWPOINT_NAME]`: When specified, render only views matching the given viewpoint name.
  - `-e, --engine=ENGINE`: The name of the rendering engine.
  - `-o, --output=PATH`: The output directory: relative to the folder of the workspace file, or absolute.
  - `--only-changes`: In the views of a comparison (PATH-<plateau>-vs-<against>), draw only what changed: the new, changed, removed, moved, split and merged elements and relationships, the ends of their links, the elements that hold a ...
  - `--properties-content=PROPERTIES`: Optional properties of the views.
  - `--properties-format=FORMAT`: The format of the view properties.
  - `-p, --properties-path=PATH`: The path to optional properties of the views.

## A small workspace

These files are tested: they load, they are drawn, and the commands below exit as written. Put them in an empty folder, or add the files that `init` did not write (`customer.yaml`, `shop.yaml` and `view.shop_overview.yaml` are its shorter forms of the first three) to the workspace it made: every reference they use (`shop`, `shop.web`) is there too.

```yaml
# file: .archicode.yaml
settings:
  name: "Bookshop"
  manifests:
    paths: ["manifests/**"]
```

```yaml
# file: manifests/customer.yaml
header:
  kind: "archicode.morin.io/person"
  version: "1"
content:
  id: "customer"
  name: "Customer"
  relationships:
    - destination: "shop.web"
      label: "orders on"
```

```yaml
# file: manifests/shop.yaml
header:
  kind: "archicode.morin.io/system"
  version: "1"
content:
  id: "shop"
  name: "Shop"
  elements:
    - kind: "container"
      id: "web"
      name: "Web site"
      qualifiers: ["React"]
      relationships:
        - destination: "shop.catalog"
          label: "reads"
    - kind: "container"
      id: "catalog"
      name: "Catalog"
      description: "The books on sale."
```

A container in a manifest of its own, under the system:

```yaml
# file: manifests/shop.search.yaml
header:
  kind: "archicode.morin.io/container"
  version: "1"
  parent: "shop"
content:
  id: "search"
  name: "Search"
```

The technology layer, with the application the node hosts:

```yaml
# file: manifests/prod.yaml
header:
  kind: "archicode.morin.io/environment"
  version: "1"
content:
  id: "prod"
  name: "Production"
  elements:
    - kind: "node"
      id: "vm"
      name: "Virtual machine"
      applications: ["shop.web"]
      relationships:
        - destination: "prod.db"
          label: "queries"
    - kind: "node"
      id: "db"
      name: "Database server"
```

Saved views: one element, a map of the application layer, a map of the technology layer.

```yaml
# file: manifests/view.shop_overview.yaml
header:
  kind: "archicode.morin.io/view"
  version: "1"
content:
  id: "shop_overview"
  viewpoint: "overview"
  properties:
    element: "shop"
```

```yaml
# file: manifests/view.apps_map.yaml
header:
  kind: "archicode.morin.io/view"
  version: "1"
content:
  id: "apps_map"
  viewpoint: "map"
  properties:
    opened: ["shop"]
    pinned: ["shop.web"]
```

```yaml
# file: manifests/view.prod_map.yaml
header:
  kind: "archicode.morin.io/view"
  version: "1"
content:
  id: "prod_map"
  viewpoint: "map"
  layer: "technology"
  properties:
    opened: ["prod"]
    relationships: false
```

A plateau with a patch, one element it adds, and a story that compares the two plateaus:

```yaml
# file: manifests/plateau.to-be.yaml
header:
  kind: "archicode.morin.io/plateau"
  version: "1"
content:
  id: "to-be"
  override: "baseline"
  patches:
    - operator: SET
      target: "shop.web"
      field: description
      value: "The web site, with a search box."
    - operator: ADD
      target: "shop.web"
      field: relationships
      value:
        - destination: "shop.payments"
          label: "pays with"
```

```yaml
# file: manifests/shop.payments.yaml
header:
  kind: "archicode.morin.io/container"
  version: "1"
  plateau: "to-be"
  parent: "shop"
content:
  id: "payments"
  name: "Payments"
```

```yaml
# file: manifests/story.tour.yaml
header:
  kind: "archicode.morin.io/story"
  version: "1"
content:
  id: "tour"
  steps:
    - viewpoint: "overview"
      properties: {element: "shop"}
      at: "baseline"
      text: "Today."
    - viewpoint: "overview"
      properties: {element: "shop"}
      at: "to-be"
      against: "baseline"
      text: "Next year."
```

Then, in that folder (a comment `# exit N` is the exit code, 0 when absent):

```bash
archicode query graph
archicode plateau list
archicode views generate
archicode views generate -i apps_map -i prod_map
archicode stories generate
archicode diff
archicode diff --fail-on new,removed   # exit 3
archicode diff --fail-on removed
archicode views generate --plateau nowhere   # exit 1
```

Not built yet: `validate` (every problem at once) and commands that edit manifests.
