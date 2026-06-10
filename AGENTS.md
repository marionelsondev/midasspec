<!-- midas:begin -->
# MidasSpec — Spec-Driven Development

This project uses MidasSpec (`midas`) for Spec-Driven Development. Specs are
markdown files and they are the single source of truth — the CLI parses and
edits them, never replaces them.

## Where things live

- Specs live under `.midas/specs/<spec-name>/` by default (configurable via
  `specsRoot` in `midas.config.yaml`).
- Each spec folder has a `SPEC.md` (the functional spec), an `issues/` folder
  with one markdown file per issue, and `issues/INDEX.md` tracking done state
  and dependencies (`blocked by`).

## The workflow loop

1. `midas new <spec-name>` — scaffold a new spec folder.
2. Write `SPEC.md` — describe components and behaviors (run
   `midas instructions spec` for the expected format and project rules).
3. `midas instructions break` — get instructions for breaking the spec into
   issues, then write `issues/*.md` and `issues/INDEX.md`.
4. `midas issues <spec-slug> --ready` — list issues whose blockers are all done.
5. Implement a ready issue, then `midas done <spec-slug> <issue-number>` to mark it.
6. Repeat 4–5 until every issue is done, then `midas archive <spec-name>`.

## Useful commands

- `midas status` — progress overview across specs.
- `midas validate <spec-slug>` — check SPEC/issue files and INDEX.md consistency.
- `midas reopen <spec-slug> <issue-number>` — undo a `done`.

Every command supports `--json` for machine-readable output — prefer it when
driving the workflow programmatically.
<!-- midas:end -->
