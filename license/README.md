# License Module

This module handles license verification for Retentix using Ed25519 digital signatures.

## License Format

A valid license is a compact token in the format: `base64(payload).base64(signature)`

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

### Token Format

```
eyJjdXN0b21lciI6IkNvbXBhbnkgTmFtZSIsLi4ufQ==.c2lnbmF0dXJlX2hlcmU=
└─────────────── base64(payload) ────────────┘ └─ base64(signature) ─┘
```

## Fields

- **customer**: Organization name
- **environments**: List of allowed environments (e.g., production, staging, development)
- **expires_at**: ISO 8601 timestamp when the license expires
- **features**: Array of enabled features:
  - `retention`: Time-based data retention rules
  - `erasure`: RTBF (Right To Be Forgotten) functionality
  - `masking`: Data masking/anonymization
- **max_runs_per_day** (optional): Maximum number of executions per day
- **issued_at**: ISO 8601 timestamp when the license was issued
- **signature**: Ed25519 signature of the payload (base64 encoded)

## Usage

Set the license as an environment variable:

```bash
export RETENTIX_LICENSE='eyJjdXN0b21lciI6IllvdXJDb21wYW55IiwiZW52aXJvbm1lbnRzIjpbInByb2R1Y3Rpb24iXSwiZXhwaXJlc19hdCI6IjIwMjUtMTItMzFUMjM6NTk6NTkuMDAwWiIsImZlYXR1cmVzIjpbInJldGVudGlvbiIsImVyYXN1cmUiLCJtYXNraW5nIl0sImlzc3VlZF9hdCI6IjIwMjUtMDEtMDFUMDA6MDA6MDAuMDAwWiJ9.c2lnbmF0dXJlX2hlcmU='
```

Or in Docker/Kubernetes:

```yaml
environment:
  - RETENTIX_LICENSE=eyJjdXN0b21lciI6IkNvbXBhbnkifQ==.c2lnbmF0dXJl
```

## Verification

The license is verified using the TweetNaCl library:

1. The token is split on `.` to get payload and signature parts
2. The payload is decoded from base64 and parsed as JSON
3. The signature is decoded from base64
4. Ed25519 signature verification is performed using the public key
5. The expiration date is checked

## Security

- Uses Ed25519 digital signatures for cryptographic verification
- Public key is embedded in the application
- Private key is kept secure and used only for license generation
- Tampering with the license token will cause signature verification to fail
- License is stored as an environment variable (cloud-native, no file I/O)
- Compact format (similar to JWT) makes it easy to pass around

## Benefits of This Approach

### Compact Token Format
- **Shorter**: More compact than full JSON (no field names repeated)
- **URL-Safe**: Can be used in URLs, headers, or any text field
- **Single Line**: No escaping issues with quotes or newlines
- **Familiar**: Similar to JWT format that developers know

### Environment Variable Storage
- **Cloud-Native**: Works seamlessly with Docker, Kubernetes, and serverless platforms
- **Secret Management**: Integrates with secret management systems (AWS Secrets Manager, HashiCorp Vault, etc.)
- **No File I/O**: Eliminates file system dependencies and permission issues
- **Easier Rotation**: Update licenses by changing environment variables without redeploying containers
- **CI/CD Friendly**: Easy to inject different licenses for different environments

## Development

For development and testing, you'll need a valid license token. Contact the maintainer to obtain one.

The public key placeholder (`BASE64_PUBLIC_KEY_HERE`) in `verify.ts` must be replaced with the actual public key before deployment.

### Generating a License (for maintainers)

```javascript
// Example license generation (requires private key)
const payload = {
  customer: "Company Name",
  environments: ["production"],
  expires_at: "2025-12-31T23:59:59.000Z",
  features: ["retention", "erasure", "masking"],
  issued_at: new Date().toISOString()
};

const payloadJson = JSON.stringify(payload);
const payloadB64 = Buffer.from(payloadJson).toString('base64');
const signature = nacl.sign.detached(Buffer.from(payloadJson), privateKey);
const signatureB64 = Buffer.from(signature).toString('base64');
const token = `${payloadB64}.${signatureB64}`;
```

