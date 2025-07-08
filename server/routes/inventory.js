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
        description, 
        category, 
        sub_category, 
        quantity_available || 0, 
        status || 'available', 
        asset_tag, 
        model, 
        manufacturer, 
        condition_notes
      ]);
      
      logger.info('Inventory item created successfully', { id: result.rows[0].id, name, property_id });
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
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
        description, 
        category, 
        sub_category, 
        quantity_available || 0, 
        status || 'available', 
        asset_tag, 
        model, 
        manufacturer, 
        condition_notes, 
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
      query += ' WHERE property_id = $1';
      params.push(parseInt(property_id));
    }
    
    query += ' ORDER BY category, sub_category';
    
    const client = await db.connect();
    try {
      const result = await client.query(query, params);
      
      // Group by category
      const grouped = {};
      result.rows.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        if (item.sub_category) {
          grouped[item.category].push(item.sub_category);
        }
      });
      
      res.json(grouped);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Categories endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching categories'
    });
  }
});

module.exports = router; 