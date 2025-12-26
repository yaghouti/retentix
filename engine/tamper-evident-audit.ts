import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { AuditEvent, AuditWriter } from './context.ts';

/**
 * Audit entry with hash chain for tamper detection
 */
export interface TamperEvidentAuditEntry {
  event: AuditEvent;
  previousHash: string;
  hash: string;
  sequence: number;
}

/**
 * Result of audit log verification
 */
export interface VerificationResult {
  valid: boolean;
  totalEntries: number;
  errors: string[];
}

/**
 * Tamper-evident audit writer using hash chains.
 * Each entry includes a hash of the previous entry, making tampering detectable.
 */
export class TamperEvidentAuditWriter implements AuditWriter {
  private path: string;
  private lastHash: string | null = null;
  private sequence = 0;

  constructor(path: string) {
    this.path = path;
    this.initialize();
  }

  /**
   * Initialize by reading the last entry from the log
   */
  private initialize(): void {
    if (!existsSync(this.path)) {
      return;
    }

    try {
      const content = readFileSync(this.path, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);

      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        const lastEntry = JSON.parse(lastLine) as TamperEvidentAuditEntry;
        this.lastHash = lastEntry.hash;
        this.sequence = lastEntry.sequence;
      }
    } catch (error) {
      // If we can't read the log, start fresh
      console.warn(
        `Warning: Could not initialize audit log: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Record an audit event with hash chain
   */
  async record(event: AuditEvent): Promise<void> {
    this.sequence += 1;

    const entry: TamperEvidentAuditEntry = {
      event,
      previousHash: this.lastHash || 'GENESIS',
      hash: '', // Will be computed
      sequence: this.sequence,
    };

    // Compute hash of this entry (excluding the hash field itself)
    entry.hash = this.computeHash(entry);

    // Update last hash for next entry
    this.lastHash = entry.hash;

    // Append to file
    try {
      const line = `${JSON.stringify(entry)}\n`;
      writeFileSync(this.path, line, { flag: 'a' });
    } catch (error) {
      throw new Error(
        `Failed to write audit entry: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compute SHA-256 hash of an audit entry
   */
  private computeHash(entry: TamperEvidentAuditEntry): string {
    // Create a deterministic string representation (excluding the hash field)
    const data = JSON.stringify({
      event: entry.event,
      previousHash: entry.previousHash,
      sequence: entry.sequence,
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify the integrity of the entire audit log
   */
  static verifyLog(path: string): VerificationResult {
    const result: VerificationResult = {
      valid: true,
      totalEntries: 0,
      errors: [],
    };

    if (!existsSync(path)) {
      result.errors.push('Audit log file does not exist');
      result.valid = false;
      return result;
    }

    try {
      const content = readFileSync(path, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);

      if (lines.length === 0) {
        return result; // Empty log is valid
      }

      result.totalEntries = lines.length;
      let previousHash = 'GENESIS';

      for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;

        try {
          const entry = JSON.parse(lines[i]) as TamperEvidentAuditEntry;

          // Check sequence number
          if (entry.sequence !== lineNumber) {
            result.errors.push(
              `Entry ${lineNumber}: Invalid sequence number (expected ${lineNumber}, got ${entry.sequence})`
            );
            result.valid = false;
          }

          // Check previous hash
          if (entry.previousHash !== previousHash) {
            result.errors.push(
              `Entry ${lineNumber}: Hash chain broken (expected previousHash ${previousHash}, got ${entry.previousHash})`
            );
            result.valid = false;
          }

          // Recompute and verify hash
          const expectedHash = TamperEvidentAuditWriter.computeEntryHash(entry);
          if (entry.hash !== expectedHash) {
            result.errors.push(
              `Entry ${lineNumber}: Hash mismatch (expected ${expectedHash}, got ${entry.hash})`
            );
            result.valid = false;
          }

          previousHash = entry.hash;
        } catch (error) {
          result.errors.push(
            `Entry ${lineNumber}: Invalid JSON - ${error instanceof Error ? error.message : String(error)}`
          );
          result.valid = false;
        }
      }
    } catch (error) {
      result.errors.push(
        `Failed to read audit log: ${error instanceof Error ? error.message : String(error)}`
      );
      result.valid = false;
    }

    return result;
  }

  /**
   * Static method to compute hash (used for verification)
   */
  private static computeEntryHash(entry: TamperEvidentAuditEntry): string {
    const data = JSON.stringify({
      event: entry.event,
      previousHash: entry.previousHash,
      sequence: entry.sequence,
    });

    return createHash('sha256').update(data).digest('hex');
  }
}
