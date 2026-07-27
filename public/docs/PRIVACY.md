# Privacy — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

A plain-language summary of what the Software does and does not collect. Everything
runs on your own machine.

## What the Software sends to Taskivator

BugIt activates through your web browser: you sign in to your own BugIt account on
the BugIt Portal and approve this device. There is **no license key** to enter,
paste, or share.

To activate and keep your license valid, the Software sends only what is needed to
bind your entitlement to this installation and device — **license/activation data**:

- an **installation identifier** — a random value created once for this BugIt
  installation. It is not derived from your hardware and does not identify you,
- an **anonymous, one-way hashed device fingerprint** — a 16-character hash derived
  from basic machine attributes. It cannot be reversed to identify you or your
  hardware,
- a **device label** — your computer's hostname, so you can recognize this device
  in your account and remove it from the Portal when you like,
- your **operating system name** and the **BugIt version**, to check compatibility
  and whether an update is available, and
- short-lived **activation material** — a one-time challenge and approval token used
  only to complete sign-in, plus a one-way hash of a local acknowledgement secret.
  The secret itself never leaves your machine, and the raw challenge and token are
  never stored.

Your account sign-in happens in your browser on the Portal. In return, the Portal
issues a **signed entitlement** bound to this device and installation, which the
Software verifies locally.

These go only to the BugIt Portal, and only to activate and verify your license,
manage your devices, and check whether a newer version is available. When you
download an update, the Portal also records the download — including the request's
IP address and browser user-agent — for security and abuse prevention.

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
