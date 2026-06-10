# 01 — Define the tool registry and detect installed agents

**Source:** Tool Registry & Detection

**Summary:** A static registry describes every supported AI tool, and a filesystem scan reports which ones exist in the repo.

## Functional Specification

- A `ToolRegistry` array in `src/lib/tools.ts` describes each supported tool: `id`, display name, `rootDir` for detection, optional `commandsDir` + frontmatter style, optional `skillsDir`, optional marker files (e.g. `CLAUDE.md` for Claude Code).
- The initial registry covers at least: `claude`, `cursor`, `windsurf`, `codex`, `gemini`, `github-copilot`, `opencode`, `cline`, `roocode`, `kilocode`, `aider`, `amazon-q`, `zed`.
- `detectTools(cwd)` returns the registry entries whose `rootDir` or marker file exists in the repo root.
- `resolveToolsFlag(value)` maps `--tools claude,cursor` to registry entries, maps `all` to the full registry, and throws `CliError` (exit 2) listing valid ids when an id is unknown.
- Config loading gains an optional `tools: string[]` key in `midas.config.yaml`, parsed leniently like the existing keys.

## Preconditions

- The existing config loader (`src/lib/init.ts`, `src/lib/instructions.ts`) is in place.

## Main Flow

1. Code calls `detectTools(cwd)` in a repo containing `.claude/` and `.cursor/`.
2. The function returns the `claude` and `cursor` registry entries.
3. Code calls `resolveToolsFlag('claude,nope')`.
4. The function throws a `CliError` naming `nope` and listing valid ids.

## Expected Result

- Unit tests cover detection (with temp dirs), `all` resolution, unknown-id failure, and `tools` config parsing.

## Blocked by

- None

## Open Questions

- None
