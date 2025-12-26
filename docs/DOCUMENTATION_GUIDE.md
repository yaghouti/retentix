# Documentation Organization Guide

This document explains the new documentation structure and how to maintain it.

## 📁 Structure Overview

```
docs/
├── README.md                          # 📖 Main documentation index
│
├── technical/                         # 🔧 For developers & operators
│   ├── architecture.md               # System design principles
│   ├── cli-reference.md              # Complete CLI documentation
│   ├── deployment.md                 # Production deployment guide
│   ├── execution-engine.md           # Engine internals
│   ├── licensing.md                  # License system
│   ├── policy-dsl.md                 # Policy language reference
│   └── security.md                   # Security model
│
├── product/                          # 📦 For customers & prospects
│   └── overview.md                   # Product overview
│
└── business/                         # 💼 For sales & marketing
    ├── pitch.md                      # 1-page pitch (markdown)
    ├── pitch.pdf                     # 1-page pitch (PDF)
    ├── pitch-style.css               # PDF styling
    ├── positioning.md                # Market positioning
    ├── pilot-program.md              # Pilot structure
    ├── roadmap.md                    # Product roadmap
    └── outreach/                     # Sales materials
        ├── guide.md                  # Outreach best practices
        └── templates.md              # Email templates
```

## 🎯 Documentation by Audience

### Technical Documentation (`technical/`)

**Audience:** Developers, DevOps engineers, SREs, CTOs

**Purpose:** Enable implementation, deployment, and operation

**Key Files:**
- `cli-reference.md` - Most comprehensive, includes all commands, examples, and troubleshooting
- `deployment.md` - Docker, Kubernetes, CI/CD, production patterns
- `architecture.md` - System design and principles
- `security.md` - Threat model and controls

**Maintenance:**
- Update when adding new features
- Keep CLI examples accurate
- Validate all code snippets
- Update troubleshooting sections

### Product Documentation (`product/`)

**Audience:** Customers, prospects, decision-makers

**Purpose:** Explain what Retentix is and why it matters

**Key Files:**
- `overview.md` - Customer-facing product description

**Maintenance:**
- Keep feature list current
- Update use cases with real examples
- Maintain deployment model descriptions

### Business Documentation (`business/`)

**Audience:** Sales, marketing, investors, prospects

**Purpose:** Enable sales, positioning, and business development

**Key Files:**
- `pitch.md` / `pitch.pdf` - Executive summary
- `positioning.md` - Competitive differentiation
- `pilot-program.md` - Sales structure
- `outreach/templates.md` - Cold outreach emails

**Maintenance:**
- Update pricing when it changes
- Refresh positioning based on market feedback
- Update roadmap quarterly
- Test email templates and track metrics

## 📝 Documentation Standards

### Writing Style

**Technical Docs:**
- Be precise and accurate
- Include working code examples
- Provide troubleshooting steps
- Use consistent terminology

**Product Docs:**
- Be clear and benefit-focused
- Avoid jargon
- Use real-world examples
- Focus on outcomes

**Business Docs:**
- Be concise and compelling
- Lead with value proposition
- Use bullet points
- Include concrete numbers

### Code Examples

All code examples must:
1. Be tested and working
2. Include necessary context
3. Show expected output
4. Handle errors appropriately

### Links

- Use relative links within docs
- Keep external links current
- Verify links before committing
- Use descriptive link text

## 🔄 Maintenance Workflow

### When Adding Features

1. Update `technical/cli-reference.md` if CLI changes
2. Update `technical/architecture.md` if design changes
3. Update `product/overview.md` if user-facing
4. Update `business/roadmap.md` to mark as completed
5. Add examples to `examples/` if applicable

### When Changing Deployment

1. Update `technical/deployment.md`
2. Update Docker examples in `README.md`
3. Update `technical/cli-reference.md` if env vars change

### When Changing Pricing

1. Update `business/pilot-program.md`
2. Update `business/pitch.md`
3. Regenerate `business/pitch.pdf`

### Quarterly Review

- Review `business/roadmap.md` and update
- Check `business/positioning.md` against market
- Update `business/outreach/templates.md` based on metrics
- Verify all links are working
- Update version numbers

## 🚀 Quick Tasks

### Regenerate Pitch PDF

```bash
cd /Users/majidyaghouti/Projects/Personal/Retentix
npx md-to-pdf docs/business/pitch.md \
  --stylesheet docs/business/pitch-style.css \
  --pdf-options '{"format": "A4", "margin": {"top": "12mm", "right": "12mm", "bottom": "12mm", "left": "12mm"}}'
```

### Find All TODOs in Docs

```bash
grep -r "TODO\|FIXME\|XXX" docs/
```

### Validate All Links

```bash
# Install markdown-link-check
npm install -g markdown-link-check

# Check all markdown files
find docs -name "*.md" -exec markdown-link-check {} \;
```

### Check Documentation Coverage

Ensure every major feature has:
- [ ] Technical documentation
- [ ] CLI reference entry
- [ ] Example usage
- [ ] Deployment guidance

## 📊 Documentation Metrics

Track these to ensure quality:

1. **Completeness:** Every feature documented?
2. **Accuracy:** All examples tested?
3. **Freshness:** Updated in last 90 days?
4. **Usability:** Can users find what they need?

## 🎓 Best Practices

### Do ✅

- Write for your audience
- Include working examples
- Keep it up to date
- Use consistent formatting
- Link to related docs
- Provide troubleshooting

### Don't ❌

- Duplicate information
- Use outdated examples
- Assume prior knowledge
- Skip error handling
- Break links
- Use jargon without explanation

## 🔍 Finding Documentation

### For Developers

Start at: `docs/README.md` → Technical section

### For Customers

Start at: `docs/README.md` → Product section

### For Sales

Start at: `docs/README.md` → Business section

### For Specific Topics

Use the search function or check the index in `docs/README.md`

## 📞 Questions?

If you're unsure where documentation belongs:

- **Technical implementation?** → `technical/`
- **Customer-facing features?** → `product/`
- **Sales/marketing materials?** → `business/`
- **Code-specific details?** → Inline comments or module README

---

**Last Updated:** December 2025  
**Maintained By:** Core Team

