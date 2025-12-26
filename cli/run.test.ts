import { existsSync, readFileSync, rmSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunLimitResult } from '../license/run-limit.ts';
import type { LicensePayload } from '../license/types.ts';
import { run } from './run.ts';

vi.mock('./commands/validate.ts', () => ({
  validateCmd: vi.fn(),
}));

vi.mock('./commands/retention.ts', () => ({
  retentionCmd: vi.fn(),
}));

vi.mock('./commands/erasure.ts', () => ({
  erasureCmd: vi.fn(),
}));

vi.mock('./commands/masking.ts', () => ({
  maskingCmd: vi.fn(),
}));

import { erasureCmd } from './commands/erasure.ts';
import { maskingCmd } from './commands/masking.ts';
import { retentionCmd } from './commands/retention.ts';
import { validateCmd } from './commands/validate.ts';

describe('run', () => {
  const mockLicense: LicensePayload = {
    customer: 'Test Corp',
    environments: ['production'],
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    features: ['retention', 'erasure', 'masking'],
    issued_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route to validate command', async () => {
    vi.mocked(validateCmd).mockResolvedValue(undefined);

    await run(['validate', 'policy.yaml'], mockLicense);

    expect(validateCmd).toHaveBeenCalledWith(['policy.yaml']);
  });

  it('should route to retention command', async () => {
    vi.mocked(retentionCmd).mockResolvedValue(undefined);

    await run(['retention', 'run', 'policy.yaml'], mockLicense);

    expect(retentionCmd).toHaveBeenCalledWith('run', ['policy.yaml']);
  });

  it('should route to erasure command', async () => {
    vi.mocked(erasureCmd).mockResolvedValue(undefined);

    await run(['erasure', 'run', 'policy.yaml', '--input-id=123'], mockLicense);

    expect(erasureCmd).toHaveBeenCalledWith('run', ['policy.yaml', '--input-id=123']);
  });

  it('should route to masking command', async () => {
    vi.mocked(maskingCmd).mockResolvedValue(undefined);

    await run(['masking', 'run', 'policy.yaml'], mockLicense);

    expect(maskingCmd).toHaveBeenCalledWith('run', ['policy.yaml']);
  });

  it('should throw error for unknown command', async () => {
    await expect(run(['unknown', 'arg'], mockLicense)).rejects.toThrow('Unknown command');
  });

  it('should show help for empty args', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await run([], mockLicense);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Retentix'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('should pass all remaining args to command', async () => {
    vi.mocked(retentionCmd).mockResolvedValue(undefined);

    await run(['retention', 'run', 'policy.yaml', '--no-dry-run', '--extra-flag'], mockLicense);

    expect(retentionCmd).toHaveBeenCalledWith('run', [
      'policy.yaml',
      '--no-dry-run',
      '--extra-flag',
    ]);
  });

  it('should throw error when feature is not in license', async () => {
    const limitedLicense: LicensePayload = {
      ...mockLicense,
      features: ['retention'],
    };

    await expect(run(['erasure', 'run', 'policy.yaml'], limitedLicense)).rejects.toThrow(
      "Feature 'erasure' is not enabled in your license"
    );
  });

  it('should allow retention when feature is in license', async () => {
    vi.mocked(retentionCmd).mockResolvedValue(undefined);
    const retentionOnlyLicense: LicensePayload = {
      ...mockLicense,
      features: ['retention'],
    };

    await run(['retention', 'run', 'policy.yaml'], retentionOnlyLicense);

    expect(retentionCmd).toHaveBeenCalledWith('run', ['policy.yaml']);
  });

  describe('run limit audit logging', () => {
    const testAuditFile = 'test-audit.jsonl';

    beforeEach(() => {
      if (existsSync(testAuditFile)) {
        rmSync(testAuditFile);
      }
      process.env.AUDIT_PATH = testAuditFile;
    });

    it('should log to audit when run limit is exceeded', async () => {
      vi.mocked(retentionCmd).mockResolvedValue(undefined);

      const limitResult: RunLimitResult = {
        allowed: true,
        currentCount: 5,
        limit: 3,
        exceeded: true,
        message: 'Limit exceeded',
      };

      await run(['retention', 'run', 'policy.yaml'], mockLicense, limitResult);

      expect(existsSync(testAuditFile)).toBe(true);

      const auditContent = readFileSync(testAuditFile, 'utf8');
      const auditEntry = JSON.parse(auditContent);

      expect(auditEntry.type).toBe('run_limit');
      expect(auditEntry.customer).toBe('Test Corp');
      expect(auditEntry.currentCount).toBe(5);
      expect(auditEntry.limit).toBe(3);
      expect(auditEntry.exceeded).toBe(true);
      expect(auditEntry.timestamp).toBeDefined();
    });

    it('should not log to audit when limit is not exceeded', async () => {
      vi.mocked(retentionCmd).mockResolvedValue(undefined);

      const limitResult: RunLimitResult = {
        allowed: true,
        currentCount: 2,
        limit: 5,
        exceeded: false,
        message: 'Within limit',
      };

      await run(['retention', 'run', 'policy.yaml'], mockLicense, limitResult);

      expect(existsSync(testAuditFile)).toBe(false);
    });

    it('should not log to audit when limit is null (no limit)', async () => {
      vi.mocked(retentionCmd).mockResolvedValue(undefined);

      const limitResult: RunLimitResult = {
        allowed: true,
        currentCount: 100,
        limit: null,
        exceeded: false,
        message: 'No limit',
      };

      await run(['retention', 'run', 'policy.yaml'], mockLicense, limitResult);

      expect(existsSync(testAuditFile)).toBe(false);
    });

    it('should not log to audit for validate command even if limit exceeded', async () => {
      vi.mocked(validateCmd).mockResolvedValue(undefined);

      const limitResult: RunLimitResult = {
        allowed: true,
        currentCount: 5,
        limit: 3,
        exceeded: true,
        message: 'Limit exceeded',
      };

      await run(['validate', 'policy.yaml'], mockLicense, limitResult);

      // Validate command returns early, so no audit logging
      expect(existsSync(testAuditFile)).toBe(false);
    });
  });
});
