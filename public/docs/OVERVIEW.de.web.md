# BugIt QA-Agent — Überblick

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

- Geführt: Jira Cloud und Confluence Cloud über Atlassian Rovo MCP.
- Geführte öffentliche Vorschau: Azure DevOps über den Remote-MCP-Dienst von Microsoft.
- Experimentell mit Live-Verifizierung: Sentry, GitHub, Linear und Notion.
- Nur Einrichtungshinweise: von der Organisation bereitgestellte kompatible Server für weitere Tracker, Crash-Tools, Testmanagement, Kommunikation und Wissensdienste.
- Von der automatisierten Einrichtung nicht unterstützt: Speicher-Connectoren für S3, Google Drive und Azure Blob.

## Umfang der Veröffentlichung

- BugIt ist die aktuell veröffentlichte kommerzielle Version und wird aktiv gepflegt.
- Windows 11, VS Code, GitHub Copilot und Python 3.10 bis 3.13 bilden die für die Veröffentlichung qualifizierte Umgebung.
- Das vollständige Benutzerhandbuch und der Überblick sind als PDFs auf Englisch und in jeder unterstützten Sprache verfügbar — Vorschau oder Download unten.

## Richtlinien

- Lesen Sie die [Datenschutzerklärung](/public/docs/PRIVACY.md).
- Beachten Sie die [Sicherheitshinweise](/public/docs/SECURITY.md).