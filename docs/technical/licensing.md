# Licensing Model

Retentix uses **offline, signed licenses** with Ed25519 digital signatures for cryptographic verification.

## Overview

### Properties

- **Cryptographic signature** (Ed25519) - Tamper-proof verification
- **Environment-scoped** - Restrict to production, staging, etc.
- **Feature-scoped** - Enable specific features (retention, erasure, masking)
- **Expiry-based** - Time-limited licenses
- **Offline verification** - No license server required
- **Run limits** (optional) - Soft daily execution limits with audit logging

### Enforcement Points

- **CLI command routing** - Features are gated at CLI level
- **Execution engine gates** - Double-check before execution
- **License validation** - Verified on every command invocation

---

## License Format

A valid license is a compact token in the format: `base64(payload).base64(signature)`

### Token Structure

```
eyJjdXN0b21lciI6IkNvbXBhbnkgTmFtZSIsLi4ufQ==.c2lnbmF0dXJlX2hlcmU=
└─────────────── base64(payload) ────────────┘ └─ base64(signature) ─┘
```

### Payload Structure

The payload is a JSON object (before base64 encoding):

```json
{
  "customer": "Company Name",
  "environments": ["production", "staging"],
  "expires_at": "2025-12-31T23:59:59.000Z",
  "features": ["retention", "erasure", "masking"],
  "max_runs_per_day": 1000,
  "issued_at": "2025-01-01T00:00:00.000Z"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer` | string | Yes | Organization name |
| `environments` | string[] | Yes | Allowed environments (e.g., production, staging) |
| `expires_at` | ISO 8601 | Yes | License expiration timestamp |
| `features` | string[] | Yes | Enabled features: `retention`, `erasure`, `masking` |
| `max_runs_per_day` | number | No | Maximum daily executions (soft limit) |
| `issued_at` | ISO 8601 | Yes | License issuance timestamp |

---

## Usage

### Setting the License

**Environment Variable:**
```bash
export RETENTIX_LICENSE='eyJjdXN0b21lciI6IllvdXJDb21wYW55IiwiZW52aXJvbm1lbnRzIjpbInByb2R1Y3Rpb24iXSwiZXhwaXJlc19hdCI6IjIwMjUtMTItMzFUMjM6NTk6NTkuMDAwWiIsImZlYXR1cmVzIjpbInJldGVudGlvbiIsImVyYXN1cmUiLCJtYXNraW5nIl0sImlzc3VlZF9hdCI6IjIwMjUtMDEtMDFUMDA6MDA6MDAuMDAwWiJ9.c2lnbmF0dXJlX2hlcmU='
```

**Docker:**
```bash
docker run --rm \
  -e RETENTIX_LICENSE="$RETENTIX_LICENSE" \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/yaghouti/retentix:latest \
  retention run policy.yaml
```

**Kubernetes Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: retentix-license
type: Opaque
stringData:
  license: eyJjdXN0b21lciI6IkNvbXBhbnkifQ==.c2lnbmF0dXJl
```

**Docker Compose:**
```yaml
services:
  retentix:
    image: ghcr.io/yaghouti/retentix:latest
    environment:
      RETENTIX_LICENSE: ${RETENTIX_LICENSE}
      DATABASE_URL: ${DATABASE_URL}
```

---

## Verification Process

The license is verified using the TweetNaCl library:

1. **Split Token**: Token is split on `.` to extract payload and signature
2. **Decode Payload**: Payload is decoded from base64 and parsed as JSON
3. **Decode Signature**: Signature is decoded from base64
4. **Verify Signature**: Ed25519 signature verification using embedded public key
5. **Check Expiration**: Ensure license hasn't expired
6. **Validate Features**: Ensure requested feature is enabled

### Public Key

The Ed25519 public key is **hardcoded in the application** (`license/verify.ts`). This eliminates the need for:
- Environment variables for public key
- File-based key distribution
- Network calls to key servers

---

## Run Limit Enforcement

The optional `max_runs_per_day` field enables **soft run-limit enforcement**:

### How It Works

- **Soft Enforcement**: Execution is **never blocked**, even when limit is exceeded
- **Daily Counter**: Tracks runs per day in `.retentix-runs.json` file
- **Warnings**: Displays warnings when limit is exceeded
- **Audit Logging**: Violations are logged to the audit file for monitoring
- **Automatic Reset**: Counter resets at midnight (UTC)

### Workflow

1. Each CLI execution increments the daily counter
2. If limit is exceeded, a warning is displayed but execution continues
3. Violations are logged to the audit file with customer info and counts
4. Counter automatically resets for the next day

### Example Warning

```bash
# License with max_runs_per_day: 10
# Run 11 shows warning but continues:
⚠️  WARNING: Daily run limit exceeded (11/10). This is a soft limit - execution will continue, but please review your usage.
```

### Audit Log Entry

```json
{
  "type": "run_limit",
  "customer": "Acme Corporation",
  "currentCount": 11,
  "limit": 10,
  "exceeded": true,
  "timestamp": "2025-12-26T14:30:00.000Z"
}
```

---

## Security

### Cryptographic Verification

- **Ed25519 Digital Signatures**: Industry-standard asymmetric cryptography
- **Public Key Embedded**: No external key management required
- **Private Key Secure**: Kept secure by vendor, never distributed
- **Tamper-Proof**: Any modification to license token fails signature verification

### Storage

- **Environment Variable**: Cloud-native, no file I/O
- **Secret Management**: Integrates with AWS Secrets Manager, HashiCorp Vault, etc.
- **No Network Calls**: Completely offline verification
- **Rotation-Friendly**: Update licenses by changing environment variables

### Threat Model

**Protected Against:**
- ✅ License tampering (signature verification)
- ✅ License forgery (requires private key)
- ✅ Expired license usage (expiration check)
- ✅ Feature escalation (feature list is signed)
- ✅ Environment misuse (environment list is signed)

**Not Protected Against:**
- ⚠️ License sharing (intentional - allows backup/DR scenarios)
- ⚠️ Run limit bypass (soft limit by design)

---

## Benefits of This Approach

### Compact Token Format

- **Shorter**: More compact than full JSON (no field names repeated)
- **URL-Safe**: Can be used in URLs, headers, or any text field
- **Single Line**: No escaping issues with quotes or newlines
- **Familiar**: Similar to JWT format that developers know

### Environment Variable Storage

- **Cloud-Native**: Works seamlessly with Docker, Kubernetes, serverless
- **Secret Management**: Integrates with secret management systems
- **No File I/O**: Eliminates file system dependencies and permission issues
- **Easier Rotation**: Update licenses without redeploying containers
- **CI/CD Friendly**: Easy to inject different licenses for different environments

### Offline Verification

- **Air-Gap Compatible**: No network required for license verification
- **Zero Latency**: Instant verification, no API calls
- **High Availability**: No dependency on external license server
- **Compliance-Friendly**: Suitable for regulated environments

---

## Development & Testing

### Development Mode

For development and testing:
- The system uses a hardcoded public key
- You'll need a valid license token signed with the corresponding private key
- Contact the maintainer to obtain development licenses

### Production Deployment

For production:
- The production public key is hardcoded in the Docker image
- Only licenses signed with the corresponding private key are accepted
- Contact the maintainer for production license information

---

## License Generation (Vendor Only)

License generation is handled by the vendor using the `retentix-vendor` CLI.

See [Vendor Documentation](../../vendor/README.md) for:
- Key pair generation
- License signing
- Security best practices

**Note:** License generation tools are for internal use only and not distributed to customers.

---

## Error Messages

### Invalid License

```
Error: Invalid license signature
```
**Cause:** License token is corrupted or tampered with  
**Solution:** Verify `RETENTIX_LICENSE` environment variable is set correctly

### Expired License

```
Error: License expired
```
**Cause:** License expiration date has passed  
**Solution:** Contact vendor for license renewal

### Feature Not Enabled

```
Error: Feature 'erasure' is not enabled in your license
```
**Cause:** Requested feature is not in the license's feature list  
**Solution:** Contact vendor to upgrade license

### Missing License

```
Error: RETENTIX_LICENSE environment variable is required
```
**Cause:** License environment variable is not set  
**Solution:** Set `RETENTIX_LICENSE` environment variable

---

## Frequently Asked Questions

### Can I use the same license in multiple environments?

Yes, if the license includes multiple environments in the `environments` array. However, each environment should ideally have its own license for better tracking and security.

### What happens if my license expires?

Retentix will refuse to execute any commands. You'll need to obtain a renewed license from the vendor.

### Can I modify the license to add features?

No. Any modification to the license will cause signature verification to fail. Licenses must be generated and signed by the vendor.

### Is the license tied to a specific machine?

No. The license is environment-based, not machine-based. This allows for horizontal scaling and disaster recovery scenarios.

### What happens if I exceed the daily run limit?

Execution continues normally, but a warning is displayed and the violation is logged to the audit file. It's a soft limit designed for monitoring, not enforcement.

### Can I run Retentix without a license?

No. A valid license is required for all operations except `--help`.

---

## See Also

- [Vendor Tools](../../vendor/README.md) - License generation (internal use only)
- [Security Model](./security.md) - Overall security architecture
- [CLI Reference](./cli-reference.md) - Environment variable configuration
- [Deployment Guide](./deployment.md) - Production deployment patterns
