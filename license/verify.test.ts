import nacl from 'tweetnacl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAndVerifyLicense, loadPublicKey } from './verify.ts';

vi.mock('tweetnacl');

describe('loadPublicKey', () => {
  const originalEnv = process.env.RETENTIX_PUBLIC_KEY;

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.RETENTIX_PUBLIC_KEY = originalEnv;
    } else {
      delete process.env.RETENTIX_PUBLIC_KEY;
    }
  });

  it('should load valid 32-byte public key', () => {
    const validKey = Buffer.alloc(32, 0xff).toString('base64');
    process.env.RETENTIX_PUBLIC_KEY = validKey;

    const result = loadPublicKey();

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(32);
  });

  it('should use default key when env var not set', () => {
    delete process.env.RETENTIX_PUBLIC_KEY;

    const result = loadPublicKey();

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(32);
  });

  it('should throw error for public key shorter than 32 bytes', () => {
    const shortKey = Buffer.alloc(16, 0).toString('base64');
    process.env.RETENTIX_PUBLIC_KEY = shortKey;

    expect(() => loadPublicKey()).toThrow(
      'Invalid public key size: expected 32 bytes, got 16 bytes'
    );
  });

  it('should throw error for public key longer than 32 bytes', () => {
    const longKey = Buffer.alloc(64, 0).toString('base64');
    process.env.RETENTIX_PUBLIC_KEY = longKey;

    expect(() => loadPublicKey()).toThrow(
      'Invalid public key size: expected 32 bytes, got 64 bytes'
    );
  });

  it('should throw error for 1-byte public key', () => {
    const tinyKey = Buffer.alloc(1, 0).toString('base64');
    process.env.RETENTIX_PUBLIC_KEY = tinyKey;

    expect(() => loadPublicKey()).toThrow(
      'Invalid public key size: expected 32 bytes, got 1 bytes'
    );
  });

  it('should use default key when env var is empty string', () => {
    // Empty string is falsy, so it uses the default
    process.env.RETENTIX_PUBLIC_KEY = '';

    const result = loadPublicKey();

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(32);
  });

  it('should throw error for 31-byte public key (off by one)', () => {
    const almostKey = Buffer.alloc(31, 0).toString('base64');
    process.env.RETENTIX_PUBLIC_KEY = almostKey;

    expect(() => loadPublicKey()).toThrow(
      'Invalid public key size: expected 32 bytes, got 31 bytes'
    );
  });

  it('should throw error for 33-byte public key (off by one)', () => {
    const tooMuchKey = Buffer.alloc(33, 0).toString('base64');
    process.env.RETENTIX_PUBLIC_KEY = tooMuchKey;

    expect(() => loadPublicKey()).toThrow(
      'Invalid public key size: expected 32 bytes, got 33 bytes'
    );
  });

  it('should handle different 32-byte key values', () => {
    const testKeys = [
      Buffer.alloc(32, 0), // All zeros
      Buffer.alloc(32, 0xff), // All ones
      Buffer.from('a'.repeat(32)), // ASCII characters
    ];

    for (const key of testKeys) {
      process.env.RETENTIX_PUBLIC_KEY = key.toString('base64');
      const result = loadPublicKey();
      expect(result.length).toBe(32);
      expect(result.equals(key)).toBe(true);
    }
  });
});

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

  it('should throw error for token with too many parts', () => {
    expect(() => loadAndVerifyLicense('part1.part2.part3')).toThrow('Invalid license format');
  });

  it('should throw error for empty token', () => {
    expect(() => loadAndVerifyLicense('')).toThrow('Invalid license format');
  });

  it('should throw error for token with only one part', () => {
    expect(() => loadAndVerifyLicense('onlyonepart')).toThrow('Invalid license format');
  });

  it('should throw error for token with empty payload', () => {
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `.${signatureB64}`;

    expect(() => loadAndVerifyLicense(token)).toThrow();
  });

  it('should throw error for token with empty signature', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      features: ['retention'],
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const token = `${payloadB64}.`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(false);

    expect(() => loadAndVerifyLicense(token)).toThrow('Invalid license signature');
  });

  it('should throw error for malformed JSON in payload', () => {
    const malformedPayload = '{invalid json}';
    const payloadB64 = Buffer.from(malformedPayload).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    expect(() => loadAndVerifyLicense(token)).toThrow();
  });

  it('should handle license expiring in the past (edge case)', () => {
    // Use a time 1 second in the past to ensure it's definitely expired
    const pastTime = new Date(Date.now() - 1000);
    const payload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: pastTime.toISOString(),
      features: ['retention'],
      issued_at: new Date(pastTime.getTime() - 86400000).toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    expect(() => loadAndVerifyLicense(token)).toThrow('License expired');
  });

  it('should handle license with multiple environments', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production', 'staging', 'development'],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      features: ['retention', 'erasure', 'masking'],
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    const result = loadAndVerifyLicense(token);

    expect(result.environments).toEqual(['production', 'staging', 'development']);
  });

  it('should handle license with single feature', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      features: ['retention'],
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    const result = loadAndVerifyLicense(token);

    expect(result.features).toEqual(['retention']);
  });

  it('should verify signature is called with correct parameters', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      features: ['retention'],
      issued_at: new Date().toISOString(),
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    loadAndVerifyLicense(token);

    expect(nacl.sign.detached.verify).toHaveBeenCalledTimes(1);
    expect(nacl.sign.detached.verify).toHaveBeenCalledWith(
      Buffer.from(payloadJson),
      Buffer.from(signatureB64, 'base64'),
      expect.any(Buffer)
    );
  });

  it('should handle license with far future expiration', () => {
    const payload = {
      customer: 'Test Corp',
      environments: ['production'],
      expires_at: '2099-12-31T23:59:59.000Z',
      features: ['retention', 'erasure', 'masking'],
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    const result = loadAndVerifyLicense(token);

    expect(result.expires_at).toBe('2099-12-31T23:59:59.000Z');
  });

  it('should handle license with special characters in customer name', () => {
    const payload = {
      customer: 'Test Corp™ & Co. (Pty) Ltd.',
      environments: ['production'],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      features: ['retention'],
      issued_at: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signatureB64 = 'c2lnbmF0dXJl';
    const token = `${payloadB64}.${signatureB64}`;

    vi.mocked(nacl.sign.detached.verify).mockReturnValue(true);

    const result = loadAndVerifyLicense(token);

    expect(result.customer).toBe('Test Corp™ & Co. (Pty) Ltd.');
  });
});
