#!/bin/bash

# Script pour appliquer les migrations Supabase

echo "🚀 Application des migrations Supabase..."

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables d'environnement
DB_URL="postgresql://postgres:VidGenie2024!@db.elsrrybullbvyjhkyuzr.supabase.co:5432/postgres"

# Fonction pour exécuter une migration
run_migration() {
    local file=$1
    local name=$2
    
    echo -e "${GREEN}📝 Application: $name${NC}"
    
    psql "$DB_URL" -f "$file" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $name appliquée avec succès${NC}"
    else
        echo -e "${RED}❌ Erreur lors de l'application de $name${NC}"
        exit 1
    fi
    
    echo ""
}

# Vérifier que psql est installé
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql n'est pas installé. Installation requise:${NC}"
    echo "brew install postgresql"
    exit 1
fi

# Appliquer les migrations dans l'ordre
echo "📋 Migrations à appliquer:"
echo "1. Enable RLS (Row Level Security)"
echo "2. Functions & Triggers"
echo "3. Storage Buckets"
echo "4. Realtime & Analytics"
echo ""

# Demander confirmation
read -p "Voulez-vous continuer? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Annulé."
    exit 0
fi

echo ""

# Exécuter les migrations
run_migration "supabase/migrations/001_enable_rls.sql" "Row Level Security"
run_migration "supabase/migrations/002_functions_triggers.sql" "Functions & Triggers"
run_migration "supabase/migrations/003_storage_buckets.sql" "Storage Buckets"
run_migration "supabase/migrations/004_realtime.sql" "Realtime & Analytics"

echo -e "${GREEN}🎉 Toutes les migrations ont été appliquées avec succès!${NC}"
echo ""
echo "📊 Configuration Supabase complète:"
echo "  ✅ Row Level Security activée"
echo "  ✅ Politiques de sécurité créées"
echo "  ✅ Fonctions et triggers installés"
echo "  ✅ Buckets de stockage configurés"
echo "  ✅ Realtime activé pour les jobs"
echo "  ✅ Vues analytics créées"
echo "  ✅ Index de performance ajoutés"