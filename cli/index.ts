#!/usr/bin/env node
import { loadAndVerifyLicense } from '../license/verify.ts';
import { run } from './run.ts';

const licenseToken = process.env.RETENTIX_LICENSE;
if (!licenseToken) {
  throw new Error('RETENTIX_LICENSE environment variable is required');
}

const license = loadAndVerifyLicense(licenseToken);

run(process.argv.slice(2), license).catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
