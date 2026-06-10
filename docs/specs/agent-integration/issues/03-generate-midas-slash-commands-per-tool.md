# 03 — Generate /midas:* slash commands per tool

**Source:** Slash Command Generation

**Summary:** Selected tools with a command adapter get the four `/midas:*` workflow command files in their native format.

## Functional Specification

- Shared workflow templates define the body of the four commands `spec`, `break`, `implement`, and `archive`; each body instructs the agent to drive the workflow via `midas ... --json` calls.
- Each registry tool may declare a command adapter: target path pattern (e.g. `.claude/commands/midas/<name>.md`, `.cursor/commands/midas-<name>.md`) and frontmatter dialect.
- `generateCommands(cwd, tools)` writes the four files for every tool with an adapter, returns the list of written paths, and reports tools skipped for having no adapter.
- Generation overwrites midas-owned command files but never touches other files in the tool's commands directory.

## Preconditions

- The tool registry exists (issue 01).

## Main Flow

1. Code calls `generateCommands(cwd, [claude, cursor])`.
2. `.claude/commands/midas/{spec,break,implement,archive}.md` and the Cursor equivalents are written with each tool's frontmatter.
3. A user file `.claude/commands/midas/custom.md` already exists.
4. Regeneration rewrites the four midas files and leaves `custom.md` untouched.

## Expected Result

- Unit tests cover per-tool paths and frontmatter, the skipped-tools report, and preservation of unrelated files.

## Blocked by

- [01 — Define the tool registry and detect installed agents](01-define-the-tool-registry-and-detect-installed-agents.md)

## Open Questions

- None
