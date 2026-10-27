---
title: 'PLN: the parts below the composition request a redraw (W-11)'
type: pln
status: done
owner: tmorin
date: 2026-10-27
run: 0187
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0187-editor-state-notifies/tdd-0187-editor-state-notifies.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0187-editor-state-notifies/run-0187-editor-state-notifies.md
---

# Execution Plan: run 0187, W-11

TDD+pln run, done by hand (no workflow). Requirements: the wave row W-11 and RFC-002 rule 2.

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  total_tasks: 3
  tasks:
    - 'task-001: analyse the 161 upward pairs by cause (tdd)'
    - 'task-002: requestRedraw/onRedraw, 97 replacements, names.json, ratchet.max 99, redraw-requests.test.js, one refactor: change commit'
    - 'task-003: editor:check, test:unit, test:coverage, lint, format:check, the four Java classes, test:e2e; run documents and the wave manifest'
```
