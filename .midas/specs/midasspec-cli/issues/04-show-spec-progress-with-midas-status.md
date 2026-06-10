# 04 — Show spec progress with midas status

**Source:** midas status

**Summary:** A user sees every spec and its issue progress, parsed directly from the markdown files.

## Functional Specification

- `midas status` lists every folder under `.midas/specs/` with slug, issue counts (total, done, pending), and whether it has been broken down.
- `midas status <slug>` shows the spec's issues with done/pending state parsed from `INDEX.md` checkboxes.
- A spec without an `issues/` folder is shown as "not broken down" instead of an error.
- An unknown slug exits non-zero with a clear message.

## Preconditions

- At least one spec folder exists under `.midas/specs/` (issue 03).

## Main Flow

1. User runs `midas status`.
2. The CLI scans `.midas/specs/`, parses each `INDEX.md`, and prints the summary table.
3. User runs `midas status pricing-engine`.
4. The CLI prints the per-issue state for that spec.

## Expected Result

- Accurate progress reporting derived only from the markdown files, with graceful handling of specs not yet broken down.

## Blocked by

- [03 — Scaffold a new spec with midas new](03-scaffold-a-new-spec-with-midas-new.md)

## Open Questions

- None
