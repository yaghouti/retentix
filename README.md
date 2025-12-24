# Retentix

[![CI](https://github.com/yaghouti/Retentix/actions/workflows/ci.yml/badge.svg)](https://github.com/yaghouti/Retentix/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yaghouti/Retentix/branch/main/graph/badge.svg)](https://codecov.io/gh/yaghouti/Retentix)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

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

### Testing:

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

### Code Quality:

```bash
# Type check
pnpm type-check

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
- **Comprehensive Testing**: Vitest with 95%+ code coverage

## Project Structure

```
policy/
  ├── types.ts           # Domain type definitions
  ├── schema.ts          # Zod validation schemas
  ├── schema.test.ts     # Schema validation tests
  ├── parser.ts          # Parse validated data to domain types
  ├── parser.test.ts     # Parser tests
  ├── validate.ts        # Load and validate YAML policies
  └── validate.test.ts   # Validation tests
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

## Testing

This project uses **Vitest** for unit testing with comprehensive test coverage.

### Test Coverage

- **53 tests** across 4 test suites
- **95%+ code coverage** (statements, branches, functions, lines)
- Unit tests for schema validation, parsing logic, and file loading
- Integration tests for end-to-end policy processing

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Interactive UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## CI/CD

This project uses GitHub Actions for continuous integration:

### Workflows

- **CI** (`ci.yml`): Runs on every push and PR
  - Linting and formatting checks (Biome)
  - Type checking (TypeScript)
  - Unit and integration tests (Vitest)
  - Code coverage reporting (95%+)
  - Security audit (`pnpm audit`)

- **Release** (`release.yml`): Automated releases
  - Triggered by version tags (e.g., `v0.0.1`)
  - Runs full test suite
  - Creates GitHub release with notes

### Dependabot

Automated dependency updates via `dependabot.yml`:
- Weekly updates for npm packages and GitHub Actions
- Grouped updates for minor and patch versions
- Automatic security updates

### Status Checks

All PRs must pass:
- ✅ Linting and formatting
- ✅ Type checking
- ✅ All tests passing (53 tests)
- ✅ Code coverage maintained (95%+)
- ✅ Security audit

## Security

Please see [SECURITY.md](.github/SECURITY.md) for security policies and reporting vulnerabilities.

## Notes

- When using `type: null` in YAML files, make sure to quote it as `type: "null"` to prevent YAML from parsing it as an actual null value
- The project uses ESM modules with `.ts` extensions in imports
- Node.js 24's `--experimental-strip-types` flag strips TypeScript types at runtime without compilation
- Run `pnpm check:fix` before committing to ensure code quality
- Run `pnpm test` to verify all tests pass before committing
