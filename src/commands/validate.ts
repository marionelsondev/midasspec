import { Command } from 'commander';
import { CliError, printResult } from '../lib/output.js';
import { renderHumanReport, validateSpec } from '../lib/validate.js';

export function makeValidateCommand(): Command {
  return new Command('validate')
    .description('Validate SPEC.md, issue files, and INDEX.md consistency')
    .argument('<slug>', 'spec slug')
    .action(async (slug: string, _opts: unknown, cmd: Command) => {
      const json = cmd.optsWithGlobals<{ json?: boolean }>().json === true;
      const result = await validateSpec(process.cwd(), slug);
      printResult(result, renderHumanReport(result), json);
      if (!result.ok) {
        throw new CliError(`validation failed: ${result.errorCount} error(s)`, 1);
      }
    });
}
