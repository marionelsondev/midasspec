# MidasSpec CLI

## Overview

A command-line tool (npm package `midasspec`, binary `midas`) that powers the Spec-Driven Development (SDD) workflow used by the `/spec` and `/break` skills. It is the deterministic backbone of the pipeline: it scaffolds spec folders, validates SPEC and issue files, tracks issue progress, and resolves the dependency graph between issues. The markdown files (`SPEC.md`, `issues/*.md`, `issues/INDEX.md`) remain the single source of truth — the CLI parses and edits them, never replaces them. AI skills keep the creative writing; the CLI guarantees structure, consistency, and tracking without relying on model behavior.

---

## midas (global behavior)

The CLI entry point and the conventions shared by every command.

### Components

- **HelpOutput**: usage text listing all commands, shown on `midas --help` or when no command is given
- **VersionFlag**: `--version` prints the installed version
- **JsonFlag**: global `--json` switch that makes any command emit machine-readable output for AI skills
- **ExitCodes**: `0` on success, non-zero on any error, so skills and scripts can branch on results

### Behaviors

- **show-help**: running `midas` with no command or with `--help` prints the command list and usage
- **show-version**: `midas --version` prints the version and exits
- **json-output-mode**: any command invoked with `--json` prints a single structured JSON object instead of human text
- **fail-with-nonzero-exit**: any error (unknown command, missing file, validation failure) exits non-zero with a one-line reason

---

## midas init

Prepares a repository to use the SDD workflow.

### Components

- **SpecsRoot**: the `docs/specs/` directory where all specs live
- **ConfigFile**: `midas.config.yaml` at the repo root, with optional `context` (project background shown to AI) and `rules` (per-artifact rules for `spec` and `break`), and an optional `specsRoot` overriding the default `docs/specs/` root

### Behaviors

- **create-specs-root**: creates `docs/specs/` when it does not exist
- **create-config-file**: writes a commented `midas.config.yaml` template with empty `context` and `rules` sections
- **idempotent-init**: running `midas init` again never overwrites an existing config; it reports the project is already initialized

---

## midas new

Scaffolds a new spec folder, replacing the manual slug and conflict handling done by the `/spec` skill today.

### Components

- **SlugArgument**: required spec name, accepted in any casing or spacing
- **ScaffoldedFolder**: `docs/specs/<slug>/` created empty, ready to receive `SPEC.md`
- **ConflictError**: structured error returned when the spec already exists

### Behaviors

- **normalize-slug**: the provided name is normalized to valid kebab-case before any filesystem action
- **scaffold-spec-folder**: creates `docs/specs/<slug>/` and reports the created path
- **reject-existing-spec**: if `docs/specs/<slug>/SPEC.md` already exists, exits non-zero with a conflict error and does not touch any file
- **report-created-path**: on success, prints the path where `SPEC.md` must be written (also present in `--json` output)

---

## midas status

Read-only view of every spec and its progress, parsed from the markdown files.

### Components

- **SpecTable**: list of all specs with slug, issue counts (total, done, pending), and whether they have been broken down
- **StatusDetail**: per-spec view with the full issue list and each issue's state

### Behaviors

- **list-specs**: `midas status` lists every folder under `docs/specs/` with its progress summary
- **show-spec-status**: `midas status <slug>` shows the spec's issues with done/pending state parsed from `INDEX.md` checkboxes
- **handle-not-broken-down**: a spec without an `issues/` folder is shown as "not broken down" instead of an error
- **fail-on-unknown-spec**: an unknown slug exits non-zero with a clear message

---

## midas validate

Checks that the markdown artifacts follow the formats defined by the `/spec` and `/break` skills.

### Components

- **ValidationReport**: list of errors and warnings, each pointing to a file and the violated rule

### Behaviors

- **validate-spec-format**: checks `SPEC.md` has the required sections (Overview, at least one page with Components and Behaviors, Open Questions)
- **validate-issue-format**: checks every issue file has the required sections (Functional Specification, Preconditions, Main Flow, Expected Result, Blocked by, Open Questions)
- **validate-index-consistency**: checks every `INDEX.md` annotation matches the `Blocked by` section of the corresponding issue file
- **detect-orphan-issues**: reports issue files that exist on disk but are not listed in `INDEX.md`, and INDEX entries whose file is missing
- **fail-on-errors**: exits non-zero when any error is found; warnings alone keep exit code zero

---

## midas issues

Dependency-aware issue listing — the feeder for planning and implementation steps.

### Components

- **IssueList**: all issues of a spec with number, title, state, and blockers
- **ReadyFilter**: `--ready` flag listing only issues that are not done and whose blockers are all done
- **BlockedFilter**: `--blocked` flag listing blocked issues along with which pending blockers hold them
- **DoneFilter**: `--done` flag listing completed issues

### Behaviors

- **list-all-issues**: `midas issues <slug>` lists every issue with its state and blockers
- **filter-ready**: `--ready` resolves the dependency graph and lists only unblocked, not-done issues
- **filter-blocked**: `--blocked` lists blocked issues, each annotated with the pending blocker numbers
- **filter-done**: `--done` lists only completed issues

---

## midas done / midas reopen

Progress tracking written back to `INDEX.md`.

### Components

- **IssueNumberArgument**: the two-digit issue number to update
- **UpdatedIndex**: `INDEX.md` rewritten with the toggled checkbox

### Behaviors

- **mark-issue-done**: `midas done <slug> <NN>` checks the issue's box in `INDEX.md`
- **reopen-issue**: `midas reopen <slug> <NN>` unchecks it
- **reject-unknown-issue**: a number not present in the INDEX exits non-zero without touching the file
- **report-newly-unblocked**: after marking an issue done, prints which issues became ready because of it

---

## midas instructions

Emits the writing instructions for an AI skill, so skill prompts stay thin and the CLI owns templates and rules.

### Components

- **InstructionsPayload**: JSON object with the artifact template, the rules from `midas.config.yaml`, the project `context`, and the resolved output path

### Behaviors

- **emit-spec-instructions**: `midas instructions spec --json` returns the SPEC template, spec rules, context, and the target `SPEC.md` path
- **emit-break-instructions**: `midas instructions break --spec <slug> --json` returns the issue file template, break rules, context, and the target `issues/` path
- **include-project-context**: the payload always includes the `context` from `midas.config.yaml` when present

---

## midas archive

Moves a finished spec out of the active list, preserving history.

### Components

- **ArchiveFolder**: `docs/specs/archive/<YYYY-MM-DD>-<slug>/` containing the spec verbatim

### Behaviors

- **archive-completed-spec**: moves the spec folder into the archive with a date prefix
- **warn-on-pending-issues**: archiving a spec with pending issues requires explicit confirmation (`--force`)
- **preserve-files-verbatim**: archived files are moved unchanged, never rewritten

---

## Open Questions

None at the moment.
