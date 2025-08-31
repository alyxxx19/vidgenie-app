#!/bin/bash

# 🔐 Google OAuth 2.0 Setup Script for VidGenie
# This script helps you configure Google OAuth 2.0 integration

set -e

echo "🚀 Google OAuth 2.0 Setup for VidGenie"
echo "======================================"

# Check if required commands exist
command -v openssl >/dev/null 2>&1 || { echo "❌ openssl is required but not installed. Aborting." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local from .env.example..."
    cp .env.example .env.local
fi

echo ""
echo "🔑 Generating secure JWT secrets..."

# Generate JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo "✅ JWT secrets generated successfully"

# Update .env.local with generated secrets
if grep -q "JWT_SECRET=" .env.local; then
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=\"$JWT_SECRET\"/" .env.local
else
    echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env.local
fi

if grep -q "NEXTAUTH_SECRET=" .env.local; then
    sed -i.bak "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"/" .env.local
else
    echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"" >> .env.local
fi

echo ""
echo "📋 Next steps:"
echo ""
echo "1. 🔧 Configure Google Cloud Platform:"
echo "   - Visit: https://console.cloud.google.com"
echo "   - Create a project or select existing"
echo "   - Enable Google+ API and OAuth2 API"
echo "   - Configure OAuth Consent Screen"
echo "   - Create OAuth 2.0 credentials"
echo "   - Add redirect URI: http://localhost:3000/api/auth/google/callback"
echo ""
echo "2. 📝 Update .env.local with your Google credentials:"
echo "   GOOGLE_CLIENT_ID=\"your-client-id.apps.googleusercontent.com\""
echo "   GOOGLE_CLIENT_SECRET=\"GOCSPX-your-client-secret\""
echo ""
echo "3. 🗄️ Apply database migration:"
echo "   npm run supabase:start"
echo "   npm run supabase:migrate"
echo ""
echo "4. 🧪 Test the integration:"
echo "   npm run dev"
echo "   Visit: http://localhost:3000/auth/signin"
echo "   Click: 'Continuer avec Google'"
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   - docs/google-oauth-setup.md (GCP configuration)"
echo "   - docs/google-oauth.md (technical documentation)"
echo ""
echo "✅ JWT secrets configured in .env.local"
echo "🔧 Please complete Google Cloud Platform configuration"
echo ""
echo "🎉 Google OAuth 2.0 setup initiated successfully!"