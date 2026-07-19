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
Version verfügbar ist.

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

BugIt verwendet Cloudflare Web Analytics, um die allgemeine Leistung der Website und die Besuchszahlen zu verstehen. Dieser Dienst ist ohne seitenübergreifende Tracking-Cookies gestaltet.

Mit Ihrer Einwilligung verwenden wir möglicherweise auch die Google Ads-Messung, um zu verstehen, ob unsere Werbung zu Käufen führt. Sie können Ihre Auswahl jederzeit über die Cookie-Einstellungen verwalten.

Wenn die Kaufmessung aktiviert ist, können begrenzte Transaktionsinformationen wie der Kaufwert, die Währung und eine eindeutige Bestellreferenz zur Zuordnung verwendet werden. Der Inhalt von Fehlerberichten, Zahlungskartendaten und in die BugIt-Software eingegebene Informationen werden nicht an Google Ads weitergegeben.

Diese Messwerkzeuge gelten nur für die BugIt-Website und das Portal. Die BugIt-Software verwendet keine Google Ads-Messung und sendet keine Produkttelemetrie.

## Kontakt

Fragen zum Datenschutz? Besuchen Sie **bugit.dev** und öffnen Sie ein
Support-Ticket über Ihr BugIt-Dashboard — wir helfen gerne.
