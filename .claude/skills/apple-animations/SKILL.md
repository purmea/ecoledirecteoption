---
name: apple-animations
description: Ajouter ou modifier des animations « façon Apple » (ressorts, flou à l'entrée, glissements, rebonds) dans EcoleDirecte Option, en réutilisant les ressorts CSS et les keyframes déjà définis. À utiliser dès qu'on demande une animation, une transition, un effet d'entrée ou un rebond dans l'interface.
---

# Animations façon Apple

Toutes les animations de l'app reposent sur de vrais ressorts (fonction CSS `linear()`), pas sur `ease`. Elles sont écrites en CSS pur, sans bibliothèque.

## Fichiers

- `src/spring.css` : les trois ressorts (variables CSS).
- `src/animations.css` : les keyframes et les règles d'animation globales. Chargé **après** `styles.css`, il a donc le dernier mot.
- `src/styles.css` : styles des composants ; peut contenir des animations locales (ex. `choice-bounce`, `.swap-in`).

## Les ressorts

| Variable | Rendu | Usage |
| --- | --- | --- |
| `--spring` | rebond marqué (dépasse ~8 %) | pastilles qui glissent, icônes, boutons, apparition de panneaux |
| `--spring-soft` | doux, dépasse à peine | pages, listes, contenus qui se posent |
| `--spring-snap` | vif, rebond léger | petits retours au toucher |

Durées conseillées : **0,4 à 0,8 s**. Moins, le ressort ne se voit pas ; plus, l'interface paraît lente.

## Recettes déjà en place (à réutiliser avant d'en inventer)

- **Changement de page** : `.page` glisse dans le sens de la navigation (`page-in-r` / `page-in-l` selon `data-dir`), avec flou léger (3 à 5 px) qui disparaît.
- **Contenu en cascade** : `rise-soft` (monte de 14 px, échelle 0.985, flou 4 px).
- **Listes** : `row-in` sur chaque `li`, décalage `calc(80ms + var(--row, 0) * 45ms)`.
- **Tuiles et widgets** : `tile-in` (monte de 18 px, échelle 0.94, flou 6 px).
- **Barre du bas** : la bulle `.nav-pill` glisse avec `transition: left 0.65s var(--spring)`, l'icône active rebondit (`nav-bounce`).
- **Onglets segmentés** (`.tabs`) : la pastille `::before` glisse avec `transform: translateX(calc(var(--i) * (100% + 2px)))` et `--spring`. Le composant `Segmented` fournit `--n` (nombre) et `--i` (index).
- **Choix sélectionné** : `choice-bounce` sur `[aria-selected='true']` / `[aria-checked='true']` (échelle 0.88 vers 1).
- **Changement de contenu au sein d'une page** : mettre `key={valeur}` sur un conteneur `.swap-in` ; ses enfants rejouent `row-in` en cascade (70 ms entre chaque).
- **Panneaux** (`Sheet`) : `sheet-in`, montée depuis le bas avec `--spring`. **Menu latéral** (`Drawer`) : `transform: translateX` avec `--spring`.
- **Coches** : le tracé se dessine (`stroke-dashoffset`), un anneau se propage (`ring`), le texte se barre (`strike`).
- **Compteurs** : `CountUp` (src/fx) fait défiler un nombre ; les confettis sont dans `Confetti`.

## Règles à respecter

1. **Ne jamais utiliser `ease` / `ease-in-out`** pour un mouvement visible : prendre un ressort. `ease` reste acceptable pour une simple opacité (< 0,3 s).
2. **Animer seulement `transform`, `opacity` et `filter`** (rapide, sans recalcul de mise en page). Pour une hauteur variable, utiliser `grid-template-rows: 0fr` vers `1fr`.
3. **`animation-fill-mode: backwards`**, jamais `both`, pour les animations d'entrée : avec `both`, l'élément garde `transform` / `filter: blur(0)` après l'animation, ce qui crée une couche graphique inutile et rend le texte moins net. Ajouter le sélecteur à la liste « fill-mode: backwards » de `animations.css`. Exception : les animations de sortie (`leave`), qui doivent garder l'état final.
4. **Un `backdrop-filter` ne doit pas être dans un parent qui a `filter`, `opacity < 1` ou `transform`** pendant qu'on s'en sert (le flou ne voit plus l'arrière-plan).
5. **Décalages** : 45 à 90 ms entre éléments d'une cascade, jamais plus de 400 ms au total.
6. **Retour tactile** : `:active` réduit à environ 0.94 à 0.97 avec `transition: transform 0.4s var(--spring)`.
7. **Réglage utilisateur** : Profil, Personnalisation générale, « Animations ». Quand il est coupé, `:root[data-anim='off']` met toutes les durées à 0,01 ms. Ne pas contourner : toute nouvelle animation doit fonctionner avec cette règle (pas de logique qui dépend de la fin d'une animation).
8. **Mouvement réduit** : respecter `@media (prefers-reduced-motion: reduce)` (voir `animations.css`) ; ajouter les nouvelles classes à la liste qui désactive les animations.
9. **Planning** : les blocs de cours (`.ed-block`) n'ont volontairement aucune animation de suppression ni de réinitialisation. Ne pas en ajouter.

## Modèle pour une nouvelle animation d'entrée

```css
@keyframes mon-effet-in { from { opacity: 0; transform: translateY(12px) scale(0.97); filter: blur(4px); } }
.ma-carte { animation: mon-effet-in 0.7s var(--spring-soft) backwards; animation-delay: calc(80ms + var(--k, 0) * 60ms); }
```

Puis, côté React, passer l'index : `style={{ '--k': i } as CSSProperties}`.

## Modèle pour une pastille qui glisse (choix multiple)

```css
.mon-groupe { position: relative; isolation: isolate; }
.mon-groupe::before {
  content: ''; position: absolute; z-index: -1; inset: 3px auto 3px 3px;
  width: calc((100% - 6px) / var(--n)); border-radius: 9px; background: var(--bg);
  transform: translateX(calc(var(--i) * 100%)); transition: transform 0.6s var(--spring);
}
```

## Vérifier

1. `npm run typecheck && npm run build`.
2. Lancer `npm run preview`, ouvrir sur un écran de téléphone, déclencher le changement plusieurs fois de suite (l'animation doit se rejouer, pas rester figée).
3. Vérifier avec le réglage « Animations » coupé : l'interface doit rester correcte et immédiate.
4. Contrôler qu'aucun `filter: blur(0px)` ni `transform` résiduel ne reste sur l'élément une fois l'animation finie.
