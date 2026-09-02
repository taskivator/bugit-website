# BugIt QA Agent: Overview

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

- Files with a credential you create in your own account, and BugIt validates that credential against your chosen destination before it saves the connection: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana and Trello. All eleven, over each tracker's own API.
- Guided knowledge source, read only: Confluence Cloud through Atlassian Rovo MCP, with browser sign-in. Sentry and Notion are experimental until their live checks pass.
- Setup guidance only: organization-supplied compatible servers for crash tools, test management, communications, and knowledge services.
- Unsupported by automated setup: S3, Google Drive, and Azure Blob storage connectors.

## Release scope

- BugIt is the current published commercial release, actively maintained.
- Windows 11, VS Code, GitHub Copilot, and Python 3.10 through 3.14 are the release-qualified environment.
- The full User Guide and Overview are available as PDFs in English and every supported language; preview or download them below.

## Policies

- Read the [privacy statement](/public/docs/PRIVACY.md).
- Review the [security guidance](/public/docs/SECURITY.md).