# Politique de Confidentialité — BugIt

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Dernière mise à jour : 1 août 2026**

La présente politique explique quelles données personnelles sont traitées lorsque
vous utilisez le site web BugIt (bugit.dev), le BugIt Portal (gestion du compte, des
achats et des licences) et le logiciel BugIt QA Agent, ainsi que les choix et les
droits dont vous disposez. Elle est rédigée en langage clair et se veut fidèle au
fonctionnement réel du produit.

## Qui est responsable de vos données

BugIt est exploité sous le nom commercial **Taskivator / BugIt**. Le contact
opérationnel pour toutes les questions et demandes relatives à la confidentialité est
**support@bugit.dev**.

**Le propriétaire a choisi de ne pas publier les informations personnelles
d'identification du responsable du traitement. Cela demeure un risque de conformité
juridique accepté et n'a pas fait l'objet d'une approbation juridique externe.** Un
nom commercial à lui seul ne satisfait pas à l'obligation légale d'identifier le
responsable du traitement ; cette obligation n'est donc **pas** considérée comme
satisfaite par la présente politique. C'est pour cette raison que les informations
enregistrées relatives à l'identité du responsable du traitement ne sont pas
publiées ; lorsque la loi vous y donne droit, vous pouvez les demander à
support@bugit.dev.

## La version courte

- Le **logiciel QA Agent s'exécute sur votre machine.** Vos rapports de bug, vos
  spécifications, votre glossaire, vos captures d'écran, votre code, vos paramètres et
  vos tickets ne sont **pas** envoyés à Taskivator.
- Pour gérer votre compte, votre achat, votre licence et l'assistance, le **site web
  et le Portal** traitent un ensemble limité de données personnelles (votre e-mail,
  vos enregistrements d'achat, vos licences et activations d'appareils, et vos
  messages d'assistance), en recourant aux prestataires de services énumérés
  ci-dessous.
- Nous ne **vendons pas** vos données personnelles. La mesure publicitaire est
  **désactivée par défaut** et ne s'exécute qu'avec votre consentement.

## Ce que le logiciel QA Agent envoie à Taskivator

BugIt utilise une **activation via le navigateur** : vous vous connectez au BugIt
Portal dans votre navigateur et approuvez l'appareil ; **il n'y a aucune clé de
licence** à saisir, coller ou stocker. Depuis votre appareil, le logiciel n'envoie que
des données de licence/mise à jour :

- un **enregistrement signé de droit d'utilisation / d'activation d'appareil** issu de
  cette connexion au Portal (afin que votre appareil puisse être autorisé et
  revérifié) ainsi que la version de l'application,
- une **empreinte d'appareil anonyme, hachée à sens unique** — un hachage de
  16 caractères dérivé d'attributs de base de la machine ; il ne peut pas être inversé
  pour vous identifier, vous ou votre matériel, et
- **uniquement si vous en définissez un lors de la configuration initiale**, un court
  libellé d'appareil/de siège que vous avez choisi afin de pouvoir distinguer les
  autorisations d'appareils d'un compte Team. Il n'est jamais tenu d'être réel et
  n'est jamais vérifié. Si vous n'en définissez pas, rien n'est envoyé.

Ces éléments ne sont transmis qu'au service de licences de Taskivator, pour
activer/vérifier votre siège et vérifier si une version plus récente est disponible.

## Ce qui reste entièrement sur votre appareil

- Vos spécifications, votre glossaire, votre style maison et les corrections apprises
- Votre `config.json` et vos fichiers de projet locaux
- Vos jetons d'API (conservés dans le gestionnaire d'identifiants de votre système
  d'exploitation — jamais dans un fichier, et jamais transmis à Taskivator)

Rien de tout cela n'est transmis où que ce soit.

## Ce qui va uniquement aux services que *vous* connectez

Pour rédiger et créer un ticket, le texte de votre rapport est envoyé au modèle d'IA
que vous utilisez (GitHub Copilot, ou votre propre clé OpenAI/Anthropic) et à l'outil
de suivi dans lequel vous le créez (tel que Jira ou Azure DevOps). Il s'agit de l'IA
et des outils que **vous** avez choisis et connectés — cela n'est jamais acheminé via
Taskivator, copié vers Taskivator, ni vu par Taskivator, qui n'est pas le responsable
du traitement de ces services. Seules les métadonnées nécessaires à la création
(identifiant/URL du ticket, et le contenu que vous approuvez) sont échangées avec eux.

## Données personnelles que nous traitons, et pourquoi (site web + Portal)

| Données | Pourquoi (finalité) | Base juridique (GDPR/UK GDPR) |
|---------|---------------------|-------------------------------|
| E-mail du compte + données d'authentification | Créer et sécuriser votre compte, vous connecter, MFA administrateur | Contrat ; intérêt légitime (sécurité du compte) |
| Droits d'utilisation / licences | Fournir et vérifier ce que vous avez acheté | Contrat |
| Activations d'appareils (empreinte hachée, libellé facultatif, version du système/de l'app) | Faire respecter les limites par appareil/siège ; vous permettre de gérer vos appareils | Contrat |
| Appartenance à une équipe + invitations | Fournir le plan Team (jusqu'à 5 membres) | Contrat |
| Enregistrements d'achat / de commande | Exécuter la vente, reçus, émission de licence | Contrat ; obligation légale (comptabilité) |
| Données de paiement | Encaisser le paiement (traité par Stripe — nous ne conservons pas les numéros de carte complets) | Contrat |
| Remboursements / litiges / rétrofacturations | Traiter les remboursements et les litiges de paiement | Contrat ; obligation légale |
| Documents fiscaux | Respecter les obligations fiscales/comptables | Obligation légale |
| Correspondance d'assistance | Répondre à vos questions et fournir une assistance | Contrat ; intérêt légitime |
| Enregistrements de sécurité, de journaux et d'audit administrateur | Détecter les abus, protéger les comptes, tenir une piste d'audit | Intérêt légitime (sécurité) |
| Configuration de fournisseur/d'outil de suivi que vous enregistrez | Vous permettre de connecter Jira/Azure DevOps, etc. ; nous stockons des métadonnées de connexion, pas vos données dans ces outils | Contrat |
| Choix de consentement (cookies/publicité, et leur retrait) | Respecter et prouver vos choix | Consentement ; obligation légale (preuve) |
| Statistiques du site web | Comprendre la performance générale du site (sans cookie) | Intérêt légitime |
| Mesure publicitaire | Comprendre si les publicités entraînent des achats | Consentement (désactivée par défaut) |
| Consentement UE/RU à la livraison immédiate / au droit de rétractation | Prouver votre reconnaissance lors du paiement | Obligation légale ; contrat |

## Prestataires de services (sous-traitants) et transferts internationaux

Nous faisons appel aux prestataires suivants pour exploiter BugIt. Chacun traite des
données personnelles uniquement pour nous fournir son service. Lorsque des données
personnelles sont transférées en dehors de l'EEE/du Royaume-Uni, nous nous appuyons
sur l'accord de traitement des données du prestataire et, le cas échéant, sur les
clauses contractuelles types (ou un mécanisme de transfert équivalent).

| Prestataire | Finalité | Catégories de données | Lieu probable de traitement | Base du transfert | Conservation / suppression |
|-------------|----------|-----------------------|-----------------------------|-------------------|-----------------------------|
| **Supabase** | Base de données + authentification (comptes, droits, appareils, commandes, journaux d'audit) | Données de compte, de droits, d'appareil, de commande, de journal | États-Unis et/ou UE (région du projet) | Accord de traitement + clauses contractuelles types le cas échéant | Conservées tant que votre compte est actif ; supprimées ou anonymisées lorsqu'elles ne sont plus nécessaires (voir le tableau de conservation) |
| **Stripe** | Traitement des paiements, remboursements, litiges, calcul des taxes | Données de paiement, de facturation, de transaction | États-Unis + international | Accord de traitement + clauses contractuelles types | Conservées par Stripe selon sa politique et les exigences légales/comptables |
| **Cloudflare** | Diffusion du site web, sécurité, statistiques web sans cookie | Données réseau/techniques ; statistiques agrégées | Réseau edge mondial | Accord de traitement + clauses contractuelles types | De courte durée ; les statistiques sont agrégées et sans cookie |
| **Vercel** | Hébergement de l'application du site web/Portal | Données de requête/techniques | États-Unis + international | Accord de traitement + clauses contractuelles types | Journaux opérationnels conservés à court terme |
| **Resend** | Envoi d'e-mails transactionnels (reçus, licence, assistance) | Adresse e-mail, métadonnées de message | États-Unis | Accord de traitement + clauses contractuelles types | Conservés selon la politique du prestataire ; journaux de livraison à court terme |
| **Google Ads** | Mesure publicitaire (uniquement avec consentement) | Montant de l'achat, devise, référence de commande non identifiante | États-Unis + international | Accord de traitement + clauses contractuelles types | Uniquement avec consentement ; aucun contenu de bug ni donnée de carte partagé |

Nous ne **vendons pas** de données personnelles, et la mesure publicitaire ne reçoit
jamais vos rapports de bug, le contenu du logiciel BugIt ou les détails de votre carte
de paiement.

## Combien de temps nous conservons les données (conservation)

Lorsqu'une durée n'est pas fixée par la loi, nous ne conservons les données que le
temps nécessaire à la finalité, puis nous les supprimons ou les anonymisons.

| Catégorie | Conservation |
|-----------|--------------|
| Comptes | Tant qu'ils sont actifs ; supprimés/anonymisés après la suppression du compte (sous réserve des obligations légales de conservation) |
| Enregistrements d'authentification | Tant que le compte est actif |
| Droits d'utilisation / licences | Pendant la durée de la licence et une période limitée ensuite pour l'assistance et les litiges |
| Appareils / activations | Tant que le droit est actif ; libérés lorsque vous retirez un appareil ou que la licence prend fin |
| Appartenances à une équipe / invitations | Tant que la licence Team est active ; les invitations expirent |
| Paiements | Pendant la durée de la licence, plus la période requise pour la comptabilité/la fiscalité |
| Remboursements / litiges / rétrofacturations | Pendant la période nécessaire à leur traitement et à leur preuve, plus les périodes comptables |
| Documents fiscaux / comptables | Selon les exigences de la législation fiscale applicable (par exemple, jusqu'à 7 ans) |
| Journaux de sécurité | Une période limitée suffisante pour la sécurité et la détection des abus |
| Journaux d'audit administrateur | Conservés comme enregistrement d'intégrité pendant une période limitée |
| Correspondance d'assistance | Tant que nécessaire pour vous assister et une période limitée ensuite |
| Consentement marketing | Tant que le consentement demeure et ensuite à titre de preuve |
| Retraits de consentement | Conservés comme preuve qu'un choix a été respecté |
| Sauvegardes de comptes supprimés | Purgées des sauvegardes de routine dans le cycle normal de rotation des sauvegardes après la suppression |

## Cookies et publicité

Le site web n'utilise que des cookies essentiels pour fonctionner. Les cookies non
essentiels (publicitaires) sont **désactivés par défaut** et ne se chargent que si
vous y consentez via la bannière de cookies ou les **Préférences des cookies**. Nous
utilisons Cloudflare Web Analytics, qui est sans cookie et ne vous suit pas d'un site
à l'autre. Vous pouvez modifier ou retirer votre choix à tout moment.

## Vos droits

Selon votre lieu de résidence (par exemple en vertu du GDPR de l'UE/du Royaume-Uni ou
de l'APPI du Japon), vous pouvez avoir le droit :

- d'**accéder** aux données personnelles que nous détenons à votre sujet
- de faire **rectifier** des données inexactes
- de faire **supprimer** vos données (et votre compte)
- de **limiter** certains traitements ou de vous y **opposer**
- à la **portabilité** — de recevoir certaines données dans un format portable
- de **retirer votre consentement** (p. ex. à la mesure publicitaire) à tout moment,
  sans affecter la licéité du traitement antérieur

Pour exercer l'un de ces droits, envoyez un e-mail à **support@bugit.dev** depuis
l'adresse de votre compte. Vous pouvez également **supprimer votre compte** pour
effacer vos données (sous réserve des enregistrements que nous devons conserver en
vertu de la loi, tels que les documents fiscaux). Nous répondrons dans le délai imposé
par la loi applicable.

**Réclamations.** Si vous vous trouvez dans l'EEE, vous pouvez déposer une réclamation
auprès de votre autorité locale de protection des données ; au Royaume-Uni, auprès de
l'Information Commissioner's Office (ico.org.uk) ; au Japon, auprès de la Personal
Information Protection Commission (ppc.go.jp). Nous apprécierions de pouvoir d'abord
résoudre votre préoccupation à support@bugit.dev.

## Modifications

Nous pouvons mettre à jour la présente politique à mesure que le produit ou la loi
évolue ; la date de « dernière mise à jour » ci-dessus reflète la version en vigueur.
Documents connexes : la divulgation relative aux transactions commerciales
(特定商取引法に基づく表記 — mentions au titre de la loi japonaise sur les transactions
commerciales spécifiques) et la Politique de Remboursement.

## Contact

Questions ou demandes relatives à la confidentialité : **support@bugit.dev**. Vous
pouvez également ouvrir un ticket d'assistance depuis votre tableau de bord BugIt sur
**bugit.dev**.
