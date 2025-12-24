import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, RetentionRule } from '../../policy/types.ts';
import type { ExecutionContext } from '../context.ts';
import { executeRetentionPostgres } from './retention.ts';

describe('executeRetentionPostgres', () => {
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
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 7, unit: 'year' },
        action: { kind: 'delete' },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '10' }],
      });

      await executeRetentionPostgres(baseContext, mockEntity, rule);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT COUNT(*)'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('DELETE FROM'),
        expect.any(Array)
      );
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 10,
        dryRun: false,
        timestamp: expect.any(String),
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should skip delete in dry-run mode', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 7, unit: 'year' },
        action: { kind: 'delete' },
      };

      const dryRunContext = { ...baseContext, dryRun: true };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '25' }],
      });

      await executeRetentionPostgres(dryRunContext, mockEntity, rule);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 25,
        dryRun: true,
        timestamp: expect.any(String),
      });
    });
  });

  describe('anonymize action', () => {
    it('should execute anonymize in non-dry-run mode', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 18, unit: 'month' },
        action: {
          kind: 'anonymize',
          fields: ['email', 'phone', 'address'],
        },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '15' }],
      });

      await executeRetentionPostgres(baseContext, mockEntity, rule);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('email = NULL, phone = NULL, address = NULL'),
        expect.any(Array)
      );
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'retention',
        entity: 'users',
        action: 'anonymize',
        affectedRows: 15,
        dryRun: false,
        timestamp: expect.any(String),
      });
    });

    it('should skip anonymize in dry-run mode', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 18, unit: 'month' },
        action: {
          kind: 'anonymize',
          fields: ['email'],
        },
      };

      const dryRunContext = { ...baseContext, dryRun: true };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      await executeRetentionPostgres(dryRunContext, mockEntity, rule);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'retention',
        entity: 'users',
        action: 'anonymize',
        affectedRows: 5,
        dryRun: true,
        timestamp: expect.any(String),
      });
    });
  });

  describe('none action', () => {
    it('should execute none action', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 1, unit: 'day' },
        action: { kind: 'none' },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await executeRetentionPostgres(baseContext, mockEntity, rule);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT 1'),
        expect.any(Array)
      );
      expect(mockAudit.record).toHaveBeenCalledWith({
        type: 'retention',
        entity: 'users',
        action: 'none',
        affectedRows: 0,
        dryRun: false,
        timestamp: expect.any(String),
      });
    });
  });

  describe('cutoff calculation', () => {
    it('should calculate cutoff for days', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 30, unit: 'day' },
        action: { kind: 'delete' },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await executeRetentionPostgres(baseContext, mockEntity, rule);

      const cutoffDate = new Date('2024-11-24T00:00:00.000Z');
      expect(mockClient.query).toHaveBeenNthCalledWith(1, expect.any(String), [cutoffDate]);
    });

    it('should calculate cutoff for months', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 6, unit: 'month' },
        action: { kind: 'delete' },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await executeRetentionPostgres(baseContext, mockEntity, rule);

      // Check that the cutoff is 6 months ago
      const expectedCutoff = new Date(baseContext.now);
      expectedCutoff.setMonth(expectedCutoff.getMonth() - 6);

      expect(mockClient.query).toHaveBeenNthCalledWith(1, expect.any(String), [expectedCutoff]);
    });

    it('should calculate cutoff for years', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 7, unit: 'year' },
        action: { kind: 'delete' },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await executeRetentionPostgres(baseContext, mockEntity, rule);

      const cutoffDate = new Date('2017-12-24T00:00:00.000Z');
      expect(mockClient.query).toHaveBeenNthCalledWith(1, expect.any(String), [cutoffDate]);
    });
  });

  describe('error handling', () => {
    it('should release client on error', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 7, unit: 'year' },
        action: { kind: 'delete' },
      };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(executeRetentionPostgres(baseContext, mockEntity, rule)).rejects.toThrow(
        'Database error'
      );

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('affected rows', () => {
    it('should handle zero affected rows', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 7, unit: 'year' },
        action: { kind: 'delete' },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await executeRetentionPostgres(baseContext, mockEntity, rule);

      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedRows: 0,
        })
      );
    });

    it('should handle large number of affected rows', async () => {
      const rule: RetentionRule = {
        entity: 'users',
        retainFor: { amount: 7, unit: 'year' },
        action: { kind: 'delete' },
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '10000' }],
      });

      await executeRetentionPostgres(baseContext, mockEntity, rule);

      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedRows: 10000,
        })
      );
    });
  });
});
