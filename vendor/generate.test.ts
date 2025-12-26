import nacl from 'tweetnacl';
import { describe, expect, it } from 'vitest';
import type { LicensePayload } from '../license/types.ts';
import { generateKeyPair, generateLicense, validatePayload } from './generate.ts';

describe('generateKeyPair', () => {
  it('should generate a valid Ed25519 key pair', () => {
    const { publicKey, privateKey } = generateKeyPair();

    expect(publicKey).toBeInstanceOf(Buffer);
    expect(privateKey).toBeInstanceOf(Buffer);
    expect(publicKey.length).toBe(32);
    expect(privateKey.length).toBe(64);
  });

  it('should generate different key pairs on each call', () => {
    const pair1 = generateKeyPair();
    const pair2 = generateKeyPair();

    expect(pair1.publicKey.equals(pair2.publicKey)).toBe(false);
    expect(pair1.privateKey.equals(pair2.privateKey)).toBe(false);
  });
});

describe('generateLicense', () => {
  it('should generate a valid license token', () => {
    const payload: LicensePayload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: '2025-12-31T23:59:59.000Z',
      features: ['retention', 'erasure', 'masking'],
      issued_at: '2025-01-01T00:00:00.000Z',
    };

    const { privateKey } = generateKeyPair();
    const token = generateLicense(payload, privateKey);

    // Should be in format: base64.base64
    expect(token).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

    const [payloadB64, signatureB64] = token.split('.');
    expect(payloadB64).toBeTruthy();
    expect(signatureB64).toBeTruthy();

    // Verify payload decodes correctly
    const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    expect(decodedPayload.customer).toBe('Test Corp');
  });

  it('should generate valid signature that can be verified', () => {
    const payload: LicensePayload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: '2025-12-31T23:59:59.000Z',
      features: ['retention'],
      issued_at: '2025-01-01T00:00:00.000Z',
    };

    const { publicKey, privateKey } = generateKeyPair();
    const token = generateLicense(payload, privateKey);

    const [payloadB64, signatureB64] = token.split('.');
    const payloadBuffer = Buffer.from(payloadB64, 'base64');
    const signature = Buffer.from(signatureB64, 'base64');

    // Verify signature
    const isValid = nacl.sign.detached.verify(payloadBuffer, signature, publicKey);
    expect(isValid).toBe(true);
  });

  it('should throw error for invalid private key size', () => {
    const payload: LicensePayload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: '2025-12-31T23:59:59.000Z',
      features: ['retention'],
      issued_at: '2025-01-01T00:00:00.000Z',
    };

    const invalidKey = Buffer.alloc(32); // Should be 64 bytes

    expect(() => generateLicense(payload, invalidKey)).toThrow(
      'Invalid private key size: expected 64 bytes, got 32 bytes'
    );
  });

  it('should handle payload with optional fields', () => {
    const payload: LicensePayload = {
      customer: 'Test Corp',
      environments: ['production', 'staging'],
      expires_at: '2025-12-31T23:59:59.000Z',
      features: ['retention', 'erasure', 'masking'],
      max_runs_per_day: 1000,
      issued_at: '2025-01-01T00:00:00.000Z',
    };

    const { privateKey } = generateKeyPair();
    const token = generateLicense(payload, privateKey);

    const [payloadB64] = token.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    expect(decodedPayload.max_runs_per_day).toBe(1000);
  });
});

describe('validatePayload', () => {
  const validPayload: LicensePayload = {
    customer: 'Test Corp',
    environments: ['production'],
    expires_at: '2025-12-31T23:59:59.000Z',
    features: ['retention'],
    issued_at: '2025-01-01T00:00:00.000Z',
  };

  it('should accept valid payload', () => {
    expect(() => validatePayload(validPayload)).not.toThrow();
  });

  it('should throw error for missing customer', () => {
    const payload = { ...validPayload, customer: '' };
    expect(() => validatePayload(payload)).toThrow('Invalid customer: must be a non-empty string');
  });

  it('should throw error for invalid customer type', () => {
    const payload = { ...validPayload, customer: 123 as unknown as string };
    expect(() => validatePayload(payload)).toThrow('Invalid customer: must be a non-empty string');
  });

  it('should throw error for empty environments', () => {
    const payload = { ...validPayload, environments: [] };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid environments: must be a non-empty array'
    );
  });

  it('should throw error for non-array environments', () => {
    const payload = { ...validPayload, environments: 'production' as unknown as string[] };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid environments: must be a non-empty array'
    );
  });

  it('should throw error for empty features', () => {
    const payload = { ...validPayload, features: [] as ('retention' | 'erasure' | 'masking')[] };
    expect(() => validatePayload(payload)).toThrow('Invalid features: must be a non-empty array');
  });

  it('should throw error for invalid feature', () => {
    const payload = {
      ...validPayload,
      features: ['retention', 'invalid'] as ('retention' | 'erasure' | 'masking')[],
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid feature: invalid. Must be one of: retention, erasure, masking'
    );
  });

  it('should throw error for invalid issued_at date', () => {
    const payload = { ...validPayload, issued_at: 'invalid-date' };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid issued_at: must be a valid ISO 8601 date'
    );
  });

  it('should throw error for invalid expires_at date', () => {
    const payload = { ...validPayload, expires_at: 'invalid-date' };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid expires_at: must be a valid ISO 8601 date'
    );
  });

  it('should throw error when expires_at is before issued_at', () => {
    const payload = {
      ...validPayload,
      issued_at: '2025-12-31T23:59:59.000Z',
      expires_at: '2025-01-01T00:00:00.000Z',
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid dates: expires_at must be after issued_at'
    );
  });

  it('should throw error when expires_at equals issued_at', () => {
    const payload = {
      ...validPayload,
      issued_at: '2025-01-01T00:00:00.000Z',
      expires_at: '2025-01-01T00:00:00.000Z',
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid dates: expires_at must be after issued_at'
    );
  });

  it('should accept valid max_runs_per_day', () => {
    const payload = { ...validPayload, max_runs_per_day: 1000 };
    expect(() => validatePayload(payload)).not.toThrow();
  });

  it('should throw error for negative max_runs_per_day', () => {
    const payload = { ...validPayload, max_runs_per_day: -1 };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid max_runs_per_day: must be a positive number'
    );
  });

  it('should throw error for zero max_runs_per_day', () => {
    const payload = { ...validPayload, max_runs_per_day: 0 };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid max_runs_per_day: must be a positive number'
    );
  });

  it('should throw error for non-number max_runs_per_day', () => {
    const payload = { ...validPayload, max_runs_per_day: '1000' as unknown as number };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid max_runs_per_day: must be a positive number'
    );
  });

  it('should accept all valid features', () => {
    const payload = {
      ...validPayload,
      features: ['retention', 'erasure', 'masking'] as ('retention' | 'erasure' | 'masking')[],
    };
    expect(() => validatePayload(payload)).not.toThrow();
  });

  it('should accept multiple environments', () => {
    const payload = { ...validPayload, environments: ['production', 'staging', 'development'] };
    expect(() => validatePayload(payload)).not.toThrow();
  });
});
