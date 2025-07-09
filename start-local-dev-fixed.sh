#!/bin/bash

echo "🚀 Starting Encore Architect (Fixed Version)"
echo "============================================="
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null
pkill -f "nodemon" 2>/dev/null  
pkill -f "concurrently" 2>/dev/null
pkill -f "node index.js" 2>/dev/null
sleep 2

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "🔄 Starting PostgreSQL..."
    brew services start postgresql@14
    sleep 2
fi

# Check environment
if [ ! -f "server/.env" ]; then
    echo "❌ No server/.env file found!"
    echo "Please run ./setup-local-postgres.sh first"
    exit 1
fi

echo "✅ Environment checks passed"
echo ""

# Start backend first
echo "🌟 Starting backend server..."
cd server
node index.js &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
for i in {1..10}; do
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo "✅ Backend started successfully"
        break
    fi
    sleep 1
done

# Test backend
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Backend health check passed"
    PROPERTIES=$(curl -s http://localhost:3001/api/properties | jq -r 'length' 2>/dev/null)
    echo "📊 Properties loaded: $PROPERTIES"
else
    echo "❌ Backend failed to start properly"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""

# Start frontend
echo "🌟 Starting frontend server..."
cd client

# Find available port for frontend
FRONTEND_PORT=3000
for port in 3000 3002 3003 3004; do
    if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        FRONTEND_PORT=$port
        break
    fi
done

if [ $FRONTEND_PORT -ne 3000 ]; then
    echo "⚠️  Port 3000 in use, using port $FRONTEND_PORT"
fi

# Start Next.js
npx next dev -p $FRONTEND_PORT &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
for i in {1..15}; do
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
        echo "✅ Frontend started successfully on port $FRONTEND_PORT"
        break
    fi
    sleep 1
done

cd ..

echo ""
echo "🎉 Application Started Successfully!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo "   Backend:  http://localhost:3001"
echo "   Admin:    http://localhost:$FRONTEND_PORT/admin"
echo "   Chat:     http://localhost:$FRONTEND_PORT/chat"
echo ""
echo "📊 Quick Status:"
echo "   Properties: $PROPERTIES hotels available"
echo "   Database: PostgreSQL"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" INT
wait 