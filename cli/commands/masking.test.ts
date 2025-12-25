import { beforeEach, describe, expect, it, vi } from 'vitest';
import { maskingCmd } from './masking.ts';

vi.mock('../config.ts', () => ({
  buildContext: vi.fn(),
}));

vi.mock('../../engine/masking.ts', () => ({
  runMasking: vi.fn(),
}));

import { runMasking } from '../../engine/masking.ts';
import { buildContext } from '../config.ts';

describe('maskingCmd', () => {
  const mockContext = {
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
    db: {} as never,
    audit: { record: vi.fn() },
    now: new Date(),
    dryRun: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should run masking successfully', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runMasking).mockResolvedValue(undefined);

    await maskingCmd('run', ['test-policy.yaml']);

    expect(buildContext).toHaveBeenCalledWith('test-policy.yaml', ['test-policy.yaml']);
    expect(runMasking).toHaveBeenCalledWith(mockContext);
    expect(console.log).toHaveBeenCalledWith('✓ Masking completed');
  });

  it('should throw error for invalid subcommand', async () => {
    await expect(maskingCmd('invalid', ['test-policy.yaml'])).rejects.toThrow(
      'Expected: masking run'
    );
  });

  it('should throw error when policy file is not provided', async () => {
    await expect(maskingCmd('run', [])).rejects.toThrow('Policy file required');
  });

  it('should propagate errors from runMasking', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runMasking).mockRejectedValue(new Error('Masking failed'));

    await expect(maskingCmd('run', ['test-policy.yaml'])).rejects.toThrow('Masking failed');
  });

  it('should pass additional flags to buildContext', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runMasking).mockResolvedValue(undefined);

    await maskingCmd('run', ['test-policy.yaml', '--no-dry-run']);

    expect(buildContext).toHaveBeenCalledWith('test-policy.yaml', [
      'test-policy.yaml',
      '--no-dry-run',
    ]);
  });
});
