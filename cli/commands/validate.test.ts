import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateCmd } from './validate.ts';

vi.mock('../../policy/validate.ts', () => ({
  loadPolicy: vi.fn(),
}));

import { loadPolicy } from '../../policy/validate.ts';

describe('validateCmd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should validate a policy file successfully', async () => {
    vi.mocked(loadPolicy).mockReturnValue({} as never);

    await validateCmd(['test-policy.yaml']);

    expect(loadPolicy).toHaveBeenCalledWith('test-policy.yaml');
    expect(console.log).toHaveBeenCalledWith('✓ Policy is valid');
  });

  it('should throw error when policy file is not provided', async () => {
    await expect(validateCmd([])).rejects.toThrow('Policy file required');
  });

  it('should propagate validation errors', async () => {
    vi.mocked(loadPolicy).mockImplementation(() => {
      throw new Error('Invalid policy: missing required field');
    });

    await expect(validateCmd(['invalid-policy.yaml'])).rejects.toThrow(
      'Invalid policy: missing required field'
    );
  });

  it('should handle multiple policy files', async () => {
    vi.mocked(loadPolicy).mockReturnValue({} as never);

    await validateCmd(['policy1.yaml', 'policy2.yaml']);

    // Should only validate the first file
    expect(loadPolicy).toHaveBeenCalledWith('policy1.yaml');
    expect(loadPolicy).toHaveBeenCalledTimes(1);
  });
});
