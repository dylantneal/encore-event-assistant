# 🚀 Deployment Guide - Encore Architect on Railway

## Quick Deploy from GitHub (Recommended)

### Step 1: Deploy from GitHub Repository

1. **In Railway** (you're already here!):
   - Click **"Deploy from GitHub repo"**
   - Connect your GitHub account if needed
   - Select your Encore Architect repository
   - Choose the `main` branch

### Step 2: Add PostgreSQL Database

1. **In your Railway project dashboard**:
   - Click **"+ New"** 
   - Select **"Database"**
   - Choose **"PostgreSQL"**
   - Railway will automatically provision it

### Step 3: Connect Database to Your App

1. **In your web service settings**:
   - Go to **"Settings"** tab
   - Scroll to **"Service Connections"**
   - Click **"Connect"** next to your PostgreSQL database
   - This automatically adds `DATABASE_URL` to your environment

### Step 4: Add Environment Variables

1. **In your web service**:
   - Go to **"Variables"** tab
   - Add these variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

**Note**: `DATABASE_URL` and `PORT` are automatically set by Railway.

### Step 5: Trigger Deployment

1. **Push to GitHub** (if you haven't already):
   ```bash
   git add .
   git commit -m "Deploy to Railway with PostgreSQL"
   git push origin main
   ```

2. **Railway will automatically deploy** when you push to GitHub

### Step 6: Verify Deployment

1. **Check deployment logs** in Railway dashboard
2. **Test your app** using the provided Railway URL
3. **Verify database** by checking if properties load

## 🔗 Sharing with Coworkers

Once deployed, you'll get a Railway URL like:
```
https://your-app-name.up.railway.app
```

Share this URL with your coworkers to test the application!

## 🎯 What Happens During Deployment

1. **Railway clones your GitHub repo**
2. **Installs dependencies** (`npm install` in server directory)
3. **Automatically detects PostgreSQL** (via DATABASE_URL)
4. **Creates database tables** and inserts sample properties
5. **Starts the server** on Railway's infrastructure

## ✅ Verification Checklist

After deployment, verify:

- [ ] App loads at Railway URL
- [ ] All 61 Chicago properties are visible
- [ ] Property selection works
- [ ] Admin panel is accessible
- [ ] Chat functionality works with OpenAI
- [ ] Data persists between app restarts

## 🛠️ Troubleshooting

### Common Issues:

**Build Fails:**
- Check that `package.json` is in the `server` directory
- Verify all dependencies are listed

**Database Connection Error:**
- Ensure PostgreSQL service is connected to your web service
- Check that `DATABASE_URL` is present in environment variables

**OpenAI Not Working:**
- Verify `OPENAI_API_KEY` is set correctly
- Check Railway logs for specific API errors

**App Won't Start:**
- Check Railway deployment logs
- Ensure `PORT` environment variable is not overridden

### Viewing Logs:

1. **In Railway dashboard**:
   - Click on your web service
   - Go to **"Deployments"** tab
   - Click on the latest deployment
   - View **"Build Logs"** and **"Deploy Logs"**

## 🔄 Auto-Deployment

Railway automatically redeploys when you push to your connected GitHub branch. This means:

- **Push code changes** → **Automatic deployment**
- **Zero downtime** deployments
- **Rollback capability** if needed

## 🌐 Custom Domain (Optional)

To use a custom domain:

1. **In Railway dashboard**:
   - Go to your web service
   - Click **"Settings"**
   - Scroll to **"Domains"**
   - Add your custom domain

## 🎉 Success!

Your Encore Architect application is now:
- ✅ **Deployed from GitHub**
- ✅ **Using persistent PostgreSQL database**
- ✅ **Accessible to your coworkers**
- ✅ **Auto-deploying on code changes**

Share the Railway URL with your team and start planning some amazing events! 🎊 