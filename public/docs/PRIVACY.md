# Privacy — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

A plain-language summary of what the Software does and does not collect. Everything
runs on your own machine.

## What the Software sends to Taskivator

The only thing the Software sends to us is **license/update data**:

- your **license key**,
- an **anonymous, one-way hashed device fingerprint** — a 16-character hash derived
  from basic machine attributes. It cannot be reversed to identify you or your
  hardware, and
- **only if you set one at first-run setup**, a short seat label you chose so a
  Team license's seats can be told apart (e.g. a name, a username, or an email —
  never required to be a real one, and never verified). If you don't set one, this
  is simply never sent.

These go only to the Taskivator license server, and only to activate/verify your
seat and to check whether a newer version is available. **No telemetry, no
analytics, no tracking, no advertising — ever.**

## What stays entirely on your device

- Your specs, glossary, house style, and learned corrections
- Your `config.json` and local project files
- Your API tokens (kept in your OS credential store)

None of this is transmitted anywhere.

## What goes only to the services *you* connect

To write and file a ticket, your report text is sent to the AI model you use
(GitHub Copilot, or your own OpenAI/Anthropic key) and to the tracker you file to
(such as Jira or Azure DevOps). That is the AI and tooling **you** chose and
connected — it is never routed through, copied to, or seen by Taskivator.

## Credentials

API tokens live in your operating system's credential store — never in a file, and
never transmitted to Taskivator.

## Website analytics

The bugit.dev website uses Cloudflare Web Analytics, a privacy-first service, to measure page performance and visit counts. It does not use cookies and does not track you across sites.

With your consent, the website also uses Google measurement (Google Ads) to see how well our advertising works. It stays off until you choose Accept all or turn on Advertising in the cookie banner, and you can change or withdraw your choice at any time with the Cookie preferences link in the footer. When you allow it, we may share the value, currency, and a non-personal order reference for a purchase so a sale can be attributed to an ad. We never share the content of your bug reports, your payment card details, or anything you type into the product.

This applies to the website only. The Software itself sends no analytics of any kind, no advertising, and no tracking, as described above.

## Contact

Questions about privacy? Visit **bugit.dev** and open a support ticket from your
BugIt dashboard — we're happy to help.
