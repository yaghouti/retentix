import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

describe('Public Key Size Validation (Integration)', () => {
  it('should throw error at startup for invalid public key size (too short)', async () => {
    // Create a 16-byte key (too short)
    const shortKey = Buffer.alloc(16, 0).toString('base64');

    const result = await execAsync(
      `RETENTIX_PUBLIC_KEY="${shortKey}" node --experimental-strip-types -e "import('./verify.ts')"`,
      { cwd: __dirname }
    ).catch((error) => error);

    expect(result.stderr).toContain('Invalid public key size');
    expect(result.stderr).toContain('expected 32 bytes, got 16 bytes');
  });

  it('should throw error at startup for invalid public key size (too long)', async () => {
    // Create a 64-byte key (too long)
    const longKey = Buffer.alloc(64, 0).toString('base64');

    const result = await execAsync(
      `RETENTIX_PUBLIC_KEY="${longKey}" node --experimental-strip-types -e "import('./verify.ts')"`,
      { cwd: __dirname }
    ).catch((error) => error);

    expect(result.stderr).toContain('Invalid public key size');
    expect(result.stderr).toContain('expected 32 bytes, got 64 bytes');
  });

  it('should throw error at startup for 1-byte public key', async () => {
    const tinyKey = Buffer.alloc(1, 0).toString('base64');

    const result = await execAsync(
      `RETENTIX_PUBLIC_KEY="${tinyKey}" node --experimental-strip-types -e "import('./verify.ts')"`,
      { cwd: __dirname }
    ).catch((error) => error);

    expect(result.stderr).toContain('Invalid public key size');
    expect(result.stderr).toContain('expected 32 bytes, got 1 bytes');
  });

  it('should throw error at startup for 31-byte public key (off by one)', async () => {
    const almostKey = Buffer.alloc(31, 0).toString('base64');

    const result = await execAsync(
      `RETENTIX_PUBLIC_KEY="${almostKey}" node --experimental-strip-types -e "import('./verify.ts')"`,
      { cwd: __dirname }
    ).catch((error) => error);

    expect(result.stderr).toContain('Invalid public key size');
    expect(result.stderr).toContain('expected 32 bytes, got 31 bytes');
  });

  it('should throw error at startup for 33-byte public key (off by one)', async () => {
    const tooMuchKey = Buffer.alloc(33, 0).toString('base64');

    const result = await execAsync(
      `RETENTIX_PUBLIC_KEY="${tooMuchKey}" node --experimental-strip-types -e "import('./verify.ts')"`,
      { cwd: __dirname }
    ).catch((error) => error);

    expect(result.stderr).toContain('Invalid public key size');
    expect(result.stderr).toContain('expected 32 bytes, got 33 bytes');
  });

  it('should successfully load with valid 32-byte public key', async () => {
    const validKey = Buffer.alloc(32, 0).toString('base64');

    const result = await execAsync(
      `RETENTIX_PUBLIC_KEY="${validKey}" node --experimental-strip-types -e "import('./verify.ts').then(() => console.log('SUCCESS'))"`,
      { cwd: __dirname }
    );

    expect(result.stdout).toContain('SUCCESS');
    expect(result.stderr).toBe('');
  });

  it('should successfully load with default key when env var not set', async () => {
    const result = await execAsync(
      `node --experimental-strip-types -e "import('./verify.ts').then(() => console.log('SUCCESS'))"`,
      { cwd: __dirname }
    );

    expect(result.stdout).toContain('SUCCESS');
    expect(result.stderr).toBe('');
  });
});
