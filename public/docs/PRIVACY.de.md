# Datenschutz — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Eine allgemein verständliche Zusammenfassung dessen, was die Software erfasst und
was nicht. Alles läuft auf Ihrem eigenen Rechner.

## Was die Software an Taskivator sendet

BugIt aktiviert sich über Ihren Webbrowser: Sie melden sich bei Ihrem eigenen
BugIt-Konto im BugIt-Portal an und bestätigen dieses Gerät. Es gibt **keinen
Lizenzschlüssel**, den Sie eingeben, einfügen oder weitergeben müssen.

Um Ihre Lizenz zu aktivieren und gültig zu halten, sendet die Software nur das,
was nötig ist, um Ihre Berechtigung an diese Installation und dieses Gerät zu
binden — **Lizenz-/Aktivierungsdaten**:

- eine **Installationskennung** — ein zufälliger Wert, der einmalig für diese
  BugIt-Installation erstellt wird. Er wird nicht aus Ihrer Hardware abgeleitet
  und identifiziert Sie nicht,
- einen **anonymen, mit einem Einweg-Hash versehenen Geräte-Fingerabdruck** — ein
  16-stelliger Hash, der aus grundlegenden Geräteattributen abgeleitet wird. Er
  kann nicht rückgängig gemacht werden, um Sie oder Ihre Hardware zu
  identifizieren,
- eine **Gerätebezeichnung** — den Hostnamen Ihres Computers, damit Sie dieses
  Gerät in Ihrem Konto wiedererkennen und es jederzeit über das Portal entfernen
  können,
- den **Namen Ihres Betriebssystems** und die **BugIt-Version**, um die
  Kompatibilität zu prüfen und festzustellen, ob ein Update verfügbar ist, und
- kurzlebiges **Aktivierungsmaterial** — eine einmalige Challenge und ein
  Bestätigungs-Token, die nur zum Abschluss der Anmeldung verwendet werden, sowie
  ein Einweg-Hash eines lokalen Bestätigungsgeheimnisses. Das Geheimnis selbst
  verlässt niemals Ihren Rechner, und die rohe Challenge sowie das Token werden
  niemals gespeichert.

Ihre Kontoanmeldung erfolgt in Ihrem Browser im Portal. Im Gegenzug stellt das
Portal eine **signierte Berechtigung** aus, die an dieses Gerät und diese
Installation gebunden ist und die die Software lokal verifiziert.

Diese gelangen ausschließlich an das BugIt-Portal und dienen nur dazu, Ihre
Lizenz zu aktivieren und zu verifizieren, Ihre Geräte zu verwalten und zu prüfen,
ob eine neuere Version verfügbar ist. Wenn Sie ein Update herunterladen,
protokolliert das Portal außerdem den Download — einschließlich der IP-Adresse und
des Browser-User-Agents der Anfrage — zur Sicherheit und zur
Missbrauchsprävention.

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
