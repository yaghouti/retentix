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

## Features

- **Native TypeScript**: Uses Node.js 24+ native TS support (no compilation needed)
- **Type-safe Policy Parsing**: Zod-based schema validation
- **ESM Modules**: Modern ES modules with `.ts` extensions
- **Strict Type Checking**: Full TypeScript strict mode enabled

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

## Notes

- When using `type: null` in YAML files, make sure to quote it as `type: "null"` to prevent YAML from parsing it as an actual null value
- The project uses ESM modules with `.ts` extensions in imports
- Node.js 24's `--experimental-strip-types` flag strips TypeScript types at runtime without compilation
