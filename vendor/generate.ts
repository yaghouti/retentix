import nacl from 'tweetnacl';
import type { LicensePayload } from '../license/types.ts';

/**
 * Generate a license token from a payload and private key.
 * This is a vendor-only function used to create signed licenses.
 *
 * @param payload - The license payload to sign
 * @param privateKey - The Ed25519 private key (64 bytes)
 * @returns The compact license token: base64(payload).base64(signature)
 */
export function generateLicense(payload: LicensePayload, privateKey: Buffer): string {
  if (privateKey.length !== 64) {
    throw new Error(`Invalid private key size: expected 64 bytes, got ${privateKey.length} bytes`);
  }

  // Serialize payload to JSON
  const payloadJson = JSON.stringify(payload);
  const payloadBuffer = Buffer.from(payloadJson);

  // Sign the payload
  const signature = nacl.sign.detached(payloadBuffer, privateKey);

  // Encode to base64
  const payloadB64 = payloadBuffer.toString('base64');
  const signatureB64 = Buffer.from(signature).toString('base64');

  // Return compact token format
  return `${payloadB64}.${signatureB64}`;
}

/**
 * Generate a new Ed25519 key pair for license signing.
 * This should be done once and the keys stored securely.
 *
 * @returns Object containing publicKey (32 bytes) and privateKey (64 bytes)
 */
export function generateKeyPair(): { publicKey: Buffer; privateKey: Buffer } {
  const keyPair = nacl.sign.keyPair();

  return {
    publicKey: Buffer.from(keyPair.publicKey),
    privateKey: Buffer.from(keyPair.secretKey),
  };
}

/**
 * Validate a license payload before signing.
 * Ensures all required fields are present and valid.
 *
 * @param payload - The license payload to validate
 * @throws Error if validation fails
 */
export function validatePayload(payload: LicensePayload): void {
  if (!payload.customer || typeof payload.customer !== 'string') {
    throw new Error('Invalid customer: must be a non-empty string');
  }

  if (!Array.isArray(payload.environments) || payload.environments.length === 0) {
    throw new Error('Invalid environments: must be a non-empty array');
  }

  if (!Array.isArray(payload.features) || payload.features.length === 0) {
    throw new Error('Invalid features: must be a non-empty array');
  }

  const validFeatures = ['retention', 'erasure', 'masking'];
  for (const feature of payload.features) {
    if (!validFeatures.includes(feature)) {
      throw new Error(`Invalid feature: ${feature}. Must be one of: ${validFeatures.join(', ')}`);
    }
  }

  // Validate dates
  const issuedAt = new Date(payload.issued_at);
  const expiresAt = new Date(payload.expires_at);

  if (Number.isNaN(issuedAt.getTime())) {
    throw new Error('Invalid issued_at: must be a valid ISO 8601 date');
  }

  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error('Invalid expires_at: must be a valid ISO 8601 date');
  }

  if (expiresAt <= issuedAt) {
    throw new Error('Invalid dates: expires_at must be after issued_at');
  }

  // Validate optional fields
  if (payload.max_runs_per_day !== undefined) {
    if (typeof payload.max_runs_per_day !== 'number' || payload.max_runs_per_day <= 0) {
      throw new Error('Invalid max_runs_per_day: must be a positive number');
    }
  }
}
