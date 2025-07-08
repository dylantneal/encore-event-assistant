const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

// Sample data to populate the database
const sampleData = {
  properties: [
    {
      id: 1,
      name: 'Grand Hotel Downtown',
      property_code: 'GHD',
      address: '123 Main Street, Downtown',
      city: 'Metropolitan City',
      state: 'NY',
      zip_code: '10001',
      phone: '(555) 123-4567',
      email: 'info@grandhoteldowntown.com',
      website: 'https://grandhoteldowntown.com',
      total_rooms: 250,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Seaside Resort & Spa',
      property_code: 'SRS',
      address: '456 Ocean Drive',
      city: 'Coastal City',
      state: 'FL',
      zip_code: '33101',
      phone: '(555) 987-6543',
      email: 'reservations@seasideresort.com',
      website: 'https://seasideresort.com',
      total_rooms: 180,
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  rooms: [
    {
      id: 1,
      property_id: 1,
      room_number: '101',
      room_type: 'Standard King',
      floor: 1,
      status: 'available',
      max_occupancy: 2,
      base_rate: 149.99,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      property_id: 1,
      room_number: '102',
      room_type: 'Standard Queen',
      floor: 1,
      status: 'available',
      max_occupancy: 2,
      base_rate: 129.99,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      property_id: 2,
      room_number: '201',
      room_type: 'Ocean View Suite',
      floor: 2,
      status: 'available',
      max_occupancy: 4,
      base_rate: 299.99,
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  inventory_items: [
    {
      id: 1,
      property_id: 1,
      name: 'Towels',
      category: 'Linens',
      quantity: 500,
      unit_cost: 12.50,
      supplier: 'Hotel Supply Co',
      reorder_level: 100,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      property_id: 1,
      name: 'Shampoo Bottles',
      category: 'Amenities',
      quantity: 200,
      unit_cost: 3.25,
      supplier: 'Amenity Plus',
      reorder_level: 50,
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  labor_rules: [
    {
      id: 1,
      property_id: 1,
      position: 'Housekeeper',
      hourly_rate: 18.50,
      overtime_rate: 27.75,
      max_hours_per_week: 40,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      property_id: 1,
      position: 'Front Desk Agent',
      hourly_rate: 16.00,
      overtime_rate: 24.00,
      max_hours_per_week: 40,
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  unions: [
    {
      id: 1,
      name: 'Hotel Workers Union Local 123',
      contact_person: 'John Smith',
      phone: '(555) 111-2222',
      email: 'jsmith@hwu123.org',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]
};

async function populateDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    logger.info('🚀 Starting database population...');
    
    // Test connection
    const client = await pool.connect();
    logger.info('✅ Connected to PostgreSQL database');
    client.release();

    // Insert properties
    logger.info('📝 Inserting properties...');
    for (const property of sampleData.properties) {
      await pool.query(`
        INSERT INTO properties (id, name, property_code, address, city, state, zip_code, phone, email, website, total_rooms, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          property_code = EXCLUDED.property_code,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          zip_code = EXCLUDED.zip_code,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          website = EXCLUDED.website,
          total_rooms = EXCLUDED.total_rooms,
          updated_at = EXCLUDED.updated_at
      `, [
        property.id, property.name, property.property_code, property.address,
        property.city, property.state, property.zip_code, property.phone,
        property.email, property.website, property.total_rooms,
        property.created_at, property.updated_at
      ]);
    }

    // Insert rooms
    logger.info('🏨 Inserting rooms...');
    for (const room of sampleData.rooms) {
      await pool.query(`
        INSERT INTO rooms (id, property_id, room_number, room_type, floor, status, max_occupancy, base_rate, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          property_id = EXCLUDED.property_id,
          room_number = EXCLUDED.room_number,
          room_type = EXCLUDED.room_type,
          floor = EXCLUDED.floor,
          status = EXCLUDED.status,
          max_occupancy = EXCLUDED.max_occupancy,
          base_rate = EXCLUDED.base_rate,
          updated_at = EXCLUDED.updated_at
      `, [
        room.id, room.property_id, room.room_number, room.room_type,
        room.floor, room.status, room.max_occupancy, room.base_rate,
        room.created_at, room.updated_at
      ]);
    }

    // Insert inventory items
    logger.info('📦 Inserting inventory items...');
    for (const item of sampleData.inventory_items) {
      await pool.query(`
        INSERT INTO inventory_items (id, property_id, name, category, quantity, unit_cost, supplier, reorder_level, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          property_id = EXCLUDED.property_id,
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          quantity = EXCLUDED.quantity,
          unit_cost = EXCLUDED.unit_cost,
          supplier = EXCLUDED.supplier,
          reorder_level = EXCLUDED.reorder_level,
          updated_at = EXCLUDED.updated_at
      `, [
        item.id, item.property_id, item.name, item.category,
        item.quantity, item.unit_cost, item.supplier, item.reorder_level,
        item.created_at, item.updated_at
      ]);
    }

    // Insert labor rules
    logger.info('👷 Inserting labor rules...');
    for (const rule of sampleData.labor_rules) {
      await pool.query(`
        INSERT INTO labor_rules (id, property_id, position, hourly_rate, overtime_rate, max_hours_per_week, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          property_id = EXCLUDED.property_id,
          position = EXCLUDED.position,
          hourly_rate = EXCLUDED.hourly_rate,
          overtime_rate = EXCLUDED.overtime_rate,
          max_hours_per_week = EXCLUDED.max_hours_per_week,
          updated_at = EXCLUDED.updated_at
      `, [
        rule.id, rule.property_id, rule.position, rule.hourly_rate,
        rule.overtime_rate, rule.max_hours_per_week,
        rule.created_at, rule.updated_at
      ]);
    }

    // Insert unions
    logger.info('🤝 Inserting unions...');
    for (const union of sampleData.unions) {
      await pool.query(`
        INSERT INTO unions (id, name, contact_person, phone, email, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          contact_person = EXCLUDED.contact_person,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          updated_at = EXCLUDED.updated_at
      `, [
        union.id, union.name, union.contact_person, union.phone,
        union.email, union.created_at, union.updated_at
      ]);
    }

    // Update sequences
    logger.info('🔄 Updating sequences...');
    await pool.query('SELECT setval(\'properties_id_seq\', COALESCE((SELECT MAX(id) FROM properties), 1), false)');
    await pool.query('SELECT setval(\'rooms_id_seq\', COALESCE((SELECT MAX(id) FROM rooms), 1), false)');
    await pool.query('SELECT setval(\'inventory_items_id_seq\', COALESCE((SELECT MAX(id) FROM inventory_items), 1), false)');
    await pool.query('SELECT setval(\'labor_rules_id_seq\', COALESCE((SELECT MAX(id) FROM labor_rules), 1), false)');
    await pool.query('SELECT setval(\'unions_id_seq\', COALESCE((SELECT MAX(id) FROM unions), 1), false)');

    logger.info('✅ Database population completed successfully!');
    
    // Verify data
    const propertyCount = await pool.query('SELECT COUNT(*) FROM properties');
    const roomCount = await pool.query('SELECT COUNT(*) FROM rooms');
    const inventoryCount = await pool.query('SELECT COUNT(*) FROM inventory_items');
    const laborCount = await pool.query('SELECT COUNT(*) FROM labor_rules');
    const unionCount = await pool.query('SELECT COUNT(*) FROM unions');

    logger.info(`📊 Data summary:
      - Properties: ${propertyCount.rows[0].count}
      - Rooms: ${roomCount.rows[0].count}
      - Inventory Items: ${inventoryCount.rows[0].count}
      - Labor Rules: ${laborCount.rows[0].count}
      - Unions: ${unionCount.rows[0].count}`);

  } catch (error) {
    logger.error('❌ Population failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  populateDatabase()
    .then(() => {
      logger.info('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { populateDatabase }; 