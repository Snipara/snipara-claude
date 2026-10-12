# Distribution Snipara — 12 octobre 2026

Un produit, une source commune, deux paquets adaptés aux capacités des clients.
Cette préparation ne constitue ni une soumission ni une publication.

| Artefact             | Contenu                                                                              | Connexion                                                                |
| -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Marketplace native   | Snipara, Companion, Orchestrator, réglages et hook informatif ; trois modules ON/OFF | OAuth natif et choix explicite du projet ; profil local pour les moteurs |
| Brouillon d'annuaire | MCP HTTPS, skill context/mémoire commun et connexion ; aucun script ou hook          | OAuth de compte ; variante liée au projet de revue disponible            |

Le dossier native-marketplace/ est préparé pour le dépôt existant
`Snipara/snipara-claude`, confirmé par le titulaire. Il contient les deux catalogues et le plugin
complet ; aucun fichier applicatif, secret ou moteur Companion/Orchestrator
n'est exporté. Le dépôt applicatif privé ne doit pas être rendu public pour cela.
La version 2.0.0 succède au plugin public 1.1.0 ; le catalogue Claude conserve
son nom `snipara-plugins`. Les ZIPs incluent les manifests cachés ;
inventory.json décrit les fichiers et distribution-manifest.json contient les
checksums et les limites de preuve.

## Choix du projet — version 0.3.0

L'adresse commune `https://api.snipara.com/mcp` est déployée depuis le
11 octobre 2026. Le consentement authentifié liste les seuls projets accessibles,
sans présélection. Le code OAuth puis le jeton conservent l'identifiant choisi
et l'audience exacte ; le serveur déduit le projet du jeton et revérifie les droits.
Un refresh ne peut pas changer de projet, de client ou d'audience.

Le schéma JS et son miroir Python ajoutent `OAuthToken.resource`, nullable pour
les anciens jetons device-flow. La migration idempotente est
`apps/mcp-server/prisma/migrations/20261011_mcp_oauth_resource.sql`.
La migration additive et les déploiements web/MCP sont vérifiés. Une connexion
OAuth neuve dans un profil Codex isolé a permis des lectures MCP réelles.
Les connexions des profils habituels Claude/Codex et leurs réponses sourcées
ont été vérifiées le 12 octobre. Le refresh et les cas de revue restent distincts.
Les ZIPs historiques restent marqués
`readyToPublish: false` et `readyToSubmit: false` ; leur inventaire n'est pas modifié.

Pour Companion/Orchestrator, récupérer l'identifiant par `snipara_stats` sur
la connexion du plugin puis générer un profil local avec
`build --connection account --project <id-observé>`. Ce réglage garde la même
adresse MCP. Un changement de projet nécessite une nouvelle connexion OAuth
et un profil local correspondant. Les moteurs conservent leur authentification
séparée ; aucun jeton natif n'est copié.

## Préparation de la revue

Les cinq cas positifs et trois négatifs de review-cases.json sont proposés pour
un projet synthétique dédié. Ils sont non exécutés à ce stade.

Préparer dans ce projet :

- Un document « Atlas rollout note » indiquant que le lancement exige un
  checkpoint revu et qu'aucune date ou aucun prix n'a été approuvé.
- Une décision revue confirmant que la revue du checkpoint précède le lancement.
- Aucun document client réel et aucun secret.
- Un compte de revue avec accès à ces seules données et aux outils requis.
  Ses identifiants restent dans les champs sécurisés du portail.

Recette par client annoncé : installation neuve du paquet exact, connexion OAuth
neuve, bon projet observé, réponse sourcée avec chunk réel, rappel de la décision
revue, absence d'approbation de prix, refus d'exécution locale dans la variante
publique, absence d'écriture de secret. Tester séparément refresh, révocation et
accès interdit à un autre projet. Consigner versions, résultats et limites sans
jetons ni logs bruts.

La vidéo de revue doit enregistrer de vraies interactions : installation/version,
consentement, question Atlas et source, rappel de décision, puis limite
d'exécution locale. Une vidéo marketing, un script ou une simulation ne suffit
pas. Aucun enregistrement de recette ni URL de lecture n'est encore fourni.

## Éditeur et listing

L'éditeur **Starbox Group Gmbh** et la licence **MIT** ont été confirmés par le
titulaire le 11 octobre 2026. LICENSE couvre le code et la documentation du
plugin ; NOTICE exclut la marque, les icônes, les logos, le backend et le service
hébergé. Cette licence ne modifie pas celle des moteurs Companion/Orchestrator.

listing.json contient ces choix, les textes, prompts, catégorie proposée et
quatre URLs du site existant. La confirmation de l'éditeur est distincte de la
vérification d'identité du portail. La catégorie sera confirmée dans le portail.
Le titulaire a confirmé tous les pays disponibles sur chaque plateforme et un
plugin gratuit nécessitant un compte Snipara ; l'abonnement éventuel est acheté
séparément sur snipara.com. Ces choix figurent dans le paquet, sans restriction
de pays ajoutée par le plugin et sans paiement dans ses outils.
Le logo réutilise le favicon officiel 512 × 512 pixels. La couverture des
politiques existantes pour les pratiques du plugin doit être revue avant
soumission ; aucun nouvel engagement légal n'est inventé.

## Parcours de publication

1. Terminer la recette dans les clients habituels après la migration et le
   déploiement déjà vérifiés ; renseigner les pays et préparer l'accès de revue.
   L'éditeur et la licence sont confirmés.
2. Publier les seuls fichiers de distribution dans le dépôt dédié choisi ;
   vérifier les commandes d'installation depuis ce dépôt.
3. Finaliser les huit cas, l'enregistrement réel et son URL accessible.
4. Claude : soumettre le MCP distant comme connecteur, puis le dossier plugin
   du dépôt comme bundle, depuis la même organisation à
   `https://claude.ai/directory/manage`. Le marketplace claude-plugins-official
   est un canal partenaire distinct de cet annuaire public.
5. OpenAI : préparer la soumission avec un MCP distant, identité vérifiée,
   droits d'organisation, connexion et scans ; aucun hook dans le ZIP.
6. Le titulaire complète les attestations du portail. Consigner ID et état de
   revue ; ajouter un bouton officiel après publication vérifiée.

Références :
[Claude](https://code.claude.com/docs/en/plugins/publish),
[OpenAI](https://developers.openai.com/plugins/deploy/submission),
[Composants locaux](https://developers.openai.com/plugins/guides/submit-claude-plugin).
