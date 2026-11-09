<div align="center">

<img src="public/icon.svg" width="80" alt="Logo EcoleDirecte Option" />

# EcoleDirecte Option

**Une nouvelle interface, épurée et mobile-first, pour suivre sa scolarité sur École Directe.**

Connecte-toi avec ton compte École Directe et retrouve tes notes (avec graphiques), ton emploi du temps et tes devoirs.

[![Stars](https://img.shields.io/github/stars/purmea/ecoledirecteoption?style=flat-square)](https://github.com/purmea/ecoledirecteoption/stargazers)
[![Issues](https://img.shields.io/github/issues/purmea/ecoledirecteoption?style=flat-square)](https://github.com/purmea/ecoledirecteoption/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)

[Signaler un bug](https://github.com/purmea/ecoledirecteoption/issues) · [Proposer une fonctionnalité](https://github.com/purmea/ecoledirecteoption/issues)

</div>

---

> [!NOTE]
> Projet **non officiel**, sans lien avec Aplim / École Directe. Il s'appuie sur l'API non documentée
> d'École Directe ([documentation communautaire](https://github.com/EduWireApps/ecoledirecte-api-docs)),
> qui peut changer à tout moment. Un **mode démo** permet d'essayer l'app sans compte.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Connexion à École Directe](#connexion-à-école-directe)
- [Profils publics](#profils-publics)
- [Scripts](#scripts)
- [Structure du projet](#structure-du-projet)
- [Feuille de route](#feuille-de-route)
- [Contribuer](#contribuer)
- [Licence](#licence)
- [Contact](#contact)

## Fonctionnalités

| Écran | Ce qu'il fait |
| --- | --- |
| 🔐 **Connexion** | Identifiant / mot de passe École Directe, QCM de vérification du compte, option « Rester connecté », mode démo |
| 🏠 **Accueil** | Moyenne générale avec tendance, cours du jour, dernières notes et prochains devoirs |
| 📊 **Notes** | Courbe d'évolution de la moyenne, barres par matière comparées à la classe, détail de chaque note, choix du trimestre |
| 📅 **Planning** | Emploi du temps de la semaine, cours annulés et cours en cours mis en avant |
| 📚 **Devoirs** | Consignes groupées par date, filtres, cases à cocher synchronisées avec École Directe |
| 👤 **Profil** | Éditeur façon guns.lol avec aperçu en direct (voir [Profils publics](#profils-publics)) |
| ✨ **Profil public** | Page `#/u/ton-pseudo` : fond image/vidéo, musique, effets, réseaux, badges, widgets, vues |
| ⚙️ **Réglages** | Thème clair / sombre / automatique, actualisation, déconnexion |

Aussi inclus :

- 🎨 Design **épuré** : fonds neutres, un seul bleu d'accent (contraste vérifié en clair et en sombre)
- 📈 Graphiques en SVG faits maison, avec info-bulles au survol, au toucher et au clavier
- 📱 **Mobile-first** : barre de navigation en bas, adapté aux encoches (safe areas)
- 📲 **Manifest PWA** : l'app peut être ajoutée à l'écran d'accueil
- ♿ Accessibilité : HTML sémantique, ARIA, focus visible, `prefers-reduced-motion`
- ⚡ Aucune dépendance UI : React et du CSS natif

## Stack technique

- [Vite 8](https://vite.dev) : serveur de dev et build
- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) (mode strict)
- CSS natif avec variables (design tokens) ; pas de framework CSS
- Routage minimal par hash (`#/notes`, `#/devoirs`…), sans dépendance
- Petit proxy Node (`server/ed-proxy.mjs`) vers l'API École Directe

## Démarrage rapide

Prérequis : **Node.js ≥ 20.19** (ou ≥ 22.12) et npm.

```bash
git clone https://github.com/purmea/ecoledirecteoption.git
cd ecoledirecteoption
npm install
npm run dev
```

Puis ouvrir <http://localhost:5173>. Le serveur écoute aussi sur le réseau local : pour tester sur ton téléphone (connecté au même Wi-Fi), ouvre l'adresse `Network` affichée dans le terminal.

### En production

```bash
npm run build
npm start          # sert dist/ + le proxy sur http://localhost:8080 (PORT=… pour changer)
```

## Connexion à École Directe

Le navigateur ne peut pas parler directement à `api.ecoledirecte.com` : l'API ne gère pas le CORS et la
connexion exige un cookie `GTK` qu'un script ne peut pas lire. L'app passe donc par un **petit proxy**
(`server/ed-proxy.mjs`), branché automatiquement sur `npm run dev`, `npm run preview` et `npm start`.

```
Téléphone / navigateur  ──►  /ed/v3/...  (serveur de l'app)  ──►  api.ecoledirecte.com/v3/...
```

- Le proxy récupère le cookie `GTK` avant chaque login **ainsi que le second cookie `httponly`** posé
  avec lui (sans lui, École Directe répond « mot de passe invalide » même avec les bons identifiants),
  garde les cookies par appareil et utilise toujours le même User-Agent (sinon le jeton est invalidé).
- Le **QCM** suit le flux observé sur le vrai site : en-tête `2FA-Token` chaîné de requête en requête,
  champ `isReLogin`, `cn`/`cv` à la racine et dans `fa[]` (voir la
  [PR #55 de la doc](https://github.com/EduWireApps/ecoledirecte-api-docs/pull/55)).
- Il ne relaie que les routes `/v3/*.awp` d'École Directe et **n'enregistre jamais** les identifiants.
- Après le QCM de vérification (« nouvel appareil »), les jetons obtenus sont mémorisés sur
  l'appareil si « Rester connecté » est coché, pour ne pas le redemander.
- Sans le serveur (par exemple une version statique hébergée seule), seule la démo fonctionne.
- Seuls les **comptes élèves** sont pris en charge pour l'instant (pas encore les comptes parents).
- Derrière un proxy d'entreprise (`HTTPS_PROXY`), lance le serveur avec `NODE_USE_ENV_PROXY=1 npm run dev` :
  sinon le `fetch` de Node ignore le proxy.
- Pour tester sans vrai compte : `ED_API_ORIGIN=http://localhost:9999 npm run dev` redirige le proxy
  vers un faux serveur.

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le serveur de développement avec rechargement à chaud |
| `npm run build` | Vérifie les types puis génère la version de production dans `dist/` |
| `npm run preview` | Sert la version de production en local |
| `npm run typecheck` | Vérifie les types TypeScript uniquement |
| `npm start` | Sert la version de production + le proxy École Directe (après `npm run build`) |

## Profils publics

Chaque élève peut publier un profil à la guns.lol, partageable par un lien `…/#/u/pseudo`.

| Catégorie | Options |
| --- | --- |
| **Médias** | Arrière-plan (image, GIF ou vidéo MP4/WebM), avatar, musique (MP3/M4A/OGG/WAV) avec écran « clique pour entrer », curseur personnalisé |
| **Identité** | Pseudo unique, nom affiché, description, localisation |
| **Réseaux** | Instagram, TikTok, Snapchat, YouTube, X, Discord, GitHub, Twitch, Spotify, SoundCloud, Pinterest, Telegram, site web |
| **Personnalisation** | Effets d'arrière-plan (halos, pluie, neige, étoiles, particules), effets du pseudo (arc-en-ciel, machine à écrire, glitch, étincelles), opacité et flou du profil, effet lumineux (pseudo, réseaux, badges, widgets) |
| **Couleurs** | Accentuation (blocs), texte, arrière-plan, icônes + 5 palettes rapides |
| **Widgets** | Moyenne générale, une matière, évolution, meilleures matières, devoirs restants |
| **Badges** | Gagnés automatiquement : Félicitations / Compliments / Encouragements, En progression, Devoirs à jour |
| **Discord** | Avatar, décoration d'avatar et présence en direct via [Lanyard](https://github.com/Phineas/lanyard) (il faut rejoindre son serveur Discord) |
| **Autres** | Icônes monochromes, titre d'onglet animé, inversion des couleurs des blocs, contrôle du volume, affichage des badges |

- **Pseudo unique** : 3 à 20 caractères (`a-z`, `0-9`, `_`, `.`), vérifié en direct ; changer de pseudo
  libère l'ancien.
- **Images** redimensionnées et converties en WebP dans le navigateur avant l'envoi (les GIF restent animés).
- **Widgets** : instantané des moyennes, mis à jour à chaque publication et à chaque actualisation des
  données. Rien n'est public tant que tu ne publies pas.
- **Sécurité** : un profil appartient à un compte élève. Quand un login École Directe réussit, le serveur
  lie la session de l'appareil à ce compte ; seule une session liée peut modifier ce profil ou envoyer des
  fichiers. Un profil ne peut utiliser que ses propres médias ; les SVG sont refusés ; les médias servis
  ont un type fixe (`nosniff`). Les médias inutilisés sont supprimés automatiquement.
- **Stockage** : `data/profiles.json` et `data/media/` (ignorés par git), ou `$DATA_DIR`.
- En **mode démo**, le profil reste sur l'appareil (fichiers limités à 2 Mo).

API (servie par `npm run dev`, `npm run preview` et `npm start`) :

| Route | Rôle |
| --- | --- |
| `GET /api/u/:pseudo` | Profil public (+1 vue) |
| `GET /api/handles/:pseudo` | Disponibilité d'un pseudo |
| `GET` / `PUT` / `DELETE /api/me/profile` | Lire, créer ou modifier, supprimer son profil |
| `POST /api/media` | Envoyer un média (corps brut + `Content-Type`) |
| `GET /api/media/:fichier` | Lire un média |

## Structure du projet

```
.
├── index.html              # Point d'entrée HTML
├── public/                 # Icône et manifest PWA
├── src/
│   ├── main.tsx            # Montage de React
│   ├── App.tsx             # Shell : routage, thème, état des devoirs
│   ├── styles.css          # Design tokens + styles (clair & sombre)
│   ├── types.ts            # Types partagés (notes, cours, devoirs…)
│   ├── lib.ts              # Calculs de moyennes, formatage des dates
│   ├── api/                # Client École Directe + conversion des données
│   ├── state/session.tsx   # Connexion, QCM, démo, chargement des données
│   ├── profile/            # Profils publics : types, API, page, effets, réseaux, Discord
│   ├── data/demo.ts        # Données de démonstration
│   ├── hooks/              # useHashRoute, useLocalStorage
│   ├── components/         # Graphiques, navigation, composants UI
│   └── pages/              # Connexion, Accueil, Notes, Planning, Devoirs, Profil, Profil public, Réglages
├── server/
│   ├── ed-proxy.mjs        # Proxy vers l'API École Directe
│   ├── profiles.mjs        # API des profils publics (pseudos, photos, widgets)
│   └── serve.mjs           # Serveur de production (npm start)
└── vite.config.ts
```

## Feuille de route

- [x] Nouvelle interface mobile-first (Vite + React + TypeScript)
- [x] Notes, emploi du temps, devoirs, réglages
- [x] Thème sombre et manifest PWA
- [x] Connexion à un compte École Directe (élève), QCM de vérification
- [x] Graphiques : évolution de la moyenne, comparaison à la classe
- [x] Profils publics façon guns.lol : médias, effets, couleurs, réseaux, badges, Discord, widgets
- [ ] Comptes parents (plusieurs enfants)
- [ ] Messagerie et vie scolaire (absences, retards)
- [ ] Mode hors-ligne (service worker)
- [ ] Notifications de nouvelles notes
- [ ] Application mobile native (iOS / Swift)

## Contribuer

Les contributions sont les bienvenues !

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Vérifiez que le build passe (`npm run build`)
4. Commitez (`git commit -m "Ajoute ma fonctionnalité"`)
5. Poussez (`git push origin feature/ma-fonctionnalite`)
6. Ouvrez une Pull Request

## Licence

Distribué sous licence MIT. Voir [`LICENSE`](LICENSE).

## Contact

**@mea et @sofki**

- GitHub : [@purmea](https://github.com/purmea)
- E-mail : [shawtybae@atomicmail.io](mailto:shawtybae@atomicmail.io)
- Projet : <https://github.com/purmea/ecoledirecteoption>

---

<div align="center">Fait avec ❤️ par @mea et @sofki</div>
