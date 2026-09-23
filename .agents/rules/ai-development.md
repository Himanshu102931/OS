---
trigger: always_on
---

# AI Development Rules

PlacementOS is being developed with heavy AI assistance.

The goal is fast development without creating an application the user cannot understand.

## Agent behavior

- Inspect before changing.
- Plan before implementing.
- Make small, verifiable changes.
- Never blindly rewrite the whole project.
- Never modify unrelated files.
- Never add dependencies without explaining why they are needed.
- Prefer existing project capabilities over new packages.
- Preserve working code unless there is a clear reason to change it.

## Dependency rule

Before adding a dependency, explain:

1. what problem it solves;
2. why it is needed;
3. whether the problem can reasonably be solved without it;
4. what new complexity it introduces.

Do not install a dependency merely because it is popular or because an AI-generated solution used it elsewhere.

## Terminal rule

Prefer safe, reversible commands.

Do not execute destructive commands without explicit user approval.

Never delete large directories, reset repositories, remove data, or overwrite major files without confirmation.

## Understanding rule

For major features, provide:

- what changed;
- why it changed;
- important files;
- important dependencies;
- tests run;
- important implementation decisions.

The user is a beginner and must be able to understand the system.

## Verification

After meaningful changes:

- run the relevant tests;
- inspect errors;
- verify the application behavior;
- report failures honestly.

Never claim something works without verification.
