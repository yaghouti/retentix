import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, ErasureCascadeRule } from '../../policy/types.ts';
import type { ExecutionContext } from '../context.ts';
import { executeErasurePostgres } from './erasure.ts';

describe('executeErasurePostgres', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('delete action', () => {
    it('should execute delete in non-dry-run mode', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: '$user_id' },
        action: 'delete',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeErasurePostgres(baseContext, mockEntity, rule, input);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE id = $1',
        [input.user_id]
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'DELETE FROM users WHERE id = $1', [
        input.user_id,
      ]);
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'erasure',
        entity: 'users',
        action: 'delete',
        affectedRows: 1,
        dryRun: false,
        timestamp: expect.any(String),
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should skip delete in dry-run mode', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: '$user_id' },
        action: 'delete',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const dryRunContext = { ...baseContext, dryRun: true };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeErasurePostgres(dryRunContext, mockEntity, rule, input);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'erasure',
        entity: 'users',
        action: 'delete',
        affectedRows: 1,
        dryRun: true,
        timestamp: expect.any(String),
      });
    });

    it('should handle multiple match conditions', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: {
          id: '$user_id',
          email: '$email',
        },
        action: 'delete',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeErasurePostgres(baseContext, mockEntity, rule, input);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE id = $1 AND email = $2',
        [input.user_id, input.email]
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        'DELETE FROM users WHERE id = $1 AND email = $2',
        [input.user_id, input.email]
      );
    });
  });

  describe('anonymize action', () => {
    it('should execute anonymize in non-dry-run mode', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: '$user_id' },
        action: 'anonymize',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeErasurePostgres(baseContext, mockEntity, rule, input);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE users'), [
        input.user_id,
      ]);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('SET id = id'), [
        input.user_id,
      ]);
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'erasure',
        entity: 'users',
        action: 'anonymize',
        affectedRows: 1,
        dryRun: false,
        timestamp: expect.any(String),
      });
    });

    it('should skip anonymize in dry-run mode', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: '$user_id' },
        action: 'anonymize',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const dryRunContext = { ...baseContext, dryRun: true };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeErasurePostgres(dryRunContext, mockEntity, rule, input);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'erasure',
        entity: 'users',
        action: 'anonymize',
        affectedRows: 1,
        dryRun: true,
        timestamp: expect.any(String),
      });
    });
  });

  describe('input validation', () => {
    it('should throw for invalid match reference (missing $)', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: 'user_id' },
        action: 'delete',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      await expect(executeErasurePostgres(baseContext, mockEntity, rule, input)).rejects.toThrow(
        'Invalid RTBF match reference: user_id'
      );
    });

    it('should throw for missing input reference', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: '$user_id' },
        action: 'delete',
      };

      const input = {
        wrong_key: '123e4567-e89b-12d3-a456-426614174000',
      };

      await expect(executeErasurePostgres(baseContext, mockEntity, rule, input)).rejects.toThrow(
        'Missing RTBF input reference: user_id'
      );
    });
  });

  describe('affected rows', () => {
    it('should handle zero affected rows', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: '$user_id' },
        action: 'delete',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await executeErasurePostgres(baseContext, mockEntity, rule, input);

      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedRows: 0,
        })
      );
    });

    it('should handle multiple affected rows', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { company_id: '$company_id' },
        action: 'delete',
      };

      const input = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '100' }],
      });

      await executeErasurePostgres(baseContext, mockEntity, rule, input);

      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedRows: 100,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should release client on error', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: '$user_id' },
        action: 'delete',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(executeErasurePostgres(baseContext, mockEntity, rule, input)).rejects.toThrow(
        'Database error'
      );

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('SQL generation', () => {
    it('should generate correct WHERE clause for single condition', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: { id: '$user_id' },
        action: 'delete',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeErasurePostgres(baseContext, mockEntity, rule, input);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE id = $1',
        [input.user_id]
      );
    });

    it('should generate correct WHERE clause for multiple conditions', async () => {
      const rule: ErasureCascadeRule = {
        entity: 'users',
        match: {
          id: '$user_id',
          email: '$email',
          status: '$status',
        },
        action: 'delete',
      };

      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        status: 'active',
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      await executeErasurePostgres(baseContext, mockEntity, rule, input);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) FROM users WHERE id = $1 AND email = $2 AND status = $3',
        [input.user_id, input.email, input.status]
      );
    });
  });
});
