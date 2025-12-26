# Tamper-Evident Audit Logging

Retentix provides tamper-evident audit logging using cryptographic hash chains to ensure the integrity of audit records.

## Overview

Every audit entry includes:
- The audit event data
- A hash of the previous entry
- A SHA-256 hash of the current entry
- A sequence number

This creates a blockchain-like chain where tampering with any entry breaks the chain and is immediately detectable.

## How It Works

### Hash Chain Structure

```
Entry 1:
  previousHash: "GENESIS"
  event: {...}
  sequence: 1
  hash: hash(event + previousHash + sequence)

Entry 2:
  previousHash: hash_from_entry_1
  event: {...}
  sequence: 2
  hash: hash(event + previousHash + sequence)

Entry 3:
  previousHash: hash_from_entry_2
  event: {...}
  sequence: 3
  hash: hash(event + previousHash + sequence)
```

### Tamper Detection

Any modification to:
- Event data (e.g., changing `affectedRows` from 5 to 999)
- Previous hash
- Sequence number
- Hash itself

Will be detected during verification because:
1. The hash won't match the recomputed hash
2. The hash chain will be broken
3. Sequence numbers won't be sequential

## Configuration

### Environment Variables

**`AUDIT_PATH`** (optional)
- **Description:** Path to the audit log file
- **Default:** `audit.jsonl`
- **Example:** `AUDIT_PATH=/var/log/retentix/audit.jsonl`

The audit log path can be configured via the `AUDIT_PATH` environment variable. If not set, the default `audit.jsonl` will be used in the current working directory.

```bash
# Use custom audit log path
export AUDIT_PATH=/var/log/retentix/audit.jsonl
retentix retention run policy.yaml

# Use default audit.jsonl in current directory
retentix retention run policy.yaml
```

## Usage

### Using Tamper-Evident Audit Writer

```typescript
import { TamperEvidentAuditWriter } from './engine/tamper-evident-audit.ts';

// Create writer with custom path
const audit = new TamperEvidentAuditWriter('audit.jsonl');

// Or use environment variable
const auditPath = process.env.AUDIT_PATH || 'audit.jsonl';
const audit = new TamperEvidentAuditWriter(auditPath);

// Record events
await audit.record({
  type: 'retention',
  entity: 'users',
  action: 'delete',
  affectedRows: 5,
  dryRun: false,
  timestamp: new Date().toISOString(),
});
```

### Verifying Audit Log Integrity

#### Via CLI

```bash
# Verify audit log integrity
retentix verify-audit audit.jsonl

# Output for valid log:
# ✅ Audit log is valid and tamper-free
#    Total entries: 42
#    Hash chain: intact

# Output for tampered log:
# ❌ Audit log verification FAILED
#    Total entries: 42
#    Errors found: 2
#
# Errors:
#   - Entry 15: Hash mismatch (expected abc123..., got def456...)
#   - Entry 16: Hash chain broken (expected previousHash abc123..., got xyz789...)
```

#### Programmatically

```typescript
import { TamperEvidentAuditWriter } from './engine/tamper-evident-audit.ts';

const result = TamperEvidentAuditWriter.verifyLog('audit.jsonl');

if (result.valid) {
  console.log(`✅ Valid log with ${result.totalEntries} entries`);
} else {
  console.log(`❌ Invalid log: ${result.errors.join(', ')}`);
}
```

## Audit Entry Format

Each entry in the audit log is a JSON object:

```json
{
  "event": {
    "type": "retention",
    "entity": "users",
    "action": "delete",
    "affectedRows": 5,
    "dryRun": false,
    "timestamp": "2025-01-01T00:00:00.000Z"
  },
  "previousHash": "a1b2c3d4e5f6...",
  "hash": "f6e5d4c3b2a1...",
  "sequence": 42
}
```

## Security Properties

### Tamper Detection

✅ **Detects:**
- Modified event data
- Deleted entries (breaks sequence)
- Reordered entries (breaks hash chain)
- Inserted entries (breaks sequence and hash chain)
- Modified timestamps
- Modified affected row counts

### Limitations

⚠️ **Does NOT prevent:**
- Deletion of the entire audit file
- Truncation of the log (removing entries from the end)

**Mitigation:**
- Store audit logs in append-only storage (e.g., AWS S3 with object lock)
- Replicate audit logs to multiple locations
- Use file system immutability (e.g., `chattr +a` on Linux)
- Monitor file size and entry counts

## Best Practices

### 1. Protect the Audit File

```bash
# Linux: Make file append-only
sudo chattr +a audit.jsonl

# Docker: Mount as read-only after writing
docker run -v ./audit:/audit:ro retentix
```

### 2. Regular Verification

```bash
# Add to cron for daily verification
0 2 * * * /usr/local/bin/retentix verify-audit /var/log/retentix/audit.jsonl
```

### 3. Backup and Replication

```bash
# Replicate to secure storage
aws s3 cp audit.jsonl s3://audit-logs/$(date +%Y%m%d)/audit.jsonl

# Enable S3 Object Lock for immutability
aws s3api put-object-lock-configuration \
  --bucket audit-logs \
  --object-lock-configuration 'ObjectLockEnabled=Enabled'
```

### 4. Monitoring

```bash
# Monitor for verification failures
retentix verify-audit audit.jsonl || alert-security-team
```

## Comparison: Standard vs Tamper-Evident

| Feature | Standard Audit | Tamper-Evident Audit |
|---------|---------------|---------------------|
| Tamper Detection | ❌ No | ✅ Yes |
| Hash Chain | ❌ No | ✅ Yes |
| Verification | ❌ Not possible | ✅ Built-in |
| Performance | Fast | Slightly slower (hash computation) |
| File Size | Smaller | Larger (includes hashes) |
| Use Case | Development | Production/Compliance |

## Performance

Hash computation adds minimal overhead:
- ~0.1ms per entry (SHA-256 hash)
- Negligible impact on overall execution time
- Verification is fast: ~1000 entries/second

## Compliance

Tamper-evident audit logs help meet compliance requirements:

- **GDPR Article 32**: Security of processing (integrity and confidentiality)
- **SOC 2**: Audit logging and monitoring
- **HIPAA**: Audit controls (§164.312(b))
- **ISO 27001**: A.12.4.1 Event logging

## Example: Detecting Tampering

### Scenario: Attacker modifies affected rows

```bash
# Original entry
{
  "event": {"affectedRows": 5, ...},
  "hash": "abc123..."
}

# Attacker changes to
{
  "event": {"affectedRows": 999, ...},
  "hash": "abc123..."  # Same hash (not recomputed)
}

# Verification detects:
❌ Entry 42: Hash mismatch (expected def456..., got abc123...)
```

### Scenario: Attacker deletes an entry

```bash
# Before: Entries 1, 2, 3, 4, 5
# After: Entries 1, 2, 4, 5 (deleted entry 3)

# Verification detects:
❌ Entry 4: Invalid sequence number (expected 3, got 4)
❌ Entry 4: Hash chain broken (previousHash doesn't match)
```

## Related Documentation

- [Audit Context](./context.ts) - Audit event types
- [File Audit Writer](./audit.ts) - Standard audit writer
- [CLI Commands](../cli/commands/verify-audit.ts) - Verification command

