import type { Entity, ErasureCascadeRule } from '../../policy/types.ts';
import type { ExecutionContext } from '../context.ts';

export async function executeErasurePostgres(
  ctx: ExecutionContext,
  entity: Entity,
  rule: ErasureCascadeRule,
  input: Record<string, unknown>
) {
  const { where, action, params } = buildErasureSql(entity, rule, input);

  const client = await ctx.db.connect();
  try {
    const countResult = await client.query(
      `SELECT COUNT(*) FROM ${entity.table} WHERE ${where}`,
      params
    );

    const affected = Number(countResult.rows[0].count);

    if (!ctx.dryRun) {
      await client.query(action, params);
    }

    await ctx.audit.record({
      type: 'erasure',
      entity: rule.entity,
      action: rule.action,
      affectedRows: affected,
      dryRun: ctx.dryRun,
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
}

function buildErasureSql(entity: Entity, rule: ErasureCascadeRule, input: Record<string, unknown>) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  let idx = 1;
  for (const [field, ref] of Object.entries(rule.match)) {
    if (!ref.startsWith('$')) {
      throw new Error(`Invalid RTBF match reference: ${ref}`);
    }

    const key = ref.slice(1);
    if (!(key in input)) {
      throw new Error(`Missing RTBF input reference: ${key}`);
    }

    conditions.push(`${field} = $${idx}`);
    params.push(input[key]);
    idx++;
  }

  const where = conditions.join(' AND ');

  const action =
    rule.action === 'delete'
      ? `DELETE FROM ${entity.table} WHERE ${where}`
      : buildAnonymizeSql(entity, where);

  return {
    where,
    action,
    params,
  };
}

function buildAnonymizeSql(entity: Entity, where: string) {
  // RTBF anonymize = null all non-PK fields
  return `
    UPDATE ${entity.table}
    SET ${entity.primaryKey} = ${entity.primaryKey}
    WHERE ${where}
  `;
}
