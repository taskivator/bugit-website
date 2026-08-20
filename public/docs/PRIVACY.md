# Privacy Policy for BugIt

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Last updated: 2 August 2026**

This policy explains what personal data we handle when you use the BugIt website
(bugit.dev), the BugIt Portal (your account, purchase, and license management), and
the BugIt QA Agent software, and what choices and rights you have.

## Operator and privacy contact

BugIt is operated under the Taskivator trading name. Privacy questions, personal
data requests, and requests for the operator's legal name and business contact
details may be sent to [support@bugit.dev](mailto:support@bugit.dev). Requested
operator information will be provided without delay.

## In short

- The BugIt software runs on your own machine. Your bug reports, specs, glossary,
  screenshots, code, settings, and tickets are not transmitted to Taskivator.
- To run your account, purchase, license, and support, the website and Portal
  handle a limited amount of personal data.
- We do not sell personal data. Advertising measurement is off by default and runs
  only if you turn it on.

## What the BugIt software sends to us

BugIt activates through your browser: you sign in to the BugIt Portal and approve
the device. There is no license key to enter or store. When you activate, and when
your license is checked again later, your device sends only the following:

- an **installation identifier**, which distinguishes this copy of BugIt so that a
  change to your license is applied to the right installation,
- a **hashed device fingerprint**: a 16 character one way hash of stable machine
  attributes, used to recognise the same computer again for device limits and fraud
  prevention. We receive the hash, never the attributes it was derived from,
- a **device label**, which is your computer's network name, so that you can
  recognise your own devices in your account and tell them apart,
- the **operating system name** and release, and the **BugIt version**, so that we
  can tell you whether a newer version is available,
- short lived **activation material**: a random value created for that one request,
  held in memory only, and never written to disk. It proves that the approval you
  gave in your browser belongs to that request and cannot be replayed.

In return, your device receives a **signed entitlement** recording what you are
licensed to use and until when.

These go to the Taskivator license service only, to activate and verify your
license and to check whether a newer version is available.

## What stays on your device

- Your specs, glossary, house style, and learned corrections
- Your `config.json` and your local project files
- Your API tokens, which are held in your operating system's credential store

This information is not transmitted to Taskivator.

## What goes to the services you connect

To draft and file a ticket, your report text is sent to the AI provider you use
(GitHub Copilot, or your own OpenAI or Anthropic key) and to the tracker you file to,
such as Jira or Azure DevOps. Those are the services you chose and connected, and
the information sent to them is not routed through or copied to Taskivator.
Connected AI providers and issue trackers process information under their own terms
and privacy policies, so please review those before connecting a service.

## Personal data we handle for the website and Portal

- **Account and sign in data**, including your email address, so we can create and
  secure your account
- **Purchase and order records**, including receipts and tax records
- **Payment data**, handled by our payment processor. We do not store full card
  numbers.
- **Entitlements and licenses**, so we can deliver and verify what you bought
- **Device activations**, including the installation identifier, the hashed device
  fingerprint, the device label, and the operating system name and BugIt version, so
  device limits work and you can manage your own devices
- **Team membership and invitations**, for the Team plan
- **Refunds, disputes, and chargebacks**, where these arise
- **Support correspondence**, so we can answer you
- **Security and administrative records**, so we can detect abuse and keep an audit
  trail
- **Connection settings you save** for trackers such as Jira or Azure DevOps. We
  store the connection settings, not the content held in those tools.
- **Your consent choices** for cookies and advertising measurement, including
  withdrawal, and the acknowledgement recorded at checkout where a market requires
  one

We use this data to provide and support the product you bought, to take payment and
meet our tax and accounting obligations, to keep accounts and licenses secure, and,
where you have given consent, to measure advertising. Depending on where you live,
the legal basis is normally the performance of our contract with you, compliance
with a legal obligation, our legitimate interest in securing the service, or your
consent.

## Service providers

We use service providers for authentication and hosting, payment processing,
transactional email, website delivery and security, and consent based advertising
measurement. These providers process only the information needed to deliver their
services to us, and they are not permitted to use it for their own purposes.

The main providers are Supabase (accounts and database), Stripe (payments, refunds,
and disputes), Vercel (Portal hosting), Cloudflare (website delivery, security, and
cookieless analytics), Resend (transactional email), and Google (advertising
measurement, only with your consent).

Some of these providers operate outside your country, including in the United
States. Where personal data is transferred internationally, we rely on the data
protection terms offered by the provider.

Advertising measurement never receives your bug reports, the contents of the BugIt
software, or your payment card details.

## How long we keep data

We keep personal data only as long as we need it for the purpose it was collected
for, and then delete or anonymise it. In practice that means:

- Account, license, and device records are kept while your account and license are
  active, and for a limited period afterwards so we can handle support and disputes.
- Payment, tax, and accounting records are kept for the period required by law.
- Support messages, security records, and consent records are kept for a limited
  period, and consent records are kept as evidence that your choice was respected.

If you delete your account, we delete or anonymise your data apart from records we
are required to keep.

## Cookies and advertising

The website uses essential cookies to function. Advertising cookies are off by
default and load only if you turn them on in the cookie banner or under **Cookie
preferences**. We use Cloudflare Web Analytics for general site performance, which
is cookieless and does not track you across sites. You can change or withdraw your
choice at any time.

Videos on the website are embedded from YouTube. Nothing is requested from YouTube until you press play on a video: until then the page shows an image served by us. When you do press play, the player is loaded from youtube-nocookie.com, YouTube's privacy enhanced host, and Google receives your IP address and the video you chose so that it can play it. If you never press play, the video section sends nothing to Google.

## Your rights

Depending on where you live, for example under the EU or UK GDPR or Japan's APPI,
you may have the right to access the personal data we hold about you, correct it,
delete it, restrict or object to certain processing, receive it in a portable form,
and withdraw consent at any time without affecting processing that already took
place.

To exercise any of these, email
[support@bugit.dev](mailto:support@bugit.dev) from your account address. You can
also delete your account from your dashboard. We will respond within the time
required by the law that applies to you.

If you are not satisfied, you may complain to your data protection authority: in
the EEA, your local authority; in the UK, the Information Commissioner's Office
(ico.org.uk); in Japan, the Personal Information Protection Commission (ppc.go.jp).
We would appreciate the chance to resolve your concern first.

## Changes

We may update this policy as the product or the law changes. The date above shows
the current version. See also the [Commercial Transactions](#/docs/commerce) page
(特定商取引法に基づく表記) and the [Refund Policy](#/docs/refund).

## Contact

Privacy questions or requests: [support@bugit.dev](mailto:support@bugit.dev).
