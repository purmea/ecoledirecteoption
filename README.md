<div align="center">

<img src="public/icon.svg" width="80" alt="Logo EcoleDirecte Option" />

# EcoleDirecte Option

**Une nouvelle interface, moderne et mobile-first, pour suivre sa scolarité sur École Directe.**

Notes, emploi du temps et devoirs dans une app rapide et agréable à utiliser, avec un thème sombre.

[![Stars](https://img.shields.io/github/stars/purmea/ecoledirecteoption?style=flat-square)](https://github.com/purmea/ecoledirecteoption/stargazers)
[![Issues](https://img.shields.io/github/issues/purmea/ecoledirecteoption?style=flat-square)](https://github.com/purmea/ecoledirecteoption/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)

[Signaler un bug](https://github.com/purmea/ecoledirecteoption/issues) · [Proposer une fonctionnalité](https://github.com/purmea/ecoledirecteoption/issues)

</div>

---

> [!NOTE]
> Projet **non officiel**, sans lien avec Aplim / École Directe.
> La version actuelle utilise des **données de démonstration** : la connexion à un vrai compte n'est pas encore disponible.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Scripts](#scripts)
- [Structure du projet](#structure-du-projet)
- [Feuille de route](#feuille-de-route)
- [Contribuer](#contribuer)
- [Licence](#licence)
- [Contact](#contact)

## Fonctionnalités

| Écran | Ce qu'il fait |
| --- | --- |
| 🏠 **Accueil** | Salutation, moyenne générale, cours du jour, dernières notes et prochains devoirs |
| 📊 **Notes** | Moyenne générale pondérée, moyenne par matière comparée à celle de la classe, détail de chaque note |
| 📅 **Planning** | Emploi du temps jour par jour sous forme de frise, avec les cours annulés |
| 📚 **Devoirs** | Liste filtrable (à faire / faits / tous) ; les devoirs cochés sont gardés en mémoire |
| ⚙️ **Réglages** | Profil, thème clair / sombre / automatique, réinitialisation des données |

Aussi inclus :

- 📱 Design **mobile-first** avec barre de navigation en bas, adapté aux encoches (safe areas)
- 🌙 **Thème sombre** qui suit le système ou se choisit à la main
- 📲 **Manifest PWA** : l'app peut être ajoutée à l'écran d'accueil
- ♿ Accessibilité de base : HTML sémantique, attributs ARIA, focus visible, respect de `prefers-reduced-motion`
- ⚡ Zéro dépendance UI : React et du CSS natif, rien d'autre

## Stack technique

- [Vite 8](https://vite.dev) : serveur de dev et build
- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) (mode strict)
- CSS natif avec variables (design tokens) ; pas de framework CSS
- Routage minimal par hash (`#/notes`, `#/devoirs`…), sans dépendance

## Démarrage rapide

Prérequis : **Node.js ≥ 20.19** (ou ≥ 22.12) et npm.

```bash
git clone https://github.com/purmea/ecoledirecteoption.git
cd ecoledirecteoption
npm install
npm run dev
```

Puis ouvrir <http://localhost:5173>. Le serveur écoute aussi sur le réseau local : pour tester sur un téléphone, ouvrir l'adresse `Network` affichée dans le terminal.

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le serveur de développement avec rechargement à chaud |
| `npm run build` | Vérifie les types puis génère la version de production dans `dist/` |
| `npm run preview` | Sert la version de production en local |
| `npm run typecheck` | Vérifie les types TypeScript uniquement |

## Structure du projet

```
.
├── index.html              # Point d'entrée HTML
├── public/                 # Icône et manifest PWA
├── src/
│   ├── main.tsx            # Montage de React
│   ├── App.tsx             # Shell : routage, thème, état des devoirs
│   ├── styles.css          # Design tokens + styles (clair & sombre)
│   ├── lib.ts              # Calculs de moyennes, formatage des dates
│   ├── data/demo.ts        # Types et données de démonstration
│   ├── hooks/              # useHashRoute, useLocalStorage
│   ├── components/         # BottomNav, Icon, composants UI de base
│   └── pages/              # Accueil, Notes, Planning, Devoirs, Réglages
└── vite.config.ts
```

## Feuille de route

- [x] Nouvelle interface mobile-first (Vite + React + TypeScript)
- [x] Notes, emploi du temps, devoirs, réglages
- [x] Thème sombre et manifest PWA
- [ ] Connexion à un compte École Directe
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
