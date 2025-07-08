const OpenAI = require('openai');
const { logger } = require('../utils/logger');
const { getDatabase } = require('../database/init');
const { validateOrder } = require('./validation');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FUNCTION_CALLS = 5;
const MAX_VALIDATION_RETRIES = 3;

// AV Knowledge Base for enhanced AI expertise
const AV_KNOWLEDGE_BASE = `
=== AUDIO/VISUAL EXPERTISE KNOWLEDGE BASE ===

AUDIO SYSTEMS FUNDAMENTALS:
• Microphone Types & Applications:
  - Handheld: Presentations, speeches, performances (SM58, Beta 58A)
  - Lavalier: Hands-free speaking, panels, interviews (CountryMan, Shure)
  - Headset: Active presenters, fitness, dance (Shure WBH54)
  - Boundary: Conference tables, stage floors (Crown PCC-160)
  - Shotgun: Distant pickup, video production (Sennheiser MKE 600)
  - Gooseneck: Podiums, fixed installations (Shure MX412)

• Audio Signal Chain: Source → Preamp → Mixer → Processing → Amplifier → Speakers
• Impedance Matching: Low-Z (XLR, balanced) vs High-Z (1/4", unbalanced)
• Feedback Prevention: Proper gain staging, EQ, speaker placement, monitor positioning
• Coverage Calculations: 1 speaker per 100 people, 90° dispersion typical
• SPL Requirements: 85dB minimum, +3dB per doubling of distance

VIDEO SYSTEMS FUNDAMENTALS:
• Resolution Standards:
  - HD: 1920x1080 (16:9), minimum for professional events
  - 4K: 3840x2160, premium events, large screens
  - Aspect Ratios: 16:9 (widescreen), 4:3 (legacy), 21:9 (cinematic)
• Signal Types & Distance Limitations:
  - HDMI: Up to 50ft reliable, 4K limited to 25ft
  - SDI: Professional, up to 300ft, broadcast quality
  - HDBaseT: Up to 330ft over Cat6, supports 4K
  - Wireless: 100-300ft range, potential latency issues
• Projector Specifications:
  - Throw Ratio: Distance to screen width ratio (1.2:1 to 2.0:1 typical)
  - Lumens: 2500+ for rooms with ambient light, 4000+ for large venues
  - Contrast Ratio: 1000:1 minimum, 3000:1+ preferred

LIGHTING SYSTEMS:
• Color Temperature:
  - 3200K: Warm tungsten, ambiance, hospitality
  - 5600K: Daylight balanced, video recording, corporate
• Lighting Positions:
  - Key Light: Primary subject illumination, 45° angle
  - Fill Light: Reduces shadows, opposite side of key
  - Back Light: Separation from background, hair/rim light
  - Wash: General area illumination, even coverage
• Power Requirements:
  - LED: 20-200W typical, cool operation, long life
  - Tungsten: 500-2000W, warm light, high heat
  - Circuit Loading: 80% max capacity, 15A/20A circuits

INTEGRATION BEST PRACTICES:
• Signal Flow Planning: Minimize conversions, maintain signal integrity
• Redundancy Systems: Backup mics, dual projectors, emergency lighting
• Testing Protocols: Pre-event checks, sound/video tests, cue rehearsals
• Room Acoustics: RT60 <2.0s for speech, carpet/drapes for absorption
• Power Distribution: Dedicated circuits, surge protection, cable management

EVENT-SPECIFIC AV REQUIREMENTS:
• Corporate Presentations (50-500 people):
  - Audio: Wireless handheld + lavalier backup, confidence monitors
  - Video: HD projector, 10-16ft screen, laptop connectivity
  - Lighting: Basic wash, podium spot, audience working light
  - Special: Confidence monitors, wireless presentation system

• Panel Discussions (20-200 people):
  - Audio: Multiple lavalier mics, audience mic, audio mixer
  - Video: Confidence monitors, name plates, camera for recording
  - Lighting: Stage wash, panelist lighting, audience illumination
  - Special: Moderated Q&A system, name graphics

• Product Launches (100-1000 people):
  - Audio: High-quality speakers, wireless mics, music playback
  - Video: Large LED screens, high-res projectors, video switching
  - Lighting: Dynamic color wash, spotlights, effect lighting
  - Special: Reveal lighting, branded content, social media integration

• Training/Educational (10-100 people):
  - Audio: Clear speech reinforcement, breakout capability
  - Video: Multiple screens, document cameras, interactive displays
  - Lighting: Consistent work lighting, whiteboard illumination
  - Special: Breakout room systems, recording capability

• Concerts/Entertainment (100-5000 people):
  - Audio: Line arrays, monitor systems, mixing consoles
  - Video: LED walls, IMAG systems, broadcast feeds
  - Lighting: Moving lights, color systems, haze/fog
  - Special: Pyrotechnics, special effects, artist requirements

TROUBLESHOOTING GUIDE:
• Audio Issues:
  - Feedback: Reduce gain, EQ notch, speaker placement
  - No sound: Check phantom power, cable connections, gain settings
  - Distortion: Reduce input gain, check impedance matching
• Video Issues:
  - No image: Check cable connections, resolution compatibility
  - Poor image: Clean lens, check focus, increase lumens
  - Sync issues: Check refresh rates, cable quality
• Common Mistakes:
  - Undersized systems for room/audience
  - Poor cable management creating safety hazards
  - Insufficient power planning
  - No backup systems for critical events

COMPATIBILITY MATRICES:
• Audio Compatibility:
  - Wireless Systems: Frequency coordination required for multiple units
  - Mixer Inputs: XLR preferred, 1/4" acceptable, RCA consumer grade
  - Speaker Impedance: 4Ω/8Ω/16Ω matching critical for amplifier performance
• Video Compatibility:
  - Resolution Matching: Source, scaler, display must align
  - Cable Types: HDMI 2.0+ for 4K, older versions limited to 1080p
  - Refresh Rates: 60Hz standard, 30Hz acceptable for static content
• Power Compatibility:
  - Voltage: 120V North America, 220V international
  - Amperage: 15A/20A circuit limitations
  - Connectors: Edison, Twist-lock, PowerCon professional

COST OPTIMIZATION STRATEGIES:
• Right-sizing Equipment: Match system to actual needs, not maximum capacity
• Multi-use Items: Wireless mics for both handheld and lavalier use
• Efficient Layouts: Minimize cable runs, strategic equipment placement
• Preventive Maintenance: Regular cleaning, testing, replacement scheduling
`;

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

  async processConversation(messages, propertyId, fileData = null) {
    try {
      console.log('Starting processConversation for property:', propertyId);
      
      // Process file if provided
      let fileContent = null;
      if (fileData) {
        fileContent = await this.processFile(fileData);
      }
      
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
        systemMessage = `You are an expert AV sales manager and technical consultant for Encore Event Services at the selected property. You have deep expertise in audio/visual systems, equipment integration, and event production.

${AV_KNOWLEDGE_BASE}

AVAILABLE ROOMS:
${roomsList}

INVENTORY STATUS: No inventory data has been uploaded for this property yet.

Please inform the user that inventory data needs to be uploaded through the admin interface before I can provide specific equipment recommendations. However, I can still provide expert AV consultation, system design advice, and general recommendations based on their event requirements.

IMPORTANT: When users mention a specific room name, use the check_room_capabilities function to provide detailed room information and assess equipment compatibility.

Even without inventory data, I can help with:
- AV system design and consultation
- Equipment recommendations and specifications
- Technical troubleshooting advice
- Event-specific AV requirements
- Best practices and industry standards
- Cost optimization strategies

I cannot make specific equipment recommendations until inventory data is available for this property, but I can provide comprehensive AV expertise and consultation.`;
      } else {
        const inventoryList = inventory.map(item => 
          `- ${item.name} ${item.model ? 'Model ' + item.model : ''}: ${item.quantity_available} units available (${item.description})`
        ).join('\n');
        
        systemMessage = `You are an expert AV sales manager and technical consultant for Encore Event Services at the selected property. You have deep expertise in audio/visual systems, equipment integration, and event production.

${AV_KNOWLEDGE_BASE}

AVAILABLE ROOMS:
${roomsList}

AVAILABLE EQUIPMENT INVENTORY:
${inventoryList}

IMPORTANT: When recommending equipment, always use the EXACT item names and model numbers from this inventory list. Only recommend equipment that is actually available in the inventory above.

IMPORTANT: When users mention a specific room name, use the check_room_capabilities function to provide detailed room information and assess equipment compatibility.

I can help you:
- Design complete AV systems based on event requirements
- Recommend specific equipment from your inventory
- Provide technical specifications and compatibility guidance
- Calculate power, coverage, and capacity requirements
- Suggest event-specific configurations and best practices
- Troubleshoot technical issues and optimize performance
- Provide cost-effective solutions and alternatives

I combine deep AV technical knowledge with your specific inventory to create the perfect event solutions.`;
      }
      
      // Prepare messages array
      const chatMessages = [
        { role: 'system', content: systemMessage },
        ...messages
      ];

      // Add file content to the last user message if provided
      if (fileContent && messages.length > 0) {
        const lastUserMessageIndex = chatMessages.findIndex((msg, idx) => 
          idx > 0 && msg.role === 'user'
        );
        
        if (lastUserMessageIndex !== -1) {
          if (fileContent.type === 'image') {
            // For images, create a message with image content
            chatMessages[lastUserMessageIndex] = {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: chatMessages[lastUserMessageIndex].content + `\n\n[User uploaded an image for analysis]

IMPORTANT IMAGE ANALYSIS INSTRUCTIONS:
1. Identify all visible AV equipment in the image:
   - Audio: Microphones, speakers, mixers, amplifiers, cables
   - Video: Projectors, screens, displays, cameras, switchers
   - Lighting: LED panels, stage lights, wash lights, spotlights
   - Staging: Trusses, stands, rigging, power distribution

2. Note equipment brands and models if visible
3. Assess the room layout and setup configuration
4. Estimate quantities of each type of equipment
5. Identify cable runs and signal flow if visible
6. Note any safety concerns or setup issues

After analysis, recommend equivalent equipment from the available inventory to recreate this setup.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: fileContent.dataUrl
                  }
                }
              ]
            };
          } else if (fileContent.type === 'pdf') {
            // For PDFs, append the extracted text
            chatMessages[lastUserMessageIndex].content += `\n\n[User uploaded a PDF document - analyzing for event specifications, quotes, or technical requirements]

PDF CONTENT:
${fileContent.text}

ANALYSIS INSTRUCTIONS:
1. Identify event requirements (date, location, attendee count)
2. Extract equipment lists and quantities
3. Note any special technical requirements
4. Identify labor requirements if mentioned
5. Find budget constraints or pricing information
6. Suggest optimizations or alternatives from available inventory`;
          }
        }
      }

      // Define available functions
      const functions = this.getFunctionDefinitions();

      console.log('Sending request to OpenAI with functions enabled');
      
      let response = await openai.chat.completions.create({
        model: 'gpt-4o', // GPT-4o supports vision natively
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

  async processFile(fileData) {
    try {
      const { mimetype, path: filePath } = fileData;
      
      if (mimetype.includes('pdf')) {
        // Process PDF file
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        
        logger.info('PDF processed', {
          pages: pdfData.numpages,
          textLength: pdfData.text.length
        });
        
        return {
          type: 'pdf',
          text: pdfData.text,
          metadata: {
            pages: pdfData.numpages,
            info: pdfData.info
          }
        };
      } else if (mimetype.includes('image')) {
        // Process image file
        const imageBuffer = await fs.readFile(filePath);
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:${mimetype};base64,${base64Image}`;
        
        logger.info('Image processed', {
          size: imageBuffer.length,
          type: mimetype
        });
        
        return {
          type: 'image',
          dataUrl: dataUrl,
          metadata: {
            size: imageBuffer.length,
            mimetype: mimetype
          }
        };
      }
      
      throw new Error(`Unsupported file type: ${mimetype}`);
    } catch (error) {
      logger.error('Error processing file:', error);
      throw error;
    }
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

    return `You are an expert AV sales manager and technical consultant for ${propertyData.property.name}, a premier event venue in Chicago. You help clients plan events by understanding their requirements and providing detailed information about rooms, inventory, labor requirements, and costs.

${AV_KNOWLEDGE_BASE}

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
- Audio/visual equipment may require specific union technicians
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
- Be helpful, professional, and knowledgeable about event planning and AV systems
- Proactively suggest equipment and room configurations based on AV best practices
- Always consider union labor requirements when discussing equipment
- Mention specific labor rules when relevant (e.g., "Since you need electrical equipment, Local 134 electricians will be required")
- Provide cost estimates when possible, including labor costs
- Ask clarifying questions to better understand the client's needs
- If you mention a room name, automatically check its capabilities
- Consider venue-specific rules and limitations in your recommendations
- Apply AV expertise to recommend appropriate equipment for event types
- Explain technical considerations and compatibility requirements
- Suggest system redundancy and backup solutions for critical events

Remember: You're representing a premier venue and are an expert in AV systems. Maintain high standards while being helpful and informative about technical requirements.`;
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