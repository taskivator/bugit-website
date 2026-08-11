# BugIt QA-Agent — Überblick

> **Hinweis zur Übersetzung.** Dieses Dokument wurde maschinell übersetzt und nicht von Muttersprachlern geprüft. Maßgeblich ist die englische Fassung: Bei Abweichungen gilt der englische Text. Für den genauesten und aktuellsten Wortlaut ziehen Sie bitte das englische Dokument heran.

BugIt ist ein kommerzieller VS Code Copilot-Agent, der aus rohen Testnotizen einheitliche Fehlerberichte erstellt. Er erstellt Entwürfe lokal in Ihrem Arbeitsbereich und schreibt erst nach Vorschau und Bestätigung in verbundene Dienste.

## Kernablauf

- Erfassen Sie grobe Reproduktionsnotizen, Logs, Screenshots und das erwartete Verhalten.
- Erstellen Sie einen strukturierten Bericht mit Titel, Schweregrad, Umgebung, Schritten und Belegen.
- Durchsuchen Sie den verbundenen Tracker nach möglichen Duplikaten.
- Prüfen und bestätigen Sie Ziel und endgültigen Inhalt vor jedem externen Schreibvorgang.
- Fügen Sie nach erneutem Testen einer Behebung Verifizierungskommentare hinzu.

## Datenschutz und Kontrolle

- BugIt sendet keine Produktanalysen oder Ticket-Telemetrie an Taskivator.
- Ihr verbundener KI-Anbieter und die aktivierten Integrationen verarbeiten nur die Inhalte, die Sie ihnen bewusst übermitteln.
- Lizenz- und Update-Anfragen verwenden Lizenzdaten und eine unidirektionale Gerätekennung, nicht den Ticket-Inhalt.
- Der Probelaufmodus verhindert, dass die mitgelieferten Python-Hilfsprogramme schreiben, doch externe MCP-Aktionen müssen Sie weiterhin selbst prüfen.
- Konfigurationsdateien dürfen niemals Zugangsdaten enthalten.

## Integrationsstufen

- Reicht mit einer Zugangsberechtigung ein, die Sie in Ihrem eigenen Konto anlegen, gegen ein echtes Konto zertifiziert: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana und Trello. Alle elf, jeweils über die eigene API des Trackers.
- Geführte Wissensquelle, nur lesend: Confluence Cloud über Atlassian Rovo MCP, mit Browser-Anmeldung. Sentry und Notion bleiben experimentell, bis ihre Live-Prüfungen bestehen.
- Nur Einrichtungshinweise: von der Organisation bereitgestellte kompatible Server für Crash-Tools, Testmanagement, Kommunikation und Wissensdienste.
- Von der automatisierten Einrichtung nicht unterstützt: Speicher-Connectoren für S3, Google Drive und Azure Blob.

## Umfang der Veröffentlichung

- BugIt ist die aktuell veröffentlichte kommerzielle Version und wird aktiv gepflegt.
- Windows 11, VS Code, GitHub Copilot und Python 3.10 bis 3.13 bilden die für die Veröffentlichung qualifizierte Umgebung.
- Das vollständige Benutzerhandbuch und der Überblick sind als PDFs auf Englisch und in jeder unterstützten Sprache verfügbar — Vorschau oder Download unten.

## Richtlinien

- Lesen Sie die [Datenschutzerklärung](/public/docs/PRIVACY.md).
- Beachten Sie die [Sicherheitshinweise](/public/docs/SECURITY.md).