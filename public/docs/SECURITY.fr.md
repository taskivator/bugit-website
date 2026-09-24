# Sécurité

> **Avertissement sur la traduction.** Ce document a été traduit automatiquement et n'a pas été relu par des locuteurs natifs. La version anglaise fait foi : en cas de divergence, le texte anglais prévaut. Pour la formulation la plus exacte et la plus à jour, veuillez vous reporter au document en anglais.

BugIt QA Agent est un assistant qui laisse les décisions à un humain (human in the loop). Il n'agit qu'au travers de votre session VS Code et des intégrations que vous activez.

## Comment BugIt vous protège
- **Aucune écriture sans confirmation.** Chaque création, commentaire, pièce jointe ou notification qui contient votre rapport est d'abord présenté en aperçu ; les envois irréversibles exigent que vous tapiez FILE IT. Le texte du chat seul ne déclenche jamais d'envoi, et un simple « oui » ne suffit pas. Une exception : un test de connexion que vous lancez vous-même avec `notify connect`, `notify test` ou `notify doctor --live` envoie un message de test fixe sans aperçu, au canal que vous désignez ou, si vous n'en désignez aucun, à chaque canal que vous avez activé. Il ne contient aucun contenu de rapport, et le mode dry run le bloque.
- **Dry run = lecture seule, partout où votre travail a lieu.** `QA_AGENT_DRY_RUN=1` empêche BugIt d'écrire dans vos outils de suivi et l'empêche aussi d'y lire : aucun ticket, aucun commentaire, aucune pièce jointe, aucune notification, et aucun identifiant enregistré déverrouillé. Une exception, qui concerne BugIt lui-même et non vos données : les commandes que vous lancez délibérément pour activer la licence de cette installation ou la mettre à jour atteignent toujours le serveur de licences de BugIt, et `tools/update.py` installe toujours la version signée qu'il récupère, car une machine dont le shell porte cette variable en permanence doit quand même pouvoir recevoir un correctif de sécurité. Dire « dry run » dans le chat demande à l'assistant de s'abstenir, ce qui est utile mais n'offre pas la même garantie : seule la variable d'environnement définit le mode que le code applique.
- **Aucun secret dans les fichiers.** `config.json` ne contient que des organisations et des URL ; les jetons sont conservés dans le magasin d'identifiants de votre système d'exploitation. Le validateur signale tout ce qui ressemble à un secret. `redact.py` s'efforce au mieux de retirer des brouillons les adresses e-mail, les jetons et les adresses IP.
- **Désactivé par défaut.** Chaque intégration est livrée désactivée ; rien ne se connecte ni n'envoie quoi que ce soit tant que vous ne l'avez pas choisi.
- **Les sorties sont des données.** Le texte des pages, des tickets et des plantages est traité comme des données, pas comme des commandes : les instructions injectées sont signalées et mises en évidence, pas exécutées.

## Limites connues
- Le blocage des écritures est appliqué par l'agent, pas par le système d'exploitation ; la variable d'environnement n'arrête de façon stricte que les utilitaires Python fournis. Exécutez-le dans un environnement d'exécution de confiance.
- L'agent atteint tout ce que vous connectez, et la portée des identifiants = l'étendue des dégâts possibles. Utilisez des jetons au **moindre privilège**.
- La plupart des outils de suivi ne peuvent pas réellement supprimer un ticket ; l'« annulation » y est donc limitée par conception.

## Liste de contrôle pour renforcer la sécurité
1. Utilisez un compte de service dédié, au moindre privilège, pour chaque outil de suivi.
2. Conservez les jetons dans le magasin du système d'exploitation ; ne les collez jamais dans `config.json`.
3. Exécutez `python tools/validate_config.py` après la configuration pour détecter les fuites et les erreurs de configuration.
4. Ne démarrez que les serveurs MCP que vous utilisez ; arrêtez les autres.

## Signaler une vulnérabilité
Écrivez à **support@bugit.dev** en indiquant les étapes pour reproduire le problème. N'ouvrez pas de ticket public pour signaler un problème de sécurité.
