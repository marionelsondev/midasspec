import { emitKeypressEvents, type Key } from 'node:readline';
import { CliError } from './output.js';

export interface PickerItem {
  id: string;
  label: string;
  checked: boolean;
}

interface PickerInput extends NodeJS.ReadableStream {
  setRawMode?: (mode: boolean) => unknown;
}

export interface PickerIO {
  input: PickerInput;
  output: NodeJS.WritableStream;
}

/**
 * Hand-rolled checkbox picker on node:readline keypress events — no new
 * runtime dependencies. Up/Down move the cursor, Space toggles the current
 * item, Enter confirms (resolving the checked ids), Ctrl+C aborts.
 *
 * Streams are injected so tests can drive it with non-TTY streams; raw mode
 * is only toggled when the input supports it.
 */
export function pickCheckbox(items: PickerItem[], io: PickerIO): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const state = items.map((item) => ({ ...item }));
    let cursor = 0;
    let rendered = false;
    const lineCount = state.length + 1;

    emitKeypressEvents(io.input);
    if (typeof io.input.setRawMode === 'function') {
      io.input.setRawMode(true);
    }
    io.output.write('\u001b[?25l');

    const render = (): void => {
      const lines = ['Select tools (Space toggles, Enter confirms):'];
      state.forEach((item, i) => {
        lines.push(`${i === cursor ? '>' : ' '} [${item.checked ? 'x' : ' '}] ${item.label}`);
      });
      const prefix = rendered ? `\u001b[${lineCount}A` : '';
      rendered = true;
      io.output.write(prefix + lines.map((line) => `\u001b[2K${line}`).join('\n') + '\n');
    };

    const cleanup = (): void => {
      io.input.removeListener('keypress', onKeypress);
      if (typeof io.input.setRawMode === 'function') {
        io.input.setRawMode(false);
      }
      io.input.pause();
      io.output.write('\u001b[?25h');
    };

    const onKeypress = (_chunk: string | undefined, key: Key | undefined): void => {
      if (key === undefined) {
        return;
      }
      if (key.ctrl === true && key.name === 'c') {
        cleanup();
        reject(new CliError('aborted', 130));
        return;
      }
      if (key.name === 'up') {
        cursor = (cursor + state.length - 1) % state.length;
      } else if (key.name === 'down') {
        cursor = (cursor + 1) % state.length;
      } else if (key.name === 'space') {
        state[cursor].checked = !state[cursor].checked;
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(state.filter((item) => item.checked).map((item) => item.id));
        return;
      }
      render();
    };

    io.input.on('keypress', onKeypress);
    io.input.resume();
    render();
  });
}
