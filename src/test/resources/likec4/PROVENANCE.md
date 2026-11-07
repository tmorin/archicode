# Provenance of `cloud-system.json`

A LikeC4 JSON export, the input of `archicode import likec4`. It is the output of the vendor tool, not written by hand.

- **Source model:** `examples/cloud-system` (nine `.c4` files) of https://github.com/likec4/likec4, tag `v1.60.0`, commit `0375d146f8de2eb919033bd3b43b3701194f518b`.
- **Licence:** MIT, Copyright (c) 2023-2026 Denis Davydkov, the root `LICENSE` of that repository at that commit (copied here as `LICENSE`; the example folder holds no licence file of its own).
- **Tool:** `likec4@1.60.0` from the npm registry, installed with `--ignore-scripts`.
- **Command, run once on 2026-11-07, in a scratch folder outside this repository:**

  ```bash
  likec4 export json --skip-layout --project cloud-system -o cloud-system.json examples/cloud-system
  ```

- **Only change made to the output:** the `views` map is cut from 19 views to 3 (`view-with-custom-colors`, `cloud_ui_dashboard`, `customer`), which keeps the file at about 85 KB instead of 149 KB and still holds views for the importer to report as dropped; `jq` writes the file again with its own layout (two-space indent), no other value is touched:

  ```bash
  jq '.views |= with_entries(select(.key=="view-with-custom-colors" or .key=="cloud_ui_dashboard" or .key=="customer"))' cloud-system.json
  ```

What it holds: 27 elements of 12 kinds (`actor`, `app`, `component`, `container`, `externalSystem`, `gqlMutation`, `gqlQuery`, `lambda`, `mobileApp`, `queue`, `system`, `table`), 24 relations, a deployment model (49 elements, 6 relations), 3 views and 3 manual layouts.

CI never runs the vendor tool: this file is the oracle of the tests. A new export is made by hand, with the version, the command and the commit above updated here.
