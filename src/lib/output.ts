import { red, sym } from './theme.js';

export class CliError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export function renderJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function renderError(message: string, json: boolean): string {
  if (json) {
    return JSON.stringify({ error: { message } });
  }
  return `${red(sym.cross)} Error: ${message}`;
}

export function printResult(payload: unknown, humanText: string, json: boolean): void {
  process.stdout.write((json ? renderJson(payload) : humanText) + '\n');
}
