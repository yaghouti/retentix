# Policy DSL

Policies define *what* Retentix is allowed to do.

They are declarative, explicit, and environment-scoped.

### Core Concepts

- Retention rules (time-based)
- Erasure rules (RTBF)
- Masking rules (field-level)

### Design Constraints

- No implicit cascades
- No dynamic queries
- All destructive actions must be declared

Policies are validated using Zod schemas before execution.