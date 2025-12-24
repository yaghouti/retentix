import type { RetentionRule } from '../policy/types.ts';
import type { ExecutionContext } from './context.ts';
import { executeRetentionPostgres } from './postgres/retention.ts';

export async function runRetention(ctx: ExecutionContext, rule: RetentionRule) {
  const entity = ctx.policy.entities[rule.entity];
  const source = ctx.policy.sources[entity.source];

  if (source.kind !== 'postgres') {
    throw new Error('Only Postgres supported');
  }

  await executeRetentionPostgres(ctx, entity, rule);
}
