import { beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from './run.ts';

vi.mock('./commands/validate.ts', () => ({
  validateCmd: vi.fn(),
}));

vi.mock('./commands/retention.ts', () => ({
  retentionCmd: vi.fn(),
}));

vi.mock('./commands/erasure.ts', () => ({
  erasureCmd: vi.fn(),
}));

vi.mock('./commands/masking.ts', () => ({
  maskingCmd: vi.fn(),
}));

import { erasureCmd } from './commands/erasure.ts';
import { maskingCmd } from './commands/masking.ts';
import { retentionCmd } from './commands/retention.ts';
import { validateCmd } from './commands/validate.ts';

describe('run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route to validate command', async () => {
    vi.mocked(validateCmd).mockResolvedValue(undefined);

    await run(['validate', 'policy.yaml']);

    expect(validateCmd).toHaveBeenCalledWith(['policy.yaml']);
  });

  it('should route to retention command', async () => {
    vi.mocked(retentionCmd).mockResolvedValue(undefined);

    await run(['retention', 'run', 'policy.yaml']);

    expect(retentionCmd).toHaveBeenCalledWith('run', ['policy.yaml']);
  });

  it('should route to erasure command', async () => {
    vi.mocked(erasureCmd).mockResolvedValue(undefined);

    await run(['erasure', 'run', 'policy.yaml', '--input-id=123']);

    expect(erasureCmd).toHaveBeenCalledWith('run', ['policy.yaml', '--input-id=123']);
  });

  it('should route to masking command', async () => {
    vi.mocked(maskingCmd).mockResolvedValue(undefined);

    await run(['masking', 'run', 'policy.yaml']);

    expect(maskingCmd).toHaveBeenCalledWith('run', ['policy.yaml']);
  });

  it('should throw error for unknown command', async () => {
    await expect(run(['unknown', 'arg'])).rejects.toThrow('Unknown command');
  });

  it('should throw error for empty args', async () => {
    await expect(run([])).rejects.toThrow('Unknown command');
  });

  it('should pass all remaining args to command', async () => {
    vi.mocked(retentionCmd).mockResolvedValue(undefined);

    await run(['retention', 'run', 'policy.yaml', '--no-dry-run', '--extra-flag']);

    expect(retentionCmd).toHaveBeenCalledWith('run', [
      'policy.yaml',
      '--no-dry-run',
      '--extra-flag',
    ]);
  });
});
