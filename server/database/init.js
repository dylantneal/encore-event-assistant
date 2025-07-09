// PostgreSQL Database Configuration
// Original SQLite config backed up as init.js.sqlite.backup

const { initDatabase, getDatabase, closeDatabase } = require('./postgres-init');

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
