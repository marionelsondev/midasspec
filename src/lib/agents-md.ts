import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CliError } from './output.js';

export const AGENTS_FILENAME = 'AGENTS.md';
export const BLOCK_BEGIN = '<!-- midas:begin -->';
export const BLOCK_END = '<!-- midas:end -->';

const BLOCK_BODY = `# MidasSpec — Spec-Driven Development

This project uses MidasSpec (\`midas\`) for Spec-Driven Development. Specs are
markdown files and they are the single source of truth — the CLI parses and
edits them, never replaces them.

## Where things live

- Specs live under \`.midas/specs/<spec-name>/\` by default (configurable via
  \`specsRoot\` in \`midas.config.yaml\`).
- Each spec folder has a \`SPEC.md\` (the functional spec), an \`issues/\` folder
  with one markdown file per issue, and \`issues/INDEX.md\` tracking done state
  and dependencies (\`blocked by\`).

## The workflow loop

1. \`midas new <spec-name>\` — scaffold a new spec folder.
2. Write \`SPEC.md\` — describe components and behaviors (run
   \`midas instructions spec\` for the expected format and project rules).
3. \`midas instructions break\` — get instructions for breaking the spec into
   issues, then write \`issues/*.md\` and \`issues/INDEX.md\`.
4. \`midas issues <spec-slug> --ready\` — list issues whose blockers are all done.
5. Implement a ready issue, then \`midas done <spec-slug> <issue-number>\` to mark it.
6. Repeat 4–5 until every issue is done, then \`midas archive <spec-name>\`.

## Useful commands

- \`midas status\` — progress overview across specs.
- \`midas validate <spec-slug>\` — check SPEC/issue files and INDEX.md consistency.
- \`midas reopen <spec-slug> <issue-number>\` — undo a \`done\`.

Every command supports \`--json\` for machine-readable output — prefer it when
driving the workflow programmatically.`;

export const MANAGED_BLOCK = `${BLOCK_BEGIN}\n${BLOCK_BODY}\n${BLOCK_END}`;

export interface AgentsBlockResult {
  path: string;
  action: 'created' | 'updated' | 'unchanged';
}

export async function writeAgentsBlock(cwd: string): Promise<AgentsBlockResult> {
  const path = join(cwd, AGENTS_FILENAME);

  let existing: string | null = null;
  try {
    existing = await readFile(path, 'utf8');
  } catch {
    // file does not exist
  }

  if (existing === null) {
    await writeFile(path, `${MANAGED_BLOCK}\n`, 'utf8');
    return { path, action: 'created' };
  }

  // Match markers only when they make up an entire line, so marker text
  // quoted inline or in code fences is not mistaken for the real block.
  const beginRe = /^<!-- midas:begin -->\r?$/m;
  const endRe = /^<!-- midas:end -->\r?$/gm;

  const beginMatch = beginRe.exec(existing);

  let next: string;
  if (beginMatch) {
    endRe.lastIndex = beginMatch.index + beginMatch[0].length;
    const endMatch = endRe.exec(existing);
    if (!endMatch) {
      throw new CliError(
        `${AGENTS_FILENAME} has a ${BLOCK_BEGIN} marker without a matching ${BLOCK_END} marker; fix the file and rerun`,
      );
    }
    next =
      existing.slice(0, beginMatch.index) +
      MANAGED_BLOCK +
      existing.slice(endMatch.index + endMatch[0].length);
  } else {
    const separator = existing.endsWith('\n') ? '\n' : '\n\n';
    next = `${existing}${separator}${MANAGED_BLOCK}\n`;
  }

  if (next === existing) {
    return { path, action: 'unchanged' };
  }

  await writeFile(path, next, 'utf8');
  return { path, action: 'updated' };
}
