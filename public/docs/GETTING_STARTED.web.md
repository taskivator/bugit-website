# Getting Started with BugIt

BugIt turns rough testing notes into reviewed bug reports inside VS Code. Windows 11 with VS Code and GitHub Copilot is the release-qualified client path.

## Before you begin

- Install the latest VS Code and sign in to GitHub Copilot.
- Install a release-qualified Python 3.10 through 3.13 interpreter.
- Download BugIt from your account dashboard and unzip it to a local folder.
- Keep tokens, customer data, and private source code out of chat and configuration files.

## Activate and configure

- Open the unzipped BugIt folder as a trusted VS Code workspace.
- In Copilot Chat, select the BugIt QA Agent and type `Activate` (add `--solo` or `--team` if your account has both).
- BugIt opens the BugIt Portal in your browser. Sign in with your own BugIt account — your password stays in the browser and is never entered in VS Code.
- Choose the Solo or Team entitlement for this machine, then review and approve this device.
- Return to VS Code. BugIt finishes authorizing automatically — there is no license key to copy, paste, or reveal.
- Type `Begin setup` and choose only the integrations your team uses.
- Let BugIt verify the selected service and project before filing a ticket.

## Manage your access

- One installation uses one active entitlement at a time. To move this machine to a different Solo or Team entitlement, type `Switch license` and approve again in the browser; if you cancel, your current entitlement stays in place.
- `Deactivate` removes the entitlement from this machine only. Seats, devices, memberships, roles, and billing are managed in the Portal, not in VS Code.
- Team access is per person: every member signs in with their own BugIt account and an active membership. There is no shared key and no shared login.
- After a successful online check, BugIt keeps working offline for up to 72 hours on both Solo and Team, and applies the latest Portal state as soon as it reconnects.
- Updates are authorized by your signed entitlement, so downloading a new build never asks for a key.

## Connection status

- BugIt files to eleven trackers over each one's own REST API, using a credential you create in your own account: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana and Trello. Setup verifies the connection before you rely on it.
- Confluence Cloud connects as a knowledge source through the guided Atlassian Rovo MCP path, which uses browser sign-in. Sentry and Notion are experimental until their service prerequisites and live checks pass.
- Other named services require an organization-supplied compatible MCP server. BugIt provides setup guidance but does not ship or test those servers.

## Your first report

- Describe the problem in plain language, including where it happened and how often.
- Answer any questions needed to make the reproduction steps complete.
- Review the preview, especially private data, severity, project, and attachments.
- Confirm only when the destination and final ticket are correct.

## Get help

Run `Check status` or `Check readiness` in the BugIt agent first. If the problem remains, open a support ticket from your BugIt account dashboard without including secrets or confidential project material. Support is handled in English only.