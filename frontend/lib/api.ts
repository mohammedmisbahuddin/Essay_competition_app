import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: any) =>
    api.post('/auth/register', userData),
  
  getProfile: () =>
    api.get('/auth/profile'),
  
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', passwordData),
};

// Participants API
export const participantsAPI = {
  getAll: (params?: any) =>
    api.get('/participants', { params }),
  
  search: (identifier: string) =>
    api.get(`/participants/search/${identifier}`),
  
  validate: (registrationNumber: string) =>
    api.get(`/participants/validate/${registrationNumber}`),
  
  create: (participantData: any) =>
    api.post('/participants', participantData),
  
  update: (id: number, participantData: any) =>
    api.put(`/participants/${id}`, participantData),
  
  delete: (id: number) =>
    api.delete(`/participants/${id}`),
};

// Evaluations API
export const evaluationsAPI = {
  getForm: (registrationNumber: string) =>
    api.get(`/evaluations/participant/${registrationNumber}`),
  
  submit: (evaluationData: any) =>
    api.post('/evaluations', evaluationData),
  
  getMyEvaluations: (params?: any) =>
    api.get('/evaluations/my-evaluations', { params }),
  
  update: (evaluationId: number, evaluationData: any) =>
    api.put(`/evaluations/${evaluationId}`, evaluationData),
};

// Admin API
export const adminAPI = {
  getStats: () =>
    api.get('/admin/stats'),
  
  getResults: (params?: any) =>
    api.get('/admin/results', { params }),
  
  getParticipantDetails: (participantId: number) =>
    api.get(`/admin/results/${participantId}`),
  
  getUsers: () =>
    api.get('/admin/users'),
  
  updateUserStatus: (userId: number, isActive: boolean) =>
    api.patch(`/admin/users/${userId}/status`, { is_active: isActive }),
  
  getSettings: () =>
    api.get('/admin/settings'),
  
  updateSettings: (settings: any) =>
    api.put('/admin/settings', settings),
  
  exportResults: () =>
    api.get('/admin/export/results', { responseType: 'blob' }),
  
  exportParticipants: () =>
    api.get('/admin/export/participants', { responseType: 'blob' }),
  
  importFromCSV: (file: File) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    return api.post('/admin/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Google Sheets API
export const googleSheetsAPI = {
  configure: (config: { sheet_url: string; range?: string }) =>
    api.post('/google-sheets/configure', config),
  
  sync: () =>
    api.post('/google-sheets/sync'),
  
  getStatus: () =>
    api.get('/google-sheets/status'),
  
  test: (config: { sheet_url: string; range?: string }) =>
    api.post('/google-sheets/test', config),
};

export default api;

