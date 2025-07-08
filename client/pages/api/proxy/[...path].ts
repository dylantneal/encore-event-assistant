import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const BACKEND_URL = 'https://web-production-ff93.up.railway.app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path, ...queryParams } = req.query;
  
  // Build the API path
  let apiPath = '';
  if (Array.isArray(path)) {
    apiPath = path.join('/');
  } else if (path) {
    apiPath = path;
  }
  
  console.log('Proxy request:', {
    method: req.method,
    apiPath,
    url: `${BACKEND_URL}/api/${apiPath}`,
    queryParams
  });
  
  try {
    // Forward the request to the backend
    const response = await axios({
      method: req.method || 'GET',
      url: `${BACKEND_URL}/api/${apiPath}`,
      data: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      params: queryParams,
      timeout: 30000,
    });

    console.log('Proxy response:', {
      status: response.status,
      dataLength: JSON.stringify(response.data).length
    });

    // Forward the response
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: `${BACKEND_URL}/api/${apiPath}`
    });
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Backend Error',
        message: error.response.statusText || 'Backend request failed',
        status: error.response.status
      });
    } else {
      res.status(500).json({ 
        error: 'Proxy Error', 
        message: 'Failed to connect to backend service',
        details: error.message
      });
    }
  }
} 