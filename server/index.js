const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Auto-detect database type based on environment
const usePostgres = !!process.env.DATABASE_URL;
const { initDatabase, getDatabase } = usePostgres 
  ? require('./database/postgres-init') 
  : require('./database/init');

const { logger } = require('./utils/logger');
const propertiesRouter = require('./routes/properties');
const roomsRouter = require('./routes/rooms');
const inventoryRouter = require('./routes/inventory');
const laborRulesRouter = require('./routes/laborRules');
const unionsRouter = require('./routes/unions');
const chatRouter = require('./routes/chat');
const importRouter = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsConfig = require('./cors-config');
app.use(cors(corsConfig));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from client build (for production)
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', '.next');
  const clientPublicPath = path.join(__dirname, '..', 'client', 'public');
  
  // Serve Next.js static assets
  app.use('/_next', express.static(clientBuildPath));
  app.use('/public', express.static(clientPublicPath));
  
  // Serve favicon and other static files
  app.use('/favicon.ico', express.static(path.join(clientPublicPath, 'favicon.ico')));
}

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Override problematic routes with working PostgreSQL versions
app.get('/api/inventory', async (req, res) => {
  try {
    const { property_id, category, status } = req.query;
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      let query = 'SELECT * FROM inventory_items';
      let params = [];
      let conditions = [];
      let paramCount = 0;
      
      if (property_id) {
        conditions.push(`property_id = $${++paramCount}`);
        params.push(parseInt(property_id));
      }
      
      if (category) {
        conditions.push(`category = $${++paramCount}`);
        params.push(category);
      }
      
      if (status) {
        conditions.push(`status = $${++paramCount}`);
        params.push(status);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY category, name';
      
      const result = await client.query(query, params);
      
      res.json({
        items: result.rows,
        total: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Inventory override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching inventory items'
    });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const { property_id } = req.query;
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      let query = 'SELECT * FROM rooms';
      let params = [];
      
      if (property_id) {
        query += ' WHERE property_id = $1';
        params.push(parseInt(property_id));
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await client.query(query, params);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Rooms override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching rooms'
    });
  }
});

app.get('/api/unions', async (req, res) => {
  try {
    const { property_id } = req.query;
    
    if (!property_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Property ID is required' 
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM unions 
        WHERE property_id = $1
        ORDER BY local_number, name
      `, [property_id]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Unions override endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch unions',
      error: error.message 
    });
  }
});

// POST /api/rooms - Create a new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { property_id, name, capacity, dimensions, built_in_av, features } = req.body;
    
    // Basic validation
    if (!property_id || !name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property ID and name are required'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO rooms (property_id, name, capacity, dimensions, built_in_av, features) 
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [property_id, name, capacity || 0, dimensions || '', built_in_av || '', features || '']);
      
      logger.info('Room created successfully', { id: result.rows[0].id, name, property_id });
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create room override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the room'
    });
  }
});

// POST /api/inventory - Create a new inventory item  
app.post('/api/inventory', async (req, res) => {
  try {
    const { property_id, name, description, category, sub_category, quantity_available, status, asset_tag, model, manufacturer, condition_notes } = req.body;
    
    // Basic validation
    if (!property_id || !name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property ID and name are required'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO inventory_items 
        (property_id, name, description, category, sub_category, quantity_available, status, asset_tag, model, manufacturer, condition_notes) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        property_id, 
        name, 
        description || '', 
        category || 'General', 
        sub_category || '', 
        quantity_available || 0, 
        status || 'available', 
        asset_tag || '', 
        model || '', 
        manufacturer || '', 
        condition_notes || ''
      ]);
      
      logger.info('Inventory item created successfully', { id: result.rows[0].id, name, property_id });
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create inventory override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the inventory item'
    });
  }
});

// POST /api/unions - Create a new union
app.post('/api/unions', async (req, res) => {
  try {
    const { property_id, local_number, name, trade, regular_hours_start, regular_hours_end, regular_rate, overtime_rate, doubletime_rate, overtime_threshold, doubletime_threshold, weekend_rules, holiday_rules, contact_info, notes } = req.body;
    
    // Basic validation
    if (!property_id || !local_number || !name || !trade) {
      return res.status(400).json({
        success: false,
        message: 'Property ID, local number, name, and trade are required'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO unions (
          property_id, local_number, name, trade, 
          regular_hours_start, regular_hours_end,
          regular_rate, overtime_rate, doubletime_rate,
          overtime_threshold, doubletime_threshold,
          weekend_rules, holiday_rules, contact_info, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        property_id,
        local_number,
        name,
        trade,
        regular_hours_start || '08:00',
        regular_hours_end || '17:00',
        regular_rate || null,
        overtime_rate || null,
        doubletime_rate || null,
        overtime_threshold || 8,
        doubletime_threshold || 12,
        weekend_rules || '',
        holiday_rules || '',
        contact_info || '',
        notes || ''
      ]);
      
      logger.info(`Created union: Local ${local_number} - ${name}`);
      res.status(201).json({
        success: true,
        message: 'Union created successfully',
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create union override endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create union',
      error: error.message
    });
  }
});

// PUT /api/inventory/:id - Update inventory item
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { property_id, name, description, category, sub_category, quantity_available, status, asset_tag, model, manufacturer, condition_notes } = req.body;
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Item ID must be a number'
      });
    }
    
    if (!property_id || !name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property ID and name are required'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        UPDATE inventory_items 
        SET property_id = $1, name = $2, description = $3, category = $4, sub_category = $5, 
            quantity_available = $6, status = $7, asset_tag = $8, model = $9, manufacturer = $10, 
            condition_notes = $11, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $12
        RETURNING *
      `, [
        property_id, 
        name, 
        description || '', 
        category || 'General', 
        sub_category || '', 
        quantity_available || 0, 
        status || 'available', 
        asset_tag || '', 
        model || '', 
        manufacturer || '', 
        condition_notes || '', 
        itemId
      ]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Inventory item not found'
        });
      }
      
      logger.info('Inventory item updated successfully', { id: itemId, name });
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update inventory override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the inventory item'
    });
  }
});

// PUT /api/rooms/:id - Update room
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const { property_id, name, capacity, dimensions, built_in_av, features } = req.body;
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Room ID must be a number'
      });
    }
    
    if (!property_id || !name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property ID and name are required'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        UPDATE rooms 
        SET property_id = $1, name = $2, capacity = $3, dimensions = $4, 
            built_in_av = $5, features = $6, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $7
        RETURNING *
      `, [property_id, name, capacity || 0, dimensions || '', built_in_av || '', features || '', roomId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Room not found'
        });
      }
      
      logger.info('Room updated successfully', { id: roomId, name });
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update room override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the room'
    });
  }
});

// PUT /api/unions/:id - Update union
app.put('/api/unions/:id', async (req, res) => {
  try {
    const unionId = parseInt(req.params.id);
    const { property_id, local_number, name, trade, regular_hours_start, regular_hours_end, regular_rate, overtime_rate, doubletime_rate, overtime_threshold, doubletime_threshold, weekend_rules, holiday_rules, contact_info, notes } = req.body;
    
    if (isNaN(unionId)) {
      return res.status(400).json({
        success: false,
        message: 'Union ID must be a number'
      });
    }
    
    if (!property_id || !local_number || !name || !trade) {
      return res.status(400).json({
        success: false,
        message: 'Property ID, local number, name, and trade are required'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        UPDATE unions SET 
          property_id = $1, local_number = $2, name = $3, trade = $4,
          regular_hours_start = $5, regular_hours_end = $6,
          regular_rate = $7, overtime_rate = $8, doubletime_rate = $9,
          overtime_threshold = $10, doubletime_threshold = $11,
          weekend_rules = $12, holiday_rules = $13, contact_info = $14, notes = $15,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $16
        RETURNING *
      `, [
        property_id,
        local_number,
        name,
        trade,
        regular_hours_start || '08:00',
        regular_hours_end || '17:00',
        regular_rate || null,
        overtime_rate || null,
        doubletime_rate || null,
        overtime_threshold || 8,
        doubletime_threshold || 12,
        weekend_rules || '',
        holiday_rules || '',
        contact_info || '',
        notes || '',
        unionId
      ]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Union not found'
        });
      }
      
      logger.info(`Updated union: Local ${local_number} - ${name}`);
      res.json({
        success: true,
        message: 'Union updated successfully',
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update union override endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update union',
      error: error.message
    });
  }
});

// API Routes (remaining routes that work fine)
app.use('/api/properties', propertiesRouter);
app.use('/api/labor-rules', laborRulesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/import', importRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.1.6',
    database: usePostgres ? 'PostgreSQL' : 'SQLite',
    corsFixed: true,
    deploymentTime: new Date().toISOString(),
    corsConfig: 'external-file',
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Database repair endpoint
app.post('/api/repair-database', async (req, res) => {
  try {
    logger.info('Starting database repair...');
    
    // Re-initialize database
    await initDatabase();
    
    res.json({
      status: 'success',
      message: 'Database repaired and re-initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database repair failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database repair failed',
      error: error.message
    });
  }
});

// Test database endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM inventory_items');
      const inventoryCount = result.rows[0].count;
      
      const roomsResult = await client.query('SELECT COUNT(*) as count FROM rooms');
      const roomsCount = roomsResult.rows[0].count;
      
      const unionsResult = await client.query('SELECT COUNT(*) as count FROM unions');
      const unionsCount = unionsResult.rows[0].count;
      
      res.json({
        status: 'success',
        database: 'PostgreSQL',
        counts: {
          inventory: inventoryCount,
          rooms: roomsCount,
          unions: unionsCount
        },
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Simple working inventory endpoint
app.get('/api/inventory-simple', async (req, res) => {
  try {
    const { property_id } = req.query;
    if (!property_id) {
      return res.status(400).json({ error: 'Property ID required' });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM inventory_items WHERE property_id = $1 ORDER BY name', [property_id]);
      
      res.json({
        items: result.rows,
        total: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Simple inventory endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Simple working unions endpoint
app.get('/api/unions-simple', async (req, res) => {
  try {
    const { property_id } = req.query;
    if (!property_id) {
      return res.status(400).json({ error: 'Property ID required' });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM unions WHERE property_id = $1 ORDER BY name', [property_id]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Simple unions endpoint error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Simple working rooms endpoint
app.get('/api/rooms-simple', async (req, res) => {
  try {
    const { property_id } = req.query;
    if (!property_id) {
      return res.status(400).json({ error: 'Property ID required' });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM rooms WHERE property_id = $1 ORDER BY name', [property_id]);
      
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Simple rooms endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// DELETE /api/inventory/:id - Delete inventory item
app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Item ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('DELETE FROM inventory_items WHERE id = $1', [itemId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Inventory item not found'
        });
      }
      
      logger.info('Inventory item deleted successfully', { id: itemId });
      res.json({
        message: 'Inventory item deleted successfully',
        id: itemId
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete inventory override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the inventory item'
    });
  }
});

// DELETE /api/rooms/:id - Delete room
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Room ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('DELETE FROM rooms WHERE id = $1', [roomId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Room not found'
        });
      }
      
      logger.info('Room deleted successfully', { id: roomId });
      res.json({
        message: 'Room deleted successfully',
        id: roomId
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete room override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the room'
    });
  }
});

// DELETE /api/unions/:id - Delete union
app.delete('/api/unions/:id', async (req, res) => {
  try {
    const unionId = parseInt(req.params.id);
    
    if (isNaN(unionId)) {
      return res.status(400).json({
        success: false,
        message: 'Union ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('DELETE FROM unions WHERE id = $1', [unionId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Union not found'
        });
      }
      
      logger.info(`Deleted union with ID: ${unionId}`);
      res.json({
        success: true,
        message: 'Union deleted successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete union override endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete union',
      error: error.message
    });
  }
});

// GET /api/inventory/:id - Get specific inventory item
app.get('/api/inventory/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Item ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Inventory item not found'
        });
      }
      
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get inventory item override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the inventory item'
    });
  }
});

// GET /api/rooms/:id - Get specific room
app.get('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Room ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Room not found'
        });
      }
      
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get room override endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the room'
    });
  }
});

// GET /api/unions/:id - Get specific union
app.get('/api/unions/:id', async (req, res) => {
  try {
    const unionId = parseInt(req.params.id);
    
    if (isNaN(unionId)) {
      return res.status(400).json({
        success: false,
        message: 'Union ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM unions WHERE id = $1', [unionId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Union not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get union override endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch union details',
      error: error.message
    });
  }
});

// Serve frontend for all non-API routes (SPA fallback)
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const clientBuildPath = path.join(__dirname, '..', 'client', '.next');
  
  // Serve specific Next.js pages
  app.get('/', (req, res) => {
    const indexPath = path.join(clientBuildPath, 'server', 'pages', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.redirect('/status');
    }
  });
  
  app.get('/chat', (req, res) => {
    const chatPath = path.join(clientBuildPath, 'server', 'pages', 'chat.html');
    if (fs.existsSync(chatPath)) {
      res.sendFile(chatPath);
    } else {
      res.redirect('/status');
    }
  });
  
  app.get('/admin', (req, res) => {
    const adminPath = path.join(clientBuildPath, 'server', 'pages', 'admin.html');
    if (fs.existsSync(adminPath)) {
      res.sendFile(adminPath);
    } else {
      res.redirect('/status');
    }
  });
  
  // Status page for when frontend isn't built yet
  app.get('/status', (req, res) => {
    const fs = require('fs');
    const clientBuildPath = path.join(__dirname, '..', 'client', '.next');
    const indexPath = path.join(clientBuildPath, 'server', 'pages', 'index.html');
    
    // Debug information
    const debugInfo = {
      buildPath: clientBuildPath,
      indexPath: indexPath,
      buildPathExists: fs.existsSync(clientBuildPath),
      indexPathExists: fs.existsSync(indexPath),
      currentDir: __dirname,
      processEnv: process.env.NODE_ENV
    };
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Encore Architect</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background: #0a0a0f; 
              color: white; 
              padding: 40px; 
              text-align: center;
            }
            .container { max-width: 800px; margin: 0 auto; }
            .logo { font-size: 3em; margin-bottom: 20px; background: linear-gradient(45deg, #4965ff, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .status { background: #1a1a2e; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left; }
            .api-link { color: #06b6d4; text-decoration: none; }
            .api-link:hover { text-decoration: underline; }
            .debug { font-family: monospace; font-size: 12px; background: #2a2a3e; padding: 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="logo">🏗️ Encore Architect</h1>
            <div class="status">
              <h2>✅ Backend Successfully Deployed!</h2>
              <p>Your Encore Architect backend is running on Railway.</p>
              <p><strong>Database:</strong> ${usePostgres ? 'PostgreSQL' : 'SQLite'}</p>
              <p><strong>API Status:</strong> <span style="color: #10b981;">Online</span></p>
            </div>
            <div class="status">
              <h3>🔗 API Endpoints</h3>
              <p><a href="/api/health" class="api-link">Health Check</a></p>
              <p><a href="/api/properties" class="api-link">Properties API</a></p>
            </div>
            <div class="status">
              <h3>🔍 Debug Information</h3>
              <div class="debug">
                <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            </div>
            <div class="status">
              <h3>📝 Next Steps</h3>
              <p>Building frontend - please wait...</p>
              <p>Frontend will be available shortly</p>
            </div>
          </div>
        </body>
      </html>
    `);
  });
  
  // Catch-all for other routes
  app.get('*', (req, res) => {
    res.redirect('/status');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  
  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }
  
  if (err.type === 'openai') {
    return res.status(503).json({
      error: 'AI Service Error',
      message: 'The AI service is temporarily unavailable. Please try again later.'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong. Please try again later.'
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found.'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    logger.info(`Database initialized successfully (${usePostgres ? 'PostgreSQL' : 'SQLite'})`);
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`Database type: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

startServer();

module.exports = app; 