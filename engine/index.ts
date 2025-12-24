import type { ExecutionContext } from './context.ts';
import { runRetention } from './retention.ts';

export async function runEngine(ctx: ExecutionContext) {
  if (ctx.policy.retention) {
    for (const rule of ctx.policy.retention) {
      await runRetention(ctx, rule);
    }
  }
}
