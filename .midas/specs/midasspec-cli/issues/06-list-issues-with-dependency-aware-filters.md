# 06 — List issues with dependency-aware filters

**Source:** midas issues

**Summary:** A user (or a future `/plan` / `/implement` skill) lists a spec's issues filtered by readiness, resolving the dependency graph.

## Functional Specification

- `midas issues <slug>` lists every issue with number, title, state, and blockers.
- `--ready` lists only issues that are not done and whose blockers are all done.
- `--blocked` lists blocked issues, each annotated with the pending blocker numbers.
- `--done` lists only completed issues.

## Preconditions

- The spec has an `issues/` folder with `INDEX.md` (produced by `/break`).
- INDEX parsing exists (issue 04).

## Main Flow

1. User runs `midas issues pricing-engine --ready`.
2. The CLI parses `INDEX.md`, resolves the blocked-by graph against done state.
3. The CLI prints only the unblocked, not-done issues.

## Expected Result

- A reliable, dependency-aware feed of what can be worked on next, consumable by humans and skills (`--json`).

## Blocked by

- [04 — Show spec progress with midas status](04-show-spec-progress-with-midas-status.md)

## Open Questions

- None
