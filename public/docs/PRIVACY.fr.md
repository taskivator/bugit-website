# Confidentialité — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Un résumé en langage clair de ce que le Logiciel collecte et ne collecte pas.
Tout s'exécute sur votre propre machine.

## Ce que le Logiciel envoie à Taskivator

BugIt s'active via votre navigateur web : vous vous connectez à votre propre
compte BugIt sur le Portal BugIt et vous approuvez cet appareil. Il n'y a
**aucune clé de licence** à saisir, à coller ou à partager.

Pour activer et maintenir votre licence valide, le Logiciel n'envoie que ce qui
est nécessaire pour lier votre droit d'utilisation à cette installation et à cet
appareil — des **données de licence/activation** :

- un **identifiant d'installation** — une valeur aléatoire créée une seule fois
  pour cette installation de BugIt. Il n'est pas dérivé de votre matériel et ne
  vous identifie pas,
- une **empreinte d'appareil anonyme, hachée à sens unique** — un hachage de
  16 caractères dérivé d'attributs de base de la machine. Il ne peut pas être
  inversé pour vous identifier, vous ou votre matériel,
- un **libellé d'appareil** — le nom d'hôte de votre ordinateur, afin que vous
  puissiez reconnaître cet appareil dans votre compte et le supprimer depuis le
  Portal quand vous le souhaitez,
- le **nom de votre système d'exploitation** et la **version de BugIt**, pour
  vérifier la compatibilité et si une mise à jour est disponible, et
- du **matériel d'activation** de courte durée — un défi à usage unique et un
  jeton d'approbation utilisés uniquement pour finaliser la connexion, ainsi
  qu'un hachage à sens unique d'un secret de confirmation local. Le secret
  lui-même ne quitte jamais votre machine, et le défi et le jeton bruts ne sont
  jamais stockés.

La connexion à votre compte s'effectue dans votre navigateur, sur le Portal. En
retour, le Portal délivre un **droit d'utilisation signé** lié à cet appareil et
à cette installation, que le Logiciel vérifie localement.

Ces éléments ne sont transmis qu'au Portal BugIt, et uniquement pour activer et
vérifier votre licence, gérer vos appareils et vérifier si une version plus
récente est disponible. Lorsque vous téléchargez une mise à jour, le Portal
enregistre également le téléchargement — y compris l'adresse IP et l'agent
utilisateur du navigateur de la requête — à des fins de sécurité et de prévention
des abus.

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
