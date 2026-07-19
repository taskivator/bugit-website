# Confidentialité — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Un résumé en langage clair de ce que le Logiciel collecte et ne collecte pas.
Tout s'exécute sur votre propre machine.

## Ce que le Logiciel envoie à Taskivator

La seule chose que le Logiciel nous envoie, ce sont des **données de licence/mise à jour** :

- votre **clé de licence**,
- une **empreinte d'appareil anonyme, hachée à sens unique** — un hachage de
  16 caractères dérivé d'attributs de base de la machine. Il ne peut pas être
  inversé pour vous identifier, vous ou votre matériel, et
- **uniquement si vous en définissez un lors de la configuration initiale**, un
  court libellé de siège que vous avez choisi afin de pouvoir distinguer les
  sièges d'une licence Team (par ex. un nom, un nom d'utilisateur ou un e-mail —
  jamais tenu d'être réel, et jamais vérifié). Si vous n'en définissez pas, il
  n'est tout simplement jamais envoyé.

Ces éléments ne sont transmis qu'au serveur de licences de Taskivator, et
uniquement pour activer/vérifier votre siège et pour vérifier si une version plus
récente est disponible. **Aucune télémétrie, aucune analyse, aucun suivi, aucune
publicité — jamais.**

## Ce qui reste entièrement sur votre appareil

- Vos spécifications, votre glossaire, votre style maison et les corrections apprises
- Votre `config.json` et vos fichiers de projet locaux
- Vos jetons d'API (conservés dans le gestionnaire d'identifiants de votre système d'exploitation)

Rien de tout cela n'est transmis où que ce soit.

## Ce qui va uniquement aux services que *vous* connectez

Pour rédiger et créer un ticket, le texte de votre rapport est envoyé au modèle
d'IA que vous utilisez (GitHub Copilot, ou votre propre clé OpenAI/Anthropic) et
à l'outil de suivi dans lequel vous le créez (tel que Jira ou Azure DevOps). Il
s'agit de l'IA et des outils que **vous** avez choisis et connectés — cela n'est
jamais acheminé via Taskivator, copié vers Taskivator, ni vu par Taskivator.

## Identifiants

Les jetons d'API résident dans le gestionnaire d'identifiants de votre système
d'exploitation — jamais dans un fichier, et jamais transmis à Taskivator.

## Statistiques du site web

Le site bugit.dev utilise Cloudflare Web Analytics, un service respectueux de la vie privée, pour mesurer les performances des pages et le nombre de visites. Il n'utilise pas de cookies et ne vous suit pas sur d'autres sites.

Avec votre consentement, le site utilise également la mesure Google (Google Ads) pour évaluer l'efficacité de notre publicité. Elle reste désactivée jusqu'à ce que vous choisissiez Tout accepter ou activiez Publicité dans le bandeau de cookies, et vous pouvez modifier ou retirer votre choix à tout moment via le lien Préférences des cookies dans le pied de page. Lorsque vous l'autorisez, nous pouvons partager le montant, la devise et une référence de commande non personnelle d'un achat afin qu'une vente puisse être attribuée à une annonce. Nous ne partageons jamais le contenu de vos rapports de bug, les informations de votre carte de paiement ni ce que vous saisissez dans le produit.

Cela concerne uniquement le site web. Le Logiciel lui-même n'envoie aucune donnée d'analyse, aucune publicité ni aucun suivi, comme décrit ci-dessus.

## Contact

Des questions sur la confidentialité ? Rendez-vous sur **bugit.dev** et ouvrez un
ticket d'assistance depuis votre tableau de bord BugIt — nous serons ravis de vous
aider.
