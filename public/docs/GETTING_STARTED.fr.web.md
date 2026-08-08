# Prise en main de BugIt

> **Avertissement sur la traduction.** Ce document a été traduit automatiquement et n'a pas été relu par des locuteurs natifs. La version anglaise fait foi : en cas de divergence, le texte anglais prévaut. Pour la formulation la plus exacte et la plus à jour, veuillez vous reporter au document en anglais.

BugIt transforme des notes de test sommaires en rapports de bogues révisés au sein de VS Code. Windows 11 avec VS Code et GitHub Copilot constitue le parcours client qualifié pour la version.

## Avant de commencer

- Installez la dernière version de VS Code et connectez-vous à GitHub Copilot.
- Installez un interpréteur Python 3.10 à 3.13 qualifié pour la version.
- Téléchargez BugIt depuis le tableau de bord de votre compte et décompressez-le dans un dossier local.
- Ne laissez pas de jetons, de données client ni de code source privé dans les conversations et les fichiers de configuration.

## Activer et configurer

- Ouvrez le dossier BugIt décompressé en tant qu'espace de travail VS Code approuvé.
- Dans Copilot Chat, sélectionnez l'agent QA BugIt et saisissez `Activate` (ajoutez `--solo` ou `--team` si votre compte possède les deux).
- BugIt ouvre le BugIt Portal dans votre navigateur. Connectez-vous avec votre propre compte BugIt : votre mot de passe reste dans le navigateur et n'est jamais saisi dans VS Code.
- Choisissez le droit Solo ou Team pour cette machine, puis vérifiez et approuvez cet appareil.
- Revenez à VS Code. BugIt termine l'autorisation automatiquement : il n'y a aucune clé de licence à copier, coller ou afficher.
- Saisissez `Begin setup` et ne choisissez que les intégrations utilisées par votre équipe.
- Laissez BugIt vérifier le service et le projet sélectionnés avant de créer un ticket.

## Gérer votre accès

- Une installation utilise un seul droit actif à la fois. Pour faire passer cette machine à un autre droit Solo ou Team, saisissez `Switch license` et approuvez à nouveau dans le navigateur ; si vous annulez, votre droit actuel est conservé.
- `Deactivate` supprime le droit de cette machine uniquement. Les sièges, les appareils, les adhésions, les rôles et la facturation se gèrent dans le Portal, pas dans VS Code.
- L'accès Team est individuel : chaque membre se connecte avec son propre compte BugIt et une adhésion active. Il n'y a aucune clé partagée ni connexion partagée.
- Après une vérification en ligne réussie, BugIt continue de fonctionner hors ligne jusqu'à 72 heures, pour Solo comme pour Team, et applique le dernier état du Portal dès la reconnexion.
- Les mises à jour sont autorisées par votre droit signé ; télécharger une nouvelle version ne demande donc jamais de clé.

## État des connexions

- Jira Cloud et Azure DevOps déposent directement via l'API REST du traqueur, avec un jeton d'API que vous créez dans votre propre compte. La configuration vérifie la connexion avant que vous ne vous en serviez.
- Confluence Cloud se connecte comme source de connaissances via le parcours assisté Atlassian Rovo MCP, qui utilise une connexion par navigateur.
- Sentry, GitHub, Linear et Notion restent expérimentaux tant que leurs prérequis de service et leurs contrôles en direct ne sont pas satisfaits.
- Les autres services mentionnés nécessitent un serveur MCP compatible fourni par l'organisation. BugIt fournit un accompagnement à la configuration, mais ne livre ni ne teste ces serveurs.

## Votre premier rapport

- Décrivez le problème en langage clair, en précisant où il s'est produit et à quelle fréquence.
- Répondez aux questions nécessaires pour compléter les étapes de reproduction.
- Examinez l'aperçu, en particulier les données privées, la gravité, le projet et les pièces jointes.
- Ne confirmez que lorsque la destination et le ticket final sont corrects.

## Obtenir de l'aide

Exécutez d'abord `Check status` ou `Check readiness` dans l'agent BugIt. Si le problème persiste, ouvrez un ticket d'assistance depuis le tableau de bord de votre compte BugIt, sans y inclure de secrets ni de contenu confidentiel de projet. L'assistance est fournie en anglais uniquement.
