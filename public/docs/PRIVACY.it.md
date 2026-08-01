# Informativa sulla Privacy — BugIt

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Ultimo aggiornamento: 1 agosto 2026**

La presente informativa spiega quali dati personali vengono trattati quando utilizza
il sito web di BugIt (bugit.dev), il BugIt Portal (gestione dell'account, degli
acquisti e delle licenze) e il software BugIt QA Agent, nonché le scelte e i diritti a
Sua disposizione. È redatta in linguaggio chiaro e mira a essere fedele al reale
funzionamento del prodotto.

## Chi è responsabile dei Suoi dati

BugIt è gestito con il nome commerciale **Taskivator / BugIt**. Il contatto operativo
per tutte le domande e le richieste in materia di privacy è **support@bugit.dev**.

**Il titolare ha scelto di non pubblicare i dati personali di identificazione del
titolare del trattamento. Ciò resta un rischio di conformità legale accettato e non ha
ricevuto un'approvazione legale esterna.** Un nome commerciale da solo non soddisfa
l'obbligo di legge di identificare il titolare del trattamento; tale obbligo pertanto
**non** è considerato soddisfatto dalla presente informativa. Per questo motivo i dati
registrati relativi all'identità del titolare del trattamento non vengono pubblicati;
laddove la legge Le dia diritto ad averli, può richiederli a support@bugit.dev.

## La versione breve

- Il **software QA Agent viene eseguito sulla Sua macchina.** Le Sue segnalazioni di
  bug, specifiche, glossario, screenshot, codice, impostazioni e ticket **non**
  vengono inviati a Taskivator.
- Per gestire il Suo account, l'acquisto, la licenza e l'assistenza, il **sito web e
  il Portal** trattano un insieme limitato di dati personali (la Sua email, i registri
  d'acquisto, le licenze e le attivazioni dei dispositivi e i messaggi di assistenza),
  utilizzando i fornitori di servizi elencati di seguito.
- **Non** vendiamo i Suoi dati personali. La misurazione pubblicitaria è
  **disattivata per impostazione predefinita** e viene eseguita solo con il Suo
  consenso.

## Che cosa il software QA Agent invia a Taskivator

BugIt utilizza un'**attivazione basata sul browser**: Lei accede al BugIt Portal dal
Suo browser e approva il dispositivo; **non è prevista alcuna chiave di licenza** da
inserire, incollare o memorizzare. Dal Suo dispositivo, il software invia solo dati di
licenza/aggiornamento:

- un **record firmato di diritto d'uso / attivazione del dispositivo** derivante da
  tale accesso al Portal (affinché il Suo dispositivo possa essere autorizzato e
  riverificato) e la versione dell'app,
- un'**impronta del dispositivo anonima, sottoposta ad hash a senso unico** — un hash
  di 16 caratteri derivato da attributi di base della macchina; non può essere
  invertito per identificare Lei o il Suo hardware, e
- **solo se ne imposta una durante la configurazione iniziale**, una breve etichetta
  di dispositivo/postazione da Lei scelta, così da poter distinguere le autorizzazioni
  dei dispositivi di un account Team. Non è mai obbligatorio che sia reale e non viene
  mai verificata. Se non ne imposta alcuna, non viene inviato nulla.

Questi dati vengono trasmessi unicamente al servizio di licenze di Taskivator, per
attivare/verificare la Sua postazione e controllare se è disponibile una versione più
recente.

## Che cosa resta interamente sul Suo dispositivo

- Le Sue specifiche, il glossario, lo stile aziendale e le correzioni apprese
- Il Suo `config.json` e i file di progetto locali
- I Suoi token API (conservati nel gestore delle credenziali del Suo sistema operativo
  — mai in un file e mai trasmessi a Taskivator)

Nessuno di questi dati viene trasmesso in alcun luogo.

## Che cosa viene inviato solo ai servizi che *Lei* collega

Per redigere e inoltrare un ticket, il testo della Sua segnalazione viene inviato al
modello AI che utilizza (GitHub Copilot, oppure la Sua chiave OpenAI/Anthropic) e al
tracker su cui effettua l'inoltro (come Jira o Azure DevOps). Si tratta dell'AI e
degli strumenti che **Lei** ha scelto e collegato — non vengono mai instradati
attraverso Taskivator, né copiati o visti da Taskivator, che non è il titolare del
trattamento di tali servizi. Con essi vengono scambiati solo i metadati necessari
all'inoltro (id/URL dell'issue e il contenuto da Lei approvato).

## Dati personali che trattiamo, e perché (sito web + Portal)

| Dati | Perché (finalità) | Base giuridica (GDPR/UK GDPR) |
|------|-------------------|-------------------------------|
| Email dell'account + dati di autenticazione | Creare e proteggere il Suo account, effettuare l'accesso, MFA amministratore | Contratto; legittimo interesse (sicurezza dell'account) |
| Diritti d'uso / licenze | Fornire e verificare ciò che ha acquistato | Contratto |
| Attivazioni dei dispositivi (impronta con hash, etichetta facoltativa, versione del sistema operativo/dell'app) | Applicare i limiti per dispositivo/postazione; consentirLe di gestire i dispositivi | Contratto |
| Appartenenza a un Team + inviti | Fornire il piano Team (fino a 5 membri) | Contratto |
| Registri di acquisto / d'ordine | Adempiere alla vendita, ricevute, emissione della licenza | Contratto; obbligo di legge (contabilità) |
| Dati di pagamento | Incassare il pagamento (gestito da Stripe — non memorizziamo i numeri di carta completi) | Contratto |
| Rimborsi / contestazioni / storni | Gestire i rimborsi e le contestazioni di pagamento | Contratto; obbligo di legge |
| Registri fiscali | Adempiere agli obblighi fiscali/contabili | Obbligo di legge |
| Corrispondenza di assistenza | Rispondere alle Sue domande e fornire assistenza | Contratto; legittimo interesse |
| Registri di sicurezza, di log e di audit amministrativo | Rilevare abusi, proteggere gli account, mantenere una pista di controllo | Legittimo interesse (sicurezza) |
| Configurazione di fornitore/tracker da Lei salvata | ConsentirLe di collegare Jira/Azure DevOps ecc.; memorizziamo metadati di connessione, non i Suoi dati in tali strumenti | Contratto |
| Scelte di consenso (cookie/pubblicità, e la loro revoca) | Rispettare e comprovare le Sue scelte | Consenso; obbligo di legge (prova) |
| Statistiche del sito web | Comprendere le prestazioni generali del sito (senza cookie) | Legittimo interesse |
| Misurazione pubblicitaria | Comprendere se gli annunci portano ad acquisti | Consenso (disattivata per impostazione predefinita) |
| Consenso UE/Regno Unito alla consegna immediata / al recesso | Comprovare la Sua presa d'atto al momento dell'acquisto | Obbligo di legge; contratto |

## Fornitori di servizi (responsabili del trattamento) e trasferimenti internazionali

Ci avvaliamo dei seguenti fornitori per gestire BugIt. Ciascuno tratta dati personali
esclusivamente per fornirci il proprio servizio. Ove i dati personali siano
trasferiti al di fuori del SEE/del Regno Unito, ci basiamo sull'accordo sul
trattamento dei dati del fornitore e, ove applicabile, sulle clausole contrattuali
tipo (o su un meccanismo di trasferimento equivalente).

| Fornitore | Finalità | Categorie di dati | Luogo probabile di trattamento | Base del trasferimento | Conservazione / cancellazione |
|-----------|----------|-------------------|--------------------------------|------------------------|-------------------------------|
| **Supabase** | Database + autenticazione (account, diritti d'uso, dispositivi, ordini, log di audit) | Dati di account, diritti d'uso, dispositivo, ordine, log | Stati Uniti e/o UE (regione del progetto) | Accordo sul trattamento + clausole contrattuali tipo ove applicabile | Conservati finché il Suo account è attivo; cancellati o anonimizzati quando non più necessari (vedere la tabella di conservazione) |
| **Stripe** | Elaborazione dei pagamenti, rimborsi, contestazioni, calcolo delle imposte | Dati di pagamento, di fatturazione, di transazione | Stati Uniti + globale | Accordo sul trattamento + clausole contrattuali tipo | Conservati da Stripe secondo la propria policy e i requisiti legali/contabili |
| **Cloudflare** | Distribuzione del sito web, sicurezza, statistiche web senza cookie | Dati di rete/tecnici; statistiche aggregate | Rete edge globale | Accordo sul trattamento + clausole contrattuali tipo | Di breve durata; le statistiche sono aggregate e senza cookie |
| **Vercel** | Hosting dell'applicazione del sito web/Portal | Dati di richiesta/tecnici | Stati Uniti + globale | Accordo sul trattamento + clausole contrattuali tipo | Log operativi conservati a breve termine |
| **Resend** | Invio di email transazionali (ricevute, licenza, assistenza) | Indirizzo email, metadati del messaggio | Stati Uniti | Accordo sul trattamento + clausole contrattuali tipo | Conservati secondo la policy del fornitore; log di consegna a breve termine |
| **Google Ads** | Misurazione pubblicitaria (solo con consenso) | Valore dell'acquisto, valuta, riferimento d'ordine non identificativo | Stati Uniti + globale | Accordo sul trattamento + clausole contrattuali tipo | Solo con consenso; nessun contenuto di bug o dato di carta condiviso |

**Non** vendiamo dati personali e la misurazione pubblicitaria non riceve mai le Sue
segnalazioni di bug, i contenuti del software BugIt o i dati della carta di pagamento.

## Per quanto tempo conserviamo i dati (conservazione)

Ove un periodo non sia fissato dalla legge, conserviamo i dati solo per il tempo
necessario alla finalità, per poi cancellarli o anonimizzarli.

| Categoria | Conservazione |
|-----------|---------------|
| Account | Finché attivi; cancellati/anonimizzati dopo la cancellazione dell'account (fatti salvi gli obblighi legali di conservazione) |
| Registri di autenticazione | Finché l'account è attivo |
| Diritti d'uso / licenze | Per la durata della licenza e un periodo limitato successivo per assistenza e contestazioni |
| Dispositivi / attivazioni | Finché il diritto d'uso è attivo; rilasciati quando rimuove un dispositivo o la licenza termina |
| Appartenenze a Team / inviti | Finché la licenza Team è attiva; gli inviti scadono |
| Pagamenti | Per la durata della licenza più il periodo richiesto per la contabilità/le imposte |
| Rimborsi / contestazioni / storni | Per il periodo necessario a gestirli e comprovarli, più i periodi contabili |
| Registri fiscali / contabili | Come richiesto dalla normativa fiscale applicabile (ad esempio, fino a 7 anni) |
| Log di sicurezza | Un periodo limitato sufficiente per la sicurezza e il rilevamento degli abusi |
| Log di audit amministrativo | Conservati come registro di integrità per un periodo limitato |
| Corrispondenza di assistenza | Finché necessaria per assisterLa e per un periodo limitato successivo |
| Consenso al marketing | Finché il consenso permane e successivamente a titolo di prova |
| Revoche del consenso | Conservate come prova che una scelta è stata rispettata |
| Backup di account cancellati | Eliminati dai backup di routine nell'ambito della normale rotazione dei backup dopo la cancellazione |

## Cookie e pubblicità

Il sito web utilizza solo cookie essenziali per funzionare. I cookie non essenziali
(pubblicitari) sono **disattivati per impostazione predefinita** e vengono caricati
solo se Lei acconsente tramite il banner dei cookie o le **Preferenze cookie**.
Utilizziamo Cloudflare Web Analytics, che è senza cookie e non La traccia tra i siti.
Può modificare o revocare la Sua scelta in qualsiasi momento.

## I Suoi diritti

A seconda di dove risiede (ad esempio ai sensi del GDPR UE/Regno Unito o dell'APPI
del Giappone), può avere il diritto di:

- **Accedere** ai dati personali che deteniamo sul Suo conto
- **Rettificare** dati inesatti
- **Cancellare** i Suoi dati (e il Suo account)
- **Limitare** determinati trattamenti od **opporvisi**
- **Portabilità** — ricevere determinati dati in un formato portabile
- **Revocare il consenso** (ad es. alla misurazione pubblicitaria) in qualsiasi
  momento, senza pregiudicare il trattamento lecito precedente

Per esercitare uno qualsiasi di questi diritti, scriva a **support@bugit.dev**
dall'indirizzo del Suo account. Può inoltre **cancellare il Suo account** per rimuovere
i Suoi dati (fatti salvi i registri che siamo tenuti a conservare per legge, come i
registri fiscali). Risponderemo entro il termine richiesto dalla legge applicabile.

**Reclami.** Se si trova nel SEE, può presentare un reclamo alla Sua autorità locale
di protezione dei dati; nel Regno Unito, all'Information Commissioner's Office
(ico.org.uk); in Giappone, alla Personal Information Protection Commission
(ppc.go.jp). Gradiremmo l'opportunità di risolvere prima la Sua questione a
support@bugit.dev.

## Modifiche

Possiamo aggiornare la presente informativa al variare del prodotto o della legge; la
data di «ultimo aggiornamento» sopra riportata riflette la versione corrente.
Documenti correlati: l'informativa sulle transazioni commerciali (特定商取引法に基づく表記
— indicazioni ai sensi della legge giapponese sulle transazioni commerciali
specifiche) e la Politica di Rimborso.

## Contatti

Domande o richieste in materia di privacy: **support@bugit.dev**. Può anche aprire un
ticket di assistenza dalla Sua dashboard BugIt su **bugit.dev**.
