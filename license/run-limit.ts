import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LicensePayload } from './types.ts';

/**
 * Daily run counter data structure
 */
interface RunCounter {
  date: string; // YYYY-MM-DD format
  count: number;
}

/**
 * Result of checking run limit
 */
export interface RunLimitResult {
  allowed: boolean; // Always true for soft enforcement
  currentCount: number;
  limit: number | null;
  exceeded: boolean;
  message: string;
}

/**
 * Run limit tracker for soft enforcement.
 * Tracks daily runs and warns when limits are exceeded, but never blocks execution.
 */
export class RunLimitTracker {
  private counterFile: string;

  constructor(counterFile = '.retentix-runs.json') {
    this.counterFile = counterFile;
  }

  /**
   * Check if the run is allowed and update the counter.
   * For soft enforcement, always returns allowed=true but tracks violations.
   */
  checkAndIncrement(license: LicensePayload): RunLimitResult {
    const limit = license.max_runs_per_day ?? null;
    const today = this.getToday();

    // Read current counter
    const counter = this.readCounter();

    // Reset counter if it's a new day
    if (counter.date !== today) {
      counter.date = today;
      counter.count = 0;
    }

    // Increment counter
    counter.count += 1;

    // Write updated counter
    this.writeCounter(counter);

    // Check if limit is exceeded
    const exceeded = limit !== null && counter.count > limit;

    return {
      allowed: true, // Soft enforcement: always allow
      currentCount: counter.count,
      limit,
      exceeded,
      message: exceeded
        ? `⚠️  WARNING: Daily run limit exceeded (${counter.count}/${limit}). This is a soft limit - execution will continue, but please review your usage.`
        : limit !== null
          ? `✓ Run ${counter.count}/${limit} for today`
          : `✓ Run ${counter.count} for today (no limit)`,
    };
  }

  /**
   * Get current run count for today
   */
  getCurrentCount(): number {
    const counter = this.readCounter();
    const today = this.getToday();

    if (counter.date !== today) {
      return 0;
    }

    return counter.count;
  }

  /**
   * Reset the run counter (useful for testing)
   */
  reset(): void {
    const counter: RunCounter = {
      date: this.getToday(),
      count: 0,
    };
    this.writeCounter(counter);
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getToday(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Read counter from file
   */
  private readCounter(): RunCounter {
    if (!existsSync(this.counterFile)) {
      return {
        date: this.getToday(),
        count: 0,
      };
    }

    try {
      const data = readFileSync(this.counterFile, 'utf8');
      return JSON.parse(data);
    } catch {
      // If file is corrupted, start fresh
      return {
        date: this.getToday(),
        count: 0,
      };
    }
  }

  /**
   * Write counter to file
   */
  private writeCounter(counter: RunCounter): void {
    try {
      // Ensure directory exists
      const dir = dirname(this.counterFile);
      if (dir !== '.' && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.counterFile, JSON.stringify(counter, null, 2));
    } catch (error) {
      // Log error but don't fail the execution (soft enforcement)
      console.warn(
        `Warning: Failed to write run counter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Create a run limit tracker with optional custom counter file path
 */
export function createRunLimitTracker(counterFile?: string): RunLimitTracker {
  return new RunLimitTracker(counterFile);
}
