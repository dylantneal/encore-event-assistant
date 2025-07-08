const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Auto-detect database type based on environment
const usePostgres = !!process.env.DATABASE_URL;
const { initDatabase } = usePostgres 
  ? require('./database/postgres-init') 
  : require('./database/init');

const { logger } = require('./utils/logger');
const propertiesRouter = require('./routes/properties');
const roomsRouter = require('./routes/rooms');
const inventoryRouter = require('./routes/inventory');
const laborRulesRouter = require('./routes/laborRules');
const unionsRouter = require('./routes/unions');
const chatRouter = require('./routes/chat');
const importRouter = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsConfig = require('./cors-config');
app.use(cors(corsConfig));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from client build (for production)
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', '.next');
  const clientPublicPath = path.join(__dirname, '..', 'client', 'public');
  
  // Serve Next.js static assets
  app.use('/_next', express.static(clientBuildPath));
  app.use('/public', express.static(clientPublicPath));
  
  // Serve favicon and other static files
  app.use('/favicon.ico', express.static(path.join(clientPublicPath, 'favicon.ico')));
}

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// API Routes
app.use('/api/properties', propertiesRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/labor-rules', laborRulesRouter);
app.use('/api/unions', unionsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/import', importRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.1.5',
    database: usePostgres ? 'PostgreSQL' : 'SQLite',
    corsFixed: true,
    deploymentTime: new Date().toISOString(),
    corsConfig: 'external-file',
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Database repair endpoint
app.post('/api/repair-database', async (req, res) => {
  try {
    logger.info('Starting database repair...');
    
    // Re-initialize database
    await initDatabase();
    
    res.json({
      status: 'success',
      message: 'Database repaired and re-initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database repair failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database repair failed',
      error: error.message
    });
  }
});

// Test database endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM inventory_items');
      const inventoryCount = result.rows[0].count;
      
      const roomsResult = await client.query('SELECT COUNT(*) as count FROM rooms');
      const roomsCount = roomsResult.rows[0].count;
      
      const unionsResult = await client.query('SELECT COUNT(*) as count FROM unions');
      const unionsCount = unionsResult.rows[0].count;
      
      res.json({
        status: 'success',
        database: 'PostgreSQL',
        counts: {
          inventory: inventoryCount,
          rooms: roomsCount,
          unions: unionsCount
        },
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Simple working inventory endpoint
app.get('/api/inventory-simple', async (req, res) => {
  try {
    const { property_id } = req.query;
    if (!property_id) {
      return res.status(400).json({ error: 'Property ID required' });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM inventory_items WHERE property_id = $1 ORDER BY name', [property_id]);
      
      res.json({
        items: result.rows,
        total: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Simple inventory endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Simple working unions endpoint
app.get('/api/unions-simple', async (req, res) => {
  try {
    const { property_id } = req.query;
    if (!property_id) {
      return res.status(400).json({ error: 'Property ID required' });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM unions WHERE property_id = $1 ORDER BY name', [property_id]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Simple unions endpoint error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Simple working rooms endpoint
app.get('/api/rooms-simple', async (req, res) => {
  try {
    const { property_id } = req.query;
    if (!property_id) {
      return res.status(400).json({ error: 'Property ID required' });
    }
    
    const db = getDatabase();
    const client = await db.connect();
    
    try {
      const result = await client.query('SELECT * FROM rooms WHERE property_id = $1 ORDER BY name', [property_id]);
      
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Simple rooms endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Serve frontend for all non-API routes (SPA fallback)
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const clientBuildPath = path.join(__dirname, '..', 'client', '.next');
  
  // Serve specific Next.js pages
  app.get('/', (req, res) => {
    const indexPath = path.join(clientBuildPath, 'server', 'pages', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.redirect('/status');
    }
  });
  
  app.get('/chat', (req, res) => {
    const chatPath = path.join(clientBuildPath, 'server', 'pages', 'chat.html');
    if (fs.existsSync(chatPath)) {
      res.sendFile(chatPath);
    } else {
      res.redirect('/status');
    }
  });
  
  app.get('/admin', (req, res) => {
    const adminPath = path.join(clientBuildPath, 'server', 'pages', 'admin.html');
    if (fs.existsSync(adminPath)) {
      res.sendFile(adminPath);
    } else {
      res.redirect('/status');
    }
  });
  
  // Status page for when frontend isn't built yet
  app.get('/status', (req, res) => {
    const fs = require('fs');
    const clientBuildPath = path.join(__dirname, '..', 'client', '.next');
    const indexPath = path.join(clientBuildPath, 'server', 'pages', 'index.html');
    
    // Debug information
    const debugInfo = {
      buildPath: clientBuildPath,
      indexPath: indexPath,
      buildPathExists: fs.existsSync(clientBuildPath),
      indexPathExists: fs.existsSync(indexPath),
      currentDir: __dirname,
      processEnv: process.env.NODE_ENV
    };
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Encore Architect</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background: #0a0a0f; 
              color: white; 
              padding: 40px; 
              text-align: center;
            }
            .container { max-width: 800px; margin: 0 auto; }
            .logo { font-size: 3em; margin-bottom: 20px; background: linear-gradient(45deg, #4965ff, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .status { background: #1a1a2e; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left; }
            .api-link { color: #06b6d4; text-decoration: none; }
            .api-link:hover { text-decoration: underline; }
            .debug { font-family: monospace; font-size: 12px; background: #2a2a3e; padding: 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="logo">🏗️ Encore Architect</h1>
            <div class="status">
              <h2>✅ Backend Successfully Deployed!</h2>
              <p>Your Encore Architect backend is running on Railway.</p>
              <p><strong>Database:</strong> ${usePostgres ? 'PostgreSQL' : 'SQLite'}</p>
              <p><strong>API Status:</strong> <span style="color: #10b981;">Online</span></p>
            </div>
            <div class="status">
              <h3>🔗 API Endpoints</h3>
              <p><a href="/api/health" class="api-link">Health Check</a></p>
              <p><a href="/api/properties" class="api-link">Properties API</a></p>
            </div>
            <div class="status">
              <h3>🔍 Debug Information</h3>
              <div class="debug">
                <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            </div>
            <div class="status">
              <h3>📝 Next Steps</h3>
              <p>Building frontend - please wait...</p>
              <p>Frontend will be available shortly</p>
            </div>
          </div>
        </body>
      </html>
    `);
  });
  
  // Catch-all for other routes
  app.get('*', (req, res) => {
    res.redirect('/status');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  
  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }
  
  if (err.type === 'openai') {
    return res.status(503).json({
      error: 'AI Service Error',
      message: 'The AI service is temporarily unavailable. Please try again later.'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong. Please try again later.'
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found.'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    logger.info(`Database initialized successfully (${usePostgres ? 'PostgreSQL' : 'SQLite'})`);
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`Database type: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

startServer();

module.exports = app; 