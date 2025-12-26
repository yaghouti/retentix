import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from './context.ts';
import { TamperEvidentAuditWriter } from './tamper-evident-audit.ts';

describe('TamperEvidentAuditWriter', () => {
  const testAuditFile = 'test-tamper-evident-audit.jsonl';

  beforeEach(() => {
    if (existsSync(testAuditFile)) {
      rmSync(testAuditFile);
    }
  });

  afterEach(() => {
    if (existsSync(testAuditFile)) {
      rmSync(testAuditFile);
    }
  });

  describe('record', () => {
    it('should create first entry with GENESIS as previousHash', async () => {
      const writer = new TamperEvidentAuditWriter(testAuditFile);

      const event: AuditEvent = {
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      await writer.record(event);

      const content = readFileSync(testAuditFile, 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.event).toEqual(event);
      expect(entry.previousHash).toBe('GENESIS');
      expect(entry.sequence).toBe(1);
      expect(entry.hash).toBeTruthy();
      expect(entry.hash).toHaveLength(64); // SHA-256 hex
    });

    it('should chain multiple entries with correct hashes', async () => {
      const writer = new TamperEvidentAuditWriter(testAuditFile);

      const event1: AuditEvent = {
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      const event2: AuditEvent = {
        type: 'erasure',
        entity: 'orders',
        action: 'delete',
        affectedRows: 3,
        dryRun: false,
        timestamp: '2025-01-01T00:01:00.000Z',
      };

      await writer.record(event1);
      await writer.record(event2);

      const content = readFileSync(testAuditFile, 'utf8');
      const lines = content.trim().split('\n');
      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.sequence).toBe(1);
      expect(entry1.previousHash).toBe('GENESIS');

      expect(entry2.sequence).toBe(2);
      expect(entry2.previousHash).toBe(entry1.hash);
      expect(entry2.hash).not.toBe(entry1.hash);
    });

    it('should handle different event types', async () => {
      const writer = new TamperEvidentAuditWriter(testAuditFile);

      const events: AuditEvent[] = [
        {
          type: 'retention',
          entity: 'users',
          action: 'delete',
          affectedRows: 5,
          dryRun: false,
          timestamp: '2025-01-01T00:00:00.000Z',
        },
        {
          type: 'erasure',
          entity: 'orders',
          action: 'anonymize',
          affectedRows: 3,
          dryRun: true,
          timestamp: '2025-01-01T00:01:00.000Z',
        },
        {
          type: 'masking',
          entity: 'profiles',
          action: 'update',
          affectedRows: 10,
          dryRun: false,
          timestamp: '2025-01-01T00:02:00.000Z',
        },
        {
          type: 'run_limit',
          customer: 'Test Corp',
          currentCount: 5,
          limit: 3,
          exceeded: true,
          timestamp: '2025-01-01T00:03:00.000Z',
        },
      ];

      for (const event of events) {
        await writer.record(event);
      }

      const content = readFileSync(testAuditFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(4);

      for (let i = 0; i < lines.length; i++) {
        const entry = JSON.parse(lines[i]);
        expect(entry.sequence).toBe(i + 1);
        expect(entry.event).toEqual(events[i]);
      }
    });

    it('should resume from existing log', async () => {
      // Create initial entries
      const writer1 = new TamperEvidentAuditWriter(testAuditFile);

      await writer1.record({
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      await writer1.record({
        type: 'erasure',
        entity: 'orders',
        action: 'delete',
        affectedRows: 3,
        dryRun: false,
        timestamp: '2025-01-01T00:01:00.000Z',
      });

      // Create new writer (should resume from existing log)
      const writer2 = new TamperEvidentAuditWriter(testAuditFile);

      await writer2.record({
        type: 'masking',
        entity: 'profiles',
        action: 'update',
        affectedRows: 10,
        dryRun: false,
        timestamp: '2025-01-01T00:02:00.000Z',
      });

      const content = readFileSync(testAuditFile, 'utf8');
      const lines = content.trim().split('\n');
      const entry3 = JSON.parse(lines[2]);

      expect(lines).toHaveLength(3);
      expect(entry3.sequence).toBe(3);

      // Verify hash chain is intact
      const entry2 = JSON.parse(lines[1]);
      expect(entry3.previousHash).toBe(entry2.hash);
    });

    it('should throw error if write fails', async () => {
      const invalidPath = '/invalid-path/audit.jsonl';
      const writer = new TamperEvidentAuditWriter(invalidPath);

      const event: AuditEvent = {
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      await expect(writer.record(event)).rejects.toThrow('Failed to write audit entry');
    });
  });

  describe('verifyLog', () => {
    it('should verify valid log', async () => {
      const writer = new TamperEvidentAuditWriter(testAuditFile);

      await writer.record({
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      await writer.record({
        type: 'erasure',
        entity: 'orders',
        action: 'delete',
        affectedRows: 3,
        dryRun: false,
        timestamp: '2025-01-01T00:01:00.000Z',
      });

      const result = TamperEvidentAuditWriter.verifyLog(testAuditFile);

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect tampered hash', async () => {
      const writer = new TamperEvidentAuditWriter(testAuditFile);

      await writer.record({
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      // Tamper with the hash
      const content = readFileSync(testAuditFile, 'utf8');
      const entry = JSON.parse(content.trim());
      entry.hash = 'tampered_hash';
      writeFileSync(testAuditFile, `${JSON.stringify(entry)}\n`);

      const result = TamperEvidentAuditWriter.verifyLog(testAuditFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Hash mismatch');
    });

    it('should detect tampered event data', async () => {
      const writer = new TamperEvidentAuditWriter(testAuditFile);

      await writer.record({
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      // Tamper with the event data
      const content = readFileSync(testAuditFile, 'utf8');
      const entry = JSON.parse(content.trim());
      entry.event.affectedRows = 999; // Changed from 5 to 999
      writeFileSync(testAuditFile, `${JSON.stringify(entry)}\n`);

      const result = TamperEvidentAuditWriter.verifyLog(testAuditFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Hash mismatch');
    });

    it('should detect broken hash chain', async () => {
      const writer = new TamperEvidentAuditWriter(testAuditFile);

      await writer.record({
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      await writer.record({
        type: 'erasure',
        entity: 'orders',
        action: 'delete',
        affectedRows: 3,
        dryRun: false,
        timestamp: '2025-01-01T00:01:00.000Z',
      });

      // Break the hash chain
      const content = readFileSync(testAuditFile, 'utf8');
      const lines = content.trim().split('\n');
      const entry2 = JSON.parse(lines[1]);
      entry2.previousHash = 'broken_chain';
      lines[1] = JSON.stringify(entry2);
      writeFileSync(testAuditFile, `${lines.join('\n')}\n`);

      const result = TamperEvidentAuditWriter.verifyLog(testAuditFile);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Hash chain broken'))).toBe(true);
    });

    it('should detect invalid sequence numbers', async () => {
      const writer = new TamperEvidentAuditWriter(testAuditFile);

      await writer.record({
        type: 'retention',
        entity: 'users',
        action: 'delete',
        affectedRows: 5,
        dryRun: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      // Tamper with sequence number
      const content = readFileSync(testAuditFile, 'utf8');
      const entry = JSON.parse(content.trim());
      entry.sequence = 999;
      writeFileSync(testAuditFile, `${JSON.stringify(entry)}\n`);

      const result = TamperEvidentAuditWriter.verifyLog(testAuditFile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid sequence number'))).toBe(true);
    });

    it('should handle empty log', () => {
      writeFileSync(testAuditFile, '');

      const result = TamperEvidentAuditWriter.verifyLog(testAuditFile);

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle non-existent file', () => {
      const result = TamperEvidentAuditWriter.verifyLog('non-existent.jsonl');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('does not exist');
    });

    it('should detect invalid JSON', async () => {
      writeFileSync(testAuditFile, 'invalid json{{{');

      const result = TamperEvidentAuditWriter.verifyLog(testAuditFile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid JSON'))).toBe(true);
    });

    it('should handle corrupted log gracefully on initialization', () => {
      writeFileSync(testAuditFile, 'corrupted data');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw, but should warn
      const _writer = new TamperEvidentAuditWriter(testAuditFile);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not initialize audit log')
      );

      warnSpy.mockRestore();
    });

    it('should handle file read errors gracefully', () => {
      // Create a file that exists but will cause a read error
      // We'll use a directory path instead of a file path
      // This will cause readFileSync to throw EISDIR error
      const dirPath = 'test-audit-dir';

      // Create a directory (not a file)
      if (!existsSync(dirPath)) {
        const fs = require('node:fs');
        fs.mkdirSync(dirPath);
      }

      try {
        const result = TamperEvidentAuditWriter.verifyLog(dirPath);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Failed to read audit log');
      } finally {
        // Clean up
        if (existsSync(dirPath)) {
          const fs = require('node:fs');
          fs.rmdirSync(dirPath);
        }
      }
    });
  });
});
