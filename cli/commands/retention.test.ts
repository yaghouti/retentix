import { beforeEach, describe, expect, it, vi } from 'vitest';
import { retentionCmd } from './retention.ts';

vi.mock('../config.ts', () => ({
  buildContext: vi.fn(),
}));

vi.mock('../../engine/retention.ts', () => ({
  runRetention: vi.fn(),
}));

import { runRetention } from '../../engine/retention.ts';
import { buildContext } from '../config.ts';

describe('retentionCmd', () => {
  const mockContext = {
    policy: {
      version: 1,
      metadata: {
        name: 'Test',
        owner: 'test@example.com',
        effectiveFrom: new Date('2024-01-01'),
        timezone: 'UTC',
      },
      sources: {},
      entities: {},
      retention: [
        {
          entity: 'users',
          retainFor: { years: 7 },
          action: { kind: 'delete' as const },
        },
        {
          entity: 'logs',
          retainFor: { months: 6 },
          action: { kind: 'anonymize' as const, fields: ['email'] },
        },
      ],
    },
    db: {} as never,
    audit: { record: vi.fn() },
    now: new Date(),
    dryRun: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should run all retention rules', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runRetention).mockResolvedValue(undefined);

    await retentionCmd('run', ['test-policy.yaml']);

    expect(buildContext).toHaveBeenCalledWith('test-policy.yaml', ['test-policy.yaml']);
    expect(runRetention).toHaveBeenCalledTimes(2);
    expect(runRetention).toHaveBeenNthCalledWith(1, mockContext, mockContext.policy.retention?.[0]);
    expect(runRetention).toHaveBeenNthCalledWith(2, mockContext, mockContext.policy.retention?.[1]);
    expect(console.log).toHaveBeenCalledWith('✓ Retention completed');
  });

  it('should throw error for invalid subcommand', async () => {
    await expect(retentionCmd('invalid', ['test-policy.yaml'])).rejects.toThrow(
      'Expected: retention run'
    );
  });

  it('should throw error when policy file is not provided', async () => {
    await expect(retentionCmd('run', [])).rejects.toThrow('Policy file required');
  });

  it('should handle policy without retention rules', async () => {
    const contextWithoutRetention = {
      ...mockContext,
      policy: {
        ...mockContext.policy,
        retention: undefined,
      },
    };

    vi.mocked(buildContext).mockResolvedValue(contextWithoutRetention as never);

    await retentionCmd('run', ['test-policy.yaml']);

    expect(runRetention).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('No retention rules defined');
  });

  it('should handle empty retention rules array', async () => {
    const contextWithEmptyRetention = {
      ...mockContext,
      policy: {
        ...mockContext.policy,
        retention: [],
      },
    };

    vi.mocked(buildContext).mockResolvedValue(contextWithEmptyRetention as never);

    await retentionCmd('run', ['test-policy.yaml']);

    expect(runRetention).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('No retention rules defined');
  });

  it('should propagate errors from runRetention', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runRetention).mockRejectedValue(new Error('Database error'));

    await expect(retentionCmd('run', ['test-policy.yaml'])).rejects.toThrow('Database error');
  });
});
