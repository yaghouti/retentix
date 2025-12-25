import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Policy } from '../policy/types.ts';
import type { ExecutionContext } from './context.ts';
import { runErasure } from './erasure.ts';

vi.mock('./postgres/erasure.ts', () => ({
  executeErasurePostgres: vi.fn(),
}));

import { executeErasurePostgres } from './postgres/erasure.ts';

describe('runErasure', () => {
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
    erasure: {
      trigger: {
        kind: 'manual',
        input: {
          user_id: 'uuid',
        },
      },
      cascade: [
        {
          entity: 'users',
          match: { id: '$user_id' },
          action: 'delete',
        },
        {
          entity: 'logs',
          match: { user_id: '$user_id' },
          action: 'anonymize',
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

  describe('successful erasure', () => {
    it('should execute all cascade rules', async () => {
      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      await runErasure(mockContext, input);

      expect(executeErasurePostgres).toHaveBeenCalledTimes(2);
      expect(executeErasurePostgres).toHaveBeenNthCalledWith(
        1,
        mockContext,
        mockPolicy.entities.users,
        mockPolicy.erasure?.cascade[0],
        input
      );
      expect(executeErasurePostgres).toHaveBeenNthCalledWith(
        2,
        mockContext,
        mockPolicy.entities.logs,
        mockPolicy.erasure?.cascade[1],
        input
      );
    });

    it('should work with multiple input parameters', async () => {
      const policyWithMultipleInputs: Policy = {
        ...mockPolicy,
        erasure: {
          trigger: {
            kind: 'manual',
            input: {
              user_id: 'uuid',
              email: 'string',
            },
          },
          cascade: [
            {
              entity: 'users',
              match: { id: '$user_id', email: '$email' },
              action: 'delete',
            },
          ],
        },
      };

      const contextWithMultipleInputs = {
        ...mockContext,
        policy: policyWithMultipleInputs,
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      await runErasure(contextWithMultipleInputs, input);

      expect(executeErasurePostgres).toHaveBeenCalledWith(
        contextWithMultipleInputs,
        policyWithMultipleInputs.entities.users,
        policyWithMultipleInputs.erasure?.cascade[0],
        input
      );
    });
  });

  describe('input validation', () => {
    it('should validate UUID input', async () => {
      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      await runErasure(mockContext, input);

      expect(executeErasurePostgres).toHaveBeenCalled();
    });

    it('should reject invalid UUID', async () => {
      const input = {
        user_id: 'not-a-uuid',
      };

      await expect(runErasure(mockContext, input)).rejects.toThrow('Invalid UUID for user_id');
    });

    it('should reject missing input', async () => {
      const input = {};

      await expect(runErasure(mockContext, input)).rejects.toThrow(
        'Missing erasure input: user_id'
      );
    });

    it('should reject null input', async () => {
      const input = {
        user_id: null,
      };

      await expect(runErasure(mockContext, input)).rejects.toThrow(
        'Missing erasure input: user_id'
      );
    });

    it('should validate string input', async () => {
      const policyWithString: Policy = {
        ...mockPolicy,
        erasure: {
          trigger: {
            kind: 'manual',
            input: {
              email: 'string',
            },
          },
          cascade: [
            {
              entity: 'users',
              match: { email: '$email' },
              action: 'delete',
            },
          ],
        },
      };

      const contextWithString = {
        ...mockContext,
        policy: policyWithString,
      };

      const input = {
        email: 'test@example.com',
      };

      await runErasure(contextWithString, input);

      expect(executeErasurePostgres).toHaveBeenCalled();
    });

    it('should reject invalid string input', async () => {
      const policyWithString: Policy = {
        ...mockPolicy,
        erasure: {
          trigger: {
            kind: 'manual',
            input: {
              email: 'string',
            },
          },
          cascade: [
            {
              entity: 'users',
              match: { email: '$email' },
              action: 'delete',
            },
          ],
        },
      };

      const contextWithString = {
        ...mockContext,
        policy: policyWithString,
      };

      const input = {
        email: 123,
      };

      await expect(runErasure(contextWithString, input)).rejects.toThrow(
        'Invalid string for email'
      );
    });

    it('should validate number input', async () => {
      const policyWithNumber: Policy = {
        ...mockPolicy,
        erasure: {
          trigger: {
            kind: 'manual',
            input: {
              user_id: 'number',
            },
          },
          cascade: [
            {
              entity: 'users',
              match: { id: '$user_id' },
              action: 'delete',
            },
          ],
        },
      };

      const contextWithNumber = {
        ...mockContext,
        policy: policyWithNumber,
      };

      const input = {
        user_id: 12345,
      };

      await runErasure(contextWithNumber, input);

      expect(executeErasurePostgres).toHaveBeenCalled();
    });

    it('should reject invalid number input', async () => {
      const policyWithNumber: Policy = {
        ...mockPolicy,
        erasure: {
          trigger: {
            kind: 'manual',
            input: {
              user_id: 'number',
            },
          },
          cascade: [
            {
              entity: 'users',
              match: { id: '$user_id' },
              action: 'delete',
            },
          ],
        },
      };

      const contextWithNumber = {
        ...mockContext,
        policy: policyWithNumber,
      };

      const input = {
        user_id: 'not-a-number',
      };

      await expect(runErasure(contextWithNumber, input)).rejects.toThrow(
        'Invalid number for user_id'
      );
    });
  });

  describe('error handling', () => {
    it('should throw if no erasure policy defined', async () => {
      const policyWithoutErasure: Policy = {
        ...mockPolicy,
        erasure: undefined,
      };

      const contextWithoutErasure = {
        ...mockContext,
        policy: policyWithoutErasure,
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      await expect(runErasure(contextWithoutErasure, input)).rejects.toThrow(
        'No erasure policy defined'
      );
    });

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
        erasure: {
          trigger: {
            kind: 'manual',
            input: {
              user_id: 'uuid',
            },
          },
          cascade: [
            {
              entity: 'users',
              match: { id: '$user_id' },
              action: 'delete',
            },
          ],
        },
      };

      const contextWithMysql = {
        ...mockContext,
        policy: policyWithMysql,
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      await expect(runErasure(contextWithMysql, input)).rejects.toThrow(
        'Only Postgres supported for erasure'
      );
    });

    it('should propagate errors from executeErasurePostgres', async () => {
      vi.mocked(executeErasurePostgres).mockRejectedValueOnce(new Error('Database error'));

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      await expect(runErasure(mockContext, input)).rejects.toThrow('Database error');
    });
  });

  describe('UUID validation', () => {
    const validUUIDs = [
      '123e4567-e89b-12d3-a456-426614174000',
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    const invalidUUIDs = [
      'not-a-uuid',
      '123e4567-e89b-12d3-a456',
      '123e4567-e89b-12d3-a456-426614174000-extra',
      '123e4567e89b12d3a456426614174000',
      '',
    ];

    for (const uuid of validUUIDs) {
      it(`should accept valid UUID: ${uuid}`, async () => {
        const input = { user_id: uuid };
        await runErasure(mockContext, input);
        expect(executeErasurePostgres).toHaveBeenCalled();
      });
    }

    for (const uuid of invalidUUIDs) {
      it(`should reject invalid UUID: ${uuid}`, async () => {
        const input = { user_id: uuid };
        await expect(runErasure(mockContext, input)).rejects.toThrow();
      });
    }
  });
});
