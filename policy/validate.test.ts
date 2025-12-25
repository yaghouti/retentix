import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPolicy } from './validate.ts';

// Mock the fs module
vi.mock('node:fs');

describe('loadPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load and parse a valid YAML policy', () => {
    const yamlContent = `
version: 1
policy:
  name: "Test Policy"
  owner: "test@example.com"
  effective_from: "2024-01-01"
  timezone: "UTC"
sources:
  test_db:
    type: postgres
    connection: env:DATABASE_URL
entities:
  users:
    source: test_db
    table: users
    primary_key: id
    created_at: created_at
`;

    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

    const policy = loadPolicy('test-policy.yaml');

    expect(fs.readFileSync).toHaveBeenCalledWith('test-policy.yaml', 'utf8');
    expect(policy.version).toBe(1);
    expect(policy.policy.name).toBe('Test Policy');
    expect(policy.sources.test_db.type).toBe('postgres');
  });

  it('should throw on invalid YAML', () => {
    const invalidYaml = 'invalid: yaml: content:';
    vi.mocked(fs.readFileSync).mockReturnValue(invalidYaml);

    expect(() => loadPolicy('invalid.yaml')).toThrow();
  });

  it('should throw on invalid policy schema', () => {
    const invalidPolicy = `
version: 2
policy:
  name: "Test"
`;
    vi.mocked(fs.readFileSync).mockReturnValue(invalidPolicy);

    expect(() => loadPolicy('invalid-policy.yaml')).toThrow();
  });

  it('should handle file read errors', () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('File not found');
    });

    expect(() => loadPolicy('nonexistent.yaml')).toThrow('File not found');
  });

  it('should parse complex policy with all features', () => {
    const complexYaml = `
version: 1
policy:
  name: "Complex Policy"
  owner: "admin@example.com"
  description: "A complex test policy"
  effective_from: "2024-01-01"
  timezone: "UTC"
sources:
  hr_db:
    type: postgres
    connection: env:HR_DATABASE_URL
entities:
  employees:
    source: hr_db
    table: employees
    primary_key: id
    created_at: created_at
retention:
  - entity: employees
    retain_for: "7 years"
    action:
      type: delete
masking:
  strategies:
    email_hash:
      type: hash
      algorithm: sha256
      salt: env:HASH_SALT
  rules:
    - entity: employees
      fields:
        email:
          strategy: email_hash
erasure:
  trigger:
    type: manual
    input:
      employee_id: uuid
  cascade:
    - entity: employees
      match:
        id: employee_id
      action: delete
execution:
  mode: dry-run
  batch_size: 1000
  max_runtime_minutes: 30
audit:
  log:
    destination: local
    format: json
  report:
    include:
      - policy_metadata
      - execution_summary
`;

    vi.mocked(fs.readFileSync).mockReturnValue(complexYaml);

    const policy = loadPolicy('complex-policy.yaml');

    expect(policy.version).toBe(1);
    expect(policy.retention).toHaveLength(1);
    expect(policy.masking).toBeDefined();
    expect(policy.erasure).toBeDefined();
    expect(policy.execution).toBeDefined();
    expect(policy.audit).toBeDefined();
  });
});
