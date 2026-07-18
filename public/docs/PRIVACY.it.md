# Privacy — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Un riepilogo in linguaggio semplice di ciò che il Software raccoglie e di ciò che non
raccoglie. Tutto viene eseguito sulla Sua macchina.

## Che cosa il Software invia a Taskivator

L'unica cosa che il Software ci invia sono **dati di licenza/aggiornamento**:

- la Sua **chiave di licenza**,
- un'**impronta del dispositivo anonima, sottoposta ad hash a senso unico** — un hash
  di 16 caratteri derivato da attributi di base della macchina. Non può essere
  invertito per identificare Lei o il Suo hardware, e
- **solo se ne imposta una durante la configurazione iniziale**, una breve etichetta
  di postazione da Lei scelta, così da poter distinguere le postazioni di una licenza
  Team (ad es. un nome, un nome utente o un'email — mai obbligatoriamente reale e mai
  verificata). Se non ne imposta alcuna, semplicemente non viene mai inviata.

Questi dati vengono trasmessi unicamente al server delle licenze di Taskivator, e
solo per attivare/verificare la Sua postazione e per controllare se è disponibile una
versione più recente. **Nessuna telemetria, nessuna analisi, nessun tracciamento,
nessuna pubblicità — mai.**

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

Il sito bugit.dev utilizza Cloudflare Web Analytics, un servizio rispettoso della privacy, per misurare le prestazioni delle pagine e il numero di visite. Non usa cookie e non vi traccia tra i siti. Questo riguarda solo il sito web. Il Software in sé non invia alcun dato di analisi, come descritto sopra.

## Contatti

Domande sulla privacy? Visiti **bugit.dev** e apra un ticket di assistenza dalla Sua
dashboard BugIt — siamo felici di aiutarla.
