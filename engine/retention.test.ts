import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Policy } from '../policy/types.ts';
import type { ExecutionContext } from './context.ts';
import { runRetention } from './retention.ts';

vi.mock('./postgres/retention.ts', () => ({
  executeRetentionPostgres: vi.fn(),
}));

import { executeRetentionPostgres } from './postgres/retention.ts';

describe('runRetention', () => {
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

  it('should execute retention for postgres source', async () => {
    const rule = {
      entity: 'users',
      retainFor: { amount: 7, unit: 'year' as const },
      action: { kind: 'delete' as const },
    };

    await runRetention(mockContext, rule);

    expect(executeRetentionPostgres).toHaveBeenCalledWith(
      mockContext,
      mockPolicy.entities.users,
      rule
    );
  });

  it('should throw error for non-postgres source', async () => {
    const policyWithMysql: Policy = {
      ...mockPolicy,
      sources: {
        mysql_db: {
          kind: 'mysql' as unknown as 'postgres',
          connectionEnv: 'MYSQL_URL',
        },
      },
      entities: {
        users: {
          source: 'mysql_db',
          table: 'users',
          primaryKey: 'id',
          createdAt: 'created_at',
        },
      },
    };

    const contextWithMysql = {
      ...mockContext,
      policy: policyWithMysql,
    };

    const rule = {
      entity: 'users',
      retainFor: { amount: 7, unit: 'year' as const },
      action: { kind: 'delete' as const },
    };

    await expect(runRetention(contextWithMysql, rule)).rejects.toThrow('Only Postgres supported');
  });

  it('should handle different retention actions', async () => {
    const deleteRule = {
      entity: 'users',
      retainFor: { amount: 7, unit: 'year' as const },
      action: { kind: 'delete' as const },
    };

    await runRetention(mockContext, deleteRule);

    expect(executeRetentionPostgres).toHaveBeenCalledWith(
      mockContext,
      mockPolicy.entities.users,
      deleteRule
    );

    vi.clearAllMocks();

    const anonymizeRule = {
      entity: 'logs',
      retainFor: { amount: 90, unit: 'day' as const },
      action: {
        kind: 'anonymize' as const,
        fields: ['user_id', 'ip_address'],
      },
    };

    await runRetention(mockContext, anonymizeRule);

    expect(executeRetentionPostgres).toHaveBeenCalledWith(
      mockContext,
      mockPolicy.entities.logs,
      anonymizeRule
    );
  });

  it('should handle none action', async () => {
    const noneRule = {
      entity: 'users',
      retainFor: { amount: 1, unit: 'day' as const },
      action: { kind: 'none' as const },
    };

    await runRetention(mockContext, noneRule);

    expect(executeRetentionPostgres).toHaveBeenCalledWith(
      mockContext,
      mockPolicy.entities.users,
      noneRule
    );
  });
});
