# 02 — Initialize a project with midas init

**Source:** midas init

**Summary:** A user prepares a repository for the SDD workflow with a single idempotent command.

## Functional Specification

- `midas init` creates the `.midas/specs/` directory when it does not exist.
- `midas init` writes a commented `midas.config.yaml` template at the repo root with empty `context` and `rules` sections.
- The config supports an optional `specsRoot` key overriding the default `.midas/specs/` root.
- Running `midas init` again never overwrites an existing config; it reports the project is already initialized.

## Preconditions

- The CLI entry point is available (issue 01).
- The command is run inside the target repository root.

## Main Flow

1. User runs `midas init` in a fresh repository.
2. The CLI creates `.midas/specs/` and `midas.config.yaml`.
3. User runs `midas init` again.
4. The CLI reports the project is already initialized and changes nothing.

## Expected Result

- The repository has `.midas/specs/` and a commented `midas.config.yaml`, and re-running init is safe.

## Blocked by

- [01 — Run CLI with help, version, and JSON conventions](01-run-cli-with-help-version-and-json-conventions.md)

## Open Questions

- None
