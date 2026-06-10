import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { AGENTS_FILENAME, writeAgentsBlock } from './agents-md.js';
import { generateCommands } from './commands-gen.js';
import { generateSkills } from './skills-gen.js';
import type { ToolDescriptor } from './tools.js';

export const DEFAULT_SPECS_ROOT = 'docs/specs';
export const CONFIG_FILENAME = 'midas.config.yaml';

export const CONFIG_TEMPLATE = `# MidasSpec configuration
# specsRoot: docs/specs        # optional: override where specs live
# context: |                   # project background shown to AI skills
context:
# rules:
#   spec: []                   # per-artifact rules for \`midas spec\`
#   break: []                  # per-artifact rules for \`midas break\`
rules:
`;

export interface InitResult {
  initialized: boolean;
  configPath: string;
  specsRoot: string;
  createdSpecsRoot: boolean;
  createdConfig: boolean;
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(path: string): Promise<boolean> {
  const created = await mkdir(path, { recursive: true });
  return created !== undefined;
}

export async function initProject(cwd: string): Promise<InitResult> {
  const configPath = join(cwd, CONFIG_FILENAME);

  if (await exists(configPath)) {
    let specsRootRel = DEFAULT_SPECS_ROOT;
    try {
      const raw = await readFile(configPath, 'utf8');
      const parsed = load(raw);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        typeof (parsed as Record<string, unknown>).specsRoot === 'string'
      ) {
        specsRootRel = (parsed as Record<string, unknown>).specsRoot as string;
      }
    } catch {
      // malformed YAML: fall back to default specs root
    }
    const specsRoot = join(cwd, specsRootRel);
    const createdSpecsRoot = await ensureDir(specsRoot);
    return {
      initialized: false,
      configPath,
      specsRoot,
      createdSpecsRoot,
      createdConfig: false,
    };
  }

  const specsRoot = join(cwd, DEFAULT_SPECS_ROOT);
  const createdSpecsRoot = await ensureDir(specsRoot);
  await writeFile(configPath, CONFIG_TEMPLATE, 'utf8');

  return {
    initialized: true,
    configPath,
    specsRoot,
    createdSpecsRoot,
    createdConfig: true,
  };
}

/**
 * Tool ids from the `tools` key of an existing config; null when the config
 * or key is absent or unreadable (an explicit `tools: []` returns []).
 */
export async function readConfigTools(cwd: string): Promise<string[] | null> {
  let raw: string;
  try {
    raw = await readFile(join(cwd, CONFIG_FILENAME), 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = load(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }
  const tools = (parsed as Record<string, unknown>).tools;
  if (typeof tools === 'string') {
    return [tools];
  }
  if (Array.isArray(tools)) {
    return tools.filter((item): item is string => typeof item === 'string');
  }
  return null;
}

// Matches a top-level `tools:` key plus its value: either a (possibly
// multi-line) flow list `[...]`, or its indented (or `- ` list) lines.
const TOOLS_BLOCK_RE =
  /^tools:[ \t]*\[[^\]]*\][^\n]*\n?|^tools:[^\n]*(?:\n(?:[ \t]+[^\n]*|- [^\n]*))*\n?/m;

/**
 * Persist the selected tool ids to the `tools` key of midas.config.yaml.
 *
 * The config is hand-commented YAML (see CONFIG_TEMPLATE); re-serializing
 * with js-yaml would drop the comments and reformat user values, so we edit
 * the raw text surgically: replace the existing top-level `tools:` block when
 * present, otherwise append one at the end. All other keys are untouched.
 */
export async function setConfigTools(cwd: string, toolIds: string[]): Promise<void> {
  const configPath = join(cwd, CONFIG_FILENAME);
  const raw = await readFile(configPath, 'utf8');
  const block =
    toolIds.length === 0
      ? 'tools: []\n'
      : `tools:\n${toolIds.map((id) => `  - ${id}`).join('\n')}\n`;
  const next = TOOLS_BLOCK_RE.test(raw)
    ? raw.replace(TOOLS_BLOCK_RE, block)
    : (raw === '' || raw.endsWith('\n') ? raw : raw + '\n') + block;
  await writeFile(configPath, next, 'utf8');
}

export interface ToolFiles {
  tool: string;
  files: string[];
}

export interface GeneratedReport {
  agents: { path: string; action: 'created' | 'updated' | 'unchanged' };
  commands: { byTool: ToolFiles[]; skipped: string[] };
  skills: { byTool: ToolFiles[]; skipped: string[] };
}

/** Generate the three integration layers for the selected tools. */
export async function generateIntegrations(
  cwd: string,
  tools: ToolDescriptor[]
): Promise<GeneratedReport> {
  const agents = await writeAgentsBlock(cwd);
  const commands: GeneratedReport['commands'] = { byTool: [], skipped: [] };
  const skills: GeneratedReport['skills'] = { byTool: [], skipped: [] };

  for (const tool of tools) {
    const commandResult = await generateCommands(cwd, [tool]);
    if (commandResult.skipped.length > 0) {
      commands.skipped.push(tool.id);
    } else {
      commands.byTool.push({ tool: tool.id, files: commandResult.written });
    }
    const skillResult = await generateSkills(cwd, [tool]);
    if (skillResult.skipped.length > 0) {
      skills.skipped.push(tool.id);
    } else {
      skills.byTool.push({ tool: tool.id, files: skillResult.written });
    }
  }

  return { agents: { path: AGENTS_FILENAME, action: agents.action }, commands, skills };
}
