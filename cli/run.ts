import { FileAuditWriter } from '../engine/audit.ts';
import type { RunLimitResult } from '../license/run-limit.ts';
import type { LicensePayload } from '../license/types.ts';
import { erasureCmd } from './commands/erasure.ts';
import { maskingCmd } from './commands/masking.ts';
import { retentionCmd } from './commands/retention.ts';
import { validateCmd } from './commands/validate.ts';

export async function run(args: string[], license: LicensePayload, limitResult?: RunLimitResult) {
  const [cmd, ...rest] = args;

  if (cmd === 'validate') return validateCmd(rest);
  if (cmd === '--help' || cmd === '-h' || !cmd) return showHelp();

  // Log run limit to audit if exceeded
  if (limitResult?.exceeded && limitResult.limit !== null) {
    const audit = new FileAuditWriter(process.env.AUDIT_PATH || 'audit.jsonl');
    await audit.record({
      type: 'run_limit',
      customer: license.customer,
      currentCount: limitResult.currentCount,
      limit: limitResult.limit,
      exceeded: true,
      timestamp: new Date().toISOString(),
    });
  }

  const [sub, ...subRest] = rest;
  if (cmd === 'retention') {
    enforceFeature(license, 'retention');
    return retentionCmd(sub, subRest);
  }
  if (cmd === 'erasure') {
    enforceFeature(license, 'erasure');
    return erasureCmd(sub, subRest);
  }
  if (cmd === 'masking') {
    enforceFeature(license, 'masking');
    return maskingCmd(sub, subRest);
  }

  throw new Error('Unknown command');
}

function enforceFeature(license: LicensePayload, feature: 'retention' | 'erasure' | 'masking') {
  if (!license.features.includes(feature)) {
    throw new Error(`Feature '${feature}' is not enabled in your license`);
  }
}

function showHelp() {
  console.log(`
Retentix - Deterministic Data Retention & GDPR Execution Engine

Usage:
  retentix <command> [options]

Commands:
  validate <policy.yaml>                 Validate policy file
  retention run <policy.yaml>            Run retention rules
  masking run <policy.yaml>              Run masking rules
  erasure run <policy.yaml> [--input-*]  Run erasure (RTBF)

Options:
  --no-dry-run                           Execute changes (default is dry-run)
  --input-<key>=<value>                  Input parameters for erasure

Examples:
  retentix validate policy.yaml
  retentix retention run policy.yaml
  retentix retention run policy.yaml --no-dry-run
  retentix erasure run policy.yaml --input-user_id=UUID

Environment Variables:
  RETENTIX_LICENSE    License token (required, format: base64payload.base64signature)
  DATABASE_URL        PostgreSQL connection string (required)
  AUDIT_PATH          Path to audit log file (default: audit.jsonl)
  HASH_SALT           Salt for hash masking (required for hash strategy)

Note: The public key for license verification is hardcoded in the application.
`);
}
