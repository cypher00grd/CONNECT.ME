import axios from 'axios';
import { API_URL } from '../utils/constants';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - Add auth token
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

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const userAPI = {
  search: (query) => api.get(`/users/search?q=${query}`),
  getProfile: (username) => api.get(`/users/${username}`),
  getSuggestions: () => api.get('/users/suggestions'),
  follow: (userId) => api.post(`/users/${userId}/follow`),
  unfollow: (userId) => api.post(`/users/${userId}/unfollow`),
  getNotifications: () => api.get('/users/notifications'),
  markNotificationsRead: () => api.put('/users/notifications/read'),
};

export const roomAPI = {
  create: (data) => api.post('/rooms', data),
  getFeed: () => api.get('/rooms/feed'),
  getMyRooms: () => api.get('/rooms/my-rooms'),
  getRoom: (id) => api.get(`/rooms/${id}`),
  join: (id) => api.post(`/rooms/${id}/join`),
  leave: (id) => api.post(`/rooms/${id}/leave`),
  destroy: (id) => api.delete(`/rooms/${id}`),
  getMessages: (id, params) => api.get(`/rooms/${id}/messages`, { params }),
};

export default api;