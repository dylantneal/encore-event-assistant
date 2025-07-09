const express = require('express');
const { getDatabase } = require('../database/init');
const { validateRoom } = require('../services/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// GET /api/rooms - List all rooms (with optional property filter)
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { property_id } = req.query;
    
    let query = 'SELECT * FROM rooms';
    let params = [];
    
    if (property_id) {
      query += ' WHERE property_id = $1';
      params.push(parseInt(property_id));
    }
    
    query += ' ORDER BY created_at DESC';
    
    const client = await db.connect();
    try {
      const result = await client.query(query, params);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Rooms endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching rooms'
    });
  }
});

// GET /api/rooms/:id - Get a specific room
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const roomId = parseInt(req.params.id);
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Room ID must be a number'
      });
    }
    
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
    logger.error('Room endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the room'
    });
  }
});

// POST /api/rooms - Create a new room
router.post('/', async (req, res) => {
  try {
    const { property_id, name, capacity, dimensions, built_in_av, features } = req.body;
    
    // Validate input
    const validation = validateRoom({ property_id, name, capacity, dimensions, built_in_av, features });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid room data',
        details: validation.errors
      });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO rooms (property_id, name, capacity, dimensions, built_in_av, features) 
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [property_id, name, capacity, dimensions, built_in_av, features]);
      
      logger.info('Room created successfully', { id: result.rows[0].id, name, property_id });
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create room endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the room'
    });
  }
});

// PUT /api/rooms/:id - Update a room
router.put('/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const { property_id, name, capacity, dimensions, built_in_av, features } = req.body;
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Room ID must be a number'
      });
    }
    
    // Validate input
    const validation = validateRoom({ property_id, name, capacity, dimensions, built_in_av, features });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid room data',
        details: validation.errors
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
      `, [property_id, name, capacity, dimensions, built_in_av, features, roomId]);
      
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
    logger.error('Update room endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the room'
    });
  }
});

// DELETE /api/rooms/:id - Delete a room
router.delete('/:id', async (req, res) => {
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
    logger.error('Delete room endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the room'
    });
  }
});

module.exports = router; 