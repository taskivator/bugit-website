# Getting Started with BugIt

BugIt turns rough testing notes into reviewed bug reports inside VS Code. Windows 11 with VS Code and GitHub Copilot is the release-qualified client path.

## Before you begin

- Install the latest VS Code and sign in to GitHub Copilot.
- Install a release-qualified Python 3.10 through 3.13 interpreter.
- Download BugIt from your account dashboard and unzip it to a local folder.
- Keep license keys, tokens, customer data, and private source code out of chat and configuration files.

## Activate and configure

- Open the unzipped BugIt folder as a trusted VS Code workspace.
- In Copilot Chat, select the BugIt QA Agent and type `Activate`.
- Enter the license key only in the masked terminal prompt.
- Type `Begin setup` and choose only the integrations your team uses.
- Let BugIt verify the selected service and project before filing a ticket.

## Connection status

- Jira Cloud and Confluence Cloud use the guided Atlassian Rovo MCP path and require browser authentication plus live capability checks.
- Azure DevOps uses Microsoft's organization-scoped remote MCP public preview and requires live verification.
- Sentry, GitHub, Linear, and Notion are experimental until their service prerequisites and live checks pass.
- Other named services require an organization-supplied compatible MCP server. BugIt provides setup guidance but does not ship or test those servers.

## Your first report

- Describe the problem in plain language, including where it happened and how often.
- Answer any questions needed to make the reproduction steps complete.
- Review the preview, especially private data, severity, project, and attachments.
- Confirm only when the destination and final ticket are correct.

## Get help

Run `Check status` or `Check readiness` in the BugIt agent first. If the problem remains, open a support ticket from your BugIt account dashboard without including secrets or confidential project material.