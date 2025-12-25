import { runErasure } from '../../engine/erasure.ts';
import { buildContext } from '../config.ts';

export async function erasureCmd(sub: string, args: string[]) {
  if (sub !== 'run') throw new Error('Expected: erasure run');

  const [policyFile, ...flags] = args;
  if (!policyFile) throw new Error('Policy file required');

  const input: Record<string, unknown> = {};
  for (const f of flags) {
    if (!f.startsWith('--input-')) continue;
    const keyValue = f.slice(8);
    const equalIndex = keyValue.indexOf('=');
    if (equalIndex === -1) continue;
    const k = keyValue.slice(0, equalIndex);
    const v = keyValue.slice(equalIndex + 1);
    input[k] = v;
  }

  const ctx = await buildContext(policyFile, args);
  await runErasure(ctx, input);

  console.log('✓ Erasure completed');
}
