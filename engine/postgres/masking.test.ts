import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, MaskingRule, MaskingStrategy } from '../../policy/types.ts';
import type { ExecutionContext } from '../context.ts';
import { executeMaskingPostgres } from './masking.ts';

describe('executeMaskingPostgres', () => {
  const mockEntity: Entity = {
    source: 'test_db',
    table: 'users',
    primaryKey: 'id',
    createdAt: 'created_at',
  };

  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };

  const mockDb = {
    connect: vi.fn().mockResolvedValue(mockClient),
  };

  const mockAudit = {
    record: vi.fn(),
  };

  const baseContext: ExecutionContext = {
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
    },
    db: mockDb as unknown as ExecutionContext['db'],
    now: new Date('2024-12-24T00:00:00.000Z'),
    dryRun: false,
    audit: mockAudit,
  };

  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe('null masking strategy', () => {
    it('should execute null masking in non-dry-run mode', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE email IS NOT NULL',
        []
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE users'),
        []
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SET email = NULL'),
        []
      );
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'masking',
        entity: 'users',
        action: 'update',
        affectedRows: 5,
        dryRun: false,
        timestamp: expect.any(String),
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle multiple fields with null masking', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
          phone: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '10' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE email IS NOT NULL OR phone IS NOT NULL',
        []
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SET email = NULL, phone = NULL'),
        []
      );
    });
  });

  describe('hash masking strategy', () => {
    it('should execute hash masking with sha256', async () => {
      process.env.MASKING_SALT = 'test-salt-123';

      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'hash_sha256' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        hash_sha256: {
          kind: 'hash',
          algorithm: 'sha256',
          saltEnv: 'MASKING_SALT',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '3' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE email IS NOT NULL',
        ['test-salt-123']
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("encode(digest(email || $1, 'sha256'), 'hex')"),
        ['test-salt-123']
      );
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'masking',
        entity: 'users',
        action: 'update',
        affectedRows: 3,
        dryRun: false,
        timestamp: expect.any(String),
      });
    });

    it('should execute hash masking with sha512', async () => {
      process.env.MASKING_SALT = 'test-salt-456';

      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'hash_sha512' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        hash_sha512: {
          kind: 'hash',
          algorithm: 'sha512',
          saltEnv: 'MASKING_SALT',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '2' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("encode(digest(email || $1, 'sha512'), 'hex')"),
        ['test-salt-456']
      );
    });

    it('should handle multiple fields with hash masking', async () => {
      process.env.MASKING_SALT = 'test-salt-789';

      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'hash_sha256' },
          phone: { strategy: 'hash_sha256' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        hash_sha256: {
          kind: 'hash',
          algorithm: 'sha256',
          saltEnv: 'MASKING_SALT',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '7' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("email = encode(digest(email || $1, 'sha256'), 'hex')"),
        ['test-salt-789', 'test-salt-789']
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("phone = encode(digest(phone || $2, 'sha256'), 'hex')"),
        ['test-salt-789', 'test-salt-789']
      );
    });
  });

  describe('mixed strategies', () => {
    it('should handle both null and hash strategies', async () => {
      process.env.MASKING_SALT = 'mixed-salt';

      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
          phone: { strategy: 'hash_sha256' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
        hash_sha256: {
          kind: 'hash',
          algorithm: 'sha256',
          saltEnv: 'MASKING_SALT',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '4' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('email = NULL'), [
        'mixed-salt',
      ]);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("phone = encode(digest(phone || $1, 'sha256'), 'hex')"),
        ['mixed-salt']
      );
    });
  });

  describe('dry run mode', () => {
    it('should skip update in dry-run mode', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      const dryRunContext = { ...baseContext, dryRun: true };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      await executeMaskingPostgres(dryRunContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'masking',
        entity: 'users',
        action: 'update',
        affectedRows: 5,
        dryRun: true,
        timestamp: expect.any(String),
      });
    });

    it('should skip update when no rows affected', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedRows: 0,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw for unknown masking strategy', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'unknown_strategy' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      await expect(
        executeMaskingPostgres(baseContext, mockEntity, rule, strategies)
      ).rejects.toThrow('Unknown masking strategy: unknown_strategy');
    });

    it('should throw for invalid masking strategy kind', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'invalid_kind' },
        },
      };

      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid strategy kind
      const strategies: Record<string, any> = {
        invalid_kind: {
          kind: 'invalid',
        },
      };

      await expect(
        executeMaskingPostgres(baseContext, mockEntity, rule, strategies)
      ).rejects.toThrow('Unhandled masking strategy');
    });

    it('should throw for masking rule with no fields', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {},
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      await expect(
        executeMaskingPostgres(baseContext, mockEntity, rule, strategies)
      ).rejects.toThrow('Masking rule has no fields');
    });

    it('should release client on error', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        executeMaskingPostgres(baseContext, mockEntity, rule, strategies)
      ).rejects.toThrow('Database error');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('affected rows', () => {
    it('should handle zero affected rows', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedRows: 0,
        })
      );
    });

    it('should handle large number of affected rows', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '10000' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedRows: 10000,
        })
      );
    });
  });

  describe('SQL generation', () => {
    it('should generate correct WHERE clause for single field', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE email IS NOT NULL',
        []
      );
    });

    it('should generate correct WHERE clause for multiple fields', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
          phone: { strategy: 'null_mask' },
          address: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE email IS NOT NULL OR phone IS NOT NULL OR address IS NOT NULL',
        []
      );
    });

    it('should generate correct UPDATE statement', async () => {
      const rule: MaskingRule = {
        entity: 'users',
        fields: {
          email: { strategy: 'null_mask' },
          phone: { strategy: 'null_mask' },
        },
      };

      const strategies: Record<string, MaskingStrategy> = {
        null_mask: {
          kind: 'null',
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeMaskingPostgres(baseContext, mockEntity, rule, strategies);

      const updateCall = mockClient.query.mock.calls[1][0];
      expect(updateCall).toContain('UPDATE users');
      expect(updateCall).toContain('SET email = NULL, phone = NULL');
      expect(updateCall).toContain('WHERE email IS NOT NULL OR phone IS NOT NULL');
    });
  });
});
