import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parsePolicy } from './policy/parser.ts';
import { loadPolicy } from './policy/validate.ts';

describe('Integration Tests', () => {
  const testPolicyPath = 'test-policy.yaml';
  const testPolicyContent = `
version: 1
policy:
  name: "Integration Test Policy"
  owner: "test@example.com"
  description: "Policy for integration testing"
  effective_from: "2024-01-01"
  timezone: "UTC"
sources:
  test_db:
    type: postgres
    connection: env:TEST_DATABASE_URL
entities:
  test_users:
    source: test_db
    table: users
    primary_key: id
    created_at: created_at
  test_logs:
    source: test_db
    table: logs
    primary_key: id
    created_at: timestamp
retention:
  - entity: test_users
    retain_for: "7 years"
    action:
      type: delete
  - entity: test_logs
    retain_for: "90 days"
    action:
      type: anonymize
      fields:
        - user_id
        - ip_address
masking:
  strategies:
    email_hash:
      type: hash
      algorithm: sha256
      salt: env:HASH_SALT
    nullify:
      type: "null"
  rules:
    - entity: test_users
      fields:
        email:
          strategy: email_hash
        phone:
          strategy: nullify
erasure:
  trigger:
    type: manual
    input:
      user_id: uuid
  cascade:
    - entity: test_users
      match:
        id: user_id
      action: delete
    - entity: test_logs
      match:
        user_id: user_id
      action: anonymize
execution:
  mode: dry-run
  schedule: "0 2 * * 0"
  batch_size: 500
  max_runtime_minutes: 45
audit:
  log:
    destination: local
    format: json
  report:
    include:
      - policy_metadata
      - execution_summary
      - affected_records
`;

  beforeEach(() => {
    fs.writeFileSync(testPolicyPath, testPolicyContent, 'utf8');
  });

  afterEach(() => {
    if (fs.existsSync(testPolicyPath)) {
      fs.unlinkSync(testPolicyPath);
    }
  });

  it('should load, validate, and parse a complete policy', () => {
    // Load and validate
    const rawPolicy = loadPolicy(testPolicyPath);
    expect(rawPolicy.version).toBe(1);

    // Parse to domain types
    const policy = parsePolicy(rawPolicy);

    // Verify metadata
    expect(policy.metadata.name).toBe('Integration Test Policy');
    expect(policy.metadata.owner).toBe('test@example.com');
    expect(policy.metadata.effectiveFrom).toBeInstanceOf(Date);
    expect(policy.metadata.timezone).toBe('UTC');

    // Verify sources
    expect(policy.sources.test_db).toEqual({
      kind: 'postgres',
      connectionEnv: 'TEST_DATABASE_URL',
    });

    // Verify entities
    expect(Object.keys(policy.entities)).toHaveLength(2);
    expect(policy.entities.test_users.table).toBe('users');
    expect(policy.entities.test_logs.table).toBe('logs');

    // Verify retention rules
    expect(policy.retention).toHaveLength(2);
    expect(policy.retention?.[0].retainFor).toEqual({
      amount: 7,
      unit: 'year',
    });
    expect(policy.retention?.[0].action).toEqual({ kind: 'delete' });
    expect(policy.retention?.[1].retainFor).toEqual({
      amount: 90,
      unit: 'day',
    });
    expect(policy.retention?.[1].action).toEqual({
      kind: 'anonymize',
      fields: ['user_id', 'ip_address'],
    });

    // Verify masking
    expect(policy.masking?.strategies.email_hash).toEqual({
      kind: 'hash',
      algorithm: 'sha256',
      saltEnv: 'HASH_SALT',
    });
    expect(policy.masking?.strategies.nullify).toEqual({
      kind: 'null',
    });
    expect(policy.masking?.rules).toHaveLength(1);

    // Verify erasure
    expect(policy.erasure?.trigger.kind).toBe('manual');
    expect(policy.erasure?.trigger.input).toEqual({ user_id: 'uuid' });
    expect(policy.erasure?.cascade).toHaveLength(2);

    // Verify execution
    expect(policy.execution?.mode).toBe('dry-run');
    expect(policy.execution?.batchSize).toBe(500);
    expect(policy.execution?.maxRuntimeMinutes).toBe(45);

    // Verify audit
    expect(policy.audit?.log.destination).toBe('local');
    expect(policy.audit?.report.include).toHaveLength(3);
  });

  it('should handle minimal policy', () => {
    const minimalPolicy = `
version: 1
policy:
  name: "Minimal Policy"
  owner: "test@example.com"
  effective_from: "2024-01-01"
  timezone: "UTC"
sources:
  db:
    type: postgres
    connection: env:DB_URL
entities:
  users:
    source: db
    table: users
    primary_key: id
    created_at: created_at
`;

    fs.writeFileSync(testPolicyPath, minimalPolicy, 'utf8');

    const rawPolicy = loadPolicy(testPolicyPath);
    const policy = parsePolicy(rawPolicy);

    expect(policy.metadata.name).toBe('Minimal Policy');
    expect(policy.retention).toBeUndefined();
    expect(policy.masking).toBeUndefined();
    expect(policy.erasure).toBeUndefined();
    expect(policy.execution).toBeUndefined();
    expect(policy.audit).toBeUndefined();
  });

  it('should handle all duration formats', () => {
    const policyWithDurations = `
version: 1
policy:
  name: "Duration Test"
  owner: "test@example.com"
  effective_from: "2024-01-01"
  timezone: "UTC"
sources:
  db:
    type: postgres
    connection: env:DB_URL
entities:
  entity1:
    source: db
    table: table1
    primary_key: id
    created_at: created_at
  entity2:
    source: db
    table: table2
    primary_key: id
    created_at: created_at
  entity3:
    source: db
    table: table3
    primary_key: id
    created_at: created_at
retention:
  - entity: entity1
    retain_for: "1 day"
    action:
      type: delete
  - entity: entity2
    retain_for: "12 months"
    action:
      type: delete
  - entity: entity3
    retain_for: "5 years"
    action:
      type: delete
`;

    fs.writeFileSync(testPolicyPath, policyWithDurations, 'utf8');

    const rawPolicy = loadPolicy(testPolicyPath);
    const policy = parsePolicy(rawPolicy);

    expect(policy.retention?.[0].retainFor).toEqual({ amount: 1, unit: 'day' });
    expect(policy.retention?.[1].retainFor).toEqual({
      amount: 12,
      unit: 'month',
    });
    expect(policy.retention?.[2].retainFor).toEqual({
      amount: 5,
      unit: 'year',
    });
  });
});
