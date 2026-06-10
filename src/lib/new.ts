import { mkdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { load } from 'js-yaml';
import { CliError } from './output.js';
import { CONFIG_FILENAME, DEFAULT_SPECS_ROOT } from './init.js';

export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug === '') {
    throw new CliError(`invalid spec name: '${name}' produces an empty slug`, 2);
  }
  return slug;
}

export class SpecConflictError extends CliError {
  constructor(
    public slug: string,
    public specPath: string,
  ) {
    super(`spec '${slug}' already exists at ${specPath}`, 1);
    this.name = 'SpecConflictError';
  }
}

export async function resolveSpecsRoot(cwd: string): Promise<string> {
  let specsRootRel = DEFAULT_SPECS_ROOT;
  try {
    const raw = await readFile(join(cwd, CONFIG_FILENAME), 'utf8');
    const parsed = load(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      typeof (parsed as Record<string, unknown>).specsRoot === 'string'
    ) {
      specsRootRel = (parsed as Record<string, unknown>).specsRoot as string;
    }
  } catch {
    // missing or malformed config: fall back to default specs root
  }
  return join(cwd, specsRootRel);
}

export interface NewSpecResult {
  slug: string;
  dir: string;
  specPath: string;
  relDir: string;
  relSpecPath: string;
}

function toPosix(path: string): string {
  return path.split('\\').join('/');
}

export async function newSpec(cwd: string, name: string): Promise<NewSpecResult> {
  const slug = slugify(name);
  const root = await resolveSpecsRoot(cwd);
  const dir = join(root, slug);
  const specPath = join(dir, 'SPEC.md');

  let specExists = false;
  try {
    await readFile(specPath);
    specExists = true;
  } catch {
    // SPEC.md absent: no conflict
  }
  if (specExists) {
    throw new SpecConflictError(slug, specPath);
  }

  await mkdir(dir, { recursive: true });

  return {
    slug,
    dir,
    specPath,
    relDir: toPosix(relative(cwd, dir)),
    relSpecPath: toPosix(relative(cwd, specPath)),
  };
}
