# 05 — Validate SPEC and issue files

**Source:** midas validate

**Summary:** A user verifies that all markdown artifacts follow the formats defined by the `/spec` and `/break` skills.

## Functional Specification

- `midas validate <slug>` checks `SPEC.md` for the required sections (Overview, at least one page with Components and Behaviors, Open Questions).
- It checks every issue file for the required sections (Functional Specification, Preconditions, Main Flow, Expected Result, Blocked by, Open Questions).
- It checks that every `INDEX.md` blocked-by annotation matches the `Blocked by` section of the corresponding issue file.
- It reports orphan issue files not listed in `INDEX.md`, and INDEX entries whose file is missing.
- The command exits non-zero when any error is found; warnings alone keep exit code zero.

## Preconditions

- A spec folder with `SPEC.md` exists (issue 03).

## Main Flow

1. User runs `midas validate pricing-engine`.
2. The CLI parses `SPEC.md`, the issue files, and `INDEX.md`.
3. The CLI prints a report with each error/warning pointing to a file and the violated rule.
4. The exit code reflects whether errors were found.

## Expected Result

- Format and consistency violations are caught by code, with a precise report and a meaningful exit code.

## Blocked by

- [03 — Scaffold a new spec with midas new](03-scaffold-a-new-spec-with-midas-new.md)

## Open Questions

- None
