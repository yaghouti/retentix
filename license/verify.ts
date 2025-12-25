import nacl from 'tweetnacl';
import type { LicensePayload } from './types.ts';

/**
 * Load and validate the public key from environment variable.
 * For development/testing, defaults to 32 bytes of zeros if not set.
 * @internal Exported for testing purposes
 */
export function loadPublicKey(): Buffer {
  const publicKeyB64 =
    process.env.RETENTIX_PUBLIC_KEY || 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const publicKey = Buffer.from(publicKeyB64, 'base64');

  if (publicKey.length !== 32) {
    throw new Error(`Invalid public key size: expected 32 bytes, got ${publicKey.length} bytes`);
  }

  return publicKey;
}

const PUBLIC_KEY = loadPublicKey();

/**
 * Load and verify license from a compact token format: base64(payload).base64(signature)
 * This is more compact than JSON and easier to pass as environment variable.
 *
 * Example: eyJjdXN0b21lciI6IlRlc3QifQ==.aGFzaGVkX3NpZ25hdHVyZV9oZXJl
 */
export function loadAndVerifyLicense(licenseToken: string): LicensePayload {
  const parts = licenseToken.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid license format. Expected: base64(payload).base64(signature)');
  }

  const [payloadB64, signatureB64] = parts;

  // Decode payload
  const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
  const payload = JSON.parse(payloadJson);

  // Verify signature
  const ok = nacl.sign.detached.verify(
    Buffer.from(payloadJson),
    Buffer.from(signatureB64, 'base64'),
    PUBLIC_KEY
  );

  if (!ok) {
    throw new Error('Invalid license signature');
  }

  validatePayload(payload);
  return payload;
}

function validatePayload(p: LicensePayload) {
  if (new Date(p.expires_at) < new Date()) {
    throw new Error('License expired');
  }
}
