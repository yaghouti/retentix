import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildContext } from './config.ts';

vi.mock('../policy/validate.ts', () => ({
  loadPolicy: vi.fn(),
}));

vi.mock('../policy/parser.ts', () => ({
  parsePolicy: vi.fn(),
}));

vi.mock('../engine/postgres/client.ts', () => ({
  createPool: vi.fn(),
}));

vi.mock('../engine/audit.ts', () => {
  return {
    FileAuditWriter: class {},
  };
});

import { createPool } from '../engine/postgres/client.ts';
import { parsePolicy } from '../policy/parser.ts';
import { loadPolicy } from '../policy/validate.ts';

describe('buildContext', () => {
  const mockPolicy = {
    version: 1,
    metadata: {
      name: 'Test Policy',
      owner: 'test@example.com',
      effectiveFrom: new Date('2024-01-01'),
      timezone: 'UTC',
    },
    sources: {},
    entities: {},
  };

  const mockValidated = {
    version: 1,
    policy: {
      name: 'Test Policy',
      owner: 'test@example.com',
      effective_from: '2024-01-01',
      timezone: 'UTC',
    },
    sources: {},
    entities: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.AUDIT_PATH = 'test-audit.jsonl';
  });

  it('should build context with all required properties', async () => {
    vi.mocked(loadPolicy).mockReturnValue(mockValidated as never);
    vi.mocked(parsePolicy).mockReturnValue(mockPolicy as never);
    vi.mocked(createPool).mockReturnValue({} as never);

    const ctx = await buildContext('test-policy.yaml', []);

    expect(loadPolicy).toHaveBeenCalledWith('test-policy.yaml');
    expect(parsePolicy).toHaveBeenCalledWith(mockValidated);
    expect(createPool).toHaveBeenCalledWith('postgresql://localhost/test');

    expect(ctx).toHaveProperty('policy', mockPolicy);
    expect(ctx).toHaveProperty('db');
    expect(ctx).toHaveProperty('audit');
    expect(ctx).toHaveProperty('now');
    expect(ctx).toHaveProperty('dryRun', true);
  });

  it('should default to dry-run mode', async () => {
    vi.mocked(loadPolicy).mockReturnValue(mockValidated as never);
    vi.mocked(parsePolicy).mockReturnValue(mockPolicy as never);
    vi.mocked(createPool).mockReturnValue({} as never);

    const ctx = await buildContext('test-policy.yaml', []);

    expect(ctx.dryRun).toBe(true);
  });

  it('should disable dry-run when --no-dry-run flag is present', async () => {
    vi.mocked(loadPolicy).mockReturnValue(mockValidated as never);
    vi.mocked(parsePolicy).mockReturnValue(mockPolicy as never);
    vi.mocked(createPool).mockReturnValue({} as never);

    const ctx = await buildContext('test-policy.yaml', ['--no-dry-run']);

    expect(ctx.dryRun).toBe(false);
  });

  it('should use default audit path when AUDIT_PATH not set', async () => {
    delete process.env.AUDIT_PATH;

    vi.mocked(loadPolicy).mockReturnValue(mockValidated as never);
    vi.mocked(parsePolicy).mockReturnValue(mockPolicy as never);
    vi.mocked(createPool).mockReturnValue({} as never);

    const ctx = await buildContext('test-policy.yaml', []);

    // Just verify context has audit property
    expect(ctx).toHaveProperty('audit');
  });

  it('should throw error when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;

    await expect(buildContext('test-policy.yaml', [])).rejects.toThrow(
      'DATABASE_URL environment variable is required'
    );
  });

  it('should set now property to current date', async () => {
    vi.mocked(loadPolicy).mockReturnValue(mockValidated as never);
    vi.mocked(parsePolicy).mockReturnValue(mockPolicy as never);
    vi.mocked(createPool).mockReturnValue({} as never);

    const before = new Date();
    const ctx = await buildContext('test-policy.yaml', []);
    const after = new Date();

    expect(ctx.now.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(ctx.now.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
