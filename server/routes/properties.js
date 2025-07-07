const express = require('express');
const { getDatabase } = require('../database/init');
// const { validateProperty } = require('../services/validation'); // Not needed - validation is inline
const { logger } = require('../utils/logger');

const router = express.Router();

// GET /api/properties - List all properties
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    db.all('SELECT * FROM properties ORDER BY name', (err, rows) => {
      if (err) {
        logger.error('Error fetching properties:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to fetch properties'
        });
      }
      
      logger.info(`Retrieved ${rows.length} properties`);
      res.json(rows);
    });
  } catch (error) {
    logger.error('Properties endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching properties'
    });
  }
});

// GET /api/properties/:id - Get a specific property
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const propertyId = parseInt(req.params.id);
    
    if (isNaN(propertyId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Property ID must be a number'
      });
    }
    
    db.get('SELECT * FROM properties WHERE id = ?', [propertyId], (err, property) => {
      if (err) {
        logger.error('Error fetching property:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to fetch property'
        });
      }
      
      if (!property) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Property not found'
        });
      }
      
      logger.info(`Retrieved property ${propertyId}`);
      res.json(property);
    });
  } catch (error) {
    logger.error('Property endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the property'
    });
  }
});

// GET /api/properties/code/:code - Get property by property code
router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const db = getDatabase();
    
    db.get('SELECT * FROM properties WHERE property_code = ?', [code], (err, property) => {
      if (err) {
        logger.error('Error fetching property by code:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to fetch property'
        });
      }
      
      if (!property) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Property not found'
        });
      }
      
      logger.info(`Retrieved property by code ${code}`);
      res.json(property);
    });
  } catch (error) {
    logger.error('Property by code endpoint error:', error);
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
    
    db.run(
      `INSERT INTO properties (property_code, name, location, description, contact_info) 
       VALUES (?, ?, ?, ?, ?)`,
      [property_code, name, location || '', description || '', contact_info || ''],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
              error: 'Conflict',
              message: 'Property code already exists'
            });
          }
          
          logger.error('Error creating property:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to create property'
          });
        }
        
        // Fetch the created property
        db.get('SELECT * FROM properties WHERE id = ?', [this.lastID], (err, property) => {
          if (err) {
            logger.error('Error fetching created property:', err);
            return res.status(500).json({
              error: 'Database Error',
              message: 'Property created but failed to fetch details'
            });
          }
          
          logger.info(`Created property ${this.lastID} with code ${property_code}`);
          res.status(201).json(property);
        });
      }
    );
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
    
    db.run(
      `UPDATE properties 
       SET property_code = ?, name = ?, location = ?, description = ?, contact_info = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [property_code, name, location || '', description || '', contact_info || '', propertyId],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
              error: 'Conflict',
              message: 'Property code already exists'
            });
          }
          
          logger.error('Error updating property:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to update property'
          });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Property not found'
          });
        }
        
        // Fetch the updated property
        db.get('SELECT * FROM properties WHERE id = ?', [propertyId], (err, property) => {
          if (err) {
            logger.error('Error fetching updated property:', err);
            return res.status(500).json({
              error: 'Database Error',
              message: 'Property updated but failed to fetch details'
            });
          }
          
          logger.info(`Updated property ${propertyId}`);
          res.json(property);
        });
      }
    );
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
    
    db.run('DELETE FROM properties WHERE id = ?', [propertyId], function(err) {
      if (err) {
        logger.error('Error deleting property:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to delete property'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Property not found'
        });
      }
      
      logger.info(`Deleted property ${propertyId}`);
      res.json({ message: 'Property deleted successfully' });
    });
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
    
    const searchTerm = `%${query}%`;
    
    db.all(
      `SELECT * FROM properties 
       WHERE name LIKE ? OR property_code LIKE ? OR location LIKE ?
       ORDER BY 
         CASE 
           WHEN property_code = ? THEN 1 
           WHEN name LIKE ? THEN 2 
           ELSE 3 
         END, 
         name`,
      [searchTerm, searchTerm, searchTerm, query, `${query}%`],
      (err, rows) => {
        if (err) {
          logger.error('Error searching properties:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to search properties'
          });
        }
        
        logger.info(`Found ${rows.length} properties matching "${query}"`);
        res.json(rows);
      }
    );
  } catch (error) {
    logger.error('Search properties endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while searching properties'
    });
  }
});

module.exports = router; 