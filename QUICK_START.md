# 🚀 Quick Start Guide - Encore Architect

## ✅ Prerequisites
- Node.js 18+ installed
- npm installed
- OpenAI API key

## 🎯 Quick Setup (3 Steps)

### 1️⃣ Install Dependencies
From the project root directory (FlightDeck2):
```bash
npm run install-all
```

### 2️⃣ Configure OpenAI API Key
Create a `.env` file in the `server` directory with this exact content:
```env
# OpenAI API Configuration
OPENAI_API_KEY=your_actual_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Client Configuration
CLIENT_URL=http://localhost:3000

# Optional: Database Configuration (defaults to local SQLite)
# DATABASE_PATH=./data/encore.db

# Optional: Logging Level
# LOG_LEVEL=info
```

**Quick command to create the file:**
```bash
cat > server/.env << 'EOF'
OPENAI_API_KEY=your_actual_api_key_here
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
EOF
```

Then edit `server/.env` and replace `your_actual_api_key_here` with your real OpenAI API key.

### 3️⃣ Start the Application
From the project root directory:
```bash
npm run dev
```

Or use the provided script:
```bash
./start.sh
```

## 🌐 Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

## ⚠️ Common Issues & Fixes

### Issue: "no such file or directory: ../client"
**Fix**: You're already in the project root. Use:
```bash
cd client && npm run dev  # For client only
cd server && npm run dev  # For server only
npm run dev              # For both (recommended)
```

### Issue: "Cannot find module 'openai'"
**Fix**: Dependencies not installed. Run:
```bash
npm run install-all
```

### Issue: "OpenAI API error" or "503 Service Unavailable"
**Fix**: Add your API key to `server/.env`:
```bash
OPENAI_API_KEY=sk-...your-key-here...
```

### Issue: "Port already in use"
**Fix**: Kill existing processes:
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001
# Then kill the process with: taskkill /PID <process_id> /F
```

### Issue: "CORS error" or "Network error"
**Fix**: Ensure both frontend and backend are running:
- Backend should be on http://localhost:3001
- Frontend should be on http://localhost:3000

## 📁 Project Structure
```
FlightDeck2/
├── client/          # Frontend (Next.js)
├── server/          # Backend (Express)
├── package.json     # Root package with scripts
└── start.sh         # Startup script
```

## 🎮 Development Commands
From the project root:
- `npm run dev` - Start both frontend and backend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run install-all` - Install all dependencies

## 🔧 Manual Start (if scripts fail)
Terminal 1 - Backend:
```bash
cd server
npm install
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm install
npm run dev
```

## 📝 First Steps After Setup
1. Open http://localhost:3000
2. Select a property from the dropdown (e.g., "InterContinental Chicago")
3. Toggle to "Admin" mode
4. Go to "Inventory Import" tab
5. Upload inventory Excel/CSV file
6. Switch back to "Sales Manager" mode
7. Click "Start AI Assistant"
8. Try: "I need audio and video for 100 people in the Grand Ballroom"

## 🧪 Test Your Setup
1. **Backend Health Check**: Visit http://localhost:3001/api/health
   - Should return: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

2. **Frontend Check**: Visit http://localhost:3000
   - Should show property selection dropdown with 61 Chicago properties

3. **AI Check**: In chat, type "Hello"
   - Should get a response (if OpenAI key is configured)

## 📋 Environment Variables Reference
```env
# Required
OPENAI_API_KEY=sk-...          # Your OpenAI API key

# Optional (with defaults)
PORT=3001                      # Backend port (default: 3001)
CLIENT_URL=http://localhost:3000  # Frontend URL (default: http://localhost:3000)
NODE_ENV=development           # Environment (development/production)
DATABASE_PATH=./data/encore.db # SQLite database path
LOG_LEVEL=info                # Logging level (error/warn/info/debug)
``` 