#!/bin/bash

echo "🔧 Fixing Railway Deployment - Database Migration"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "🔐 Login to Railway (if not already logged in):"
railway login

echo ""
echo "🔗 Linking to your Railway project..."
railway link

echo ""
echo "📊 Current environment variables:"
railway variables

echo ""
echo "🗄️ Checking database connection..."
railway run 'cd server && node -e "
const { Pool } = require(\"pg\");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\"SELECT version()\").then(res => {
  console.log(\"✅ Database connected:\", res.rows[0].version);
  process.exit(0);
}).catch(err => {
  console.error(\"❌ Database connection failed:\", err.message);
  process.exit(1);
});
"'

echo ""
echo "🔄 Running database migration..."
railway run 'cd server && npm install && node scripts/migrate-to-postgres.js'

echo ""
echo "📝 Populating with sample data..."
railway run 'cd server && node scripts/deploy-migration.js'

echo ""
echo "🧪 Testing API endpoints..."
RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url')
echo "Backend URL: $RAILWAY_URL"

curl -s "$RAILWAY_URL/api/health" | jq '.'
echo ""

curl -s "$RAILWAY_URL/api/properties" | jq 'length'
echo "Properties count: ^"

echo ""
echo "✅ Railway deployment fix complete!"
echo ""
echo "🌐 Your backend should now be working at: $RAILWAY_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Test the admin interface at your frontend URL"
echo "   2. Verify all 61 properties are loading"
echo "   3. Check that inventory, rooms, and unions are accessible" 