import { erasureCmd } from './commands/erasure.ts';
import { maskingCmd } from './commands/masking.ts';
import { retentionCmd } from './commands/retention.ts';
import { validateCmd } from './commands/validate.ts';

export async function run(args: string[]) {
  const [cmd, ...rest] = args;

  if (cmd === 'validate') return validateCmd(rest);
  if (cmd === '--help' || cmd === '-h' || !cmd) return showHelp();

  const [sub, ...subRest] = rest;
  if (cmd === 'retention') return retentionCmd(sub, subRest);
  if (cmd === 'erasure') return erasureCmd(sub, subRest);
  if (cmd === 'masking') return maskingCmd(sub, subRest);

  throw new Error('Unknown command');
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
  DATABASE_URL     PostgreSQL connection string (required)
  AUDIT_PATH       Path to audit log file (default: audit.jsonl)
  HASH_SALT        Salt for hash masking (required for hash strategy)
`);
}
