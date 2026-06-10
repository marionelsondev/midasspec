# 04 — Generate Agent Skills per tool

**Source:** Agent Skills Generation

**Summary:** Selected tools with a skills directory get one `midas-*` skill per workflow command, generated from the same templates as the slash commands.

## Functional Specification

- `generateSkills(cwd, tools)` creates `midas-spec`, `midas-break`, `midas-implement`, and `midas-archive` skill directories under each tool's `skillsDir`, each containing a `SKILL.md` with `name` and `description` YAML frontmatter followed by the instructions.
- Skill instructions are rendered from the same shared workflow templates used by issue 03, so the two layers cannot drift.
- Regeneration rewrites only the `midas-*` skill directories; other skills in the directory are left intact.
- Tools without a `skillsDir` are skipped and reported.

## Preconditions

- The tool registry exists (issue 01) and the shared workflow templates exist (issue 03).

## Main Flow

1. Code calls `generateSkills(cwd, [claude])`.
2. `.claude/skills/midas-{spec,break,implement,archive}/SKILL.md` are written.
3. A user skill `.claude/skills/my-skill/SKILL.md` already exists.
4. Regeneration rewrites the four midas skills and leaves `my-skill` untouched.

## Expected Result

- Unit tests cover skill layout, frontmatter, shared-template reuse, skipped tools, and preservation of unrelated skills.

## Blocked by

- [01 — Define the tool registry and detect installed agents](01-define-the-tool-registry-and-detect-installed-agents.md)
- [03 — Generate /midas:* slash commands per tool](03-generate-midas-slash-commands-per-tool.md)

## Open Questions

- None
