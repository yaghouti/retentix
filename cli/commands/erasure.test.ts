import { beforeEach, describe, expect, it, vi } from 'vitest';
import { erasureCmd } from './erasure.ts';

vi.mock('../config.ts', () => ({
  buildContext: vi.fn(),
}));

vi.mock('../../engine/erasure.ts', () => ({
  runErasure: vi.fn(),
}));

import { runErasure } from '../../engine/erasure.ts';
import { buildContext } from '../config.ts';

describe('erasureCmd', () => {
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

  it('should run erasure with input parameters', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runErasure).mockResolvedValue(undefined);

    await erasureCmd('run', [
      'test-policy.yaml',
      '--input-user_id=123e4567-e89b-12d3-a456-426614174000',
    ]);

    expect(buildContext).toHaveBeenCalledWith('test-policy.yaml', [
      'test-policy.yaml',
      '--input-user_id=123e4567-e89b-12d3-a456-426614174000',
    ]);
    expect(runErasure).toHaveBeenCalledWith(mockContext, {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(console.log).toHaveBeenCalledWith('✓ Erasure completed');
  });

  it('should handle multiple input parameters', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runErasure).mockResolvedValue(undefined);

    await erasureCmd('run', [
      'test-policy.yaml',
      '--input-user_id=123e4567-e89b-12d3-a456-426614174000',
      '--input-email=test@example.com',
    ]);

    expect(runErasure).toHaveBeenCalledWith(mockContext, {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
    });
  });

  it('should handle erasure without input parameters', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runErasure).mockResolvedValue(undefined);

    await erasureCmd('run', ['test-policy.yaml']);

    expect(runErasure).toHaveBeenCalledWith(mockContext, {});
  });

  it('should ignore invalid input flags', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runErasure).mockResolvedValue(undefined);

    await erasureCmd('run', [
      'test-policy.yaml',
      '--input-user_id=123',
      '--other-flag',
      '--input-invalid',
    ]);

    expect(runErasure).toHaveBeenCalledWith(mockContext, {
      user_id: '123',
    });
  });

  it('should throw error for invalid subcommand', async () => {
    await expect(erasureCmd('invalid', ['test-policy.yaml'])).rejects.toThrow(
      'Expected: erasure run'
    );
  });

  it('should throw error when policy file is not provided', async () => {
    await expect(erasureCmd('run', [])).rejects.toThrow('Policy file required');
  });

  it('should propagate errors from runErasure', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runErasure).mockRejectedValue(new Error('Erasure failed'));

    await expect(erasureCmd('run', ['test-policy.yaml'])).rejects.toThrow('Erasure failed');
  });

  it('should handle input with equals sign in value', async () => {
    vi.mocked(buildContext).mockResolvedValue(mockContext as never);
    vi.mocked(runErasure).mockResolvedValue(undefined);

    await erasureCmd('run', ['test-policy.yaml', '--input-token=abc=def=ghi']);

    // Should only split on first equals sign
    expect(runErasure).toHaveBeenCalledWith(mockContext, {
      token: 'abc=def=ghi',
    });
  });
});
