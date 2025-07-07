import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://your-production-url.com' 
    : 'http://localhost:3001');

// Create axios instance with default config
export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add property ID to requests
api.interceptors.request.use(
  (config) => {
    // Add property ID to requests that need it (only on client side)
    if (typeof window !== 'undefined') {
      const propertyId = localStorage.getItem('selectedPropertyId');
      if (propertyId && config.method === 'get' && config.url) {
        const url = new URL(config.url, config.baseURL);
        if (!url.searchParams.has('property_id') && 
            (config.url.includes('/inventory') || 
             config.url.includes('/rooms') || 
             config.url.includes('/labor-rules'))) {
          url.searchParams.set('property_id', propertyId);
          config.url = url.pathname + url.search;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API methods
export const chatAPI = {
  sendMessage: (messages: any[], propertyId: number) => {
    return api.post('/chat', {
      messages,
      propertyId
    });
  },
  
  health: () => api.get('/health')
};

export const propertiesAPI = {
  getAll: () => api.get('/properties'),
  getById: (id: number) => api.get(`/properties/${id}`),
  create: (data: any) => api.post('/properties', data),
  update: (id: number, data: any) => api.put(`/properties/${id}`, data),
  delete: (id: number) => api.delete(`/properties/${id}`)
};

export const roomsAPI = {
  getAll: (propertyId: number) => api.get(`/rooms?property_id=${propertyId}`),
  getById: (id: number) => api.get(`/rooms/${id}`),
  create: (data: any) => api.post('/rooms', data),
  update: (id: number, data: any) => api.put(`/rooms/${id}`, data),
  delete: (id: number) => api.delete(`/rooms/${id}`)
};

export const inventoryAPI = {
  getAll: (propertyId: number) => api.get(`/inventory?property_id=${propertyId}`),
  getById: (id: number) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: number, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`)
};

export const laborRulesAPI = {
  getAll: (propertyId: number) => api.get(`/labor-rules?property_id=${propertyId}`),
  getById: (id: number) => api.get(`/labor-rules/${id}`),
  create: (data: any) => api.post('/labor-rules', data),
  update: (id: number, data: any) => api.put(`/labor-rules/${id}`, data),
  delete: (id: number) => api.delete(`/labor-rules/${id}`)
};

export const unionsAPI = {
  getAll: (propertyId: number) => api.get(`/unions?property_id=${propertyId}`),
  getById: (id: number) => api.get(`/unions/${id}`),
  create: (data: any) => api.post('/unions', data),
  update: (id: number, data: any) => api.put(`/unions/${id}`, data),
  delete: (id: number) => api.delete(`/unions/${id}`)
};

export const importAPI = {
  uploadInventory: (propertyId: number, file: File, replaceExisting: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('property_id', propertyId.toString());
    formData.append('replace_existing', replaceExisting.toString());
    
    return api.post('/import/inventory', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for large file uploads
    });
  },
  
  uploadRooms: (propertyId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('property_id', propertyId.toString());
    
    return api.post('/import/rooms', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadLaborRules: (propertyId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('property_id', propertyId.toString());
    
    return api.post('/import/labor', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  downloadTemplate: () => {
    return api.get('/import/template', {
      responseType: 'blob',
    });
  },
  
  exportData: (propertyId: number) => {
    return api.get(`/import/export?property_id=${propertyId}`, {
      responseType: 'blob',
    });
  }
};

export default api; 