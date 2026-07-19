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
récente est disponible.

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

BugIt utilise Cloudflare Web Analytics pour comprendre les performances générales du site web et le nombre de visites. Ce service est conçu sans cookies de suivi intersites.

Avec votre autorisation, nous pouvons également utiliser la mesure Google Ads pour comprendre si notre publicité génère des achats. Vous pouvez gérer vos choix à tout moment via les Préférences des cookies.

Lorsque la mesure des achats est activée, des informations de transaction limitées, telles que le montant de l'achat, la devise et une référence de commande unique, peuvent être utilisées à des fins d'attribution. Le contenu des rapports de bug, les informations de carte de paiement et les informations saisies dans le logiciel BugIt ne sont pas partagés avec Google Ads.

Ces outils de mesure s'appliquent uniquement au site web et au portail BugIt. Le logiciel BugIt n'utilise pas la mesure Google Ads et n'envoie aucune télémétrie produit.

## Contact

Des questions sur la confidentialité ? Rendez-vous sur **bugit.dev** et ouvrez un
ticket d'assistance depuis votre tableau de bord BugIt — nous serons ravis de vous
aider.
