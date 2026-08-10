# Erste Schritte mit BugIt

> **Hinweis zur Übersetzung.** Dieses Dokument wurde maschinell übersetzt und nicht von Muttersprachlern geprüft. Maßgeblich ist die englische Fassung: Bei Abweichungen gilt der englische Text. Für den genauesten und aktuellsten Wortlaut ziehen Sie bitte das englische Dokument heran.

BugIt verwandelt grobe Testnotizen in geprüfte Fehlerberichte direkt in VS Code. Windows 11 mit VS Code und GitHub Copilot ist der für die Veröffentlichung qualifizierte Client-Pfad.

## Bevor Sie beginnen

- Installieren Sie das aktuelle VS Code und melden Sie sich bei GitHub Copilot an.
- Installieren Sie einen für die Veröffentlichung qualifizierten Python-Interpreter (3.10 bis 3.13).
- Laden Sie BugIt aus Ihrem Konto-Dashboard herunter und entpacken Sie es in einen lokalen Ordner.
- Halten Sie Tokens, Kundendaten und privaten Quellcode aus Chat- und Konfigurationsdateien heraus.

## Aktivieren und konfigurieren

- Öffnen Sie den entpackten BugIt-Ordner als vertrauenswürdigen VS Code-Arbeitsbereich.
- Wählen Sie im Copilot Chat den BugIt QA-Agent aus und geben Sie `Activate` ein (mit `--solo` oder `--team`, falls Ihr Konto beides hat).
- BugIt öffnet das BugIt-Portal in Ihrem Browser. Melden Sie sich mit Ihrem eigenen BugIt-Konto an – Ihr Passwort bleibt im Browser und wird nie in VS Code eingegeben.
- Wählen Sie die Solo- oder Team-Berechtigung für diesen Rechner und prüfen und bestätigen Sie dieses Gerät.
- Kehren Sie zu VS Code zurück. BugIt schließt die Autorisierung automatisch ab – es gibt keinen Lizenzschlüssel zum Kopieren, Einfügen oder Anzeigen.
- Geben Sie `Begin setup` ein und wählen Sie nur die Integrationen aus, die Ihr Team nutzt.
- Lassen Sie BugIt den ausgewählten Dienst und das Projekt überprüfen, bevor ein Ticket erstellt wird.

## Zugang verwalten

- Eine Installation nutzt jeweils eine aktive Berechtigung. Um diesen Rechner auf eine andere Solo- oder Team-Berechtigung umzustellen, geben Sie `Switch license` ein und bestätigen Sie erneut im Browser; bei Abbruch bleibt Ihre aktuelle Berechtigung bestehen.
- `Deactivate` entfernt die Berechtigung nur von diesem Rechner. Sitzplätze, Geräte, Mitgliedschaften, Rollen und Abrechnung verwalten Sie im Portal, nicht in VS Code.
- Team-Zugang gilt pro Person: Jedes Mitglied meldet sich mit dem eigenen BugIt-Konto und einer aktiven Mitgliedschaft an. Es gibt keinen gemeinsamen Schlüssel und keine gemeinsame Anmeldung.
- Nach einer erfolgreichen Online-Prüfung arbeitet BugIt bis zu 72 Stunden offline weiter – bei Solo und Team – und übernimmt den aktuellen Portal-Status, sobald wieder eine Verbindung besteht.
- Updates werden durch Ihre signierte Berechtigung autorisiert, sodass beim Herunterladen einer neuen Version nie nach einem Schlüssel gefragt wird.

## Verbindungsstatus

- BugIt reicht in elf Tracker ein, jeweils über deren eigene REST-API und mit einer Zugangsberechtigung, die Sie in Ihrem eigenen Konto anlegen: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana und Trello. Die Einrichtung prüft die Verbindung, bevor Sie sich darauf verlassen.
- Confluence Cloud wird als Wissensquelle über den geführten Atlassian Rovo MCP-Pfad angebunden, der die Browser-Anmeldung nutzt.
- Confluence Cloud wird als Wissensquelle über den geführten Atlassian-Rovo-MCP-Weg mit Browser-Anmeldung angebunden. Sentry und Notion bleiben experimentell, bis ihre Voraussetzungen und Live-Prüfungen bestehen.
- Andere genannte Dienste benötigen einen von Ihrer Organisation bereitgestellten kompatiblen MCP-Server. BugIt gibt Einrichtungshinweise, liefert und testet diese Server aber nicht.

## Ihr erster Bericht

- Beschreiben Sie das Problem in einfachen Worten, einschließlich wo es aufgetreten ist und wie oft.
- Beantworten Sie alle Fragen, die nötig sind, um die Reproduktionsschritte vollständig zu machen.
- Prüfen Sie die Vorschau, insbesondere private Daten, Schweregrad, Projekt und Anhänge.
- Bestätigen Sie erst, wenn Ziel und endgültiges Ticket korrekt sind.

## Hilfe erhalten

Führen Sie zunächst `Check status` oder `Check readiness` im BugIt-Agent aus. Besteht das Problem weiterhin, öffnen Sie über Ihr BugIt-Konto-Dashboard ein Support-Ticket (auf Englisch) und geben Sie dabei keine Geheimnisse oder vertrauliches Projektmaterial an.