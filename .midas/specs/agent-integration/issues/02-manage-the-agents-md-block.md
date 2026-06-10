# 02 — Manage the AGENTS.md block

**Source:** AGENTS.md Managed Block

**Summary:** midas writes its SDD workflow instructions into a marker-delimited block in `AGENTS.md` without ever touching user content.

## Functional Specification

- A `writeAgentsBlock(cwd)` function owns a block delimited by `<!-- midas:begin -->` and `<!-- midas:end -->` containing the SDD workflow instructions (the spec → break → implement → done loop and the relevant `midas` commands).
- When `AGENTS.md` does not exist, the file is created containing only the managed block.
- When `AGENTS.md` exists without markers, the block is appended at the end; all existing content is preserved byte-for-byte.
- When markers exist, only the content between them is replaced; running the function twice in a row produces an identical file.
- The function reports whether the file was `created`, `updated`, or `unchanged`.

## Preconditions

- None beyond the existing codebase.

## Main Flow

1. Code calls `writeAgentsBlock(cwd)` in a repo without `AGENTS.md`.
2. The file is created with the managed block.
3. User adds their own sections above the block; code calls the function again after a template change.
4. Only the content between the markers changes; the user's sections are intact.

## Expected Result

- Unit tests cover creation, append-to-existing, in-place refresh, idempotency, and preservation of surrounding content.

## Blocked by

- None

## Open Questions

- None
