// CORS configuration for Encore Architect
module.exports = {
  origin: true, // Allow all origins temporarily to fix the issue
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}; 