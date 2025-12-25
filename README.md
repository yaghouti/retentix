# Retentix

[![CI](https://github.com/yaghouti/Retentix/actions/workflows/ci.yml/badge.svg)](https://github.com/yaghouti/Retentix/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yaghouti/Retentix/branch/main/graph/badge.svg)](https://codecov.io/gh/yaghouti/Retentix)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**Deterministic Data Retention & GDPR Execution Engine**

Retentix is a headless, production-grade execution engine for enforcing:

* Data Retention policies
* Right To Be Forgotten (RTBF / Erasure)
* Field-level Masking (Anonymization)

on live production databases (PostgreSQL).

No UI. No ORM. No workflow engine.

---

## Why Retentix

Most compliance tools are:

* Over-engineered
* Hard to audit
* Operationally expensive
* UI-heavy and non-deterministic

Retentix is designed for **engineering-led compliance**:

* Deterministic execution
* Fail-fast validation
* Audit-first by design
* Minimal operational surface

If a policy runs, it is correct. If not, it fails early.

---

## Design Principles

* **Deterministic Execution**
  Every run either completes successfully or fails before any side-effect.

* **Fail-Fast Validation**
  Policies and inputs are fully validated before any database interaction.

* **Audit-First**
  Every action records affected rows, timestamps, and execution mode.

* **Stateless & Headless**
  Designed for CI/CD, cron jobs, and Kubernetes jobs.

---

## What Retentix Is NOT

* ❌ Data discovery tool
* ❌ DLP platform
* ❌ UI-based compliance suite
* ❌ Continuous monitoring system

Retentix assumes you already know **what** data you own.
It focuses on **executing compliance correctly**.

---

## Supported Operations

### Retention

Delete expired data based on time-based policies.

### RTBF (Erasure)

Deterministic cascade deletion based on explicit identifiers (e.g. user_id).

### Masking

Field-level anonymization (hashing or nulling sensitive fields).

---

## Quick Start

### License Requirement

Retentix requires a valid license to run. Set the `RETENTIX_LICENSE` environment variable with your license token:

```bash
export RETENTIX_LICENSE='eyJjdXN0b21lciI6IllvdXJDb21wYW55IiwiZW52aXJvbm1lbnRzIjpbInByb2R1Y3Rpb24iXSwiZXhwaXJlc19hdCI6IjIwMjUtMTItMzFUMjM6NTk6NTkuMDAwWiIsImZlYXR1cmVzIjpbInJldGVudGlvbiIsImVyYXN1cmUiLCJtYXNraW5nIl0sImlzc3VlZF9hdCI6IjIwMjUtMDEtMDFUMDA6MDA6MDAuMDAwWiJ9.c2lnbmF0dXJlX2hlcmU='
```

The license is a compact cryptographically signed token (format: `base64(payload).base64(signature)`) that specifies:
- Customer name and environments
- Enabled features (retention, erasure, masking)
- Expiration date
- Optional rate limits

Contact the maintainer for license information.

### Running Examples

```bash
# Run the example
node --experimental-strip-types examples/example.ts

# Or specify a custom policy file
node --experimental-strip-types examples/example.ts path/to/policy.yaml
```

### Example Workflow

```bash
# 1. Validate Policy
retentix validate policy.yaml

# 2. Dry-run Retention (default)
retentix retention run policy.yaml

# 3. Execute RTBF
retentix erasure run policy.yaml --input employee_id={UUID}

# 4. Apply Masking
retentix masking run policy.yaml

# 5. Execute changes (remove dry-run)
retentix retention run policy.yaml --no-dry-run
```

---

## Audit Output

Each execution produces structured audit records:

```json
{
  "type": "erasure",
  "entity": "employee",
  "action": "delete",
  "affectedRows": 1,
  "dryRun": false,
  "timestamp": "2025-01-24T12:00:00Z"
}
```

Audit logs can be:

* Written to file
* Shipped to SIEM
* Provided directly to a DPO

---

## Security Model

* No dynamic SQL
* No joins
* No runtime expressions
* Explicit table and column mapping
* Secrets provided via environment variables

---

## Deployment Models

### Docker (Recommended)

Pull the latest image from GitHub Container Registry:

```bash
docker pull ghcr.io/yaghouti/retentix:latest
```

Run with Docker:

```bash
docker run --rm \
  -e RETENTIX_LICENSE='your-license-token-here' \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e HASH_SALT="your-secret-salt" \
  -v $(pwd)/policy.yaml:/app/policy.yaml:ro \
  -v $(pwd)/audit:/app/audit \
  ghcr.io/yaghouti/retentix:latest \
  validate /app/policy.yaml
```

Run retention with docker-compose:

```bash
docker-compose run --rm retentix retention run /app/policy.yaml
```

### Kubernetes Job

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: retentix-retention
spec:
  schedule: "0 2 * * 0"  # Weekly at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: retentix
            image: ghcr.io/yaghouti/retentix:latest
            args: ["retention", "run", "/config/policy.yaml", "--no-dry-run"]
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: retentix-secrets
                  key: database-url
            volumeMounts:
            - name: config
              mountPath: /config
              readOnly: true
          volumes:
          - name: config
            configMap:
              name: retentix-policy
          restartPolicy: OnFailure
```

### Other Deployment Options

* CI/CD pipelines (GitHub Actions, GitLab CI)
* Cron jobs (traditional Unix cron)
* Air-gapped environments (offline Docker images)

---

## Typical Use Cases

* EU-based SaaS companies
* FinTech and HealthTech
* Organizations with internal DPOs
* Engineering-driven compliance teams

---

## Licensing

PolicyCTL is licensed as:

* Annual subscription
* Per environment (dev / staging / prod)
* No vendor lock-in

---

## Support Philosophy

PolicyCTL is intentionally minimal.

If ongoing support is required, it usually indicates:

* Incorrect policy design
* Unclear data ownership

The tool itself is designed to be operationally silent.

---

## Summary

PolicyCTL enables **compliance as code**:

* Predictable
* Auditable
* Automatable

Built for teams that value correctness over dashboards.

# For Developers

## Requirements

- Node.js >= 24.0.0 (uses native TypeScript support)
- pnpm >= 10.26.2
- PostgreSQL database

## Installation

```bash
pnpm install
```

## Environment Variables

```bash
RETENTIX_LICENSE='base64payload.base64signature'       # Required (compact token format)
DATABASE_URL=postgresql://user:pass@localhost:5432/db  # Required
AUDIT_PATH=audit.jsonl                                  # Optional (default: audit.jsonl)
HASH_SALT=your-secret-salt                             # Required for hash masking
```

---

## CLI Commands

This project uses Node.js 24's native TypeScript support via the `--experimental-strip-types` flag. No build step required!

### Validate a policy file

```bash
node --experimental-strip-types cli/index.ts validate examples/hr-policy.yaml
```

### Run retention rules

```bash
node --experimental-strip-types cli/index.ts retention run examples/hr-policy.yaml
```

### Run masking rules

```bash
node --experimental-strip-types cli/index.ts masking run examples/hr-policy.yaml
```

### Run erasure (RTBF) with input parameters

```bash
node --experimental-strip-types cli/index.ts erasure run examples/hr-policy.yaml \
  --input-employee_id=123e4567-e89b-12d3-a456-426614174000
```

### Execute changes (disable dry-run)

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
- 174 tests across all modules
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
  └── postgres/         # PostgreSQL implementations
      ├── client.ts     # Connection pool setup
      ├── retention.ts  # Retention queries
      ├── erasure.ts    # Erasure queries
      └── masking.ts    # Masking queries

examples/                # Example policies & usage
  ├── hr-policy.yaml    # Complete GDPR HR policy example
  ├── example.ts        # Policy loading demonstration
  └── README.md         # Examples documentation
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

---

## Contributing

See [examples/README.md](examples/README.md) for policy examples and usage patterns.

---

## License

ISC
