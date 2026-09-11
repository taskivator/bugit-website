# Politique de Confidentialité de BugIt

> **Avertissement sur la traduction.** Ce document a été traduit automatiquement et n'a pas été relu par des locuteurs natifs. La version anglaise fait foi : en cas de divergence, le texte anglais prévaut. Pour la formulation la plus exacte et la plus à jour, veuillez vous reporter au document en anglais.

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Dernière mise à jour : 2 août 2026**

La présente politique explique quelles données personnelles nous traitons lorsque
vous utilisez le site web BugIt (bugit.dev), le BugIt Portal (gestion du compte, des
achats et des licences) et le logiciel BugIt QA Agent, ainsi que les choix et les
droits dont vous disposez.

## Exploitant et contact confidentialité

BugIt est exploité sous le nom commercial Taskivator. Les questions relatives à la
confidentialité, les demandes concernant vos données personnelles et les demandes de
communication de la dénomination légale et des coordonnées professionnelles de
l'exploitant peuvent être adressées à
[support@bugit.dev](mailto:support@bugit.dev). Les informations demandées sur
l'exploitant sont communiquées sans délai.

## En bref

- Le logiciel BugIt s'exécute sur votre propre machine. Vos rapports d'anomalie,
  spécifications, glossaires, captures d'écran, votre code, vos réglages et vos
  tickets ne sont pas transmis à Taskivator.
- Pour gérer votre compte, votre achat, votre licence et le support, le site web et
  le Portal traitent une quantité limitée de données personnelles.
- Nous ne vendons pas de données personnelles. La mesure publicitaire est désactivée
  par défaut et ne fonctionne que si vous l'activez.

## Ce que le logiciel BugIt nous envoie

BugIt s'active depuis votre navigateur : vous vous connectez au BugIt Portal et vous
approuvez l'appareil. Aucune clé de licence n'est à saisir ni à conserver. Depuis
votre appareil, le logiciel n'envoie que ce qui est nécessaire au fonctionnement de
votre licence :

- un **identifiant d'installation**, qui distingue cet exemplaire de BugIt afin qu'une
  modification de votre licence s'applique à la bonne installation,
- une **empreinte d'appareil hachée** : un hachage unidirectionnel de 16 caractères d'attributs
  stables de la machine, servant à reconnaître le même ordinateur pour les limites d'appareils
  et la prévention de la fraude. Nous recevons le haché, jamais les attributs dont il provient,
- un **libellé d'appareil**, qui est le nom réseau de votre ordinateur, afin que vous puissiez
  reconnaître et distinguer vos propres appareils dans votre compte,
- le **nom du système d'exploitation** et sa version, ainsi que la **version de BugIt**, afin
  que nous puissions vous indiquer si une version plus récente est disponible,
- du **matériel d'activation** de courte durée : une valeur aléatoire créée pour cette seule
  requête, conservée en mémoire uniquement et jamais écrite sur disque. Elle prouve que
  l'approbation donnée dans votre navigateur appartient à cette requête et ne peut être rejouée.
- un **secret d'accusé de réception** par activation : une seconde valeur aléatoire,
  générée sur votre appareil et conservée dans le stockage protégé de votre système
  d'exploitation. Nous en recevons l'empreinte lors de l'activation, puis lors d'une
  vérification ultérieure si votre appareil n'en détient pas encore. Si votre accès est
  ensuite révoqué depuis votre compte, la valeur elle-même est envoyée une fois, afin que
  nous sachions que cet appareil a bien reçu la révocation.

En retour, votre appareil reçoit un **droit d'usage signé** indiquant ce que vous êtes autorisé
à utiliser et jusqu'à quand.

Ces éléments sont transmis au service de licences de Taskivator, pour activer et
vérifier votre poste et pour déterminer si une version plus récente est disponible.

## Ce qui reste sur votre appareil

- Vos spécifications, glossaires, votre charte rédactionnelle et les corrections
  apprises
- Votre fichier `config.json` et vos fichiers de projet locaux
- Vos jetons d'API, conservés dans le gestionnaire d'identifiants de votre système
  d'exploitation

Ces informations ne sont pas transmises à Taskivator.

## Ce qui est transmis aux services que vous connectez

Pour rédiger et déposer un ticket, le texte de votre rapport est envoyé au
fournisseur d'IA que vous utilisez (GitHub Copilot, ou votre propre clé OpenAI ou
Anthropic) ainsi qu'à l'outil de suivi dans lequel vous déposez le ticket, tel que
Jira ou Azure DevOps. Ce sont les services que vous avez choisis et connectés, et les
informations qui leur sont envoyées ne transitent pas par Taskivator et n'y sont pas
copiées. Les fournisseurs d'IA et les outils de suivi connectés traitent les
informations selon leurs propres conditions et politiques de confidentialité : nous
vous invitons à en prendre connaissance avant de connecter un service.

## Données personnelles que nous traitons pour le site web et le Portal

- **Données de compte et de connexion**, dont votre adresse e-mail, afin de créer et
  de sécuriser votre compte
- **Historique d'achat et de commande**, y compris les reçus et les pièces fiscales
- **Données de paiement**, traitées par notre prestataire de paiement. Nous ne
  conservons pas les numéros de carte complets.
- **Droits d'usage et licences**, afin de livrer et de vérifier ce que vous avez
  acheté
- **Activations d'appareils**, y compris l'identifiant d'installation, l'empreinte d'appareil
  hachée, le libellé d'appareil ainsi que le nom du système d'exploitation et la version de
  BugIt, afin que les limites d'appareils fonctionnent et que vous puissiez gérer vos propres
  appareils
- **Appartenance à un Team et invitations**, pour la formule Team
- **Remboursements, litiges et rétrofacturations**, le cas échéant
- **Correspondance de support**, afin de pouvoir vous répondre
- **Journaux de sécurité et d'administration**, afin de détecter les abus et de
  conserver une piste d'audit
- **Les paramètres de connexion que vous enregistrez** pour des outils comme Jira ou
  Azure DevOps. Nous conservons les paramètres de connexion, pas le contenu hébergé
  dans ces outils.
- **Vos choix de consentement** concernant les cookies et la mesure publicitaire, y
  compris leur retrait, ainsi que la confirmation recueillie au moment du paiement
  lorsqu'un marché l'exige

Nous utilisons ces données pour fournir et prendre en charge le produit que vous avez
acheté, encaisser le paiement et respecter nos obligations fiscales et comptables,
sécuriser les comptes et les licences et, lorsque vous y avez consenti, mesurer la
publicité. Selon votre lieu de résidence, la base légale est généralement
l'exécution de notre contrat avec vous, le respect d'une obligation légale, notre
intérêt légitime à sécuriser le service ou votre consentement.

## Prestataires de services

Nous faisons appel à des prestataires pour l'authentification et l'hébergement, le
traitement des paiements, les e-mails transactionnels, la diffusion et la sécurité du
site web ainsi que la mesure publicitaire fondée sur le consentement. Ces
prestataires ne traitent que les informations nécessaires à la fourniture de leurs
services et ne sont pas autorisés à les utiliser à leurs propres fins.

Les principaux prestataires sont Supabase (comptes et base de données), Stripe
(paiements, remboursements et litiges), Vercel (hébergement du Portal), Cloudflare
(diffusion et sécurité du site web, analytique sans cookie), Resend (e-mails
transactionnels) et Google (mesure publicitaire, uniquement avec votre
consentement).

Certains de ces prestataires opèrent hors de votre pays, notamment aux États-Unis.
Lorsque des données personnelles font l'objet d'un transfert international, nous nous
appuyons sur les clauses de protection des données proposées par le prestataire.

La mesure publicitaire ne reçoit jamais vos rapports d'anomalie, le contenu du
logiciel BugIt ni les données de votre carte de paiement.

## Durée de conservation

Nous ne conservons les données personnelles que le temps nécessaire à la finalité
pour laquelle elles ont été collectées, puis nous les supprimons ou les anonymisons.
Concrètement :

- Les données de compte, de licence et d'appareil sont conservées tant que votre
  compte et votre licence sont actifs, puis pendant une durée limitée afin de
  pouvoir traiter le support et les litiges.
- Les pièces de paiement, fiscales et comptables sont conservées pendant la durée
  imposée par la loi.
- Les messages de support, les journaux de sécurité et les preuves de consentement
  sont conservés pendant une durée limitée ; les preuves de consentement attestent
  que votre choix a été respecté.

Si vous supprimez votre compte, nous supprimons ou anonymisons vos données, à
l'exception des pièces que nous devons conserver.

## Cookies et publicité

Le site web utilise des cookies essentiels à son fonctionnement. Les cookies
publicitaires sont désactivés par défaut et ne sont chargés que si vous les activez
dans le bandeau cookies ou dans **Préférences cookies**. Nous utilisons Cloudflare
Web Analytics pour connaître les performances générales du site ; cet outil
fonctionne sans cookie et ne vous suit pas d'un site à l'autre. Vous pouvez modifier
ou retirer votre choix à tout moment.

Les vidéos du site sont intégrées depuis YouTube. Rien n'est demandé à YouTube tant que vous n'appuyez pas sur lecture : jusque là, la page n'affiche qu'une image servie par nous. Lorsque vous lancez la lecture, le lecteur est chargé depuis youtube-nocookie.com, l'hôte de confidentialité renforcée de YouTube, et Google reçoit votre adresse IP ainsi que la vidéo choisie afin de pouvoir la lire. Si vous n'appuyez jamais sur lecture, la section vidéo n'envoie rien à Google.

## Vos droits

Selon votre lieu de résidence, par exemple au titre du RGPD de l'UE ou du
Royaume-Uni, ou de l'APPI japonaise, vous pouvez avoir le droit d'accéder aux données
personnelles que nous détenons à votre sujet, de les rectifier, de les effacer, de
limiter certains traitements ou de vous y opposer, de les recevoir dans un format
portable et de retirer votre consentement à tout moment, sans que cela remette en
cause les traitements déjà effectués.

Pour exercer l'un de ces droits, écrivez à
[support@bugit.dev](mailto:support@bugit.dev) depuis l'adresse de votre compte. Vous
pouvez également supprimer votre compte depuis votre tableau de bord. Nous
répondrons dans le délai prévu par la loi qui vous est applicable.

Si notre réponse ne vous satisfait pas, vous pouvez saisir votre autorité de
protection des données : dans l'EEE, votre autorité locale ; au Royaume-Uni,
l'Information Commissioner's Office (ico.org.uk) ; au Japon, la Personal Information
Protection Commission (ppc.go.jp). Nous vous serions reconnaissants de nous
permettre d'abord de traiter votre demande.

## Modifications

Nous pouvons mettre à jour cette politique à mesure que le produit ou la loi
évoluent. La date ci-dessus indique la version en vigueur. Voir également la page
[Transactions Commerciales](#/docs/commerce) (特定商取引法に基づく表記) et la
[Politique de Remboursement](#/docs/refund).

## Contact

Questions ou demandes relatives à la confidentialité :
[support@bugit.dev](mailto:support@bugit.dev).
