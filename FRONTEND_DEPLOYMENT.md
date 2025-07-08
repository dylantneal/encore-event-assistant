# Frontend Deployment Guide

## Option 1: Vercel (Recommended)

Vercel is specifically designed for Next.js applications and will provide the best performance.

### Steps:

1. **Navigate to client directory:**
   ```bash
   cd client
   ```

2. **Deploy to Vercel:**
   ```bash
   npx vercel --prod
   ```

3. **Follow the prompts:**
   - Set up and deploy? → **Y**
   - Which scope? → Choose your account
   - Link to existing project? → **N** (create new)
   - Project name? → **encore-architect-frontend** (or your choice)
   - Directory? → **./client** (should auto-detect)
   - Override settings? → **N** (use defaults)

4. **Set environment variables in Vercel dashboard:**
   - Go to vercel.com/dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://web-production-ff93.up.railway.app`

### Result:
- Frontend will be available at: `https://your-project-name.vercel.app`
- Automatic deployments on git push
- Optimized for Next.js performance

---

## Option 2: Railway (Alternative)

If you prefer to keep everything on Railway:

### Steps:

1. **Navigate to client directory:**
   ```bash
   cd client
   ```

2. **Create new Railway service:**
   ```bash
   npx railway add --service frontend
   ```

3. **Deploy:**
   ```bash
   npx railway up
   ```

4. **Set environment variables:**
   ```bash
   npx railway variables set NEXT_PUBLIC_API_URL=https://web-production-ff93.up.railway.app
   ```

---

## Option 3: Netlify

### Steps:

1. **Build the project:**
   ```bash
   cd client
   npm run build
   ```

2. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod --dir=.next
   ```

---

## Current Backend Status

✅ **Backend is fully deployed and working:**
- URL: https://web-production-ff93.up.railway.app
- API: https://web-production-ff93.up.railway.app/api/properties
- Database: PostgreSQL with 61 Chicago hotel properties

The frontend is configured to automatically connect to this backend in production.

---

## Testing After Deployment

Once deployed, test these key features:
1. **Property Selection**: Choose a hotel from the list
2. **Chat Interface**: Navigate to /chat and test AI assistant
3. **Admin Panel**: Navigate to /admin for property management
4. **API Integration**: Verify all data loads correctly

---

## Troubleshooting

If you encounter issues:
1. Check environment variables are set correctly
2. Verify the API URL is accessible
3. Check browser console for any errors
4. Ensure the backend is running at the specified URL 