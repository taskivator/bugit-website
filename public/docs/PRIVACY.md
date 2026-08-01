# Privacy Policy — BugIt

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Last updated: 1 August 2026**

This policy explains what personal data is handled when you use the BugIt website
(bugit.dev), the BugIt Portal (account, purchase, and license management), and the
BugIt QA Agent software, and the choices and rights you have. It is written in plain
language and is meant to be accurate to how the product actually works.

## Who is responsible for your data

BugIt is operated under the trading name **Taskivator / BugIt**. The operational
contact for all privacy questions and requests is **support@bugit.dev**.

**The owner has elected not to publish personal controller-identification details.
This remains an accepted legal-compliance risk and has not received external legal
approval.** A trading name alone does not satisfy the legal requirement to identify
the data controller; that requirement is therefore **not** treated as satisfied by
this policy. Registered controller-identity details are not published for this
reason; where the law entitles you to them, you may request them at
support@bugit.dev.

## The short version

- The **QA Agent software runs on your machine.** Your bug reports, specs, glossary,
  screenshots, code, settings, and tickets are **not** sent to Taskivator.
- To run your account, purchase, license, and support, the **website and Portal**
  handle a limited set of personal data (your email, purchase records, license and
  device activations, and support messages), using the service providers listed
  below.
- We do **not** sell your personal data. Advertising measurement is **off by
  default** and runs only with your consent.

## What the QA Agent software sends to Taskivator

BugIt uses **browser-based activation** — you sign in to the BugIt Portal in your
browser and approve the device; **there is no license key** to enter, paste, or
store. From your device, the Software sends only license/update data:

- a **signed entitlement / device-activation record** from that Portal sign-in (so
  your device can be authorized and re-verified) and the app version,
- an **anonymous, one-way hashed device fingerprint** — a 16-character hash derived
  from basic machine attributes; it cannot be reversed to identify you or your
  hardware, and
- **only if you set one at first-run setup**, a short device/seat label you chose so
  a Team account's device authorizations can be told apart. It is never required to
  be real and is never verified. If you don't set one, nothing is sent.

These go only to the Taskivator license service, to activate/verify your seat and to
check whether a newer version is available.

## What stays entirely on your device

- Your specs, glossary, house style, and learned corrections
- Your `config.json` and local project files
- Your API tokens (kept in your operating system's credential store — never in a
  file, and never transmitted to Taskivator)

None of this is transmitted anywhere.

## What goes only to the services *you* connect

To write and file a ticket, your report text is sent to the AI model you use (GitHub
Copilot, or your own OpenAI/Anthropic key) and to the tracker you file to (such as
Jira or Azure DevOps). That is the AI and tooling **you** chose and connected — it is
never routed through, copied to, or seen by Taskivator, which is not the controller
of those services. Only the metadata needed to file (issue id/URL, and the content
you approve) is exchanged with them.

## Personal data we handle, and why (website + Portal)

| Data | Why (purpose) | Legal basis (GDPR/UK GDPR) |
|------|---------------|----------------------------|
| Account email + authentication data | Create and secure your account, sign you in, admin MFA | Contract; legitimate interest (account security) |
| Entitlements / licenses | Deliver and verify what you purchased | Contract |
| Device activations (hashed fingerprint, optional label, OS/app version) | Enforce per-device/seat limits; let you manage devices | Contract |
| Team membership + invitations | Provide the Team plan (up to 5 members) | Contract |
| Purchase / order records | Fulfil the sale, receipts, license issuance | Contract; legal obligation (accounting) |
| Payment data | Take payment (handled by Stripe — we do not store full card numbers) | Contract |
| Refunds / disputes / chargebacks | Handle refunds and payment disputes | Contract; legal obligation |
| Tax records | Meet tax/accounting obligations | Legal obligation |
| Support correspondence | Answer your questions and provide support | Contract; legitimate interest |
| Security, log, and admin-audit records | Detect abuse, protect accounts, keep an audit trail | Legitimate interest (security) |
| Provider/tracker configuration you save | Let you connect Jira/Azure DevOps etc.; we store connection metadata, not your data in those tools | Contract |
| Consent choices (cookies/ads, and their withdrawal) | Respect and evidence your choices | Consent; legal obligation (evidence) |
| Website analytics | Understand general site performance (cookieless) | Legitimate interest |
| Advertising measurement | Understand whether ads lead to purchases | Consent (off by default) |
| EU/UK immediate-delivery / withdrawal consent | Evidence your checkout acknowledgement | Legal obligation; contract |

## Service providers (processors) and international transfers

We use the following providers to run BugIt. Each processes personal data only to
provide its service to us. Where personal data is transferred outside the EEA/UK, we
rely on the provider's Data Processing Addendum and, where applicable, Standard
Contractual Clauses (or an equivalent transfer mechanism).

| Provider | Purpose | Data categories | Likely processing location | Transfer basis | Retention / deletion |
|----------|---------|-----------------|----------------------------|----------------|----------------------|
| **Supabase** | Database + authentication (accounts, entitlements, devices, orders, audit logs) | Account, entitlement, device, order, log data | United States and/or EU (project region) | DPA + SCCs where applicable | Kept while your account is active; deleted or anonymised when no longer needed (see retention table) |
| **Stripe** | Payment processing, refunds, disputes, tax calculation | Payment, billing, transaction data | United States + global | DPA + SCCs | Retained by Stripe per its policy and legal/accounting requirements |
| **Cloudflare** | Website delivery, security, cookieless web analytics | Network/technical data; aggregate analytics | Global edge network | DPA + SCCs | Short-lived; analytics is aggregate and cookieless |
| **Vercel** | Hosting the website/Portal application | Request/technical data | United States + global | DPA + SCCs | Operational logs kept short-term |
| **Resend** | Sending transactional email (receipts, license, support) | Email address, message metadata | United States | DPA + SCCs | Retained per provider policy; delivery logs short-term |
| **Google Ads** | Advertising measurement (only with consent) | Purchase value, currency, non-identifying order reference | United States + global | DPA + SCCs | Only with consent; no bug content or card data shared |

We do **not** sell personal data, and advertising measurement never receives your bug
reports, the contents of the BugIt software, or payment card details.

## How long we keep data (retention)

Where a period is not fixed by law, we keep data only as long as needed for the
purpose, then delete or anonymise it.

| Category | Retention |
|----------|-----------|
| Accounts | While active; deleted/anonymised after account deletion (subject to legal holds) |
| Authentication records | While the account is active |
| Entitlements / licenses | For the license term and a limited period afterwards for support and disputes |
| Devices / activations | While the entitlement is active; released when you remove a device or the license ends |
| Team memberships / invitations | While the Team license is active; invitations expire |
| Payments | For the license term plus the period required for accounting/tax |
| Refunds / disputes / chargebacks | For the period required to handle and evidence them, plus accounting periods |
| Tax / accounting records | As required by applicable tax law (for example, up to 7 years) |
| Security logs | A limited period sufficient for security and abuse detection |
| Admin audit logs | Retained as an integrity record for a limited period |
| Support correspondence | While needed to support you and for a limited period afterwards |
| Marketing consent | While the consent stands and for evidence afterwards |
| Consent withdrawals | Retained as evidence that a choice was respected |
| Deleted-account backups | Purged from routine backups within the normal backup rotation after deletion |

## Cookies and advertising

The website uses only essential cookies to function. Non-essential (advertising)
cookies are **off by default** and load only if you opt in via the cookie banner or
**Cookie preferences**. We use Cloudflare Web Analytics, which is cookieless and does
not track you across sites. You can change or withdraw your choice at any time.

## Your rights

Depending on where you live (for example under the EU/UK GDPR or Japan's APPI), you
may have the right to:

- **Access** the personal data we hold about you
- **Correct** inaccurate data
- **Delete** your data (and your account)
- **Restrict** or **object to** certain processing
- **Portability** — receive certain data in a portable form
- **Withdraw consent** (e.g. advertising measurement) at any time, without affecting
  prior lawful processing

To exercise any of these, email **support@bugit.dev** from your account address. You
can also **delete your account** to remove your data (subject to records we must keep
by law, such as tax records). We will respond within the time required by applicable
law.

**Complaints.** If you are in the EEA you may complain to your local data-protection
authority; in the UK, to the Information Commissioner's Office (ico.org.uk); in
Japan, to the Personal Information Protection Commission (ppc.go.jp). We would
appreciate the chance to resolve your concern first at support@bugit.dev.

## Changes

We may update this policy as the product or the law changes; the "last updated" date
above reflects the current version. Related documents: the Commercial Transactions
disclosure (特定商取引法に基づく表記) and the Refund Policy.

## Contact

Privacy questions or requests: **support@bugit.dev**. You can also open a support
ticket from your BugIt dashboard at **bugit.dev**.
