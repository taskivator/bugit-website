# Datenschutzerklärung — BugIt

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Zuletzt aktualisiert: 1. August 2026**

Diese Erklärung beschreibt, welche personenbezogenen Daten verarbeitet werden, wenn
Sie die BugIt-Website (bugit.dev), das BugIt Portal (Konto-, Kauf- und
Lizenzverwaltung) und die BugIt QA Agent-Software nutzen, sowie welche Wahlmöglichkeiten
und Rechte Sie haben. Sie ist in klarer Sprache verfasst und soll genau abbilden, wie
das Produkt tatsächlich funktioniert.

## Wer für Ihre Daten verantwortlich ist

BugIt wird unter dem Handelsnamen **Taskivator / BugIt** betrieben. Der operative
Ansprechpartner für alle Datenschutzfragen und -anfragen ist **support@bugit.dev**.

**Der Eigentümer hat sich dafür entschieden, persönliche Angaben zur Identifizierung
des Verantwortlichen nicht zu veröffentlichen. Dies bleibt ein akzeptiertes
Rechtskonformitätsrisiko und wurde keiner externen rechtlichen Prüfung und Freigabe
unterzogen.** Ein Handelsname allein erfüllt nicht die gesetzliche Pflicht, den
für die Datenverarbeitung Verantwortlichen zu benennen; diese Pflicht gilt durch
diese Erklärung daher **nicht** als erfüllt. Aus diesem Grund werden die
registrierten Angaben zur Identität des Verantwortlichen nicht veröffentlicht; soweit
Ihnen das Gesetz einen Anspruch darauf einräumt, können Sie sie unter
support@bugit.dev anfordern.

## Die Kurzfassung

- Die **QA Agent-Software läuft auf Ihrem Rechner.** Ihre Fehlerberichte,
  Spezifikationen, Ihr Glossar, Ihre Screenshots, Ihr Code, Ihre Einstellungen und
  Ihre Tickets werden **nicht** an Taskivator gesendet.
- Um Ihr Konto, Ihren Kauf, Ihre Lizenz und den Support abzuwickeln, verarbeiten die
  **Website und das Portal** einen begrenzten Satz personenbezogener Daten (Ihre
  E-Mail-Adresse, Kaufunterlagen, Lizenz- und Geräteaktivierungen sowie
  Support-Nachrichten), wobei die unten aufgeführten Dienstleister eingesetzt werden.
- Wir **verkaufen** Ihre personenbezogenen Daten **nicht**. Die Werbemessung ist
  **standardmäßig deaktiviert** und läuft nur mit Ihrer Einwilligung.

## Was die QA Agent-Software an Taskivator sendet

BugIt verwendet eine **browserbasierte Aktivierung** — Sie melden sich im Browser
beim BugIt Portal an und bestätigen das Gerät; **es gibt keinen Lizenzschlüssel**,
den Sie eingeben, einfügen oder speichern müssten. Von Ihrem Gerät sendet die
Software nur Lizenz-/Update-Daten:

- einen **signierten Berechtigungs-/Geräteaktivierungsnachweis** aus dieser
  Portal-Anmeldung (damit Ihr Gerät autorisiert und erneut verifiziert werden kann)
  sowie die App-Version,
- einen **anonymen, mit einem Einweg-Hash versehenen Geräte-Fingerabdruck** — einen
  16-stelligen Hash, der aus grundlegenden Geräteattributen abgeleitet wird; er kann
  nicht zurückgerechnet werden, um Sie oder Ihre Hardware zu identifizieren, und
- **nur wenn Sie bei der Ersteinrichtung eine festlegen**, eine kurze von Ihnen
  gewählte Geräte-/Platzbezeichnung, damit sich die Geräteautorisierungen eines
  Team-Kontos unterscheiden lassen. Sie muss niemals echt sein und wird niemals
  überprüft. Wenn Sie keine festlegen, wird nichts gesendet.

Diese gelangen ausschließlich an den Lizenzdienst von Taskivator, um Ihren Platz zu
aktivieren/zu verifizieren und zu prüfen, ob eine neuere Version verfügbar ist.

## Was vollständig auf Ihrem Gerät verbleibt

- Ihre Spezifikationen, Ihr Glossar, Ihr Hausstil und Ihre erlernten Korrekturen
- Ihre `config.json` und lokalen Projektdateien
- Ihre API-Tokens (aufbewahrt im Anmeldeinformationsspeicher Ihres Betriebssystems —
  niemals in einer Datei und niemals an Taskivator übertragen)

Nichts davon wird irgendwohin übertragen.

## Was ausschließlich an die von *Ihnen* verbundenen Dienste geht

Um ein Ticket zu verfassen und einzureichen, wird Ihr Berichtstext an das von Ihnen
genutzte KI-Modell (GitHub Copilot oder Ihr eigener OpenAI-/Anthropic-Schlüssel) und
an den Tracker gesendet, bei dem Sie einreichen (etwa Jira oder Azure DevOps). Das
sind die KI und die Werkzeuge, die **Sie** ausgewählt und verbunden haben — sie
werden niemals über Taskivator geleitet, dorthin kopiert oder von Taskivator
eingesehen, das nicht der Verantwortliche für diese Dienste ist. Mit ihnen werden nur
die zum Einreichen erforderlichen Metadaten ausgetauscht (Vorgangs-ID/-URL sowie die
von Ihnen freigegebenen Inhalte).

## Personenbezogene Daten, die wir verarbeiten, und warum (Website + Portal)

| Daten | Warum (Zweck) | Rechtsgrundlage (DSGVO/UK GDPR) |
|-------|---------------|---------------------------------|
| Konto-E-Mail + Authentifizierungsdaten | Ihr Konto erstellen und schützen, Sie anmelden, Admin-MFA | Vertrag; berechtigtes Interesse (Kontosicherheit) |
| Berechtigungen / Lizenzen | Das von Ihnen Gekaufte bereitstellen und verifizieren | Vertrag |
| Geräteaktivierungen (gehashter Fingerabdruck, optionale Bezeichnung, Betriebssystem-/App-Version) | Geräte-/Platzgrenzen durchsetzen; Ihnen die Geräteverwaltung ermöglichen | Vertrag |
| Team-Mitgliedschaft + Einladungen | Den Team-Plan bereitstellen (bis zu 5 Mitglieder) | Vertrag |
| Kauf- / Bestellunterlagen | Den Verkauf abwickeln, Belege, Lizenzausstellung | Vertrag; gesetzliche Pflicht (Buchhaltung) |
| Zahlungsdaten | Zahlungen entgegennehmen (durch Stripe abgewickelt — wir speichern keine vollständigen Kartennummern) | Vertrag |
| Erstattungen / Streitfälle / Rückbuchungen | Erstattungen und Zahlungsstreitigkeiten bearbeiten | Vertrag; gesetzliche Pflicht |
| Steuerunterlagen | Steuer-/Buchhaltungspflichten erfüllen | Gesetzliche Pflicht |
| Support-Korrespondenz | Ihre Fragen beantworten und Support leisten | Vertrag; berechtigtes Interesse |
| Sicherheits-, Protokoll- und Admin-Audit-Aufzeichnungen | Missbrauch erkennen, Konten schützen, einen Prüfpfad führen | Berechtigtes Interesse (Sicherheit) |
| Von Ihnen gespeicherte Anbieter-/Tracker-Konfiguration | Ihnen die Verbindung von Jira/Azure DevOps usw. ermöglichen; wir speichern Verbindungsmetadaten, nicht Ihre Daten in diesen Tools | Vertrag |
| Einwilligungsentscheidungen (Cookies/Werbung sowie deren Widerruf) | Ihre Entscheidungen respektieren und nachweisen | Einwilligung; gesetzliche Pflicht (Nachweis) |
| Website-Analyse | Die allgemeine Website-Leistung verstehen (cookielos) | Berechtigtes Interesse |
| Werbemessung | Verstehen, ob Anzeigen zu Käufen führen | Einwilligung (standardmäßig deaktiviert) |
| EU/UK-Einwilligung zu Sofortlieferung / Widerruf | Ihre Bestätigung an der Kasse nachweisen | Gesetzliche Pflicht; Vertrag |

## Dienstleister (Auftragsverarbeiter) und internationale Datenübermittlungen

Wir setzen die folgenden Anbieter ein, um BugIt zu betreiben. Jeder verarbeitet
personenbezogene Daten ausschließlich, um uns seinen Dienst zu erbringen. Soweit
personenbezogene Daten außerhalb des EWR/des Vereinigten Königreichs übermittelt
werden, stützen wir uns auf den Auftragsverarbeitungszusatz des Anbieters und, sofern
anwendbar, auf die Standardvertragsklauseln (oder einen gleichwertigen
Übermittlungsmechanismus).

| Anbieter | Zweck | Datenkategorien | Wahrscheinlicher Verarbeitungsort | Übermittlungsgrundlage | Aufbewahrung / Löschung |
|----------|-------|-----------------|-----------------------------------|------------------------|-------------------------|
| **Supabase** | Datenbank + Authentifizierung (Konten, Berechtigungen, Geräte, Bestellungen, Audit-Protokolle) | Konto-, Berechtigungs-, Geräte-, Bestell-, Protokolldaten | Vereinigte Staaten und/oder EU (Projektregion) | Auftragsverarbeitungszusatz + SCCs, sofern anwendbar | Wird aufbewahrt, solange Ihr Konto aktiv ist; gelöscht oder anonymisiert, wenn nicht mehr benötigt (siehe Aufbewahrungstabelle) |
| **Stripe** | Zahlungsabwicklung, Erstattungen, Streitfälle, Steuerberechnung | Zahlungs-, Abrechnungs-, Transaktionsdaten | Vereinigte Staaten + weltweit | Auftragsverarbeitungszusatz + SCCs | Von Stripe gemäß seiner Richtlinie und den gesetzlichen/buchhalterischen Anforderungen aufbewahrt |
| **Cloudflare** | Website-Auslieferung, Sicherheit, cookielose Web-Analyse | Netzwerk-/technische Daten; aggregierte Analysedaten | Globales Edge-Netzwerk | Auftragsverarbeitungszusatz + SCCs | Kurzlebig; die Analyse ist aggregiert und cookielos |
| **Vercel** | Hosting der Website-/Portal-Anwendung | Anfrage-/technische Daten | Vereinigte Staaten + weltweit | Auftragsverarbeitungszusatz + SCCs | Betriebsprotokolle kurzzeitig aufbewahrt |
| **Resend** | Versand transaktionaler E-Mails (Belege, Lizenz, Support) | E-Mail-Adresse, Nachrichten-Metadaten | Vereinigte Staaten | Auftragsverarbeitungszusatz + SCCs | Gemäß Anbieterrichtlinie aufbewahrt; Zustellprotokolle kurzzeitig |
| **Google Ads** | Werbemessung (nur mit Einwilligung) | Kaufwert, Währung, nicht identifizierende Bestellreferenz | Vereinigte Staaten + weltweit | Auftragsverarbeitungszusatz + SCCs | Nur mit Einwilligung; keine Fehlerbericht-Inhalte oder Kartendaten weitergegeben |

Wir **verkaufen** keine personenbezogenen Daten, und die Werbemessung erhält niemals
Ihre Fehlerberichte, die Inhalte der BugIt-Software oder Zahlungskartendaten.

## Wie lange wir Daten aufbewahren (Aufbewahrung)

Soweit eine Frist nicht gesetzlich festgelegt ist, bewahren wir Daten nur so lange
auf, wie es für den Zweck erforderlich ist, und löschen oder anonymisieren sie
anschließend.

| Kategorie | Aufbewahrung |
|-----------|--------------|
| Konten | Solange aktiv; nach Kontolöschung gelöscht/anonymisiert (vorbehaltlich gesetzlicher Aufbewahrungspflichten) |
| Authentifizierungsaufzeichnungen | Solange das Konto aktiv ist |
| Berechtigungen / Lizenzen | Für die Lizenzlaufzeit und einen begrenzten Zeitraum danach für Support und Streitfälle |
| Geräte / Aktivierungen | Solange die Berechtigung aktiv ist; freigegeben, wenn Sie ein Gerät entfernen oder die Lizenz endet |
| Team-Mitgliedschaften / Einladungen | Solange die Team-Lizenz aktiv ist; Einladungen verfallen |
| Zahlungen | Für die Lizenzlaufzeit zuzüglich des für Buchhaltung/Steuer erforderlichen Zeitraums |
| Erstattungen / Streitfälle / Rückbuchungen | Für den zu ihrer Bearbeitung und ihrem Nachweis erforderlichen Zeitraum zuzüglich der Buchhaltungszeiträume |
| Steuer- / Buchhaltungsunterlagen | Wie nach dem geltenden Steuerrecht erforderlich (zum Beispiel bis zu 7 Jahre) |
| Sicherheitsprotokolle | Ein begrenzter Zeitraum, der für Sicherheit und Missbrauchserkennung ausreicht |
| Admin-Audit-Protokolle | Als Integritätsnachweis für einen begrenzten Zeitraum aufbewahrt |
| Support-Korrespondenz | Solange sie zur Unterstützung erforderlich ist, und einen begrenzten Zeitraum danach |
| Marketing-Einwilligung | Solange die Einwilligung besteht, und danach zum Nachweis |
| Einwilligungswiderrufe | Als Nachweis aufbewahrt, dass eine Entscheidung respektiert wurde |
| Sicherungen gelöschter Konten | Nach der Löschung im Rahmen der üblichen Backup-Rotation aus den routinemäßigen Sicherungen entfernt |

## Cookies und Werbung

Die Website verwendet nur essenzielle Cookies, um zu funktionieren. Nicht
essenzielle (Werbe-)Cookies sind **standardmäßig deaktiviert** und werden nur
geladen, wenn Sie über das Cookie-Banner oder die **Cookie-Einstellungen** zustimmen.
Wir verwenden Cloudflare Web Analytics, das cookielos ist und Sie nicht
seitenübergreifend verfolgt. Sie können Ihre Auswahl jederzeit ändern oder
widerrufen.

## Ihre Rechte

Je nach Ihrem Wohnort (zum Beispiel nach der EU-/UK-DSGVO oder Japans APPI) haben Sie
möglicherweise das Recht:

- auf **Auskunft** über die personenbezogenen Daten, die wir über Sie speichern
- auf **Berichtigung** unrichtiger Daten
- auf **Löschung** Ihrer Daten (und Ihres Kontos)
- auf **Einschränkung** oder **Widerspruch** gegen bestimmte Verarbeitungen
- auf **Datenübertragbarkeit** — bestimmte Daten in einem übertragbaren Format zu
  erhalten
- auf **Widerruf der Einwilligung** (z. B. Werbemessung) jederzeit, ohne die
  Rechtmäßigkeit der zuvor erfolgten Verarbeitung zu berühren

Um eines dieser Rechte auszuüben, senden Sie eine E-Mail von Ihrer Konto-Adresse an
**support@bugit.dev**. Sie können auch **Ihr Konto löschen**, um Ihre Daten zu
entfernen (vorbehaltlich der Aufzeichnungen, die wir gesetzlich aufbewahren müssen,
etwa Steuerunterlagen). Wir antworten innerhalb der nach geltendem Recht
erforderlichen Frist.

**Beschwerden.** Wenn Sie sich im EWR befinden, können Sie sich bei Ihrer örtlichen
Datenschutzbehörde beschweren; im Vereinigten Königreich beim Information
Commissioner's Office (ico.org.uk); in Japan bei der Personal Information Protection
Commission (ppc.go.jp). Wir würden uns freuen, Ihr Anliegen zunächst selbst unter
support@bugit.dev klären zu dürfen.

## Änderungen

Wir können diese Erklärung aktualisieren, wenn sich das Produkt oder die Rechtslage
ändert; das oben genannte Datum „Zuletzt aktualisiert" gibt die aktuelle Fassung
wieder. Verwandte Dokumente: die Offenlegung zu gewerblichen Transaktionen
(特定商取引法に基づく表記 — Angaben nach dem japanischen Gesetz über gewerbliche
Transaktionen) und die Rückerstattungsrichtlinie.

## Kontakt

Datenschutzfragen oder -anfragen: **support@bugit.dev**. Sie können auch ein
Support-Ticket über Ihr BugIt-Dashboard unter **bugit.dev** öffnen.
