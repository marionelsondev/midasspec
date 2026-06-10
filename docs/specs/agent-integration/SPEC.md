# Agent Integration

## Overview

Extends `midas init` (and adds `midas update`) so that initializing a project also installs the SDD workflow into the AI coding agents the user works with, the same way OpenSpec does. The CLI detects which agent tools are present in the repository, lets the user confirm or adjust the selection, and generates three integration layers: a managed block in `AGENTS.md` (the universal instructions standard read by Claude Code, Codex, Cursor, Gemini CLI, Copilot, Windsurf and others), per-tool slash commands under the `/midas:*` namespace, and per-tool Agent Skills (`SKILL.md`). All generation is template-driven from a self-contained tool registry inside the CLI — no new runtime dependencies. Generated files are owned by midas and can be regenerated at any time with `midas update`; user-authored content is never touched.

---

## Tool Registry & Detection

The single source of truth describing every supported AI tool and how to detect and configure it.

### Components

- **ToolRegistry**: a static array of tool descriptors compiled into the CLI; each entry has an `id` (e.g. `claude`, `cursor`, `windsurf`, `codex`, `gemini`, `github-copilot`, `opencode`, `cline`, `roocode`, `kilocode`, `aider`, `amazon-q`, `zed`), a display name, a `rootDir` used for detection (e.g. `.claude`, `.cursor`), an optional `commandsDir` + frontmatter style for slash commands, and an optional `skillsDir` for Agent Skills
- **DetectionScan**: filesystem scan of the repo root for each tool's `rootDir` (plus tool-specific marker files such as `CLAUDE.md`), producing the list of detected tools
- **ToolsConfigKey**: a `tools` list persisted in `midas.config.yaml` recording which tools the project is configured for, so `midas update` can regenerate without asking again

### Behaviors

- **detect-installed-tools**: scanning the repo root returns every registry tool whose `rootDir` or marker file exists
- **resolve-tools-flag**: `--tools claude,cursor` selects exactly those ids, `--tools all` selects every registry tool, and an unknown id exits non-zero listing valid ids
- **persist-selected-tools**: the final selection is written to the `tools` key of `midas.config.yaml`

---

## AGENTS.md Managed Block

The universal layer: one markdown block that every AGENTS.md-aware agent picks up automatically.

### Components

- **ManagedBlock**: a block delimited by `<!-- midas:begin -->` / `<!-- midas:end -->` markers containing the SDD workflow instructions (how to use `midas` commands, where specs live, the spec → break → implement → done loop)
- **AgentsFile**: the `AGENTS.md` file at the repo root, created when missing or edited in place when present

### Behaviors

- **create-agents-file**: when `AGENTS.md` does not exist, it is created containing only the managed block
- **inject-managed-block**: when `AGENTS.md` exists without markers, the block is appended at the end; content outside the markers is preserved byte-for-byte
- **refresh-managed-block**: when markers already exist, only the content between them is replaced (idempotent — running twice yields the same file)

---

## Slash Command Generation

Per-tool `/midas:*` commands so the workflow is one keystroke away inside each agent.

### Components

- **CommandSet**: the four workflow commands `spec` (write a SPEC.md interactively), `break` (break a spec into issues), `implement` (pick the next ready issue and implement it), and `archive` (close out a finished spec); each command body instructs the agent to drive the workflow through `midas ... --json` calls
- **CommandAdapter**: per-tool formatting rules — target path (e.g. `.claude/commands/midas/<name>.md` for Claude Code, `.cursor/commands/midas-<name>.md` for Cursor) and the frontmatter dialect each tool expects

### Behaviors

- **generate-commands-for-tool**: for every selected tool with a command adapter, the four command files are written using that tool's path convention and frontmatter
- **skip-tools-without-adapter**: a selected tool with no command adapter is skipped for this layer and reported in the output rather than failing
- **overwrite-only-generated-files**: generation rewrites the midas-owned command files but never touches other files in the tool's commands directory

---

## Agent Skills Generation

Per-tool `SKILL.md` skills following the cross-tool Agent Skills standard.

### Components

- **SkillSet**: one skill directory per workflow command (`midas-spec`, `midas-break`, `midas-implement`, `midas-archive`), each containing a `SKILL.md` with `name` and `description` frontmatter followed by the instructions
- **SkillsTarget**: the per-tool skills directory from the registry (e.g. `.claude/skills/`, `.windsurf/skills/`)

### Behaviors

- **generate-skills-for-tool**: for every selected tool with a `skillsDir`, the skill directories are created with their `SKILL.md` files
- **mirror-command-content**: skill instructions and slash command bodies are generated from the same source templates so the two layers never drift
- **overwrite-only-generated-skills**: regeneration rewrites only the `midas-*` skill directories, leaving any other skills intact

---

## midas init (extended)

The existing `init` command grows the OpenSpec-style configuration flow on top of its current scaffolding.

### Components

- **InteractivePicker**: a checkbox list of registry tools shown on a TTY, with detected tools pre-selected; Space toggles, Enter confirms
- **ToolsFlag**: `--tools <ids|all>` for non-interactive runs
- **ForceFlag**: `--force` skips the prompt, using detected tools (or the existing `tools` config) without asking

### Behaviors

- **prompt-with-detected-tools**: interactive `midas init` shows the picker with detected tools pre-checked and generates all three layers for the confirmed selection
- **non-interactive-init**: with `--tools` or `--force`, or when stdout is not a TTY, no prompt is shown and generation runs straight from the resolved selection
- **keep-existing-init-behavior**: config file and specs-root creation keep working exactly as before; re-running `init` refreshes generated files but never overwrites user config values
- **report-generated-files**: the command output (human and `--json`) lists every file created or updated, grouped by layer and tool

---

## midas update

Regenerates every midas-owned integration file after a CLI upgrade, mirroring `openspec update`.

### Components

- **UpdateCommand**: `midas update` reading the `tools` list from `midas.config.yaml`

### Behaviors

- **regenerate-from-config**: rewrites the AGENTS.md managed block, slash commands, and skills for every configured tool using the current templates
- **fail-without-init**: running `update` in a repo without `midas.config.yaml` exits non-zero pointing to `midas init`
- **report-refreshed-files**: lists every file refreshed, same format as `init`

---

## Open Questions

- None
