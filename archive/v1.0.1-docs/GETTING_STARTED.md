# Getting Started — BugIt QA Agent

A complete, plain-language guide for **BugIt v1.0.1**. Read once, set up in ~15 minutes, and you're filing clean tickets.

**The QA Agent that adapts to your workflow. Works with your favorite AI model.**

> **Read this in:** [English](GETTING_STARTED.md) · [日本語](README/ja/GETTING_STARTED.ja.md) · [Français](README/fr/GETTING_STARTED.fr.md) · [Deutsch](README/de/GETTING_STARTED.de.md) · [Español](README/es/GETTING_STARTED.es.md) · [Português (BR)](README/pt-br/GETTING_STARTED.pt-br.md) · [Italiano](README/it/GETTING_STARTED.it.md) · [한국어](README/ko/GETTING_STARTED.ko.md) · [中文](README/zh/GETTING_STARTED.zh.md) · [Русский](README/ru/GETTING_STARTED.ru.md)

---

## Quick start (about 5 minutes)

Already have VS Code + GitHub Copilot? The fast path:

1. Unzip and open the folder in VS Code.
2. Copilot Chat → pick **BugIt QA Agent** → paste your license key.
3. Type `Begin setup` and answer a few questions (pick your tracker, or skip it for now).
4. Type your first bug in plain words — e.g. *"login button does nothing on Safari, every time"* — review the draft, and file.

That's your first ticket. The full guide below covers everything else (~15 minutes for a complete, connected setup).

---

## New here? 60-second glossary (no tech background needed)

You don't need to understand code. Here are the only words that matter, in plain English:

- **VS Code** — a free app from Microsoft. Think of it as the "window" this agent lives in. You install it like any program.
- **GitHub Copilot** — the AI brain. It's what writes the reports. You sign in once; it's the only thing you pay for.
- **The agent (BugIt)** — your assistant inside that window. You chat with it like texting a coworker.
- **Tracker** — the place your team keeps its bug list (Jira, ADO, GitHub, etc.). The agent files bugs there for you.
- **MCP server** — a small "bridge" that lets the agent reach your tracker. You flip it **on** once. Don't overthink it.
- **Token** — a private password the bridge uses to log in. You paste it once; it's stored safely, never in plain files.
- **config.json** — a settings sheet that remembers your choices. The agent fills it in for you — you rarely touch it.
- **Chat** — where you type. You'll mostly just type things like "Write a bug report: the app crashes when I save."

If you can install an app, sign in, and type a sentence, you can run this. Everything below is step-by-step.

---

## What AI it uses & what it costs

**Works with your favorite AI model.** This agent has no AI of its own — it steers the model inside **GitHub Copilot** (pick GPT, Claude, or Gemini there), or runs standalone with your own OpenAI/Anthropic key. Your only AI cost is Copilot:

- **Free:** the Copilot Free tier covers casual use (limited requests/month) — enough to try it.
- **~$10/mo:** Copilot Pro for steady daily use.
- **No API keys, no model hosting, no per-bug fees** — if you can sign in to Copilot, the AI works.
- Trackers (Jira/ADO/…) are optional and don't change the AI cost; reports work without them.

**No Copilot? Bring your own key.** Run the standalone version with an OpenAI/Anthropic key — it drafts reports in a terminal and saves them to files (no tracker writes). Set `QA_AGENT_API_KEY` in your shell, pick a provider in `config.json` → `standalone` (leave `model` blank for BugIt's current recommended pick, or set your own), then `python standalone/run.py`. Details: [standalone/README.md](standalone/README.md).

> **Works best in VS Code** (with Copilot or your own key). BugIt doesn't run inside other chat apps or editors — it's a VS Code agent.

## Licensing

A license is required. Just paste your key in chat to unlock — nothing else changes. Check with `python tools/license.py status`.

**Free v1.x updates** are included while your license is active. One purchase = one user — please don't share, resell, or redistribute it (full terms in [LICENSE](LICENSE)).

---

## Why it's a steal — top selling points

**A whole year of BugIt is about $5/month — and rival QA tools bill their price *every month*.** **Early access pricing: Solo $39.99/year, Team (5 seats) $199/year — then $59.99/year and $249.99/year once the promotion ends.** Your license covers one device at a time and the year starts the day you activate, so BugIt pays for itself in the time of just a handful of bugs.

- **Files a clean ticket in seconds** — turn a one-line note into a full report with steps, severity, and version. Saves ~10 min per bug.
- **Works with the tracker you already use** — Jira and Azure DevOps connect through a known default MCP endpoint with built-in, tested field mapping; GitHub, GitLab, Linear and more connect through your own MCP server. Most teams use just one; switch anytime.
- **Catch duplicates early** — it checks existing tickets before you file and flags matches, so you can avoid dupes.
- **Crash-aware** — matches reports to Sentry (and other crash tools you connect) and pulls the stack for you.
- **Multilingual** — reports in 10+ languages with glossary-consistent terms; ship globally with no extra hire.
- **Auto-detects** category, version, and severity — zero forms to memorize.
- **Power tools included** — triage digest, undo, export, SLA flags, per-category fields.
- **Learns your house style** — show it one screenshot of an existing ticket during setup and it matches your categories, severity labels, and title format.
- **Built by a senior QA engineer** — not a generic prompt pack. It's the tool I wanted for my own bug-filing, so I built it: it asks questions, adapts to your project, and learns your team's style.
- **Private & safe by default** — your work is never sent to Taskivator (no telemetry); nothing files without your "yes"; and your whole setup is backed up automatically before every update, restorable in one command.

One afternoon of saved bug-filing covers the cost. After that, it's pure time back — day after day.

---

## 1. What this agent does

It turns rough test notes into polished bug tickets and files them to your tracker. It:

- Writes bug reports (one or many languages) with a consistent template.
- Files them to your tracker — Jira and Azure DevOps connect through a known default MCP endpoint with built-in, tested field mapping; GitHub, GitLab, Linear and others connect through your own MCP server.
- Finds duplicates before you file.
- Looks up crashes (Sentry via a known default MCP endpoint; other crash tools via their own MCP connector).
- Pulls spec context (Confluence, Notion, SharePoint, Google Docs, repo Markdown).
- Writes verification / close comments.
- Notifies Slack / Teams / Discord / email when a bug is filed.
- **Opt-in power features** you pick during setup: triage digest, per-category templates, audit log + undo, SLA flags, offline export, and glossary auto-seed.
- **Stays safe & current:** your setup is backed up automatically before every update, updates are signed and installed in place (your settings kept), and you can restore anytime.

It works for any software: web, mobile, desktop, SaaS, or games. Nothing about your team is hard-coded — it all lives in [config.json](config.json).

---

## 1a. Every integration & feature, in plain English

Don't worry if these names are new — turn on only what you already use; everything else stays off. **Built-in connectors:** Jira, Azure DevOps, Sentry, and Confluence connect through a known default MCP endpoint with built-in, tested field mapping — you still authenticate the connector in `.vscode/mcp.json`. Everything else below connects through your own MCP server.

**Trackers — where the bug ticket lives** (pick one as primary): **Jira** and **Azure DevOps** connect through a known default MCP endpoint with built-in, tested field mapping; **GitHub Issues**, **GitLab**, **Linear**, **Shortcut**, **YouTrack**, **Bugzilla**, **ClickUp**, **Asana** and **Trello** connect through your own MCP server. Choose the one your team uses.

**Crash tools — match a report to a real crash:** **Sentry**, **Crashlytics** (mobile apps), **BugSnag**, **Raygun**, **Rollbar**, **App Center**, **Datadog**.

**Test management — link a bug to a test case:** **TestRail**, **Xray**, **Zephyr**, **Qase**.

**Comms — auto-notify when a bug is filed:** **Slack**, **Teams**, **Discord**, **email**.

**Knowledge — read your specs to confirm expected behavior:** **Confluence**, **Notion**, **SharePoint**, **Google Docs**, repo **Markdown**.

**Storage — where screenshots/clips go:** **S3**, **Google Drive**, **Azure Blob**.

**Smart features** (the setup checklist): **dup clustering** = find existing tickets like yours; **severity prediction** = guess Critical/High/…; **log parsing** = pull the crash + stack from logs; **PII redaction** = remove emails/tokens; **quality score** = rate the report.

**Power features** (turn on in `Begin setup`, then trigger from chat):
- **Triage digest** — type `Triage digest` for an instant standup summary: what was filed/changed, counts by severity and category. Run your morning standup in seconds.
- **Export bug to file** — `Export bug to file` saves the finished report as a local Markdown/JSON file instead of filing. Great for offline work or keeping a copy.
- **Undo last filing** — `Undo last filing` reverses the most recent ticket or comment the agent created, so a mistaken file is one command away from gone.
- **SLA flags** — high-severity bugs are tagged with an SLA/due marker as they're filed, so urgent issues stand out automatically.
- **Per-category fields** — each category adds its own extra fields (e.g. crash → stack trace, UI → screenshot), so every report captures the right detail.

---

## 2. What you need first

| Requirement | Why | Notes |
|-------------|-----|-------|
| **VS Code** | The agent runs inside it | Latest version |
| **GitHub Copilot** | Powers the agent | Active subscription, signed in |
| **Python 3.10+** | Runs the helper tools | `python --version` to check |
| **Git** | For your own project, if you use it | Not required — BugIt's own updates/rollback use `tools/update.py` / `tools/backup.py`, not git |
| **A tracker account** | Where bugs go | e.g. Jira, ADO, GitHub |
| **An MCP server for each tool** | Lets the agent reach your tracker | URLs go in `.vscode/mcp.json` |

You do **not** need to be technical. The agent installs missing software during setup.

---

## 3. Set it up in VS Code

If you've never used a Copilot agent before, do this once:

1. **Install VS Code** — download from <https://code.visualstudio.com> and open it.
2. **Install GitHub Copilot** — in VS Code open the Extensions panel (square icon on the left, or `Ctrl+Shift+X`), search **GitHub Copilot**, click **Install**. Then sign in (bottom-right account icon) and confirm your subscription is active.
3. **Open this folder** — `File → Open Folder…` and pick the folder containing this guide. VS Code loads the agent automatically because it ships inside `.github/agents/`.
4. **Trust the workspace** if VS Code asks — choose *Yes, I trust the authors* so tools and MCP servers can run.
5. **Open Copilot Chat** — click the chat icon in the top bar, or `Ctrl+Alt+I`.
6. **Pick the agent** — at the top of the chat, switch the mode dropdown from *Ask/Edit/Agent* to **BugIt QA Agent**. Don't see it? Reload with `Ctrl+Shift+P → Developer: Reload Window`.

### How to run it
- Type a message like `hi` and press Enter — the agent replies in the chat panel.
- Use **+** (new chat) to start fresh; switch back to **BugIt QA Agent** each new chat.
- Helper commands (e.g. `python tools/selftest.py`) run in the VS Code terminal: **Terminal → New Terminal**.

---

## 4. First-run setup

1. **Open the folder** in VS Code (above) and pick **BugIt QA Agent** in chat.
2. Type `Begin setup`. The agent will:
   - Ask which integrations you want (tracker, crash tool, comms, etc.).
   - Ask which languages your reports use.
   - Write your answers into [config.json](config.json) — no hand-editing.
   - Check Python/packages and install anything missing.
   - Validate everything and tell you what's left.
3. **Wire up MCP servers**: BugIt creates `.vscode/mcp.json` from your setup choices and fills in real endpoints — you paste the endpoint in chat when asked, then click **Start** on each server. Sign in when prompted.
4. (Optional) Fill [.github/glossary/terms.template.md](.github/glossary/terms.template.md) with your team's terms.
5. Run `python tools/refresh_caches.py` once.
6. Say `hi` — you're ready.

Re-run `Begin setup` anytime to add or remove integrations.

### Shortcuts that make setup easier
- **Start from a template:** `python tools/preset.py game` (or web-saas, mobile, enterprise) fills your categories, platforms, and SLA so you're not staring at a blank list.
- **No Copilot? Use the wizard:** `python tools/setup_wizard.py` asks a few questions and writes config.json for you.
- **Don't touch JSON:** `python tools/genmcp.py --write` creates the bridge file (`mcp.json`) for exactly what you turned on — paste the endpoint in chat when BugIt asks, and it writes the config for you.
- **"Am I ready?":** `python tools/doctor.py` prints a checklist of what's done and what's left, with the fix for each.
- **Set up once for the whole team:** `python tools/share.py export` bundles your config, glossary, and house style (whatever's set) into a safe `config.share.zip` (no passwords) to send around; teammates run `python tools/share.py import config.share.zip` and get the exact same trackers, terminology, and bug style with one command.
- **Match your project instantly:** export your tracker's labels to a file, then `python tools/import_categories.py labels.txt`. Seed glossary terms from old tickets with `python tools/glossary_autoseed.py tickets.txt --write`.

---

## 4a. Your very first bug — a full walkthrough

Here's exactly what it looks like. You type the plain sentence; the agent does the rest.

1. **You type:** `Write a bug report: when I tap Save the app closes, happens every time on my iPhone`
2. **Agent replies** with a tidy draft: a title, numbered steps, what should happen, what actually happened, how often, platform, and a severity guess — then shows it to you and asks *"File this to Jira? (yes/no)"*.
3. **You read it.** Wrong category or missing detail? Just say `make severity high` or `add: only after the latest update`.
4. **You type:** `yes`. The agent checks for duplicates, files it, and hands you the link.
5. **Not ready?** Say `dry run` first — it writes the whole report but files nothing. Perfect for practice.

That's the whole loop: describe → review → yes. No forms, no fields to memorize.

---

## 5. What goes where

| Thing | Lives in | Holds secrets? |
|-------|----------|----------------|
| Orgs, projects, URLs, languages | `config.json` | **No** |
| Tokens / passwords | OS credential store | Yes — say `save my tokens` |
| MCP server URLs | `.vscode/mcp.json` | No |
| Glossary terms | `.github/glossary/terms.template.md` | No |
| Local speed-up data | `.cache/` | No |

Never put a token in `config.json`. The agent refuses secrets there and the validator flags them.

**About the `.cache/` folder:** it stores local copies so the agent is fast and works offline — recent tracker stats (for instant duplicate checks) and your last version check. It's created automatically, never synced, never committed, and holds no secrets. Safe to delete anytime — `python tools/refresh_caches.py` rebuilds it.

**⚠️ What's safe to hand-edit — and what isn't.** Everything above (`config.json`, `.vscode/mcp.json`, the glossary) is yours — BugIt keeps it through every update. So is `.github/instructions/house-style.instructions.md`, if you create one — that's the supported way to change tone, title format, or required fields (show BugIt one ticket screenshot and say "match my team's style," or write the file yourself). **Everything else — the agent file (`.github/agents/bugit-qa-agent.agent.md`) and every other file under `.github/instructions/` or `tools/` — should not be hand-edited.** These are the product itself, not your settings. An update replaces them automatically, and — unlike the files above — **they are never backed up, so there is no way to get a hand-edit back once it's overwritten.** BugIt checks for this at startup and again right before an update, and will tell you if something's been changed, but the safest rule is simply: don't edit them.

---

## 6. How to use it day to day

Type these in Copilot Chat:

| You type | You get |
|----------|---------|
| `Write a bug report: [what happened]` | Full report, dupe check, version auto-detect, preview |
| `Write a crash bug report: [what happened]` | Same + crash matching |
| `Quick bug: crash/error/missing/layout/slow/stuck/data/visual/audio/blocker [subject]` | Fast pre-filled report |
| `Close #ID` | Verify/close comment (you pick the scenario) |
| `Translate to [language]: [text]` | Glossary-consistent translation |
| `What is [term]?` | Glossary lookup |
| `Check status` | Server + version health |
| `Update` | Install the latest signed version — settings kept, backup first |
| `Back up my settings` / `Restore my settings` | Local snapshot / roll it back |
| `Save my tokens` / `Show my tokens` | Credential help |
| `help` | Full command list |

Tip: describe bugs casually. Category, version, and severity auto-detect; you confirm before anything is filed.

---

## 7. Safe for your project — by design

**Your code and tracker are never touched without your explicit "yes."** The agent reads, drafts, and waits. Every safeguard below is on by default and verifiable — nothing is opt-in:

- **Nothing files without your yes.** Every ticket and comment is previewed first; irreversible filings need a typed confirm. No silent writes, ever.
- **Dry-run = zero writes.** Say "dry run" or set `QA_AGENT_DRY_RUN=1` and it only reads — evaluate it risk-free.
- **Secrets never hit disk.** Tokens live in your OS credential store; the validator refuses any token in `config.json`.
- **Prompt-injection resistant.** Text hidden in pages/tickets is treated as data, not commands — instructions found in data are flagged, not obeyed.
- **No telemetry.** BugIt runs in your editor; the only thing that ever contacts Taskivator is license/update data — your license key, a one-way hashed device ID, and (only if you've set one at setup) the seat label you chose to tell your own devices apart. Your tickets, specs, and settings go only to the tools you connect and your own AI model — never to us.
- **Automatic backups.** Before every update — and whenever you ask — your config, glossary, house style, license, and connections are snapshotted locally. `Restore my settings` brings them back in one step.
- **Signed, verified updates.** The in-place self-update is cryptographically signed with a key separate from licensing; the agent verifies every byte and refuses anything tampered, keeping your own files.
- **One-command undo.** Mis-filed? `Undo last filing` reverses it, and every write is logged.

Confirm health anytime: `python tools/selftest.py` and `python tools/validate_config.py --test`.

---

## 8. Required to actually file a bug

The agent can write a report offline, but to **file** one you need: a tracker enabled in `config.json`, `trackers.primary` set, its MCP server running, and you signed in. The status check tells you which are missing.

---

## Known limitations (v1.0)

No surprises — here's what BugIt doesn't do yet:

- **Built-in, tested field mapping is Jira + Azure DevOps** (via their default MCP endpoint). GitHub, GitLab, Linear, Trello and the rest work through **your own MCP server** — capable, but you connect them and the mapping is generic.
- **You bring the AI** (Copilot or your own OpenAI/Anthropic key) — BugIt doesn't ship a model.
- **Draft quality depends on your notes + your model** — more context means better tickets.
- **PII redaction is best-effort,** not a guarantee — always review before filing.
- **Safeguards don't replace your review** — you approve every ticket; it never files on its own.
- **One license = one device at a time** (Solo) or five (Team). No telemetry, no cloud storage of your work.

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| "No tracker enabled" | Run `Begin setup`, pick a tracker |
| Server shows ❌ | Open `.vscode/mcp.json`, click Start; if stuck say `fix servers` |
| Asks to re-sign-in | `show my tokens`, paste into the prompt |
| Won't file | Check `validate_config.py --test`; confirm primary tracker + signed in |
| Looks game-specific | Edit `config.categories` / `quick bug` patterns to your domain |
| Answers feel generic | Give it more context — or show it one existing ticket during setup so it learns your style; re-run `Begin setup` to refine |

---

## 10. Languages

Set a primary plus any number of secondaries in `config.json` (en, ja, fr, de, es, pt-br, it, ko, zh, ru, and more). Reports are written in each. Add team terms to the glossary for exact wording.

---

## 11. Support

Stuck on something, or found a bug in the tool itself? Visit **bugit.dev** or email **support@bugit.dev** — happy to help.

**Setup didn't work?** Reach out within **7 days** of purchase and we'll get you running — or help you get a refund through the store.

That's it. Configure once, and it's your team's QA agent.
