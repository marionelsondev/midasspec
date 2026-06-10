import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CliError } from './output.js';
import { resolveSpecsRoot } from './new.js';
import { dim, gold, red, sym, yellowWarn } from './theme.js';

// NOTE: issue 04 owns src/lib/index-parser.ts (parseIndex). It does not exist
// yet, so the minimal INDEX parsing this command needs lives here as local
// functions. Integration may later swap these for issue 04's parseIndex.

export interface Finding {
  severity: 'error' | 'warning';
  file: string;
  rule: string;
  message: string;
}

export interface ValidateResult {
  slug: string;
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  ok: boolean;
}

interface Section {
  name: string;
  body: string;
}

function splitSections(content: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of content.split(/\r?\n/)) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      current = { name: m[1], body: '' };
      sections.push(current);
    } else if (current) {
      current.body += line + '\n';
    }
  }
  return sections;
}

function findSection(sections: Section[], name: string): Section | undefined {
  const wanted = name.trim().toLowerCase();
  return sections.find((s) => s.name.trim().toLowerCase() === wanted);
}

function normalizeIssueNumber(raw: string): string {
  return String(parseInt(raw, 10));
}

export function validateSpecContent(content: string, relPath: string): Finding[] {
  const findings: Finding[] = [];
  const sections = splitSections(content);

  if (!findSection(sections, 'Overview')) {
    findings.push({
      severity: 'error',
      file: relPath,
      rule: 'spec-missing-section',
      message: 'missing required section: Overview',
    });
  }
  if (!findSection(sections, 'Open Questions')) {
    findings.push({
      severity: 'error',
      file: relPath,
      rule: 'spec-missing-section',
      message: 'missing required section: Open Questions',
    });
  }

  const pages = sections.filter((s) => {
    const name = s.name.trim().toLowerCase();
    return name !== 'overview' && name !== 'open questions';
  });
  const hasValidPage = pages.some(
    (p) => /^###\s+components\s*$/im.test(p.body) && /^###\s+behaviors\s*$/im.test(p.body),
  );
  if (!hasValidPage) {
    findings.push({
      severity: 'error',
      file: relPath,
      rule: 'spec-missing-section',
      message: 'missing at least one page section containing "### Components" and "### Behaviors"',
    });
  }

  return findings;
}

const ISSUE_REQUIRED_SECTIONS = [
  'Functional Specification',
  'Preconditions',
  'Main Flow',
  'Expected Result',
  'Blocked by',
  'Open Questions',
];

export function validateIssueContent(content: string, relPath: string): Finding[] {
  const findings: Finding[] = [];
  const sections = splitSections(content);
  for (const name of ISSUE_REQUIRED_SECTIONS) {
    if (!findSection(sections, name)) {
      findings.push({
        severity: 'error',
        file: relPath,
        rule: 'issue-missing-section',
        message: `missing required section: ${name}`,
      });
    }
  }
  return findings;
}

export function parseIssueBlockedBy(content: string): string[] {
  const section = findSection(splitSections(content), 'Blocked by');
  if (!section) {
    return [];
  }
  const numbers: string[] = [];
  for (const line of section.body.split(/\r?\n/)) {
    const item = /^\s*-\s*(.+?)\s*$/.exec(line);
    if (!item) {
      continue;
    }
    const text = item[1];
    if (/^none$/i.test(text)) {
      continue;
    }
    const link = /^\[(\d+)/.exec(text);
    const bare = /^(\d+)/.exec(text);
    const m = link ?? bare;
    if (m) {
      numbers.push(normalizeIssueNumber(m[1]));
    }
  }
  return numbers;
}

export interface IndexEntry {
  number: string;
  title: string;
  file: string;
  done: boolean;
  blockedBy: string[];
}

export function parseIndexBlockedBy(line: string): string[] {
  const m = /blocked by:\s*(.*?)\s*$/i.exec(line);
  if (!m || /^none\b/i.test(m[1])) {
    return [];
  }
  return (m[1].match(/\d+/g) ?? []).map(normalizeIssueNumber);
}

function parseIndexEntries(content: string): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const line of content.split(/\r?\n/)) {
    const m = /^\s*-\s*\[([ xX])\]\s*\[(\d+)\s*[—-]+\s*(.+?)\]\(([^)]+)\)/.exec(line);
    if (!m) {
      continue;
    }
    entries.push({
      number: normalizeIssueNumber(m[2]),
      title: m[3].trim(),
      file: m[4].trim(),
      done: m[1].toLowerCase() === 'x',
      blockedBy: parseIndexBlockedBy(line),
    });
  }
  return entries;
}

function sameSet(a: string[], b: string[]): boolean {
  const sa = [...new Set(a)].sort();
  const sb = [...new Set(b)].sort();
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

function toPosix(path: string): string {
  return path.split('\\').join('/');
}

export async function validateSpec(cwd: string, slug: string): Promise<ValidateResult> {
  const root = await resolveSpecsRoot(cwd);
  const dir = join(root, slug);
  const specPath = join(dir, 'SPEC.md');
  const relSpecPath = toPosix(relative(cwd, specPath));

  let specContent: string;
  try {
    specContent = await readFile(specPath, 'utf8');
  } catch {
    throw new CliError(`spec '${slug}' not found: missing ${relSpecPath}`, 1);
  }

  const findings: Finding[] = [...validateSpecContent(specContent, relSpecPath)];

  const issuesDir = join(dir, 'issues');
  const relIssuesDir = toPosix(relative(cwd, issuesDir));
  let diskFiles: string[] | null = null;
  try {
    const all = await readdir(issuesDir);
    diskFiles = all.filter((f) => /^\d+-.*\.md$/i.test(f));
  } catch {
    // no issues/ folder: SPEC-only validation
  }

  if (diskFiles !== null) {
    const blockedByOnDisk = new Map<string, string[]>();
    for (const file of diskFiles) {
      const relPath = `${relIssuesDir}/${file}`;
      const content = await readFile(join(issuesDir, file), 'utf8');
      findings.push(...validateIssueContent(content, relPath));
      blockedByOnDisk.set(file, parseIssueBlockedBy(content));
    }

    const relIndexPath = `${relIssuesDir}/INDEX.md`;
    let indexContent: string | null = null;
    try {
      indexContent = await readFile(join(issuesDir, 'INDEX.md'), 'utf8');
    } catch {
      findings.push({
        severity: 'error',
        file: relIndexPath,
        rule: 'index-missing',
        message: 'issues/ exists but INDEX.md is missing',
      });
    }

    if (indexContent !== null) {
      const entries = parseIndexEntries(indexContent);
      const linkedFiles = new Set(entries.map((e) => e.file));

      for (const entry of entries) {
        if (!diskFiles.includes(entry.file)) {
          findings.push({
            severity: 'error',
            file: relIndexPath,
            rule: 'index-missing-file',
            message: `INDEX entry ${entry.number} points to missing file: ${entry.file}`,
          });
          continue;
        }
        const issueBlockedBy = blockedByOnDisk.get(entry.file) ?? [];
        if (!sameSet(entry.blockedBy, issueBlockedBy)) {
          findings.push({
            severity: 'error',
            file: relIndexPath,
            rule: 'index-blockedby-mismatch',
            message:
              `blocked-by mismatch for issue ${entry.number}: ` +
              `INDEX says [${entry.blockedBy.join(', ') || 'none'}] but ` +
              `${entry.file} says [${issueBlockedBy.join(', ') || 'none'}]`,
          });
        }
      }

      for (const file of diskFiles) {
        if (!linkedFiles.has(file)) {
          findings.push({
            severity: 'warning',
            file: `${relIssuesDir}/${file}`,
            rule: 'orphan-issue-file',
            message: `issue file exists on disk but is not listed in INDEX.md`,
          });
        }
      }
    }
  }

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  return { slug, findings, errorCount, warningCount, ok: errorCount === 0 };
}

export function renderHumanReport(result: ValidateResult): string {
  const lines = result.findings.map((f) => {
    const tag = f.severity === 'error' ? red(`${sym.cross} ${f.severity}`) : yellowWarn(f.severity);
    return `${tag}  ${f.file}  ${dim(`${f.rule}:`)} ${f.message}`;
  });
  lines.push(
    result.ok
      ? `${gold(sym.check)} OK: ${result.errorCount} error(s), ${result.warningCount} warning(s)`
      : `${red(sym.cross)} FAILED: ${result.errorCount} error(s), ${result.warningCount} warning(s)`,
  );
  return lines.join('\n');
}
