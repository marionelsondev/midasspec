import { Command } from 'commander';
import { printResult } from '../lib/output.js';
import { archiveSpec, type ArchiveResult } from '../lib/archive.js';
import { dim, gold, sym, yellowWarn } from '../lib/theme.js';

export function renderArchive(result: ArchiveResult): string {
  const lines = [`${gold(sym.check)} Archived '${result.slug}' ${dim('->')} ${gold(`${result.relTo}/`)}`];
  if (result.forced && result.pendingIssues > 0) {
    lines.push(
      yellowWarn(`Warning: archived with ${result.pendingIssues} pending issues (--force).`),
    );
  }
  return lines.join('\n');
}

export function makeArchiveCommand(): Command {
  return new Command('archive')
    .description('Archive a completed spec')
    .argument('<slug>', 'spec slug to archive')
    .option('-f, --force', 'archive even with pending issues')
    .action(async (slug: string, _opts: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals<{ json?: boolean; force?: boolean }>();
      const json = globals.json === true;
      const result = await archiveSpec(process.cwd(), slug, { force: globals.force === true });
      printResult(result, renderArchive(result), json);
    });
}
