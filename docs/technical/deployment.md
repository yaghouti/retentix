# Deployment Guide

Retentix is designed for self-hosted deployment in your infrastructure. No SaaS dependency required.

## Prerequisites

### Database Requirements

**PostgreSQL Database:**
- PostgreSQL 12 or higher
- **pgcrypto extension** (required for hash masking strategy)

**Enable pgcrypto:**
```sql
-- Run this on your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Verify extension:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```

**Note:** The pgcrypto extension is included by default in most PostgreSQL installations but must be explicitly enabled per database.

---

## Deployment Options

### 1. Docker (Recommended)

**Pull the image:**
```bash
docker pull ghcr.io/yaghouti/retentix:latest
```

**Run a command:**
```bash
docker run --rm \
  -e RETENTIX_LICENSE="$RETENTIX_LICENSE" \
  -e DATABASE_URL="$DATABASE_URL" \
  -v $(pwd)/policy.yaml:/policy.yaml \
  -v $(pwd)/audit.jsonl:/audit.jsonl \
  ghcr.io/yaghouti/retentix:latest \
  retention run /policy.yaml --no-dry-run
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  retentix:
    image: ghcr.io/yaghouti/retentix:latest
    environment:
      RETENTIX_LICENSE: ${RETENTIX_LICENSE}
      DATABASE_URL: postgresql://user:pass@db:5432/production
      AUDIT_PATH: /data/audit.jsonl
    volumes:
      - ./policy.yaml:/policy.yaml:ro
      - ./audit-logs:/data
    command: retention run /policy.yaml --no-dry-run

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: production
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro

volumes:
  pgdata:
```

**init-db.sql:**
```sql
-- Enable pgcrypto extension for hash masking
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

### 2. Kubernetes

**ConfigMap for policy:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: retentix-policy
  namespace: compliance
data:
  policy.yaml: |
    metadata:
      name: production-retention
      version: "1.0"
      environment: production
    retention:
      - entity: users
        table: users
        condition: "deleted_at < NOW() - INTERVAL '90 days'"
        action:
          kind: delete
```

**CronJob for scheduled execution:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: retentix-retention
  namespace: compliance
spec:
  schedule: "0 2 * * 0"  # Every Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: retentix
            image: ghcr.io/yaghouti/retentix:latest
            command:
              - node
              - --experimental-strip-types
              - cli/index.ts
              - retention
              - run
              - /config/policy.yaml
              - --no-dry-run
            env:
            - name: RETENTIX_LICENSE
              valueFrom:
                secretKeyRef:
                  name: retentix-license
                  key: license
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: retentix-db
                  key: url
            - name: AUDIT_PATH
              value: /audit/audit.jsonl
            volumeMounts:
            - name: policy
              mountPath: /config
              readOnly: true
            - name: audit
              mountPath: /audit
          volumes:
          - name: policy
            configMap:
              name: retentix-policy
          - name: audit
            persistentVolumeClaim:
              claimName: retentix-audit-logs
```

**Secrets:**
```bash
# Create license secret
kubectl create secret generic retentix-license \
  --from-literal=license="$RETENTIX_LICENSE" \
  -n compliance

# Create database secret
kubectl create secret generic retentix-db \
  --from-literal=url="$DATABASE_URL" \
  -n compliance
```

**PersistentVolumeClaim for audit logs:**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: retentix-audit-logs
  namespace: compliance
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

---

### 3. Systemd Service (Linux)

**Service file (`/etc/systemd/system/retentix-retention.service`):**
```ini
[Unit]
Description=Retentix Retention Execution
After=network.target postgresql.service

[Service]
Type=oneshot
User=retentix
Group=retentix
EnvironmentFile=/etc/retentix/env
ExecStart=/usr/local/bin/docker run --rm \
  -e RETENTIX_LICENSE \
  -e DATABASE_URL \
  -v /opt/retentix/policy.yaml:/policy.yaml:ro \
  -v /var/log/retentix:/data \
  ghcr.io/yaghouti/retentix:latest \
  retention run /policy.yaml --no-dry-run

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Timer file (`/etc/systemd/system/retentix-retention.timer`):**
```ini
[Unit]
Description=Run Retentix Retention Weekly
Requires=retentix-retention.service

[Timer]
OnCalendar=Sun *-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Enable and start:**
```bash
sudo systemctl enable retentix-retention.timer
sudo systemctl start retentix-retention.timer
sudo systemctl status retentix-retention.timer
```

---

### 4. GitHub Actions

**Workflow file (`.github/workflows/retention.yml`):**
```yaml
name: Weekly Retention

on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM
  workflow_dispatch:  # Allow manual trigger

jobs:
  retention:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run Retentix Retention
        run: |
          docker run --rm \
            -e RETENTIX_LICENSE="${{ secrets.RETENTIX_LICENSE }}" \
            -e DATABASE_URL="${{ secrets.DATABASE_URL }}" \
            -v $(pwd)/policy.yaml:/policy.yaml:ro \
            ghcr.io/yaghouti/retentix:latest \
            retention run /policy.yaml --no-dry-run

      - name: Upload Audit Log
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: audit-log-${{ github.run_number }}
          path: audit.jsonl
          retention-days: 90
```

---

## Security Considerations

### 1. License Storage

**✅ Recommended:**
- Store in secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Use Kubernetes Secrets with encryption at rest
- Use GitHub Actions encrypted secrets

**❌ Avoid:**
- Committing to git
- Storing in plain text configuration files
- Sharing across environments

### 2. Database Credentials

**✅ Recommended:**
- Use IAM authentication (AWS RDS, Cloud SQL)
- Rotate credentials regularly
- Use read-write user with minimal permissions
- Separate credentials per environment

**❌ Avoid:**
- Using superuser/admin accounts
- Sharing credentials across services
- Hardcoding in scripts

### 3. Audit Logs

**✅ Recommended:**
- Store on persistent volume
- Ship to SIEM (Splunk, ELK, etc.)
- Verify integrity regularly with `verify-audit`
- Set immutable flag on files (Linux: `chattr +i`)

**❌ Avoid:**
- Storing only in container filesystem
- Allowing write access to audit logs
- Deleting audit logs

### 4. Network Isolation

**✅ Recommended:**
- Run in private network/VPC
- Restrict database access to Retentix only
- Use network policies in Kubernetes
- No inbound network access required

---

## Monitoring & Alerting

### Exit Code Monitoring

```bash
# Check exit code
docker run ... retentix retention run policy.yaml
if [ $? -ne 0 ]; then
  echo "Retentix execution failed"
  # Send alert
fi
```

### Audit Log Monitoring

```bash
# Verify audit log integrity
docker run ... retentix verify-audit /data/audit.jsonl
if [ $? -ne 0 ]; then
  echo "Audit log tampered!"
  # Send critical alert
fi
```

### Prometheus Metrics (Custom)

You can parse audit logs and expose metrics:

```bash
# Count executions
cat audit.jsonl | jq -r '.type' | sort | uniq -c

# Count affected rows
cat audit.jsonl | jq -r 'select(.type=="retention") | .affectedRows' | awk '{sum+=$1} END {print sum}'
```

---

## Backup Strategy

### Before Execution

```bash
# PostgreSQL backup
pg_dump -h localhost -U user -d production > backup-$(date +%Y%m%d).sql

# Run Retentix
docker run ... retentix retention run policy.yaml --no-dry-run

# Verify
docker run ... retentix verify-audit audit.jsonl
```

### Audit Log Backup

```bash
# Daily backup to S3
aws s3 cp audit.jsonl s3://compliance-audit-logs/$(date +%Y/%m/%d)/audit.jsonl

# Verify backup
aws s3 cp s3://compliance-audit-logs/$(date +%Y/%m/%d)/audit.jsonl - | \
  docker run -i ... retentix verify-audit /dev/stdin
```

---

## Performance Tuning

### Database Connection

```bash
# Use connection pooling
DATABASE_URL="postgresql://user:pass@localhost:5432/db?pool_max=10"
```

### Batch Size

For large datasets, consider:
- Running retention in smaller batches
- Using database-specific optimizations
- Monitoring query performance

### Dry Run First

Always dry-run to estimate impact:

```bash
# Dry run
docker run ... retentix retention run policy.yaml

# Check output
# If affectedRows is very large, consider batching
```

---

## Troubleshooting

### Container Fails to Start

```bash
# Check logs
docker logs <container-id>

# Verify license
echo $RETENTIX_LICENSE | base64 -d

# Test database connection
docker run --rm -e DATABASE_URL="$DATABASE_URL" postgres:16 \
  psql "$DATABASE_URL" -c "SELECT 1"
```

### Audit Log Issues

```bash
# Check permissions
ls -la audit.jsonl

# Verify log format
head -1 audit.jsonl | jq .

# Verify integrity
docker run ... retentix verify-audit audit.jsonl
```

---

## Air-Gapped Deployment

For regulated environments without internet access:

1. **Transfer Docker image:**
   ```bash
   # On internet-connected machine
   docker pull ghcr.io/yaghouti/retentix:latest
   docker save ghcr.io/yaghouti/retentix:latest > retentix.tar
   
   # Transfer retentix.tar to air-gapped environment
   
   # On air-gapped machine
   docker load < retentix.tar
   ```

2. **License verification:**
   - No network callback required
   - Offline signature verification using Ed25519

3. **No telemetry:**
   - Retentix makes no outbound network calls
   - All execution is local

---

## See Also

- [CLI Reference](./cli-reference.md)
- [Security Model](./security.md)
- [Architecture Overview](./architecture.md)

