import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RunLimitTracker } from './run-limit.ts';
import type { LicensePayload } from './types.ts';

describe('RunLimitTracker', () => {
  const testCounterFile = '.test-runs.json';
  let tracker: RunLimitTracker;

  beforeEach(() => {
    // Clean up any existing test file
    if (existsSync(testCounterFile)) {
      rmSync(testCounterFile);
    }
    tracker = new RunLimitTracker(testCounterFile);
  });

  afterEach(() => {
    // Clean up test file
    if (existsSync(testCounterFile)) {
      rmSync(testCounterFile);
    }
  });

  describe('checkAndIncrement', () => {
    it('should allow first run and create counter file', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 10,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      const result = tracker.checkAndIncrement(license);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.exceeded).toBe(false);
      expect(result.message).toContain('1/10');
    });

    it('should increment counter on subsequent runs', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 5,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      const result1 = tracker.checkAndIncrement(license);
      expect(result1.currentCount).toBe(1);

      const result2 = tracker.checkAndIncrement(license);
      expect(result2.currentCount).toBe(2);

      const result3 = tracker.checkAndIncrement(license);
      expect(result3.currentCount).toBe(3);
    });

    it('should warn when limit is exceeded but still allow (soft enforcement)', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 2,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      // Run 1 and 2: within limit
      const result1 = tracker.checkAndIncrement(license);
      expect(result1.exceeded).toBe(false);
      expect(result1.allowed).toBe(true);

      const result2 = tracker.checkAndIncrement(license);
      expect(result2.exceeded).toBe(false);
      expect(result2.allowed).toBe(true);

      // Run 3: exceeds limit but still allowed (soft enforcement)
      const result3 = tracker.checkAndIncrement(license);
      expect(result3.exceeded).toBe(true);
      expect(result3.allowed).toBe(true);
      expect(result3.currentCount).toBe(3);
      expect(result3.limit).toBe(2);
      expect(result3.message).toContain('WARNING');
      expect(result3.message).toContain('3/2');
    });

    it('should handle license without max_runs_per_day', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      const result1 = tracker.checkAndIncrement(license);
      expect(result1.allowed).toBe(true);
      expect(result1.currentCount).toBe(1);
      expect(result1.limit).toBe(null);
      expect(result1.exceeded).toBe(false);
      expect(result1.message).toContain('no limit');

      // Can run unlimited times
      for (let i = 0; i < 100; i++) {
        const result = tracker.checkAndIncrement(license);
        expect(result.exceeded).toBe(false);
        expect(result.allowed).toBe(true);
      }
    });

    it('should reset counter for new day', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 5,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      // Run 3 times today
      tracker.checkAndIncrement(license);
      tracker.checkAndIncrement(license);
      const result = tracker.checkAndIncrement(license);
      expect(result.currentCount).toBe(3);

      // Simulate a new day by manually updating the counter file
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      writeFileSync(testCounterFile, JSON.stringify({ date: yesterdayStr, count: 3 }));

      // Next run should reset to 1
      const newDayResult = tracker.checkAndIncrement(license);
      expect(newDayResult.currentCount).toBe(1);
      expect(newDayResult.exceeded).toBe(false);
    });
  });

  describe('getCurrentCount', () => {
    it('should return 0 for new tracker', () => {
      expect(tracker.getCurrentCount()).toBe(0);
    });

    it('should return current count for today', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 10,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      tracker.checkAndIncrement(license);
      tracker.checkAndIncrement(license);

      expect(tracker.getCurrentCount()).toBe(2);
    });

    it('should return 0 if counter is from previous day', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 10,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      tracker.checkAndIncrement(license);

      // Simulate previous day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      writeFileSync(testCounterFile, JSON.stringify({ date: yesterdayStr, count: 5 }));

      expect(tracker.getCurrentCount()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset counter to 0', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 10,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      tracker.checkAndIncrement(license);
      tracker.checkAndIncrement(license);
      expect(tracker.getCurrentCount()).toBe(2);

      tracker.reset();
      expect(tracker.getCurrentCount()).toBe(0);
    });
  });

  describe('file handling', () => {
    it('should handle missing counter file', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 10,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      const result = tracker.checkAndIncrement(license);
      expect(result.currentCount).toBe(1);
      expect(existsSync(testCounterFile)).toBe(true);
    });

    it('should handle corrupted counter file', () => {
      writeFileSync(testCounterFile, 'invalid json{{{');

      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 10,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      // Should handle gracefully and start fresh
      const result = tracker.checkAndIncrement(license);
      expect(result.currentCount).toBe(1);
    });

    it('should create directory if it does not exist', () => {
      const nestedPath = 'test-dir/nested/.test-runs.json';
      const nestedTracker = new RunLimitTracker(nestedPath);

      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 10,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      const result = nestedTracker.checkAndIncrement(license);
      expect(result.currentCount).toBe(1);
      expect(existsSync(nestedPath)).toBe(true);

      // Cleanup
      rmSync('test-dir', { recursive: true });
    });
  });

  describe('edge cases', () => {
    it('should handle limit of 1', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 1,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      const result1 = tracker.checkAndIncrement(license);
      expect(result1.exceeded).toBe(false);

      const result2 = tracker.checkAndIncrement(license);
      expect(result2.exceeded).toBe(true);
      expect(result2.allowed).toBe(true); // Soft enforcement
    });

    it('should handle very large limits', () => {
      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 1000000,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      const result = tracker.checkAndIncrement(license);
      expect(result.exceeded).toBe(false);
      expect(result.limit).toBe(1000000);
    });

    it('should handle multiple trackers with different files', () => {
      const tracker1 = new RunLimitTracker('.test-runs-1.json');
      const tracker2 = new RunLimitTracker('.test-runs-2.json');

      const license: LicensePayload = {
        customer: 'Test Corp',
        environments: ['production'],
        expires_at: '2026-12-31T23:59:59.000Z',
        features: ['retention'],
        max_runs_per_day: 10,
        issued_at: '2025-01-01T00:00:00.000Z',
      };

      tracker1.checkAndIncrement(license);
      tracker1.checkAndIncrement(license);

      tracker2.checkAndIncrement(license);

      expect(tracker1.getCurrentCount()).toBe(2);
      expect(tracker2.getCurrentCount()).toBe(1);

      // Cleanup
      rmSync('.test-runs-1.json');
      rmSync('.test-runs-2.json');
    });
  });
});
