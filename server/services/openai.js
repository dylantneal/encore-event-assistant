const OpenAI = require('openai');
const { logger } = require('../utils/logger');
const { getDatabase } = require('../database/init');
const { validateOrder } = require('./validation');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FUNCTION_CALLS = 5;
const MAX_VALIDATION_RETRIES = 3;

class OpenAIService {
  constructor() {
    // Don't initialize database connection here - it will be initialized by the server
    this.db = null;
  }

  getDb() {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  async processConversation(messages, propertyId) {
    try {
      console.log('Starting processConversation for property:', propertyId);
      
      // Get real inventory data from database
      const inventory = await this.getRealInventory(propertyId);
      console.log('Retrieved real inventory data:', inventory.length, 'items');
      
      // Get rooms data for this property
      const rooms = await this.getRooms(propertyId);
      console.log('Retrieved rooms data:', rooms.length, 'rooms');
      
      // Build system message with actual inventory and rooms
      let systemMessage;
      
      const roomsList = rooms.length > 0 ? 
        rooms.map(room => `- ${room.name}: Capacity ${room.capacity} people${room.built_in_av ? ', Built-in AV: ' + room.built_in_av : ''}${room.features ? ', Features: ' + room.features : ''}`).join('\n') :
        '- No rooms configured yet';
      
      if (inventory.length === 0) {
        systemMessage = `You are an AI assistant for Encore Event Services at the selected property. 

AVAILABLE ROOMS:
${roomsList}

INVENTORY STATUS: No inventory data has been uploaded for this property yet.

Please inform the user that inventory data needs to be uploaded through the admin interface before I can provide equipment recommendations. Admins can upload Excel inventory files through the admin panel at the "Inventory" section.

IMPORTANT: When users mention a specific room name, use the check_room_capabilities function to provide detailed room information and assess equipment compatibility.

I cannot make equipment recommendations until inventory data is available for this property.`;
      } else {
        const inventoryList = inventory.map(item => 
          `- ${item.name} ${item.model ? 'Model ' + item.model : ''}: ${item.quantity_available} units available (${item.description})`
        ).join('\n');
        
        systemMessage = `You are an AI assistant for Encore Event Services at the selected property. 

AVAILABLE ROOMS:
${roomsList}

AVAILABLE EQUIPMENT INVENTORY:
${inventoryList}

IMPORTANT: When recommending equipment, always use the EXACT item names and model numbers from this inventory list. Only recommend equipment that is actually available in the inventory above.

IMPORTANT: When users mention a specific room name, use the check_room_capabilities function to provide detailed room information and assess equipment compatibility.

I can help you create a detailed equipment list from our available inventory and provide room-specific setup guidance.`;
      }
      
      // Prepare messages array
      const chatMessages = [
        { role: 'system', content: systemMessage },
        ...messages
      ];

      // Define available functions
      const functions = this.getFunctionDefinitions();

      console.log('Sending request to OpenAI with functions enabled');
      
      let response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: chatMessages,
        functions: functions,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 2000
      });
      
      console.log('OpenAI response received');

      // Handle function calls
      let functionCallCount = 0;
      while (response.choices[0].message.function_call && functionCallCount < MAX_FUNCTION_CALLS) {
        const functionCall = response.choices[0].message.function_call;
        const functionName = functionCall.name;
        const functionArgs = JSON.parse(functionCall.arguments);

        logger.info(`AI function call: ${functionName}`, functionArgs);

        // Add the function call to chat history
        chatMessages.push(response.choices[0].message);

        // Execute the function
        const functionResult = await this.executeFunction(functionName, functionArgs, propertyId);

        // Add function result to chat history
        chatMessages.push({
          role: 'function',
          name: functionName,
          content: JSON.stringify(functionResult)
        });

        // Get next response
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: chatMessages,
          functions: functions,
          function_call: 'auto',
          temperature: 0.7,
          max_tokens: 2000
        });

        functionCallCount++;
      }

      return {
        message: response.choices[0].message.content,
        usage: response.usage,
        functionCallCount
      };

    } catch (error) {
      console.error('OpenAI API error details:', error);
      logger.error('OpenAI API error:', error);
      throw { type: 'openai', message: error.message };
    }
  }

  async getRealInventory(propertyId) {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT name, model, description, quantity_available, category, sub_category FROM inventory_items WHERE property_id = ? AND status = "available" ORDER BY category, name',
        [propertyId],
        (err, items) => {
          if (err) reject(err);
          else resolve(items || []);
        }
      );
    });
  }

  async getRooms(propertyId) {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT name, capacity, dimensions, built_in_av, features FROM rooms WHERE property_id = ? ORDER BY name',
        [propertyId],
        (err, rooms) => {
          if (err) reject(err);
          else resolve(rooms || []);
        }
      );
    });
  }

  async getBasicProperty(propertyId) {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM properties WHERE id = ?', [propertyId], (err, property) => {
        if (err) reject(err);
        else resolve(property);
      });
    });
  }

  async getPropertyContext(propertyId) {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const context = {};

      // Get property info
      db.get('SELECT * FROM properties WHERE id = ?', [propertyId], (err, property) => {
        if (err) {
          reject(err);
          return;
        }

        context.property = property;

        // Get rooms
        db.all('SELECT * FROM rooms WHERE property_id = ?', [propertyId], (err, rooms) => {
          if (err) {
            reject(err);
            return;
          }

          context.rooms = rooms;

          // Get inventory summary
          db.all(
            'SELECT category, sub_category, COUNT(*) as count, SUM(quantity_available) as total_quantity FROM inventory_items WHERE property_id = ? AND status = "available" GROUP BY category, sub_category',
            [propertyId],
            (err, inventory) => {
              if (err) {
                reject(err);
                return;
              }

              context.inventory = inventory;

              // Get labor rules
              db.all('SELECT * FROM labor_rules WHERE property_id = ?', [propertyId], (err, laborRules) => {
                if (err) {
                  reject(err);
                  return;
                }

                context.laborRules = laborRules;
                resolve(context);
              });
            }
          );
        });
      });
    });
  }

  buildSystemMessage(propertyData) {
    const roomInfo = propertyData.rooms.map(room => 
      `${room.name}: Capacity ${room.capacity || 'not specified'}, ${room.dimensions || 'dimensions not specified'}, Built-in AV: ${room.built_in_av || 'none'}, Features: ${room.features || 'none'}`
    ).join('\n');

    return `You are an expert event planning assistant for ${propertyData.property.name}, a premier event venue in Chicago. You help clients plan events by understanding their requirements and providing detailed information about rooms, inventory, labor requirements, and costs.

PROPERTY INFORMATION:
${propertyData.property.name}
Address: ${propertyData.property.location}
Contact: ${propertyData.property.contact_email || 'Not specified'}

AVAILABLE ROOMS:
${roomInfo}

UNION LABOR REQUIREMENTS:
Union information will be loaded dynamically when needed.

INVENTORY SUMMARY:
${propertyData.inventory.map(item => `- ${item.category}/${item.sub_category}: ${item.total_quantity} items available`).join('\n')}

IMPORTANT LABOR RULES:
- All electrical equipment requires Local 134 electricians
- Audio/visual equipment may require specific union technicians
- Complex venue rules apply (e.g., Encore Technicians can set up to 3 ICW rooms without projectionists, but anything over that requires projectionists)
- Weekend and holiday work has different rates and rules
- Some unions have specific time-based penalties and requirements
- Always consider labor costs when providing estimates

YOUR CAPABILITIES:
You have access to these functions to help clients:
1. fetch_inventory(category, search_term) - Find available equipment
2. check_room_capabilities(room_name, equipment_list) - Check if a room can accommodate specific equipment
3. validate_order(items, event_date, setup_requirements) - Validate if an order is feasible
4. calculate_labor_requirements(equipment_list, event_duration, setup_complexity, event_date) - Calculate required labor and costs

RESPONSE GUIDELINES:
- Be helpful, professional, and knowledgeable about event planning
- Proactively suggest equipment and room configurations
- Always consider union labor requirements when discussing equipment
- Mention specific labor rules when relevant (e.g., "Since you need electrical equipment, Local 134 electricians will be required")
- Provide cost estimates when possible, including labor costs
- Ask clarifying questions to better understand the client's needs
- If you mention a room name, automatically check its capabilities
- Consider venue-specific rules and limitations in your recommendations

Remember: You're representing a premier venue, so maintain high standards while being helpful and informative.`;
  }

  getFunctionDefinitions() {
    return [
      {
        name: 'fetch_inventory',
        description: 'Get detailed inventory information for specific categories or items',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Equipment category to search for (e.g., "Audio", "Video", "Lighting")'
            },
            sub_category: {
              type: 'string',
              description: 'Equipment sub-category to search for (e.g., "Microphones", "Projectors")'
            },
            search_term: {
              type: 'string',
              description: 'Search term to find specific equipment'
            }
          },
          required: []
        }
      },
      {
        name: 'check_room_capabilities',
        description: 'Get detailed room information and check equipment compatibility. Use this whenever a user mentions a specific room name or asks about room details.',
        parameters: {
          type: 'object',
          properties: {
            room_name: {
              type: 'string',
              description: 'Name of the room to check'
            },
            equipment_list: {
              type: 'array',
              description: 'List of equipment to check compatibility (can be empty to just get room info)',
              items: {
                type: 'string'
              }
            }
          },
          required: ['room_name']
        }
      },
      {
        name: 'validate_order',
        description: 'Validate an event order against inventory and labor rules',
        parameters: {
          type: 'object',
          properties: {
            equipment_list: {
              type: 'array',
              description: 'List of equipment with quantities',
              items: {
                type: 'object',
                properties: {
                  item_name: { type: 'string' },
                  quantity: { type: 'integer' },
                  category: { type: 'string' }
                }
              }
            },
            attendees: {
              type: 'integer',
              description: 'Number of event attendees'
            },
            event_duration: {
              type: 'number',
              description: 'Event duration in hours'
            }
          },
          required: ['equipment_list', 'attendees', 'event_duration']
        }
      },
      {
        name: 'calculate_labor_requirements',
        description: 'Calculate labor requirements based on equipment and event details',
        parameters: {
          type: 'object',
          properties: {
            equipment_list: {
              type: 'array',
              description: 'List of equipment requiring setup',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  quantity: { type: 'integer' }
                }
              }
            },
            attendees: {
              type: 'integer',
              description: 'Number of event attendees'
            },
            event_duration: {
              type: 'number',
              description: 'Event duration in hours'
            }
          },
          required: ['equipment_list', 'attendees', 'event_duration']
        }
      }
    ];
  }

  async executeFunction(functionName, args, propertyId) {
    logger.info(`Executing function: ${functionName}`, args);

    try {
      switch (functionName) {
        case 'fetch_inventory':
          return await this.fetchInventory(args, propertyId);
        
        case 'check_room_capabilities':
          return await this.checkRoomCapabilities(args, propertyId);
        
        case 'validate_order':
          return await this.validateOrder(args, propertyId);
        
        case 'calculate_labor_requirements':
          return await this.calculateLaborRequirements(args, propertyId);
        
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    } catch (error) {
      logger.error(`Error executing function ${functionName}:`, error);
      return { error: error.message };
    }
  }

  async fetchInventory(args, propertyId) {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM inventory_items WHERE property_id = ? AND status = "available"';
      const params = [propertyId];

      if (args.category) {
        query += ' AND category = ?';
        params.push(args.category);
      }

      if (args.sub_category) {
        query += ' AND sub_category = ?';
        params.push(args.sub_category);
      }

      if (args.search_term) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${args.search_term}%`, `%${args.search_term}%`);
      }

      db.all(query, params, (err, items) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          items: items.map(item => ({
            name: item.name,
            description: item.description,
            category: item.category,
            sub_category: item.sub_category,
            quantity_available: item.quantity_available,
            model: item.model,
            manufacturer: item.manufacturer
          })),
          total_items: items.length
        });
      });
    });
  }

  async checkRoomCapabilities(args, propertyId) {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM rooms WHERE property_id = ? AND name = ?',
        [propertyId, args.room_name],
        (err, room) => {
          if (err) {
            reject(err);
            return;
          }

          if (!room) {
            resolve({
              compatible: false,
              reason: 'Room not found'
            });
            return;
          }

          // Simple compatibility check based on room features
          const builtInAV = room.built_in_av || '';
          const features = room.features || '';
          const roomInfo = (builtInAV + ' ' + features).toLowerCase();

          const compatibility = {
            compatible: true,
            room_info: {
              name: room.name,
              capacity: room.capacity,
              dimensions: room.dimensions,
              built_in_av: room.built_in_av,
              features: room.features
            },
            equipment_notes: []
          };

          // Check each piece of equipment if provided
          if (args.equipment_list && args.equipment_list.length > 0) {
            args.equipment_list.forEach(equipment => {
              const equipmentLower = equipment.toLowerCase();
              if (equipmentLower.includes('projector') && !roomInfo.includes('projection')) {
                compatibility.equipment_notes.push(`${equipment}: No built-in projection, will need portable setup`);
              }
              if (equipmentLower.includes('audio') && !roomInfo.includes('sound')) {
                compatibility.equipment_notes.push(`${equipment}: No built-in audio, will need full audio setup`);
              }
            });
          } else {
            compatibility.equipment_notes.push('No specific equipment provided for compatibility check');
          }

          resolve(compatibility);
        }
      );
    });
  }

  async validateOrder(args, propertyId) {
    const validationResult = await validateOrder(args.equipment_list, propertyId, args.attendees, args.event_duration);
    return validationResult;
  }

  async calculateLaborRequirements(args, propertyId) {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      // Get labor rules for this property
      db.all('SELECT * FROM labor_rules WHERE property_id = ?', [propertyId], (err, laborRules) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse labor rules
        const rules = {};
        laborRules.forEach(rule => {
          rules[rule.rule_type] = JSON.parse(rule.rule_data);
        });

        // Calculate technician requirements
        const technicianRatio = rules.technician_ratio || { attendees_per_tech: 50, minimum_techs: 1 };
        const setupTimes = rules.setup_time || { audio_setup: 2, video_setup: 1.5, lighting_setup: 3, breakdown: 1 };

        const requiredTechs = Math.max(
          technicianRatio.minimum_techs,
          Math.ceil(args.attendees / technicianRatio.attendees_per_tech)
        );

        // Calculate setup time based on equipment
        let totalSetupTime = 0;
        args.equipment_list.forEach(item => {
          const category = item.category.toLowerCase();
          if (category.includes('audio')) {
            totalSetupTime += setupTimes.audio_setup || 2;
          } else if (category.includes('video')) {
            totalSetupTime += setupTimes.video_setup || 1.5;
          } else if (category.includes('lighting')) {
            totalSetupTime += setupTimes.lighting_setup || 3;
          }
        });

        const breakdownTime = setupTimes.breakdown || 1;
        const totalLaborHours = (totalSetupTime + args.event_duration + breakdownTime) * requiredTechs;

        resolve({
          required_technicians: requiredTechs,
          setup_time_hours: totalSetupTime,
          event_duration_hours: args.event_duration,
          breakdown_time_hours: breakdownTime,
          total_labor_hours: totalLaborHours,
          labor_schedule: {
            setup_start: `${totalSetupTime} hours before event`,
            event_support: `${requiredTechs} technicians during event`,
            breakdown: `${breakdownTime} hours after event`
          }
        });
      });
    });
  }



}

module.exports = OpenAIService; 