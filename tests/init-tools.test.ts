import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { load } from 'js-yaml';
import { runCli } from '../src/index.js';
import {
  CONFIG_FILENAME,
  initProject,
  readConfigTools,
  setConfigTools,
} from '../src/lib/init.js';
import { TOOL_REGISTRY } from '../src/lib/tools.js';
import { pickCheckbox } from '../src/lib/picker.js';

let dir: string;
let originalIsTTY: boolean | undefined;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'midas-init-tools-'));
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

interface InitJson {
  initialized: boolean;
  tools: string[];
  generated: {
    agents: { path: string; action: string };
    commands: { byTool: { tool: string; files: string[] }[]; skipped: string[] };
    skills: { byTool: { tool: string; files: string[] }[]; skipped: string[] };
  };
}

describe('midas init --tools', () => {
  it('generates all three layers and persists the selection', async () => {
    const { code, out } = await run(['init', '--tools', 'claude,cursor', '--json']);
    expect(code).toBe(0);

    const payload = JSON.parse(out) as InitJson;
    expect(payload.initialized).toBe(true);
    expect(payload.tools).toEqual(['claude', 'cursor']);

    // AGENTS.md layer
    expect(payload.generated.agents).toEqual({ path: 'AGENTS.md', action: 'created' });
    const agents = await readFile(join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('<!-- midas:begin -->');
    expect(agents).toContain('<!-- midas:end -->');

    // Commands layer, grouped by tool
    expect(payload.generated.commands.byTool.map((entry) => entry.tool)).toEqual([
      'claude',
      'cursor',
    ]);
    expect(payload.generated.commands.byTool[0].files).toContain('.claude/commands/midas/spec.md');
    expect(payload.generated.commands.byTool[1].files).toContain('.cursor/commands/midas-spec.md');
    expect(await exists(join(dir, '.claude', 'commands', 'midas', 'implement.md'))).toBe(true);
    expect(await exists(join(dir, '.cursor', 'commands', 'midas-archive.md'))).toBe(true);

    // Skills layer: claude only, cursor reported as skipped
    expect(payload.generated.skills.byTool.map((entry) => entry.tool)).toEqual(['claude']);
    expect(payload.generated.skills.skipped).toContain('cursor');
    expect(await exists(join(dir, '.claude', 'skills', 'midas-spec', 'SKILL.md'))).toBe(true);

    // Persistence
    const config = load(await readFile(join(dir, CONFIG_FILENAME), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(config.tools).toEqual(['claude', 'cursor']);
  });

  it('--tools all selects every registry tool', async () => {
    const { code, out } = await run(['init', '--tools', 'all', '--json']);
    expect(code).toBe(0);
    const payload = JSON.parse(out) as InitJson;
    expect(payload.tools).toEqual(TOOL_REGISTRY.map((tool) => tool.id));
  });

  it('rejects unknown tool ids with exit 2 listing valid ids', async () => {
    const { code, err } = await run(['init', '--tools', 'nope', '--json']);
    expect(code).toBe(2);
    const parsed = JSON.parse(err.trim()) as { error: { message: string } };
    expect(parsed.error.message).toContain("unknown tool 'nope'");
    expect(parsed.error.message).toContain('claude');
  });

  it('re-running refreshes generated files without duplicating the tools key', async () => {
    await run(['init', '--tools', 'claude', '--json']);
    await rm(join(dir, '.claude', 'commands', 'midas', 'spec.md'));

    const { code, out } = await run(['init', '--tools', 'claude', '--json']);
    expect(code).toBe(0);
    const payload = JSON.parse(out) as InitJson;
    expect(payload.initialized).toBe(false);
    expect(await exists(join(dir, '.claude', 'commands', 'midas', 'spec.md'))).toBe(true);

    const raw = await readFile(join(dir, CONFIG_FILENAME), 'utf8');
    expect(raw.match(/^tools:/gm)).toHaveLength(1);
  });
});

describe('midas init --force / non-TTY', () => {
  it('--force uses detected tools when no config exists', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true });

    const { code, out } = await run(['init', '--force', '--json']);
    expect(code).toBe(0);
    const payload = JSON.parse(out) as InitJson;
    expect(payload.tools).toEqual(['claude']);
  });

  it('--force prefers the existing tools config and preserves other config values', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(
      join(dir, CONFIG_FILENAME),
      'specsRoot: my/specs\ncontext: hello\ntools:\n  - cursor\n',
      'utf8'
    );

    const { code, out } = await run(['init', '--force', '--json']);
    expect(code).toBe(0);
    const payload = JSON.parse(out) as InitJson;
    expect(payload.tools).toEqual(['cursor']);
    expect((await stat(join(dir, 'my', 'specs'))).isDirectory()).toBe(true);

    const config = load(await readFile(join(dir, CONFIG_FILENAME), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(config.specsRoot).toBe('my/specs');
    expect(config.context).toBe('hello');
    expect(config.tools).toEqual(['cursor']);
  });

  it('non-TTY without flags behaves like --force (detected tools)', async () => {
    await mkdir(join(dir, '.cursor'), { recursive: true });

    const { code, out } = await run(['init', '--json']);
    expect(code).toBe(0);
    const payload = JSON.parse(out) as InitJson;
    expect(payload.tools).toEqual(['cursor']);
  });

  it('human output lists generated files grouped by layer and tool', async () => {
    const { code, out } = await run(['init', '--tools', 'claude,cursor']);
    expect(code).toBe(0);
    expect(out).toContain('Tools: claude, cursor');
    expect(out).toContain('AGENTS.md created');
    expect(out).toContain('Slash commands:');
    expect(out).toContain('.claude/commands/midas/spec.md');
    expect(out).toContain('.cursor/commands/midas-break.md');
    expect(out).toContain('Skills:');
    expect(out).toContain('.claude/skills/midas-implement/SKILL.md');
    expect(out).toContain('skipped (not supported): cursor');
  });
});

describe('setConfigTools / readConfigTools', () => {
  it('appends a tools block to the template without disturbing other keys', async () => {
    await initProject(dir);
    await setConfigTools(dir, ['claude']);

    const raw = await readFile(join(dir, CONFIG_FILENAME), 'utf8');
    expect(raw).toContain('# MidasSpec configuration');
    const config = load(raw) as Record<string, unknown>;
    expect(config).toHaveProperty('context');
    expect(config).toHaveProperty('rules');
    expect(config.tools).toEqual(['claude']);
    expect(await readConfigTools(dir)).toEqual(['claude']);
  });

  it('replaces an existing tools block in place', async () => {
    await writeFile(
      join(dir, CONFIG_FILENAME),
      'specsRoot: my/specs\ntools:\n  - claude\n  - cursor\ncontext: hi\n',
      'utf8'
    );

    await setConfigTools(dir, ['zed']);

    const raw = await readFile(join(dir, CONFIG_FILENAME), 'utf8');
    const config = load(raw) as Record<string, unknown>;
    expect(config.tools).toEqual(['zed']);
    expect(config.specsRoot).toBe('my/specs');
    expect(config.context).toBe('hi');
    expect(raw.match(/^tools:/gm)).toHaveLength(1);
  });

  it('writes an empty list as tools: []', async () => {
    await initProject(dir);
    await setConfigTools(dir, []);

    const config = load(await readFile(join(dir, CONFIG_FILENAME), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(config.tools).toEqual([]);
    expect(await readConfigTools(dir)).toEqual([]);
  });

  it('readConfigTools returns null when no config exists', async () => {
    expect(await readConfigTools(dir)).toBeNull();
  });

  it('readConfigTools returns null when the tools key is absent', async () => {
    await initProject(dir);
    expect(await readConfigTools(dir)).toBeNull();
  });

  it('replaces a multi-line flow style tools list without corrupting the config', async () => {
    await writeFile(
      join(dir, CONFIG_FILENAME),
      'specsRoot: my/specs\ntools: [\n  claude,\n  cursor\n]\ncontext: hi\n',
      'utf8'
    );

    await setConfigTools(dir, ['zed']);

    const raw = await readFile(join(dir, CONFIG_FILENAME), 'utf8');
    const config = load(raw) as Record<string, unknown>;
    expect(config.tools).toEqual(['zed']);
    expect(config.specsRoot).toBe('my/specs');
    expect(config.context).toBe('hi');
    expect(raw.match(/^tools:/gm)).toHaveLength(1);
  });
});

describe('pickCheckbox', () => {
  it('toggles with space, moves with arrows, confirms with enter', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    output.resume();

    const picked = pickCheckbox(
      [
        { id: 'a', label: 'Tool A', checked: true },
        { id: 'b', label: 'Tool B', checked: false },
      ],
      { input, output }
    );

    const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
    await tick();
    input.write(' '); // toggle A off
    await tick();
    input.write('[B'); // down to B
    await tick();
    input.write(' '); // toggle B on
    await tick();
    input.write('\r'); // confirm

    await expect(picked).resolves.toEqual(['b']);
  });
});
