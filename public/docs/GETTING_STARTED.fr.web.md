# Prise en main de BugIt

BugIt transforme des notes de test sommaires en rapports de bogues révisés au sein de VS Code. Windows 11 avec VS Code et GitHub Copilot constitue le parcours client qualifié pour la version.

## Avant de commencer

- Installez la dernière version de VS Code et connectez-vous à GitHub Copilot.
- Installez un interpréteur Python 3.10 à 3.13 qualifié pour la version.
- Téléchargez BugIt depuis le tableau de bord de votre compte et décompressez-le dans un dossier local.
- Ne laissez pas de clés de licence, de jetons, de données client ni de code source privé dans les conversations et les fichiers de configuration.

## Activer et configurer

- Ouvrez le dossier BugIt décompressé en tant qu'espace de travail VS Code approuvé.
- Dans Copilot Chat, sélectionnez l'agent QA BugIt et saisissez `Activate`.
- Saisissez la clé de licence uniquement dans l'invite de terminal masquée.
- Saisissez `Begin setup` et ne choisissez que les intégrations utilisées par votre équipe.
- Laissez BugIt vérifier le service et le projet sélectionnés avant de créer un ticket.

## État des connexions

- Jira Cloud et Confluence Cloud empruntent le parcours assisté Atlassian Rovo MCP et nécessitent une authentification via le navigateur ainsi que des contrôles de capacité en direct.
- Azure DevOps utilise la préversion publique du MCP distant de Microsoft à portée organisationnelle et nécessite une vérification en direct.
- Sentry, GitHub, Linear et Notion restent expérimentaux tant que leurs prérequis de service et leurs contrôles en direct ne sont pas satisfaits.
- Les autres services mentionnés nécessitent un serveur MCP compatible fourni par l'organisation. BugIt fournit un accompagnement à la configuration, mais ne livre ni ne teste ces serveurs.

## Votre premier rapport

- Décrivez le problème en langage clair, en précisant où il s'est produit et à quelle fréquence.
- Répondez aux questions nécessaires pour compléter les étapes de reproduction.
- Examinez l'aperçu, en particulier les données privées, la gravité, le projet et les pièces jointes.
- Ne confirmez que lorsque la destination et le ticket final sont corrects.

## Obtenir de l'aide

Exécutez d'abord `Check status` ou `Check readiness` dans l'agent BugIt. Si le problème persiste, ouvrez un ticket d'assistance depuis le tableau de bord de votre compte BugIt, sans y inclure de secrets ni de contenu confidentiel de projet.