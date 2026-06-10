import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateIntegrations } from '../src/lib/init.js';
import { TOOL_REGISTRY, type ToolDescriptor } from '../src/lib/tools.js';

const claude = TOOL_REGISTRY.find((t) => t.id === 'claude') as ToolDescriptor;
const cursor = TOOL_REGISTRY.find((t) => t.id === 'cursor') as ToolDescriptor;
const codex = TOOL_REGISTRY.find((t) => t.id === 'codex') as ToolDescriptor;

let projectDir: string;
let home: string;

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), 'midas-integrations-project-'));
  home = await mkdtemp(join(tmpdir(), 'midas-integrations-home-'));
});

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('generateIntegrations (global destinations)', () => {
  it('writes every command and skill under the home, never inside the project', async () => {
    const report = await generateIntegrations(projectDir, [claude, cursor, codex], home);

    for (const entry of report.commands.byTool) {
      expect(entry.files.length).toBeGreaterThan(0);
      expect(entry.files.every((p) => p.startsWith(home))).toBe(true);
    }
    for (const entry of report.skills.byTool) {
      expect(entry.files.length).toBeGreaterThan(0);
      expect(entry.files.every((p) => p.startsWith(home))).toBe(true);
    }

    expect(report.commands.skipped).toContain('codex');
    expect(report.skills.skipped).toContain('codex');
    expect(report.skills.skipped).toContain('cursor');

    // only AGENTS.md is created in the project — no .claude/.cursor dirs
    expect(await readdir(projectDir)).toEqual(['AGENTS.md']);

    const skill = await readFile(
      join(home, '.claude', 'skills', 'midas-spec', 'SKILL.md'),
      'utf8'
    );
    expect(skill).toContain('name: midas-spec');
    const command = await readFile(join(home, '.cursor', 'commands', 'midas-spec.md'), 'utf8');
    expect(command).toContain('midas instructions spec --json');
  });
});
