# QA Agent di BugIt — Panoramica

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

- Guidato: Jira Cloud e Confluence Cloud tramite Atlassian Rovo MCP.
- Guidato in anteprima pubblica: Azure DevOps tramite il servizio MCP remoto di Microsoft.
- Sperimentale con verifica in tempo reale: Sentry, GitHub, Linear e Notion.
- Solo guida alla configurazione: server compatibili forniti dall'organizzazione per altri tracker, strumenti di crash, gestione dei test, comunicazioni e servizi di knowledge.
- Non supportato dalla configurazione automatica: connettori di storage S3, Google Drive e Azure Blob.

## Ambito della release

- BugIt è l'attuale release commerciale pubblicata, mantenuta attivamente.
- Windows 11, VS Code, GitHub Copilot e Python sono l'ambiente qualificato per la release.
- La Guida utente completa e la Panoramica sono disponibili come PDF in inglese e in ogni lingua supportata — visualizzale in anteprima o scaricale qui sotto.

## Policy

- Leggi l'[informativa sulla privacy](/public/docs/PRIVACY.md).
- Consulta le [indicazioni sulla sicurezza](/public/docs/SECURITY.md).
