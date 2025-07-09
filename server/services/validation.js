const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');

/**
 * Validates inventory item data for creation/update
 */
const validateInventoryItem = (item) => {
  const errors = [];

  if (!item.property_id) {
    errors.push('Property ID is required');
  }

  if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!item.category || typeof item.category !== 'string' || item.category.trim().length === 0) {
    errors.push('Category is required and must be a non-empty string');
  }

  if (item.quantity_available !== undefined && 
      (typeof item.quantity_available !== 'number' || item.quantity_available < 0)) {
    errors.push('Quantity available must be a non-negative number');
  }

  if (item.status && !['available', 'maintenance', 'reserved', 'out_of_service'].includes(item.status)) {
    errors.push('Status must be one of: available, maintenance, reserved, out_of_service');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validates room data for creation/update
 */
const validateRoom = (room) => {
  const errors = [];

  if (!room.property_id) {
    errors.push('Property ID is required');
  }

  if (!room.name || typeof room.name !== 'string' || room.name.trim().length === 0) {
    errors.push('Room name is required and must be a non-empty string');
  }

  if (!room.capacity || typeof room.capacity !== 'number' || room.capacity <= 0) {
    errors.push('Capacity is required and must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validates labor rule data for creation/update
 */
const validateLaborRule = (rule) => {
  const errors = [];

  if (!rule.property_id) {
    errors.push('Property ID is required');
  }

  if (!rule.rule_type || typeof rule.rule_type !== 'string' || rule.rule_type.trim().length === 0) {
    errors.push('Rule type is required and must be a non-empty string');
  }

  if (!rule.rule_data) {
    errors.push('Rule data is required');
  } else {
    try {
      JSON.parse(rule.rule_data);
    } catch (e) {
      errors.push('Rule data must be valid JSON');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validates an event order against inventory limits, room capacity, and labor rules
 */
const validateOrder = async (equipmentList, propertyId, attendees, eventDuration) => {
  const db = getDatabase();
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    details: {
      inventory_check: { passed: true, items: [] },
      room_check: { passed: true, details: null },
      labor_check: { passed: true, details: null }
    }
  };

  let client;
  try {
    client = await db.connect();

    // 1. Validate inventory availability
    for (const equipmentItem of equipmentList) {
      const { item_name, quantity, category } = equipmentItem;
      
      // Query inventory for this item
      const result = await client.query(
        'SELECT * FROM inventory_items WHERE property_id = $1 AND (name = $2 OR category = $3) AND status = $4',
        [propertyId, item_name, category, 'available']
      );
      const inventoryItems = result.rows;

      let availableQuantity = 0;
      const matchingItems = [];

      for (const item of inventoryItems) {
        if (item.name === item_name || item.category === category) {
          availableQuantity += item.quantity_available;
          matchingItems.push({
            name: item.name,
            available: item.quantity_available,
            model: item.model
          });
        }
      }

      const itemValidation = {
        item_name,
        requested: quantity,
        available: availableQuantity,
        sufficient: availableQuantity >= quantity,
        matching_items: matchingItems
      };

      validation.details.inventory_check.items.push(itemValidation);

      if (!itemValidation.sufficient) {
        validation.valid = false;
        validation.details.inventory_check.passed = false;
        validation.errors.push(
          `Insufficient inventory for ${item_name}: requested ${quantity}, available ${availableQuantity}`
        );
      }
    }

    // 2. Validate room capacity (if room is specified in the order)
    // This would require the order to specify a room, which we'll check if available
    if (attendees) {
      const roomsResult = await client.query(
        'SELECT * FROM rooms WHERE property_id = $1 ORDER BY capacity ASC',
        [propertyId]
      );
      const rooms = roomsResult.rows;

      const suitableRooms = rooms.filter(room => room.capacity >= attendees);
      
      validation.details.room_check.details = {
        attendees,
        suitable_rooms: suitableRooms.length,
        rooms_available: suitableRooms.map(room => ({
          name: room.name,
          capacity: room.capacity,
          built_in_av: room.built_in_av
        }))
      };

      if (suitableRooms.length === 0) {
        validation.valid = false;
        validation.details.room_check.passed = false;
        validation.errors.push(
          `No rooms available for ${attendees} attendees. Largest available room has capacity ${Math.max(...rooms.map(r => r.capacity))}`
        );
      }
    }

    // 3. Validate labor requirements
    const laborRulesResult = await client.query(
      'SELECT * FROM labor_rules WHERE property_id = $1',
      [propertyId]
    );
    const laborRules = laborRulesResult.rows;

    // Parse labor rules
    const rules = {};
    laborRules.forEach(rule => {
      try {
        rules[rule.rule_type] = JSON.parse(rule.rule_data);
      } catch (e) {
        validation.warnings.push(`Invalid labor rule format for ${rule.rule_type}`);
      }
    });

    // Check technician requirements
    if (rules.technician_ratio && attendees) {
      const { attendees_per_tech, minimum_techs } = rules.technician_ratio;
      const requiredTechs = Math.max(minimum_techs || 1, Math.ceil(attendees / attendees_per_tech));
      
      validation.details.labor_check.details = {
        required_technicians: requiredTechs,
        based_on_attendees: attendees,
        ratio: attendees_per_tech
      };
    }

    // Check event duration against labor rules
    if (rules.union_requirements && eventDuration) {
      const { overtime_threshold } = rules.union_requirements;
      if (eventDuration > overtime_threshold) {
        validation.warnings.push(
          `Event duration (${eventDuration}h) exceeds overtime threshold (${overtime_threshold}h). Additional costs may apply.`
        );
      }
    }

    logger.info('Order validation completed', {
      propertyId,
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length
    });

  } catch (error) {
    logger.error('Error during order validation:', error);
    validation.valid = false;
    validation.errors.push('Validation service error: ' + error.message);
  } finally {
    if (client) {
      client.release();
    }
  }

  return validation;
};

/**
 * Validates if a room can support the requested equipment setup
 */
const validateRoomCapability = async (roomName, equipmentList, propertyId) => {
  const db = getDatabase();
  let client;
  
  try {
    client = await db.connect();
    
    const result = await client.query(
      'SELECT * FROM rooms WHERE property_id = $1 AND name = $2',
      [propertyId, roomName]
    );
    const room = result.rows[0];

    if (!room) {
      return {
        compatible: false,
        reason: 'Room not found',
        room_name: roomName
      };
    }

    const builtInAV = (room.built_in_av || '').toLowerCase();
    const features = (room.features || '').toLowerCase();
    const roomInfo = builtInAV + ' ' + features;

    const compatibility = {
      compatible: true,
      room_info: {
        name: room.name,
        capacity: room.capacity,
        dimensions: room.dimensions,
        built_in_av: room.built_in_av,
        features: room.features
      },
      equipment_notes: [],
      requirements: []
    };

    // Check each piece of equipment against room capabilities
    equipmentList.forEach(equipment => {
      const equipmentLower = equipment.toLowerCase();
      
      if (equipmentLower.includes('projector') || equipmentLower.includes('projection')) {
        if (!roomInfo.includes('projection') && !roomInfo.includes('screen')) {
          compatibility.equipment_notes.push(
            `${equipment}: Room has no built-in projection capability. Will need portable setup.`
          );
          compatibility.requirements.push('portable_projection_screen');
        }
      }
      
      if (equipmentLower.includes('audio') || equipmentLower.includes('sound') || equipmentLower.includes('microphone')) {
        if (!roomInfo.includes('sound') && !roomInfo.includes('audio')) {
          compatibility.equipment_notes.push(
            `${equipment}: Room has no built-in audio system. Will need full audio setup.`
          );
          compatibility.requirements.push('portable_audio_system');
        }
      }
      
      if (equipmentLower.includes('lighting')) {
        if (!roomInfo.includes('lighting') && !roomInfo.includes('stage')) {
          compatibility.equipment_notes.push(
            `${equipment}: Room lighting may need enhancement for this setup.`
          );
          compatibility.requirements.push('additional_lighting');
        }
      }
    });

    return compatibility;

  } catch (error) {
    logger.error('Error validating room capability:', error);
    return {
      compatible: false,
      reason: 'Validation error: ' + error.message,
      room_name: roomName
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  validateInventoryItem,
  validateRoom,
  validateLaborRule,
  validateOrder,
  validateRoomCapability
}; 