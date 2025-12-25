import nacl from 'tweetnacl';
import type { LicensePayload } from './types.ts';

const PUBLIC_KEY = Buffer.from('BASE64_PUBLIC_KEY_HERE', 'base64');

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
