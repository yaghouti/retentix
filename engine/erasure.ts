import type { ErasurePolicy } from '../policy/types.ts';
import type { ExecutionContext } from './context.ts';
import { executeErasurePostgres } from './postgres/erasure.ts';

export async function runErasure(ctx: ExecutionContext, input: Record<string, unknown>) {
  const erasure = ctx.policy.erasure;
  if (!erasure) {
    throw new Error('No erasure policy defined');
  }

  validateErasureInput(erasure, input);

  for (const rule of erasure.cascade) {
    const entity = ctx.policy.entities[rule.entity];
    const source = ctx.policy.sources[entity.source];

    if (source.kind !== 'postgres') {
      throw new Error('Only Postgres supported for erasure');
    }

    await executeErasurePostgres(ctx, entity, rule, input);
  }
}

function validateErasureInput(policy: ErasurePolicy, input: Record<string, unknown>) {
  for (const [key, type] of Object.entries(policy.trigger.input)) {
    const value = input[key];

    if (value === undefined || value === null) {
      throw new Error(`Missing erasure input: ${key}`);
    }

    switch (type) {
      case 'uuid':
        if (typeof value !== 'string' || !isUUID(value)) {
          throw new Error(`Invalid UUID for ${key}`);
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Invalid string for ${key}`);
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Invalid number for ${key}`);
        }
        break;
    }
  }
}

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
