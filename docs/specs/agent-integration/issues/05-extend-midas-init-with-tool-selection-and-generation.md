# 05 — Extend midas init with tool selection and generation

**Source:** midas init (extended)

**Summary:** `midas init` detects agents, lets the user confirm the selection, generates all three integration layers, and persists the choice.

## Functional Specification

- Interactive `midas init` (TTY) shows a checkbox picker of registry tools with detected tools pre-selected; Space toggles, Enter confirms. The picker is hand-rolled on `node:readline` — no new runtime dependencies.
- `--tools <ids|all>` skips the prompt and uses the resolved selection; `--force` skips the prompt using detected tools (or the existing `tools` config when present); a non-TTY run behaves like `--force`.
- After selection, init generates the AGENTS.md managed block, slash commands, and skills for the selected tools, and writes the selection to the `tools` key of `midas.config.yaml` without disturbing other config values.
- Existing behavior is preserved: specs root and config template creation, idempotent re-runs. Re-running init refreshes generated files.
- Output (human and `--json`) lists every file created or updated, grouped by layer and tool.

## Preconditions

- Registry and detection (issue 01), AGENTS.md block (issue 02), command generation (issue 03), and skills generation (issue 04) are implemented.

## Main Flow

1. User runs `midas init` in a repo containing `.claude/`.
2. The picker shows `claude` pre-checked; user confirms with Enter.
3. The CLI creates the config and specs root, generates the three layers for `claude`, persists `tools: [claude]`, and prints the file list.
4. User runs `midas init --tools claude,cursor` in CI.
5. No prompt is shown; both tools are configured.

## Expected Result

- CLI tests (via `runCli` with injected IO and temp dirs) cover the non-interactive paths (`--tools`, `--force`, non-TTY), persistence to config, the generated file report, and preservation of existing config values.

## Blocked by

- [01 — Define the tool registry and detect installed agents](01-define-the-tool-registry-and-detect-installed-agents.md)
- [02 — Manage the AGENTS.md block](02-manage-the-agents-md-block.md)
- [03 — Generate /midas:* slash commands per tool](03-generate-midas-slash-commands-per-tool.md)
- [04 — Generate Agent Skills per tool](04-generate-agent-skills-per-tool.md)

## Open Questions

- None
