# Introduzione a BugIt

BugIt trasforma appunti di test approssimativi in bug report revisionati direttamente all'interno di VS Code. Windows 11 con VS Code e GitHub Copilot è il percorso client qualificato per la release.

## Prima di iniziare

- Installa l'ultima versione di VS Code e accedi a GitHub Copilot.
- Installa un interprete Python qualificato per la release.
- Scarica BugIt dalla dashboard del tuo account ed estrailo in una cartella locale.
- Tieni chiavi di licenza, token, dati dei clienti e codice sorgente privato fuori dalla chat e dai file di configurazione.

## Attiva e configura

- Apri la cartella BugIt estratta come workspace VS Code attendibile.
- In Copilot Chat, seleziona il QA Agent di BugIt e digita `Activate`.
- Inserisci la chiave di licenza solo nel prompt mascherato del terminale.
- Digita `Begin setup` e scegli solo le integrazioni utilizzate dal tuo team.
- Lascia che BugIt verifichi il servizio e il progetto selezionati prima di aprire un ticket.

## Stato della connessione

- Jira Cloud e Confluence Cloud utilizzano il percorso guidato Atlassian Rovo MCP e richiedono l'autenticazione tramite browser oltre a verifiche delle funzionalità in tempo reale.
- Azure DevOps utilizza l'anteprima pubblica MCP remota di Microsoft con ambito organizzativo e richiede la verifica in tempo reale.
- Sentry, GitHub, Linear e Notion sono sperimentali finché non superano i prerequisiti del servizio e le verifiche in tempo reale.
- Altri servizi indicati richiedono un server MCP compatibile fornito dall'organizzazione. BugIt fornisce la guida alla configurazione ma non distribuisce né testa tali server.

## Il tuo primo report

- Descrivi il problema in linguaggio semplice, indicando dove si è verificato e con quale frequenza.
- Rispondi alle eventuali domande necessarie per rendere completi i passaggi di riproduzione.
- Esamina l'anteprima, in particolare i dati privati, la gravità, il progetto e gli allegati.
- Conferma solo quando la destinazione e il ticket finale sono corretti.

## Ottenere assistenza

Esegui prima `Check status` o `Check readiness` nell'agente BugIt. Se il problema persiste, apri un ticket di supporto dalla dashboard del tuo account BugIt senza includere segreti o materiale di progetto riservato.
