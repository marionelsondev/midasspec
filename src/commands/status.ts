import { Command } from 'commander';
import { printResult } from '../lib/output.js';
import { resolveSpecsRoot } from '../lib/new.js';
import { listSpecStatuses, readSpecStatus, type IndexIssue, type SpecStatus } from '../lib/index-parser.js';
import { bold, dim, gold, progressBar, sym } from '../lib/theme.js';

function renderIssueLine(issue: IndexIssue): string {
  const box = issue.done ? gold(sym.check) : dim(sym.off);
  const title = issue.done ? dim(`${issue.number} — ${issue.title}`) : `${issue.number} — ${issue.title}`;
  const blocked =
    !issue.done && issue.blockedBy.length > 0
      ? dim(` (blocked by: ${issue.blockedBy.join(', ')})`)
      : '';
  return `${box} ${title}${blocked}`;
}

function renderProgressHeader(status: SpecStatus): string {
  return `${bold(status.slug)}  ${progressBar(status.done, status.total)}  ${status.total} issues (${status.done} done, ${status.pending} pending)`;
}

export function renderSpecDetail(status: SpecStatus): string {
  if (!status.brokenDown) {
    return `Spec '${status.slug}' has not been broken down yet.`;
  }
  return [renderProgressHeader(status), ...status.issues.map(renderIssueLine)].join('\n');
}

export function renderSpecList(statuses: SpecStatus[]): string {
  if (statuses.length === 0) {
    return 'No specs found.';
  }
  const width = Math.max(...statuses.map((s) => s.slug.length));
  return statuses
    .map((s) =>
      s.brokenDown
        ? `${bold(s.slug.padEnd(width))}  ${progressBar(s.done, s.total)}  ${s.total} issues (${s.done} done, ${s.pending} pending)`
        : `${bold(s.slug.padEnd(width))}  ${dim('not broken down')}`,
    )
    .join('\n');
}

export function makeStatusCommand(): Command {
  return new Command('status')
    .description('Show spec progress')
    .argument('[slug]', 'spec slug to inspect')
    .action(async (slug: string | undefined, _opts: unknown, cmd: Command) => {
      const json = cmd.optsWithGlobals<{ json?: boolean }>().json === true;
      const root = await resolveSpecsRoot(process.cwd());
      if (slug !== undefined) {
        const status = await readSpecStatus(root, slug);
        printResult(status, renderSpecDetail(status), json);
      } else {
        const statuses = await listSpecStatuses(root);
        printResult({ specs: statuses }, renderSpecList(statuses), json);
      }
    });
}
