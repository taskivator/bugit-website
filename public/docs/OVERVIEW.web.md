# BugIt QA Agent v1.0.2 Overview

BugIt is a commercial VS Code Copilot agent that converts raw test notes into consistent bug reports. It drafts locally in your workspace and writes to connected services only after preview and confirmation.

## Core workflow

- Capture rough reproduction notes, logs, screenshots, and expected behavior.
- Draft a structured report with title, severity, environment, steps, and evidence.
- Search the connected tracker for possible duplicates.
- Preview and approve the destination and final content before any external write.
- Add verification comments after a fix is retested.

## Privacy and control

- BugIt sends no product analytics or ticket telemetry to Taskivator.
- Your connected AI provider and enabled integrations process only the content you choose to send them.
- License and update requests use license data and a one-way device identifier, not ticket content.
- Dry-run mode prevents bundled Python helpers from writing, but you must still review external MCP actions.
- Configuration files must never contain credential values.

## Integration tiers

- Guided: Jira Cloud and Confluence Cloud through Atlassian Rovo MCP.
- Guided public preview: Azure DevOps through Microsoft's remote MCP service.
- Experimental with live verification: Sentry, GitHub, Linear, and Notion.
- Setup guidance only: organization-supplied compatible servers for other trackers, crash tools, test management, communications, and knowledge services.
- Unsupported by automated setup: S3, Google Drive, and Azure Blob storage connectors.

## Release scope

- BugIt v1.0.2 is not released until the seller completes the release checklist and publishes it.
- Windows 11, VS Code, GitHub Copilot, and Python 3.10 through 3.13 are the release-qualified environment.
- English is the current setup documentation. Localized manuals will return after regeneration and verification.

## Policies

- Read the [privacy statement](/public/docs/PRIVACY.md).
- Review the [security guidance](/public/docs/SECURITY.md).