#!/bin/bash

# Encore Event Order Assistant - Startup Script

echo "🚀 Starting Encore Event Order Assistant..."

# Check if we're in the project root
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules are installed
if [ ! -d "node_modules" ] || [ ! -d "client/node_modules" ] || [ ! -d "server/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install-all
fi

# Check for .env file in server directory
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: No .env file found in server directory"
    echo "Creating .env file from example..."
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo "✅ Created server/.env - Please add your OPENAI_API_KEY"
    else
        echo "❌ No .env.example found. Creating basic .env file..."
        echo "OPENAI_API_KEY=your_openai_api_key_here" > server/.env
        echo "PORT=3001" >> server/.env
        echo "CLIENT_URL=http://localhost:3000" >> server/.env
        echo "✅ Created server/.env - Please add your OPENAI_API_KEY"
    fi
fi

# Start the application
echo "🎯 Starting both frontend and backend..."
npm run dev 