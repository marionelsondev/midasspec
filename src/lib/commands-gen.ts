import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ToolDescriptor } from './tools.js';
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from './workflow-templates.js';

export interface GenerateCommandsResult {
  /** Repo-relative posix paths of every command file written. */
  written: string[];
  /** Ids of selected tools skipped because they have no command adapter. */
  skipped: string[];
}

export function renderCommandFile(
  template: WorkflowTemplate,
  frontmatter: 'yaml' | 'none'
): string {
  if (frontmatter === 'yaml') {
    const lines = ['---', `description: ${template.description}`];
    if (template.argumentHint !== undefined) {
      lines.push(`argument-hint: ${template.argumentHint}`);
    }
    lines.push('---', '', template.body);
    return `${lines.join('\n')}\n`;
  }
  return `# midas ${template.name} — ${template.description}\n\n${template.body}\n`;
}

export async function generateCommands(
  cwd: string,
  tools: ToolDescriptor[]
): Promise<GenerateCommandsResult> {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const tool of tools) {
    if (tool.commands === undefined) {
      skipped.push(tool.id);
      continue;
    }
    for (const template of WORKFLOW_TEMPLATES) {
      const relPath = tool.commands.pathFor(template.name);
      const absPath = join(cwd, ...relPath.split('/'));
      await mkdir(dirname(absPath), { recursive: true });
      await writeFile(absPath, renderCommandFile(template, tool.commands.frontmatter), 'utf8');
      written.push(relPath);
    }
  }

  return { written, skipped };
}
