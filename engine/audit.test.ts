import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileAuditWriter } from './audit.ts';
import type { AuditEvent } from './context.ts';

vi.mock('node:fs');

describe('FileAuditWriter', () => {
  const testPath = '/tmp/audit.log';
  let writer: FileAuditWriter;

  beforeEach(() => {
    vi.clearAllMocks();
    writer = new FileAuditWriter(testPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should write audit event to file', async () => {
    const event: AuditEvent = {
      type: 'retention',
      entity: 'users',
      action: 'delete',
      affectedRows: 10,
      dryRun: false,
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    await writer.record(event);

    expect(fs.appendFileSync).toHaveBeenCalledWith(testPath, `${JSON.stringify(event)}\n`);
  });

  it('should write multiple events', async () => {
    const event1: AuditEvent = {
      type: 'retention',
      entity: 'users',
      action: 'delete',
      affectedRows: 10,
      dryRun: false,
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    const event2: AuditEvent = {
      type: 'retention',
      entity: 'logs',
      action: 'anonymize',
      affectedRows: 5,
      dryRun: true,
      timestamp: '2024-01-02T00:00:00.000Z',
    };

    await writer.record(event1);
    await writer.record(event2);

    expect(fs.appendFileSync).toHaveBeenCalledTimes(2);
    expect(fs.appendFileSync).toHaveBeenNthCalledWith(1, testPath, `${JSON.stringify(event1)}\n`);
    expect(fs.appendFileSync).toHaveBeenNthCalledWith(2, testPath, `${JSON.stringify(event2)}\n`);
  });

  it('should handle dry-run events', async () => {
    const event: AuditEvent = {
      type: 'retention',
      entity: 'users',
      action: 'delete',
      affectedRows: 100,
      dryRun: true,
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    await writer.record(event);

    expect(fs.appendFileSync).toHaveBeenCalledWith(testPath, `${JSON.stringify(event)}\n`);
  });

  it('should handle none action', async () => {
    const event: AuditEvent = {
      type: 'retention',
      entity: 'users',
      action: 'none',
      affectedRows: 0,
      dryRun: false,
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    await writer.record(event);

    expect(fs.appendFileSync).toHaveBeenCalledWith(testPath, `${JSON.stringify(event)}\n`);
  });
});
