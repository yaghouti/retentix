import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Policy } from '../policy/types.ts';
import type { ExecutionContext } from './context.ts';
import { runEngine } from './index.ts';

vi.mock('./retention.ts', () => ({
  runRetention: vi.fn(),
}));

import { runRetention } from './retention.ts';

describe('runEngine', () => {
  const mockPolicy: Policy = {
    version: 1,
    metadata: {
      name: 'Test Policy',
      owner: 'test@example.com',
      effectiveFrom: new Date('2024-01-01'),
      timezone: 'UTC',
    },
    sources: {
      test_db: {
        kind: 'postgres',
        connectionEnv: 'DATABASE_URL',
      },
    },
    entities: {
      users: {
        source: 'test_db',
        table: 'users',
        primaryKey: 'id',
        createdAt: 'created_at',
      },
      logs: {
        source: 'test_db',
        table: 'logs',
        primaryKey: 'id',
        createdAt: 'timestamp',
      },
    },
  };

  const mockContext: ExecutionContext = {
    policy: mockPolicy,
    db: {} as unknown as ExecutionContext['db'],
    now: new Date('2024-12-24'),
    dryRun: false,
    audit: { record: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run all retention rules', async () => {
    const contextWithRetention: ExecutionContext = {
      ...mockContext,
      policy: {
        ...mockPolicy,
        retention: [
          {
            entity: 'users',
            retainFor: { amount: 7, unit: 'year' },
            action: { kind: 'delete' },
          },
          {
            entity: 'logs',
            retainFor: { amount: 90, unit: 'day' },
            action: { kind: 'anonymize', fields: ['user_id'] },
          },
        ],
      },
    };

    await runEngine(contextWithRetention);

    expect(runRetention).toHaveBeenCalledTimes(2);
    expect(runRetention).toHaveBeenNthCalledWith(
      1,
      contextWithRetention,
      contextWithRetention.policy.retention?.[0]
    );
    expect(runRetention).toHaveBeenNthCalledWith(
      2,
      contextWithRetention,
      contextWithRetention.policy.retention?.[1]
    );
  });

  it('should handle policy without retention rules', async () => {
    const contextWithoutRetention: ExecutionContext = {
      ...mockContext,
      policy: {
        ...mockPolicy,
        retention: undefined,
      },
    };

    await runEngine(contextWithoutRetention);

    expect(runRetention).not.toHaveBeenCalled();
  });

  it('should handle empty retention rules array', async () => {
    const contextWithEmptyRetention: ExecutionContext = {
      ...mockContext,
      policy: {
        ...mockPolicy,
        retention: [],
      },
    };

    await runEngine(contextWithEmptyRetention);

    expect(runRetention).not.toHaveBeenCalled();
  });

  it('should run rules sequentially', async () => {
    const executionOrder: number[] = [];

    vi.mocked(runRetention).mockImplementation(async () => {
      executionOrder.push(executionOrder.length + 1);
    });

    const contextWithRetention: ExecutionContext = {
      ...mockContext,
      policy: {
        ...mockPolicy,
        retention: [
          {
            entity: 'users',
            retainFor: { amount: 7, unit: 'year' },
            action: { kind: 'delete' },
          },
          {
            entity: 'logs',
            retainFor: { amount: 90, unit: 'day' },
            action: { kind: 'delete' },
          },
          {
            entity: 'users',
            retainFor: { amount: 1, unit: 'month' },
            action: { kind: 'none' },
          },
        ],
      },
    };

    await runEngine(contextWithRetention);

    expect(executionOrder).toEqual([1, 2, 3]);
    expect(runRetention).toHaveBeenCalledTimes(3);
  });

  it('should propagate errors from retention execution', async () => {
    vi.mocked(runRetention).mockRejectedValueOnce(new Error('Retention failed'));

    const contextWithRetention: ExecutionContext = {
      ...mockContext,
      policy: {
        ...mockPolicy,
        retention: [
          {
            entity: 'users',
            retainFor: { amount: 7, unit: 'year' },
            action: { kind: 'delete' },
          },
        ],
      },
    };

    await expect(runEngine(contextWithRetention)).rejects.toThrow('Retention failed');
  });

  it('should work in dry-run mode', async () => {
    const dryRunContext: ExecutionContext = {
      ...mockContext,
      dryRun: true,
      policy: {
        ...mockPolicy,
        retention: [
          {
            entity: 'users',
            retainFor: { amount: 7, unit: 'year' },
            action: { kind: 'delete' },
          },
        ],
      },
    };

    await runEngine(dryRunContext);

    expect(runRetention).toHaveBeenCalledWith(dryRunContext, dryRunContext.policy.retention?.[0]);
  });
});
