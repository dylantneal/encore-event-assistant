#!/bin/bash

echo "🚀 Deploying Encore Architect Frontend..."

# Navigate to client directory
cd client

# Remove any existing Vercel config
rm -rf .vercel

# Create a vercel.json configuration file
cat > vercel.json << 'EOF'
{
  "name": "encore-architect-frontend",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://web-production-ff93.up.railway.app"
  }
}
EOF

echo "✅ Created vercel.json configuration"

# Build the project locally first
echo "🔨 Building Next.js application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    npx vercel --prod --yes --name encore-architect-frontend
    
    if [ $? -eq 0 ]; then
        echo "🎉 Frontend deployed successfully!"
        echo "🌐 Your frontend should be available at: https://encore-architect-frontend.vercel.app"
        echo "🔗 Backend API: https://web-production-ff93.up.railway.app"
    else
        echo "❌ Deployment failed!"
    fi
else
    echo "❌ Build failed!"
fi 