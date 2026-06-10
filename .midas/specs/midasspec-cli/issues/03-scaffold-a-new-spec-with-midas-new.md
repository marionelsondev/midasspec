# 03 — Scaffold a new spec with midas new

**Source:** midas new

**Summary:** A user (or the `/spec` skill) scaffolds a spec folder with slug normalization and conflict detection handled by code.

## Functional Specification

- `midas new <name>` normalizes the provided name to valid kebab-case before any filesystem action.
- The command creates `.midas/specs/<slug>/` and prints the path where `SPEC.md` must be written.
- If `.midas/specs/<slug>/SPEC.md` already exists, the command exits non-zero with a structured conflict error and touches no file.
- With `--json`, the created path (or the conflict error) is returned as a structured object.

## Preconditions

- The project is initialized (issue 02).

## Main Flow

1. User runs `midas new "Pricing Engine"`.
2. The CLI normalizes the name to `pricing-engine` and creates `.midas/specs/pricing-engine/`.
3. The CLI prints the target path for `SPEC.md`.
4. User runs the same command again and receives a conflict error with a non-zero exit code.

## Expected Result

- A normalized, scaffolded spec folder on success; a safe, structured failure when the spec already exists.

## Blocked by

- [02 — Initialize a project with midas init](02-initialize-a-project-with-midas-init.md)

## Open Questions

- None
