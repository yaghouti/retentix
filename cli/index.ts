#!/usr/bin/env node
import { createRunLimitTracker } from '../license/run-limit.ts';
import { loadAndVerifyLicense } from '../license/verify.ts';
import { run } from './run.ts';

// Allow --help without license for better UX
const args = process.argv.slice(2);
const isHelpCommand = args.length === 0 || args.includes('--help') || args.includes('-h');

if (isHelpCommand) {
  // Create a minimal license for help display
  const helpLicense = {
    customer: 'Help',
    environments: ['help'],
    expires_at: new Date().toISOString(),
    features: ['retention', 'erasure', 'masking'] as Array<'retention' | 'erasure' | 'masking'>,
    issued_at: new Date().toISOString(),
  };
  run(args, helpLicense).catch((err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
} else {
  const licenseToken = process.env.RETENTIX_LICENSE;
  if (!licenseToken) {
    throw new Error('RETENTIX_LICENSE environment variable is required');
  }

  const license = loadAndVerifyLicense(licenseToken);

  // Check run limit (soft enforcement)
  const runLimitTracker = createRunLimitTracker();
  const limitResult = runLimitTracker.checkAndIncrement(license);

  // Log limit status
  if (limitResult.exceeded) {
    console.warn(limitResult.message);
  }

  run(args, license, limitResult).catch((err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
}
