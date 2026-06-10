import { checkbox } from '@inquirer/prompts';
import { CliError } from './output.js';
import { bold, dim, gold, goldBright, sym } from './theme.js';

export interface PickerItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface PickerIO {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
}

/**
 * Tool multi-select on @inquirer/checkbox (the same base OpenSpec uses),
 * skinned with the midas gold theme. Inquirer owns the hard parts —
 * pagination, vim keys, `a` toggle-all / `i` invert, resize, Ctrl+C
 * cleanup — while theme.ts owns every color and glyph.
 *
 * Streams are injected so tests can drive it with non-TTY streams.
 */
export async function pickCheckbox(items: PickerItem[], io: PickerIO): Promise<string[]> {
  try {
    return await checkbox<string>(
      {
        message: 'Select tools',
        choices: items.map((item) => ({
          value: item.id,
          name: item.label,
          checked: item.checked,
        })),
        pageSize: 15,
        loop: false,
        theme: {
          prefix: { idle: goldBright(sym.active), done: gold(sym.step) },
          style: {
            message: (text: string) => bold(text),
            answer: (text: string) => gold(text),
            highlight: (text: string) => goldBright(text),
            help: (text: string) => dim(text),
            renderSelectedChoices: (selected: ReadonlyArray<{ name?: string; value: string }>) =>
              selected.length > 0
                ? selected.map((choice) => choice.name ?? choice.value).join(', ')
                : 'none',
          },
          icon: {
            checked: gold(sym.on),
            unchecked: dim(sym.off),
            cursor: goldBright('❯'),
          },
        },
      },
      { input: io.input, output: io.output }
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'ExitPromptError') {
      throw new CliError('aborted', 130);
    }
    throw err;
  }
}
