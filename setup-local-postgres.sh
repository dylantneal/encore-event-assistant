#!/bin/bash

echo "🏠 Setting up Encore Architect locally with PostgreSQL"
echo "=================================================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "📦 PostgreSQL not found. Installing via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    brew install postgresql@14
    brew services start postgresql@14
    echo "✅ PostgreSQL installed and started"
else
    echo "✅ PostgreSQL is already installed"
    
    # Make sure PostgreSQL is running
    if ! brew services list | grep postgresql | grep started &> /dev/null; then
        echo "🔄 Starting PostgreSQL..."
        brew services start postgresql@14
    fi
fi

echo ""
echo "🗄️ Creating local database..."

# Create database and user
psql postgres -c "DROP DATABASE IF EXISTS encore_architect;"
psql postgres -c "CREATE DATABASE encore_architect;"
psql postgres -c "CREATE USER encore_user WITH PASSWORD 'encore_password';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE encore_architect TO encore_user;"

echo "✅ Database 'encore_architect' created"

echo ""
echo "🔧 Setting up environment variables..."

# Create server/.env file
cat > server/.env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://encore_user:encore_password@localhost:5432/encore_architect

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Client Configuration
CLIENT_URL=http://localhost:3000

# Optional: Logging Level
LOG_LEVEL=info
EOF

echo "✅ Created server/.env file"

echo ""
echo "📦 Installing dependencies..."

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install

echo ""
echo "Installing client dependencies..."
cd ../client
npm install

echo ""
echo "🔄 Running database migration..."
cd ../server

# Run the PostgreSQL migration
node scripts/migrate-to-postgres.js

echo ""
echo "🎯 Testing database connection..."

# Test database connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://encore_user:encore_password@localhost:5432/encore_architect'
});

pool.query('SELECT COUNT(*) FROM properties').then(result => {
  console.log('✅ Database connected successfully');
  console.log('📊 Properties count:', result.rows[0].count);
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"

echo ""
echo "✅ Local PostgreSQL setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   cd $(pwd)/.."
echo "   npm run dev"
echo ""
echo "🌐 Your application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   API Test: http://localhost:3001/api/health"
echo ""
echo "📝 Don't forget to add your OpenAI API key to server/.env!"
echo "   OPENAI_API_KEY=sk-your-actual-key-here" 