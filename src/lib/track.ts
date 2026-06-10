import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseIndex, type IndexIssue } from './index-parser.js';
import { resolveIssues, type ResolvedIssue } from './issues.js';
import { CliError } from './output.js';

export interface ToggleOutcome {
  slug: string;
  number: string;
  title: string;
  done: boolean;
  changed: boolean;
  newlyReady: ResolvedIssue[];
}

const CHECKBOX_RE = /^(\s*-\s*\[)( |x|X)(\]\s*\[(\d{2}))/;

export function toggleIssueInIndex(
  markdown: string,
  number: string,
  done: boolean,
): { markdown: string; issue: IndexIssue } | null {
  const parsed = parseIndex(markdown);
  const issue = parsed.find((i) => i.number === number);
  if (issue === undefined) {
    return null;
  }

  const parts = markdown.split(/(\r?\n)/);
  let inAllIssues = false;
  for (let i = 0; i < parts.length; i += 2) {
    const line = parts[i];
    const heading = line.match(/^##\s+(.*)$/);
    if (heading !== null) {
      inAllIssues = heading[1].trim().toLowerCase() === 'all issues';
      continue;
    }
    if (!inAllIssues) {
      continue;
    }
    const m = line.match(CHECKBOX_RE);
    if (m === null || m[4] !== number) {
      continue;
    }
    const replaced = m[1] + (done ? 'x' : ' ') + line.slice(m[1].length + 1);
    parts[i] = replaced;
    return { markdown: parts.join(''), issue: { ...issue, done } };
  }
  return null;
}

export function computeNewlyReady(before: IndexIssue[], number: string): ResolvedIssue[] {
  const readyBefore = new Set(
    resolveIssues(before)
      .filter((i) => i.state === 'ready')
      .map((i) => i.number),
  );
  const after = before.map((i) => (i.number === number ? { ...i, done: true } : i));
  return resolveIssues(after).filter((i) => i.state === 'ready' && !readyBefore.has(i.number));
}

export async function setIssueDone(
  specsRoot: string,
  slug: string,
  number: string,
  done: boolean,
): Promise<ToggleOutcome> {
  const specDir = join(specsRoot, slug);
  let isDir = false;
  try {
    isDir = (await stat(specDir)).isDirectory();
  } catch {
    // missing spec dir handled below
  }
  if (!isDir) {
    throw new CliError(`unknown spec '${slug}'`, 1);
  }

  const indexPath = join(specDir, 'issues', 'INDEX.md');
  let markdown: string;
  try {
    markdown = await readFile(indexPath, 'utf8');
  } catch {
    throw new CliError(`spec '${slug}' has not been broken down yet`, 1);
  }

  const before = parseIndex(markdown);
  const target = before.find((i) => i.number === number);
  if (target === undefined) {
    throw new CliError(`issue '${number}' not found in INDEX.md`, 1);
  }

  const newlyReady = done ? computeNewlyReady(before, number) : [];

  if (target.done === done) {
    return { slug, number, title: target.title, done, changed: false, newlyReady };
  }

  const toggled = toggleIssueInIndex(markdown, number, done);
  if (toggled === null) {
    throw new CliError(`issue '${number}' not found in INDEX.md`, 1);
  }
  await writeFile(indexPath, toggled.markdown, 'utf8');
  return { slug, number, title: target.title, done, changed: true, newlyReady };
}
