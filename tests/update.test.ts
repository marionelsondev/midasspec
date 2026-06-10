import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../src/index.js';
import { CONFIG_FILENAME } from '../src/lib/init.js';

let dir: string;
let originalIsTTY: boolean | undefined;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'midas-update-'));
  vi.spyOn(process, 'cwd').mockReturnValue(dir);
  originalIsTTY = process.stdin.isTTY;
  process.stdin.isTTY = false;
});

afterEach(async () => {
  vi.restoreAllMocks();
  (process.stdin as unknown as { isTTY: boolean | undefined }).isTTY = originalIsTTY;
  await rm(dir, { recursive: true, force: true });
});

/** Run the CLI capturing stdout (printResult writes there directly) and stderr. */
async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      out += chunk.toString();
      return true;
    });
  try {
    const code = await runCli(argv, {
      stdout: (chunk) => {
        out += chunk;
      },
      stderr: (chunk) => {
        err += chunk;
      },
    });
    return { code, out, err };
  } finally {
    stdoutSpy.mockRestore();
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

interface UpdateJson {
  tools: string[];
  generated: {
    agents: { path: string; action: string };
    commands: { byTool: { tool: string; files: string[] }[]; skipped: string[] };
    skills: { byTool: { tool: string; files: string[] }[]; skipped: string[] };
  };
}

describe('midas update', () => {
  it('regenerates all layers from the tools configured in midas.config.yaml', async () => {
    await run(['init', '--tools', 'claude,cursor', '--json']);
    await rm(join(dir, '.claude', 'commands', 'midas', 'spec.md'));
    await rm(join(dir, '.claude', 'skills', 'midas-spec'), { recursive: true });
    await rm(join(dir, 'AGENTS.md'));

    const { code, out } = await run(['update', '--json']);
    expect(code).toBe(0);

    const payload = JSON.parse(out) as UpdateJson;
    expect(payload.tools).toEqual(['claude', 'cursor']);
    expect(payload.generated.agents).toEqual({ path: 'AGENTS.md', action: 'created' });
    expect(payload.generated.commands.byTool.map((entry) => entry.tool)).toEqual([
      'claude',
      'cursor',
    ]);
    expect(payload.generated.commands.byTool[0].files).toContain('.claude/commands/midas/spec.md');
    expect(payload.generated.skills.byTool.map((entry) => entry.tool)).toEqual(['claude']);
    expect(payload.generated.skills.skipped).toContain('cursor');

    expect(await exists(join(dir, '.claude', 'commands', 'midas', 'spec.md'))).toBe(true);
    expect(await exists(join(dir, '.claude', 'skills', 'midas-spec', 'SKILL.md'))).toBe(true);
    expect(await exists(join(dir, 'AGENTS.md'))).toBe(true);
  });

  it('fails with exit 1 pointing to midas init when midas.config.yaml is missing', async () => {
    const { code, err } = await run(['update', '--json']);
    expect(code).toBe(1);
    const parsed = JSON.parse(err.trim()) as { error: { message: string } };
    expect(parsed.error.message).toContain(CONFIG_FILENAME);
    expect(parsed.error.message).toContain('midas init');
  });

  it('with no tools configured still refreshes AGENTS.md and reports no tools', async () => {
    await writeFile(join(dir, CONFIG_FILENAME), 'tools: []\n', 'utf8');

    const { code, out } = await run(['update']);
    expect(code).toBe(0);
    expect(out).toContain('No tools configured.');
    expect(out).toContain('AGENTS.md created');
    const agents = await readFile(join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('<!-- midas:begin -->');

    // Running again refreshes the managed block idempotently.
    const second = await run(['update', '--json']);
    expect(second.code).toBe(0);
    const payload = JSON.parse(second.out) as UpdateJson;
    expect(payload.tools).toEqual([]);
    expect(payload.generated.agents.action).toBe('unchanged');
  });

  it('human output lists refreshed files in the same format as init', async () => {
    await run(['init', '--tools', 'claude,cursor', '--json']);

    const { code, out } = await run(['update']);
    expect(code).toBe(0);
    expect(out).toContain('Tools: claude, cursor');
    expect(out).toContain('AGENTS.md unchanged');
    expect(out).toContain('Slash commands:');
    expect(out).toContain('.claude/commands/midas/spec.md');
    expect(out).toContain('.cursor/commands/midas-break.md');
    expect(out).toContain('Skills:');
    expect(out).toContain('.claude/skills/midas-implement/SKILL.md');
    expect(out).toContain('skipped (not supported): cursor');
  });

  it('ignores unknown tool ids left in the config', async () => {
    await writeFile(join(dir, CONFIG_FILENAME), 'tools:\n  - claude\n  - nope\n', 'utf8');

    const { code, out } = await run(['update', '--json']);
    expect(code).toBe(0);
    const payload = JSON.parse(out) as UpdateJson;
    expect(payload.tools).toEqual(['claude']);
  });
});
