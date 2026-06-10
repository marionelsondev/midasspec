import { mkdir, rename, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CliError } from './output.js';
import { resolveSpecsRoot } from './new.js';
import { readSpecStatus } from './index-parser.js';

export interface ArchiveResult {
  slug: string;
  from: string;
  to: string;
  relFrom: string;
  relTo: string;
  pendingIssues: number;
  forced: boolean;
}

function toPosix(path: string): string {
  return path.split('\\').join('/');
}

export function archiveDirName(slug: string, date: Date = new Date()): string {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${slug}`;
}

export async function archiveSpec(
  cwd: string,
  slug: string,
  opts: { force?: boolean; now?: Date } = {},
): Promise<ArchiveResult> {
  if (slug === 'archive') {
    throw new CliError(`'archive' is not a spec and cannot be archived`, 1);
  }

  const root = await resolveSpecsRoot(cwd);
  const status = await readSpecStatus(root, slug);

  const forced = opts.force === true;
  if (status.pending > 0 && !forced) {
    throw new CliError(
      `spec '${slug}' has ${status.pending} pending issues; use --force to archive anyway`,
      1,
    );
  }

  const from = join(root, slug);
  const to = join(root, 'archive', archiveDirName(slug, opts.now));

  let destExists = false;
  try {
    await stat(to);
    destExists = true;
  } catch {
    // destination absent: ok to proceed
  }
  if (destExists) {
    throw new CliError(`archive destination already exists: ${to}`, 1);
  }

  await mkdir(join(root, 'archive'), { recursive: true });
  await rename(from, to);

  return {
    slug,
    from,
    to,
    relFrom: toPosix(relative(cwd, from)),
    relTo: toPosix(relative(cwd, to)),
    pendingIssues: status.pending,
    forced,
  };
}
