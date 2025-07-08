# 🚀 Deployment Quick Reference

## 🌐 Live URLs
- **Frontend**: https://encore-architect-frontend-absbibrsl-dylans-projects-1d0f909d.vercel.app
- **Backend**: https://web-production-ff93.up.railway.app

## 🔧 Quick Commands

### Frontend Deployment
```bash
# Automated deployment
./deploy-frontend.sh

# Manual deployment
cd client
npm run build
npx vercel --prod
```

### Backend Deployment
```bash
# Railway auto-deploys from GitHub main branch
git push origin main

# Manual deployment
railway up
```

### Health Checks
```bash
# Backend API
curl https://web-production-ff93.up.railway.app/health

# Frontend
curl https://encore-architect-frontend-7vmaezx3z-dylans-projects-1d0f909d.vercel.app
```

## 🔍 Monitoring Dashboards
- **Railway**: https://railway.app/dashboard
- **Vercel**: https://vercel.com/dashboard

## 🛠️ Common Fixes

### Vercel Authentication Issue
1. Go to Vercel dashboard
2. Project Settings → General → Protection
3. Disable authentication

### Database Connection Issues
1. Check Railway database status
2. Verify DATABASE_URL in Railway dashboard
3. Restart Railway service

### API Communication Problems
1. Verify NEXT_PUBLIC_API_URL in Vercel
2. Check CORS settings in backend
3. Test API endpoints directly

## 📁 Key Files
- `deploy-frontend.sh` - Automated frontend deployment
- `client/vercel.json` - Vercel configuration
- `railway.json` - Railway configuration
- `server/database/postgres-init.js` - Database setup

## 🏗️ Architecture
```
Frontend (Vercel) → Backend (Railway) → Database (PostgreSQL)
     ↓                    ↓
OpenAI API         File Storage
```

## 🔐 Environment Variables

### Backend (Railway)
- `DATABASE_URL` - PostgreSQL connection
- `OPENAI_API_KEY` - AI chat functionality
- `NODE_ENV=production`

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

---
*For detailed information, see [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md)* 