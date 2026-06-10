export interface WorkflowTemplate {
  /** Command name — file naming and the /midas:<name> invocation. */
  name: string;
  description: string;
  /** Hint for the command argument, when the command takes one. */
  argumentHint?: string;
  /** Markdown body instructing the agent to drive the workflow via `midas ... --json`. */
  body: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: 'spec',
    description: 'Write a SPEC.md for a new feature using the MidasSpec SDD workflow',
    argumentHint: '[spec-name]',
    body: `Write a functional spec (SPEC.md) for the feature the user described.

1. If the spec folder does not exist yet, run \`midas new "<spec-name>" --json\`
   to scaffold it. The output includes the spec slug and folder path.
2. Run \`midas instructions spec --json\`. The payload contains the output path
   (\`relOutputPath\`), the expected markdown \`template\`, project \`context\`, and
   the project's \`rules\` for spec writing.
3. Ask the user clarifying questions about scope and behavior until the
   requirements are unambiguous.
4. Write SPEC.md at the returned path, following the returned template and
   every rule. Describe components and behaviors — not implementation.
5. Run \`midas validate <spec-slug> --json\` and fix any reported problems.`,
  },
  {
    name: 'break',
    description: 'Break a spec into implementable issues with a dependency graph',
    argumentHint: '[spec-slug]',
    body: `Break an existing SPEC.md into small, implementable issues.

1. Run \`midas instructions break --spec <spec-slug> --json\`. The payload
   contains the issue \`template\`, the spec content, and the project's \`rules\`
   for issue writing.
2. Read the spec and derive a set of issues, each independently verifiable and
   small enough to implement in one sitting.
3. Write one markdown file per issue under \`issues/\` and an \`issues/INDEX.md\`
   listing every issue with its \`blocked by\` dependencies, following the
   returned template and rules exactly.
4. Run \`midas validate <spec-slug> --json\` and fix any reported problems.`,
  },
  {
    name: 'implement',
    description: 'Pick the next ready issue of a spec and implement it',
    argumentHint: '[spec-slug]',
    body: `Implement the next ready issue of a spec.

1. Run \`midas issues <spec-slug> --ready --json\` to list issues whose blockers
   are all done. If none are ready, report progress and stop.
2. Pick one ready issue (the lowest number unless the user asked for a
   specific one) and read its markdown file — it is the contract.
3. Implement exactly what the issue describes, including the tests its
   Expected Result demands, and run the test suite until green.
4. Run \`midas done <spec-slug> <issue-number> --json\` to mark the issue done.
5. Summarize what changed and which issues are now unblocked.`,
  },
  {
    name: 'archive',
    description: 'Validate and archive a finished spec',
    argumentHint: '[spec-slug]',
    body: `Close out a finished spec.

1. Run \`midas issues <spec-slug> --json\` and confirm every issue is done. If
   any are open, report them and stop.
2. Run \`midas validate <spec-slug> --json\` and fix any reported problems.
3. Run \`midas archive <spec-slug> --json\` to move the spec to the archive.
4. Report the archived location from the command output.`,
  },
];
