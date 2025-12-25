import nacl from 'tweetnacl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAndVerifyLicense } from './verify.ts';

vi.mock('tweetnacl');

describe('loadAndVerifyLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load and verify a valid license', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      features: ['retention', 'erasure'],
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl'; // "signature" in base64
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    const result = loadAndVerifyLicense(token);

    expect(result).toEqual(payload);
  });

  it('should throw error for invalid signature', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      features: ['retention'],
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'aW52YWxpZA=='; // "invalid" in base64
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(false);

    expect(() => loadAndVerifyLicense(token)).toThrow('Invalid license signature');
  });

  it('should throw error for expired license', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      features: ['retention'],
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    expect(() => loadAndVerifyLicense(token)).toThrow('License expired');
  });

  it('should throw error for invalid token format', () => {
    expect(() => loadAndVerifyLicense('invalid-token-no-dot')).toThrow('Invalid license format');
  });

  it('should throw error for token with invalid base64', () => {
    expect(() => loadAndVerifyLicense('not-base64.also-not-base64')).toThrow();
  });

  it('should handle license with max_runs_per_day', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production', 'staging'],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      features: ['retention', 'erasure', 'masking'],
      max_runs_per_day: 100,
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    const result = loadAndVerifyLicense(token);

    expect(result).toEqual(payload);
    expect(result.max_runs_per_day).toBe(100);
  });
});
