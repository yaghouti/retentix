import type { Entity, RetentionRule } from '../../policy/types.ts';
import type { ExecutionContext } from '../context.ts';

export async function executeRetentionPostgres(
  ctx: ExecutionContext,
  entity: Entity,
  rule: RetentionRule
) {
  const cutoff = computeCutoff(ctx.now, rule.retainFor);

  const client = await ctx.db.connect();
  try {
    const countSql = `
      SELECT COUNT(*) AS count
      FROM ${entity.table}
      WHERE ${entity.createdAt} < $1
    `;

    const countResult = await client.query(countSql, [cutoff]);
    const affected = Number(countResult.rows[0].count);

    if (!ctx.dryRun) {
      const actionSql = buildActionSql(entity, rule);
      await client.query(actionSql, [cutoff]);
    }

    await ctx.audit.record({
      type: 'retention',
      entity: rule.entity,
      action: rule.action.kind,
      affectedRows: affected,
      dryRun: ctx.dryRun,
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
}

/* ----------------------------------------------- */

function buildActionSql(entity: Entity, rule: RetentionRule): string {
  switch (rule.action.kind) {
    case 'delete':
      return `
        DELETE FROM ${entity.table}
        WHERE ${entity.createdAt} < $1
      `;

    case 'anonymize': {
      const sets = rule.action.fields.map((f) => `${f} = NULL`).join(', ');
      return `
        UPDATE ${entity.table}
        SET ${sets}
        WHERE ${entity.createdAt} < $1
      `;
    }

    case 'none':
      return `SELECT 1`;
  }
}

/* ----------------------------------------------- */

function computeCutoff(now: Date, d: { amount: number; unit: string }) {
  const date = new Date(now);
  switch (d.unit) {
    case 'day':
      date.setDate(date.getDate() - d.amount);
      break;
    case 'month':
      date.setMonth(date.getMonth() - d.amount);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() - d.amount);
      break;
  }
  return date;
}
