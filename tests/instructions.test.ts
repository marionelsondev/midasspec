import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { CliError } from '../src/lib/output.js';
import { CONFIG_FILENAME, DEFAULT_SPECS_ROOT } from '../src/lib/init.js';
import {
  getInstructions,
  loadConfig,
  ISSUE_TEMPLATE,
  SPEC_TEMPLATE,
} from '../src/lib/instructions.js';
import { makeInstructionsCommand } from '../src/commands/instructions.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'midas-instructions-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const FULL_CONFIG = `context: |
  Internal billing platform.
rules:
  spec:
    - keep pages small
    - name behaviors in kebab-case
  break:
    - one issue per behavior
`;

async function writeConfig(content: string): Promise<void> {
  await writeFile(join(dir, CONFIG_FILENAME), content, 'utf8');
}

async function scaffoldSpec(slug: string, root = DEFAULT_SPECS_ROOT): Promise<void> {
  const specDir = join(dir, root, slug);
  await mkdir(specDir, { recursive: true });
  await writeFile(join(specDir, 'SPEC.md'), '# Spec\n', 'utf8');
}

describe('getInstructions', () => {
  it('returns spec template, spec rules, context, and SPEC.md path', async () => {
    await writeConfig(FULL_CONFIG);

    const payload = await getInstructions(dir, 'spec', 'pricing-engine');

    expect(payload.artifact).toBe('spec');
    expect(payload.template).toBe(SPEC_TEMPLATE);
    expect(payload.rules).toEqual(['keep pages small', 'name behaviors in kebab-case']);
    expect(payload.context).toContain('Internal billing platform.');
    expect(payload.outputPath).toBe(join(dir, DEFAULT_SPECS_ROOT, 'pricing-engine', 'SPEC.md'));
    expect(payload.relOutputPath).toBe('docs/specs/pricing-engine/SPEC.md');
  });

  it('returns issue template, break rules, and issues/ path for break', async () => {
    await writeConfig(FULL_CONFIG);
    await scaffoldSpec('pricing-engine');

    const payload = await getInstructions(dir, 'break', 'pricing-engine');

    expect(payload.artifact).toBe('break');
    expect(payload.template).toBe(ISSUE_TEMPLATE);
    expect(payload.rules).toEqual(['one issue per behavior']);
    expect(payload.context).toContain('Internal billing platform.');
    expect(payload.outputPath).toBe(join(dir, DEFAULT_SPECS_ROOT, 'pricing-engine', 'issues'));
    expect(payload.relOutputPath).toBe('docs/specs/pricing-engine/issues');
  });

  it('uses a <slug> placeholder path for spec without a slug', async () => {
    await writeConfig(FULL_CONFIG);

    const payload = await getInstructions(dir, 'spec');

    expect(payload.outputPath).toBe(join(dir, DEFAULT_SPECS_ROOT, '<slug>', 'SPEC.md'));
    expect(payload.relOutputPath).toBe('docs/specs/<slug>/SPEC.md');
  });

  it('has context: null (key present) when context is omitted', async () => {
    await writeConfig('rules:\n  spec:\n    - a rule\n');

    const payload = await getInstructions(dir, 'spec');

    expect('context' in payload).toBe(true);
    expect(payload.context).toBeNull();
  });

  it('returns rules: [] when the rules section is missing', async () => {
    await writeConfig('context: hello\n');

    const payload = await getInstructions(dir, 'spec');

    expect(payload.rules).toEqual([]);
  });

  it('coerces a single-string rule to a one-element array', async () => {
    await writeConfig('rules:\n  spec: only one rule\n');

    const payload = await getInstructions(dir, 'spec');

    expect(payload.rules).toEqual(['only one rule']);
  });

  it('rejects with CliError exit 1 when config is missing', async () => {
    let caught: unknown;
    try {
      await getInstructions(dir, 'spec');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(CliError);
    expect((caught as CliError).exitCode).toBe(1);
  });

  it('rejects with CliError exit 1 for break with an unknown slug', async () => {
    await writeConfig(FULL_CONFIG);

    let caught: unknown;
    try {
      await getInstructions(dir, 'break', 'no-such-spec');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(CliError);
    expect((caught as CliError).exitCode).toBe(1);
    expect((caught as CliError).message).toContain("unknown spec 'no-such-spec'");
  });

  it('rejects with CliError exit 2 for break without a slug', async () => {
    await writeConfig(FULL_CONFIG);

    await expect(getInstructions(dir, 'break')).rejects.toMatchObject({ exitCode: 2 });
  });

  it('honors specsRoot override and keeps relOutputPath posix', async () => {
    await writeConfig(`specsRoot: custom/dir\n${FULL_CONFIG}`);
    await scaffoldSpec('pricing-engine', 'custom/dir');

    const payload = await getInstructions(dir, 'break', 'pricing-engine');

    expect(payload.outputPath).toBe(join(dir, 'custom/dir', 'pricing-engine', 'issues'));
    expect(payload.relOutputPath).toBe('custom/dir/pricing-engine/issues');
    expect(payload.relOutputPath).not.toContain('\\');
  });
});

describe('loadConfig', () => {
  it('rejects with exit 1 when midas.config.yaml is absent', async () => {
    await expect(loadConfig(dir)).rejects.toMatchObject({ exitCode: 1 });
  });
});

describe('makeInstructionsCommand', () => {
  function makeProgram(): Command {
    const program = new Command('midas')
      .option('--json', 'emit machine-readable JSON output')
      .exitOverride()
      .configureOutput({ writeOut: () => {}, writeErr: () => {} });
    program.addCommand(makeInstructionsCommand());
    return program;
  }

  it('emits a single JSON payload for instructions spec --json', async () => {
    await writeConfig(FULL_CONFIG);
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(dir);
    let out = '';
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        out += chunk.toString();
        return true;
      });

    try {
      await makeProgram().parseAsync(['instructions', 'spec', '--json'], { from: 'user' });
    } finally {
      stdoutSpy.mockRestore();
      cwdSpy.mockRestore();
    }

    const payload = JSON.parse(out) as {
      template: string;
      rules: string[];
      context: string | null;
      outputPath: string;
    };
    expect(payload.template).toBe(SPEC_TEMPLATE);
    expect(payload.rules).toEqual(['keep pages small', 'name behaviors in kebab-case']);
    expect(payload.context).toContain('Internal billing platform.');
    expect(payload.outputPath).toBe(join(dir, DEFAULT_SPECS_ROOT, '<slug>', 'SPEC.md'));
  });

  it('rejects with exit code 2 for an unknown artifact', async () => {
    await writeConfig(FULL_CONFIG);
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(dir);

    try {
      let caught: unknown;
      try {
        await makeProgram().parseAsync(['instructions', 'bogus'], { from: 'user' });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(CliError);
      expect((caught as CliError).exitCode).toBe(2);
    } finally {
      cwdSpy.mockRestore();
    }
  });
});
