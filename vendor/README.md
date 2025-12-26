# License Generator (Vendor Only)

This directory contains tools for generating Ed25519 key pairs and signing license tokens. **These tools are for internal use only** and should not be distributed to customers.

## Security Notice

⚠️ **IMPORTANT**: The private key must be kept secure and never committed to version control!

- Add `vendor/keys.json` and `vendor/*.key` to `.gitignore`
- Store the private key in a secure location (password manager, HSM, etc.)
- Only authorized personnel should have access to the private key

## Quick Start

### 1. Generate a Key Pair

```bash
node --experimental-strip-types vendor/cli.ts generate-keys --output keys.json
```

This creates a `keys.json` file with:
```json
{
  "publicKey": "base64_encoded_public_key",
  "privateKey": "base64_encoded_private_key",
  "note": "Keep the private key secure!"
}
```

**Important**: Update `license/verify.ts` with the public key before building the Docker image!

### 2. Create a License Payload

Create a JSON file (e.g., `customer-license.json`) with the license details:

```json
{
  "customer": "Acme Corporation",
  "environments": ["production", "staging"],
  "expires_at": "2026-12-31T23:59:59.000Z",
  "features": ["retention", "erasure", "masking"],
  "max_runs_per_day": 1000,
  "issued_at": "2025-01-01T00:00:00.000Z"
}
```

### 3. Generate a License Token

```bash
node --experimental-strip-types vendor/cli.ts generate-license \
  customer-license.json \
  keys.json \
  --output customer-license.key
```

Or output to stdout:

```bash
node --experimental-strip-types vendor/cli.ts generate-license \
  customer-license.json \
  keys.json
```

The generated token will be in the format: `base64(payload).base64(signature)`

### 4. Provide License to Customer

Send the customer the license token from `customer-license.key`. They should set it as an environment variable:

```bash
export RETENTIX_LICENSE='eyJjdXN0b21lciI6IkFjbWUgQ29ycG9yYXRpb24iLC4uLn0=.c2lnbmF0dXJlX2hlcmU='
```

## CLI Commands

### `generate-keys`

Generate a new Ed25519 key pair.

```bash
node --experimental-strip-types vendor/cli.ts generate-keys [--output keys.json]
```

**Options:**
- `--output <file>`: Output file for the key pair (default: `keys.json`)

**Output:**
- Public key (32 bytes, base64 encoded)
- Private key (64 bytes, base64 encoded)

### `generate-license`

Generate a signed license token from a payload.

```bash
node --experimental-strip-types vendor/cli.ts generate-license <payload.json> <private-key-file> [--output license.txt]
```

**Arguments:**
- `<payload.json>`: JSON file containing the license payload
- `<private-key-file>`: File containing the private key (can be `keys.json` or plain base64)

**Options:**
- `--output <file>`: Output file for the license token (if omitted, prints to stdout)

## License Payload Fields

### Required Fields

- **`customer`** (string): Customer or organization name
- **`environments`** (string[]): List of allowed environments (e.g., `["production", "staging"]`)
- **`expires_at`** (string): ISO 8601 timestamp when the license expires
- **`features`** (string[]): Array of enabled features:
  - `"retention"`: Time-based data retention rules
  - `"erasure"`: RTBF (Right To Be Forgotten) functionality
  - `"masking"`: Data masking/anonymization
- **`issued_at`** (string): ISO 8601 timestamp when the license was issued

### Optional Fields

- **`max_runs_per_day`** (number): Maximum number of executions per day (for rate limiting)

## Examples

### Example 1: Basic License

```json
{
  "customer": "Acme Corporation",
  "environments": ["production"],
  "expires_at": "2026-12-31T23:59:59.000Z",
  "features": ["retention", "erasure"],
  "issued_at": "2025-01-01T00:00:00.000Z"
}
```

### Example 2: Full-Featured License with Rate Limit

```json
{
  "customer": "TechCorp Inc.",
  "environments": ["production", "staging", "development"],
  "expires_at": "2026-06-30T23:59:59.000Z",
  "features": ["retention", "erasure", "masking"],
  "max_runs_per_day": 500,
  "issued_at": "2025-01-01T00:00:00.000Z"
}
```

### Example 3: Trial License (30 days)

```json
{
  "customer": "Startup XYZ",
  "environments": ["staging"],
  "expires_at": "2025-02-01T23:59:59.000Z",
  "features": ["retention"],
  "max_runs_per_day": 10,
  "issued_at": "2025-01-01T00:00:00.000Z"
}
```

## Workflow

### Initial Setup (One-Time)

1. Generate a key pair: `vendor-cli generate-keys`
2. **Securely store the private key** (password manager, HSM, etc.)
3. Update `license/verify.ts` with the public key
4. Build and publish the Docker image with the public key baked in

### For Each Customer

1. Create a license payload JSON file
2. Generate a signed license token using the private key
3. Send the license token to the customer
4. Customer sets `RETENTIX_LICENSE` environment variable

## Testing

Run the test suite:

```bash
pnpm test vendor/generate.test.ts
```

This includes:
- Key pair generation tests
- License signing tests
- Payload validation tests
- Signature verification tests

## Security Best Practices

1. **Never commit private keys** to version control
2. **Rotate keys periodically** (e.g., annually)
3. **Use different keys** for different environments (dev/staging/prod)
4. **Audit license generation** (log who generated what license and when)
5. **Monitor license usage** (track which licenses are active)
6. **Revoke compromised licenses** (maintain a revocation list if needed)

## Troubleshooting

### "Invalid private key size" error

The private key must be exactly 64 bytes. Ensure you're using the full Ed25519 private key (not just the seed).

### "Invalid signature" error

This usually means:
- Wrong private key was used
- Payload was modified after signing
- Public key in `license/verify.ts` doesn't match the private key

### License expires immediately

Check that `expires_at` is in the future and in ISO 8601 format with timezone (e.g., `.000Z` for UTC).

## Related Documentation

- [License Verification](../license/README.md) - How licenses are verified in the application
- [Product Documentation](../docs/product/Retentix.md) - Customer-facing documentation
- [Developer README](../README.md) - Development setup and testing

