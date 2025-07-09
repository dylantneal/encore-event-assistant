# 🚀 Migration Guide: Away from Railway to Better Platforms

## 🎯 Why Migrate Away from Railway?

Based on your experience, Railway has several limitations:
- ❌ Unreliable PostgreSQL connections
- ❌ Complex environment variable management  
- ❌ Limited database management tools
- ❌ Inconsistent deployment behavior
- ❌ Poor debugging experience

## 🏆 **Recommended Solution: Vercel + PlanetScale**

This combination provides the best developer experience for your use case.

### ✅ **Benefits:**
- **Serverless everything** - No server management
- **Auto-scaling** - Handles traffic spikes automatically  
- **Better debugging** - Excellent logging and monitoring
- **Git-like database** - Schema branching and merging
- **Cost-effective** - Generous free tiers
- **Simple deployment** - One command deployments

---

## 🗄️ **Option 1: Vercel + PlanetScale (MySQL)**

### **Step 1: Setup PlanetScale Database**

```bash
# Install PlanetScale CLI
npm install -g @planetscale/cli

# Login and create database
pscale auth login
pscale database create encore-architect --region us-east

# Create development branch
pscale branch create encore-architect dev
pscale connect encore-architect dev --port 3306
```

### **Step 2: Update Database Schema**

Create `server/database/planetscale-init.js`:

```javascript
const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

let connection;

const initDatabase = async () => {
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    logger.info('Connected to PlanetScale database');
    
    // Create tables
    await createTables();
    
    logger.info('Database initialized successfully');
    return connection;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

const createTables = async () => {
  // Convert PostgreSQL schema to MySQL
  const tables = [
    `CREATE TABLE IF NOT EXISTS properties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      description TEXT,
      contact_info VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      capacity INT,
      dimensions VARCHAR(255),
      built_in_av TEXT,
      features TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
    )`,
    
    // Add all other tables...
  ];

  for (const table of tables) {
    await connection.execute(table);
  }
};

module.exports = { initDatabase, getDatabase: () => connection };
```

### **Step 3: Deploy Backend to Vercel**

Create `server/package.json` scripts:
```json
{
  "scripts": {
    "build": "echo 'No build needed'",
    "start": "node index.js",
    "vercel-build": "npm install"
  }
}
```

Create `server/vercel.json`:
```json
{
  "version": 2,
  "functions": {
    "index.js": {
      "runtime": "nodejs18.x"
    }
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.js"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url"
  }
}
```

Deploy:
```bash
cd server
npx vercel
# Follow prompts to deploy backend
```

---

## 🐘 **Option 2: Vercel + Supabase (PostgreSQL)**

### **Step 1: Create Supabase Project**

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init
supabase start

# Or use hosted version
# Go to https://supabase.com
# Create new project
```

### **Step 2: Run Your Existing Migration**

```bash
# Copy your existing migration
cp server/database/postgres-init.js server/database/supabase-init.js

# Update connection to use Supabase
# DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
DATABASE_URL="your_supabase_connection_string" node server/scripts/migrate-to-postgres.js
```

### **Step 3: Deploy Backend to Vercel**

Same as PlanetScale option, but keep PostgreSQL adapter.

---

## 🚁 **Option 3: Keep Everything, Move to Fly.io**

### **Step 1: Install Fly CLI**

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login
```

### **Step 2: Create Fly App**

```bash
cd server
fly launch --no-deploy

# Create PostgreSQL database
fly postgres create --name encore-db
fly postgres attach --app encore-architect encore-db
```

### **Step 3: Configure and Deploy**

Create `server/fly.toml`:
```toml
app = "encore-architect"
primary_region = "ord"

[build]

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true

[env]
  NODE_ENV = "production"
  PORT = "3001"

[[statics]]
  guest_path = "/app/uploads"
  url_prefix = "/uploads"
```

Deploy:
```bash
fly deploy
```

---

## 🔄 **Migration Steps (Any Option)**

### **1. Export Current Data from Railway**

```bash
# Connect to Railway database and export
railway run 'cd server && node -e "
const { Pool } = require(\"pg\");
const fs = require(\"fs\");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function exportData() {
  const tables = [\"properties\", \"rooms\", \"inventory_items\", \"unions\"];
  const data = {};
  
  for (const table of tables) {
    const result = await pool.query(\`SELECT * FROM \${table}\`);
    data[table] = result.rows;
  }
  
  fs.writeFileSync(\"export.json\", JSON.stringify(data, null, 2));
  console.log(\"Data exported to export.json\");
}

exportData().catch(console.error);
"'

# Download the export
railway run 'cat server/export.json' > data-export.json
```

### **2. Import to New Platform**

Create `import-data.js`:
```javascript
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data-export.json', 'utf8'));

async function importData(connection) {
  for (const [table, rows] of Object.entries(data)) {
    for (const row of rows) {
      const columns = Object.keys(row).filter(k => k !== 'id');
      const values = columns.map(col => row[col]);
      const placeholders = columns.map(() => '?').join(', ');
      
      await connection.execute(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }
}
```

### **3. Update Frontend Configuration**

Update `client/utils/api.ts`:
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://your-new-backend-url.vercel.app'  // or fly.dev
    : 'http://localhost:3001');
```

### **4. Test Migration**

```bash
# Test all endpoints
curl https://your-new-backend/api/health
curl https://your-new-backend/api/properties
curl "https://your-new-backend/api/inventory?property_id=2621"
```

---

## 📊 **Platform Comparison**

| Feature | Railway | Vercel + PlanetScale | Vercel + Supabase | Fly.io |
|---------|---------|---------------------|-------------------|--------|
| **Reliability** | ⚠️ Poor | ✅ Excellent | ✅ Excellent | ✅ Good |
| **Database UI** | ❌ Basic | ✅ Excellent | ✅ Excellent | ⚠️ Basic |
| **Scaling** | ⚠️ Manual | ✅ Automatic | ✅ Automatic | ⚠️ Manual |
| **Free Tier** | ✅ Good | ✅ Generous | ✅ Generous | ✅ Good |
| **DX** | ❌ Poor | ✅ Excellent | ✅ Excellent | ⚠️ Good |
| **Support** | ❌ Limited | ✅ Great | ✅ Great | ✅ Good |

---

## 🎯 **My Recommendation**

**Go with Vercel + PlanetScale** because:

1. **Your frontend is already on Vercel** - keeps everything in one ecosystem
2. **PlanetScale has the best database developer experience** - web UI, branching, migrations
3. **Serverless scaling** - handles your hospitality industry traffic patterns
4. **Better debugging** - actual useful logs and monitoring
5. **Cost-effective** - their free tiers cover your current usage

---

## 🚀 **Quick Start Command**

Want to try it now? Run this:

```bash
# Install CLI tools
npm install -g @planetscale/cli vercel

# Setup database
pscale auth login
pscale database create encore-architect

# Deploy backend
cd server
npx vercel

# Update frontend API URL
cd ../client
# Edit utils/api.ts with new backend URL
npx vercel

# You're done! 🎉
```

---

## 🆘 **Need Help?**

If you run into issues during migration:

1. **Database connection problems**: Check connection strings and firewall settings
2. **API compatibility**: Your existing API should work with minimal changes
3. **Environment variables**: Make sure all secrets are properly configured
4. **CORS issues**: Update CORS settings for new domain

The good news is your application architecture is well-designed with the database adapter pattern, so the migration should be relatively straightforward! 