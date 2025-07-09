const express = require('express');
const { logger } = require('../utils/logger');

// Auto-detect database type and get the appropriate database connection
const usePostgres = !!process.env.DATABASE_URL;
const { getDatabase } = usePostgres 
  ? require('../database/postgres-init') 
  : require('../database/init');

const router = express.Router();

// GET /api/properties - List all properties
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM properties ORDER BY name');
      const rows = result.rows || [];
      
      logger.info(`Retrieved ${rows.length} properties`);
      res.json(rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Properties endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching properties'
    });
  }
});

// GET /api/properties/code/:code - Get property by property code
router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM properties WHERE property_code = $1', [code]);
      const property = result.rows[0];
      
      if (!property) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Property not found'
        });
      }
      
      logger.info(`Retrieved property by code ${code}`);
      res.json(property);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Property by code endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the property'
    });
  }
});

// GET /api/properties/:id - Get a specific property
router.get('/:id', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    
    if (isNaN(propertyId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Property ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
      const property = result.rows[0];
      
      if (!property) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Property not found'
        });
      }
      
      logger.info(`Retrieved property ${propertyId}`);
      res.json(property);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Property endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the property'
    });
  }
});

// POST /api/properties - Create a new property
router.post('/', async (req, res) => {
  try {
    const { property_code, name, location, description, contact_info } = req.body;
    
    // Validate required fields
    if (!property_code || !name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property code and name are required'
      });
    }
    
    // Validate property code format (4 digits)
    if (!/^\d{4}$/.test(property_code)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property code must be exactly 4 digits'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(
        `INSERT INTO properties (property_code, name, location, description, contact_info) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [property_code, name, location || '', description || '', contact_info || '']
      );
      
      const property = result.rows[0];
      
      logger.info(`Created property ${property.id} with code ${property_code}`);
      res.status(201).json(property);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({
          error: 'Conflict',
          message: 'Property code already exists'
        });
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create property endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the property'
    });
  }
});

// PUT /api/properties/:id - Update a property
router.put('/:id', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    const { property_code, name, location, description, contact_info } = req.body;
    
    if (isNaN(propertyId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Property ID must be a number'
      });
    }
    
    // Validate required fields
    if (!property_code || !name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property code and name are required'
      });
    }
    
    // Validate property code format (4 digits)
    if (!/^\d{4}$/.test(property_code)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property code must be exactly 4 digits'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(
        `UPDATE properties 
         SET property_code = $1, name = $2, location = $3, description = $4, contact_info = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [property_code, name, location || '', description || '', contact_info || '', propertyId]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Property not found'
        });
      }
      
      const property = result.rows[0];
      
      logger.info(`Updated property ${propertyId}`);
      res.json(property);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({
          error: 'Conflict',
          message: 'Property code already exists'
        });
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update property endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the property'
    });
  }
});

// DELETE /api/properties/:id - Delete a property
router.delete('/:id', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    
    if (isNaN(propertyId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Property ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('DELETE FROM properties WHERE id = $1', [propertyId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Property not found'
        });
      }
      
      logger.info(`Deleted property ${propertyId}`);
      res.json({ message: 'Property deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete property endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the property'
    });
  }
});

// GET /api/properties/search/:query - Search properties by name, code, or location
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const searchTerm = `%${query}%`;
      
      const result = await client.query(
        `SELECT * FROM properties 
         WHERE name ILIKE $1 OR property_code ILIKE $2 OR location ILIKE $3
         ORDER BY 
           CASE 
             WHEN property_code = $4 THEN 1 
             WHEN name ILIKE $5 THEN 2 
             ELSE 3 
           END, 
           name`,
        [searchTerm, searchTerm, searchTerm, query, `${query}%`]
      );
      
      const rows = result.rows;
      
      logger.info(`Found ${rows.length} properties matching "${query}"`);
      res.json(rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Search properties endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while searching properties'
    });
  }
});

module.exports = router; 