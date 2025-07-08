#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { logger } = require('../utils/logger');

// Import both database systems
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const SQLITE_DB_PATH = path.join(__dirname, '..', 'data', 'encore.db');

async function migrateToPostgreSQL() {
  let sqliteDb = null;
  let pgPool = null;
  
  try {
    logger.info('🚀 Starting migration from SQLite to PostgreSQL...');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required. Please set it in your .env file.');
    }
    
    // Connect to PostgreSQL
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    logger.info('✅ Connected to PostgreSQL database');
    
    // Initialize PostgreSQL schema
    const { initDatabase } = require('../database/postgres-init');
    await initDatabase();
    
    // Check if SQLite database exists
    if (!fs.existsSync(SQLITE_DB_PATH)) {
      logger.info('⚠️  No SQLite database found. Starting with fresh PostgreSQL database.');
      logger.info('✅ Migration completed - fresh PostgreSQL database ready!');
      return;
    }
    
    // Connect to SQLite
    sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
    logger.info('✅ Connected to SQLite database');
    
    // Migrate data
    await migrateTableData(sqliteDb, pgPool, 'properties');
    await migrateTableData(sqliteDb, pgPool, 'rooms');
    await migrateTableData(sqliteDb, pgPool, 'inventory_items');
    await migrateTableData(sqliteDb, pgPool, 'labor_rules');
    await migrateTableData(sqliteDb, pgPool, 'unions');
    await migrateTableData(sqliteDb, pgPool, 'union_schedules');
    await migrateTableData(sqliteDb, pgPool, 'union_equipment_requirements');
    await migrateTableData(sqliteDb, pgPool, 'union_venue_rules');
    await migrateTableData(sqliteDb, pgPool, 'union_time_penalties');
    await migrateTableData(sqliteDb, pgPool, 'union_special_days');
    await migrateTableData(sqliteDb, pgPool, 'chat_sessions');
    await migrateTableData(sqliteDb, pgPool, 'event_orders');
    
    logger.info('✅ All data migrated successfully!');
    logger.info('✅ Migration completed - PostgreSQL database is ready!');
    
    // Create backup of SQLite database
    const backupPath = SQLITE_DB_PATH + '.backup.' + Date.now();
    fs.copyFileSync(SQLITE_DB_PATH, backupPath);
    logger.info(`📦 SQLite database backed up to: ${backupPath}`);
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (sqliteDb) {
      sqliteDb.close();
    }
    if (pgPool) {
      await pgPool.end();
    }
  }
}

async function migrateTableData(sqliteDb, pgPool, tableName) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get all data from SQLite
      sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
        if (err) {
          if (err.message.includes('no such table')) {
            logger.info(`⏭️  Table ${tableName} doesn't exist in SQLite, skipping...`);
            resolve();
            return;
          }
          reject(err);
          return;
        }
        
        if (rows.length === 0) {
          logger.info(`⏭️  Table ${tableName} is empty, skipping...`);
          resolve();
          return;
        }
        
        logger.info(`📊 Migrating ${rows.length} rows from ${tableName}...`);
        
        // Clear existing data in PostgreSQL
        await pgPool.query(`DELETE FROM ${tableName}`);
        
        // Insert data into PostgreSQL
        for (const row of rows) {
          const columns = Object.keys(row).filter(key => key !== 'id'); // Exclude id for auto-increment
          const values = columns.map(col => row[col]);
          const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
          
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
          `;
          
          try {
            await pgPool.query(insertQuery, values);
          } catch (insertError) {
            logger.error(`Error inserting row into ${tableName}:`, insertError);
            logger.error('Row data:', row);
            // Continue with other rows
          }
        }
        
        // Reset sequence for auto-increment columns
        try {
          const maxIdResult = await pgPool.query(`SELECT MAX(id) as max_id FROM ${tableName}`);
          const maxId = maxIdResult.rows[0].max_id || 0;
          await pgPool.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), ${maxId})`);
        } catch (seqError) {
          logger.warn(`Could not reset sequence for ${tableName}:`, seqError.message);
        }
        
        logger.info(`✅ Migrated ${tableName} successfully`);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Update server configuration
function updateServerConfig() {
  const configPath = path.join(__dirname, '..', 'database', 'init.js');
  const postgresConfigPath = path.join(__dirname, '..', 'database', 'postgres-init.js');
  
  // Create backup of original config
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, configPath + '.sqlite.backup');
    logger.info('📦 Original SQLite config backed up');
  }
  
  // Update the main init.js to use PostgreSQL
  const newInitContent = `// PostgreSQL Database Configuration
// Original SQLite config backed up as init.js.sqlite.backup

const { initDatabase, getDatabase, closeDatabase } = require('./postgres-init');

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
`;
  
  fs.writeFileSync(configPath, newInitContent);
  logger.info('✅ Server configuration updated to use PostgreSQL');
}

// Main execution
if (require.main === module) {
  migrateToPostgreSQL()
    .then(() => {
      updateServerConfig();
      logger.info('🎉 Migration completed successfully!');
      logger.info('🔧 Next steps:');
      logger.info('   1. Update your .env file with DATABASE_URL');
      logger.info('   2. Run: npm install');
      logger.info('   3. Restart your server');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToPostgreSQL }; 