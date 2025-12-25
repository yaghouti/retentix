import { erasureCmd } from './commands/erasure.ts';
import { maskingCmd } from './commands/masking.ts';
import { retentionCmd } from './commands/retention.ts';
import { validateCmd } from './commands/validate.ts';

export async function run(args: string[]) {
  const [cmd, ...rest] = args;

  if (cmd === 'validate') return validateCmd(rest);

  const [sub, ...subRest] = rest;
  if (cmd === 'retention') return retentionCmd(sub, subRest);
  if (cmd === 'erasure') return erasureCmd(sub, subRest);
  if (cmd === 'masking') return maskingCmd(sub, subRest);

  throw new Error('Unknown command');
}
