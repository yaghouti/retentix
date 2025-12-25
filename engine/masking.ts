import type { ExecutionContext } from './context.ts';
import { executeMaskingPostgres } from './postgres/masking.ts';

export async function runMasking(ctx: ExecutionContext) {
  const masking = ctx.policy.masking;
  if (!masking) return;

  for (const rule of masking.rules) {
    const entity = ctx.policy.entities[rule.entity];
    const source = ctx.policy.sources[entity.source];

    if (source.kind !== 'postgres') {
      throw new Error('Only Postgres supported for masking');
    }

    await executeMaskingPostgres(ctx, entity, rule, masking.strategies);
  }
}
