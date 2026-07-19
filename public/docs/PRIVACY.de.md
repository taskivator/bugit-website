# Datenschutz — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Eine allgemein verständliche Zusammenfassung dessen, was die Software erfasst und
was nicht. Alles läuft auf Ihrem eigenen Rechner.

## Was die Software an Taskivator sendet

Das Einzige, was die Software an uns sendet, sind **Lizenz-/Update-Daten**:

- Ihr **Lizenzschlüssel**,
- ein **anonymer, mit einem Einweg-Hash versehener Geräte-Fingerabdruck** — ein
  16-stelliger Hash, der aus grundlegenden Geräteattributen abgeleitet wird. Er
  kann nicht rückgängig gemacht werden, um Sie oder Ihre Hardware zu
  identifizieren, und
- **nur wenn Sie bei der Ersteinrichtung eine festlegen**, eine kurze
  Platzbezeichnung Ihrer Wahl, damit sich die Plätze einer Team-Lizenz
  unterscheiden lassen (z. B. ein Name, ein Benutzername oder eine E-Mail-Adresse
  — nie muss es eine echte sein, und sie wird nie überprüft). Wenn Sie keine
  festlegen, wird diese schlicht nie gesendet.

Diese gelangen ausschließlich an den Lizenzserver von Taskivator und dienen nur
dazu, Ihren Platz zu aktivieren/zu verifizieren und zu prüfen, ob eine neuere
Version verfügbar ist. **Keine Telemetrie, keine Analyse, kein Tracking, keine
Werbung — niemals.**

## Was vollständig auf Ihrem Gerät verbleibt

- Ihre Spezifikationen, Ihr Glossar, Ihr Hausstil und Ihre erlernten Korrekturen
- Ihre `config.json` und lokalen Projektdateien
- Ihre API-Tokens (aufbewahrt im Anmeldeinformationsspeicher Ihres Betriebssystems)

Nichts davon wird irgendwohin übertragen.

## Was ausschließlich an die von *Ihnen* verbundenen Dienste geht

Um ein Ticket zu verfassen und einzureichen, wird Ihr Berichtstext an das von
Ihnen genutzte KI-Modell (GitHub Copilot oder Ihr eigener OpenAI-/Anthropic-
Schlüssel) und an den Tracker gesendet, bei dem Sie einreichen (etwa Jira oder
Azure DevOps). Das sind die KI und die Werkzeuge, die **Sie** ausgewählt und
verbunden haben — sie werden niemals über Taskivator geleitet, dorthin kopiert
oder von Taskivator eingesehen.

## Anmeldeinformationen

API-Tokens liegen im Anmeldeinformationsspeicher Ihres Betriebssystems — niemals
in einer Datei und niemals an Taskivator übertragen.

## Website-Analyse

Die Website bugit.dev verwendet Cloudflare Web Analytics, einen datenschutzfreundlichen Dienst, um Seitenleistung und Besuchszahlen zu messen. Er verwendet keine Cookies und verfolgt Sie nicht über andere Websites hinweg.

Mit Ihrer Einwilligung verwendet die Website außerdem Google-Messung (Google Ads), um die Wirksamkeit unserer Werbung zu beurteilen. Dies ist deaktiviert, bis Sie im Cookie-Banner Alle akzeptieren wählen oder Werbung aktivieren, und Sie können Ihre Auswahl jederzeit über den Link Cookie-Einstellungen im Footer ändern oder widerrufen. Wenn Sie es erlauben, geben wir möglicherweise den Wert, die Währung und eine anonyme Bestellreferenz eines Kaufs weiter, damit ein Verkauf einer Anzeige zugeordnet werden kann. Wir geben niemals den Inhalt Ihrer Fehlerberichte, Ihre Zahlungskartendaten oder Ihre Eingaben im Produkt weiter.

Dies gilt nur für die Website. Die Software selbst sendet, wie oben beschrieben, keinerlei Analysedaten, keine Werbung und kein Tracking.

## Kontakt

Fragen zum Datenschutz? Besuchen Sie **bugit.dev** und öffnen Sie ein
Support-Ticket über Ihr BugIt-Dashboard — wir helfen gerne.
