# CLI Reference

Retentix is operated exclusively via CLI for maximum automation and auditability.

## Installation

```bash
# Docker (recommended)
docker pull ghcr.io/yaghouti/retentix:latest

# NPM (for development)
pnpm install
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RETENTIX_LICENSE` | Yes | - | License token (format: `base64(payload).base64(signature)`) |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `AUDIT_PATH` | No | `audit.jsonl` | Path to audit log file |
| `HASH_SALT` | Conditional | - | Salt for hash masking (required for `hash` strategy) |

## Commands

### `validate`

Validate a policy file without executing any actions.

```bash
retentix validate <policy.yaml>
```

**Example:**
```bash
retentix validate policy.yaml
```

**Output:**
- ✅ Policy is valid
- ❌ Validation errors with line numbers

---

### `retention run`

Execute retention rules (time-based deletions/anonymization).

```bash
retentix retention run <policy.yaml> [--no-dry-run]
```

**Options:**
- `--no-dry-run` - Execute changes (default is dry-run mode)

**Examples:**
```bash
# Dry run (preview only)
retentix retention run policy.yaml

# Execute actual deletions
retentix retention run policy.yaml --no-dry-run
```

**Audit Output:**
```json
{
  "type": "retention",
  "entity": "users",
  "action": "delete",
  "affectedRows": 5,
  "dryRun": false,
  "timestamp": "2025-12-26T12:00:00.000Z"
}
```

---

### `erasure run`

Execute RTBF (Right To Be Forgotten) erasure requests.

```bash
retentix erasure run <policy.yaml> --input-<key>=<value> [--no-dry-run]
```

**Options:**
- `--input-<key>=<value>` - Input parameters for erasure (e.g., `--input-user_id=123`)
- `--no-dry-run` - Execute changes (default is dry-run mode)

**Examples:**
```bash
# Dry run for specific user
retentix erasure run policy.yaml --input-user_id=550e8400-e29b-41d4-a716-446655440000

# Execute actual erasure
retentix erasure run policy.yaml --input-user_id=550e8400-e29b-41d4-a716-446655440000 --no-dry-run
```

**Audit Output:**
```json
{
  "type": "erasure",
  "entity": "orders",
  "action": "delete",
  "affectedRows": 3,
  "dryRun": false,
  "timestamp": "2025-12-26T12:00:00.000Z"
}
```

---

### `masking run`

Execute field-level masking (null, hash, or custom strategies).

```bash
retentix masking run <policy.yaml> [--no-dry-run]
```

**Options:**
- `--no-dry-run` - Execute changes (default is dry-run mode)

**Examples:**
```bash
# Dry run
retentix masking run policy.yaml

# Execute actual masking
retentix masking run policy.yaml --no-dry-run
```

**Audit Output:**
```json
{
  "type": "masking",
  "entity": "profiles",
  "action": "update",
  "affectedRows": 10,
  "dryRun": false,
  "timestamp": "2025-12-26T12:00:00.000Z"
}
```

---

### `verify-audit`

Verify the integrity of a tamper-evident audit log.

```bash
retentix verify-audit <audit-log-file>
```

**Example:**
```bash
retentix verify-audit audit.jsonl
```

**Output (Valid):**
```
✅ Audit log is valid and tamper-free
   Total entries: 42
   Hash chain: intact
```

**Output (Tampered):**
```
❌ Audit log verification FAILED
   Total entries: 42
   Errors found: 2

Errors:
  - Entry 15: Hash mismatch (expected abc123..., got def456...)
  - Entry 16: Hash chain broken
```

---

## Usage Patterns

### CI/CD Integration

```yaml
# .github/workflows/retention.yml
name: Weekly Retention
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM

jobs:
  retention:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run retention
        run: |
          docker run --rm \
            -e RETENTIX_LICENSE="${{ secrets.RETENTIX_LICENSE }}" \
            -e DATABASE_URL="${{ secrets.DATABASE_URL }}" \
            -v $(pwd)/policy.yaml:/policy.yaml \
            ghcr.io/yaghouti/retentix:latest \
            retention run /policy.yaml --no-dry-run
```

### Cron Job

```bash
# /etc/cron.d/retentix-retention
0 2 * * 0 docker run --rm \
  -e RETENTIX_LICENSE="$RETENTIX_LICENSE" \
  -e DATABASE_URL="$DATABASE_URL" \
  -v /opt/retentix/policy.yaml:/policy.yaml \
  -v /var/log/retentix:/data \
  ghcr.io/yaghouti/retentix:latest \
  retention run /policy.yaml --no-dry-run
```

### Manual Execution

```bash
# Set environment variables
export RETENTIX_LICENSE="eyJjdXN0b21lciI6IlRlc3QgQ29ycCJ9.c2lnbmF0dXJl"
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Validate policy
retentix validate policy.yaml

# Dry run first
retentix retention run policy.yaml

# Execute if dry run looks good
retentix retention run policy.yaml --no-dry-run

# Verify audit log
retentix verify-audit audit.jsonl
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation error, execution error, or invalid arguments |

---

## Best Practices

1. **Always dry-run first** - Review the output before executing with `--no-dry-run`
2. **Validate policies** - Run `validate` before deploying new policies
3. **Monitor audit logs** - Regularly verify audit log integrity
4. **Use version control** - Track policy changes in git
5. **Test in staging** - Validate policies against staging data first
6. **Backup before execution** - Take database backups before running destructive operations
7. **Review license limits** - Check `max_runs_per_day` if configured

---

## Troubleshooting

### License Errors

```
Error: Invalid license signature
```
**Solution:** Verify `RETENTIX_LICENSE` environment variable is set correctly.

```
Error: License expired
```
**Solution:** Contact vendor for license renewal.

```
Error: Feature 'erasure' is not enabled in your license
```
**Solution:** Your license doesn't include this feature. Contact vendor to upgrade.

### Database Errors

```
Error: Failed to connect to database
```
**Solution:** Verify `DATABASE_URL` is correct and database is accessible.

### Policy Errors

```
Error: Invalid policy format
```
**Solution:** Run `retentix validate policy.yaml` to see detailed validation errors.

---

## See Also

- [Policy DSL Reference](./policy-dsl.md)
- [Execution Engine](./execution-engine.md)
- [Audit Log Documentation](../../engine/AUDIT.md)
- [Security Model](./security.md)

