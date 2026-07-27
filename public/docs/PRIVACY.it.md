# Privacy — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Un riepilogo in linguaggio semplice di ciò che il Software raccoglie e di ciò che non
raccoglie. Tutto viene eseguito sulla Sua macchina.

## Che cosa il Software invia a Taskivator

BugIt si attiva tramite il Suo browser web: Lei accede al Suo account BugIt sul
Portale BugIt e approva questo dispositivo. Non c'è **alcuna chiave di licenza** da
inserire, incollare o condividere.

Per attivare e mantenere valida la Sua licenza, il Software invia soltanto ciò che è
necessario per vincolare il Suo diritto d'uso a questa installazione e a questo
dispositivo — **dati di licenza/attivazione**:

- un **identificativo di installazione** — un valore casuale creato una sola volta per
  questa installazione di BugIt. Non deriva dal Suo hardware e non La identifica,
- un'**impronta del dispositivo anonima, sottoposta ad hash a senso unico** — un hash
  di 16 caratteri derivato da attributi di base della macchina. Non può essere
  invertito per identificare Lei o il Suo hardware,
- un'**etichetta del dispositivo** — il nome host del Suo computer, così da poter
  riconoscere questo dispositivo nel Suo account e rimuoverlo dal Portale quando
  desidera,
- il **nome del Suo sistema operativo** e la **versione di BugIt**, per verificare la
  compatibilità e se è disponibile un aggiornamento, e
- **materiale di attivazione** di breve durata — una sfida (challenge) monouso e un
  token di approvazione utilizzati unicamente per completare l'accesso, oltre a un hash
  a senso unico di un segreto di conferma locale. Il segreto stesso non lascia mai la
  Sua macchina, e la sfida e il token grezzi non vengono mai memorizzati.

L'accesso al Suo account avviene nel Suo browser sul Portale. In cambio, il Portale
emette un **diritto d'uso firmato** vincolato a questo dispositivo e a questa
installazione, che il Software verifica localmente.

Questi dati vengono trasmessi unicamente al Portale BugIt, e solo per attivare e
verificare la Sua licenza, gestire i Suoi dispositivi e controllare se è disponibile
una versione più recente. Quando scarica un aggiornamento, il Portale registra anche
il download — compresi l'indirizzo IP della richiesta e lo user-agent del browser —
per finalità di sicurezza e prevenzione degli abusi.

## Che cosa resta interamente sul Suo dispositivo

- Le Sue specifiche, il glossario, lo stile aziendale e le correzioni apprese
- Il Suo `config.json` e i file di progetto locali
- I Suoi token API (conservati nel gestore delle credenziali del Suo sistema operativo)

Nessuno di questi dati viene trasmesso in alcun luogo.

## Che cosa viene inviato solo ai servizi che *Lei* collega

Per redigere e inoltrare un ticket, il testo della Sua segnalazione viene inviato al
modello AI che utilizza (GitHub Copilot, oppure la Sua chiave OpenAI/Anthropic) e al
tracker su cui effettua l'inoltro (come Jira o Azure DevOps). Si tratta dell'AI e
degli strumenti che **Lei** ha scelto e collegato — non vengono mai instradati
attraverso Taskivator, né copiati o visti da Taskivator.

## Credenziali

I token API risiedono nel gestore delle credenziali del Suo sistema operativo — mai
in un file e mai trasmessi a Taskivator.

## Statistiche del sito web

BugIt utilizza Cloudflare Web Analytics per comprendere le prestazioni generali del sito web e il numero di visite. Questo servizio è progettato senza cookie di tracciamento tra siti.

Con il tuo permesso, potremmo utilizzare anche la misurazione di Google Ads per capire se la nostra pubblicità genera acquisti. Puoi gestire le tue scelte in qualsiasi momento tramite le Preferenze cookie.

Quando la misurazione degli acquisti è attiva, informazioni limitate sulla transazione, come il valore dell'acquisto, la valuta e un riferimento d'ordine univoco, possono essere utilizzate per l'attribuzione. Il contenuto dei report di bug, i dati della carta di pagamento e le informazioni inserite nel software BugIt non vengono condivisi con Google Ads.

Questi strumenti di misurazione si applicano solo al sito web e al portale BugIt. Il software BugIt non utilizza la misurazione di Google Ads né invia telemetria del prodotto.

## Contatti

Domande sulla privacy? Visiti **bugit.dev** e apra un ticket di assistenza dalla Sua
dashboard BugIt — siamo felici di aiutarla.
