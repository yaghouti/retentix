# Execution Engine

The execution engine applies validated policies against configured data sources.

### Key Guarantees

- Deterministic behavior
- Ordered execution
- Transaction boundaries where supported
- Full auditability

### Supported Executions

- Retention execution
- RTBF (Erasure)
- Field-level masking

Each execution produces an immutable audit record.