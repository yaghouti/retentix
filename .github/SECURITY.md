# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Retentix seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Please DO:

1. **Report via GitHub Security Advisories**:
   - Go to https://github.com/yaghouti/Retentix/security/advisories/new
   - Fill out the form with details about the vulnerability

2. **Or Email**: Send details to the project maintainer at the email listed in package.json

### What to Include:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### Response Timeline:

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Within 60 days

## Security Best Practices

When using Retentix, please follow these security best practices:

### Environment Variables

- Never commit `.env` files or expose environment variables
- Use secure methods to manage secrets (e.g., AWS Secrets Manager, HashiCorp Vault)
- Rotate credentials regularly

### Database Connections

- Use read-only database credentials when possible
- Implement connection pooling with appropriate limits
- Use SSL/TLS for database connections
- Follow the principle of least privilege

### Policy Files

- Store policy YAML files securely
- Review policy changes carefully before deployment
- Use version control for policy files
- Implement approval workflows for policy changes

### Execution

- Always test policies in `dry-run` mode first
- Monitor execution logs for anomalies
- Set appropriate `max_runtime_minutes` limits
- Use reasonable `batch_size` values

### Data Handling

- Ensure proper anonymization strategies
- Verify erasure operations complete successfully
- Maintain audit logs securely
- Comply with data protection regulations (GDPR, CCPA, etc.)

## Known Security Considerations

### SQL Injection

Retentix does not execute dynamic SQL queries. However, when implementing execution logic:
- Always use parameterized queries
- Validate all inputs
- Never concatenate user input into SQL

### Data Exposure

- Policy files may contain sensitive information (table names, field names)
- Audit logs may contain metadata about deleted records
- Store these securely and restrict access

### Denial of Service

- Large batch sizes can impact database performance
- Set appropriate `max_runtime_minutes` to prevent runaway processes
- Monitor resource usage

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Updates will be announced via:

- GitHub Security Advisories
- Release notes
- Project README

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible

We will credit security researchers who report vulnerabilities responsibly.

## Compliance

Retentix is designed to help with GDPR compliance, but using it does not guarantee compliance. Organizations must:

- Conduct their own compliance assessments
- Implement appropriate security measures
- Maintain proper documentation
- Follow data protection regulations

## Contact

For security concerns, please use GitHub Security Advisories or contact the maintainers directly.

Thank you for helping keep Retentix and its users safe!

