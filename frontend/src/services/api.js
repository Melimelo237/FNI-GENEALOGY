// ===================================
// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Instance axios configurée
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      // Erreur du serveur
      const message = error.response.data?.message || error.response.data?.error || 'Erreur serveur';
      throw new Error(message);
    } else if (error.request) {
      // Pas de réponse du serveur
      throw new Error('Impossible de contacter le serveur');
    } else {
      // Autre erreur
      throw new Error(error.message);
    }
  }
);

// Services API
export const personService = {
  search: async (params) => {
    const response = await api.get('/persons/search', { params });
    return response.data;
  },
  
  getDetails: async (id) => {
    const response = await api.get(`/persons/details?id=${id}`);
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/persons/stats');
    return response.data;
  }
};

export const genealogyService = {
  getTree: async (id, generations = 3) => {
    const response = await api.get(`/genealogy/tree?id=${id}&generations=${generations}`);
    return response.data;
  },
  
  getRelations: async (id) => {
    const response = await api.get(`/genealogy/relations?id=${id}`);
    return response.data;
  }
};

export const analyticsService = {
  getDemographics: async (params = {}) => {
    const response = await api.get('/analytics/demographics', { params });
    return response.data;
  },
  
  getTrends: async (params = {}) => {
    const response = await api.get('/analytics/trends', { params });
    return response.data;
  }
};

export const fraudService = {
  detect: async (params = {}) => {
    const response = await api.get('/fraud/detect', { params });
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/fraud/stats');
    return response.data;
  }
};

export const chatService = {
  sendMessage: async (message, context = {}) => {
    const response = await api.post('/chat/message', { message, context });
    return response.data;
  }
};


export const healthService = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
  
  test: async () => {
    const response = await api.get('/test');
    return response.data;
  }
};

export default api;