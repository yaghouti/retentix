import { describe, expect, it } from "vitest";
import { parsePolicy } from "./parser.ts";

describe("parsePolicy", () => {
  const validInput = {
    version: 1,
    policy: {
      name: "Test Policy",
      owner: "test@example.com",
      description: "Test description",
      effective_from: "2024-01-01",
      timezone: "UTC",
    },
    sources: {
      test_db: {
        type: "postgres",
        connection: "env:DATABASE_URL",
      },
    },
    entities: {
      users: {
        source: "test_db",
        table: "users",
        primary_key: "id",
        created_at: "created_at",
      },
    },
  };

  describe("metadata parsing", () => {
    it("should parse metadata correctly", () => {
      const policy = parsePolicy(validInput);
      expect(policy.metadata.name).toBe("Test Policy");
      expect(policy.metadata.owner).toBe("test@example.com");
      expect(policy.metadata.description).toBe("Test description");
      expect(policy.metadata.effectiveFrom).toBeInstanceOf(Date);
      expect(policy.metadata.effectiveFrom.toISOString()).toBe("2024-01-01T00:00:00.000Z");
      expect(policy.metadata.timezone).toBe("UTC");
    });
  });

  describe("data source parsing", () => {
    it("should parse postgres source", () => {
      const policy = parsePolicy(validInput);
      expect(policy.sources.test_db).toEqual({
        kind: "postgres",
        connectionEnv: "DATABASE_URL",
      });
    });

    it("should strip env: prefix from connection string", () => {
      const policy = parsePolicy(validInput);
      expect(policy.sources.test_db.connectionEnv).toBe("DATABASE_URL");
      expect(policy.sources.test_db.connectionEnv).not.toContain("env:");
    });
  });

  describe("entity parsing", () => {
    it("should parse entity correctly", () => {
      const policy = parsePolicy(validInput);
      expect(policy.entities.users).toEqual({
        source: "test_db",
        table: "users",
        primaryKey: "id",
        createdAt: "created_at",
      });
    });

    it("should convert snake_case to camelCase", () => {
      const policy = parsePolicy(validInput);
      expect(policy.entities.users.primaryKey).toBe("id");
      expect(policy.entities.users.createdAt).toBe("created_at");
    });
  });

  describe("retention rule parsing", () => {
    it("should parse delete action", () => {
      const input = {
        ...validInput,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "delete" },
          },
        ],
      };
      const policy = parsePolicy(input);
      expect(policy.retention).toHaveLength(1);
      expect(policy.retention?.[0].action).toEqual({ kind: "delete" });
    });

    it("should parse none action", () => {
      const input = {
        ...validInput,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "none" },
          },
        ],
      };
      const policy = parsePolicy(input);
      expect(policy.retention?.[0].action).toEqual({ kind: "none" });
    });

    it("should parse anonymize action", () => {
      const input = {
        ...validInput,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "anonymize", fields: ["email", "phone"] },
          },
        ],
      };
      const policy = parsePolicy(input);
      expect(policy.retention?.[0].action).toEqual({
        kind: "anonymize",
        fields: ["email", "phone"],
      });
    });

    it("should parse duration with days", () => {
      const input = {
        ...validInput,
        retention: [
          {
            entity: "users",
            retain_for: "30 days",
            action: { type: "delete" },
          },
        ],
      };
      const policy = parsePolicy(input);
      expect(policy.retention?.[0].retainFor).toEqual({
        amount: 30,
        unit: "day",
      });
    });

    it("should parse duration with months", () => {
      const input = {
        ...validInput,
        retention: [
          {
            entity: "users",
            retain_for: "18 months",
            action: { type: "delete" },
          },
        ],
      };
      const policy = parsePolicy(input);
      expect(policy.retention?.[0].retainFor).toEqual({
        amount: 18,
        unit: "month",
      });
    });

    it("should parse duration with years", () => {
      const input = {
        ...validInput,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "delete" },
          },
        ],
      };
      const policy = parsePolicy(input);
      expect(policy.retention?.[0].retainFor).toEqual({
        amount: 7,
        unit: "year",
      });
    });

    it("should handle singular forms", () => {
      const input = {
        ...validInput,
        retention: [
          {
            entity: "users",
            retain_for: "1 day",
            action: { type: "delete" },
          },
        ],
      };
      const policy = parsePolicy(input);
      expect(policy.retention?.[0].retainFor).toEqual({
        amount: 1,
        unit: "day",
      });
    });
  });

  describe("masking parsing", () => {
    it("should parse hash masking strategy", () => {
      const input = {
        ...validInput,
        masking: {
          strategies: {
            email_hash: {
              type: "hash",
              algorithm: "sha256",
              salt: "env:HASH_SALT",
            },
          },
          rules: [],
        },
      };
      const policy = parsePolicy(input);
      expect(policy.masking?.strategies.email_hash).toEqual({
        kind: "hash",
        algorithm: "sha256",
        saltEnv: "HASH_SALT",
      });
    });

    it("should parse null masking strategy", () => {
      const input = {
        ...validInput,
        masking: {
          strategies: {
            nullify: {
              type: "null",
            },
          },
          rules: [],
        },
      };
      const policy = parsePolicy(input);
      expect(policy.masking?.strategies.nullify).toEqual({
        kind: "null",
      });
    });

    it("should parse masking rules", () => {
      const input = {
        ...validInput,
        masking: {
          strategies: {
            email_hash: {
              type: "hash",
              algorithm: "sha256",
              salt: "env:HASH_SALT",
            },
          },
          rules: [
            {
              entity: "users",
              fields: {
                email: { strategy: "email_hash" },
                phone: { strategy: "email_hash" },
              },
            },
          ],
        },
      };
      const policy = parsePolicy(input);
      expect(policy.masking?.rules).toHaveLength(1);
      expect(policy.masking?.rules[0].entity).toBe("users");
      expect(policy.masking?.rules[0].fields.email).toEqual({
        strategy: "email_hash",
      });
    });
  });

  describe("erasure parsing", () => {
    it("should parse erasure trigger", () => {
      const input = {
        ...validInput,
        erasure: {
          trigger: {
            type: "manual",
            input: {
              user_id: "uuid",
              email: "string",
            },
          },
          cascade: [
            {
              entity: "users",
              match: { id: "user_id" },
              action: "delete",
            },
          ],
        },
      };
      const policy = parsePolicy(input);
      expect(policy.erasure?.trigger).toEqual({
        kind: "manual",
        input: {
          user_id: "uuid",
          email: "string",
        },
      });
    });

    it("should parse erasure cascade rules", () => {
      const input = {
        ...validInput,
        erasure: {
          trigger: {
            type: "manual",
            input: { user_id: "uuid" },
          },
          cascade: [
            {
              entity: "users",
              match: { id: "user_id" },
              action: "delete",
            },
            {
              entity: "users",
              match: { id: "user_id" },
              action: "anonymize",
            },
          ],
        },
      };
      const policy = parsePolicy(input);
      expect(policy.erasure?.cascade).toHaveLength(2);
      expect(policy.erasure?.cascade[0].action).toBe("delete");
      expect(policy.erasure?.cascade[1].action).toBe("anonymize");
    });
  });

  describe("execution config parsing", () => {
    it("should parse execution config", () => {
      const input = {
        ...validInput,
        execution: {
          mode: "apply",
          schedule: "0 2 * * 0",
          batch_size: 500,
          max_runtime_minutes: 60,
        },
      };
      const policy = parsePolicy(input);
      expect(policy.execution).toEqual({
        mode: "apply",
        schedule: "0 2 * * 0",
        batchSize: 500,
        maxRuntimeMinutes: 60,
      });
    });

    it("should handle optional schedule", () => {
      const input = {
        ...validInput,
        execution: {
          mode: "dry-run",
          batch_size: 1000,
          max_runtime_minutes: 30,
        },
      };
      const policy = parsePolicy(input);
      expect(policy.execution?.schedule).toBeUndefined();
    });
  });

  describe("audit config parsing", () => {
    it("should parse audit config", () => {
      const input = {
        ...validInput,
        audit: {
          log: {
            destination: "local",
            format: "json",
          },
          report: {
            include: ["policy_metadata", "execution_summary"],
          },
        },
      };
      const policy = parsePolicy(input);
      expect(policy.audit).toEqual({
        log: {
          destination: "local",
          format: "json",
        },
        report: {
          include: ["policy_metadata", "execution_summary"],
        },
      });
    });
  });

  describe("error handling", () => {
    it("should throw on invalid input", () => {
      expect(() => parsePolicy({})).toThrow();
    });

    it("should throw on invalid duration format", () => {
      const input = {
        ...validInput,
        retention: [
          {
            entity: "users",
            retain_for: "invalid",
            action: { type: "delete" },
          },
        ],
      };
      expect(() => parsePolicy(input)).toThrow("Invalid duration");
    });
  });
});
