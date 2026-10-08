# NVX CORE

Bot Discord personnel pour :
- TAG::OUT — communauté du jeu
- NVX LABS — serveur de développement

## Pré-requis
Node.js 24.17.0 ou plus récent est recommandé par la documentation discord.js actuelle.

## Installation
1. Installe Node.js.
2. Ouvre un terminal dans ce dossier.
3. Lance :
   npm install
4. Copie `.env.example` vers `.env`.
5. Remplis les valeurs de `.env`.
6. Enregistre les commandes :
   npm run register
7. Démarre le bot :
   npm start

## Commandes

### Public
/ping
/help
/game
/rules
/link
/bug
/suggest

### TAG::OUT
/update

### NVX LABS / équipe
/announce
/devlog
/build
/changelog

Les commandes de gestion vérifient les permissions Discord et/ou les rôles configurés dans STAFF_ROLE_NAMES.

## Sécurité
Ne partage jamais DISCORD_TOKEN. Ne le mets jamais dans un message, une vidéo ou un dépôt public.
