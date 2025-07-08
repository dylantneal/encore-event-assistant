#!/bin/bash

echo "🚀 Adding PostgreSQL to your Railway project..."

# Link to your project
echo "📋 Linking to Railway project..."
npx railway link

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
npx railway add --database postgres

# Wait a moment for database to provision
echo "⏳ Waiting for database to provision..."
sleep 10

# Show project info
echo "📊 Project status:"
npx railway status

# Show environment variables
echo "🔧 Environment variables:"
npx railway variables

echo ""
echo "✅ PostgreSQL should now be added to your project!"
echo "🔗 The DATABASE_URL should be automatically available."
echo ""
echo "📝 Next: Add your OPENAI_API_KEY via Railway dashboard or CLI:"
echo "   npx railway variables set OPENAI_API_KEY=your_key_here" 