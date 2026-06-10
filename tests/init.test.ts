import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { Command } from 'commander';
import {
  CONFIG_FILENAME,
  CONFIG_TEMPLATE,
  DEFAULT_SPECS_ROOT,
  initProject,
} from '../src/lib/init.js';
import { makeInitCommand } from '../src/commands/init.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'midas-init-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('initProject', () => {
  it('creates .midas/specs and midas.config.yaml in a fresh dir', async () => {
    const result = await initProject(dir);

    expect(result.initialized).toBe(true);
    expect(result.createdConfig).toBe(true);
    expect(result.createdSpecsRoot).toBe(true);
    expect(result.configPath).toBe(join(dir, CONFIG_FILENAME));
    expect(result.specsRoot).toBe(join(dir, DEFAULT_SPECS_ROOT));

    expect((await stat(result.specsRoot)).isDirectory()).toBe(true);
    expect(await readFile(result.configPath, 'utf8')).toBe(CONFIG_TEMPLATE);
  });

  it('writes a commented template with context and rules keys', async () => {
    const result = await initProject(dir);
    const raw = await readFile(result.configPath, 'utf8');

    expect(raw).toContain('#');
    const parsed = load(raw) as Record<string, unknown>;
    expect(parsed).toHaveProperty('context');
    expect(parsed).toHaveProperty('rules');
  });

  it('is idempotent: second run reports already initialized and keeps config bytes', async () => {
    await initProject(dir);
    const before = await readFile(join(dir, CONFIG_FILENAME), 'utf8');

    const second = await initProject(dir);

    expect(second.initialized).toBe(false);
    expect(second.createdConfig).toBe(false);
    const after = await readFile(join(dir, CONFIG_FILENAME), 'utf8');
    expect(after).toBe(before);
  });

  it('creates config when .midas/specs already exists, with createdSpecsRoot false', async () => {
    await mkdir(join(dir, DEFAULT_SPECS_ROOT), { recursive: true });

    const result = await initProject(dir);

    expect(result.initialized).toBe(true);
    expect(result.createdConfig).toBe(true);
    expect(result.createdSpecsRoot).toBe(false);
  });

  it('honors specsRoot from an existing config', async () => {
    await writeFile(join(dir, CONFIG_FILENAME), 'specsRoot: my/specs\n', 'utf8');

    const result = await initProject(dir);

    expect(result.initialized).toBe(false);
    expect(result.specsRoot).toBe(join(dir, 'my/specs'));
    expect((await stat(join(dir, 'my', 'specs'))).isDirectory()).toBe(true);
  });

  it('does not crash on malformed YAML and falls back to default specsRoot', async () => {
    await writeFile(join(dir, CONFIG_FILENAME), 'specsRoot: [unclosed\n  ::bad', 'utf8');

    const result = await initProject(dir);

    expect(result.initialized).toBe(false);
    expect(result.specsRoot).toBe(join(dir, DEFAULT_SPECS_ROOT));
  });
});

describe('makeInitCommand', () => {
  it('emits JSON with initialized true when run with --json', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(dir);
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = false;
    let out = '';
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        out += chunk.toString();
        return true;
      });

    try {
      const program = new Command('midas')
        .option('--json', 'emit machine-readable JSON output')
        .exitOverride();
      program.addCommand(makeInitCommand());
      await program.parseAsync(['init', '--json'], { from: 'user' });
    } finally {
      stdoutSpy.mockRestore();
      cwdSpy.mockRestore();
      process.stdin.isTTY = originalIsTTY;
    }

    const payload = JSON.parse(out) as { initialized: boolean };
    expect(payload.initialized).toBe(true);
  });
});
