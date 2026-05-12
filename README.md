# 🍽 Meal Plan — Build Android APK

Application de planification de repas hebdomadaire.  
Version actuelle : **2.1.0**

---

## 📁 Structure du projet

```
meal-plan/
├── src/
│   ├── App.jsx          ← Application React principale
│   └── main.jsx         ← Point d'entrée React
├── android/             ← Projet Android natif (WebView)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/        ← Rempli automatiquement par le build
│   │   │   ├── java/.../MainActivity.java
│   │   │   └── res/mipmap-*/  ← Icônes à toutes les densités
│   │   └── build.gradle
│   └── build.gradle
├── .github/workflows/build.yml ← Pipeline CI/CD
├── scripts/generate-keystore.sh
├── index.html
├── vite.config.js
└── package.json
```

---

## 🚀 Mise en place (à faire une seule fois)

### 1. Prérequis locaux
- [Git](https://git-scm.com/)
- [Node.js 20+](https://nodejs.org/)
- [Java JDK 17+](https://adoptium.net/) (pour générer le keystore)

### 2. Créer le dépôt GitHub
1. Créez un nouveau dépôt sur GitHub (ex: `meal-plan`)
2. Clonez-le et copiez tous ces fichiers dedans
3. Committez et pushez :
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Meal Plan v2.1.0"
   git remote add origin https://github.com/VOTRE_NOM/meal-plan.git
   git push -u origin main
   ```

### 3. Générer le keystore (signature de l'APK)
> ⚠️ À faire **une seule fois**. Sans ce keystore, vous ne pourrez pas
> mettre à jour l'app sans la désinstaller.

```bash
chmod +x scripts/generate-keystore.sh
./scripts/generate-keystore.sh
```

Le script génère le keystore et affiche les 4 valeurs à copier.

### 4. Ajouter les secrets GitHub
Dans votre dépôt GitHub :
**Settings → Secrets and variables → Actions → New repository secret**

| Nom du secret      | Valeur                                    |
|--------------------|-------------------------------------------|
| `KEYSTORE_BASE64`  | Contenu base64 du fichier .keystore        |
| `KEYSTORE_PASSWORD`| Mot de passe du keystore (affiché par le script) |
| `KEY_ALIAS`        | `meal-plan`                               |
| `KEY_PASSWORD`     | Mot de passe de la clé (affiché par le script)   |

---

## ⚙️ Build automatique

Chaque **push sur `main`** déclenche automatiquement le build.  
Vous pouvez aussi déclencher manuellement :  
**Actions → 🍽 Build Meal Plan APK → Run workflow**

### Télécharger l'APK
1. Onglet **Actions** → cliquez sur le dernier run
2. Section **Artifacts** → téléchargez `Meal-Plan-v2.1.0`
3. Le ZIP contient l'APK prêt à installer

### Installer sur Android
1. Transférez l'APK sur votre téléphone
2. Dans les paramètres Android : **Sécurité → Sources inconnues** (activer)
3. Ouvrez le fichier APK pour installer

---

## 🔄 Mettre à jour l'application

1. Modifiez le code dans `src/App.jsx`
2. Incrémentez la version dans `package.json` ET `android/app/build.gradle`  
   (`versionCode` ET `versionName`)
3. Committez et pushez → le build se déclenche automatiquement
4. Installez le nouvel APK par-dessus l'ancien (**pas de désinstallation nécessaire**
   grâce au keystore)

### Convention de numérotation
| package.json | versionName | versionCode |
|---|---|---|
| `2.1.0` | `"2.1.0"` | `210` |
| `2.2.0` | `"2.2.0"` | `220` |
| `3.0.0` | `"3.0.0"` | `300` |

---

## 🛠 Build local (optionnel)

```bash
# Installer les dépendances
npm install

# Build de l'app web
npm run build

# Copier dans Android
cp -r dist/* android/app/src/main/assets/

# Build APK (nécessite Gradle 8.7 et Java 17)
cd android
gradle :app:assembleDebug      # version debug (sans signature)
# ou
gradle :app:assembleRelease \
  -PstoreFile=meal-plan.keystore \
  -PstorePassword=VOTRE_MOT_DE_PASSE \
  -PkeyAlias=meal-plan \
  -PkeyPassword=VOTRE_CLE_MOT_DE_PASSE
```

---

## ⚠️ Points importants

- **Ne committez jamais** le fichier `.keystore` ni `meal-plan-keystore-info.txt`
- **Sauvegardez** votre keystore en lieu sûr (cloud chiffré, disque externe…)
- Si vous perdez le keystore, vous devrez désinstaller l'app sur tous les appareils avant de réinstaller
