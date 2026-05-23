# 🍽 Meal Plan

Application mobile de **planification de repas hebdomadaire**, conçue pour simplifier l'organisation de votre cuisine au quotidien. Planifiez vos semaines, gérez votre bibliothèque de recettes, filtrez vos courses à l'ajout et suivez vos habitudes culinaires.

Version actuelle : **2.5.0**

---

## ✨ Fonctionnalités

### 📅 Planning
- Navigation **multi-années 2024 → 2050** : flèches ‹ › + raccourcis directs (2030, 2035, 2040, 2045, 2050)
- Vue des **52/53 semaines ISO** de l'année sélectionnée, ordre chronologique
- La semaine en cours est mise en évidence (fond bleu ciel, badge *EN COURS*)
- Scroll automatique vers la semaine courante à l'ouverture ou au changement d'année
- Bouton flottant **"📅 Semaine en cours"** — visible dès que la semaine sort de l'écran
- **Ajout multiple** de repas en une seule fois avec cases à cocher
- **Filtre d'ingrédients à l'ajout** : dialog avant ajout aux courses — coche/décoche par article ou catégorie entière. Si un ingrédient n'a pas de catégorie reconnue, un modal propose d'en assigner une ou d'en créer une nouvelle
- Ajustement du nombre de personnes par repas (±) avec **rescale automatique** des ingrédients dans la liste de courses
- **Ouverture de la fiche recette** depuis un repas planifié (tap sur le nom)
- Marquage d'un repas comme **cuisiné** ✓
- Suppression d'un repas avec cascade automatique sur la liste de courses
- **Duplication** d'une semaine entière vers une autre
- Partage du menu de la semaine (texte natif Android)
- Onglet **planning affiché à l'ouverture** par défaut (configurable)

### 📖 Recettes
- Bibliothèque de recettes avec grille compacte (emoji · nom · portions · temps · badge de fréquence)
- **Import natif Android** (OkHttp + Jsoup, sans CORS) depuis n'importe quel site de cuisine :
  - Jow → appel direct API `api.jow.fr/public/recipe/{id}`
  - Autres sites → JSON-LD (`<script type="application/ld+json">`) — descente récursive 10 niveaux dans `@graph`
  - Fallback `__NEXT_DATA__` (sites Next.js : Marmiton, 750g…) — descente 12 niveaux
  - Fallback Microdata (`[itemtype*=schema.org/Recipe]`)
- En version web : fallback **Claude API** (web_search tool)
- Fallback **copier-coller** si le site est inaccessible
- **Détection de doublon** à l'import : si une recette avec la même URL ou le même nom existe déjà, un bandeau d'alerte propose de mettre à jour l'existante ou de créer une nouvelle entrée
- Import calculé pour **6 personnes par défaut** avec mise à l'échelle automatique des quantités
- **Stepper de portions** dans l'éditeur : ±1 recalcule toutes les quantités en temps réel depuis une base de référence cohérente
- Fiche détail avec ajustement dynamique des portions
- Étapes de préparation **cochables** pendant la cuisine
- Bouton **"📅 Affecter"** → planning avec dialog de filtre des ingrédients (même flow que depuis le planning)
- Bouton **"📤 Partager"** (texte natif Android)
- **Filtrage** par favoris et **multi-sélection de tags** avec champ de recherche libre
- Suppression directe depuis la carte, avec confirmation
- Éditeur complet : saisie emoji libre, nom, portions, temps, tags, note, URL source, ingrédients et étapes dynamiques, notation ★, favori

### 🛒 Liste de courses
- **Dialog de sélection** avant chaque ajout au planning : tous les ingrédients sont cochés par défaut, groupés par catégorie. Cases de sélection par catégorie entière (état intermédiaire –). 3 actions : *Annuler* / *Ignorer les courses* / *Ajouter X ✓*
- **Catégorisation intelligente** par mots-clés avec matching par limite de mot (évite les faux positifs comme "sel" dans "vaisselle")
- Si un ingrédient ne correspond à aucun mot-clé : modal de catégorisation manuelle (catégorie existante ou création inline)
- **Multi-catégorisation** pour les ajouts depuis le planning : un seul modal regroupe tous les ingrédients non reconnus, avec assignation par article ou en lot
- Articles regroupés par **catégorie** dans l'ordre des rayons configuré
- **Champ d'ajout manuel sticky** en haut de liste (toujours visible au scroll)
- **Ajout manuel** rapide (nom + quantité + unité) — si aucun mot-clé ne correspond, modal de catégorisation
- **Édition inline** d'un article : nom, quantité, unité et **changement de catégorie**
- **Supprimer tous les articles d'une catégorie** en un tap (bouton ✓ dans l'en-tête) avec snackbar Annuler
- **Drag & drop** des catégories et des articles (desktop/web) — remplacé par boutons ▲▼ sur mobile
- **Auto-scroll** pendant le drag
- Suppression par tap sur le cercle ✓ avec **snackbar Annuler** (3,5s)
- **Confirmation** avant "Tout vider"
- Filet de sécurité : les articles sans catégorie valide apparaissent dans une section "⚠️ Non catégorisé"
- Badge sur l'icône de navigation indiquant le nombre d'articles
- Partage de la liste complète par catégorie
- Menu : vider les cochés / tout vider (avec confirmation)

### 📊 Statistiques
- **3 KPIs** : recettes (dont N ⭐), repas planifiés (total portions), semaines actives
- **Heatmap** des 12 dernières semaines : intensité colorée selon le nombre de repas
- **Recette la plus cuisinée** enrichie : étoiles, occurrences, total portions, date dernier repas, tags
- **Top 5** des recettes avec barre de progression
- **Répartition par type de plat** : barres horizontales triées par fréquence
- **Recettes jamais planifiées** : liste avec tag principal et badge favori

### ⚙️ Options
- **Édition des catégories** : emoji libre, nom, mots-clés de détection (séparés par virgule ou retour à la ligne)
- **Création** de nouvelles catégories
- **Ordre des rayons** : réorganisation des catégories par ▲▼ ou drag depuis l'onglet Options — l'ordre s'applique automatiquement dans la liste de courses (même ordre réglable depuis la liste elle-même)
- **Export JSON** de toutes les données
- **Import JSON** pour restaurer une sauvegarde
- Section À propos avec numéro de version et historique

---

## 🎨 Interface

### Thème "Acier Nocturne"
Palette sombre à base de bleu-acier froid — fond `#0D1117`, cartes `#161B22`, accent `#6E9EF5`.

### Header & Navigation
- **Header** : dégradé `#0F2137 → #1A3A6C`, titre blanc **22px** fontWeight 800
- **Nav bas** : dégradé `#152E52 → #0F2137`, hauteur **70px**, icônes **26px**, labels **13px**
- Scroll automatique en haut à chaque changement d'onglet

### Tailles de police — Liste de courses
| Élément | Taille |
|---|---|
| En-tête catégorie | 14px |
| Nom d'article | 13px |
| Quantité | 13px (blanc) |

---

## 🛠 Stack technique

### Application web
| Technologie | Rôle |
|---|---|
| **React 18** | Framework UI — composants fonctionnels, hooks |
| **Vite 5** | Bundler, format IIFE + patch `defer` pour WebView `file://` |
| **Context API** | État global (recettes, repas, courses, catégories) |
| **Inline styles** | Système de thème via constante palette `C` |
| **HTML5 Drag & Drop API** | Réorganisation des catégories et articles (desktop) |
| **CSS keyframes** | Animations natives |
| **Anthropic API (Claude Sonnet)** | Import de recettes — fallback web si bridge Android absent |
| **Google Fonts (Outfit)** | Typographie |

### Android natif
| Technologie | Rôle |
|---|---|
| **Android WebView** | Conteneur de l'application web |
| **AppCompatActivity** | Activité principale |
| **@JavascriptInterface** | Bridge async JS↔Java (`importRecipe`, `share`) |
| **OkHttp 4.12** | Client HTTP natif — pas de CORS |
| **Jsoup 1.17.2** | Parser HTML — extraction JSON-LD, __NEXT_DATA__, Microdata |
| **RecipeImporter.java** | Pipeline d'import |
| **Java 17** | Langage natif |
| **Gradle 8.7 / AGP 8.3** | Build system |
| **minSdk 23** | Android 6.0+ |
| **targetSdk 34** | Android 14 |
| **PKCS12 Keystore** | Signature APK |

### CI/CD
| Technologie | Rôle |
|---|---|
| **GitHub Actions** | Pipeline cloud — déclenchement manuel |
| **actions/setup-node@v4.4.0** | Node.js 22 |
| **actions/setup-java@v4.7.1** | JDK Temurin 17 |
| **gradle/actions/setup-gradle@v4** | Gradle 8.7 |
| **Vite build + sed patch** | Supprime `type="module"` → `defer` pour WebView |
| **GitHub Secrets** | Keystore base64 + mots de passe |
| **actions/upload-artifact@v4.6.2** | APK versionné `Meal-Plan-vX.X.X.apk` (90 jours) |

---

## 🔧 Particularités techniques

### Persistance des données
Les données sont sauvegardées dans `localStorage` de la WebView Android avec un fallback mémoire (`_mem`) pour fonctionner aussi dans un contexte web (artefact Claude, navigateur). Chaque tranche de state (`mp_recipes`, `mp_meals`, `mp_shopping`, `mp_cats`, `mp_settings`) est sauvegardée automatiquement via `useEffect`.

### Catégorisation des ingrédients
La fonction `matchesKeyword(name, kw)` utilise des lookbehind/lookahead négatifs regex pour éviter les faux positifs (ex : "sel" ne matche pas dans "vaisselle"). Les mots-clés sont normalisés en minuscules et peuvent être saisis séparés par virgule ou retour à la ligne.

### WebView + `file://` — fix ES modules
```bash
sed -i 's/type="module" crossorigin/defer/g' dist/index.html
```

### Import de recettes
| Contexte | Mécanisme |
|---|---|
| APK Android | `window.Android.importRecipe(url, cbId)` → `RecipeImporter.java` |
| Version web | `fetchViaClaude(url)` → Claude API avec web_search tool |

### Stepper de portions
`portionsBaseRef` mémorise les quantités de référence. Toute édition manuelle d'une quantité recalibre la base entière (portions courantes + toutes les quantités actuelles) pour garantir la cohérence des scalings suivants.

---

## 📦 Versioning

Format : `MAJEUR.MINEUR.PATCH`

| Incrément | Quand |
|---|---|
| `+0.0.1` | Correction de bug |
| `+0.1.0` | Nouvelle fonctionnalité |
| `+1.0.0` | Refonte majeure |

`versionCode` Android : `MAJEUR × 100 + MINEUR × 10 + PATCH` *(ex : 2.5.0 → 250)*

### Historique
| Version | Nouveautés |
|---|---|
| 1.8.0 | Planning annuel, compacité, multi-ajout de repas |
| 1.9.0 | Import de recettes depuis les sites web |
| 2.0.0 | IngredientParser, EmojiGuesser, API Jow, fallback texte |
| 2.1.0 | Édition catégories, Export/Import JSON, Stats enrichies |
| 2.1.0+ | Navigation multi-années, filtre ingrédients, import natif Android |
| 2.2.0 | Persistance localStorage + fallback mémoire, emoji libre partout |
| 2.3.0 | Stepper portions avec base de référence, multi-select tags, filtre ingrédients depuis fiche recette, portions par défaut 6 |
| 2.4.0 | Catégorisation par limite de mot, CategoryAssignModal, MultiCategoryAssignModal, détection doublon import, ordre des rayons (Options + liste de courses) |
| 2.5.0 | Ouvrir recette depuis planning, déplacer article entre catégories, confirmation "Tout vider", scroll en haut au changement d'onglet, champ ajout sticky, tout supprimer par catégorie, corrections diverses |

---

## 🗂 Structure du projet

```
meal-plan/
├── src/
│   ├── App.jsx               ← Application React (~3 600 lignes)
│   └── main.jsx              ← Point d'entrée ReactDOM
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/                    ← Rempli par le build Vite (CI)
│   │   │   ├── java/com/mealplan/app/
│   │   │   │   ├── MainActivity.java      ← WebView + bridge JS async
│   │   │   │   └── RecipeImporter.java    ← Pipeline import (OkHttp + Jsoup)
│   │   │   └── res/
│   │   │       ├── mipmap-*/              ← Icônes (mdpi → xxxhdpi)
│   │   │       └── values/
│   │   │           ├── themes.xml
│   │   │           └── strings.xml
│   │   └── build.gradle
│   └── build.gradle
├── .github/workflows/
│   └── build.yml             ← CI/CD manuel, patch defer, APK versionné
├── public/
│   └── icon.png
├── index.html
├── vite.config.js
└── package.json
```

---

## 🚀 Lancer un build

1. Aller sur GitHub → onglet **Actions**
2. Cliquer sur **🍽 Build Meal Plan APK**
3. Cliquer sur **Run workflow**
4. Une fois terminé → **Artifacts** → télécharger `Meal-Plan-vX.X.X`
5. Installer l'APK sur Android (*Paramètres → Sources inconnues*)

---

## 🔄 Mettre à jour l'application

1. Modifier `src/App.jsx`
2. Incrémenter `version` dans `package.json` ET `versionCode`/`versionName` dans `android/app/build.gradle`
3. Committer et pousser → lancer le build manuellement
4. Installer le nouvel APK par-dessus l'ancien (**pas de désinstallation** grâce au keystore)

---

## ⚠️ Points importants

- **Ne jamais committer** `.keystore` ni `GITHUB_SECRETS.txt`
- **Sauvegarder le keystore** : sans lui, impossible de mettre à jour l'app sans désinstaller
- L'import de recettes depuis les sites nécessite une connexion internet
- Les données survivent aux mises à jour tant que l'app n'est pas désinstallée
- `versionCode` à incrémenter à chaque build installé (`250` pour la 2.5.0)
