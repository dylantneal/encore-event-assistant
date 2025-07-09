#!/bin/bash

echo "🚀 Starting Encore Architect Development Environment"
echo "================================================="
echo ""

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "🔄 Starting PostgreSQL..."
    brew services start postgresql@14
    sleep 2
fi

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "❌ No server/.env file found!"
    echo "Please run ./setup-local-postgres.sh first"
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" server/.env; then
    echo "❌ DATABASE_URL not found in server/.env"
    echo "Please run ./setup-local-postgres.sh first"
    exit 1
fi

echo "✅ Environment checks passed"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
cd server
node -e "
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT COUNT(*) FROM properties').then(result => {
  console.log('✅ Database connected - Properties:', result.rows[0].count);
  pool.end();
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  console.log('💡 Try running: ./setup-local-postgres.sh');
  process.exit(1);
});
" || exit 1

cd ..

echo ""
echo "🌟 Starting development servers..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers
npm run dev 