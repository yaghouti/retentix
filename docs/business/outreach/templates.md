# Subject line options (rotate)

## Option 1 (CTO):

Deterministic GDPR execution in production (no dashboard)

## Option 2 (DPO):

How engineering teams execute RTBF deterministically

## Option 3 (Neutral):

GDPR execution as code — short technical note

# Cold Outreach Email (Primary Version)

**To:** CTO / Head of Engineering / DPO

Hello {{FirstName}},

I’m reaching out because teams similar to yours often struggle with the execution side of GDPR — not visibility or reporting, but deterministic deletions and anonymization in production systems.

We built PolicyCTL, a headless execution engine that treats GDPR compliance as code.
It runs retention, RTBF (erasure), and field-level masking as one-shot, auditable jobs — no UI, no SaaS dependency, no background agents.

Engineering teams use it in CI/CD or scheduled jobs; DPOs rely on the audit trail.

I’ve attached a short one-page technical overview.
If this is relevant, I’d be happy to walk through how teams deploy it in production (15 minutes).

Best regards,
{{Your Name}}

# Follow-up #1 (after 5–7 days)

**Subject:** Re: GDPR execution in production

Hi {{FirstName}},

Just following up in case my previous note got buried.

Quick clarification: PolicyCTL doesn’t discover data or generate reports.
It executes legally irreversible actions deterministically, with fail-fast validation and full auditability.

That distinction is why it’s typically evaluated by both Engineering and the DPO together.

Happy to explain the model if useful.

Best,
{{Your Name}}

# Follow-up #2 (Final, polite exit)

**Subject:** Closing the loop

Hi {{FirstName}},

I’ll close the loop here.

If deterministic execution of retention / RTBF becomes a priority later, feel free to reach out — happy to share implementation details or run a short pilot.

Best of luck,
{{Your Name}}