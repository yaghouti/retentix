import { parsePolicy } from '../policy/parser.ts';
import { loadPolicy } from '../policy/validate.ts';

// Example: Load and parse a policy file
// Usage: node --experimental-strip-types examples/example.ts examples/hr-policy.yaml

const policyPath = process.argv[2] || 'examples/hr-policy.yaml';

console.log(`Loading policy from: ${policyPath}\n`);

try {
  // Load and validate the YAML policy
  const rawPolicy = loadPolicy(policyPath);
  console.log('✓ Policy loaded and validated');

  // Parse into domain types
  const policy = parsePolicy(rawPolicy);
  console.log('✓ Policy parsed successfully');

  console.log('\nPolicy Summary:');
  console.log(`  Name: ${policy.metadata.name}`);
  console.log(`  Owner: ${policy.metadata.owner}`);
  console.log(`  Effective From: ${policy.metadata.effectiveFrom.toISOString()}`);
  console.log(`  Timezone: ${policy.metadata.timezone}`);
  console.log(`  Sources: ${Object.keys(policy.sources).length}`);
  console.log(`  Entities: ${Object.keys(policy.entities).length}`);
  console.log(`  Retention Rules: ${policy.retention?.length ?? 0}`);
  console.log(`  Execution Mode: ${policy.execution?.mode ?? 'not configured'}`);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
