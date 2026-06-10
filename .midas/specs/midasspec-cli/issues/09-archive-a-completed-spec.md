# 09 — Archive a completed spec

**Source:** midas archive

**Summary:** A user moves a finished spec into an archive folder, preserving its files verbatim.

## Functional Specification

- `midas archive <slug>` moves the spec folder into `.midas/specs/archive/<YYYY-MM-DD>-<slug>/`.
- Archiving a spec with pending issues requires explicit confirmation (`--force`).
- Archived files are moved unchanged, never rewritten.

## Preconditions

- The spec exists and its progress can be read (issue 04).

## Main Flow

1. User runs `midas archive pricing-engine`.
2. The CLI checks the INDEX for pending issues.
3. If all issues are done, the folder is moved to `.midas/specs/archive/<YYYY-MM-DD>-pricing-engine/`.
4. If issues are pending, the CLI refuses unless `--force` is passed.

## Expected Result

- Completed specs leave the active list with history intact, and accidental archiving of unfinished work is prevented.

## Blocked by

- [04 — Show spec progress with midas status](04-show-spec-progress-with-midas-status.md)

## Open Questions

- None
