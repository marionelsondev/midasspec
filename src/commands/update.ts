import { Command } from 'commander';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { CliError, printResult } from '../lib/output.js';
import {
  CONFIG_FILENAME,
  generateIntegrations,
  readConfigTools,
  type GeneratedReport,
} from '../lib/init.js';
import { TOOL_REGISTRY } from '../lib/tools.js';
import { renderToolFiles } from './init.js';
import { dim, footer, gold, header, line, step } from '../lib/theme.js';

export interface UpdatePayload {
  tools: string[];
  generated: GeneratedReport;
}

export function renderUpdate(payload: UpdatePayload): string {
  const lines: string[] = [header('update'), line()];
  if (payload.tools.length > 0) {
    lines.push(step(`Tools: ${gold(payload.tools.join(', '))}`));
  } else {
    lines.push(step(dim('No tools configured.')));
  }
  lines.push(line());
  lines.push(step(`${payload.generated.agents.path} ${dim(payload.generated.agents.action)}`));
  renderToolFiles('Slash commands', payload.generated.commands, lines);
  renderToolFiles('Skills', payload.generated.skills, lines);
  lines.push(line());
  lines.push(footer(dim('Integration files refreshed.')));
  return lines.join('\n');
}

export function makeUpdateCommand(): Command {
  return new Command('update')
    .description('Regenerate midas-owned integration files from the configured tools')
    .action(async (_opts: Record<string, never>, cmd: Command) => {
      const json = cmd.optsWithGlobals<{ json?: boolean }>().json === true;
      const cwd = process.cwd();

      try {
        await access(join(cwd, CONFIG_FILENAME));
      } catch {
        throw new CliError(`${CONFIG_FILENAME} not found — run \`midas init\` first`, 1);
      }

      const configured = (await readConfigTools(cwd)) ?? [];
      const tools = TOOL_REGISTRY.filter((tool) => configured.includes(tool.id));
      const generated = await generateIntegrations(cwd, tools);

      const payload: UpdatePayload = { tools: tools.map((tool) => tool.id), generated };
      printResult(payload, renderUpdate(payload), json);
    });
}
