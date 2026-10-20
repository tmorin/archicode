---
type: prg
status: active
date: 2026-10-20
related:
  - docs/wav/wav-017-editor-defects-and-composed-replaces/wav-017-editor-defects-and-composed-replaces.md
wave: 017
---

# Progress Log: editor-defects-and-composed-replaces

## Log

- 2026-10-20: wave 017 written (`write-wave`) after the release 0.15.0, from the review of the twenty open issues and the author's answer ("Écrit la vague et complète la", taking the recommendations of the review). It plans 9 runs in three phases, all on the `standard` tier (no `hard_judgment`: nothing deletes data, touches credentials or waits for an open decision), all serialized (one run at a time, no `concurrent-safe` verdict). Sources: #82, #89, #94, #119, #120, #121, #122, #123. Left open on purpose: #124 (changes the output of three viewpoints, nobody asked), #112, #109, #114, #78, #103, #125, #24, #25, #65, #29, #128. The wave is completed right after it is written, on the branch `feat/wave-017-editor-defects-and-composed-replaces`, one commit per run, one pull request.

## Findings

## Lessons Learnt
