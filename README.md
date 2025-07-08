# Encore Architect

A professional web application that combines a conversational AI interface with structured data management for event planning. The system allows sales managers to input event requirements in natural language and receive detailed, validated Event Orders (equipment lists) and Jobs Proposals (labor plans).

## 🏗️ Architecture

### Backend (Node.js/Express)
- **LLM Orchestration**: GPT-4 integration with function calling
- **Data Management**: RESTful API for CRUD operations
- **Validation Logic**: Business rules enforcement
- **Database**: SQLite for simplicity and portability
- **Import/Export**: Spreadsheet data processing

### Frontend (React/Next.js)
- **Chat Interface**: Slack-like conversational UI
- **Data Management**: Airtable-like admin interface
- **Property Selection**: Multi-venue support
- **Real-time Updates**: Dynamic inventory and rule changes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd FlightDeck2
   npm run install-all
   ```

2. **Configure environment**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Start the application**
   ```bash
   # From project root
   npm run dev
   ```

   This starts both:
   - Backend server: http://localhost:3001
   - Frontend client: http://localhost:3000

### Initial Setup

1. **Access the application** at http://localhost:3000
2. **Select a property** from the dropdown (sample data is pre-loaded)
3. **Choose your role**:
   - **Sales Manager**: Access chat interface only
   - **Admin**: Access both chat and data management

## 🎯 Key Features

### AI Assistant Capabilities
- **Natural Language Processing**: Describe events in plain English
- **Real-time Inventory Checking**: Validates equipment availability
- **Automated Labor Calculations**: Generates staffing requirements
- **Equipment Compatibility**: Checks room and setup constraints
- **Iterative Refinement**: Continuous validation and correction

### Data Management
- **Property Configuration**: Multiple venue support
- **Inventory Management**: Equipment tracking and categorization
- **Room Specifications**: Capacity and built-in feature management
- **Labor Rules**: Customizable staffing and union requirements
- **Spreadsheet Import**: Bulk data loading from Excel/CSV files

### Demo Scenarios

Try these example requests with the AI assistant:

1. **Basic Event**:
   ```
   "I need audio and video for a 100-person conference in the Grand Ballroom from 9am to 5pm"
   ```

2. **Complex Setup**:
   ```
   "200 attendees, panel discussion with 4 speakers, need wireless mics, projection for slides, and lighting for recording"
   ```

3. **Multi-Room Event**:
   ```
   "Corporate event with main session in ballroom (300 people) and breakout sessions in Conference Room A (50 people)"
   ```

## 📁 Project Structure

```
Encore Architect/
├── server/                 # Backend application
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── database/          # Database setup and models
│   ├── utils/             # Utilities and helpers
│   └── index.js           # Server entry point
├── client/                # Frontend application
│   ├── pages/             # Next.js pages
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── utils/             # Frontend utilities
│   └── styles/            # CSS and styling
└── package.json           # Root package configuration
```

## 🔧 API Endpoints

### Core Data Management
- `GET/POST/PUT/DELETE /api/properties` - Property management
- `GET/POST/PUT/DELETE /api/rooms` - Room management  
- `GET/POST/PUT/DELETE /api/inventory` - Inventory management
- `GET/POST/PUT/DELETE /api/labor-rules` - Labor rules management

### AI Integration
- `POST /api/chat` - Process chat messages with AI
- `GET /api/chat/health` - AI service health check

### Data Import/Export
- `POST /api/import/inventory` - Import inventory from spreadsheet
- `POST /api/import/validate` - Validate spreadsheet without importing
- `GET /api/import/template` - Download import template

## 🎨 UI Components

### Chat Interface
- **Message History**: Persistent conversation state
- **Markdown Rendering**: Rich text formatting for responses
- **Typing Indicators**: Real-time feedback
- **Error Handling**: Graceful failure management

### Admin Interface
- **Data Grid**: Spreadsheet-like editing experience
- **File Upload**: Drag-and-drop import functionality
- **Form Validation**: Client and server-side validation
- **Bulk Operations**: Multi-row editing and deletion

## 🔍 Function Calling

The AI assistant uses these functions to interact with data:

- `fetch_inventory(category, sub_category, search_term)` - Get equipment details
- `check_room_capabilities(room_name, equipment_list)` - Validate room compatibility
- `validate_order(equipment_list, attendees, duration)` - Check business rules
- `calculate_labor_requirements(equipment_list, attendees, duration)` - Generate staffing

## 📊 Sample Data

The system comes pre-loaded with:
- **1 Property**: Hotel ABC Ballroom (Downtown LA)
- **3 Rooms**: Grand Ballroom, Conference Room A, Breakout Room 1
- **7 Inventory Items**: Audio, video, and lighting equipment
- **3 Labor Rules**: Technician ratios, setup times, union requirements

## 🚀 Deployment

### Local Development
```bash
npm run dev          # Start both frontend and backend
npm run server       # Start backend only
npm run client       # Start frontend only
```

### Production Build
```bash
cd client
npm run build        # Build frontend
npm start           # Start production server

cd ../server
npm start           # Start backend server
```

### Docker (Optional)
```bash
# Build and run with Docker
docker build -t encore-assistant .
docker run -p 3000:3000 -p 3001:3001 encore-assistant
```

## 🔒 Security Considerations

This is a **demo application** with simplified security:
- No user authentication (role toggle only)
- Local SQLite database
- Trusted environment assumptions
- Basic input validation

For production deployment, implement:
- User authentication and authorization
- Database encryption
- API rate limiting
- Input sanitization
- HTTPS enforcement

## 🛠️ Development

### Adding New Equipment Categories
1. Update inventory items via admin interface
2. Modify validation rules in `server/services/validation.js`
3. Update labor calculation logic if needed

### Customizing AI Behavior
1. Edit system prompts in `server/services/openai.js`
2. Add new function definitions for additional capabilities
3. Implement corresponding handlers

### Extending Data Model
1. Update database schema in `server/database/init.js`
2. Add corresponding API routes
3. Create frontend components for new data types

## 📝 License

This project is for demonstration purposes. Please ensure you have appropriate licenses for all dependencies and comply with OpenAI's usage policies.

## 🤝 Support

For questions or issues:
1. Check the logs in `server/logs/`
2. Verify OpenAI API key configuration
3. Ensure all dependencies are installed
4. Review the browser console for frontend errors

## 🎯 Demo Tips

1. **Start Simple**: Begin with basic event requests
2. **Show Validation**: Try requesting more equipment than available
3. **Demonstrate Adaptability**: Modify inventory and show AI adapts
4. **Highlight Function Calls**: Show the AI's reasoning process
5. **Test Edge Cases**: Large events, complex setups, constraint violations 