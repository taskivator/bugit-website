# Sicurezza

> **Avviso sulla traduzione.** Questo documento è stato tradotto automaticamente e non è stato revisionato da madrelingua. Fa fede la versione inglese: in caso di difformità prevale il testo inglese. Per la formulazione più accurata e aggiornata, fai riferimento al documento in inglese.

BugIt QA Agent è un assistente in cui le decisioni spettano a una persona (human in the loop). Agisce solo tramite la tua sessione di VS Code e le integrazioni che attivi.

## Come BugIt ti protegge
- **Nessuna scrittura senza conferma.** Ogni creazione, commento, allegato o notifica che contiene la tua segnalazione viene prima mostrato in anteprima; gli invii irreversibili richiedono che tu digiti FILE IT. Il solo testo della chat non invia mai nulla, e un semplice «sì» non basta. Un'eccezione: un test di connessione che avvii tu stesso con `notify connect`, `notify test` o `notify doctor --live` invia un messaggio di prova fisso senza anteprima, al canale che indichi oppure, se non ne indichi nessuno, a ogni canale che hai attivato. Non contiene alcun contenuto di segnalazione, e il dry run lo blocca.
- **Dry run = sola lettura, ovunque si svolga il tuo lavoro.** `QA_AGENT_DRY_RUN=1` impedisce a BugIt di scrivere nei tuoi tracker e anche di leggerne i dati: nessun ticket, nessun commento, nessun allegato, nessuna notifica e nessuna credenziale salvata sbloccata. Un'eccezione, che riguarda BugIt stesso e non i tuoi dati: i comandi che esegui deliberatamente per attivare la licenza di questa installazione o aggiornarla raggiungono comunque il server delle licenze di BugIt, e `tools/update.py` installa comunque la release firmata che scarica, perché un computer la cui shell ha questa variabile impostata in modo permanente deve poter ricevere comunque una correzione di sicurezza. Dire «dry run» in chat chiede all'assistente di fermarsi, il che è utile ma non offre la stessa garanzia: solo la variabile d'ambiente imposta la modalità che il codice fa rispettare.
- **Nessun segreto nei file.** `config.json` contiene solo organizzazioni e URL; i token restano nell'archivio delle credenziali del tuo sistema operativo. Il validatore segnala tutto ciò che ha l'aspetto di un segreto. `redact.py` fa il possibile per rimuovere dalle bozze indirizzi email, token e indirizzi IP.
- **Disattivato per impostazione predefinita.** Ogni integrazione viene fornita disattivata; nulla si connette né invia qualcosa finché non lo scegli tu.
- **L'output sono dati.** Il testo di pagine, ticket e crash viene trattato come dati, non come comandi, quindi le istruzioni iniettate vengono segnalate e mostrate, non eseguite.

## Limiti noti
- Il blocco delle scritture è applicato dall'agente, non dal sistema operativo; la variabile d'ambiente ferma in modo rigido solo gli strumenti di supporto Python inclusi. Eseguilo in un ambiente di esecuzione affidabile.
- L'agente raggiunge tutto ciò che colleghi, e l'ambito delle credenziali = la portata del danno possibile. Usa token con **privilegi minimi**.
- La maggior parte dei tracker non riesce a eliminare davvero una issue; lì l'«annulla» è quindi limitato per scelta progettuale.

## Checklist per rafforzare la sicurezza
1. Usa un account di servizio dedicato e con privilegi minimi per ogni tracker.
2. Conserva i token nell'archivio del sistema operativo; non incollarli mai in `config.json`.
3. Esegui `python tools/validate_config.py` dopo la configurazione per individuare fughe di dati ed errori di configurazione.
4. Avvia solo i server MCP che usi; ferma gli altri.

## Come segnalare una vulnerabilità
Scrivi a **support@bugit.dev** indicando i passaggi per riprodurla. Non aprire una issue pubblica per le segnalazioni di sicurezza.
