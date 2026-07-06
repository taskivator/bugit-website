# Security

BugIt QA Agent is a human-in-the-loop assistant. It only acts through your VS Code session and the integrations you enable.

## What BugIt does to protect you
- **No write without confirmation.** Every create/comment/attach/notify is previewed; irreversible filings need a typed confirm.
- **Dry run = read-only.** `QA_AGENT_DRY_RUN=1` or "dry run" blocks all writes; helpers run reads only.
- **No secrets in files.** `config.json` holds orgs/URLs only; tokens live in your OS credential store. The validator flags anything secret-shaped. `redact.py` makes a best-effort pass to scrub emails/tokens/IPs from drafts.
- **Off by default.** Every integration ships disabled — nothing connects or files until you opt in.
- **Output is data.** Page/ticket/crash text is treated as data, not commands — injected instructions are flagged and surfaced, not obeyed.

## Known limits
- Write-blocking is enforced by the agent, not the OS; the env var only hard-stops the bundled Python helpers. Run it in a trusted runtime.
- The agent reaches whatever you connect — credential scope = blast radius. Use **least-privilege** tokens.
- Most trackers can't truly delete an issue; "undo" is limited there by design.

## Hardening checklist
1. Use a dedicated, least-privilege service account per tracker.
2. Keep tokens in the OS store; never paste them into `config.json`.
3. Run `python tools/validate_config.py` after setup to catch leaks/misconfig.
4. Start only the MCP servers you use; stop the rest.

## Reporting a vulnerability
Email **support@bugit.dev** with steps to reproduce. Do not open a public issue for security reports.
