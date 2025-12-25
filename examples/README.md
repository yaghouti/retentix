# Examples

This folder contains example policy files and usage demonstrations.

## Files

- **`hr-policy.yaml`** - A complete GDPR-compliant HR data retention policy example
- **`example.ts`** - Script demonstrating how to load and parse policy files

## Running the Examples

### Parse and validate a policy file

```bash
node --experimental-strip-types examples/example.ts examples/hr-policy.yaml
```

### Validate policy syntax

```bash
node --experimental-strip-types cli/index.ts validate examples/hr-policy.yaml
```

### Test CLI commands (dry-run mode)

```bash
# Set required environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/hr_db"
export HASH_SALT="your-secret-salt"

# Run retention rules (dry-run)
node --experimental-strip-types cli/index.ts retention run examples/hr-policy.yaml

# Run masking rules (dry-run)
node --experimental-strip-types cli/index.ts masking run examples/hr-policy.yaml

# Run erasure with employee ID (dry-run)
node --experimental-strip-types cli/index.ts erasure run examples/hr-policy.yaml \
  --input-employee_id=123e4567-e89b-12d3-a456-426614174000
```

## Policy Structure

The `hr-policy.yaml` demonstrates:

- **Retention rules** - Automatic deletion/anonymization after retention period
- **Masking rules** - Hash or nullify sensitive fields
- **Erasure rules** - Right to be forgotten (RTBF) implementation
- **Multiple entities** - Employees and job applications
- **Cascade actions** - Delete employee and anonymize related applications

## Customization

Copy `hr-policy.yaml` and modify it for your use case:

1. Update `sources` with your database connection
2. Define your `entities` (tables)
3. Configure `retention` rules with appropriate periods
4. Set up `masking` strategies for sensitive data
5. Define `erasure` cascade rules for RTBF compliance

