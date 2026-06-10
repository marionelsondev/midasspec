# 01 — Run CLI with help, version, and JSON conventions

**Source:** midas (global behavior)

**Summary:** A user can install and run `midas`, see help and version, and rely on consistent JSON output and exit codes across all commands.

## Functional Specification

- Running `midas` with no command or with `--help` prints usage text listing all commands.
- `midas --version` prints the installed version and exits.
- A global `--json` flag makes any command emit a single machine-readable JSON object instead of human text.
- Every error (unknown command, missing file, validation failure) exits non-zero with a one-line reason.

## Preconditions

- The CLI is installed and available on the PATH (npm package `midasspec`, binary `midas`).

## Main Flow

1. User runs `midas` (or `midas --help`).
2. The CLI prints the command list and usage.
3. User runs `midas --version` and sees the version.
4. User runs an unknown command and receives a one-line error with a non-zero exit code.

## Expected Result

- The CLI runs on a clean machine, with help, version, JSON mode, and exit-code conventions in place for every future command.

## Blocked by

- None

## Open Questions

- None
