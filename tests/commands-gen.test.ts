import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateCommands, renderCommandFile } from '../src/lib/commands-gen.js';
import { WORKFLOW_TEMPLATES } from '../src/lib/workflow-templates.js';
import { TOOL_REGISTRY, type ToolDescriptor } from '../src/lib/tools.js';

const claude = TOOL_REGISTRY.find((t) => t.id === 'claude') as ToolDescriptor;
const cursor = TOOL_REGISTRY.find((t) => t.id === 'cursor') as ToolDescriptor;
const codex = TOOL_REGISTRY.find((t) => t.id === 'codex') as ToolDescriptor;

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'midas-commands-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('WORKFLOW_TEMPLATES', () => {
  it('defines the four workflow commands', () => {
    expect(WORKFLOW_TEMPLATES.map((t) => t.name)).toEqual([
      'spec',
      'break',
      'implement',
      'archive',
    ]);
  });

  it('each body drives the workflow through midas --json calls', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      expect(template.body).toMatch(/`midas .*--json`/);
      expect(template.description.length).toBeGreaterThan(0);
    }
  });
});

describe('renderCommandFile', () => {
  it('renders yaml frontmatter with description and argument-hint', () => {
    const spec = WORKFLOW_TEMPLATES[0];
    const content = renderCommandFile(spec, 'yaml');
    expect(content.startsWith('---\n')).toBe(true);
    expect(content).toContain(`description: ${spec.description}`);
    expect(content).toContain('argument-hint: [spec-name]');
    expect(content).toContain(spec.body);
  });

  it('renders no frontmatter for the none dialect', () => {
    const spec = WORKFLOW_TEMPLATES[0];
    const content = renderCommandFile(spec, 'none');
    expect(content.startsWith('---')).toBe(false);
    expect(content).toContain(spec.description);
    expect(content).toContain(spec.body);
  });
});

describe('generateCommands', () => {
  it('writes the four command files at each tool-specific path', async () => {
    const result = await generateCommands(dir, [claude, cursor]);

    expect(result.written).toEqual([
      '.claude/commands/midas/spec.md',
      '.claude/commands/midas/break.md',
      '.claude/commands/midas/implement.md',
      '.claude/commands/midas/archive.md',
      '.cursor/commands/midas-spec.md',
      '.cursor/commands/midas-break.md',
      '.cursor/commands/midas-implement.md',
      '.cursor/commands/midas-archive.md',
    ]);
    expect(result.skipped).toEqual([]);

    const claudeSpec = await readFile(
      join(dir, '.claude', 'commands', 'midas', 'spec.md'),
      'utf8'
    );
    expect(claudeSpec.startsWith('---\n')).toBe(true);
    expect(claudeSpec).toContain('description:');

    const cursorSpec = await readFile(join(dir, '.cursor', 'commands', 'midas-spec.md'), 'utf8');
    expect(cursorSpec.startsWith('---')).toBe(false);
    expect(cursorSpec).toContain('midas instructions spec --json');
  });

  it('reports tools without a command adapter as skipped', async () => {
    const result = await generateCommands(dir, [codex, claude]);

    expect(result.skipped).toEqual(['codex']);
    expect(result.written).toHaveLength(4);
    expect(result.written.every((p) => p.startsWith('.claude/'))).toBe(true);
  });

  it('overwrites midas-owned files but leaves other files untouched', async () => {
    const commandsDir = join(dir, '.claude', 'commands', 'midas');
    await mkdir(commandsDir, { recursive: true });
    await writeFile(join(commandsDir, 'custom.md'), 'user content\n', 'utf8');
    await writeFile(join(commandsDir, 'spec.md'), 'stale generated content\n', 'utf8');

    const result = await generateCommands(dir, [claude]);

    expect(result.written).toContain('.claude/commands/midas/spec.md');
    const spec = await readFile(join(commandsDir, 'spec.md'), 'utf8');
    expect(spec).not.toContain('stale generated content');
    expect(spec).toContain('midas instructions spec --json');
    expect(await readFile(join(commandsDir, 'custom.md'), 'utf8')).toBe('user content\n');
  });

  it('is idempotent: regeneration yields identical files', async () => {
    await generateCommands(dir, [claude, cursor]);
    const path = join(dir, '.cursor', 'commands', 'midas-implement.md');
    const first = await readFile(path, 'utf8');

    await generateCommands(dir, [claude, cursor]);

    expect(await readFile(path, 'utf8')).toBe(first);
  });
});
