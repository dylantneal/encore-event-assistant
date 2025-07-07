const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { getDatabase } = require('../database/init');
const { validateInventoryItem } = require('../services/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'text/plain', // .csv (alternative detection)
      'application/csv', // .csv (alternative)
      'application/excel', // Excel (alternative)
      'application/x-excel', // Excel (alternative)
      'application/x-msexcel' // Excel (alternative)
    ];
    
    // Also check file extension as a fallback
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Please upload Excel (.xlsx, .xls) or CSV files.`));
    }
  }
});

/**
 * Smart column mapping - finds the best matching column for each field
 * This handles variations in column names, typos, and different formats
 */
const findBestColumnMatch = (headers, targetField) => {
  const headerLower = headers.map(h => String(h || '').toLowerCase().trim());
  
  const mappings = {
    barcode: ['barcode', 'asset id', 'asset_id', 'id', 'item id', 'sku', 'asset tag'],
    category: ['major category', 'category', 'main category', 'primary category', 'cat', 'major cat'],
    subcategory: ['sub category', 'subcategory', 'sub_category', 'secondary category', 'subcat', 'sub cat'],
    class: ['class', 'item class', 'equipment class', 'type', 'classification'],
    subclass: ['subclass', 'sub class', 'sub_class', 'item type', 'equipment type', 'subclassification'],
    item: ['item', 'item name', 'name', 'equipment name', 'product', 'item title'],
    description: ['item description', 'description', 'desc', 'details', 'full description', 'product description'],
    status: ['asset item status', 'status', 'item status', 'condition', 'state', 'availability', 'asset status'],
    quantity: ['quantity available', 'quantity', 'qty', 'available', 'count', 'stock', 'available qty'],
    model: ['model', 'model number', 'model_number', 'product model', 'model no'],
    manufacturer: ['manufacturer', 'brand', 'make', 'vendor', 'supplier'],
    location: ['location', 'room', 'area', 'zone', 'site'],
    notes: ['asset history notes', 'notes', 'comments', 'remarks', 'condition notes', 'history']
  };
  
  const possibleMatches = mappings[targetField] || [];
  
  // Try exact matches first
  for (const match of possibleMatches) {
    const index = headerLower.findIndex(h => h === match);
    if (index !== -1) {
      return headers[index];
    }
  }
  
  // Then try contains matches
  for (const match of possibleMatches) {
    const index = headerLower.findIndex(h => h.includes(match) || match.includes(h));
    if (index !== -1) {
      return headers[index];
    }
  }
  
  return null;
};

/**
 * Normalize imported data to lean, AI-friendly schema
 */
const normalizeInventoryData = (rawData) => {
  if (!rawData || rawData.length === 0) {
    return [];
  }
  
  const headers = Object.keys(rawData[0]);
  logger.info('📋 Found headers:', headers);
  
  // Map columns intelligently
  const columnMap = {
    barcode: findBestColumnMatch(headers, 'barcode'),
    category: findBestColumnMatch(headers, 'category'),
    subcategory: findBestColumnMatch(headers, 'subcategory'),
    class: findBestColumnMatch(headers, 'class'),
    subclass: findBestColumnMatch(headers, 'subclass'),
    item: findBestColumnMatch(headers, 'item'),
    description: findBestColumnMatch(headers, 'description'),
    status: findBestColumnMatch(headers, 'status'),
    quantity: findBestColumnMatch(headers, 'quantity'),
    model: findBestColumnMatch(headers, 'model'),
    manufacturer: findBestColumnMatch(headers, 'manufacturer'),
    location: findBestColumnMatch(headers, 'location'),
    notes: findBestColumnMatch(headers, 'notes')
  };
  
  logger.info('🎯 Column mapping:', columnMap);
  
  return rawData.map((row, index) => {
    // Extract and clean values
    const barcode = row[columnMap.barcode] || '';
    const category = row[columnMap.category] || 'General';
    const subcategory = row[columnMap.subcategory] || 'Equipment';
    const itemClass = row[columnMap.class] || '';
    const subclass = row[columnMap.subclass] || '';
    const item = row[columnMap.item] || '';
    const description = row[columnMap.description] || '';
    const status = row[columnMap.status] || '';
    const quantity = row[columnMap.quantity] || '';
    const model = row[columnMap.model] || '';
    const manufacturer = row[columnMap.manufacturer] || '';
    const location = row[columnMap.location] || '';
    const notes = row[columnMap.notes] || '';
    
    // Create the best possible name and description
    const name = item || description || `${category} - ${subcategory}` || 'Unknown Item';
    const finalDescription = description || item || `${category} ${subcategory}` || name;
    
    // Parse quantity intelligently
    let parsedQuantity = 1;
    if (quantity) {
      const numMatch = String(quantity).match(/\d+/);
      if (numMatch) {
        parsedQuantity = parseInt(numMatch[0]);
      }
    }
    
    // Map status to our system
    let mappedStatus = 'available';
    if (status) {
      const statusLower = String(status).toLowerCase();
      if (statusLower.includes('hand') || statusLower.includes('available') || statusLower.includes('ready')) {
        mappedStatus = 'available';
      } else if (statusLower.includes('damaged') || statusLower.includes('maintenance') || statusLower.includes('repair')) {
        mappedStatus = 'maintenance';
      } else if (statusLower.includes('standby') || statusLower.includes('stand by') || statusLower.includes('reserve')) {
        mappedStatus = 'available';
      } else if (statusLower.includes('unavailable') || statusLower.includes('out')) {
        mappedStatus = 'unavailable';
      }
    }
    
    return {
      // Lean schema - only essential fields
      name: String(name).trim(),
      description: String(finalDescription).trim(),
      category: String(category).trim(),
      subcategory: String(subcategory).trim(),
      quantity: parsedQuantity,
      status: mappedStatus,
      
      // Optional fields
      barcode: String(barcode).trim(),
      model: String(model).trim(),
      manufacturer: String(manufacturer).trim(),
      location: String(location).trim(),
      notes: String(notes).trim(),
      
      // Additional metadata for reference
      itemClass: String(itemClass).trim(),
      subclass: String(subclass).trim(),
      
      // Row number for error reporting
      _rowNumber: index + 2
    };
  });
};

// GET /api/import/template - Download import template
router.get('/template', (req, res) => {
  try {
    // Create a lean template that works for most Excel formats
    const workbook = XLSX.utils.book_new();
    
    // Simple inventory template - works with most formats
    const inventoryData = [
      {
        'Barcode': 'EQ001',
        'Major Category': 'Audio',
        'Sub Category': 'Microphone',
        'Class': 'Audio Equipment',
        'SubClass': 'Wireless Mic',
        'Item': 'Wireless Microphone System',
        'Item Description': 'Shure ULXD4 Wireless Microphone System',
        'Asset Item Status': 'On Hand',
        'Quantity Available': 5,
        'Model': 'ULXD4',
        'Location': 'Audio Room A'
      },
      {
        'Barcode': 'EQ002',
        'Major Category': 'Video',
        'Sub Category': 'Projector',
        'Class': 'Video Equipment',
        'SubClass': 'LCD Projector',
        'Item': 'LCD Projector',
        'Item Description': 'Epson PowerLite Pro Z11000WNL',
        'Asset Item Status': 'On Hand',
        'Quantity Available': 2,
        'Model': 'Z11000WNL',
        'Location': 'Video Storage'
      },
      {
        'Barcode': 'EQ003',
        'Major Category': 'Lighting',
        'Sub Category': 'LED',
        'Class': 'Lighting Equipment',
        'SubClass': 'LED Par',
        'Item': 'LED Par Light',
        'Item Description': 'Chauvet Professional COLORado 1-Quad Zoom',
        'Asset Item Status': 'On Hand',
        'Quantity Available': 12,
        'Model': 'COLORado 1-Quad',
        'Location': 'Lighting Storage'
      }
    ];
    
    // Rooms template
    const roomsData = [
      {
        'Name': 'Grand Ballroom',
        'Capacity': 500,
        'Dimensions': '50x80 feet',
        'Built-in AV': 'Built-in sound system, projection screens',
        'Features': 'Stage, dance floor, crystal chandeliers'
      },
      {
        'Name': 'Conference Room A',
        'Capacity': 50,
        'Dimensions': '20x30 feet',
        'Built-in AV': 'Wall-mounted TV, conference phone',
        'Features': 'Whiteboard, conference table'
      }
    ];
    
    // Labor Rules template
    const laborRulesData = [
      {
        'Rule Type': 'technician_ratio',
        'Description': 'Technician to attendee ratio',
        'Rule Data (JSON)': '{"attendees_per_tech": 50, "minimum_techs": 1, "maximum_hours": 12}'
      },
      {
        'Rule Type': 'setup_time',
        'Description': 'Standard setup times in hours',
        'Rule Data (JSON)': '{"audio_setup": 2, "video_setup": 1.5, "lighting_setup": 3}'
      }
    ];
    
    // Create worksheets
    const inventoryWS = XLSX.utils.json_to_sheet(inventoryData);
    const roomsWS = XLSX.utils.json_to_sheet(roomsData);
    const laborRulesWS = XLSX.utils.json_to_sheet(laborRulesData);
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(workbook, inventoryWS, 'Inventory');
    XLSX.utils.book_append_sheet(workbook, roomsWS, 'Rooms');
    XLSX.utils.book_append_sheet(workbook, laborRulesWS, 'Labor Rules');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename="encore-import-template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(buffer);
    
    logger.info('Template downloaded successfully');
    
  } catch (error) {
    logger.error('Error generating template:', error);
    res.status(500).json({
      error: 'Template Generation Error',
      message: 'Failed to generate import template'
    });
  }
});

// GET /api/import/export - Export current data
router.get('/export', async (req, res) => {
  try {
    const { property_id } = req.query;
    
    if (!property_id) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'Property ID is required'
      });
    }
    
    const db = getDatabase();
    
    // Get property info
    const property = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM properties WHERE id = ?', [property_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!property) {
      return res.status(404).json({
        error: 'Property Not Found',
        message: 'The specified property does not exist'
      });
    }
    
    // Get all data for the property
    const [inventory, rooms, laborRules] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM inventory_items WHERE property_id = ?', [property_id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM rooms WHERE property_id = ?', [property_id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM labor_rules WHERE property_id = ?', [property_id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      })
    ]);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Property info sheet
    const propertyInfo = [{
      'Property Name': property.name,
      'Location': property.location,
      'Description': property.description,
      'Contact Info': property.contact_info,
      'Export Date': new Date().toISOString(),
      'Total Rooms': rooms.length,
      'Total Inventory Items': inventory.length,
      'Total Labor Rules': laborRules.length
    }];
    
    // Transform data for export - Encore format
    const inventoryExport = inventory.map(item => ({
      'Asset ID': item.asset_tag || item.id,
      'Category': item.category,
      'Sub Category': item.sub_category,
      'Item Type': item.sub_category, // Use sub_category as item type
      'Description': item.description,
      'Model': item.model,
      'Status': item.status === 'available' ? 'On Hand' : 
                item.status === 'maintenance' ? 'Damaged' : 
                item.status,
      'Condition Notes': item.condition_notes,
      'Last Updated': new Date().toLocaleDateString(),
      'Location': 'PROPERTY',
      'Quantity Available': item.quantity_available
    }));
    
    const roomsExport = rooms.map(room => ({
      'Name': room.name,
      'Capacity': room.capacity,
      'Dimensions': room.dimensions,
      'Built-in AV': room.built_in_av,
      'Features': room.features
    }));
    
    const laborRulesExport = laborRules.map(rule => ({
      'Rule Type': rule.rule_type,
      'Description': rule.description,
      'Rule Data (JSON)': rule.rule_data
    }));
    
    // Create worksheets
    const propertyWS = XLSX.utils.json_to_sheet(propertyInfo);
    const inventoryWS = XLSX.utils.json_to_sheet(inventoryExport);
    const roomsWS = XLSX.utils.json_to_sheet(roomsExport);
    const laborRulesWS = XLSX.utils.json_to_sheet(laborRulesExport);
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(workbook, propertyWS, 'Property Info');
    XLSX.utils.book_append_sheet(workbook, inventoryWS, 'Inventory');
    XLSX.utils.book_append_sheet(workbook, roomsWS, 'Rooms');
    XLSX.utils.book_append_sheet(workbook, laborRulesWS, 'Labor Rules');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    const filename = `${property.name.replace(/[^a-zA-Z0-9]/g, '_')}-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(buffer);
    
    logger.info('Data exported successfully', { property_id, filename });
    
  } catch (error) {
    logger.error('Error exporting data:', error);
    res.status(500).json({
      error: 'Export Error',
      message: 'Failed to export data'
    });
  }
});

// POST /api/import/inventory - Import inventory with smart column mapping
router.post('/inventory', upload.single('file'), async (req, res) => {
  try {
    logger.info('🚀 SMART INVENTORY IMPORT STARTED');
    const { property_id, replace_existing } = req.body;
    
    if (!property_id) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'Property ID is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'Missing File',
        message: 'Please upload a file'
      });
    }
    
    // Read the uploaded file with better options for problematic Excel files
    const workbook = XLSX.readFile(req.file.path, {
      cellDates: false,
      cellNF: false,
      cellText: false,
      type: 'file',
      raw: false
    });
    
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range and try different approaches to find headers
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    logger.info(`📊 Sheet range: ${range.s.r}-${range.e.r} rows, ${range.s.c}-${range.e.c} columns`);
    
    // Try to find the actual header row by looking for your specific headers
    let headerRowIndex = 0;
    let rawData = null;
    let foundHeaderRow = false;
    
    // Look through first 10 rows to find headers
    for (let checkRow = 0; checkRow < Math.min(10, range.e.r + 1); checkRow++) {
      const testRange = { s: { c: range.s.c, r: checkRow }, e: { c: range.e.c, r: range.e.r } };
      const testData = XLSX.utils.sheet_to_json(worksheet, { 
        range: testRange,
        header: 1, // Return raw arrays instead of objects
        raw: false,
        defval: ''
      });
      
      if (testData.length > 0) {
        const firstRow = testData[0];
        logger.info(`🔍 Row ${checkRow} headers:`, firstRow);
        
        // Check if this row contains our expected headers
        const expectedHeaders = ['barcode', 'major category', 'sub category', 'item description', 'class', 'subclass'];
        const rowString = firstRow.join(' ').toLowerCase();
        
        const matchCount = expectedHeaders.filter(header => rowString.includes(header)).length;
        
        if (matchCount >= 3) { // If we find at least 3 expected headers
          headerRowIndex = checkRow;
          foundHeaderRow = true;
          logger.info(`✅ Found header row at index ${checkRow} with ${matchCount} matching headers`);
          
          // Now get the data starting from this header row
          const dataRange = { s: { c: range.s.c, r: checkRow }, e: { c: range.e.c, r: range.e.r } };
          rawData = XLSX.utils.sheet_to_json(worksheet, { 
            range: dataRange,
            raw: false,
            defval: ''
          });
          break;
        }
      }
    }
    
    // Fallback: if no header row found, use default parsing
    if (!foundHeaderRow) {
      logger.info('⚠️ No matching header row found, using default parsing');
      rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    }
    
    if (!rawData || rawData.length === 0) {
      return res.status(400).json({
        error: 'Empty File',
        message: 'The uploaded file contains no data'
      });
    }
    
    logger.info(`📊 Processing ${rawData.length} rows from sheet: ${sheetName}`);
    logger.info('📋 Sample of first row keys:', Object.keys(rawData[0] || {}));
    
    // Log first few rows for debugging
    if (rawData.length > 0) {
      logger.info('🔍 First row sample:', rawData[0]);
      if (rawData.length > 1) {
        logger.info('🔍 Second row sample:', rawData[1]);
      }
    }
    
    // Normalize data to lean schema
    const normalizedData = normalizeInventoryData(rawData);
    
    const db = getDatabase();
    
    // If replace_existing is true, clear existing inventory for this property
    if (replace_existing === 'true') {
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM inventory_items WHERE property_id = ?', [property_id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.info(`🗑️ Cleared existing inventory for property ${property_id}`);
    }
    
    const importResults = {
      total: normalizedData.length,
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    // Process each normalized row
    for (const item of normalizedData) {
      try {
        // Skip rows with no meaningful data
        if (!item.name || item.name === 'Unknown Item' || item.name.trim() === '') {
          importResults.errors.push(`Row ${item._rowNumber}: No valid item name found`);
          importResults.skipped++;
          continue;
        }
        
        // Validate the normalized item
        const validation = validateInventoryItem({
          property_id,
          name: item.name,
          description: item.description,
          category: item.category,
          sub_category: item.subcategory,
          quantity_available: item.quantity,
          status: item.status
        });
        
        if (!validation.valid) {
          importResults.errors.push(`Row ${item._rowNumber}: ${validation.errors.join(', ')}`);
          importResults.skipped++;
          continue;
        }
        
        // Insert the lean, normalized item
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT OR REPLACE INTO inventory_items 
            (property_id, name, description, category, sub_category, quantity_available, status, asset_tag, model, manufacturer, condition_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            property_id,
            item.name,
            item.description,
            item.category,
            item.subcategory,
            item.quantity,
            item.status,
            item.barcode,
            item.model,
            item.manufacturer,
            item.notes
          ], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        
        importResults.imported++;
        
      } catch (error) {
        importResults.errors.push(`Row ${item._rowNumber}: ${error.message}`);
        importResults.skipped++;
      }
    }
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    logger.info('✅ Inventory import completed:', importResults);
    
    res.json({
      message: `Import completed: ${importResults.imported} items imported, ${importResults.skipped} skipped`,
      results: importResults
    });
    
  } catch (error) {
    logger.error('❌ Error importing inventory:', error);
    res.status(500).json({
      error: 'Import Error',
      message: error.message || 'Failed to import inventory data'
    });
  }
});

// POST /api/import/rooms - Import rooms from spreadsheet
router.post('/rooms', upload.single('file'), async (req, res) => {
  try {
    const { property_id } = req.body;
    
    if (!property_id) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'Property ID is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'Missing File',
        message: 'Please upload a file'
      });
    }
    
    // Read the uploaded file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('room')) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({
        error: 'Empty File',
        message: 'The uploaded file contains no room data'
      });
    }
    
    const db = getDatabase();
    const importResults = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const name = row.Name || row.name || row['Room Name'];
        const capacity = parseInt(row.Capacity || row.capacity || row['Max Capacity']) || 0;
        const dimensions = row.Dimensions || row.dimensions || row.Size || '';
        const builtInAv = row['Built-in AV'] || row['Built-in AV Equipment'] || row['AV Equipment'] || '';
        const features = row.Features || row.features || row.Amenities || '';
        
        if (!name) {
          importResults.errors.push(`Row ${i + 2}: Missing room name`);
          importResults.skipped++;
          continue;
        }
        
        // Insert room
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT OR REPLACE INTO rooms 
            (property_id, name, capacity, dimensions, built_in_av, features)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [property_id, name, capacity, dimensions, builtInAv, features], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        
        importResults.imported++;
        
      } catch (error) {
        importResults.errors.push(`Row ${i + 2}: ${error.message}`);
        importResults.skipped++;
      }
    }
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    logger.info('Rooms import completed', importResults);
    
    res.json({
      message: 'Import completed',
      results: importResults
    });
    
  } catch (error) {
    logger.error('Error importing rooms:', error);
    res.status(500).json({
      error: 'Import Error',
      message: 'Failed to import room data'
    });
  }
});

// POST /api/import/labor - Import labor rules from spreadsheet
router.post('/labor', upload.single('file'), async (req, res) => {
  try {
    const { property_id } = req.body;
    
    if (!property_id) {
      return res.status(400).json({
        error: 'Missing Parameter',
        message: 'Property ID is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'Missing File',
        message: 'Please upload a file'
      });
    }
    
    // Read the uploaded file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('labor')) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({
        error: 'Empty File',
        message: 'The uploaded file contains no labor rule data'
      });
    }
    
    const db = getDatabase();
    const importResults = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const ruleType = row['Rule Type'] || row.rule_type || row.type;
        const description = row.Description || row.description || '';
        const ruleData = row['Rule Data (JSON)'] || row.rule_data || row.data;
        
        if (!ruleType || !ruleData) {
          importResults.errors.push(`Row ${i + 2}: Missing rule type or rule data`);
          importResults.skipped++;
          continue;
        }
        
        // Validate JSON
        try {
          JSON.parse(ruleData);
        } catch (jsonError) {
          importResults.errors.push(`Row ${i + 2}: Invalid JSON in rule data`);
          importResults.skipped++;
          continue;
        }
        
        // Insert labor rule
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT OR REPLACE INTO labor_rules 
            (property_id, rule_type, description, rule_data)
            VALUES (?, ?, ?, ?)
          `, [property_id, ruleType, description, ruleData], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        
        importResults.imported++;
        
      } catch (error) {
        importResults.errors.push(`Row ${i + 2}: ${error.message}`);
        importResults.skipped++;
      }
    }
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    logger.info('Labor rules import completed', importResults);
    
    res.json({
      message: 'Import completed',
      results: importResults
    });
    
  } catch (error) {
    logger.error('Error importing labor rules:', error);
    res.status(500).json({
      error: 'Import Error',
      message: 'Failed to import labor rule data'
    });
  }
});

module.exports = router; 