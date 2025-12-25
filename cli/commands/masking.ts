import { runMasking } from '../../engine/masking.ts';
import { buildContext } from '../config.ts';

export async function maskingCmd(sub: string, args: string[]) {
  if (sub !== 'run') throw new Error('Expected: masking run');

  const policyFile = args[0];
  if (!policyFile) throw new Error('Policy file required');

  const ctx = await buildContext(policyFile, args);

  await runMasking(ctx);

  console.log('✓ Masking completed');
}
