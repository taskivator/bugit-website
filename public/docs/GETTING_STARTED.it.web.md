# Introduzione a BugIt

> **Avviso sulla traduzione.** Questo documento è stato tradotto automaticamente e non è stato revisionato da madrelingua. Fa fede la versione inglese: in caso di difformità prevale il testo inglese. Per la formulazione più accurata e aggiornata, faccia riferimento al documento in inglese.

BugIt trasforma appunti di test approssimativi in bug report revisionati direttamente all'interno di VS Code. Windows 11 con VS Code e GitHub Copilot è il percorso client qualificato per la release.

## Prima di iniziare

- Installa l'ultima versione di VS Code e accedi a GitHub Copilot.
- Installa un interprete Python qualificato per la release.
- Scarica BugIt dalla dashboard del tuo account ed estrailo in una cartella locale.
- Tieni token, dati dei clienti e codice sorgente privato fuori dalla chat e dai file di configurazione.

## Attiva e configura

- Apri la cartella BugIt estratta come workspace VS Code attendibile.
- In Copilot Chat, seleziona il QA Agent di BugIt e digita `Activate` (aggiungi `--solo` o `--team` se il tuo account ha entrambi).
- BugIt apre il BugIt Portal nel browser. Accedi con il tuo account BugIt: la password resta nel browser e non viene mai inserita in VS Code.
- Scegli il diritto Solo o Team per questa macchina, quindi controlla e approva questo dispositivo.
- Torna a VS Code. BugIt completa l'autorizzazione automaticamente: non c'è alcuna chiave di licenza da copiare, incollare o mostrare.
- Digita `Begin setup` e scegli solo le integrazioni utilizzate dal tuo team.
- Lascia che BugIt verifichi il servizio e il progetto selezionati prima di aprire un ticket.

## Gestisci il tuo accesso

- Un'installazione usa un solo diritto attivo per volta. Per spostare questa macchina su un altro diritto Solo o Team, digita `Switch license` e approva di nuovo nel browser; se annulli, resta il diritto attuale.
- `Deactivate` rimuove il diritto solo da questa macchina. Posti, dispositivi, iscrizioni, ruoli e fatturazione si gestiscono nel Portal, non in VS Code.
- L'accesso Team è per persona: ogni membro accede con il proprio account BugIt e un'iscrizione attiva. Non esiste alcuna chiave condivisa né un accesso condiviso.
- Dopo una verifica online riuscita, BugIt continua a funzionare offline fino a 72 ore, sia per Solo sia per Team, e applica l'ultimo stato del Portal appena si riconnette.
- Gli aggiornamenti sono autorizzati dal tuo diritto firmato, quindi scaricare una nuova versione non richiede mai una chiave.

## Stato della connessione

- BugIt registra in undici tracker tramite l'API REST di ciascuno, con una credenziale che crei nel tuo account: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. La configurazione verifica la connessione prima che tu ci faccia affidamento.
- Confluence Cloud si collega come fonte di conoscenza tramite il percorso guidato Atlassian Rovo MCP, che usa l'accesso dal browser.
- Confluence Cloud si collega come fonte di conoscenza tramite il percorso guidato Atlassian Rovo MCP, con accesso dal browser. Sentry e Notion sono sperimentali finché non superano i prerequisiti e le verifiche dal vivo.
- Gli altri servizi citati richiedono un server MCP compatibile fornito dall'organizzazione. BugIt offre indicazioni di configurazione ma non fornisce né collauda quei server.

## Il tuo primo report

- Descrivi il problema in linguaggio semplice, indicando dove si è verificato e con quale frequenza.
- Rispondi alle eventuali domande necessarie per rendere completi i passaggi di riproduzione.
- Esamina l'anteprima, in particolare i dati privati, la gravità, il progetto e gli allegati.
- Conferma solo quando la destinazione e il ticket finale sono corretti.

## Ottenere assistenza

Esegui prima `Check status` o `Check readiness` nell'agente BugIt. Se il problema persiste, apri un ticket di supporto dalla dashboard del tuo account BugIt senza includere segreti o materiale di progetto riservato. Il supporto è disponibile solo in inglese.
