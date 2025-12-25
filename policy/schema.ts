import { z } from 'zod';

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

const DurationSchema = z
  .string()
  .regex(
    /^(\d+)\s+(day|days|month|months|year|years)$/i,
    "Invalid duration format (e.g. '18 months')"
  );

const EnvRefSchema = z
  .string()
  .regex(/^env:[A-Z0-9_]+$/, 'Environment variable reference must be env:VAR_NAME');

const CronSchema = z.string().min(1, 'Cron expression required');

/* --------------------------------------------------
 * Core Metadata
 * -------------------------------------------------- */

const PolicyMetadataSchema = z.object({
  name: z.string().min(3),
  owner: z.string().email(),
  description: z.string().optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default('UTC'),
});

/* --------------------------------------------------
 * Data Sources
 * -------------------------------------------------- */

const PostgresSourceSchema = z.object({
  type: z.literal('postgres'),
  connection: EnvRefSchema,
});

const DataSourceSchema = z.union([PostgresSourceSchema]);

const SourcesSchema = z.record(z.string(), DataSourceSchema);

/* --------------------------------------------------
 * Entities
 * -------------------------------------------------- */

const EntitySchema = z.object({
  source: z.string(),
  table: z.string(),
  primary_key: z.string(),
  created_at: z.string(),
});

const EntitiesSchema = z.record(z.string(), EntitySchema);

/* --------------------------------------------------
 * Retention Rules
 * -------------------------------------------------- */

const RetentionActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('delete'),
  }),
  z.object({
    type: z.literal('none'),
  }),
  z.object({
    type: z.literal('anonymize'),
    fields: z.array(z.string()).min(1),
  }),
]);

const RetentionRuleSchema = z.object({
  entity: z.string(),
  retain_for: DurationSchema,
  action: RetentionActionSchema,
});

const RetentionSchema = z.array(RetentionRuleSchema);

/* --------------------------------------------------
 * Masking
 * -------------------------------------------------- */

const HashMaskSchema = z.object({
  type: z.literal('hash'),
  algorithm: z.enum(['sha256', 'sha512']),
  salt: EnvRefSchema,
});

const NullMaskSchema = z.object({
  type: z.literal('null'),
});

const MaskingStrategySchema = z.discriminatedUnion('type', [HashMaskSchema, NullMaskSchema]);

const MaskingSchema = z.object({
  strategies: z.record(z.string(), MaskingStrategySchema),
  rules: z.array(
    z.object({
      entity: z.string(),
      fields: z.record(
        z.string(),
        z.object({
          strategy: z.string(),
        })
      ),
    })
  ),
});

/* --------------------------------------------------
 * Right To Be Forgotten (Erasure)
 * -------------------------------------------------- */

const ErasureTriggerSchema = z.object({
  type: z.literal('manual'),
  input: z.record(z.string(), z.enum(['uuid', 'string', 'number'])),
});

const ErasureActionSchema = z.enum(['delete', 'anonymize']);

const ErasureCascadeRuleSchema = z.object({
  entity: z.string(),
  match: z.record(z.string(), z.string()),
  action: ErasureActionSchema,
});

const ErasureSchema = z.object({
  trigger: ErasureTriggerSchema,
  cascade: z.array(ErasureCascadeRuleSchema).min(1),
});

/* --------------------------------------------------
 * Execution
 * -------------------------------------------------- */

const ExecutionSchema = z.object({
  mode: z.enum(['dry-run', 'apply']).default('dry-run'),
  schedule: CronSchema.optional(),
  batch_size: z.number().int().positive().max(10000).default(1000),
  max_runtime_minutes: z.number().int().positive().max(180).default(30),
});

/* --------------------------------------------------
 * Audit & Reporting
 * -------------------------------------------------- */

const AuditSchema = z.object({
  log: z.object({
    destination: z.enum(['local', 'stdout']).default('local'),
    format: z.enum(['json']).default('json'),
  }),
  report: z.object({
    include: z.array(z.enum(['policy_metadata', 'execution_summary', 'affected_records'])),
  }),
});

/* --------------------------------------------------
 * Root Policy Schema
 * -------------------------------------------------- */

export const PolicySchema = z
  .object({
    version: z.literal(1),
    policy: PolicyMetadataSchema,
    sources: SourcesSchema,
    entities: EntitiesSchema,
    retention: RetentionSchema.optional(),
    masking: MaskingSchema.optional(),
    erasure: ErasureSchema.optional(),
    execution: ExecutionSchema.optional(),
    audit: AuditSchema.optional(),
  })
  .superRefine((policy, ctx) => {
    /* -------------------------------
     * Cross-field validations
     * ------------------------------- */

    // entities must reference valid sources
    for (const [entityName, entity] of Object.entries(policy.entities)) {
      if (
        entity &&
        typeof entity === 'object' &&
        'source' in entity &&
        typeof entity.source === 'string'
      ) {
        if (!policy.sources[entity.source]) {
          ctx.addIssue({
            path: ['entities', entityName, 'source'],
            message: `Unknown source '${entity.source}'`,
            code: z.ZodIssueCode.custom,
          });
        }
      }
    }

    // retention rules must reference valid entities
    if (policy.retention) {
      for (const [i, rule] of policy.retention.entries()) {
        if (!policy.entities[rule.entity]) {
          ctx.addIssue({
            path: ['retention', i, 'entity'],
            message: `Unknown entity '${rule.entity}'`,
            code: z.ZodIssueCode.custom,
          });
        }
      }
    }

    // masking rules must reference defined strategies
    if (policy.masking) {
      const strategies = policy.masking.strategies;
      for (const [i, rule] of policy.masking.rules.entries()) {
        for (const field of Object.values(rule.fields)) {
          if (
            field &&
            typeof field === 'object' &&
            'strategy' in field &&
            typeof field.strategy === 'string'
          ) {
            if (!strategies[field.strategy]) {
              ctx.addIssue({
                path: ['masking', 'rules', i],
                message: `Unknown masking strategy '${field.strategy}'`,
                code: z.ZodIssueCode.custom,
              });
            }
          }
        }
      }
    }
  });

/* --------------------------------------------------
 * Exported Type
 * -------------------------------------------------- */

export type Policy = z.infer<typeof PolicySchema>;
