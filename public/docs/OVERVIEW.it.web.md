# QA Agent di BugIt — Panoramica

> **Avviso sulla traduzione.** Questo documento è stato tradotto automaticamente e non è stato revisionato da madrelingua. Fa fede la versione inglese: in caso di difformità prevale il testo inglese. Per la formulazione più accurata e aggiornata, faccia riferimento al documento in inglese.

BugIt è un agente commerciale VS Code Copilot che trasforma appunti di test grezzi in bug report coerenti. Redige le bozze in locale, nel tuo workspace, e scrive sui servizi collegati solo dopo l'anteprima e la conferma.

## Flusso di lavoro principale

- Raccogli appunti di riproduzione approssimativi, log, screenshot e comportamento atteso.
- Redigi un report strutturato con titolo, gravità, ambiente, passaggi ed evidenze.
- Cerca possibili duplicati nel tracker collegato.
- Visualizza in anteprima e approva la destinazione e il contenuto finale prima di qualsiasi scrittura esterna.
- Aggiungi commenti di verifica dopo che una correzione è stata ritestata.

## Privacy e controllo

- BugIt non invia a Taskivator alcun dato analitico di prodotto né telemetria sui ticket.
- Il provider AI collegato e le integrazioni abilitate elaborano solo i contenuti che scegli di inviare loro.
- Le richieste di licenza e aggiornamento utilizzano i dati di licenza e un identificatore di dispositivo unidirezionale, non il contenuto dei ticket.
- La modalità dry-run impedisce agli helper Python inclusi di scrivere, ma devi comunque esaminare le azioni MCP esterne.
- I file di configurazione non devono mai contenere valori di credenziali.

## Livelli di integrazione

- Registra con una credenziale che crei nel tuo account, certificato contro un account reale: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. Tutti e undici, tramite l'API di ciascun tracker.
- Fonte di conoscenza guidata, di sola lettura: Confluence Cloud tramite Atlassian Rovo MCP, con accesso dal browser. Sentry e Notion restano sperimentali finché non superano le verifiche dal vivo.
- Solo guida alla configurazione: server compatibili forniti dall'organizzazione per strumenti di crash, gestione dei test, comunicazioni e servizi di knowledge.
- Non supportato dalla configurazione automatica: connettori di storage S3, Google Drive e Azure Blob.

## Ambito della release

- BugIt è l'attuale release commerciale pubblicata, mantenuta attivamente.
- Windows 11, VS Code, GitHub Copilot e Python sono l'ambiente qualificato per la release.
- La Guida utente completa e la Panoramica sono disponibili come PDF in inglese e in ogni lingua supportata — visualizzale in anteprima o scaricale qui sotto.

## Policy

- Leggi l'[informativa sulla privacy](/public/docs/PRIVACY.md).
- Consulta le [indicazioni sulla sicurezza](/public/docs/SECURITY.md).
