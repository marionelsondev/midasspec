import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/index.js';
import { CliError, printResult, renderError, renderJson } from '../src/lib/output.js';

function capture() {
  let out = '';
  let err = '';
  return {
    io: {
      stdout: (chunk: string) => {
        out += chunk;
      },
      stderr: (chunk: string) => {
        err += chunk;
      },
    },
    get out() {
      return out;
    },
    get err() {
      return err;
    },
  };
}

describe('runCli', () => {
  it('--help exits 0 and prints usage', async () => {
    const cap = capture();
    const code = await runCli(['--help'], cap.io);
    expect(code).toBe(0);
    expect(cap.out).toContain('Usage: midas');
  });

  it('no args exits 0 and prints help', async () => {
    const cap = capture();
    const code = await runCli([], cap.io);
    expect(code).toBe(0);
    expect(cap.out).toContain('Usage: midas');
  });

  it('--version exits 0 and prints semver', async () => {
    const cap = capture();
    const code = await runCli(['--version'], cap.io);
    expect(code).toBe(0);
    expect(cap.out.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(cap.out).toContain('0.1.0');
  });

  it('unknown command exits non-zero with one-line stderr mentioning the command', async () => {
    const cap = capture();
    const code = await runCli(['bogus'], cap.io);
    expect(code).not.toBe(0);
    expect(cap.err).toContain('bogus');
    expect(cap.err.trim().split('\n')).toHaveLength(1);
  });

  it('unknown command with --json emits one-line JSON error on stderr', async () => {
    const cap = capture();
    const code = await runCli(['--json', 'bogus'], cap.io);
    expect(code).not.toBe(0);
    const line = cap.err.trim();
    expect(line.split('\n')).toHaveLength(1);
    const parsed = JSON.parse(line);
    expect(parsed.error.message).toContain('bogus');
  });
});

describe('renderError', () => {
  it('json=true produces JSON with error.message', () => {
    const parsed = JSON.parse(renderError('x', true));
    expect(parsed.error.message).toBe('x');
  });

  it('json=false produces a single line', () => {
    const text = renderError('x', false);
    expect(text).toBe('Error: x');
    expect(text.split('\n')).toHaveLength(1);
  });
});

describe('renderJson', () => {
  it('round-trips an object', () => {
    const payload = { a: 1, b: ['x', 'y'], c: { nested: true } };
    expect(JSON.parse(renderJson(payload))).toEqual(payload);
  });
});

describe('printResult', () => {
  it('writes exactly one JSON document when json=true', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      printResult({ ok: true }, 'human text', true);
      expect(spy).toHaveBeenCalledTimes(1);
      const written = spy.mock.calls[0][0] as string;
      expect(JSON.parse(written)).toEqual({ ok: true });
    } finally {
      spy.mockRestore();
    }
  });

  it('writes human text when json=false', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      printResult({ ok: true }, 'human text', false);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toBe('human text\n');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('CliError', () => {
  it('defaults exitCode to 1', () => {
    expect(new CliError('boom').exitCode).toBe(1);
  });

  it('preserves a custom exitCode', () => {
    expect(new CliError('boom', 3).exitCode).toBe(3);
  });
});
