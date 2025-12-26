import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TamperEvidentAuditWriter } from '../../engine/tamper-evident-audit.ts';
import { verifyAuditCmd } from './verify-audit.ts';

describe('verifyAuditCmd', () => {
  const testAuditFile = 'test-verify-audit.jsonl';

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

  it('should verify valid audit log', async () => {
    const writer = new TamperEvidentAuditWriter(testAuditFile);

    await writer.record({
      type: 'retention',
      entity: 'users',
      action: 'delete',
      affectedRows: 5,
      dryRun: false,
      timestamp: '2025-01-01T00:00:00.000Z',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await verifyAuditCmd([testAuditFile]);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('valid and tamper-free'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total entries: 1'));

    logSpy.mockRestore();
  });

  it('should detect tampered audit log', async () => {
    const writer = new TamperEvidentAuditWriter(testAuditFile);

    await writer.record({
      type: 'retention',
      entity: 'users',
      action: 'delete',
      affectedRows: 5,
      dryRun: false,
      timestamp: '2025-01-01T00:00:00.000Z',
    });

    // Tamper with the log
    const content = JSON.parse(require('node:fs').readFileSync(testAuditFile, 'utf8').trim());
    content.hash = 'tampered';
    writeFileSync(testAuditFile, `${JSON.stringify(content)}\n`);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(verifyAuditCmd([testAuditFile])).rejects.toThrow('process.exit called');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('verification FAILED'));
    expect(exitSpy).toHaveBeenCalledWith(1);

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should show error for missing file path', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(verifyAuditCmd([])).rejects.toThrow('process.exit called');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Missing audit log file path'));
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should handle non-existent file', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(verifyAuditCmd(['non-existent.jsonl'])).rejects.toThrow('process.exit called');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('verification FAILED'));
    expect(exitSpy).toHaveBeenCalledWith(1);

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
