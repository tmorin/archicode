---
type: prg
status: active
date: 2026-10-24
related:
  - docs/wav/wav-023-fixes-and-tooling/wav-023-fixes-and-tooling.md
wave: 023
---

# Progress Log: fixes-and-tooling

## Log

- 2026-10-24: wave 023 planned (11 runs, 0 `hard_judgment`, serialized). Backlog reviewed after wave 022; scope is #158, #159 and #160. The author asked that the findings of the tools be fixed, not baselined (T8), and for line coverage above 90 % at a high quality (T10, Q5, Q6). The Java tool waits for D1 after W-7; W-11 is the only run that needs the answer.

## Findings

- Wave 022 left two defects alone because its rule was byte identity (#158, #159); both are fixed here, so their error sentences are the exceptions to T1.
- `rust-toolchain.toml` has `profile = "minimal"`: neither `rustfmt` nor `clippy` is installed for 1.97.1 (`cargo fmt --version` fails on this machine), so no Rust format or lint has ever run.
- A `cargo fmt` moves line numbers, and the panic locations of the kernel are in the compiled `.wasm`; the run that formats the Rust must re-embed and say whether the bytes moved (W-3).

- The only Java coverage report that exists (`target/jacoco-report`) counts the `@QuarkusTest` classes alone: 47 % of instructions, 32 % of branches. A plain `jacoco-maven-plugin` agent added on the command line fails against Quarkus' `FacadeClassLoader`, so the real figure is unknown until W-8 sets the measure up.

## Lessons Learnt

- Carried from wave 022: write the dispatch entry of the next run in its own commit; kill a stale test run by PID, never `pkill -f` from the shell that holds the name; a time-limit assertion in a generated test is a flake.
