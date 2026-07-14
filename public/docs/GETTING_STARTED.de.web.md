# Erste Schritte mit BugIt

BugIt verwandelt grobe Testnotizen in geprüfte Fehlerberichte direkt in VS Code. Windows 11 mit VS Code und GitHub Copilot ist der für die Veröffentlichung qualifizierte Client-Pfad.

## Bevor Sie beginnen

- Installieren Sie das aktuelle VS Code und melden Sie sich bei GitHub Copilot an.
- Installieren Sie einen für die Veröffentlichung qualifizierten Python-Interpreter (3.10 bis 3.13).
- Laden Sie BugIt aus Ihrem Konto-Dashboard herunter und entpacken Sie es in einen lokalen Ordner.
- Halten Sie Lizenzschlüssel, Tokens, Kundendaten und privaten Quellcode aus Chat- und Konfigurationsdateien heraus.

## Aktivieren und konfigurieren

- Öffnen Sie den entpackten BugIt-Ordner als vertrauenswürdigen VS Code-Arbeitsbereich.
- Wählen Sie im Copilot Chat den BugIt QA-Agent aus und geben Sie `Activate` ein.
- Geben Sie den Lizenzschlüssel ausschließlich in der maskierten Terminaleingabe ein.
- Geben Sie `Begin setup` ein und wählen Sie nur die Integrationen aus, die Ihr Team nutzt.
- Lassen Sie BugIt den ausgewählten Dienst und das Projekt überprüfen, bevor ein Ticket erstellt wird.

## Verbindungsstatus

- Jira Cloud und Confluence Cloud nutzen den geführten Atlassian Rovo MCP-Pfad und erfordern eine Browser-Authentifizierung sowie Live-Funktionsprüfungen.
- Azure DevOps nutzt die organisationsbezogene Remote-MCP-Vorschau von Microsoft und erfordert eine Live-Verifizierung.
- Sentry, GitHub, Linear und Notion sind experimentell, bis ihre Dienstvoraussetzungen und Live-Prüfungen bestanden sind.
- Andere genannte Dienste erfordern einen von der Organisation bereitgestellten kompatiblen MCP-Server. BugIt bietet Einrichtungshinweise, liefert oder testet diese Server jedoch nicht.

## Ihr erster Bericht

- Beschreiben Sie das Problem in einfachen Worten, einschließlich wo es aufgetreten ist und wie oft.
- Beantworten Sie alle Fragen, die nötig sind, um die Reproduktionsschritte vollständig zu machen.
- Prüfen Sie die Vorschau, insbesondere private Daten, Schweregrad, Projekt und Anhänge.
- Bestätigen Sie erst, wenn Ziel und endgültiges Ticket korrekt sind.

## Hilfe erhalten

Führen Sie zunächst `Check status` oder `Check readiness` im BugIt-Agent aus. Besteht das Problem weiterhin, öffnen Sie über Ihr BugIt-Konto-Dashboard ein Support-Ticket (auf Englisch) und geben Sie dabei keine Geheimnisse oder vertrauliches Projektmaterial an.