import { Command } from 'commander';
import { printResult } from '../lib/output.js';
import { resolveSpecsRoot } from '../lib/new.js';
import { listSpecStatuses, readSpecStatus, type IndexIssue, type SpecStatus } from '../lib/index-parser.js';

function renderIssueLine(issue: IndexIssue): string {
  const box = issue.done ? '[x]' : '[ ]';
  const blocked =
    !issue.done && issue.blockedBy.length > 0 ? ` (blocked by: ${issue.blockedBy.join(', ')})` : '';
  return `${box} ${issue.number} — ${issue.title}${blocked}`;
}

export function renderSpecDetail(status: SpecStatus): string {
  if (!status.brokenDown) {
    return `Spec '${status.slug}' has not been broken down yet.`;
  }
  const header = `${status.slug}  ${status.total} issues (${status.done} done, ${status.pending} pending)`;
  return [header, ...status.issues.map(renderIssueLine)].join('\n');
}

export function renderSpecList(statuses: SpecStatus[]): string {
  if (statuses.length === 0) {
    return 'No specs found.';
  }
  return statuses
    .map((s) =>
      s.brokenDown
        ? `${s.slug}  ${s.total} issues (${s.done} done, ${s.pending} pending)`
        : `${s.slug}  not broken down`,
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
