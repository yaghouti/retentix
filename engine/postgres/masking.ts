import type { Entity, MaskingRule, MaskingStrategy } from '../../policy/types.ts';
import type { ExecutionContext } from '../context.ts';

export async function executeMaskingPostgres(
  ctx: ExecutionContext,
  entity: Entity,
  rule: MaskingRule,
  strategies: Record<string, MaskingStrategy>
) {
  const { update, where, params } = buildMaskingSql(entity, rule, strategies);

  const client = await ctx.db.connect();
  try {
    const countResult = await client.query(
      `SELECT COUNT(*) FROM ${entity.table} WHERE ${where}`,
      params
    );

    const affected = Number(countResult.rows[0].count);

    if (!ctx.dryRun && affected > 0) {
      await client.query(update, params);
    }

    await ctx.audit.record({
      type: 'masking',
      entity: rule.entity,
      action: 'update',
      affectedRows: affected,
      dryRun: ctx.dryRun,
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
}

function buildMaskingSql(
  entity: Entity,
  rule: MaskingRule,
  strategies: Record<string, MaskingStrategy>
) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [field, mask] of Object.entries(rule.fields)) {
    const strategy = strategies[mask.strategy];
    if (!strategy) {
      throw new Error(`Unknown masking strategy: ${mask.strategy}`);
    }

    const { sqlExpr, sqlParams } = buildMaskExpression(field, strategy, paramIndex);

    sets.push(`${field} = ${sqlExpr}`);
    params.push(...sqlParams);
    paramIndex += sqlParams.length;
  }

  if (sets.length === 0) {
    throw new Error('Masking rule has no fields');
  }

  // Mask only non-null values (idempotent)
  const where = sets.map((s) => `${s.split('=')[0].trim()} IS NOT NULL`).join(' OR ');

  return {
    update: `
      UPDATE ${entity.table}
      SET ${sets.join(', ')}
      WHERE ${where}
    `,
    where,
    params,
  };
}

function buildMaskExpression(
  field: string,
  strategy: MaskingStrategy,
  paramOffset: number
): { sqlExpr: string; sqlParams: unknown[] } {
  switch (strategy.kind) {
    case 'null':
      return {
        sqlExpr: 'NULL',
        sqlParams: [],
      };

    case 'hash':
      // Requires pgcrypto extension
      return {
        sqlExpr: `encode(digest(${field} || $${paramOffset}, '${strategy.algorithm}'), 'hex')`,
        sqlParams: [process.env[strategy.saltEnv]],
      };

    default:
      throw new Error('Unhandled masking strategy');
  }
}
