const express = require('express');
const OpenAIService = require('../services/openai');
const { logger } = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
let openaiService = null;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/chat');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF) and PDF files are allowed'));
    }
  }
});

// Lazy initialization of OpenAI service
const getOpenAIService = () => {
  if (!openaiService) {
    openaiService = new OpenAIService();
  }
  return openaiService;
};

// POST /api/chat - Process chat message with optional file attachment
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // Parse messages from form data or JSON body
    let messages, propertyId;
    
    if (req.file) {
      // If file is uploaded, data comes as form data
      messages = JSON.parse(req.body.messages);
      propertyId = req.body.propertyId;
    } else {
      // Regular JSON request
      messages = req.body.messages;
      propertyId = req.body.propertyId;
    }

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Messages array is required'
      });
    }

    if (!propertyId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Property ID is required'
      });
    }

    // Validate message format
    for (const message of messages) {
      if (!message.role || !message.content) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Each message must have role and content'
        });
      }
      
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Message role must be user, assistant, or system'
        });
      }
    }

    // Process file if uploaded
    let fileData = null;
    if (req.file) {
      fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      };
      
      logger.info('File uploaded for chat', {
        filename: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      });
    }

    logger.info('Processing chat request', {
      propertyId,
      messageCount: messages.length,
      hasFile: !!fileData,
      fileType: fileData?.mimetype,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
    });

    // Process conversation with OpenAI (including file if present)
    const result = await getOpenAIService().processConversation(messages, propertyId, fileData);

    // Clean up uploaded file after processing
    if (fileData) {
      try {
        await fs.unlink(fileData.path);
      } catch (error) {
        logger.error('Error deleting uploaded file:', error);
      }
    }

    // Log the response
    logger.info('Chat response generated', {
      propertyId,
      responseLength: result.message?.length || 0,
      functionCallCount: result.functionCallCount,
      usage: result.usage
    });

    res.json({
      message: result.message,
      usage: result.usage,
      functionCallCount: result.functionCallCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Chat endpoint error:', error);
    
    // Clean up file if error occurred
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Error deleting uploaded file after error:', unlinkError);
      }
    }
    
    if (error.type === 'openai') {
      return res.status(503).json({
        error: 'OpenAI Service Error',
        message: error.message || 'Failed to process chat request with OpenAI'
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request'
    });
  }
});

// GET /api/chat/health - Health check for OpenAI integration
router.get('/health', async (req, res) => {
  try {
    // Simple health check - we don't want to waste API calls
    res.json({
      status: 'healthy',
      service: 'chat',
      openai_configured: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Chat health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router; 