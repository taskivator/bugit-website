# BugIt QA Agent

> **BugIt v1.0.1** · commercial release

A VS Code Copilot agent that turns raw test notes into clean, reviewed bug tickets and pushes them to your tracker. Works for any software — web, mobile, desktop, SaaS, or games. It handles multilingual reporting, glossary-consistent terminology, duplicate detection, and verification comments — so testers spend time finding bugs, not formatting them.

**Built by a senior QA engineer who writes and reviews bug reports every day.** It's less "AI that writes bugs" and more a QA agent that learns your team's workflow — it asks the right questions, adapts to your project, checks for duplicates, keeps reports consistent, translates, and verifies fixes.

![demo](assets/demo.svg)

**See it:** sample output in [samples/](samples/) — [Web/SaaS](samples/bug-report-en.md), [game (bilingual)](samples/bug-report-bilingual.md), [mobile crash](samples/crash-report.md), [enterprise security](samples/bug-report-enterprise.md).

> **Read this in:** English · [日本語](README/ja/README.ja.md) · [Français](README/fr/README.fr.md) · [Deutsch](README/de/README.de.md) · [Español](README/es/README.es.md) · [Português (BR)](README/pt-br/README.pt-br.md) · [Italiano](README/it/README.it.md) · [한국어](README/ko/README.ko.md) · [中文](README/zh/README.zh.md) · [Русский](README/ru/README.ru.md)

## What it does

- **Write bug reports** from rough repro steps with a consistent, reviewed template.
- **Multilingual output** (one primary + any number of secondaries: en, ja, fr, de, es, pt-br, it, ko, zh, ru, and more) with a glossary so terms stay consistent.
- **File to your tracker** — every tracker connects through an MCP server; Jira and Azure DevOps ship with a known default endpoint and built-in, tested field mapping, while GitHub, GitLab, Linear and more use your own MCP server with generic mapping — after a mandatory preview + confirmation.
- **Find duplicates** before you file, by searching existing tickets.
- **Look up crashes** in Sentry (plus other crash tools via their MCP connector).
- **Pull spec context** from Confluence, Notion, SharePoint, Google Docs, or repo Markdown.
- **Notify** Slack / Teams / Discord / email when a bug is filed; link **TestRail/Xray/Zephyr/Qase** test cases.
- Pick exactly the integrations you want during first-run setup — everything else stays off.
- **Tailor it to your team (optional):** during setup, share one screenshot of an existing ticket and the agent matches your categories, severity labels, title format, and terminology — never sent to Taskivator, personal data stripped first.
- **Write verification comments** for QA pass/fail on existing tickets.
- **Attach** screenshots and clips to the ticket automatically.
- **Opt-in power features** (chosen during setup): triage digest/standup, per-category templates, audit log + undo last filing, SLA breach flags, offline export (Markdown/CSV/JSON), and glossary auto-seed.
- **Stays safe & current:** automatic on-device **backups** of your setup before every update, **signature-verified in-place self-update** (your config, glossary, and house style are kept), and one-command **restore**.

Nothing about your title, team, or studio is baked in — everything is driven by [config.json](config.json).

## Every integration, explained

You only turn on what you use; pick during setup. In plain terms:

**Integration status at a glance:**

| Integration | How it connects | Status |
|---|---|---|
| **Jira** | Filing, via MCP (default endpoint + tested field mapping) | Built-in · tested |
| **Azure DevOps** (Boards) | Filing, via MCP (default endpoint + tested field mapping) | Built-in · tested |
| **Sentry** | Crash lookup, via MCP (default endpoint) | Built-in · tested |
| **Confluence** | Knowledge lookup, via MCP (default endpoint) | Built-in · tested |
| GitHub · GitLab · Linear · Shortcut · YouTrack · Bugzilla · ClickUp · Asana · Trello | Your own MCP server | Configurable |
| Crashlytics · BugSnag · Raygun · Rollbar · App Center · Datadog | Your own MCP server | Configurable |
| TestRail · Xray · Zephyr · Qase | Your own MCP server | Configurable |
| Slack · Teams · Discord · email | Your own MCP server | Configurable |
| Notion · SharePoint · Google Docs · repo Markdown | Your own MCP server | Configurable |
| S3 · Google Drive · Azure Blob | Your own MCP / UI | Configurable |
| Any other service | Custom MCP server you add | Configurable |

**Built-in · tested** = connects through a known default MCP endpoint with built-in, tested field mapping — you still authenticate it once in `.vscode/mcp.json`, but there's no endpoint to look up or map yourself. **Configurable** = connects through your own MCP server (many official, some community or custom), with generic field mapping — same one-time auth step, but you supply the endpoint. Either way, you turn on only what you use, and BugIt health-checks it during setup.

**Built-in connectors:** Jira, Azure DevOps, Sentry, and Confluence connect through a known default MCP endpoint with built-in, tested field mapping — you still authenticate the connector in `.vscode/mcp.json`. Everything else below connects through your own MCP server (many are official; some are community or custom) — turn on only what you use.

**Trackers** (where the bug ticket is filed — choose one as primary):
- **Jira** and **Azure DevOps** (Boards) connect through a known default MCP endpoint with built-in, tested field mapping; **GitHub Issues**, **GitLab Issues**, **Linear**, **Shortcut**, **YouTrack**, **Bugzilla**, **ClickUp**, **Asana** and **Trello** connect through your own MCP server with generic mapping — all the same job: store and track bugs.

**Crash tools** (match a report to a real crash/stack trace): **Sentry**, **Crashlytics** (mobile), **BugSnag**, **Raygun**, **Rollbar**, **App Center**, **Datadog**.

**Test management** (link the bug to a test case): **TestRail**, **Xray**, **Zephyr**, **Qase**.

**Comms** (ping the team when a bug is filed): **Slack**, **Teams**, **Discord**, **email**.

**Knowledge** (read specs to check expected behavior): **Confluence**, **Notion**, **SharePoint**, **Google Docs**, repo **Markdown**.

**Storage** (where screenshots/clips go if not attached directly): **S3**, **Google Drive**, **Azure Blob**.

## Smart features, explained

Always-on helpers (toggle in setup):
- **Duplicate clustering** — finds existing tickets like yours before you file.
- **Severity prediction** — suggests Critical/High/… from the symptoms.
- **Log parsing** — pulls the crash line + stack from pasted logs.
- **PII redaction** — strips emails, tokens, and personal data from reports.
- **Quality score** — rates the report and warns if steps/expected are thin.

Opt-in power features: **triage digest** (daily standup summary), **per-category templates**, **audit log + undo** (revert last filing), **SLA breach flags**, **offline export** (MD/CSV/JSON), **glossary auto-seed**.

## Safety & security

- **We never see your work.** The only thing that ever contacts a server is license/update data: your license key, a one-way hashed device ID, and — only if you've set one at setup — the seat label you chose (e.g. a name or email, so you can tell your own devices apart; never required to be real). No telemetry, no analytics. Your tickets, specs, glossary, and config stay yours, going only to the tools *you* connect and your own AI model, never to Taskivator.
- **Nothing is written without your yes.** Every ticket and comment is previewed; irreversible filings need a typed confirm.
- **You're in control — and responsible.** You review and approve every report before it's filed, and on first run you accept the terms once. How you use BugIt and your project's safety stay in your hands — the safeguards reduce risk but don't replace your review. See [LICENSE](LICENSE).
- **Automatic backups.** Before every update — and any time you ask — your config, glossary, house style, license, and connections are snapshotted locally; restore any of them with one command (`Restore my settings`).
- **Signed, verified updates.** In-place self-update is cryptographically signed with a key kept *separate* from licensing; the agent verifies every byte and refuses anything tampered, then keeps your own files.
- **Zero writes in simulation.** Say "dry run" or set `QA_AGENT_DRY_RUN=1` and the agent only reads — never files, comments, or notifies.
- **No secrets in files.** `config.json` holds orgs and URLs only; tokens live in your OS credential store. The validator flags anything that looks like a leaked secret.
- **Tool output is data, not orders.** Injected instructions in pages or tickets are ignored and surfaced to you.
- Run `python tools/selftest.py` and `python tools/validate_config.py --test` anytime to confirm it's healthy.

## Works best with

- **VS Code + GitHub Copilot** (recommended) — BugIt runs as a VS Code Copilot agent.
- **Or bring your own key** — run it standalone with your own **OpenAI** or **Anthropic** API key (drafts + exports in the terminal, no tracker writes).
- **The tracker your team already uses** — Jira and Azure DevOps connect through a built-in, tested MCP mapping; everything else connects through your own MCP server.

> It needs VS Code with an AI model (Copilot or your own OpenAI/Anthropic key). It does **not** run inside other chat apps or editors.

## Known limitations (v1.0)

Up front, so there are no surprises:

- **Built-in, tested field mapping is Jira + Azure DevOps** (via their default MCP endpoint). GitHub, GitLab, Linear, Trello and the rest work through **your own MCP server** — capable, but you set them up and the mapping is generic.
- **You bring the AI.** BugIt needs GitHub Copilot or your own OpenAI/Anthropic key; it doesn't ship a model.
- **Draft quality depends on your notes + your model.** Vague input or a weak model means a weaker draft; more context means better tickets (tip: show it one existing ticket during setup).
- **PII redaction is best-effort,** not a guarantee — always review a draft before filing.
- **Safeguards don't replace your review.** You approve every ticket; BugIt never files on its own.
- **One license = one device at a time** (Solo) or five (Team). No telemetry, no analytics, no cloud storage of your work.

## Setup

New here? Read [GETTING_STARTED.md](GETTING_STARTED.md) for a full plain-language walkthrough. Quick version:

1. Open this folder in VS Code with GitHub Copilot.
2. Open Copilot Chat, pick the **BugIt QA Agent**, type `hi`, and run `Begin setup` — it asks which integrations you want and fills [config.json](config.json) for you.
3. Wire up only the MCP servers you chose in `.vscode/mcp.json`. Everything not picked stays disabled.
4. (Optional) Fill [.github/glossary/terms.template.md](.github/glossary/terms.template.md) with your team's terminology.
5. Run `python tools/refresh_caches.py` once to seed local caches.
6. Open Copilot Chat, pick the **BugIt QA Agent**, and type `hi`.

### Faster setup helpers
- **Pick an industry preset:** `python tools/preset.py game` (also web-saas, mobile, enterprise) fills categories, platforms, and SLA.
- **No Copilot? Terminal wizard:** `python tools/setup_wizard.py` writes config.json via Q&A.
- **Auto-build mcp.json:** `python tools/genmcp.py --write` creates server stubs for what you enabled — no hand-editing.
- **Add your own tools:** during `Begin setup`, connect any custom MCP server not in the built-in list — just give it a name and endpoint; it's validated and health-checked like a built-in.
- **Readiness check:** `python tools/doctor.py` lists exactly what's left before you can file.
- **Share with your team:** `python tools/share.py export` → send `config.share.zip` (config, glossary, and house style bundled); teammates `python tools/share.py import config.share.zip` (no secrets travel).
- **Import your tracker labels:** `python tools/import_categories.py labels.txt` matches your project's categories.
- **Seed the glossary:** `python tools/glossary_autoseed.py tickets.txt --write` suggests terms from past tickets.

## Run without Copilot (Bring Your Own Key)

No Copilot? Use the standalone runner with your own AI key — it drafts reports in a terminal and exports them to files (no tracker writes):

1. `setx QA_AGENT_API_KEY sk-...` (Windows) or `export QA_AGENT_API_KEY=sk-...` (mac/Linux). Keys never go in `config.json`.
2. Set provider in `config.json` → `standalone` (`openai` or `anthropic`); leave `model` blank to always get BugIt's current recommended model, or set it yourself to pin a specific one.
3. `python standalone/run.py` (or `python standalone/run.py "save crash, 5/5, pc"`). Details: [standalone/README.md](standalone/README.md).

## Licensing

The agent ships license-ready. A license is required — paste your key in chat to unlock; no trial.

| Tier | Early access price | Regular price |
|------|---------------------|----------------|
| Solo | $39.99/year | $59.99/year — 1 device at a time, no trial, all features |
| Team (5 seats) | $199/year | $249.99/year — 5 devices at a time |

That's about **$5/month** at the regular price — billed once a year, not every month like rival QA tools. Save the time of a handful of bugs and it's paid for itself. Early access pricing is limited — see the store for current availability.

- **Activate:** paste your key in chat (or set `QA_AGENT_LICENSE=<key>` / drop a `license.key` at the root).
- **Check status:** `python tools/license.py status`
- **Updates:** free **v1.x updates** are included while your license is active — installed in place and cryptographically signed.
- **Fair use:** one purchase = one user. Please don't share, resell, or redistribute your key or the software. Full terms in [LICENSE](LICENSE).

## What you must provide

| Need | Where |
|------|-------|
| ADO / Jira / Confluence / Sentry orgs | `config.json` |
| MCP server credentials | `.vscode/mcp.json` (per machine) |
| Glossary terms (optional) | `.github/glossary/terms.template.md` |
| Spec links | `config.json` + Confluence space |

## Layout

- `config.json` — all team-specific settings
- `.github/agents/bugit-qa-agent.agent.md` — the agent spec
- `.github/instructions/` — modular workflows (templates, pre-checks, version, help, etc.)
- `.github/glossary/terms.template.md` — empty glossary to fill in
- `tools/` — Python helpers (cache refresh, attachments, config validation, tracker adapter, severity, log parsing, PII redaction, dedup, quality score, licensing, packaging, self-test, setup doctor, presets, mcp.json generator, terminal wizard, team share)
- `presets/` — industry starting points (web-saas, mobile, game, enterprise)

Out of the box this is a blank-slate QA agent. Configure it once and it's yours.

**⚠️ What's safe to hand-edit — and what isn't.** Safe, and kept through every update: `config.json`, `.github/instructions/house-style.instructions.md` (create this yourself to set your title format, severity labels, and required fields — it's the supported way to customize behavior), `.github/glossary/terms.template.md`, `.github/instructions/learned.instructions.md`, and `.vscode/mcp.json`. **Not safe:** `.github/agents/bugit-qa-agent.agent.md`, any other file under `.github/instructions/`, and anything in `tools/`. These are the product itself, not your settings — an update **silently overwrites them**, and unlike the files above, **there is no backup to restore them from**. BugIt checks for this at startup and again right before installing an update, and will warn you if it finds any — but the safest rule is simply not to edit them.

## Support

Questions, activation trouble, or a bug in the tool itself? Visit **bugit.dev** or email **support@bugit.dev** — happy to help.

**Setup didn't work?** Reach out within **7 days** of purchase and we'll get you running — or help you get a refund through the store. We'd rather fix it than lose your trust.

## License & security

Commercial license — see [LICENSE](LICENSE). Privacy: [PRIVACY.md](PRIVACY.md). Security guarantees, limits, and hardening: [SECURITY.md](SECURITY.md).

© 2026 Taskivator. All Rights Reserved.
