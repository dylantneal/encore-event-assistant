#!/bin/bash

echo "🏗️ Building Encore Architect Frontend..."

# Navigate to client directory
cd client

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the Next.js application
echo "🔨 Building Next.js application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful!"
    
    # Create a simple server.js file for standalone deployment
    cat > server.js << 'EOF'
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
EOF
    
    echo "📝 Created standalone server.js"
    
else
    echo "❌ Frontend build failed!"
    exit 1
fi 