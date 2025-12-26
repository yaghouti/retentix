import { TamperEvidentAuditWriter } from '../../engine/tamper-evident-audit.ts';

export async function verifyAuditCmd(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error('Error: Missing audit log file path');
    console.error('Usage: retentix verify-audit <audit-log-file>');
    process.exit(1);
  }

  const auditFile = args[0];

  console.log(`Verifying audit log: ${auditFile}`);
  console.log('');

  const result = TamperEvidentAuditWriter.verifyLog(auditFile);

  if (result.valid) {
    console.log('✅ Audit log is valid and tamper-free');
    console.log(`   Total entries: ${result.totalEntries}`);
    console.log(`   Hash chain: intact`);
  } else {
    console.log('❌ Audit log verification FAILED');
    console.log(`   Total entries: ${result.totalEntries}`);
    console.log(`   Errors found: ${result.errors.length}`);
    console.log('');
    console.log('Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    process.exit(1);
  }
}
