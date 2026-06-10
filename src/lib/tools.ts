import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { CliError } from './output.js';

export type FrontmatterStyle = 'yaml' | 'none';

export interface ToolCommands {
  /** Relative path (posix) of the command file for a given command name. */
  pathFor: (name: string) => string;
  frontmatter: FrontmatterStyle;
}

export interface ToolDescriptor {
  id: string;
  name: string;
  /** Directory at the repo root whose presence indicates the tool (omitted for marker-only tools). */
  rootDir?: string;
  /** Files (or directories) at the repo root whose presence indicates the tool. */
  markerFiles?: string[];
  /** When true, detection requires a marker file — rootDir alone is too generic. */
  markerOnlyDetection?: boolean;
  commands?: ToolCommands;
  skillsDir?: string;
}

export const TOOL_REGISTRY: ToolDescriptor[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    rootDir: '.claude',
    markerFiles: ['CLAUDE.md'],
    commands: {
      pathFor: (name) => `.claude/commands/midas/${name}.md`,
      frontmatter: 'yaml',
    },
    skillsDir: '.claude/skills',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    rootDir: '.cursor',
    commands: {
      pathFor: (name) => `.cursor/commands/midas-${name}.md`,
      frontmatter: 'none',
    },
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    rootDir: '.windsurf',
    skillsDir: '.windsurf/skills',
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    rootDir: '.codex',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    rootDir: '.gemini',
    markerFiles: ['GEMINI.md'],
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    rootDir: '.github',
    markerFiles: ['.github/copilot-instructions.md'],
    markerOnlyDetection: true,
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    rootDir: '.opencode',
  },
  {
    id: 'cline',
    name: 'Cline',
    rootDir: '.cline',
    markerFiles: ['.clinerules'],
  },
  {
    id: 'roocode',
    name: 'Roo Code',
    rootDir: '.roo',
  },
  {
    id: 'kilocode',
    name: 'Kilo Code',
    rootDir: '.kilocode',
  },
  {
    id: 'aider',
    name: 'Aider',
    markerFiles: ['.aider.conf.yml'],
  },
  {
    id: 'amazon-q',
    name: 'Amazon Q Developer',
    rootDir: '.amazonq',
  },
  {
    id: 'zed',
    name: 'Zed',
    rootDir: '.zed',
  },
];

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectTools(cwd: string): Promise<ToolDescriptor[]> {
  const detected: ToolDescriptor[] = [];
  for (const tool of TOOL_REGISTRY) {
    let found = false;
    if (tool.rootDir !== undefined && !tool.markerOnlyDetection) {
      found = await pathExists(join(cwd, tool.rootDir));
    }
    if (!found && tool.markerFiles !== undefined) {
      for (const marker of tool.markerFiles) {
        if (await pathExists(join(cwd, marker))) {
          found = true;
          break;
        }
      }
    }
    if (found) {
      detected.push(tool);
    }
  }
  return detected;
}

export function resolveToolsFlag(value: string): ToolDescriptor[] {
  if (value.trim() === 'all') {
    return [...TOOL_REGISTRY];
  }
  const ids = value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '');
  const resolved: ToolDescriptor[] = [];
  for (const id of ids) {
    const tool = TOOL_REGISTRY.find((entry) => entry.id === id);
    if (tool === undefined) {
      const valid = TOOL_REGISTRY.map((entry) => entry.id).join(', ');
      throw new CliError(`unknown tool '${id}' — valid ids: ${valid}`, 2);
    }
    if (!resolved.includes(tool)) {
      resolved.push(tool);
    }
  }
  return resolved;
}
