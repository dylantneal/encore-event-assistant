const express = require('express');
const { getDatabase } = require('../database/init');
const { validateLaborRule } = require('../services/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// GET /api/labor-rules - List all labor rules (with optional property filter)
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { property_id } = req.query;
    
    let query = 'SELECT * FROM labor_rules';
    let params = [];
    
    if (property_id) {
      query += ' WHERE property_id = $1';
      params.push(parseInt(property_id));
    }
    
    query += ' ORDER BY rule_type, created_at DESC';
    
    const client = await db.connect();
    try {
      const result = await client.query(query, params);
      const rules = result.rows;
      
      // Parse rule_data JSON for each rule
      const parsedRules = rules.map(rule => ({
        ...rule,
        rule_data: JSON.parse(rule.rule_data)
      }));
      
      res.json(parsedRules);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Labor rules endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching labor rules'
    });
  }
});

// GET /api/labor-rules/:id - Get a specific labor rule
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const ruleId = parseInt(req.params.id);
    
    if (isNaN(ruleId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Rule ID must be a number'
      });
    }
    
    const client = await db.connect();
    try {
      const result = await client.query('SELECT * FROM labor_rules WHERE id = $1', [ruleId]);
      const rule = result.rows[0];
      
      if (!rule) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Labor rule not found'
        });
      }
      
      // Parse rule_data JSON
      const parsedRule = {
        ...rule,
        rule_data: JSON.parse(rule.rule_data)
      };
      
      res.json(parsedRule);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Labor rule endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the labor rule'
    });
  }
});

// POST /api/labor-rules - Create a new labor rule
router.post('/', async (req, res) => {
  try {
    const { property_id, rule_type, rule_data, description } = req.body;
    
    // Convert rule_data to JSON string if it's an object
    const ruleDataString = typeof rule_data === 'object' ? JSON.stringify(rule_data) : rule_data;
    
    // Validate input
    const validation = validateLaborRule({ 
      property_id, 
      rule_type, 
      rule_data: ruleDataString, 
      description 
    });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid labor rule data',
        details: validation.errors
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(
        'INSERT INTO labor_rules (property_id, rule_type, rule_data, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [property_id, rule_type, ruleDataString, description]
      );
      
      const rule = result.rows[0];
      
      // Parse rule_data JSON
      const parsedRule = {
        ...rule,
        rule_data: JSON.parse(rule.rule_data)
      };
      
      logger.info('Labor rule created successfully', { id: rule.id, rule_type, property_id });
      res.status(201).json(parsedRule);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create labor rule endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the labor rule'
    });
  }
});

// PUT /api/labor-rules/:id - Update a labor rule
router.put('/:id', async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    const { property_id, rule_type, rule_data, description } = req.body;
    
    if (isNaN(ruleId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Rule ID must be a number'
      });
    }
    
    // Convert rule_data to JSON string if it's an object
    const ruleDataString = typeof rule_data === 'object' ? JSON.stringify(rule_data) : rule_data;
    
    // Validate input
    const validation = validateLaborRule({ 
      property_id, 
      rule_type, 
      rule_data: ruleDataString, 
      description 
    });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid labor rule data',
        details: validation.errors
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(
        'UPDATE labor_rules SET property_id = $1, rule_type = $2, rule_data = $3, description = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
        [property_id, rule_type, ruleDataString, description, ruleId]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Labor rule not found'
        });
      }
      
      const rule = result.rows[0];
      
      // Parse rule_data JSON
      const parsedRule = {
        ...rule,
        rule_data: JSON.parse(rule.rule_data)
      };
      
      logger.info('Labor rule updated successfully', { id: ruleId, rule_type });
      res.json(parsedRule);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update labor rule endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the labor rule'
    });
  }
});

// DELETE /api/labor-rules/:id - Delete a labor rule
router.delete('/:id', async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    
    if (isNaN(ruleId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Rule ID must be a number'
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('DELETE FROM labor_rules WHERE id = $1', [ruleId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Labor rule not found'
        });
      }
      
      logger.info('Labor rule deleted successfully', { id: ruleId });
      res.json({
        message: 'Labor rule deleted successfully',
        id: ruleId
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete labor rule endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the labor rule'
    });
  }
});

// GET /api/labor-rules/types - Get all rule types
router.get('/types', async (req, res) => {
  try {
    const db = getDatabase();
    const { property_id } = req.query;
    
    let query = 'SELECT DISTINCT rule_type FROM labor_rules';
    let params = [];
    
    if (property_id) {
      query += ' WHERE property_id = $1';
      params.push(parseInt(property_id));
    }
    
    query += ' ORDER BY rule_type';
    
    const client = await db.connect();
    try {
      const result = await client.query(query, params);
      const types = result.rows;
      
      const ruleTypes = types.map(type => type.rule_type);
      res.json(ruleTypes);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Rule types endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching rule types'
    });
  }
});

module.exports = router; 