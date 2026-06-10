# 07 — Track issue progress with done and reopen

**Source:** midas done / midas reopen

**Summary:** A user marks issues complete (or reopens them) and the CLI writes the change back to `INDEX.md`.

## Functional Specification

- `midas done <slug> <NN>` checks the issue's box in `INDEX.md`.
- `midas reopen <slug> <NN>` unchecks it.
- A number not present in the INDEX exits non-zero without touching the file.
- After marking an issue done, the CLI prints which issues became ready because of it.
- `INDEX.md` is the single source of truth for issue state; tracking commands never rewrite issue files.

## Preconditions

- The spec has an `issues/INDEX.md`.
- Dependency-aware listing exists (issue 06).

## Main Flow

1. User runs `midas done pricing-engine 01`.
2. The CLI checks the box for issue 01 in `INDEX.md`.
3. The CLI resolves the graph and prints the issues newly unblocked by 01.
4. User runs `midas reopen pricing-engine 01` and the box is unchecked again.

## Expected Result

- Progress tracking lives in the markdown, edited safely by code, with immediate feedback on what became workable.

## Blocked by

- [06 — List issues with dependency-aware filters](06-list-issues-with-dependency-aware-filters.md)

## Open Questions

- None
