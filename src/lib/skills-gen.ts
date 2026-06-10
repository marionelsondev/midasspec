import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ToolDescriptor } from './tools.js';
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from './workflow-templates.js';

export interface GenerateSkillsResult {
  /** Repo-relative posix paths of every SKILL.md written. */
  written: string[];
  /** Ids of selected tools skipped because they have no skills directory. */
  skipped: string[];
}

export function renderSkillFile(template: WorkflowTemplate): string {
  return [
    '---',
    `name: midas-${template.name}`,
    `description: ${template.description}`,
    '---',
    '',
    template.body,
    '',
  ].join('\n');
}

export async function generateSkills(
  cwd: string,
  tools: ToolDescriptor[]
): Promise<GenerateSkillsResult> {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const tool of tools) {
    if (tool.skillsDir === undefined) {
      skipped.push(tool.id);
      continue;
    }
    for (const template of WORKFLOW_TEMPLATES) {
      const relPath = `${tool.skillsDir}/midas-${template.name}/SKILL.md`;
      const absPath = join(cwd, ...relPath.split('/'));
      await mkdir(dirname(absPath), { recursive: true });
      await writeFile(absPath, renderSkillFile(template), 'utf8');
      written.push(relPath);
    }
  }

  return { written, skipped };
}
