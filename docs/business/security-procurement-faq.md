# Retentix – Security & Procurement FAQ (EU-Style)

**Audience:** Security, Legal, Procurement, DPO, CTO  
**Scope:** Enterprise evaluation and vendor approval  
**Tone:** Factual, verifiable, non-marketing

---

## Product & Architecture

### What type of product is Retentix?

Retentix is a **headless, self-hosted execution engine** for GDPR compliance.

It runs as a **one-shot CLI process** (typically via Docker) and executes explicitly defined data retention, erasure (RTBF), and masking policies directly against customer-controlled data stores.

It is not a SaaS service, background agent, or continuously running platform.

---

### Does Retentix require outbound network access?

No.

Retentix operates fully offline:
- No outbound network calls
- No telemetry
- No activation or license server

It is suitable for **air-gapped** and restricted environments.

---

### Is Retentix multi-tenant?

No.

Each customer deploys Retentix in their own environment. There is no shared infrastructure or shared data plane.

---

## Data Access & Processing

### Does Retentix store customer data?

No.

Retentix:
- Does not persist customer data
- Does not cache records
- Does not replicate databases

It only processes data **in-place** during execution and emits audit metadata.

---

### What data does Retentix write?

Only **audit logs**, containing:
- execution timestamps
- policy identifiers
- affected tables / fields
- row counts (not row contents)

No personal data is written to audit logs by default.

---

### Does Retentix modify data automatically or continuously?

No.

All executions are:
- manually triggered
- explicitly scoped
- dry-run validated before execution

There are no background or implicit actions.

---

## Security Controls

### How is unsafe execution prevented?

Retentix enforces **fail-fast validation** before execution:

- Policy schema validation
- Environment validation
- License scope validation
- Explicit cascade verification

If validation fails, execution is aborted before any side effects occur.

---

### How is policy integrity ensured?

Policies are:
- checksummed at load time
- referenced by hash in audit logs
- immutable during execution

This prevents undetected policy tampering.

---

### Is encryption used?

Yes, where applicable:

- License files are cryptographically signed (Ed25519)
- Audit logs can be stored on encrypted volumes (customer-managed)

Data-at-rest and data-in-transit encryption depend on the customer’s infrastructure.

---

## Licensing & Commercial Controls

### How does licensing work?

Retentix uses **offline, signed license files**:

- Cryptographic signature (Ed25519)
- Feature-scoped
- Environment-scoped
- Expiry-based

No license server or callbacks are used.

---

### What happens when a license expires?

Upon expiry:
- Execution commands are blocked
- Validation and dry-run remain available

No data is modified after expiry.

---

### Can licenses be audited?

Yes.

License payloads are:
- human-readable (JSON)
- cryptographically verifiable
- logged at execution time

---

## Compliance & Legal

### Is Retentix GDPR-compliant?

Retentix is a **technical execution tool**, not a legal advisor.

It enables customers to:
- execute GDPR obligations deterministically
- generate auditable evidence of compliance actions

Legal compliance remains the customer’s responsibility.

---

### Does Retentix process personal data as a processor?

Retentix runs **entirely within the customer’s infrastructure**.

The vendor does not access, process, or store customer data.

In most cases, no data processing agreement (DPA) is required.

---

## Operations & Support

### What operational effort is required?

Minimal:
- No upgrades forced
- No runtime monitoring required
- No vendor-managed infrastructure

Typical usage is via scheduled jobs or CI/CD pipelines.

---

### What support is included?

Depending on license tier:

- Email-based support
- Best-effort response
- No on-call or SLA unless contractually agreed

---

### How are updates delivered?

- As versioned Docker images
- Customer-controlled rollout
- No automatic updates

---

## Risk & Exit

### What happens if we stop using Retentix?

Nothing persists beyond your environment.

- No vendor lock-in
- No data export required
- Audit logs remain under your control

---

### What is the vendor risk profile?

Retentix is designed to minimize vendor dependency:

- Offline operation
- No SaaS backend
- Deterministic execution

This significantly reduces operational and continuity risk.

---

## Summary

Retentix is designed to satisfy EU enterprise expectations around:

- Security
- Auditability
- Data sovereignty
- Operational independence

It is intentionally minimal, explicit, and verifiable.

---

**Contact:**  
Security and procurement questions can be addressed during the pilot or evaluation phase.

