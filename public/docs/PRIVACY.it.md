# Informativa sulla Privacy di BugIt

> **Avviso sulla traduzione.** Questo documento è stato tradotto automaticamente e non è stato revisionato da madrelingua. Fa fede la versione inglese: in caso di difformità prevale il testo inglese. Per la formulazione più accurata e aggiornata, faccia riferimento al documento in inglese.

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Ultimo aggiornamento: 2 agosto 2026**

La presente informativa spiega quali dati personali trattiamo quando utilizza il sito
web di BugIt (bugit.dev), il BugIt Portal (gestione dell'account, degli acquisti e
delle licenze) e il software BugIt QA Agent, nonché le scelte e i diritti a Sua
disposizione.

## Titolare del servizio e contatto privacy

BugIt è gestito con il nome commerciale Taskivator. Le domande sulla privacy, le
richieste relative ai dati personali e le richieste della denominazione legale e dei
recapiti professionali del gestore possono essere inviate a
[support@bugit.dev](mailto:support@bugit.dev). Le informazioni richieste sul gestore
vengono fornite senza ritardo.

## In sintesi

- Il software BugIt viene eseguito sulla Sua macchina. Le Sue segnalazioni di bug,
  specifiche, glossari, schermate, il Suo codice, le Sue impostazioni e i Suoi ticket
  non vengono trasmessi a Taskivator.
- Per gestire account, acquisto, licenza e assistenza, il sito web e il Portal
  trattano una quantità limitata di dati personali.
- Non vendiamo dati personali. La misurazione pubblicitaria è disattivata per
  impostazione predefinita e funziona solo se Lei la attiva.

## Cosa ci invia il software BugIt

BugIt si attiva tramite il browser: Lei accede al BugIt Portal e approva il
dispositivo. Non esiste alcuna chiave di licenza da inserire o conservare. Dal Suo
dispositivo il software invia solo ciò che serve a far funzionare la licenza:

- un **identificatore di installazione**, che distingue questa copia di BugIt affinché una
  modifica della sua licenza sia applicata all'installazione giusta,
- un'**impronta del dispositivo sottoposta ad hash**: un hash unidirezionale di 16 caratteri di
  attributi stabili della macchina, usato per riconoscere lo stesso computer ai fini dei limiti
  di dispositivi e della prevenzione delle frodi. Riceviamo l'hash, mai gli attributi da cui
  deriva,
- un'**etichetta del dispositivo**, cioè il nome di rete del suo computer, così che lei possa
  riconoscere e distinguere i propri dispositivi nel suo account,
- il **nome del sistema operativo** e la sua versione, e la **versione di BugIt**, così che
  possiamo indicarle se è disponibile una versione più recente,
- **materiale di attivazione** di breve durata: un valore casuale creato per quella singola
  richiesta, tenuto solo in memoria e mai scritto su disco. Dimostra che l'approvazione data nel
  suo browser appartiene a quella richiesta e non può essere riutilizzata.
- un **segreto di conferma** per ogni attivazione: un secondo valore casuale, generato sul
  suo dispositivo e conservato nell'archivio protetto del suo sistema operativo. Ne
  riceviamo l'hash al momento dell'attivazione, e di nuovo a un controllo successivo se il
  suo dispositivo non ne possiede ancora uno. Se in seguito il suo accesso viene revocato
  dal suo account, il valore stesso viene inviato una volta, così che possiamo sapere che
  questo dispositivo ha ricevuto la revoca.

In cambio, il suo dispositivo riceve un **diritto d'uso firmato** che registra che cosa è
autorizzato a usare e fino a quando.

Questi dati vengono inviati al servizio licenze di Taskivator per attivare e
verificare la Sua postazione e per controllare se è disponibile una versione più
recente.

## Cosa resta sul Suo dispositivo

- Le Sue specifiche, i glossari, lo stile redazionale e le correzioni apprese
- Il Suo file `config.json` e i file di progetto locali
- I Suoi token API, conservati nell'archivio credenziali del sistema operativo

Queste informazioni non vengono trasmesse a Taskivator.

## Cosa viene inviato ai servizi che Lei collega

Per redigere e inviare un ticket, il testo della segnalazione viene inviato al
fornitore di IA che utilizza (GitHub Copilot, oppure la Sua chiave OpenAI o
Anthropic) e allo strumento di tracciamento in cui apre il ticket, come Jira o Azure
DevOps. Sono i servizi che Lei ha scelto e collegato e le informazioni inviate non
transitano da Taskivator né vi vengono copiate. I fornitori di IA e gli strumenti di
tracciamento collegati trattano le informazioni secondo i propri termini e le proprie
informative sulla privacy: La invitiamo a consultarli prima di collegare un servizio.

## Dati personali che trattiamo per il sito web e il Portal

- **Dati di account e di accesso**, incluso il Suo indirizzo e-mail, per creare e
  proteggere l'account
- **Registrazioni di acquisto e ordine**, comprese ricevute e documenti fiscali
- **Dati di pagamento**, trattati dal nostro fornitore di servizi di pagamento. Non
  conserviamo i numeri di carta completi.
- **Diritti d'uso e licenze**, per fornire e verificare quanto acquistato
- **Attivazioni dei dispositivi**, compresi l'identificatore di installazione, l'impronta del
  dispositivo sottoposta ad hash, l'etichetta del dispositivo e il nome del sistema operativo e
  la versione di BugIt, così che i limiti di dispositivi funzionino e lei possa gestire i propri
  dispositivi
- **Appartenenza a un Team e inviti**, per il piano Team
- **Rimborsi, contestazioni e storni**, ove si verifichino
- **Corrispondenza di assistenza**, per poterLe rispondere
- **Registri di sicurezza e amministrazione**, per rilevare abusi e mantenere una
  traccia di controllo
- **Le impostazioni di connessione che Lei salva** per strumenti come Jira o Azure
  DevOps. Conserviamo le impostazioni di connessione, non i contenuti presenti in
  quegli strumenti.
- **Le Sue scelte di consenso** su cookie e misurazione pubblicitaria, inclusa la
  revoca, nonché la conferma raccolta in fase di pagamento dove un mercato la
  richiede

Utilizziamo questi dati per fornire e supportare il prodotto acquistato, incassare il
pagamento e adempiere agli obblighi fiscali e contabili, mantenere sicuri account e
licenze e, ove Lei abbia prestato il consenso, misurare la pubblicità. A seconda del
Paese di residenza, la base giuridica è di norma l'esecuzione del contratto con Lei,
l'adempimento di un obbligo di legge, il nostro legittimo interesse alla sicurezza
del servizio oppure il Suo consenso.

## Fornitori di servizi

Ci avvaliamo di fornitori per autenticazione e hosting, elaborazione dei pagamenti,
e-mail transazionali, distribuzione e sicurezza del sito web e misurazione
pubblicitaria basata sul consenso. Tali fornitori trattano solo le informazioni
necessarie a erogare i loro servizi e non sono autorizzati a utilizzarle per finalità
proprie.

I principali fornitori sono Supabase (account e database), Stripe (pagamenti,
rimborsi e contestazioni), Vercel (hosting del Portal), Cloudflare (distribuzione e
sicurezza del sito web, analisi senza cookie), Resend (e-mail transazionali) e Google
(misurazione pubblicitaria, solo con il Suo consenso).

Alcuni di questi fornitori operano al di fuori del Suo Paese, anche negli Stati
Uniti. Quando i dati personali sono trasferiti a livello internazionale, ci basiamo
sulle clausole di protezione dei dati offerte dal fornitore.

La misurazione pubblicitaria non riceve mai le Sue segnalazioni di bug, i contenuti
del software BugIt o i dati della Sua carta di pagamento.

## Per quanto tempo conserviamo i dati

Conserviamo i dati personali solo per il tempo necessario alla finalità per cui sono
stati raccolti, dopodiché li cancelliamo o li rendiamo anonimi. In pratica:

- I dati di account, licenza e dispositivo sono conservati finché l'account e la
  licenza sono attivi e per un periodo limitato successivo, per poter gestire
  assistenza e contestazioni.
- I documenti di pagamento, fiscali e contabili sono conservati per il periodo
  previsto dalla legge.
- I messaggi di assistenza, i registri di sicurezza e le registrazioni del consenso
  sono conservati per un periodo limitato; le registrazioni del consenso attestano
  che la Sua scelta è stata rispettata.

Se elimina il Suo account, cancelliamo o rendiamo anonimi i Suoi dati, salvo i
documenti che siamo tenuti a conservare.

## Cookie e pubblicità

Il sito web utilizza cookie essenziali per funzionare. I cookie pubblicitari sono
disattivati per impostazione predefinita e vengono caricati solo se Lei li attiva nel
banner dei cookie o in **Preferenze cookie**. Utilizziamo Cloudflare Web Analytics per
misurare le prestazioni generali del sito: funziona senza cookie e non La traccia da
un sito all'altro. Può modificare o revocare la Sua scelta in qualsiasi momento.

I video del sito sono incorporati da YouTube. Nulla viene richiesto a YouTube finché non preme play su un video: fino a quel momento la pagina mostra solo un'immagine servita da noi. Quando preme play, il player viene caricato da youtube-nocookie.com, l'host a privacy rafforzata di YouTube, e Google riceve il Suo indirizzo IP e il video scelto per poterlo riprodurre. Se non preme mai play, la sezione video non invia nulla a Google.

## I Suoi diritti

A seconda del Paese di residenza, ad esempio ai sensi del GDPR dell'UE o del Regno
Unito o dell'APPI giapponese, Lei può avere il diritto di accedere ai dati personali
che deteniamo sul Suo conto, di rettificarli, cancellarli, limitarne o opporsi a
determinati trattamenti, di riceverli in un formato portabile e di revocare il
consenso in qualsiasi momento, senza pregiudicare i trattamenti già effettuati.

Per esercitare uno di questi diritti scriva a
[support@bugit.dev](mailto:support@bugit.dev) dall'indirizzo del Suo account. Può
anche eliminare l'account dalla Sua dashboard. Risponderemo entro il termine previsto
dalla legge applicabile.

Se non è soddisfatto, può presentare reclamo all'autorità per la protezione dei dati:
nel SEE, all'autorità del Suo Paese; nel Regno Unito, all'Information Commissioner's
Office (ico.org.uk); in Giappone, alla Personal Information Protection Commission
(ppc.go.jp). Le saremmo grati se ci desse prima la possibilità di risolvere la
questione.

## Modifiche

Potremo aggiornare la presente informativa con l'evolversi del prodotto o della
normativa. La data indicata sopra segnala la versione vigente. Vedere anche la pagina
[Transazioni Commerciali](#/docs/commerce) (特定商取引法に基づく表記) e la
[Politica di Rimborso](#/docs/refund).

## Contatti

Domande o richieste sulla privacy:
[support@bugit.dev](mailto:support@bugit.dev).
