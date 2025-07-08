# Encore Architect - Deployment Architecture Guide

## 🏗️ Overview

This document provides a comprehensive guide to the deployment architecture of Encore Architect, a full-stack hospitality management application with AI-powered chat capabilities.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Deployment (Railway)](#backend-deployment-railway)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Deployment Scripts](#deployment-scripts)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

## 🎯 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Vercel)      │───▶│   (Railway)     │───▶│  (PostgreSQL)   │
│   Next.js       │    │   Node.js/Express│    │   (Railway)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────▶│   OpenAI API    │              │
                        │   (External)    │              │
                        └─────────────────┘              │
                                 │                       │
                        ┌─────────────────┐              │
                        │   File Storage  │              │
                        │   (Railway)     │◀─────────────┘
                        └─────────────────┘
```

### Key Components:

- **Frontend**: Next.js application hosted on Vercel
- **Backend**: Node.js/Express API hosted on Railway
- **Database**: PostgreSQL database hosted on Railway
- **AI Integration**: OpenAI API for chat functionality
- **File Storage**: Railway-based file uploads

## 🚂 Backend Deployment (Railway)

### Platform: Railway
- **URL**: `https://web-production-ff93.up.railway.app`
- **Framework**: Node.js with Express
- **Database**: PostgreSQL (Railway-managed)

### Deployment Configuration

#### Railway Setup Files:
- `railway.json` - Railway deployment configuration
- `Procfile` - Process definition for Railway
- `nixpacks.toml` - Build configuration

#### Key Features:
- **Auto-deployment** from GitHub main branch
- **Environment variables** managed through Railway dashboard
- **PostgreSQL database** with automatic backups
- **File upload handling** with Railway's ephemeral storage

### Backend Structure:
```
server/
├── index.js              # Main application entry point
├── database/
│   ├── postgres-init.js   # Database initialization
│   └── adapter.js         # Database adapter layer
├── routes/
│   ├── chat.js           # AI chat endpoints
│   ├── properties.js     # Property management
│   ├── rooms.js          # Room management
│   ├── inventory.js      # Inventory tracking
│   └── import.js         # Data import functionality
├── services/
│   ├── openai.js         # OpenAI integration
│   └── validation.js     # Data validation
└── utils/
    └── logger.js         # Logging utilities
```

### Database Schema:
- **Properties**: Hotel/property information
- **Rooms**: Room details and availability
- **Inventory**: Asset tracking
- **Labor Rules**: Staff scheduling rules
- **Unions**: Labor union information

## 🌐 Frontend Deployment (Vercel)

### Platform: Vercel
- **URL**: `https://encore-architect-frontend-hwt1dgokc-dylans-projects-1d0f909d.vercel.app`
- **Framework**: Next.js 14.0.3
- **Build System**: Vercel's Next.js optimization

### Deployment Configuration

#### Vercel Configuration (`client/vercel.json`):
```json
{
  "version": 2,
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://web-production-ff93.up.railway.app"
  }
}
```

#### Key Features:
- **Static Site Generation (SSG)** for optimal performance
- **Automatic deployments** from GitHub
- **Edge optimization** with Vercel's CDN
- **Environment variable injection**

### Frontend Structure:
```
client/
├── pages/
│   ├── index.tsx         # Landing page
│   ├── admin.tsx         # Admin dashboard
│   ├── chat.tsx          # AI chat interface
│   └── _app.tsx          # App wrapper
├── contexts/
│   └── PropertyContext.tsx # Property state management
├── utils/
│   └── api.ts            # API client utilities
└── styles/
    └── globals.css       # Global styles (Tailwind)
```

### Build Output:
- **Static pages**: All pages pre-rendered for performance
- **Client-side hydration**: Interactive features load dynamically
- **Optimized bundles**: Code splitting and tree shaking applied

## 🗄️ Database Setup

### PostgreSQL on Railway

#### Connection Details:
- **Host**: Managed by Railway
- **Database**: `railway`
- **Connection**: Automatic via Railway's internal networking

#### Schema Management:
- **Migration script**: `server/scripts/migrate-to-postgres.js`
- **Initialization**: `server/database/postgres-init.js`
- **Adapter pattern**: `server/database/adapter.js`

#### Key Tables:
```sql
-- Properties table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    property_code VARCHAR(10) UNIQUE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    room_number VARCHAR(10) NOT NULL,
    room_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available'
);

-- Additional tables for inventory, labor_rules, unions...
```

## ⚙️ Environment Configuration

### Backend Environment Variables (Railway):
```env
# Database (Auto-managed by Railway)
DATABASE_URL=postgresql://...

# OpenAI Integration
OPENAI_API_KEY=sk-...

# Application Settings
NODE_ENV=production
PORT=3000

# File Upload Settings
UPLOAD_PATH=/tmp/uploads
MAX_FILE_SIZE=10485760
```

### Frontend Environment Variables (Vercel):
```env
# API Configuration
NEXT_PUBLIC_API_URL=https://web-production-ff93.up.railway.app

# Build Settings
NODE_ENV=production
```

## 🚀 Deployment Scripts

### Automated Frontend Deployment (`deploy-frontend.sh`):
```bash
#!/bin/bash

echo "🚀 Deploying Encore Architect Frontend..."

# Navigate to client directory
cd client

# Remove any existing Vercel config
rm -rf .vercel

# Create a vercel.json configuration file
cat > vercel.json << 'EOF'
{
  "version": 2,
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://web-production-ff93.up.railway.app"
  }
}
EOF

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
```

### Usage:
```bash
# Make script executable
chmod +x deploy-frontend.sh

# Run deployment
./deploy-frontend.sh
```

## 📊 Monitoring & Maintenance

### Railway Monitoring:
- **Application logs**: Available in Railway dashboard
- **Database metrics**: Connection count, query performance
- **Resource usage**: CPU, memory, network utilization
- **Deployment history**: Track deployments and rollbacks

### Vercel Monitoring:
- **Build logs**: Detailed build process information
- **Performance metrics**: Core Web Vitals, load times
- **Error tracking**: Runtime error monitoring
- **Analytics**: Traffic and usage patterns

### Health Checks:
```bash
# Backend health check
curl https://web-production-ff93.up.railway.app/health

# Frontend availability
curl https://encore-architect-frontend-hwt1dgokc-dylans-projects-1d0f909d.vercel.app
```

## 🔧 Troubleshooting

### Common Issues:

#### 1. Vercel Authentication Error
**Problem**: Frontend shows "Authentication Required" page
**Solution**: 
1. Go to Vercel dashboard
2. Navigate to project settings
3. Disable authentication/protection
4. Redeploy if necessary

#### 2. Database Connection Issues
**Problem**: Backend cannot connect to PostgreSQL
**Solution**:
1. Check Railway database status
2. Verify DATABASE_URL environment variable
3. Restart Railway service
4. Check connection limits

#### 3. API Communication Errors
**Problem**: Frontend cannot reach backend API
**Solution**:
1. Verify NEXT_PUBLIC_API_URL is correct
2. Check CORS settings in backend
3. Ensure Railway backend is running
4. Test API endpoints directly

#### 4. Build Failures
**Problem**: Next.js build fails during deployment
**Solution**:
1. Check for TypeScript errors
2. Verify all dependencies are installed
3. Clear build cache: `rm -rf .next`
4. Test build locally: `npm run build`

### Debugging Commands:
```bash
# Check backend logs
railway logs --follow

# Test API endpoints
curl -X GET https://web-production-ff93.up.railway.app/api/properties

# Local development
npm run dev  # Frontend
npm start    # Backend

# Database connection test
psql $DATABASE_URL -c "SELECT version();"
```

## 🔄 Deployment Workflow

### Automated Deployment Process:

1. **Code Push**: Developer pushes to GitHub main branch
2. **Railway Trigger**: Railway detects changes and starts build
3. **Backend Build**: Node.js application builds and deploys
4. **Database Migration**: Any pending migrations run automatically
5. **Vercel Trigger**: Vercel detects changes and starts build
6. **Frontend Build**: Next.js application builds with optimizations
7. **CDN Distribution**: Static assets distributed to edge locations
8. **Health Checks**: Automated tests verify deployment success

### Manual Deployment:
```bash
# Backend (Railway)
railway up

# Frontend (Vercel)
./deploy-frontend.sh
# or
npx vercel --prod
```

## 🔒 Security Considerations

### Backend Security:
- **Environment variables**: Sensitive data stored securely
- **Database access**: Restricted to Railway internal network
- **API authentication**: Implement as needed for production
- **Input validation**: All user inputs validated and sanitized

### Frontend Security:
- **Environment variables**: Only public variables exposed
- **HTTPS**: All traffic encrypted via Vercel's SSL
- **Content Security Policy**: Implemented for XSS protection
- **API communication**: Secure HTTPS to backend

## 📈 Performance Optimization

### Backend Optimizations:
- **Database indexing**: Optimized queries for common operations
- **Connection pooling**: Efficient database connection management
- **Caching**: Redis or in-memory caching for frequent queries
- **Compression**: Gzip compression for API responses

### Frontend Optimizations:
- **Static generation**: Pre-rendered pages for fast loading
- **Code splitting**: Lazy loading of components
- **Image optimization**: Next.js automatic image optimization
- **CDN delivery**: Global edge caching via Vercel

## 🚀 Future Enhancements

### Planned Improvements:
1. **Redis caching layer** for improved performance
2. **Database read replicas** for scaling
3. **Monitoring dashboard** with custom metrics
4. **Automated testing pipeline** with CI/CD
5. **Blue-green deployment** for zero-downtime updates

---

## 📞 Support

For deployment issues or questions:
1. Check this documentation first
2. Review Railway/Vercel platform logs
3. Test components individually
4. Consult platform-specific documentation

**Last Updated**: January 2025
**Version**: 1.0.0 