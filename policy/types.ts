/* ==================================================
 * Core
 * ================================================== */

export type PolicyVersion = 1;

export interface Policy {
  version: PolicyVersion;
  metadata: PolicyMetadata;
  sources: Record<string, DataSource>;
  entities: Record<string, Entity>;
  retention?: RetentionRule[];
  masking?: MaskingPolicy;
  erasure?: ErasurePolicy;
  execution?: ExecutionConfig;
  audit?: AuditConfig;
}

/* ==================================================
 * Metadata
 * ================================================== */

export interface PolicyMetadata {
  name: string;
  owner: string;
  description?: string;
  effectiveFrom: Date;
  timezone: string;
}

/* ==================================================
 * Data Sources
 * ================================================== */

export type DataSource =
  | PostgresSource;

export interface PostgresSource {
  kind: "postgres";
  connectionEnv: string;
}

/* ==================================================
 * Entities
 * ================================================== */

export interface Entity {
  source: string;
  table: string;
  primaryKey: string;
  createdAt: string;
}

/* ==================================================
 * Retention
 * ================================================== */

export type RetentionAction =
  | DeleteAction
  | NoneAction
  | AnonymizeAction;

export interface RetentionRule {
  entity: string;
  retainFor: Duration;
  action: RetentionAction;
}

export interface DeleteAction {
  kind: "delete";
}

export interface NoneAction {
  kind: "none";
}

export interface AnonymizeAction {
  kind: "anonymize";
  fields: string[];
}

/* ==================================================
 * Masking
 * ================================================== */

export interface MaskingPolicy {
  strategies: Record<string, MaskingStrategy>;
  rules: MaskingRule[];
}

export interface MaskingRule {
  entity: string;
  fields: Record<string, FieldMask>;
}

export interface FieldMask {
  strategy: string;
}

/* -------- Masking Strategies -------- */

export type MaskingStrategy =
  | HashMask
  | NullMask;

export interface HashMask {
  kind: "hash";
  algorithm: "sha256" | "sha512";
  saltEnv: string;
}

export interface NullMask {
  kind: "null";
}

/* ==================================================
 * Erasure (Right To Be Forgotten)
 * ================================================== */

export interface ErasurePolicy {
  trigger: ErasureTrigger;
  cascade: ErasureCascadeRule[];
}

export interface ErasureTrigger {
  kind: "manual";
  input: Record<string, ErasureInputType>;
}

export type ErasureInputType = "uuid" | "string" | "number";

export interface ErasureCascadeRule {
  entity: string;
  match: Record<string, string>;
  action: "delete" | "anonymize";
}

/* ==================================================
 * Execution
 * ================================================== */

export interface ExecutionConfig {
  mode: ExecutionMode;
  schedule?: string;
  batchSize: number;
  maxRuntimeMinutes: number;
}

export type ExecutionMode = "dry-run" | "apply";

/* ==================================================
 * Audit
 * ================================================== */

export interface AuditConfig {
  log: AuditLogConfig;
  report: AuditReportConfig;
}

export interface AuditLogConfig {
  destination: "local" | "stdout";
  format: "json";
}

export interface AuditReportConfig {
  include: AuditReportSection[];
}

export type AuditReportSection =
  | "policy_metadata"
  | "execution_summary"
  | "affected_records";

/* ==================================================
 * Value Objects
 * ================================================== */

export interface Duration {
  amount: number;
  unit: "day" | "month" | "year";
}
