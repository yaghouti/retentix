import { erasureCmd } from './commands/erasure.ts';
import { maskingCmd } from './commands/masking.ts';
import { retentionCmd } from './commands/retention.ts';
import { validateCmd } from './commands/validate.ts';

export async function run(args: string[]) {
  const [cmd, sub, ...rest] = args;

  if (cmd === 'validate') return validateCmd(rest);
  if (cmd === 'retention') return retentionCmd(sub, rest);
  if (cmd === 'erasure') return erasureCmd(sub, rest);
  if (cmd === 'masking') return maskingCmd(sub, rest);

  throw new Error('Unknown command');
}
