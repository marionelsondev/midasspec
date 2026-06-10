import { Command } from 'commander';
import { relative } from 'node:path';
import { printResult } from '../lib/output.js';
import { dim, footer, gold, header, line, step, sym } from '../lib/theme.js';
import {
  CONFIG_FILENAME,
  generateIntegrations,
  initProject,
  readConfigTools,
  setConfigTools,
  type GeneratedReport,
  type InitResult,
} from '../lib/init.js';
import { detectTools, resolveToolsFlag, TOOL_REGISTRY, type ToolDescriptor } from '../lib/tools.js';
import { pickCheckbox } from '../lib/picker.js';

export interface InitPayload extends InitResult {
  tools: string[];
  generated: GeneratedReport;
}

interface InitOptions {
  tools?: string;
  force?: boolean;
}

export function renderToolFiles(
  layer: string,
  group: GeneratedReport['commands'],
  lines: string[]
): void {
  if (group.byTool.length === 0 && group.skipped.length === 0) {
    return;
  }
  lines.push(line());
  lines.push(step(`${layer}:`));
  for (const entry of group.byTool) {
    lines.push(line(gold(entry.tool)));
    for (const file of entry.files) {
      lines.push(line(`  ${dim(file)}`));
    }
  }
  if (group.skipped.length > 0) {
    lines.push(line(dim(`skipped (not supported): ${group.skipped.join(', ')}`)));
  }
}

export function renderInit(payload: InitPayload, cwd: string): string {
  const lines: string[] = [header('Spec-Driven Development'), line()];
  if (payload.initialized) {
    lines.push(step('Initialized MidasSpec project.'));
    lines.push(line(`${gold(sym.check)} created ${relative(cwd, payload.specsRoot)}`));
    lines.push(line(`${gold(sym.check)} created ${CONFIG_FILENAME}`));
  } else {
    lines.push(step(`Project already initialized (${CONFIG_FILENAME} exists).`));
  }
  lines.push(line());
  lines.push(
    step(`Tools: ${payload.tools.length > 0 ? gold(payload.tools.join(', ')) : dim('none')}`)
  );
  lines.push(line());
  lines.push(step(`${payload.generated.agents.path} ${dim(payload.generated.agents.action)}`));
  renderToolFiles('Slash commands', payload.generated.commands, lines);
  renderToolFiles('Skills', payload.generated.skills, lines);
  lines.push(line());
  lines.push(
    footer(
      `Saved tools to ${CONFIG_FILENAME}. ${dim(`Next ${sym.dot} try`)} ${gold('/midas:spec')} ${dim('in your agent')}`
    )
  );
  return lines.join('\n');
}

async function resolveSelection(cwd: string, opts: InitOptions): Promise<ToolDescriptor[]> {
  if (opts.tools !== undefined) {
    return resolveToolsFlag(opts.tools);
  }
  const interactive =
    opts.force !== true && process.stdin.isTTY === true && process.stdout.isTTY === true;
  if (interactive) {
    const detected = await detectTools(cwd);
    const detectedIds = new Set(detected.map((tool) => tool.id));
    const pickedIds = await pickCheckbox(
      TOOL_REGISTRY.map((tool) => ({
        id: tool.id,
        label: tool.name,
        checked: detectedIds.has(tool.id),
      })),
      { input: process.stdin, output: process.stdout }
    );
    return TOOL_REGISTRY.filter((tool) => pickedIds.includes(tool.id));
  }
  // --force / non-TTY: reuse the existing tools config when present, else detect.
  const configured = await readConfigTools(cwd);
  if (configured !== null) {
    return TOOL_REGISTRY.filter((tool) => configured.includes(tool.id));
  }
  return detectTools(cwd);
}

export function makeInitCommand(): Command {
  return new Command('init')
    .description('Prepare the repository for the SDD workflow')
    .option('--tools <ids>', 'comma-separated tool ids (or "all"); skips the prompt')
    .option('--force', 'skip the prompt, using detected tools or the existing tools config')
    .action(async (opts: InitOptions, cmd: Command) => {
      const json = cmd.optsWithGlobals<{ json?: boolean }>().json === true;
      const cwd = process.cwd();

      const selected = await resolveSelection(cwd, opts);
      const result = await initProject(cwd);
      const generated = await generateIntegrations(cwd, selected);
      const toolIds = selected.map((tool) => tool.id);
      await setConfigTools(cwd, toolIds);

      const payload: InitPayload = { ...result, tools: toolIds, generated };
      printResult(payload, renderInit(payload, cwd), json);
    });
}
