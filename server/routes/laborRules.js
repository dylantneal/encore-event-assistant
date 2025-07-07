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
      query += ' WHERE property_id = ?';
      params.push(parseInt(property_id));
    }
    
    query += ' ORDER BY rule_type, created_at DESC';
    
    db.all(query, params, (err, rules) => {
      if (err) {
        logger.error('Error fetching labor rules:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to fetch labor rules'
        });
      }
      
      // Parse rule_data JSON for each rule
      const parsedRules = rules.map(rule => ({
        ...rule,
        rule_data: JSON.parse(rule.rule_data)
      }));
      
      res.json(parsedRules);
    });
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
    
    db.get('SELECT * FROM labor_rules WHERE id = ?', [ruleId], (err, rule) => {
      if (err) {
        logger.error('Error fetching labor rule:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to fetch labor rule'
        });
      }
      
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
    });
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
    
    db.run(
      'INSERT INTO labor_rules (property_id, rule_type, rule_data, description) VALUES (?, ?, ?, ?)',
      [property_id, rule_type, ruleDataString, description],
      function(err) {
        if (err) {
          logger.error('Error creating labor rule:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to create labor rule'
          });
        }
        
        // Fetch the created rule
        db.get('SELECT * FROM labor_rules WHERE id = ?', [this.lastID], (err, rule) => {
          if (err) {
            logger.error('Error fetching created labor rule:', err);
            return res.status(500).json({
              error: 'Database Error',
              message: 'Labor rule created but failed to fetch details'
            });
          }
          
          // Parse rule_data JSON
          const parsedRule = {
            ...rule,
            rule_data: JSON.parse(rule.rule_data)
          };
          
          logger.info('Labor rule created successfully', { id: this.lastID, rule_type, property_id });
          res.status(201).json(parsedRule);
        });
      }
    );
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
    
    db.run(
      'UPDATE labor_rules SET property_id = ?, rule_type = ?, rule_data = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [property_id, rule_type, ruleDataString, description, ruleId],
      function(err) {
        if (err) {
          logger.error('Error updating labor rule:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to update labor rule'
          });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Labor rule not found'
          });
        }
        
        // Fetch the updated rule
        db.get('SELECT * FROM labor_rules WHERE id = ?', [ruleId], (err, rule) => {
          if (err) {
            logger.error('Error fetching updated labor rule:', err);
            return res.status(500).json({
              error: 'Database Error',
              message: 'Labor rule updated but failed to fetch details'
            });
          }
          
          // Parse rule_data JSON
          const parsedRule = {
            ...rule,
            rule_data: JSON.parse(rule.rule_data)
          };
          
          logger.info('Labor rule updated successfully', { id: ruleId, rule_type });
          res.json(parsedRule);
        });
      }
    );
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
    
    db.run('DELETE FROM labor_rules WHERE id = ?', [ruleId], function(err) {
      if (err) {
        logger.error('Error deleting labor rule:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to delete labor rule'
        });
      }
      
      if (this.changes === 0) {
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
    });
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
      query += ' WHERE property_id = ?';
      params.push(parseInt(property_id));
    }
    
    query += ' ORDER BY rule_type';
    
    db.all(query, params, (err, types) => {
      if (err) {
        logger.error('Error fetching rule types:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to fetch rule types'
        });
      }
      
      const ruleTypes = types.map(type => type.rule_type);
      res.json(ruleTypes);
    });
  } catch (error) {
    logger.error('Rule types endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching rule types'
    });
  }
});

module.exports = router; 