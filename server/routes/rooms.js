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
    
    db.run(
      'INSERT INTO rooms (property_id, name, capacity, dimensions, built_in_av, features) VALUES (?, ?, ?, ?, ?, ?)',
      [property_id, name, capacity, dimensions, built_in_av, features],
      function(err) {
        if (err) {
          logger.error('Error creating room:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to create room'
          });
        }
        
        // Fetch the created room
        db.get('SELECT * FROM rooms WHERE id = ?', [this.lastID], (err, room) => {
          if (err) {
            logger.error('Error fetching created room:', err);
            return res.status(500).json({
              error: 'Database Error',
              message: 'Room created but failed to fetch details'
            });
          }
          
          logger.info('Room created successfully', { id: this.lastID, name, property_id });
          res.status(201).json(room);
        });
      }
    );
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
    
    db.run(
      'UPDATE rooms SET property_id = ?, name = ?, capacity = ?, dimensions = ?, built_in_av = ?, features = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [property_id, name, capacity, dimensions, built_in_av, features, roomId],
      function(err) {
        if (err) {
          logger.error('Error updating room:', err);
          return res.status(500).json({
            error: 'Database Error',
            message: 'Failed to update room'
          });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Room not found'
          });
        }
        
        // Fetch the updated room
        db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
          if (err) {
            logger.error('Error fetching updated room:', err);
            return res.status(500).json({
              error: 'Database Error',
              message: 'Room updated but failed to fetch details'
            });
          }
          
          logger.info('Room updated successfully', { id: roomId, name });
          res.json(room);
        });
      }
    );
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
    
    db.run('DELETE FROM rooms WHERE id = ?', [roomId], function(err) {
      if (err) {
        logger.error('Error deleting room:', err);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to delete room'
        });
      }
      
      if (this.changes === 0) {
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
    });
  } catch (error) {
    logger.error('Delete room endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the room'
    });
  }
});

module.exports = router; 