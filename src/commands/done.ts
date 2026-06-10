import { Command } from 'commander';
import { printResult } from '../lib/output.js';
import { resolveSpecsRoot } from '../lib/new.js';
import { setIssueDone, type ToggleOutcome } from '../lib/track.js';

export function renderToggle(outcome: ToggleOutcome): string {
  const verb = outcome.done ? 'done' : 'reopened';
  const lines = [
    outcome.changed
      ? `Marked ${outcome.number} — ${outcome.title} as ${verb}.`
      : `${outcome.number} — ${outcome.title} is already ${outcome.done ? 'done' : 'open'}.`,
  ];
  if (outcome.done) {
    if (outcome.newlyReady.length > 0) {
      for (const issue of outcome.newlyReady) {
        lines.push(`Newly ready: ${issue.number} — ${issue.title}`);
      }
    } else {
      lines.push('No issues newly unblocked.');
    }
  }
  return lines.join('\n');
}

function makeToggleCommand(name: string, description: string, done: boolean): Command {
  return new Command(name)
    .description(description)
    .argument('<slug>', 'spec slug')
    .argument('<number>', 'issue number (e.g. 01)')
    .action(async (slug: string, number: string, _opts: unknown, cmd: Command) => {
      const padded = number.padStart(2, '0');
      const json = cmd.optsWithGlobals<{ json?: boolean }>().json === true;
      const root = await resolveSpecsRoot(process.cwd());
      const outcome = await setIssueDone(root, slug, padded, done);
      printResult(outcome, renderToggle(outcome), json);
    });
}

export function makeDoneCommand(): Command {
  return makeToggleCommand('done', "Mark a spec's issue as done in INDEX.md", true);
}

export function makeReopenCommand(): Command {
  return makeToggleCommand('reopen', "Reopen a spec's issue in INDEX.md", false);
}
