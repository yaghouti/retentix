import type { z } from 'zod';
import { PolicySchema } from './schema.ts';
import type * as T from './types.ts';

/* ==================================================
 * Public API
 * ================================================== */

export function parsePolicy(input: unknown): T.Policy {
  const validated = PolicySchema.parse(input);
  return toDomainPolicy(validated);
}

/* ==================================================
 * Root Mapper
 * ================================================== */

function toDomainPolicy(raw: z.infer<typeof PolicySchema>): T.Policy {
  return {
    version: raw.version,
    metadata: toMetadata(raw.policy),
    sources: mapRecord(raw.sources, toDataSource),
    entities: mapRecord(raw.entities, toEntity),
    retention: raw.retention?.map(toRetentionRule),
    masking: raw.masking ? toMasking(raw.masking) : undefined,
    erasure: raw.erasure ? toErasure(raw.erasure) : undefined,
    execution: raw.execution ? toExecution(raw.execution) : undefined,
    audit: raw.audit ? toAudit(raw.audit) : undefined,
  };
}

/* ==================================================
 * Metadata
 * ================================================== */

function toMetadata(meta: z.infer<typeof PolicySchema>['policy']): T.PolicyMetadata {
  return {
    name: meta.name,
    owner: meta.owner,
    description: meta.description,
    effectiveFrom: new Date(meta.effective_from),
    timezone: meta.timezone,
  };
}

/* ==================================================
 * Data Sources
 * ================================================== */

function toDataSource(source: z.infer<typeof PolicySchema>['sources'][string]): T.DataSource {
  switch (source.type) {
    case 'postgres':
      return {
        kind: 'postgres',
        connectionEnv: stripEnvRef(source.connection),
      };
  }
}

/* ==================================================
 * Entities
 * ================================================== */

function toEntity(entity: z.infer<typeof PolicySchema>['entities'][string]): T.Entity {
  return {
    source: entity.source,
    table: entity.table,
    primaryKey: entity.primary_key,
    createdAt: entity.created_at,
  };
}

/* ==================================================
 * Retention
 * ================================================== */

function toRetentionRule(
  rule: NonNullable<z.infer<typeof PolicySchema>['retention']>[number]
): T.RetentionRule {
  return {
    entity: rule.entity,
    retainFor: parseDuration(rule.retain_for),
    action: toRetentionAction(rule.action),
  };
}

function toRetentionAction(
  action: NonNullable<z.infer<typeof PolicySchema>['retention']>[number]['action']
): T.RetentionAction {
  if (action.type === 'delete') {
    return { kind: 'delete' };
  }
  if (action.type === 'none') {
    return { kind: 'none' };
  }
  if (action.type === 'anonymize') {
    return {
      kind: 'anonymize',
      fields: action.fields,
    };
  }
  exhaustive(action);
}

/* ==================================================
 * Masking
 * ================================================== */

function toMasking(masking: NonNullable<z.infer<typeof PolicySchema>['masking']>): T.MaskingPolicy {
  return {
    strategies: mapRecord(masking.strategies, toMaskingStrategy),
    rules: masking.rules.map(toMaskingRule),
  };
}

function toMaskingRule(
  rule: NonNullable<z.infer<typeof PolicySchema>['masking']>['rules'][number]
): T.MaskingRule {
  return {
    entity: rule.entity,
    fields: mapRecord(rule.fields, (f) => ({
      strategy: f.strategy,
    })),
  };
}

function toMaskingStrategy(
  strategy: NonNullable<z.infer<typeof PolicySchema>['masking']>['strategies'][string]
): T.MaskingStrategy {
  if (strategy.type === 'hash') {
    return {
      kind: 'hash',
      algorithm: strategy.algorithm,
      saltEnv: stripEnvRef(strategy.salt),
    };
  }
  if (strategy.type === 'null') {
    return { kind: 'null' };
  }
  exhaustive(strategy);
}

/* ==================================================
 * Erasure (RTBF)
 * ================================================== */

function toErasure(erasure: NonNullable<z.infer<typeof PolicySchema>['erasure']>): T.ErasurePolicy {
  return {
    trigger: {
      kind: 'manual',
      input: erasure.trigger.input as Record<string, T.ErasureInputType>,
    },
    cascade: erasure.cascade.map(toErasureCascadeRule),
  };
}

function toErasureCascadeRule(
  rule: NonNullable<z.infer<typeof PolicySchema>['erasure']>['cascade'][number]
): T.ErasureCascadeRule {
  return {
    entity: rule.entity,
    match: rule.match as Record<string, string>,
    action: rule.action,
  };
}

/* ==================================================
 * Execution
 * ================================================== */

function toExecution(
  exec: NonNullable<z.infer<typeof PolicySchema>['execution']>
): T.ExecutionConfig {
  return {
    mode: exec.mode,
    schedule: exec.schedule,
    batchSize: exec.batch_size,
    maxRuntimeMinutes: exec.max_runtime_minutes,
  };
}

/* ==================================================
 * Audit
 * ================================================== */

function toAudit(audit: NonNullable<z.infer<typeof PolicySchema>['audit']>): T.AuditConfig {
  return {
    log: {
      destination: audit.log.destination,
      format: audit.log.format,
    },
    report: {
      include: audit.report.include,
    },
  };
}

/* ==================================================
 * Value Object Parsers
 * ================================================== */

function parseDuration(input: string): T.Duration {
  const match = input.match(/^(\d+)\s+(day|days|month|months|year|years)$/i);
  if (!match) {
    throw new Error(`Invalid duration: ${input}`);
  }

  const amount = Number(match[1]);
  const unitRaw = match[2].toLowerCase();

  const unit = unitRaw.startsWith('day') ? 'day' : unitRaw.startsWith('month') ? 'month' : 'year';

  return { amount, unit };
}

function stripEnvRef(ref: string): string {
  // env:PG_URL -> PG_URL
  return ref.replace(/^env:/, '');
}

/* ==================================================
 * Utilities
 * ================================================== */

function mapRecord<T, U>(record: Record<string, T>, fn: (value: T) => U): Record<string, U> {
  const result: Record<string, U> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = fn(value);
  }
  return result;
}

function exhaustive(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}
