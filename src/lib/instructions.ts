import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { load } from 'js-yaml';
import { CliError } from './output.js';
import { CONFIG_FILENAME } from './init.js';
import { resolveSpecsRoot } from './new.js';

export type Artifact = 'spec' | 'break';

export const SPEC_TEMPLATE = `# <Title>

## Overview

<One or two paragraphs describing what is being built and why.>

---

## <Page or Area Name>

<Short description of this page or area.>

### Components

- **<ComponentName>**: <what it is>

### Behaviors

- **<behavior-slug>**: <what happens and when>

---

## Open Questions

- None
`;

export const ISSUE_TEMPLATE = `# NN — <Title>

**Source:** <page or behavior in SPEC.md>

**Summary:** <one-sentence summary of the deliverable.>

## Functional Specification

- <observable behavior the implementation must satisfy>

## Preconditions

- <what must already exist or be true>

## Main Flow

1. <step>
2. <step>

## Expected Result

- <how to verify the issue is done>

## Blocked by

- <NN — Title>(NN-slug.md) or None

## Open Questions

- None
`;

export interface MidasConfig {
  context: string | null;
  rules: { spec: string[]; break: string[] };
  tools: string[];
}

function toPosix(path: string): string {
  return path.split('\\').join('/');
}

function coerceRules(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export async function loadConfig(cwd: string): Promise<MidasConfig> {
  let raw: string;
  try {
    raw = await readFile(join(cwd, CONFIG_FILENAME), 'utf8');
  } catch {
    throw new CliError('project not initialized — run midas init', 1);
  }

  let parsed: unknown;
  try {
    parsed = load(raw);
  } catch {
    parsed = null;
  }

  const obj =
    parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};

  const context = typeof obj.context === 'string' && obj.context.trim() !== '' ? obj.context : null;

  const rulesObj =
    obj.rules !== null && typeof obj.rules === 'object'
      ? (obj.rules as Record<string, unknown>)
      : {};

  return {
    context,
    rules: {
      spec: coerceRules(rulesObj.spec),
      break: coerceRules(rulesObj.break),
    },
    tools: coerceRules(obj.tools),
  };
}

export interface InstructionsPayload {
  artifact: Artifact;
  template: string;
  rules: string[];
  context: string | null;
  outputPath: string;
  relOutputPath: string;
}

export async function getInstructions(
  cwd: string,
  artifact: Artifact,
  specSlug?: string,
): Promise<InstructionsPayload> {
  const config = await loadConfig(cwd);
  const root = await resolveSpecsRoot(cwd);

  if (artifact === 'spec') {
    const outputPath = join(root, specSlug ?? '<slug>', 'SPEC.md');
    return {
      artifact,
      template: SPEC_TEMPLATE,
      rules: config.rules.spec,
      context: config.context,
      outputPath,
      relOutputPath: toPosix(relative(cwd, outputPath)),
    };
  }

  if (specSlug === undefined || specSlug === '') {
    throw new CliError("'break' requires --spec <slug>", 2);
  }

  const specPath = join(root, specSlug, 'SPEC.md');
  try {
    await readFile(specPath);
  } catch {
    throw new CliError(`unknown spec '${specSlug}'`, 1);
  }

  const outputPath = join(root, specSlug, 'issues');
  return {
    artifact,
    template: ISSUE_TEMPLATE,
    rules: config.rules.break,
    context: config.context,
    outputPath,
    relOutputPath: toPosix(relative(cwd, outputPath)),
  };
}
