# Architecture Overview

Retentix is designed around one core principle:

> **Compliance actions must be deterministic, explicit, and auditable.**

### High-Level Components

- Policy DSL (YAML/JSON)
- Parser + Validator (fail-fast)
- Execution Engine
- Audit Logger
- CLI Interface

There are no background services, agents, or long-running processes.

### Execution Model

- One-shot execution
- Dry-run by default
- Fail-fast validation before any side effects
- Explicit cascades for destructive operations