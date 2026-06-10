import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSkills, renderSkillFile } from '../src/lib/skills-gen.js';
import { WORKFLOW_TEMPLATES } from '../src/lib/workflow-templates.js';
import { TOOL_REGISTRY, type ToolDescriptor } from '../src/lib/tools.js';

const claude = TOOL_REGISTRY.find((t) => t.id === 'claude') as ToolDescriptor;
const windsurf = TOOL_REGISTRY.find((t) => t.id === 'windsurf') as ToolDescriptor;
const cursor = TOOL_REGISTRY.find((t) => t.id === 'cursor') as ToolDescriptor;

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'midas-skills-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('renderSkillFile', () => {
  it('renders name and description yaml frontmatter followed by the instructions', () => {
    const spec = WORKFLOW_TEMPLATES[0];
    const content = renderSkillFile(spec);
    expect(content.startsWith('---\n')).toBe(true);
    expect(content).toContain(`name: midas-${spec.name}`);
    expect(content).toContain(`description: ${spec.description}`);
    expect(content).toContain(spec.body);
  });

  it('reuses the shared workflow templates so skills mirror command content', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      const content = renderSkillFile(template);
      expect(content).toContain(template.body);
      expect(content).toContain(template.description);
    }
  });
});

describe('generateSkills', () => {
  it('writes the four midas-* skill directories under each tool skillsDir', async () => {
    const result = await generateSkills(dir, [claude, windsurf]);

    expect(result.written).toEqual([
      '.claude/skills/midas-spec/SKILL.md',
      '.claude/skills/midas-break/SKILL.md',
      '.claude/skills/midas-implement/SKILL.md',
      '.claude/skills/midas-archive/SKILL.md',
      '.windsurf/skills/midas-spec/SKILL.md',
      '.windsurf/skills/midas-break/SKILL.md',
      '.windsurf/skills/midas-implement/SKILL.md',
      '.windsurf/skills/midas-archive/SKILL.md',
    ]);
    expect(result.skipped).toEqual([]);

    const skill = await readFile(
      join(dir, '.claude', 'skills', 'midas-spec', 'SKILL.md'),
      'utf8'
    );
    expect(skill.startsWith('---\n')).toBe(true);
    expect(skill).toContain('name: midas-spec');
    expect(skill).toContain('midas instructions spec --json');
  });

  it('reports tools without a skillsDir as skipped', async () => {
    const result = await generateSkills(dir, [cursor, claude]);

    expect(result.skipped).toEqual(['cursor']);
    expect(result.written).toHaveLength(4);
    expect(result.written.every((p) => p.startsWith('.claude/skills/'))).toBe(true);
  });

  it('rewrites midas-* skills but leaves other skills untouched', async () => {
    const userSkillDir = join(dir, '.claude', 'skills', 'my-skill');
    await mkdir(userSkillDir, { recursive: true });
    await writeFile(join(userSkillDir, 'SKILL.md'), 'user skill\n', 'utf8');
    const staleDir = join(dir, '.claude', 'skills', 'midas-break');
    await mkdir(staleDir, { recursive: true });
    await writeFile(join(staleDir, 'SKILL.md'), 'stale generated content\n', 'utf8');

    const result = await generateSkills(dir, [claude]);

    expect(result.written).toContain('.claude/skills/midas-break/SKILL.md');
    const breakSkill = await readFile(join(staleDir, 'SKILL.md'), 'utf8');
    expect(breakSkill).not.toContain('stale generated content');
    expect(breakSkill).toContain('name: midas-break');
    expect(await readFile(join(userSkillDir, 'SKILL.md'), 'utf8')).toBe('user skill\n');
  });

  it('is idempotent: regeneration yields identical files', async () => {
    await generateSkills(dir, [claude, windsurf]);
    const path = join(dir, '.windsurf', 'skills', 'midas-implement', 'SKILL.md');
    const first = await readFile(path, 'utf8');

    await generateSkills(dir, [claude, windsurf]);

    expect(await readFile(path, 'utf8')).toBe(first);
  });
});
