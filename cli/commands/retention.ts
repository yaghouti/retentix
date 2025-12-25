import { runRetention } from '../../engine/retention.ts';
import { buildContext } from '../config.ts';

export async function retentionCmd(sub: string, args: string[]) {
  if (sub !== 'run') throw new Error('Expected: retention run');

  const policyFile = args[0];
  if (!policyFile) throw new Error('Policy file required');

  const ctx = await buildContext(policyFile, args);

  if (!ctx.policy.retention || ctx.policy.retention.length === 0) {
    console.log('No retention rules defined');
    return;
  }

  for (const rule of ctx.policy.retention) {
    await runRetention(ctx, rule);
  }

  console.log('✓ Retention completed');
}
