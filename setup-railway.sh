#!/bin/bash

# 🚀 Encore Architect - Railway PostgreSQL Setup Script

echo "🎯 Setting up PostgreSQL on Railway for Encore Architect..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
else
    echo "✅ Railway CLI already installed"
fi

echo ""
echo "🔐 Please login to Railway (this will open your browser):"
railway login

echo ""
echo "🆕 Creating new Railway project..."
echo "   Choose 'Empty Project' when prompted"
railway new

echo ""
echo "🗄️ Adding PostgreSQL database..."
railway add postgresql

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 10

echo ""
echo "🔍 Getting database connection details..."
echo "📋 Your DATABASE_URL will be shown below:"
echo ""
railway variables

echo ""
echo "📝 Next steps:"
echo "   1. Copy the DATABASE_URL from above"
echo "   2. Add it to your server/.env file:"
echo "      DATABASE_URL=postgresql://username:password@host:port/database"
echo "   3. Run the migration:"
echo "      cd server && npm run setup-postgres"
echo ""
echo "🎉 Railway setup complete!"
echo ""
echo "💡 Pro tip: You can also set the DATABASE_URL directly with:"
echo "   railway variables set DATABASE_URL=\"your_url_here\"" 