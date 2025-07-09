const express = require('express');
const router = express.Router();

// Auto-detect database type and get the appropriate database connection
const usePostgres = !!process.env.DATABASE_URL;
const { getDatabase } = usePostgres 
  ? require('../database/postgres-init') 
  : require('../database/init');

const { logger } = require('../utils/logger');

// Validation functions
const validateUnion = (union) => {
  const errors = [];
  
  if (!union.local_number || union.local_number.trim() === '') {
    errors.push('Local number is required');
  }
  
  if (!union.name || union.name.trim() === '') {
    errors.push('Union name is required');
  }
  
  if (!union.trade || union.trade.trim() === '') {
    errors.push('Trade is required');
  }
  
  if (union.regular_rate && (isNaN(union.regular_rate) || union.regular_rate < 0)) {
    errors.push('Regular rate must be a positive number');
  }
  
  if (union.overtime_rate && (isNaN(union.overtime_rate) || union.overtime_rate < 0)) {
    errors.push('Overtime rate must be a positive number');
  }
  
  if (union.doubletime_rate && (isNaN(union.doubletime_rate) || union.doubletime_rate < 0)) {
    errors.push('Doubletime rate must be a positive number');
  }
  
  if (union.overtime_threshold && (isNaN(union.overtime_threshold) || union.overtime_threshold < 1)) {
    errors.push('Overtime threshold must be at least 1 hour');
  }
  
  if (union.doubletime_threshold && (isNaN(union.doubletime_threshold) || union.doubletime_threshold < 1)) {
    errors.push('Doubletime threshold must be at least 1 hour');
  }
  
  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (union.regular_hours_start && !timeRegex.test(union.regular_hours_start)) {
    errors.push('Regular hours start must be in HH:MM format');
  }
  
  if (union.regular_hours_end && !timeRegex.test(union.regular_hours_end)) {
    errors.push('Regular hours end must be in HH:MM format');
  }
  
  return errors;
};

// GET /api/unions - Get all unions for a property
router.get('/', async (req, res) => {
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
      
      logger.info(`Retrieved ${result.rows.length} unions for property ${property_id}`);
      
      res.json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error fetching unions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch unions',
      error: error.message 
    });
  }
});

// GET /api/unions/:id - Get specific union
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM unions WHERE id = $1', [id]);
      
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
    logger.error('Error fetching union details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch union details',
      error: error.message 
    });
  }
});

// POST /api/unions - Create new union
router.post('/', async (req, res) => {
  try {
    const union = req.body;
    
    // Validate input
    const errors = validateUnion(union);
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors 
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
        RETURNING id
      `, [
        union.property_id,
        union.local_number,
        union.name,
        union.trade,
        union.regular_hours_start || '08:00',
        union.regular_hours_end || '17:00',
        union.regular_rate || null,
        union.overtime_rate || null,
        union.doubletime_rate || null,
        union.overtime_threshold || 8,
        union.doubletime_threshold || 12,
        union.weekend_rules || '',
        union.holiday_rules || '',
        union.contact_info || '',
        union.notes || ''
      ]);
      
      logger.info(`Created union: Local ${union.local_number} - ${union.name}`);
      
      res.status(201).json({
        success: true,
        message: 'Union created successfully',
        data: { id: result.rows[0].id, ...union }
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error creating union:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create union',
      error: error.message 
    });
  }
});

// PUT /api/unions/:id - Update union
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const union = req.body;
    
    // Validate input
    const errors = validateUnion(union);
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors 
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        UPDATE unions SET 
          local_number = $1, name = $2, trade = $3,
          regular_hours_start = $4, regular_hours_end = $5,
          regular_rate = $6, overtime_rate = $7, doubletime_rate = $8,
          overtime_threshold = $9, doubletime_threshold = $10,
          weekend_rules = $11, holiday_rules = $12, contact_info = $13, notes = $14,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $15
      `, [
        union.local_number,
        union.name,
        union.trade,
        union.regular_hours_start || '08:00',
        union.regular_hours_end || '17:00',
        union.regular_rate || null,
        union.overtime_rate || null,
        union.doubletime_rate || null,
        union.overtime_threshold || 8,
        union.doubletime_threshold || 12,
        union.weekend_rules || '',
        union.holiday_rules || '',
        union.contact_info || '',
        union.notes || '',
        id
      ]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Union not found' 
        });
      }
      
      logger.info(`Updated union: Local ${union.local_number} - ${union.name}`);
      
      res.json({
        success: true,
        message: 'Union updated successfully',
        data: { id: parseInt(id), ...union }
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error updating union:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update union',
      error: error.message 
    });
  }
});

// DELETE /api/unions/:id - Delete union
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('DELETE FROM unions WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Union not found' 
        });
      }
      
      logger.info(`Deleted union with ID: ${id}`);
      
      res.json({
        success: true,
        message: 'Union deleted successfully'
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error deleting union:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete union',
      error: error.message 
    });
  }
});

// POST /api/unions/:id/schedules - Add schedule rule
router.post('/:id/schedules', async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = req.body;
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO union_schedules (
          union_id, day_of_week, start_time, end_time, 
          rate_type, rate_multiplier, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        id,
        schedule.day_of_week,
        schedule.start_time,
        schedule.end_time,
        schedule.rate_type,
        schedule.rate_multiplier,
        schedule.description || ''
      ]);
      
      res.status(201).json({
        success: true,
        message: 'Schedule rule added successfully',
        data: { id: result.rows[0].id, ...schedule }
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error adding schedule rule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add schedule rule',
      error: error.message 
    });
  }
});

// POST /api/unions/:id/equipment - Add equipment requirement
router.post('/:id/equipment', async (req, res) => {
  try {
    const { id } = req.params;
    const equipment = req.body;
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO union_equipment_requirements (
          union_id, equipment_category, equipment_type, 
          is_required, minimum_crew_size, notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        id,
        equipment.equipment_category,
        equipment.equipment_type,
        equipment.is_required ? true : false,
        equipment.minimum_crew_size || 1,
        equipment.notes || ''
      ]);
      
      res.status(201).json({
        success: true,
        message: 'Equipment requirement added successfully',
        data: { id: result.rows[0].id, ...equipment }
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error adding equipment requirement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add equipment requirement',
      error: error.message 
    });
  }
});

// POST /api/unions/:id/venue-rules - Add venue-specific rule
router.post('/:id/venue-rules', async (req, res) => {
  try {
    const { id } = req.params;
    const rule = req.body;
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO union_venue_rules (
          union_id, room_id, rule_type, condition_text,
          threshold_value, threshold_unit, action_required, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        id,
        rule.room_id || null,
        rule.rule_type,
        rule.condition_text,
        rule.threshold_value || null,
        rule.threshold_unit || null,
        rule.action_required || '',
        rule.notes || ''
      ]);
      
      res.status(201).json({
        success: true,
        message: 'Venue rule added successfully',
        data: { id: result.rows[0].id, ...rule }
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error adding venue rule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add venue rule',
      error: error.message 
    });
  }
});

// GET /api/unions/for-ai/:property_id - Get union info formatted for AI
router.get('/for-ai/:property_id', async (req, res) => {
  try {
    const { property_id } = req.params;
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      // Get all unions with their complex rules for AI processing
      const result = await client.query(`
        SELECT 
          u.*,
          STRING_AGG(DISTINCT 
            CASE WHEN us.day_of_week IS NOT NULL 
            THEN 'Day ' || us.day_of_week || ': ' || us.start_time || '-' || us.end_time || ' (' || us.rate_type || ' ' || us.rate_multiplier || 'x)'
            END, ', '
          ) as schedule_rules,
          STRING_AGG(DISTINCT 
            CASE WHEN uer.equipment_category IS NOT NULL 
            THEN uer.equipment_category || '/' || uer.equipment_type || ' (crew: ' || uer.minimum_crew_size || ')'
            END, ', '
          ) as equipment_rules,
          STRING_AGG(DISTINCT 
            CASE WHEN uvr.condition_text IS NOT NULL 
            THEN uvr.condition_text || ' -> ' || uvr.action_required
            END, ', '
          ) as venue_rules
        FROM unions u
        LEFT JOIN union_schedules us ON u.id = us.union_id
        LEFT JOIN union_equipment_requirements uer ON u.id = uer.union_id
        LEFT JOIN union_venue_rules uvr ON u.id = uvr.union_id
        WHERE u.property_id = $1
        GROUP BY u.id
        ORDER BY u.local_number, u.name
      `, [property_id]);
      
      const unions = result.rows;
      
      // Format for AI consumption
      const aiFormattedUnions = unions.map(union => ({
        id: union.id,
        local_number: union.local_number,
        name: union.name,
        trade: union.trade,
        basic_info: {
          regular_hours: `${union.regular_hours_start} - ${union.regular_hours_end}`,
          regular_rate: union.regular_rate ? `$${union.regular_rate}/hour` : 'Not specified',
          overtime_rate: union.overtime_rate ? `$${union.overtime_rate}/hour (after ${union.overtime_threshold} hours)` : 'Not specified',
          doubletime_rate: union.doubletime_rate ? `$${union.doubletime_rate}/hour (after ${union.doubletime_threshold} hours)` : 'Not specified'
        },
        weekend_rules: union.weekend_rules || 'Not specified',
        holiday_rules: union.holiday_rules || 'Not specified',
        schedule_rules: union.schedule_rules || 'Standard schedule only',
        equipment_rules: union.equipment_rules || 'No specific equipment requirements',
        venue_rules: union.venue_rules || 'No venue-specific rules',
        contact_info: union.contact_info || 'Not provided',
        notes: union.notes || 'No additional notes'
      }));
      
      res.json({
        success: true,
        data: aiFormattedUnions,
        summary: `${unions.length} unions configured for this property with detailed labor rules and requirements.`
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Error fetching unions for AI:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch union information for AI',
      error: error.message 
    });
  }
});

module.exports = router; 