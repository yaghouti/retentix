import { FileAuditWriter } from '../engine/audit.ts';
import type { ExecutionContext } from '../engine/context.ts';
import { createPool } from '../engine/postgres/client.ts';
import { parsePolicy } from '../policy/parser.ts';
import { loadPolicy } from '../policy/validate.ts';

export async function buildContext(policyFile: string, args: string[]): Promise<ExecutionContext> {
  const validated = loadPolicy(policyFile);
  const policy = parsePolicy(validated);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    policy,
    db: createPool(databaseUrl),
    audit: new FileAuditWriter(process.env.AUDIT_PATH || 'audit.jsonl'),
    now: new Date(),
    dryRun: !args.includes('--no-dry-run'),
  };
}
