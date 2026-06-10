# MidasSpec

Spec-Driven Development (SDD) CLI. `midas` scaffolds spec folders, validates SPEC/issue markdown files, tracks issue progress, resolves issue dependency graphs — and installs the SDD workflow into your AI coding agents (Claude Code, Cursor, Windsurf, and any agent that reads `AGENTS.md`).

Markdown is the single source of truth: the CLI parses and edits `SPEC.md`, `issues/*.md`, and `issues/INDEX.md` — it never replaces them. AI agents keep the creative writing; the CLI guarantees structure, consistency, and tracking.

## Install

```bash
npm install -g midasspec
```

Requires Node.js 18+.

## Quick start

```bash
cd your-project
midas init
```

`midas init` detects the AI tools present in your repo (`.claude/`, `.cursor/`, `.windsurf/`, …), lets you confirm the selection, and generates three integration layers:

- **`AGENTS.md` managed block** — SDD workflow instructions inside `<!-- midas:begin -->` / `<!-- midas:end -->` markers, picked up by every AGENTS.md-aware agent. Your own content is never touched.
- **Slash commands** — `/midas:spec`, `/midas:break`, `/midas:implement`, `/midas:archive` in each tool's native format (e.g. `.claude/commands/midas/`).
- **Agent Skills** — `midas-*` skill directories (`SKILL.md`) under each tool's skills folder.

Non-interactive (CI):

```bash
midas init --tools claude,cursor   # exact selection
midas init --tools all             # every supported tool
midas init --force                 # detected tools, no prompt
```

After upgrading the CLI, refresh the generated files:

```bash
midas update
```

## The workflow

```bash
midas new "payment flow"        # scaffold docs/specs/payment-flow/
# ...write SPEC.md (or let your agent do it via /midas:spec)
midas instructions break --spec payment-flow --json   # templates + rules for issue breakdown
# ...write issues/*.md and issues/INDEX.md (or /midas:break)
midas validate payment-flow     # check artifact formats and INDEX consistency
midas issues payment-flow --ready   # dependency-aware: what can be worked on now
midas done payment-flow 03      # mark an issue done; reports newly unblocked issues
midas status                    # progress across all specs
midas archive payment-flow      # move a finished spec to the archive
```

Every command supports `--json` for machine-readable output, which is how the generated slash commands and skills drive the CLI.

## Configuration

`midas init` writes `midas.config.yaml` at the repo root:

```yaml
# specsRoot: docs/specs   # where specs live (default: docs/specs)
context: |                # project background injected into AI instructions
rules:                    # per-artifact rules for `midas instructions`
#   spec: []
#   break: []
tools:                    # AI tools configured by `midas init`
  - claude
```

## Supported tools

Detection covers Claude Code, Cursor, Windsurf, Codex, Gemini CLI, GitHub Copilot, OpenCode, Cline, Roo Code, Kilo Code, Aider, Amazon Q, and Zed. Tools without a native slash-command or skills convention still benefit from the universal `AGENTS.md` layer.

## License

MIT
