const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logger } = require('../utils/logger');

const DB_PATH = path.join(__dirname, '..', 'data', 'encore.db');

let db;

const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      logger.info('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Properties table with property_code
      db.run(`
        CREATE TABLE IF NOT EXISTS properties (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          location TEXT,
          description TEXT,
          contact_info TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Rooms table
      db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          capacity INTEGER,
          dimensions TEXT,
          built_in_av TEXT,
          features TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
      `);

      // Inventory Items table
      db.run(`
        CREATE TABLE IF NOT EXISTS inventory_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,
          sub_category TEXT,
          quantity_available INTEGER DEFAULT 0,
          status TEXT DEFAULT 'available',
          asset_tag TEXT,
          model TEXT,
          manufacturer TEXT,
          condition_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
      `);

      // Labor Rules table
      db.run(`
        CREATE TABLE IF NOT EXISTS labor_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          rule_type TEXT NOT NULL,
          rule_data TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
      `);

      // Enhanced Union Management System - Real-world complexity
      db.exec(`
        CREATE TABLE IF NOT EXISTS unions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          local_number VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          trade VARCHAR(255) NOT NULL,
          regular_hours_start TIME DEFAULT '08:00',
          regular_hours_end TIME DEFAULT '17:00',
          regular_rate DECIMAL(10,2),
          overtime_rate DECIMAL(10,2),
          doubletime_rate DECIMAL(10,2),
          overtime_threshold INTEGER DEFAULT 8,
          doubletime_threshold INTEGER DEFAULT 12,
          weekend_rules TEXT,
          holiday_rules TEXT,
          contact_info TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties(id)
        )
      `);

      // Complex schedule rules for different days and times
      db.exec(`
        CREATE TABLE IF NOT EXISTS union_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          union_id INTEGER NOT NULL,
          day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          rate_type VARCHAR(50) NOT NULL, -- 'regular', 'overtime', 'doubletime'
          rate_multiplier DECIMAL(4,2) NOT NULL, -- 1.0, 1.5, 2.0, etc.
          description TEXT,
          FOREIGN KEY (union_id) REFERENCES unions(id) ON DELETE CASCADE
        )
      `);

      // Equipment-specific union requirements
      db.exec(`
        CREATE TABLE IF NOT EXISTS union_equipment_requirements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          union_id INTEGER NOT NULL,
          equipment_category VARCHAR(255), -- 'electrical', 'audio', 'video', 'lighting'
          equipment_type VARCHAR(255), -- 'projector', 'sound_system', 'lighting_rig'
          is_required BOOLEAN DEFAULT 0,
          minimum_crew_size INTEGER DEFAULT 1,
          notes TEXT,
          FOREIGN KEY (union_id) REFERENCES unions(id) ON DELETE CASCADE
        )
      `);

      // Venue-specific union rules and exceptions
      db.exec(`
        CREATE TABLE IF NOT EXISTS union_venue_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          union_id INTEGER NOT NULL,
          room_id INTEGER, -- NULL means applies to all rooms
          rule_type VARCHAR(100) NOT NULL, -- 'exception', 'requirement', 'limitation'
          condition_text TEXT NOT NULL, -- e.g., "3 ICW rooms without projectionists"
          threshold_value INTEGER, -- e.g., 3 for the ICW example
          threshold_unit VARCHAR(50), -- e.g., 'rooms', 'hours', 'people'
          action_required TEXT, -- e.g., "Projectionists required above threshold"
          notes TEXT,
          FOREIGN KEY (union_id) REFERENCES unions(id) ON DELETE CASCADE,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
        )
      `);

      // Time-based penalties and premiums
      db.exec(`
        CREATE TABLE IF NOT EXISTS union_time_penalties (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          union_id INTEGER NOT NULL,
          penalty_type VARCHAR(100) NOT NULL, -- 'late_call', 'early_call', 'meal_penalty', 'turnaround'
          condition_description TEXT NOT NULL,
          penalty_amount DECIMAL(10,2),
          penalty_type_amount VARCHAR(50), -- 'flat_fee', 'hourly_rate', 'percentage'
          applies_after_hours INTEGER, -- hours after which penalty applies
          applies_before_time TIME, -- time before which penalty applies
          notes TEXT,
          FOREIGN KEY (union_id) REFERENCES unions(id) ON DELETE CASCADE
        )
      `);

      // Holiday and special day rates
      db.exec(`
        CREATE TABLE IF NOT EXISTS union_special_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          union_id INTEGER NOT NULL,
          date_specific DATE, -- for specific dates like "2024-12-25"
          date_pattern VARCHAR(100), -- for patterns like "last_monday_may" (Memorial Day)
          holiday_name VARCHAR(255),
          rate_multiplier DECIMAL(4,2) NOT NULL, -- 2.0 for double time, etc.
          minimum_call INTEGER, -- minimum hours that must be paid
          special_rules TEXT,
          FOREIGN KEY (union_id) REFERENCES unions(id) ON DELETE CASCADE
        )
      `);

      // Chat Sessions table (for conversation history)
      db.run(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          session_id TEXT NOT NULL,
          messages TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
      `);

      // Event Orders table (for storing generated orders)
      db.run(`
        CREATE TABLE IF NOT EXISTS event_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          event_name TEXT,
          event_date DATE,
          attendees INTEGER,
          equipment_list TEXT NOT NULL,
          labor_plan TEXT,
          total_cost DECIMAL(10,2),
          status TEXT DEFAULT 'draft',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_properties_code ON properties (property_code)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_property ON inventory_items (property_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items (category)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms (property_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_labor_rules_property ON labor_rules (property_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_unions_property ON unions (property_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_unions_local ON unions (local_number)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_union_schedules_union ON union_schedules (union_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_property ON chat_sessions (property_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_event_orders_property ON event_orders (property_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_union_equipment_union ON union_equipment_requirements(union_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_union_venue_rules_union ON union_venue_rules(union_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_union_venue_rules_room ON union_venue_rules(room_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_union_time_penalties_union ON union_time_penalties(union_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_union_special_days_union ON union_special_days(union_id)`);

      // Insert sample data
      insertSampleData().then(() => {
        logger.info('Database tables created successfully');
        resolve();
      }).catch(reject);
    });
  });
};

const insertSampleData = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Clear existing data to avoid conflicts
      db.run(`DELETE FROM properties WHERE property_code IN ('1121', '2621')`);
      
      // Insert all Chicago properties
      const properties = [
        // Hotel Group 1
        { code: '9028', name: 'JW Marriott Chicago', location: 'Chicago, IL' },
        { code: '9037', name: 'Hyatt Centric Chicago Magnificent Mile', location: 'Chicago, IL' },
        { code: '9054', name: 'Chicago Athletic Association', location: 'Chicago, IL' },
        { code: '9055', name: 'Residence Inn Chicago Downtown', location: 'Chicago, IL' },
        { code: '9170', name: 'Hyatt Regency O\'Hare Chicago', location: 'Chicago, IL' },
        { code: '9478', name: 'JW Marriott Chicago', location: 'Chicago, IL' },
        
        // Hotel Group 2
        { code: '5031', name: 'Loews Chicago O\'Hare Business Center', location: 'Chicago, IL' },
        { code: '5874', name: 'Four Seasons Hotel Chicago Business Center', location: 'Chicago, IL' },
        { code: '5876', name: 'Renaissance Chicago O\'hare Business Center', location: 'Chicago, IL' },
        { code: '6004', name: 'Hilton Chicago - Electrical', location: 'Chicago, IL' },
        { code: '6020', name: 'Fairmont Chicago Rigging', location: 'Chicago, IL' },
        { code: '6023', name: 'Sheraton Grand Chicago - Legacy', location: 'Chicago, IL' },
        { code: '6631', name: 'Sheraton Chicago Hotel & Towers Power', location: 'Chicago, IL' },
        { code: '6650', name: 'Westin Chicago North Shore HSIA', location: 'Chicago, IL' },
        { code: '9005', name: 'IL-Hyatt Regency Chicago', location: 'Chicago, IL' },
        { code: '9015', name: 'Hyatt Regency Chicago', location: 'Chicago, IL' },
        { code: '9020', name: 'Hyatt Regency McCormick Place Chicago', location: 'Chicago, IL' },
        
        // Hotel Group 3
        { code: '3610', name: 'DoubleTree by Hilton Chicago O\'Hare Airport Rosemont', location: 'Chicago, IL' },
        { code: '3611', name: 'Embassy Suites Chicago O\'Hare Rosemont', location: 'Chicago, IL' },
        { code: '3613', name: 'Hard Rock Hotel Chicago', location: 'Chicago, IL' },
        { code: '3617', name: 'Royal Sonesta Chicago River North', location: 'Chicago, IL' },
        { code: '3620', name: 'The Sutton Place Hotel Chicago', location: 'Chicago, IL' },
        { code: '3621', name: 'Swissotel Chicago', location: 'Chicago, IL' },
        { code: '3622', name: 'Trump International Hotel Chicago', location: 'Chicago, IL' },
        { code: '3623', name: 'Waldorf Astoria Chicago', location: 'Chicago, IL' },
        { code: '3624', name: 'The Westin Chicago Northwest', location: 'Chicago, IL' },
        { code: '3841', name: 'Four Seasons Hotel Chicago', location: 'Chicago, IL' },
        { code: '3843', name: 'Renaissance Chicago O\'hare', location: 'Chicago, IL' },
        
        // Hotel Group 4
        { code: '1121', name: 'InterContinental Chicago', location: 'Chicago, IL', description: 'Premium downtown hotel with state-of-the-art facilities', contact_info: 'events@intercontinental-chicago.com' },
        { code: '1270', name: 'The Langham, Chicago', location: 'Chicago, IL' },
        { code: '1389', name: 'Park Hyatt Chicago', location: 'Chicago, IL' },
        { code: '1478', name: 'Embassy Suites Chicago Downtown Magnificent Mile', location: 'Chicago, IL' },
        { code: '1624', name: '21c Museum Hotel Chicago', location: 'Chicago, IL' },
        { code: '1635', name: 'Loews Chicago Hotel', location: 'Chicago, IL' },
        { code: '1639', name: 'Chicago Marriott O\'Hare', location: 'Chicago, IL' },
        { code: '1677', name: 'The Westin Chicago Lombard', location: 'Chicago, IL' },
        { code: '1731', name: 'Loews Chicago O\'Hare Hotel', location: 'Chicago, IL' },
        { code: '1755', name: 'Sheraton Chicago O\'Hare Airport Hotel', location: 'Chicago, IL' },
        { code: '1913', name: 'Encore Offsite Events - Chicago', location: 'Chicago, IL' },
        
        // Hotel Group 5
        { code: '2004', name: 'Hilton Chicago', location: 'Chicago, IL' },
        { code: '2020', name: 'Fairmont Chicago, Millennium Park', location: 'Chicago, IL' },
        { code: '2024', name: 'Midland Hotel Chicago', location: 'Chicago, IL' },
        { code: '2031', name: 'Sheraton Grand Chicago', location: 'Chicago, IL' },
        { code: '2038', name: 'The Westin Chicago River North', location: 'Chicago, IL' },
        { code: '2602', name: 'Chicago Marriott Oak Brook', location: 'Chicago, IL' },
        { code: '2615', name: 'Radisson Blu Aqua Hotel, Chicago', location: 'Chicago, IL' },
        { code: '2621', name: 'Marriott Marquis Chicago', location: 'Chicago, IL', description: 'Premium event venue with state-of-the-art facilities', contact_info: 'events@marriottmarquischicago.com' },
        { code: '3415', name: 'Hilton Suite Chicago Magnificent Mile', location: 'Chicago, IL' },
        { code: '3607', name: 'Marriott Chicago Downtown Magnificent Mile', location: 'Chicago, IL' },
        { code: '3609', name: 'DoubleTree by Hilton Chicago Oak Brook', location: 'Chicago, IL' },
        
        // Hotel Group 6
        { code: '3845', name: 'The Ritz-Carlton, Chicago', location: 'Chicago, IL' },
        { code: '3887', name: 'Prime Hotel & Suites Naperville/Chicago Wyndham Ga', location: 'Chicago, IL' },
        { code: '3907', name: 'Warehouse Ops Chicago', location: 'Chicago, IL' },
        { code: '4024', name: 'AC Hotel Chicago Downtown', location: 'Chicago, IL' },
        { code: '4076', name: 'Sable at Navy Pier Chicago', location: 'Chicago, IL' },
        { code: '4338', name: 'Courtyard Chicago Downtown/River North', location: 'Chicago, IL' },
        { code: '4339', name: 'The LaSalle Chicago', location: 'Chicago, IL' },
        { code: '4444', name: 'The St. Regis Chicago', location: 'Chicago, IL' },
        { code: '4524', name: 'Hyatt Lodge Oak Brook Chicago', location: 'Chicago, IL' },
        { code: '4587', name: 'Hilton Rosemont Chicago O\'Hare', location: 'Chicago, IL' },
        { code: '4623', name: 'Viceroy Chicago', location: 'Chicago, IL' }
      ];

      // Insert properties with batch processing
      const insertProperty = (property) => {
        return new Promise((resolve, reject) => {
          db.run(`
            INSERT OR REPLACE INTO properties (property_code, name, location, description, contact_info)
            VALUES (?, ?, ?, ?, ?)
          `, [
            property.code,
            property.name,
            property.location,
            property.description || `Professional event venue in ${property.location}`,
            property.contact_info || `events@${property.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
          ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });
      };

      // Insert all properties
      Promise.all(properties.map(insertProperty))
        .then((propertyIds) => {
          logger.info(`${propertyIds.length} properties inserted successfully`);
          
          // Properties inserted successfully - no sample data for inventory, rooms, or labor rules
          // Each property starts empty and gets populated via Excel uploads and admin input
          logger.info('Sample data inserted successfully');
          resolve();
        })
        .catch(reject);
    });
  });
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const closeDatabase = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        logger.error('Error closing database:', err);
      } else {
        logger.info('Database connection closed');
      }
    });
  }
};

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
}; 