# 🚀 PostgreSQL Migration Guide - Encore Architect

## Overview

This guide will help you migrate from the current SQLite database to PostgreSQL hosted on Railway. This will solve the data persistence issue and provide a production-ready database solution.

## ✅ Why PostgreSQL on Railway?

- **🔄 Persistent Data**: No more data loss on restarts
- **📈 Scalable**: Handles more concurrent connections and larger datasets
- **🛠️ Professional**: Industry-standard database for production apps
- **🌐 Cloud-hosted**: Managed service with automatic backups
- **💻 Code-only Management**: Fully manageable via terminal and code

## 📋 Migration Difficulty: **EASY** (3/10)

The migration is straightforward because:
- ✅ Well-structured existing schema
- ✅ Automated migration scripts provided
- ✅ Backward compatibility maintained
- ✅ No application code changes required

## 🛠️ Step-by-Step Migration

### Step 1: Set up Railway PostgreSQL Database

1. **Create Railway Account**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   ```

2. **Create New Project**
   ```bash
   # Create new Railway project
   railway new
   # Choose "Empty Project"
   ```

3. **Add PostgreSQL Database**
   ```bash
   # Add PostgreSQL service
   railway add postgresql
   ```

4. **Get Database URL**
   ```bash
   # Get the database connection string
   railway variables
   # Look for DATABASE_URL
   ```

### Step 2: Update Environment Configuration

1. **Update your `.env` file in the `server` directory:**
   ```env
   # PostgreSQL Configuration
   DATABASE_URL=postgresql://username:password@host:port/database
   
   # Keep existing variables
   OPENAI_API_KEY=your_openai_key_here
   PORT=3001
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   ```

2. **Alternative: Use Railway CLI to set variables**
   ```bash
   # Set DATABASE_URL directly
   railway variables set DATABASE_URL="your_postgresql_url_here"
   ```

### Step 3: Install Dependencies

```bash
# Navigate to server directory
cd server

# Install PostgreSQL driver
npm install pg@^8.11.3

# Install all dependencies
npm install
```

### Step 4: Run Migration

```bash
# From the server directory
node scripts/migrate-to-postgres.js
```

The migration script will:
- ✅ Connect to your PostgreSQL database
- ✅ Create all necessary tables and indexes
- ✅ Migrate existing data from SQLite (if any)
- ✅ Update server configuration
- ✅ Create backups of original files

### Step 5: Test the Migration

```bash
# Start the server
npm run dev

# Check health endpoint
curl http://localhost:3001/api/health

# Test database connection
curl http://localhost:3001/api/properties
```

## 🔧 Manual Migration (Alternative)

If you prefer manual control:

### 1. Create PostgreSQL Database Schema

```sql
-- Connect to your PostgreSQL database and run:
-- (The migration script does this automatically)

CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  property_code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  contact_info VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ... (full schema in server/database/postgres-init.js)
```

### 2. Update Database Configuration

Replace `server/database/init.js` content:

```javascript
// PostgreSQL Database Configuration
const { initDatabase, getDatabase, closeDatabase } = require('./postgres-init');

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
```

## 🚀 Railway Deployment (Optional)

To deploy your entire application to Railway:

```bash
# Initialize Railway in project root
railway init

# Deploy the application
railway up

# Set environment variables
railway variables set OPENAI_API_KEY="your_key_here"
railway variables set NODE_ENV="production"
```

## ✅ Verification Checklist

After migration, verify:

- [ ] Server starts without errors
- [ ] All 61 properties are visible in the UI
- [ ] Property selection works
- [ ] Admin functions work (inventory, rooms, unions)
- [ ] Chat functionality works
- [ ] Data persists after server restart
- [ ] No SQLite errors in logs

## 🔄 Rollback Plan

If you need to rollback to SQLite:

```bash
# Restore original database configuration
cp server/database/init.js.sqlite.backup server/database/init.js

# Remove PostgreSQL dependency (optional)
npm uninstall pg

# Restart server
npm run dev
```

## 🎯 Benefits After Migration

### ✅ **Data Persistence**
- Properties, inventory, and settings survive restarts
- Chat history is preserved
- Admin configurations are maintained

### ✅ **Better Performance**
- Faster queries with proper indexing
- Better concurrent user support
- Optimized for larger datasets

### ✅ **Production Ready**
- Automatic backups on Railway
- Connection pooling
- SSL encryption in production

### ✅ **Scalability**
- Easy to scale database resources
- Support for multiple server instances
- Better memory management

## 🛟 Troubleshooting

### Connection Issues
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"
```

### Migration Errors
```bash
# Check logs
tail -f server/logs/combined.log

# Verify environment variables
echo $DATABASE_URL
```

### Schema Issues
```bash
# Reset database (CAUTION: Deletes all data)
node scripts/migrate-to-postgres.js --reset
```

## 📞 Support

If you encounter issues:

1. **Check Railway Dashboard**: Monitor database status
2. **Review Logs**: Check server logs for specific errors
3. **Test Connection**: Verify DATABASE_URL is correct
4. **Restart Services**: Sometimes a simple restart helps

## 🎉 Post-Migration

Once migrated:

1. **Update Documentation**: Note the new database setup
2. **Test Thoroughly**: Verify all functionality works
3. **Monitor Performance**: Watch for any performance changes
4. **Backup Strategy**: Set up regular backups on Railway

The migration provides a solid foundation for scaling Encore Architect to production use with persistent, reliable data storage. 