import { describe, expect, it } from "vitest";
import { PolicySchema } from "./schema.ts";

describe("PolicySchema", () => {
  const validPolicy = {
    version: 1,
    policy: {
      name: "Test Policy",
      owner: "test@example.com",
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

  describe("valid policies", () => {
    it("should validate a minimal valid policy", () => {
      const result = PolicySchema.safeParse(validPolicy);
      expect(result.success).toBe(true);
    });

    it("should validate policy with retention rules", () => {
      const policyWithRetention = {
        ...validPolicy,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "delete" },
          },
        ],
      };
      const result = PolicySchema.safeParse(policyWithRetention);
      expect(result.success).toBe(true);
    });

    it("should validate policy with masking", () => {
      const policyWithMasking = {
        ...validPolicy,
        masking: {
          strategies: {
            hash_strategy: {
              type: "hash",
              algorithm: "sha256",
              salt: "env:SALT",
            },
          },
          rules: [
            {
              entity: "users",
              fields: {
                email: { strategy: "hash_strategy" },
              },
            },
          ],
        },
      };
      const result = PolicySchema.safeParse(policyWithMasking);
      expect(result.success).toBe(true);
    });

    it("should validate policy with erasure", () => {
      const policyWithErasure = {
        ...validPolicy,
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
          ],
        },
      };
      const result = PolicySchema.safeParse(policyWithErasure);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid policies", () => {
    it("should reject policy with wrong version", () => {
      const invalid = { ...validPolicy, version: 2 };
      const result = PolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject policy with invalid email", () => {
      const invalid = {
        ...validPolicy,
        policy: { ...validPolicy.policy, owner: "not-an-email" },
      };
      const result = PolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject policy with invalid date format", () => {
      const invalid = {
        ...validPolicy,
        policy: { ...validPolicy.policy, effective_from: "2024/01/01" },
      };
      const result = PolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject policy with invalid env reference", () => {
      const invalid = {
        ...validPolicy,
        sources: {
          test_db: {
            type: "postgres",
            connection: "DATABASE_URL", // missing env: prefix
          },
        },
      };
      const result = PolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject policy with invalid duration format", () => {
      const invalid = {
        ...validPolicy,
        retention: [
          {
            entity: "users",
            retain_for: "7 weeks", // invalid unit
            action: { type: "delete" },
          },
        ],
      };
      const result = PolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("cross-field validation", () => {
    it("should reject entity referencing non-existent source", () => {
      const invalid = {
        ...validPolicy,
        entities: {
          users: {
            source: "non_existent_db",
            table: "users",
            primary_key: "id",
            created_at: "created_at",
          },
        },
      };
      const result = PolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject retention rule referencing non-existent entity", () => {
      const invalid = {
        ...validPolicy,
        retention: [
          {
            entity: "non_existent_entity",
            retain_for: "7 years",
            action: { type: "delete" },
          },
        ],
      };
      const result = PolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject masking rule referencing non-existent strategy", () => {
      const invalid = {
        ...validPolicy,
        masking: {
          strategies: {
            hash_strategy: {
              type: "hash",
              algorithm: "sha256",
              salt: "env:SALT",
            },
          },
          rules: [
            {
              entity: "users",
              fields: {
                email: { strategy: "non_existent_strategy" },
              },
            },
          ],
        },
      };
      const result = PolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("retention actions", () => {
    it("should validate delete action", () => {
      const policy = {
        ...validPolicy,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "delete" },
          },
        ],
      };
      const result = PolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    it("should validate none action", () => {
      const policy = {
        ...validPolicy,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "none" },
          },
        ],
      };
      const result = PolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    it("should validate anonymize action with fields", () => {
      const policy = {
        ...validPolicy,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "anonymize", fields: ["email", "phone"] },
          },
        ],
      };
      const result = PolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    it("should reject anonymize action without fields", () => {
      const policy = {
        ...validPolicy,
        retention: [
          {
            entity: "users",
            retain_for: "7 years",
            action: { type: "anonymize", fields: [] },
          },
        ],
      };
      const result = PolicySchema.safeParse(policy);
      expect(result.success).toBe(false);
    });
  });

  describe("masking strategies", () => {
    it("should validate hash strategy with sha256", () => {
      const policy = {
        ...validPolicy,
        masking: {
          strategies: {
            hash_sha256: {
              type: "hash",
              algorithm: "sha256",
              salt: "env:SALT",
            },
          },
          rules: [],
        },
      };
      const result = PolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    it("should validate hash strategy with sha512", () => {
      const policy = {
        ...validPolicy,
        masking: {
          strategies: {
            hash_sha512: {
              type: "hash",
              algorithm: "sha512",
              salt: "env:SALT",
            },
          },
          rules: [],
        },
      };
      const result = PolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    it("should validate null strategy", () => {
      const policy = {
        ...validPolicy,
        masking: {
          strategies: {
            nullify: {
              type: "null",
            },
          },
          rules: [],
        },
      };
      const result = PolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });
  });

  describe("execution config", () => {
    it("should use default values", () => {
      const result = PolicySchema.parse(validPolicy);
      expect(result.execution).toBeUndefined();
    });

    it("should validate execution config with defaults", () => {
      const policy = {
        ...validPolicy,
        execution: {},
      };
      const result = PolicySchema.parse(policy);
      expect(result.execution?.mode).toBe("dry-run");
      expect(result.execution?.batch_size).toBe(1000);
      expect(result.execution?.max_runtime_minutes).toBe(30);
    });

    it("should validate execution config with custom values", () => {
      const policy = {
        ...validPolicy,
        execution: {
          mode: "apply",
          schedule: "0 2 * * 0",
          batch_size: 500,
          max_runtime_minutes: 60,
        },
      };
      const result = PolicySchema.parse(policy);
      expect(result.execution?.mode).toBe("apply");
      expect(result.execution?.batch_size).toBe(500);
      expect(result.execution?.max_runtime_minutes).toBe(60);
    });

    it("should reject invalid batch size", () => {
      const policy = {
        ...validPolicy,
        execution: {
          batch_size: 20000, // exceeds max of 10000
        },
      };
      const result = PolicySchema.safeParse(policy);
      expect(result.success).toBe(false);
    });
  });
});
