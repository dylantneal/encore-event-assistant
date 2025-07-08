import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const BACKEND_URL = 'https://web-production-ff93.up.railway.app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  try {
    // Forward the request to the backend
    const response = await axios({
      method: req.method,
      url: `${BACKEND_URL}/api/${apiPath}`,
      data: req.body,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      params: req.query,
    });

    // Forward the response
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Proxy Error', 
        message: 'Failed to connect to backend service' 
      });
    }
  }
} 