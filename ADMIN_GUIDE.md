# Encore Event Order Assistant - Admin Guide

## Overview

The Encore Event Order Assistant features a two-tier admin system designed to manage event planning data efficiently while maintaining proper access control.

## Admin Roles

### 1. Corporate Admin
**Access Level**: Full system access
**Capabilities**:
- Manage all properties (create, edit, delete)
- Access all property-level functions
- View and manage data across multiple venues
- Import/export data for any property

**Demo Login**: `corporate123`

### 2. Property Admin  
**Access Level**: Single property access
**Capabilities**:
- Manage rooms for their assigned property
- Manage inventory for their assigned property
- Manage labor rules for their assigned property
- Import/export data for their property only
- Cannot create or delete properties

**Demo Login**: `property123`

## Data Management Features

### Properties Management
- **Who**: Corporate Admin only
- **Purpose**: Manage venue properties and their basic information
- **Actions**: Create new venues, edit venue details, delete properties

### Rooms Management
- **Who**: Both admin levels
- **Purpose**: Configure room capacities, dimensions, and built-in features
- **Data**: Room name, capacity, dimensions, built-in AV equipment, special features
- **Impact**: Affects AI room selection and setup recommendations

### Inventory Management
- **Who**: Both admin levels
- **Purpose**: Manage equipment inventory, categories, and availability
- **Data**: Equipment name, category, quantity, status, model, manufacturer
- **Impact**: Direct impact on AI equipment recommendations and validation

### Labor Rules Management
- **Who**: Both admin levels
- **Purpose**: Configure staffing ratios, setup times, and union requirements
- **Data**: Rule types, JSON configuration data, descriptions
- **Impact**: Affects AI labor calculations and staffing recommendations

## Import/Export System

### Purpose of Import/Export

The import/export system serves multiple critical functions:

1. **Bulk Data Management**: Efficiently load large amounts of equipment data from existing spreadsheets
2. **Data Integration**: Import data from existing Encore systems or other inventory management tools
3. **Backup and Recovery**: Export current data for backup or migration purposes
4. **Template Standardization**: Provide consistent data formats for new properties
5. **AI Context Enhancement**: Ensure the AI has complete, accurate inventory data for recommendations

### How Import Affects AI Recommendations

The imported data directly impacts the AI assistant's capabilities:

- **Equipment Suggestions**: AI can only recommend equipment that exists in the inventory database
- **Quantity Validation**: AI checks actual available quantities before making proposals
- **Category Understanding**: AI uses category/subcategory data to understand equipment types
- **Room Compatibility**: Room data affects AI's understanding of venue capabilities
- **Labor Calculations**: Labor rules directly influence AI's staffing recommendations

### Template Download

**Endpoint**: `GET /api/import/template`
**Format**: Multi-sheet Excel file (.xlsx)
**Sheets Included**:
- **Instructions**: Field descriptions and requirements
- **Inventory**: Equipment data template with examples
- **Rooms**: Room configuration template
- **Labor Rules**: Labor rules template with JSON examples

**Usage**:
```bash
curl -O http://localhost:3001/api/import/template
```

### Data Export

**Endpoint**: `GET /api/import/export?property_id={id}`
**Format**: Multi-sheet Excel file (.xlsx)
**Sheets Included**:
- **Property Info**: Property details and export summary
- **Inventory**: Complete current inventory data
- **Rooms**: All room configurations
- **Labor Rules**: All labor rules

**Usage**:
```bash
curl -O "http://localhost:3001/api/import/export?property_id=1"
```

### Data Import

#### Inventory Import
**Endpoint**: `POST /api/import/inventory`
**Format**: Excel (.xlsx, .xls) or CSV files
**Required Fields**:
- Name
- Category
- Sub Category  
- Quantity Available

**Optional Fields**:
- Description
- Status (available/maintenance/retired)
- Asset Tag
- Model
- Manufacturer
- Condition Notes

#### Rooms Import
**Endpoint**: `POST /api/import/rooms`
**Required Fields**:
- Name
- Capacity

**Optional Fields**:
- Dimensions
- Built-in AV
- Features

#### Labor Rules Import
**Endpoint**: `POST /api/import/labor-rules`
**Required Fields**:
- Rule Type
- Rule Data (JSON)

**Optional Fields**:
- Description

## Import Data Structure Examples

### Inventory Data
```excel
Name                    | Category | Sub Category | Quantity Available | Status    | Model     | Manufacturer
Wireless Microphone     | Audio    | Microphones  | 8                  | available | SM58      | Shure
LCD Projector          | Video    | Projectors   | 12                 | available | VPL-FHZ75 | Sony
LED Par Light          | Lighting | LED Lights   | 24                 | available | SlimPAR   | Chauvet
```

### Rooms Data
```excel
Name           | Capacity | Dimensions | Built-in AV                    | Features
Grand Ballroom | 500      | 50x80 feet | Built-in sound, projection     | Stage, dance floor
Conference A   | 50       | 20x30 feet | Wall-mounted TV, phone system  | Whiteboard, table
```

### Labor Rules Data
```excel
Rule Type          | Description                    | Rule Data (JSON)
technician_ratio   | Tech to attendee ratio         | {"attendees_per_tech": 50, "minimum_techs": 1}
setup_time         | Equipment setup times          | {"audio_setup": 2, "video_setup": 1.5}
union_requirements | Union labor requirements       | {"requires_union": true, "overtime_threshold": 8}
```

## Workflow Examples

### Setting Up a New Property (Corporate Admin)

1. **Create Property**: Add basic venue information
2. **Download Template**: Get standardized import template
3. **Prepare Data**: Fill template with venue-specific data
4. **Import Rooms**: Upload room configuration data
5. **Import Inventory**: Upload equipment inventory
6. **Import Labor Rules**: Upload staffing and setup rules
7. **Test AI**: Use chat interface to verify AI recommendations

### Updating Inventory (Property Admin)

1. **Export Current Data**: Download current inventory for reference
2. **Update Spreadsheet**: Modify quantities, add new equipment
3. **Import Updated Data**: Upload revised inventory
4. **Verify Changes**: Check that AI recommendations reflect new inventory

### Backup and Migration

1. **Export All Data**: Download complete property data
2. **Store Safely**: Keep export files for backup
3. **Restore if Needed**: Re-import data to restore system state

## Technical Implementation

### Database Impact
- Imports use `INSERT OR REPLACE` to update existing items
- Validation ensures data integrity before database insertion
- Transaction safety prevents partial imports

### File Processing
- Supports Excel (.xlsx, .xls) and CSV formats
- Automatic column mapping for common field names
- Error reporting for invalid data rows

### Security Considerations
- File uploads limited to 10MB
- Temporary file cleanup after processing
- Input validation and sanitization
- Role-based access control

## Troubleshooting

### Common Import Issues

**Missing Required Fields**
- Error: "Missing required fields (Name, Category)"
- Solution: Ensure all required columns have data

**Invalid JSON in Labor Rules**
- Error: "Invalid JSON in Rule Data field"
- Solution: Validate JSON syntax before import

**File Format Issues**
- Error: "Invalid file type"
- Solution: Use .xlsx, .xls, or .csv formats only

### Best Practices

1. **Always download the template** before creating import files
2. **Test with small batches** before importing large datasets
3. **Export data before importing** to create backups
4. **Validate data quality** in spreadsheets before upload
5. **Check AI responses** after imports to verify impact

## Demo Integration

The admin system is designed to showcase how data management directly affects AI capabilities:

1. **Live Updates**: Changes to inventory immediately affect AI recommendations
2. **Validation Demo**: Show how AI respects inventory limits and rules
3. **Template Demo**: Download and show properly formatted templates
4. **Import Demo**: Upload sample data and demonstrate AI adaptation
5. **Role Demo**: Switch between admin levels to show access control

This creates a compelling demonstration of how the system maintains data integrity while enabling flexible, intelligent event planning assistance. 