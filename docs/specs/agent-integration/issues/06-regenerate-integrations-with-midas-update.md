# 06 — Regenerate integrations with midas update

**Source:** midas update

**Summary:** After upgrading the CLI, one command refreshes every midas-owned integration file from the current templates.

## Functional Specification

- `midas update` reads the `tools` list from `midas.config.yaml` and regenerates the AGENTS.md managed block, slash commands, and skills for every configured tool.
- Running it in a repo without `midas.config.yaml` exits non-zero with a message pointing to `midas init`.
- A repo with no `tools` configured still refreshes the AGENTS.md managed block and reports that no tools are configured.
- Output lists every refreshed file in the same format as `midas init`.

## Preconditions

- Init persists the `tools` selection and the three generators exist (issue 05).

## Main Flow

1. User upgrades the `midasspec` package.
2. User runs `midas update` in a configured repo.
3. The CLI rewrites the managed block, command files, and skills for the configured tools and prints the refreshed file list.
4. User runs `midas update` in an uninitialized repo and gets a non-zero exit pointing to `midas init`.

## Expected Result

- CLI tests cover regeneration from config, the uninitialized failure, the no-tools case, and the refreshed-file report.

## Blocked by

- [05 — Extend midas init with tool selection and generation](05-extend-midas-init-with-tool-selection-and-generation.md)

## Open Questions

- None
