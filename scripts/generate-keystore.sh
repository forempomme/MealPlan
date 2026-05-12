#!/bin/bash
# ══════════════════════════════════════════════════════════
#  Génération du keystore Meal Plan
#  À exécuter UNE SEULE FOIS sur votre machine locale.
#  Conservez soigneusement les mots de passe générés !
# ══════════════════════════════════════════════════════════

set -e

KEYSTORE_FILE="meal-plan.keystore"
KEY_ALIAS="meal-plan"

# Génère des mots de passe aléatoires sécurisés
STORE_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
KEY_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

echo "════════════════════════════════════════"
echo " 🔑 Génération du keystore Meal Plan"
echo "════════════════════════════════════════"
echo ""

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass  "$KEY_PASS" \
  -dname "CN=Meal Plan, OU=Mobile, O=MealPlanApp, L=France, S=France, C=FR"

echo ""
echo "✅ Keystore créé : $KEYSTORE_FILE"
echo "══════════════════════════════════════════════════════"
echo ""
echo "▶ Ajoutez ces 4 secrets dans GitHub :"
echo "  Settings → Secrets and variables → Actions → New secret"
echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│ Secret name      │ Valeur                           │"
echo "├─────────────────────────────────────────────────────┤"

echo "│ KEYSTORE_BASE64  │ (voir ci-dessous)                │"
echo "│ KEYSTORE_PASSWORD│ $STORE_PASS"
echo "│ KEY_ALIAS        │ $KEY_ALIAS"
echo "│ KEY_PASSWORD     │ $KEY_PASS"
echo "└─────────────────────────────────────────────────────┘"
echo ""
echo "── KEYSTORE_BASE64 (copiez tout ce qui suit) ──────────"
base64 -w 0 "$KEYSTORE_FILE"
echo ""
echo "───────────────────────────────────────────────────────"
echo ""
echo "⚠️  Sauvegardez ces informations en lieu sûr !"
echo "    Sans le keystore, vous ne pourrez pas mettre à jour"
echo "    l'application sur les appareils existants."
echo ""

# Sauvegarde locale des infos (chiffré avec le mot de passe)
cat > meal-plan-keystore-info.txt << INFO
Meal Plan - Informations Keystore
Date : $(date)
Fichier : $KEYSTORE_FILE
Alias : $KEY_ALIAS
KEYSTORE_PASSWORD : $STORE_PASS
KEY_PASSWORD : $KEY_PASS
INFO

echo "📄 Infos sauvegardées dans meal-plan-keystore-info.txt"
echo "   (conservez ce fichier hors du dépôt Git !)"
