#!/usr/bin/env node --experimental-strip-types
import { readFileSync, writeFileSync } from 'node:fs';
import { generateKeyPair, generateLicense, validatePayload } from './generate.ts';
import type { LicensePayload } from '../license/types.ts';

function showHelp(): void {
	console.log(`
Retentix License Generator (Vendor Only)

Usage:
  vendor-cli generate-keys [--output keys.json]
    Generate a new Ed25519 key pair for license signing

  vendor-cli generate-license <payload.json> <private-key-file> [--output license.txt]
    Generate a signed license token from a payload JSON file

  vendor-cli --help
    Show this help message

Examples:
  # Generate a new key pair
  vendor-cli generate-keys --output keys.json

  # Generate a license
  vendor-cli generate-license payload.json private-key.txt --output license.txt

Payload JSON Format:
  {
    "customer": "Company Name",
    "environments": ["production", "staging"],
    "expires_at": "2025-12-31T23:59:59.000Z",
    "features": ["retention", "erasure", "masking"],
    "max_runs_per_day": 1000,
    "issued_at": "2025-01-01T00:00:00.000Z"
  }

Note: Keep the private key secure! It should never be committed to version control.
`);
}

function generateKeysCommand(args: string[]): void {
	let outputFile = 'keys.json';

	// Parse arguments
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--output' && args[i + 1]) {
			outputFile = args[i + 1];
			i++;
		}
	}

	console.log('Generating Ed25519 key pair...');
	const { publicKey, privateKey } = generateKeyPair();

	const keys = {
		publicKey: publicKey.toString('base64'),
		privateKey: privateKey.toString('base64'),
		note: 'Keep the private key secure! The public key should be hardcoded in license/verify.ts',
	};

	writeFileSync(outputFile, JSON.stringify(keys, null, 2));
	console.log(`✅ Key pair generated and saved to: ${outputFile}`);
	console.log(`\nPublic Key (base64):\n${keys.publicKey}`);
	console.log('\n⚠️  IMPORTANT: Update license/verify.ts with this public key before building the Docker image!');
}

function generateLicenseCommand(args: string[]): void {
	if (args.length < 2) {
		console.error('Error: Missing required arguments');
		console.error('Usage: vendor-cli generate-license <payload.json> <private-key-file> [--output license.txt]');
		process.exit(1);
	}

	const payloadFile = args[0];
	const privateKeyFile = args[1];
	let outputFile: string | null = null;

	// Parse optional arguments
	for (let i = 2; i < args.length; i++) {
		if (args[i] === '--output' && args[i + 1]) {
			outputFile = args[i + 1];
			i++;
		}
	}

	try {
		// Read payload
		const payloadJson = readFileSync(payloadFile, 'utf8');
		const payload = JSON.parse(payloadJson) as LicensePayload;

		// Validate payload
		console.log('Validating payload...');
		validatePayload(payload);

		// Read private key
		let privateKeyB64 = readFileSync(privateKeyFile, 'utf8').trim();

		// Handle JSON format (from generate-keys)
		if (privateKeyB64.startsWith('{')) {
			const keys = JSON.parse(privateKeyB64);
			privateKeyB64 = keys.privateKey;
		}

		const privateKey = Buffer.from(privateKeyB64, 'base64');

		// Generate license
		console.log('Generating license token...');
		const token = generateLicense(payload, privateKey);

		// Output
		if (outputFile) {
			writeFileSync(outputFile, token);
			console.log(`✅ License generated and saved to: ${outputFile}`);
		} else {
			console.log('\n✅ License Token:');
			console.log(token);
		}

		console.log('\nLicense Details:');
		console.log(`  Customer: ${payload.customer}`);
		console.log(`  Environments: ${payload.environments.join(', ')}`);
		console.log(`  Features: ${payload.features.join(', ')}`);
		console.log(`  Issued: ${payload.issued_at}`);
		console.log(`  Expires: ${payload.expires_at}`);
		if (payload.max_runs_per_day) {
			console.log(`  Max Runs/Day: ${payload.max_runs_per_day}`);
		}

		console.log('\nUsage:');
		console.log(`  export RETENTIX_LICENSE='${token}'`);
	} catch (error) {
		console.error('Error:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

function main(): void {
	const args = process.argv.slice(2);

	if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
		showHelp();
		process.exit(0);
	}

	const command = args[0];
	const commandArgs = args.slice(1);

	switch (command) {
		case 'generate-keys':
			generateKeysCommand(commandArgs);
			break;
		case 'generate-license':
			generateLicenseCommand(commandArgs);
			break;
		default:
			console.error(`Unknown command: ${command}`);
			console.error('Run "vendor-cli --help" for usage information');
			process.exit(1);
	}
}

main();

