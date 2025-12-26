# Retentix Documentation

Welcome to the Retentix documentation. Choose your path based on your role:

## 🎯 Quick Start by Role

### For Developers & Operators
Start here if you're implementing or operating Retentix:
1. [Architecture Overview](./technical/architecture.md) - Understand the system design
2. [CLI Reference](./technical/cli-reference.md) - Learn the commands
3. [Deployment Guide](./technical/deployment.md) - Deploy to your infrastructure

### For Product Evaluation
Start here if you're evaluating Retentix for your organization:
1. [Product Overview](./product/overview.md) - What is Retentix
2. [1-Page Pitch](./business/pitch.pdf) - Executive summary (PDF)
3. [Pilot Program](./business/pilot-program.md) - How to get started

### For Sales & Marketing
Start here if you're reaching out to prospects:
1. [Positioning](./business/positioning.md) - Market positioning
2. [Outreach Guide](./business/outreach/guide.md) - Best practices
3. [Email Templates](./business/outreach/templates.md) - Ready-to-use emails

---

## 📚 Documentation Structure

### Technical Documentation

For developers, operators, and technical decision-makers:

- **[Architecture Overview](./technical/architecture.md)**  
  System design principles, components, and execution model

- **[CLI Reference](./technical/cli-reference.md)**  
  Complete command-line interface documentation with examples

- **[Policy DSL](./technical/policy-dsl.md)**  
  Policy language reference for defining retention, erasure, and masking rules

- **[Execution Engine](./technical/execution-engine.md)**  
  How the engine applies policies deterministically

- **[Security Model](./technical/security.md)**  
  Threat model, controls, and security guarantees

- **[Licensing](./technical/licensing.md)**  
  License format, verification, run limits, and security

- **[Deployment Guide](./technical/deployment.md)**  
  Docker, Kubernetes, CI/CD, and production deployment patterns

- **[Audit Log Documentation](../engine/AUDIT.md)**  
  Tamper-evident audit logging with hash chains

---

### Product Documentation

For customers, prospects, and product evaluation:

- **[Product Overview](./product/overview.md)**  
  What Retentix is, what it does, and what it doesn't do

---

### Business Documentation

For sales, marketing, and business development:

- **[1-Page Pitch](./business/pitch.md)** ([PDF](./business/pitch.pdf))  
  Executive summary for investors and prospects

- **[Market Positioning](./business/positioning.md)**  
  How Retentix differs from competitors

- **[Pilot Program](./business/pilot-program.md)**  
  30-day pilot structure and pricing

- **[Security & Procurement FAQ](./business/security-procurement-faq.md)**  
  Enterprise evaluation questions (Security, Legal, DPO, Procurement)

- **[Product Roadmap](./business/roadmap.md)**  
  Planned features and strategic direction

#### Outreach Materials

- **[Outreach Guide](./business/outreach/guide.md)**  
  Best practices, ICP, targeting, and expected metrics

- **[Email Templates](./business/outreach/templates.md)**  
  Ready-to-use cold outreach and follow-up emails

---

### Vendor Documentation

For license generation and vendor operations:

- **[Vendor CLI](../vendor/README.md)**  
  How to generate key pairs and sign licenses

---

### Examples

Sample policies and usage examples:

- **[Examples](../examples/README.md)**  
  Sample GDPR-compliant HR retention policy

---

## 🔗 External Links

- **[GitHub Repository](https://github.com/yaghouti/Retentix)**
- **[Docker Images](https://github.com/yaghouti/Retentix/pkgs/container/retentix)**
- **[License Documentation](./technical/licensing.md)**

---

## 📖 Common Workflows

### Deploying Retentix

1. Read [Architecture Overview](./technical/architecture.md)
2. Review [Security Model](./technical/security.md)
3. Follow [Deployment Guide](./technical/deployment.md)
4. Reference [CLI Documentation](./technical/cli-reference.md)

### Writing Policies

1. Understand [Policy DSL](./technical/policy-dsl.md)
2. Review [Examples](../examples/README.md)
3. Use `retentix validate` to test
4. Start with dry-run mode

### Evaluating Retentix

1. Read [Product Overview](./product/overview.md)
2. Review [1-Page Pitch](./business/pitch.pdf)
3. Understand [Pilot Program](./business/pilot-program.md)
4. Check [Roadmap](./business/roadmap.md)

### Selling Retentix

1. Understand [Market Positioning](./business/positioning.md)
2. Read [Outreach Guide](./business/outreach/guide.md)
3. Use [Email Templates](./business/outreach/templates.md)
4. Reference [Pilot Program](./business/pilot-program.md) for pricing

---

## 🆘 Getting Help

### For Technical Issues

1. Check [CLI Reference](./technical/cli-reference.md) troubleshooting section
2. Review [Deployment Guide](./technical/deployment.md) for common issues
3. Verify [Security Model](./technical/security.md) requirements are met

### For Business Inquiries

- **Sales:** See [Pilot Program](./business/pilot-program.md)
- **Partnerships:** Review [Positioning](./business/positioning.md)
- **Licensing:** Check [Licensing Model](./technical/licensing.md)

---

## 📝 Contributing to Documentation

Documentation improvements are welcome! Please ensure:

1. **Technical docs** are accurate and tested
2. **Business docs** reflect current positioning
3. **Examples** are validated and working
4. **Links** are correct and up-to-date

---

## 🗂️ Documentation Maintenance

This documentation is organized by audience:

- **`technical/`** - For developers and operators
- **`product/`** - For customers and prospects
- **`business/`** - For sales and marketing
- **`../vendor/`** - For vendor operations only
- **`../engine/`** - For engine-specific technical docs
- **`../license/`** - For license system documentation
- **`../examples/`** - For sample policies and usage

Each section is self-contained and can be read independently.

---

**Last Updated:** December 2025  
**Version:** 1.0

