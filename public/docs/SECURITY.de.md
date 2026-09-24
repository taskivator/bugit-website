# Sicherheit

> **Hinweis zur Übersetzung.** Dieses Dokument wurde maschinell übersetzt und nicht von Muttersprachlern geprüft. Maßgeblich ist die englische Fassung: Bei Abweichungen gilt der englische Text. Für den genauesten und aktuellsten Wortlaut ziehen Sie bitte das englische Dokument heran.

BugIt QA Agent ist ein Assistent, bei dem der Mensch die Entscheidungen trifft (human in the loop). Er handelt nur über Ihre VS Code-Sitzung und die Integrationen, die Sie aktivieren.

## Wie BugIt Sie schützt
- **Kein Schreibzugriff ohne Bestätigung.** Jedes Anlegen, Kommentieren, Anhängen und Benachrichtigen, das Ihren Bericht enthält, wird vorab als Vorschau angezeigt; für unwiderrufliche Einreichungen müssen Sie FILE IT eingeben. Chattext allein reicht nie zum Einreichen, und ein einfaches „ja“ genügt nicht. Eine Ausnahme: Ein Verbindungstest, den Sie selbst mit `notify connect`, `notify test` oder `notify doctor --live` starten, sendet ohne Vorschau eine feste Testnachricht, und zwar an den Kanal, den Sie nennen, oder, wenn Sie keinen nennen, an jeden Kanal, den Sie eingeschaltet haben. Sie enthält keine Berichtsinhalte, und der Probelauf (dry run) blockiert sie.
- **Probelauf (dry run) = nur lesen, überall dort, wo Ihre Arbeit stattfindet.** `QA_AGENT_DRY_RUN=1` verhindert, dass BugIt in Ihre Tracker schreibt, und verhindert auch, dass es aus ihnen liest: kein Ticket, kein Kommentar, kein Anhang, keine Benachrichtigung, und keine gespeicherten Zugangsdaten werden entsperrt. Eine Ausnahme, und sie betrifft BugIt selbst, nicht Ihre Daten: Befehle, die Sie bewusst ausführen, um diese Installation zu lizenzieren oder zu aktualisieren, erreichen weiterhin den eigenen Lizenzserver von BugIt, und `tools/update.py` installiert weiterhin die signierte Version, die es abruft, denn ein Rechner, dessen Shell diese Variable dauerhaft gesetzt hat, muss trotzdem eine Sicherheitskorrektur erhalten können. Wenn Sie im Chat „dry run“ sagen, bitten Sie den Assistenten, abzuwarten. Das ist nützlich, bietet aber nicht dieselbe Garantie: Nur die Umgebungsvariable legt den Modus fest, den der Code durchsetzt.
- **Keine Geheimnisse in Dateien.** `config.json` enthält nur Organisationen und URLs; Tokens liegen im Anmeldeinformationsspeicher Ihres Betriebssystems. Der Validator markiert alles, was wie ein Geheimnis aussieht. `redact.py` entfernt nach bestem Bemühen E-Mail-Adressen, Tokens und IP-Adressen aus Entwürfen.
- **Standardmäßig ausgeschaltet.** Jede Integration wird deaktiviert ausgeliefert; nichts verbindet sich oder reicht etwas ein, bevor Sie zustimmen.
- **Ausgaben sind Daten.** Text aus Seiten, Tickets und Absturzberichten wird als Daten behandelt, nicht als Befehle. Eingeschleuste Anweisungen werden deshalb markiert und angezeigt, aber nicht befolgt.

## Bekannte Grenzen
- Die Schreibsperre setzt der Agent durch, nicht das Betriebssystem; die Umgebungsvariable stoppt verbindlich nur die mitgelieferten Python-Hilfsprogramme. Führen Sie ihn in einer vertrauenswürdigen Laufzeitumgebung aus.
- Der Agent erreicht alles, was Sie verbinden, und der Umfang der Zugangsdaten = das Ausmaß des möglichen Schadens. Verwenden Sie Tokens mit **minimalen Rechten**.
- Die meisten Tracker können ein Issue nicht wirklich löschen; „Rückgängig machen“ ist dort bewusst eingeschränkt.

## Checkliste zur Absicherung
1. Verwenden Sie pro Tracker ein eigenes Dienstkonto mit minimalen Rechten.
2. Bewahren Sie Tokens im Speicher des Betriebssystems auf; fügen Sie sie niemals in `config.json` ein.
3. Führen Sie nach der Einrichtung `python tools/validate_config.py` aus, um Lecks und Fehlkonfigurationen zu erkennen.
4. Starten Sie nur die MCP-Server, die Sie verwenden; stoppen Sie die übrigen.

## Eine Schwachstelle melden
Schreiben Sie an **support@bugit.dev** und beschreiben Sie die Schritte zur Reproduktion. Eröffnen Sie für Sicherheitsmeldungen kein öffentliches Issue.
