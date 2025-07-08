const { logger } = require('../utils/logger');

class DatabaseAdapter {
  constructor(db, type = 'sqlite') {
    this.db = db;
    this.type = type;
  }

  // Execute a query with proper parameter binding
  async query(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            logger.error('SQLite query error:', err);
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      });
    } else {
      // PostgreSQL - convert query first
      try {
        const { sql: convertedSql, params: convertedParams } = this.convertQuery(sql, params);
        const result = await this.db.query(convertedSql, convertedParams);
        return result;
      } catch (error) {
        logger.error('PostgreSQL query error:', error);
        throw error;
      }
    }
  }

  // Execute a single insert/update/delete query
  async run(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) {
            logger.error('SQLite run error:', err);
            reject(err);
          } else {
            resolve({ 
              lastID: this.lastID, 
              changes: this.changes,
              insertId: this.lastID 
            });
          }
        });
      });
    } else {
      // PostgreSQL - convert query first
      try {
        const { sql: convertedSql, params: convertedParams } = this.convertQuery(sql, params);
        const result = await this.db.query(convertedSql, convertedParams);
        return {
          lastID: result.rows[0]?.id || null,
          changes: result.rowCount,
          insertId: result.rows[0]?.id || null,
          rows: result.rows
        };
      } catch (error) {
        logger.error('PostgreSQL run error:', error);
        throw error;
      }
    }
  }

  // Get a single row
  async get(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  // Get all rows
  async all(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows;
  }

  // Convert SQLite-style queries to PostgreSQL
  convertQuery(sql, params = []) {
    if (this.type === 'sqlite') {
      return { sql, params };
    }

    // Convert SQLite placeholders (?) to PostgreSQL ($1, $2, etc.)
    let convertedSql = sql;
    let paramIndex = 1;
    
    convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Convert SQLite-specific functions to PostgreSQL equivalents
    convertedSql = convertedSql.replace(/DATETIME\('now'\)/g, 'NOW()');
    convertedSql = convertedSql.replace(/CURRENT_TIMESTAMP/g, 'NOW()');
    convertedSql = convertedSql.replace(/AUTOINCREMENT/g, 'SERIAL');
    
    return { sql: convertedSql, params };
  }

  // Execute converted query
  async execute(sql, params = []) {
    const { sql: convertedSql, params: convertedParams } = this.convertQuery(sql, params);
    return await this.query(convertedSql, convertedParams);
  }

  // Transaction support
  async beginTransaction() {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      const client = await this.db.connect();
      await client.query('BEGIN');
      return client;
    }
  }

  async commit(client = null) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      await client.query('COMMIT');
      client.release();
    }
  }

  async rollback(client = null) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.run('ROLLBACK', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      await client.query('ROLLBACK');
      client.release();
    }
  }
}

module.exports = DatabaseAdapter; 