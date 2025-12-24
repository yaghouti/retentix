import type { Pool } from 'pg';
import type { Policy } from '../policy/types';

export interface ExecutionContext {
  policy: Policy;
  db: Pool;
  now: Date;
  dryRun: boolean;
  audit: AuditWriter;
}

export interface AuditWriter {
  record(event: AuditEvent): Promise<void>;
}

export interface AuditEvent {
  type: 'retention';
  entity: string;
  action: 'delete' | 'anonymize' | 'none';
  affectedRows: number;
  dryRun: boolean;
  timestamp: string;
}
