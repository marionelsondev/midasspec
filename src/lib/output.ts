import { red, sym } from './theme.js';
import type { CliErrorKey, ErrorParams } from './messages.js';

export class CliError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
    public i18n?: { key: CliErrorKey; params?: ErrorParams },
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export function renderJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function renderError(message: string, json: boolean, label = 'Error'): string {
  if (json) {
    return JSON.stringify({ error: { message } });
  }
  return `${red(sym.cross)} ${label}: ${message}`;
}

export function printResult(payload: unknown, humanText: string, json: boolean): void {
  process.stdout.write((json ? renderJson(payload) : humanText) + '\n');
}
