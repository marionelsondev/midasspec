import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { globalConfigPath, resolveConfig } from './config.js';
import { generateCommands } from './commands-gen.js';
import { generateSkills } from './skills-gen.js';
import { CliError } from './output.js';
import { TOOL_REGISTRY } from './tools.js';
import type { ToolFiles } from './init.js';

export interface UpdateReport {
  tools: string[];
  commands: { byTool: ToolFiles[]; skipped: string[] };
  skills: { byTool: ToolFiles[]; skipped: string[] };
}

/**
 * Regenerate the global integrations (commands and skills under the user
 * home) from the `tools` key of the global config. Nothing is written
 * outside the home directory.
 */
export async function runUpdate(homeDir = homedir()): Promise<UpdateReport> {
  const configPath = globalConfigPath(homeDir);
  try {
    await access(configPath);
  } catch {
    throw new CliError(`global config not found at ${configPath} — run \`midas init\` first`, 1);
  }

  // Passing homeDir as cwd keeps any project layer out of the resolution;
  // `tools` is global-only regardless.
  const { tools: configured } = await resolveConfig(homeDir, homeDir);
  const tools = TOOL_REGISTRY.filter((tool) => configured.includes(tool.id));

  const commands: UpdateReport['commands'] = { byTool: [], skipped: [] };
  const skills: UpdateReport['skills'] = { byTool: [], skipped: [] };

  for (const tool of tools) {
    const commandResult = await generateCommands([tool], homeDir);
    if (commandResult.skipped.length > 0) {
      commands.skipped.push(tool.id);
    } else {
      commands.byTool.push({ tool: tool.id, files: commandResult.written });
    }
    const skillResult = await generateSkills([tool], homeDir);
    if (skillResult.skipped.length > 0) {
      skills.skipped.push(tool.id);
    } else {
      skills.byTool.push({ tool: tool.id, files: skillResult.written });
    }
  }

  return { tools: tools.map((tool) => tool.id), commands, skills };
}
