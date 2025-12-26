# Retentix

**Deterministic Data Retention & GDPR Execution Engine**

Retentix is a headless, production-grade execution engine for enforcing:

* Data Retention policies
* Right To Be Forgotten (RTBF / Erasure)
* Field-level Masking (Anonymization)

on live production databases (PostgreSQL).

No UI. No ORM. No workflow engine.

---

## Why Retentix

Most compliance tools are:

* Over-engineered
* Hard to audit
* Operationally expensive
* UI-heavy and non-deterministic

Retentix is designed for **engineering-led compliance**:

* Deterministic execution
* Fail-fast validation
* Audit-first by design
* Minimal operational surface

If a policy runs, it is correct. If not, it fails early.

---

## Design Principles

* **Deterministic Execution**
  Every run either completes successfully or fails before any side-effect.

* **Fail-Fast Validation**
  Policies and inputs are fully validated before any database interaction.

* **Audit-First**
  Every action records affected rows, timestamps, and execution mode.

* **Stateless & Headless**
  Designed for CI/CD, cron jobs, and Kubernetes jobs.

---

## What Retentix Is NOT

* ❌ Data discovery tool
* ❌ DLP platform
* ❌ UI-based compliance suite
* ❌ Continuous monitoring system

Retentix assumes you already know **what** data you own.
It focuses on **executing compliance correctly**.

---

## Supported Operations

### Retention

Delete expired data based on time-based policies.

### RTBF (Erasure)

Deterministic cascade deletion based on explicit identifiers (e.g. user_id).

### Masking

Field-level anonymization (hashing or nulling sensitive fields).

---

## Quick Start

### License Requirement

Retentix requires a valid license to run. Set the `RETENTIX_LICENSE` environment variable with your license token:

```bash
export RETENTIX_LICENSE='eyJjdXN0b21lciI6IllvdXJDb21wYW55IiwiZW52aXJvbm1lbnRzIjpbInByb2R1Y3Rpb24iXSwiZXhwaXJlc19hdCI6IjIwMjUtMTItMzFUMjM6NTk6NTkuMDAwWiIsImZlYXR1cmVzIjpbInJldGVudGlvbiIsImVyYXN1cmUiLCJtYXNraW5nIl0sImlzc3VlZF9hdCI6IjIwMjUtMDEtMDFUMDA6MDA6MDAuMDAwWiJ9.c2lnbmF0dXJlX2hlcmU='
```

The license is a compact cryptographically signed token (format: `base64(payload).base64(signature)`) that specifies:
- Customer name and environments
- Enabled features (retention, erasure, masking)
- Expiration date
- Optional rate limits

The license is verified using a public key that is hardcoded in the application. This ensures that only licenses signed with the corresponding private key (kept secure by the maintainer) are accepted.

Contact the maintainer for license information.

### Example Workflow

```bash
# 1. Validate Policy
retentix validate policy.yaml

# 2. Dry-run Retention (default)
retentix retention run policy.yaml

# 3. Execute RTBF
retentix erasure run policy.yaml --input employee_id={UUID}

# 4. Apply Masking
retentix masking run policy.yaml

# 5. Execute changes (remove dry-run)
retentix retention run policy.yaml --no-dry-run
```

---

## Audit Output

Each execution produces structured audit records:

```json
{
  "type": "erasure",
  "entity": "employee",
  "action": "delete",
  "affectedRows": 1,
  "dryRun": false,
  "timestamp": "2025-01-24T12:00:00Z"
}
```

Audit logs can be:

* Written to file
* Shipped to SIEM
* Provided directly to a DPO

---

## Security Model

* No dynamic SQL
* No joins
* No runtime expressions
* Explicit table and column mapping
* Secrets provided via environment variables

---

## Deployment Models

### Docker (Recommended)

Pull the latest image from GitHub Container Registry:

```bash
docker pull ghcr.io/yaghouti/retentix:latest
```

Run with Docker:

```bash
docker run --rm \
  -e RETENTIX_LICENSE='your-license-token-here' \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e HASH_SALT="your-secret-salt" \
  -v $(pwd)/policy.yaml:/app/policy.yaml:ro \
  -v $(pwd)/audit:/app/audit \
  ghcr.io/yaghouti/retentix:latest \
  validate /app/policy.yaml
```

Run retention with docker-compose:

```bash
docker-compose run --rm retentix retention run /app/policy.yaml
```

### Kubernetes Job

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: retentix-retention
spec:
  schedule: "0 2 * * 0"  # Weekly at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: retentix
            image: ghcr.io/yaghouti/retentix:latest
            args: ["retention", "run", "/config/policy.yaml", "--no-dry-run"]
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: retentix-secrets
                  key: database-url
            - name: RETENTIX_LICENSE
              valueFrom:
                secretKeyRef:
                  name: retentix-secrets
                  key: license
            volumeMounts:
            - name: config
              mountPath: /config
              readOnly: true
          volumes:
          - name: config
            configMap:
              name: retentix-policy
          restartPolicy: OnFailure
```

### Other Deployment Options

* CI/CD pipelines (GitHub Actions, GitLab CI)
* Cron jobs (traditional Unix cron)
* Air-gapped environments (offline Docker images)

---

## Typical Use Cases

* EU-based SaaS companies
* FinTech and HealthTech
* Organizations with internal DPOs
* Engineering-driven compliance teams

---

## Licensing

Retentix is licensed as:

* Annual subscription
* Per environment (dev / staging / prod)
* No vendor lock-in

---

## Support Philosophy

Retentix is intentionally minimal.

If ongoing support is required, it usually indicates:

* Incorrect policy design
* Unclear data ownership

The tool itself is designed to be operationally silent.

---

## Summary

Retentix enables **compliance as code**:

* Predictable
* Auditable
* Automatable

Built for teams that value correctness over dashboards.

---

## Technical Documentation

For developers, contributors, and technical implementation details, see the [Developer README](../README.md).

