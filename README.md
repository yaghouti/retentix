# Retentix

Automated GDPR Data Retention & Erasure for HR SaaS

## Requirements

- Node.js >= 24.0.0 (uses native TypeScript support)
- pnpm >= 10.26.2

## Installation

```bash
pnpm install
```

## Usage

This project uses Node.js 24's native TypeScript support via the `--experimental-strip-types` flag. No build step required!

### Run the example:

```bash
node --experimental-strip-types example.ts path/to/policy.yaml
```

### Development:

```bash
pnpm dev
```

### Code Quality:

```bash
# Format code
pnpm format

# Check formatting (without modifying files)
pnpm format:check

# Lint code
pnpm lint

# Lint and auto-fix issues
pnpm lint:fix

# Run all checks (format + lint + organize imports)
pnpm check

# Run all checks and auto-fix
pnpm check:fix
```

## Features

- **Native TypeScript**: Uses Node.js 24+ native TS support (no compilation needed)
- **Type-safe Policy Parsing**: Zod-based schema validation
- **ESM Modules**: Modern ES modules with `.ts` extensions
- **Strict Type Checking**: Full TypeScript strict mode enabled
- **Code Quality**: Biome for fast formatting and linting

## Project Structure

```
policy/
  ├── types.ts      # Domain type definitions
  ├── schema.ts     # Zod validation schemas
  ├── parser.ts     # Parse validated data to domain types
  └── validate.ts   # Load and validate YAML policies
```

## Type Safety

All type errors have been resolved for strict TypeScript checking. The project uses:
- Zod v4 for runtime validation
- TypeScript strict mode
- Proper type narrowing and discriminated unions

## Code Quality Tools

This project uses **Biome** for formatting and linting. Biome is a fast, modern alternative to ESLint and Prettier.

### Configuration

- **Formatter**: 2-space indentation, 100-character line width, double quotes
- **Linter**: Recommended rules + custom rules for TypeScript best practices
- **Import Organization**: Automatically sorts and organizes imports

### Editor Integration

For the best experience, install the Biome extension for your editor:
- VS Code/Cursor: [Biome Extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
- Other editors: See [Biome Editor Integration](https://biomejs.dev/guides/editors/first-party-extensions/)

## Notes

- When using `type: null` in YAML files, make sure to quote it as `type: "null"` to prevent YAML from parsing it as an actual null value
- The project uses ESM modules with `.ts` extensions in imports
- Node.js 24's `--experimental-strip-types` flag strips TypeScript types at runtime without compilation
- Run `pnpm check:fix` before committing to ensure code quality
