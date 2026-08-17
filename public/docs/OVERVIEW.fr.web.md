# Agent QA BugIt : Présentation

> **Avertissement sur la traduction.** Ce document a été traduit automatiquement et n'a pas été relu par des locuteurs natifs. La version anglaise fait foi : en cas de divergence, le texte anglais prévaut. Pour la formulation la plus exacte et la plus à jour, veuillez vous reporter au document en anglais.

BugIt est un agent commercial VS Code Copilot qui transforme des notes de test brutes en rapports de bogues cohérents. Il rédige localement dans votre espace de travail et n'écrit dans les services connectés qu'après un aperçu et une confirmation.

## Fonctionnement essentiel

- Recueillez les notes de reproduction sommaires, les journaux, les captures d'écran et le comportement attendu.
- Rédigez un rapport structuré comportant titre, gravité, environnement, étapes et preuves.
- Recherchez d'éventuels doublons dans le traqueur connecté.
- Prévisualisez et validez la destination ainsi que le contenu final avant toute écriture externe.
- Ajoutez des commentaires de vérification après qu'un correctif a été retesté.

## Confidentialité et contrôle

- BugIt n'envoie aucune donnée analytique produit ni télémétrie de ticket à Taskivator.
- Votre fournisseur d'IA connecté et les intégrations activées ne traitent que le contenu que vous choisissez de leur transmettre.
- Les demandes de licence et de mise à jour utilisent les données de licence et un identifiant d'appareil à sens unique, et non le contenu des tickets.
- Le mode simulation empêche les assistants Python intégrés d'écrire, mais vous devez tout de même examiner les actions MCP externes.
- Les fichiers de configuration ne doivent jamais contenir de valeurs d'identifiants.

## Niveaux d'intégration

- Crée les tickets avec un identifiant que vous créez dans votre propre compte ; BugIt vérifie cet identifiant face à votre destination avant d’enregistrer la connexion : Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana et Trello. Les onze, via l'API propre à chaque outil.
- Source de connaissances assistée, en lecture seule : Confluence Cloud via Atlassian Rovo MCP, avec connexion par navigateur. Sentry et Notion restent expérimentaux jusqu'à ce que leurs vérifications en direct passent.
- Accompagnement à la configuration uniquement : serveurs compatibles fournis par l'organisation pour les outils de plantage, la gestion des tests, les communications et les services de connaissances.
- Non pris en charge par la configuration automatisée : connecteurs de stockage S3, Google Drive et Azure Blob.

## Périmètre de la version

- BugIt est la version commerciale actuellement publiée, activement maintenue.
- Windows 11, VS Code, GitHub Copilot et Python 3.10 à 3.13 constituent l'environnement qualifié pour la version.
- Le Guide de l'utilisateur complet et la Présentation sont disponibles en PDF, en anglais et dans toutes les langues prises en charge ; prévisualisez-les ou téléchargez-les ci-dessous.

## Politiques

- Consultez la [déclaration de confidentialité](/public/docs/PRIVACY.md).
- Prenez connaissance des [consignes de sécurité](/public/docs/SECURITY.md).