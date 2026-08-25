# 🍽 Meal Plan

Application Android de planification des repas et gestion des courses. Interface React (Vite) dans une WebView Android native.

**Version actuelle : 3.0.7** · build v56

---

## Fonctionnalités

### 📅 Planning
- Vue annuelle (semaine par semaine) ou fenêtre glissante (4 / 8 / 13 semaines)
- Ajout de recettes par semaine avec ajustement des portions
- Repas sans recette ("Restaurant", "Restes"…) en entrée libre
- Note par repas
- Badge "↩ déjà la semaine passée" si la même recette est planifiée deux semaines consécutives
- Duplication d'une semaine entière vers une autre
- Navigation vers une semaine depuis la fiche recette (WeeksBadge)
- Partage de la semaine (liste des repas + notes)

### 📖 Recettes
- Onglets **🧂 Salé / 🍰 Sucré / Toutes** pour filtrer par type
- Grille avec tags, badge de fréquence (×N), toggle type direct sur chaque carte
- Fiche complète : ingrédients (indicateurs ✅/⬜ selon liste de courses), étapes cochables, timer détecté automatiquement
- **🍳 Mode cuisine** plein écran : étapes une à une, tap ou bouton ✓ Fait, timer par étape, overlay ingrédients
- **📋 Ajouter à la liste** : ajout direct depuis la fiche sans planifier, avec badge ingrédients manquants
- **🗑 Retirer de la liste** : suppression en lot des ingrédients de la recette depuis la liste
- Import depuis URL (JSON-LD, Jow, HTML brut) ou texte collé, avec timeout 30s et bouton Annuler
- Avertissement si on quitte l'éditeur avec des modifications non sauvegardées
- Duplication vers éditeur direct
- Favori toggle inline dans la fiche

### 🛒 Courses
- Catégories organisées par ordre drag-and-drop, en-têtes visuellement distincts (fond bleu #1A2636 + bordure accent)
- Catégorisation automatique par mots-clés (gestion singulier/pluriel français)
- Fusion automatique des doublons avec conversion d'unités (g/kg, ml/cl/L)
- Recatégorisation rétroactive quand un mot-clé est ajouté à une catégorie
- Recherche rapide dans la liste (filtre par catégorie)
- Rescaling des quantités quand on change le nombre de personnes d'un repas
- **🛍 Mode courses** plein écran : tap = article récupéré, barre de progression, prompt "Vider les cochés ?" à la sortie
- Retirer / ajouter les ingrédients d'une recette depuis sa fiche
- Partage enrichi (recettes planifiées + articles groupés par catégorie + nom de recette)

### 📊 Stats
- KPIs : nb recettes, repas, semaines avec repas
- Bar chart 8 dernières semaines d'activité
- Top 5 recettes par fréquence
- Répartition des tags
- "Jamais cuisinées" : triées favoris + A-Z, cliquables (fiche recette + 📅 affecter direct)

### ⚙️ Options
- Vue du planning : annuelle ou fenêtre glissante (4 / 8 / 13 sem.)
- Taille du foyer par défaut (1–20, défaut 6)
- Gestion des catégories de courses (création, édition, ordre, suppression)
- Import / Export JSON complet

---

## Architecture

### Fichiers

| Fichier | Rôle |
|---|---|
| `src/App.jsx` | Front React complet (~5 460 lignes, tout-en-un intentionnel) |
| `android/app/src/main/java/…/MainActivity.java` | WebView Android + bridge bouton retour |
| `android/app/src/main/java/…/RecipeImporter.java` | Fetch HTTP Android (contourne CORS WebView) |
| `android/app/build.gradle` | `versionCode` + `versionName` |
| `package.json` | `"version"` |

### Versioning

À chaque modification, incrémenter dans les **3 fichiers** :
- `VERSION` const dans `App.jsx`
- `"version"` dans `package.json`
- `versionCode` + `versionName` dans `build.gradle`

### Stack

- React (Vite) dans Android WebView
- Pas de router — navigation par state (`tab`, modales conditionnelles)
- Un seul contexte global `AppCtx` via `AppProvider`
- Persistance localStorage (fallback mémoire si indisponible)
- Bouton retour Android via bridge JS `window.__mpBack`

---

## Modèles de données

### `recipe`
```js
{
  id, name, emoji,
  type: 'savory' | 'sweet' | null,
  portions, cookTimeMinutes, rating, favorite,
  tags: string[],
  note, url,
  ingredients: [{ id, name, qty, unit }],
  steps: string[],
  createdAt,
}
```

### `meal`
```js
{
  id, weekKey,          // '2026-W35'
  recipeId: string | null,   // null = repas sans recette
  customName: string,        // utilisé si recipeId === null
  persons, done, note, addedAt,
}
```

### `shoppingItem`
```js
{
  id, name, qty, unit,
  categoryId,
  fromRecipeId,   // badge 📅 + compat legacy
  fromMealId,     // rescaling/suppression précis (prioritaire)
  checked, sortOrder, addedAt,
}
```

### `cat`
```js
{ id, name, emoji, kw: string[], order }
```

### `settings`
```js
{ weeksToShow: 0|4|8|13, householdSize: number }
```

---

## Points techniques clés

### Catégorisation
- `categorize(name, cats)` : itère les catégories dans l'ordre et retourne le premier `cat.id` dont un mot-clé correspond
- `matchesKeyword` : normalise via `stemFrName` (minuscules, sans accents, singulier)
- Quand l'utilisateur assigne une catégorie à un ingrédient inconnu (via `MultiCategoryAssignModal`), le nom est automatiquement enregistré comme mot-clé → auto-catégorisation les fois suivantes
- `mergeOrAdd` : fusionne les doublons par nom normalisé, met à jour `categoryId` si le nouvel article en a un valide

### fromMealId vs fromRecipeId
`fromMealId` est prioritaire pour le rescaling et la suppression. `fromRecipeId` est conservé pour la rétrocompatibilité et le badge 📅. Les anciens articles sans `fromMealId` tombent en fallback sur `fromRecipeId`.

### Score recettes (suggestions)
Basé sur les repas **cuisinés** (`meal.done === true`) uniquement — pas la date de planification. Score = semaines depuis la dernière cuisson (max 52 = jamais cuisiné). Le tirage 🎲 est pondéré par ce score.

### Bouton retour Android
`MainActivity.onBackPressed()` appelle `window.__mpBack()` via `evaluateJavascript`. `__mpBack` dépile `_backStack` (tableau de handlers). `useBackHandler(onClose, enabled?)` push/pop dans `_backStack` — utilisé sur toute modale/overlay.

### Flux ajout recette → courses
```
RecipePicker → IngredientFilterModal → [MultiCategoryAssignModal si inconnus] → addIngredientsFromRecipe
```
`multiCatData` stocke les données brutes (pas de closure) pour éviter les appels avec `cats` périmé.

---

## Changelog récent

| Version | Changements |
|---|---|
| **3.0.7** | Fix catégorisation depuis planning : enregistrement du mot-clé à la confirmation |
| **3.0.6** | Fix catégorisation depuis planning : multiCatData données brutes (plus de closure stale) |
| **3.0.5** | Fix catégorisation : handleAdd sans catId · mergeOrAdd préserve catégorie existante |
| **3.0.4** | Score recettes basé sur date de cuisson (✓ coché), pas de planification |
| **3.0.3** | Onglets Salé/Sucré · toggle 🧂🍰 sur chaque carte · classification rapide |
| **3.0.2** | En-têtes catégories courses : fond accentué + bordure gauche |
| **3.0.1** | Fix `updateMealPersons` repas personnalisés |
| **3.0.0** | Ingrédients dans mode cuisine · Filtre tags AND |
| **2.9.6** | Retirer ingrédients de la liste depuis fiche recette |
| **2.9.5** | Corrections code mort · url dans snapshot éditeur |
| **2.9.4** | Badge ingrédients manquants · Timer mode cuisine |
| **2.9.3** | Fix saut de ligne avertissement éditeur · Tap zone étape mode cuisine |
| **2.9.2** | Ajouter à la liste depuis fiche recette · Mode cuisine plein écran |
| **2.9.1** | Fix planningTarget mode rolling · Recherche orphelins |
| **2.9.0** | Repas sans recette · Recherche courses · Navigation semaine depuis WeeksBadge |
| **2.8.0** | Dupliquer → éditeur · Recatégorisation rétroactive · Annuler import · Tags RecipeCard |
| **2.7.x** | Bouton retour Android (bridge JS) · Navigation inter-onglets · fromMealId · deleteRecipe undo |
| **2.6.x** | Mode courses · Notes repas · Suggestions · Bar chart stats · Alerte re-planification |
| **2.5.x** | Import HTML · Fusion unités · Catégorisation auto · Singulier/pluriel |

---

## Build & Release

```bash
npm run build                  # Vite build → dist/
# Copier dist/ dans android/app/src/main/assets/
cd android && ./gradlew assembleRelease
```

Les fichiers à incrémenter avant chaque release :
- `src/App.jsx` : `const VERSION = "X.Y.Z";`
- `package.json` : `"version": "X.Y.Z"`
- `android/app/build.gradle` : `versionCode X` et `versionName "X.Y.Z"`
