# ESLint Configuration

## Current Setup

The project uses **ESLint v9** with flat config (`eslint.config.mjs`), `@typescript-eslint` v8, and the Obsidian-specific plugin `eslint-plugin-obsidianmd`.

### Configuration File

- [`eslint.config.mjs`](../../eslint.config.mjs) — flat-config TypeScript + Obsidian ESLint configuration.

### Available Commands

- `npm run lint` — check code for linting errors
- `npm run lint:fix` — automatically fix where possible

## Obsidian ESLint Plugin

The `eslint-plugin-obsidianmd` plugin is **active**. It enforces Obsidian-specific best practices that catch common anti-patterns in plugin development — forbidden DOM elements, direct style assignments, memory-leaking view references, TFile/TFolder casts, `navigator`-based OS detection, and more.

For the full list of active rules and what each one enforces, see [coding-standards.md § 4 → ESLint Plugin Enforcement](coding-standards.md#eslint-plugin-enforcement-eslint-plugin-obsidianmd).

Rules are documented in the `coding-standards.md` file (rather than duplicated here) so there's a single source of truth when the rule set changes.

## References

- [Obsidian ESLint Plugin on GitHub](https://github.com/obsidianmd/eslint-plugin)
- [ESLint Flat Config documentation](https://eslint.org/docs/latest/use/configure/configuration-files)
