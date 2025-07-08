const express = require('express');
const { getDatabase } = require('../database/init');
const { validateInventoryItem } = require('../services/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// GET /api/inventory - List all inventory items (with optional property filter)
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { property_id, category, status } = req.query;
    
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
    
    const client = await db.connect();
    try {
      const result = await client.query(query, params);
      
      res.json({
        items: result.rows,
        total: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Inventory endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching inventory items'
    });
  }
});

// GET /api/inventory/:id - Get a specific inventory item
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const itemId = parseInt(req.params.id);
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Item ID must be a number'
      });
    }
    
    db.get('SELECT * FROM inventory_items WHERE id = ?', [itemId], (err, item) => {
      if (err) {
        logger.error('Error fetching inventory item:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to fetch inventory item'
        });
      }
      
      if (!item) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Inventory item not found'
        });
      }
      
      res.json(item);
    });
  } catch (error) {
    logger.error('Inventory item endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the inventory item'
    });
  }
});

// POST /api/inventory - Create a new inventory item
router.post('/', async (req, res) => {
  try {
    const { 
      property_id, 
      name, 
      description, 
      category, 
      sub_category, 
      quantity_available, 
      status, 
      asset_tag, 
      model, 
      manufacturer, 
      condition_notes 
    } = req.body;
    
    // Validate input
    const validation = validateInventoryItem({ 
      property_id, 
      name, 
      description, 
      category, 
      sub_category, 
      quantity_available, 
      status 
    });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid inventory item data',
        details: validation.errors
      });
    }
    
    const db = getDatabase();
    
    db.run(
      `INSERT INTO inventory_items 
       (property_id, name, description, category, sub_category, quantity_available, status, asset_tag, model, manufacturer, condition_notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [property_id, name, description, category, sub_category, quantity_available || 0, status || 'available', asset_tag, model, manufacturer, condition_notes],
      function(err) {
        if (err) {
          logger.error('Error creating inventory item:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to create inventory item'
          });
        }
        
        // Fetch the created item
        db.get('SELECT * FROM inventory_items WHERE id = ?', [this.lastID], (err, item) => {
          if (err) {
            logger.error('Error fetching created inventory item:', err);
            return res.status(500).json({
              error: 'Database Error',
              message: 'Inventory item created but failed to fetch details'
            });
          }
          
          logger.info('Inventory item created successfully', { id: this.lastID, name, property_id });
          res.status(201).json(item);
        });
      }
    );
  } catch (error) {
    logger.error('Create inventory item endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the inventory item'
    });
  }
});

// PUT /api/inventory/:id - Update an inventory item
router.put('/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { 
      property_id, 
      name, 
      description, 
      category, 
      sub_category, 
      quantity_available, 
      status, 
      asset_tag, 
      model, 
      manufacturer, 
      condition_notes 
    } = req.body;
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Item ID must be a number'
      });
    }
    
    // Validate input
    const validation = validateInventoryItem({ 
      property_id, 
      name, 
      description, 
      category, 
      sub_category, 
      quantity_available, 
      status 
    });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid inventory item data',
        details: validation.errors
      });
    }
    
    const db = getDatabase();
    
    db.run(
      `UPDATE inventory_items 
       SET property_id = ?, name = ?, description = ?, category = ?, sub_category = ?, 
           quantity_available = ?, status = ?, asset_tag = ?, model = ?, manufacturer = ?, 
           condition_notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [property_id, name, description, category, sub_category, quantity_available || 0, status || 'available', asset_tag, model, manufacturer, condition_notes, itemId],
      function(err) {
        if (err) {
          logger.error('Error updating inventory item:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to update inventory item'
          });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Inventory item not found'
          });
        }
        
        // Fetch the updated item
        db.get('SELECT * FROM inventory_items WHERE id = ?', [itemId], (err, item) => {
          if (err) {
            logger.error('Error fetching updated inventory item:', err);
            return res.status(500).json({
              error: 'Database Error',
              message: 'Inventory item updated but failed to fetch details'
            });
          }
          
          logger.info('Inventory item updated successfully', { id: itemId, name });
          res.json(item);
        });
      }
    );
  } catch (error) {
    logger.error('Update inventory item endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the inventory item'
    });
  }
});

// DELETE /api/inventory/:id - Delete an inventory item
router.delete('/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Item ID must be a number'
      });
    }
    
    const db = getDatabase();
    
    db.run('DELETE FROM inventory_items WHERE id = ?', [itemId], function(err) {
      if (err) {
        logger.error('Error deleting inventory item:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to delete inventory item'
        });
      }
      
      if (this.changes === 0) {
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
    });
  } catch (error) {
    logger.error('Delete inventory item endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the inventory item'
    });
  }
});

// GET /api/inventory/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const db = getDatabase();
    const { property_id } = req.query;
    
    let query = 'SELECT DISTINCT category, sub_category FROM inventory_items';
    let params = [];
    
    if (property_id) {
      query += ' WHERE property_id = ?';
      params.push(parseInt(property_id));
    }
    
    query += ' ORDER BY category, sub_category';
    
    db.all(query, params, (err, categories) => {
      if (err) {
        logger.error('Error fetching categories:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to fetch categories'
        });
      }
      
      // Group by category
      const grouped = {};
      categories.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        if (item.sub_category) {
          grouped[item.category].push(item.sub_category);
        }
      });
      
      res.json(grouped);
    });
  } catch (error) {
    logger.error('Categories endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching categories'
    });
  }
});

module.exports = router; 