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
seat and to check whether a newer version is available.

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

BugIt uses Cloudflare Web Analytics to understand general website performance and visit counts. This service is designed without cross site tracking cookies.

With your permission, we may also use Google Ads measurement to understand whether our advertising leads to purchases. You can manage your choices at any time through Cookie preferences.

When purchase measurement is enabled, limited transaction information such as the purchase value, currency, and a unique order reference may be used for attribution. Bug report content, payment card details, and information entered into the BugIt software are not shared with Google Ads.

These measurement tools apply only to the BugIt website and portal. The BugIt software does not use Google Ads measurement or send product telemetry.

## Contact

Questions about privacy? Visit **bugit.dev** and open a support ticket from your
BugIt dashboard — we're happy to help.
