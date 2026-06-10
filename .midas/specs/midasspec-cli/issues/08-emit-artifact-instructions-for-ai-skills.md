# 08 — Emit artifact instructions for AI skills

**Source:** midas instructions

**Summary:** The CLI hands an AI skill everything it needs to write an artifact — template, rules, context, and output path — so skill prompts stay thin.

## Functional Specification

- `midas instructions spec --json` returns the SPEC template, the spec rules from `midas.config.yaml`, the project context, and the target `SPEC.md` path.
- `midas instructions break --spec <slug> --json` returns the issue file template, the break rules, the context, and the target `issues/` path.
- The payload always includes the `context` from `midas.config.yaml` when present.

## Preconditions

- The project is initialized with `midas.config.yaml` (issue 02).

## Main Flow

1. The `/spec` skill runs `midas instructions spec --json`.
2. The CLI assembles template + rules + context + resolved output path into one JSON payload.
3. The skill writes the artifact using the payload as its constraints and target.

## Expected Result

- Skills retrieve templates and rules from the CLI instead of embedding them, making formats versionable in one place.

## Blocked by

- [02 — Initialize a project with midas init](02-initialize-a-project-with-midas-init.md)

## Open Questions

- None
