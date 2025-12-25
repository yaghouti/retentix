import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Policy } from '../policy/types.ts';
import type { ExecutionContext } from './context.ts';
import { runMasking } from './masking.ts';

vi.mock('./postgres/masking.ts', () => ({
  executeMaskingPostgres: vi.fn(),
}));

import { executeMaskingPostgres } from './postgres/masking.ts';

describe('runMasking', () => {
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
    masking: {
      strategies: {
        null_mask: {
          kind: 'null',
        },
        hash_sha256: {
          kind: 'hash',
          algorithm: 'sha256',
          saltEnv: 'MASKING_SALT',
        },
      },
      rules: [
        {
          entity: 'users',
          fields: {
            email: { strategy: 'null_mask' },
            phone: { strategy: 'null_mask' },
          },
        },
        {
          entity: 'logs',
          fields: {
            ip_address: { strategy: 'hash_sha256' },
          },
        },
      ],
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

  describe('successful masking', () => {
    it('should execute all masking rules', async () => {
      await runMasking(mockContext);

      expect(executeMaskingPostgres).toHaveBeenCalledTimes(2);
      expect(executeMaskingPostgres).toHaveBeenNthCalledWith(
        1,
        mockContext,
        mockPolicy.entities.users,
        mockPolicy.masking?.rules[0],
        mockPolicy.masking?.strategies
      );
      expect(executeMaskingPostgres).toHaveBeenNthCalledWith(
        2,
        mockContext,
        mockPolicy.entities.logs,
        mockPolicy.masking?.rules[1],
        mockPolicy.masking?.strategies
      );
    });

    it('should skip masking if no masking policy defined', async () => {
      const policyWithoutMasking: Policy = {
        ...mockPolicy,
        masking: undefined,
      };

      const contextWithoutMasking = {
        ...mockContext,
        policy: policyWithoutMasking,
      };

      await runMasking(contextWithoutMasking);

      expect(executeMaskingPostgres).not.toHaveBeenCalled();
    });

    it('should handle single masking rule', async () => {
      const policyWithSingleRule: Policy = {
        ...mockPolicy,
        masking: {
          strategies: {
            null_mask: {
              kind: 'null',
            },
          },
          rules: [
            {
              entity: 'users',
              fields: {
                email: { strategy: 'null_mask' },
              },
            },
          ],
        },
      };

      const contextWithSingleRule = {
        ...mockContext,
        policy: policyWithSingleRule,
      };

      await runMasking(contextWithSingleRule);

      expect(executeMaskingPostgres).toHaveBeenCalledTimes(1);
      expect(executeMaskingPostgres).toHaveBeenCalledWith(
        contextWithSingleRule,
        policyWithSingleRule.entities.users,
        policyWithSingleRule.masking?.rules[0],
        policyWithSingleRule.masking?.strategies
      );
    });

    it('should handle multiple fields in a single rule', async () => {
      const policyWithMultipleFields: Policy = {
        ...mockPolicy,
        masking: {
          strategies: {
            null_mask: {
              kind: 'null',
            },
          },
          rules: [
            {
              entity: 'users',
              fields: {
                email: { strategy: 'null_mask' },
                phone: { strategy: 'null_mask' },
                address: { strategy: 'null_mask' },
              },
            },
          ],
        },
      };

      const contextWithMultipleFields = {
        ...mockContext,
        policy: policyWithMultipleFields,
      };

      await runMasking(contextWithMultipleFields);

      expect(executeMaskingPostgres).toHaveBeenCalledWith(
        contextWithMultipleFields,
        policyWithMultipleFields.entities.users,
        policyWithMultipleFields.masking?.rules[0],
        policyWithMultipleFields.masking?.strategies
      );
    });
  });

  describe('error handling', () => {
    it('should throw for non-postgres source', async () => {
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
        masking: {
          strategies: {
            null_mask: {
              kind: 'null',
            },
          },
          rules: [
            {
              entity: 'users',
              fields: {
                email: { strategy: 'null_mask' },
              },
            },
          ],
        },
      };

      const contextWithMysql = {
        ...mockContext,
        policy: policyWithMysql,
      };

      await expect(runMasking(contextWithMysql)).rejects.toThrow(
        'Only Postgres supported for masking'
      );
    });

    it('should propagate errors from executeMaskingPostgres', async () => {
      vi.mocked(executeMaskingPostgres).mockRejectedValueOnce(new Error('Database error'));

      await expect(runMasking(mockContext)).rejects.toThrow('Database error');
    });

    it('should stop on first error', async () => {
      vi.mocked(executeMaskingPostgres).mockRejectedValueOnce(new Error('First rule failed'));

      await expect(runMasking(mockContext)).rejects.toThrow('First rule failed');

      expect(executeMaskingPostgres).toHaveBeenCalledTimes(1);
    });
  });

  describe('dry run mode', () => {
    it('should execute masking in dry run mode', async () => {
      const dryRunContext = {
        ...mockContext,
        dryRun: true,
      };

      await runMasking(dryRunContext);

      expect(executeMaskingPostgres).toHaveBeenCalledTimes(2);
      expect(executeMaskingPostgres).toHaveBeenNthCalledWith(
        1,
        dryRunContext,
        mockPolicy.entities.users,
        mockPolicy.masking?.rules[0],
        mockPolicy.masking?.strategies
      );
    });
  });

  describe('strategy types', () => {
    it('should handle null masking strategy', async () => {
      const policyWithNull: Policy = {
        ...mockPolicy,
        masking: {
          strategies: {
            null_mask: {
              kind: 'null',
            },
          },
          rules: [
            {
              entity: 'users',
              fields: {
                email: { strategy: 'null_mask' },
              },
            },
          ],
        },
      };

      const contextWithNull = {
        ...mockContext,
        policy: policyWithNull,
      };

      await runMasking(contextWithNull);

      expect(executeMaskingPostgres).toHaveBeenCalled();
    });

    it('should handle hash masking strategy', async () => {
      const policyWithHash: Policy = {
        ...mockPolicy,
        masking: {
          strategies: {
            hash_sha256: {
              kind: 'hash',
              algorithm: 'sha256',
              saltEnv: 'MASKING_SALT',
            },
          },
          rules: [
            {
              entity: 'users',
              fields: {
                email: { strategy: 'hash_sha256' },
              },
            },
          ],
        },
      };

      const contextWithHash = {
        ...mockContext,
        policy: policyWithHash,
      };

      await runMasking(contextWithHash);

      expect(executeMaskingPostgres).toHaveBeenCalled();
    });

    it('should handle multiple strategy types', async () => {
      await runMasking(mockContext);

      expect(executeMaskingPostgres).toHaveBeenCalledWith(
        mockContext,
        mockPolicy.entities.users,
        mockPolicy.masking?.rules[0],
        expect.objectContaining({
          null_mask: { kind: 'null' },
          hash_sha256: {
            kind: 'hash',
            algorithm: 'sha256',
            saltEnv: 'MASKING_SALT',
          },
        })
      );
    });
  });
});
