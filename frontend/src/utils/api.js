import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  getGoogleAuthUrl: async () => {
    const response = await api.get('/api/auth/google/login');
    return response.data;
  },

  handleGoogleCallback: async (code, state) => {
    const response = await api.post('/api/auth/google/callback', { code, state });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Template API
export const templateAPI = {
  list: async () => {
    const response = await api.get('/api/templates');
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/templates/${id}`);
    return response.data;
  },

  create: async (template) => {
    const response = await api.post('/api/templates', template);
    return response.data;
  },

  update: async (id, template) => {
    const response = await api.put(`/api/templates/${id}`, template);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/templates/${id}`);
    return response.data;
  },
};

// Session API
export const sessionAPI = {
  list: async () => {
    const response = await api.get('/api/sessions');
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/sessions/${id}`);
    return response.data;
  },

  create: async (session) => {
    const response = await api.post('/api/sessions', session);
    return response.data;
  },

  uploadAudio: async (sessionId, fieldKey, audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const response = await api.post(
      `/api/sessions/${sessionId}/upload-audio?field_key=${fieldKey}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  updateField: async (sessionId, fieldKey, value, transcription = null) => {
    const response = await api.post(`/api/sessions/${sessionId}/update-field`, {
      field_key: fieldKey,
      value,
      transcription,
    });
    return response.data;
  },

  complete: async (sessionId) => {
    const response = await api.post(`/api/sessions/${sessionId}/complete`);
    return response.data;
  },
};

export default api;
