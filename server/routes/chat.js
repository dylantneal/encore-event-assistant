const express = require('express');
const OpenAIService = require('../services/openai');
const { logger } = require('../utils/logger');

const router = express.Router();
let openaiService = null;

// Lazy initialization of OpenAI service
const getOpenAIService = () => {
  if (!openaiService) {
    openaiService = new OpenAIService();
  }
  return openaiService;
};

// POST /api/chat - Process chat message
router.post('/', async (req, res) => {
  try {
    const { messages, propertyId } = req.body;

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

    logger.info('Processing chat request', {
      propertyId,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
    });

    // Process conversation with OpenAI
    const result = await getOpenAIService().processConversation(messages, propertyId);

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
    
    if (error.type === 'openai') {
      return res.status(503).json({
        error: 'AI Service Error',
        message: 'The AI service is temporarily unavailable. Please try again later.'
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