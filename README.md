# Retentix

[![CI](https://github.com/yaghouti/Retentix/actions/workflows/ci.yml/badge.svg)](https://github.com/yaghouti/Retentix/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yaghouti/Retentix/branch/main/graph/badge.svg)](https://codecov.io/gh/yaghouti/Retentix)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**Deterministic Data Retention & GDPR Execution Engine**

> 📖 **Looking for product information?** See [Product Documentation](docs/PRODUCT.md) for features, use cases, and deployment options.

---

## Overview

Retentix is a headless, production-grade execution engine for enforcing data retention policies, RTBF (Right To Be Forgotten), and field-level masking on live PostgreSQL databases.

**Key Features:**
- ✅ Deterministic execution with fail-fast validation
- ✅ Audit-first design (every action is logged)
- ✅ Stateless & headless (perfect for CI/CD, cron, K8s)
- ✅ No UI, no ORM, no workflow engine

---

## Requirements

- Node.js >= 24.0.0 (uses native TypeScript support)
- pnpm >= 10.26.2
- PostgreSQL database

---

## Installation

```bash
pnpm install
```

---

## Environment Variables

```bash
RETENTIX_LICENSE='base64payload.base64signature'       # Required (compact token format)
DATABASE_URL=postgresql://user:pass@localhost:5432/db  # Required
AUDIT_PATH=audit.jsonl                                  # Optional (default: audit.jsonl)
HASH_SALT=your-secret-salt                             # Required for hash masking
```

**Note:** The public key for license verification is hardcoded in the application. The private key is kept secure and used to sign licenses.

---

## Quick Start

### Running Examples

```bash
# Run the example
node --experimental-strip-types examples/example.ts

# Or specify a custom policy file
node --experimental-strip-types examples/example.ts path/to/policy.yaml
```

### CLI Commands

This project uses Node.js 24's native TypeScript support via the `--experimental-strip-types` flag. No build step required!

#### Validate a policy file

```bash
node --experimental-strip-types cli/index.ts validate examples/hr-policy.yaml
```

#### Run retention rules

```bash
node --experimental-strip-types cli/index.ts retention run examples/hr-policy.yaml
```

#### Run masking rules

```bash
node --experimental-strip-types cli/index.ts masking run examples/hr-policy.yaml
```

#### Run erasure (RTBF) with input parameters

```bash
node --experimental-strip-types cli/index.ts erasure run examples/hr-policy.yaml \
  --input-employee_id=123e4567-e89b-12d3-a456-426614174000
```

#### Execute changes (disable dry-run)

```bash
node --experimental-strip-types cli/index.ts retention run examples/hr-policy.yaml --no-dry-run
```

---

## Testing

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

**Test Coverage:**
- 203 tests across all modules
- 98%+ code coverage
- Unit, integration, and CLI tests

---

## Code Quality

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Run all checks (format + lint)
pnpm check

# Fix all issues
pnpm check:fix

# Type check
pnpm type-check
```

**Code Quality Tools:**
- Biome for formatting and linting
- TypeScript strict mode
- Vitest for testing
- 100% type coverage

---

## Project Structure

```
cli/                     # Command-line interface
  ├── index.ts          # CLI entry point
  ├── run.ts            # Command router
  ├── config.ts         # Context builder
  └── commands/
      ├── validate.ts   # Validate policy files
      ├── retention.ts  # Run retention rules
      ├── masking.ts    # Run masking rules
      └── erasure.ts    # Run erasure (RTBF)

policy/                  # Policy validation & parsing
  ├── types.ts          # Domain type definitions
  ├── schema.ts         # Zod validation schemas
  ├── parser.ts         # Parse validated data to domain types
  ├── validate.ts       # Load and validate YAML policies
  └── *.test.ts         # Comprehensive test suite

engine/                  # Execution engine
  ├── index.ts          # Main engine entry point
  ├── retention.ts      # Retention rule execution
  ├── erasure.ts        # Erasure (RTBF) execution
  ├── masking.ts        # Masking rule execution
  ├── context.ts        # Execution context types
  ├── audit.ts          # Audit logging
  ├── tamper-evident-audit.ts  # Tamper-evident audit with hash chain
  └── postgres/         # PostgreSQL implementations
      ├── client.ts     # Connection pool setup
      ├── retention.ts  # Retention queries
      ├── erasure.ts    # Erasure queries
      └── masking.ts    # Masking queries

license/                 # License enforcement
  ├── types.ts          # License payload types
  ├── verify.ts         # License verification logic
  ├── run-limit.ts      # Soft run-limit enforcement
  └── README.md         # License documentation

vendor/                  # License generation (vendor-only, not for customers)
  ├── generate.ts       # License signing & key generation
  ├── cli.ts            # CLI for generating licenses
  ├── README.md         # Vendor documentation
  └── *.test.ts         # Vendor tool tests

examples/                # Example policies & usage
  ├── hr-policy.yaml    # Complete GDPR HR policy example
  ├── example.ts        # Policy loading demonstration
  └── README.md         # Examples documentation

docs/                    # Documentation
  └── PRODUCT.md        # Product & customer documentation
```

---

## Type Safety

All type errors have been resolved for strict TypeScript checking. The project uses:
- Zod v4 for runtime validation
- TypeScript strict mode
- Proper type narrowing and discriminated unions

---

## CI/CD

The project includes GitHub Actions workflows for:

- **CI**: Runs tests, linting, formatting, type checking, Docker build validation, and security audit on every push/PR
- **Docker**: Builds and publishes multi-platform Docker images on version tags and validates builds on PRs
- **Release**: Automated releases on version tags

### Docker Image Publishing

Docker images are automatically built and published when you create a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers:
- Multi-platform build (linux/amd64, linux/arm64)
- Push to GitHub Container Registry
- Semantic version tagging (v1.0.0, v1.0, v1, latest)
- Build provenance attestation

### Pull Request Validation

Every PR automatically:
- Validates Docker image builds successfully
- Runs full test suite
- Checks code quality and formatting
- Performs security audit
- Reports code coverage to Codecov

---

## Docker Development

### Build locally

```bash
docker build -t retentix:dev .
```

### Run with docker-compose

```bash
docker-compose up -d postgres
docker-compose run --rm retentix validate /app/examples/hr-policy.yaml
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and checks (`pnpm test && pnpm check && pnpm type-check`)
5. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

See [examples/README.md](examples/README.md) for policy examples and usage patterns.

---

## Documentation

- **[Product Documentation](docs/PRODUCT.md)** - Features, use cases, deployment models, and licensing
- **[Examples](examples/README.md)** - Policy examples and usage patterns
- **[License Documentation](license/README.md)** - License enforcement and verification
- **[Vendor Tools](vendor/README.md)** - License generation (internal use only)

---

## License

ISC
