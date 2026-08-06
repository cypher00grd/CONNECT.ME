import axios from 'axios';
import { API_URL } from '../utils/constants';

let accessToken = null;
let refreshPromise = null;
const tokenListeners = new Set();

export const setAccessToken = (token) => {
  accessToken = token || null;
  tokenListeners.forEach((listener) => listener(accessToken));
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  setAccessToken(null);
};

export const subscribeAccessToken = (listener) => {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
};

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
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
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout']
      .some((path) => originalRequest?.url?.includes(path));

    // Handle 401 Unauthorized
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise ||= api.post('/auth/refresh');
        const refreshResponse = await refreshPromise;
        refreshPromise = null;

        const token = refreshResponse.data?.data?.token;
        if (token) {
          setAccessToken(token);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch {
        refreshPromise = null;
      }
    }

    if (error.response?.status === 401 && !isAuthRequest) {
      clearAccessToken();
      localStorage.removeItem('user');
      localStorage.removeItem('token');

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
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadAvatar: (data) => api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadImage: (data) => api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const userAPI = {
  search: (query) => {
    const params = typeof query === 'object' && query !== null
      ? { q: query.query || query.q || '', ...query.filters }
      : { q: query };
    return api.get('/users/search', { params });
  },
  getProfile: (username) => api.get(`/users/${username}`),
  getSuggestions: (filters = {}) => api.get('/users/suggestions', { params: filters }),
  follow: (userId) => api.post(`/users/${userId}/follow`),
  unfollow: (userId) => api.post(`/users/${userId}/unfollow`),
  getNotifications: () => api.get('/users/notifications'),
  markNotificationsRead: () => api.put('/users/notifications/read'),
  notifyFollowers: (data) => api.post('/users/notify-followers', data),
};

export const roomAPI = {
  create: (data) => api.post('/rooms', data),
  schedule: (data) => api.post('/rooms/schedule', data),
  startEvent: (id) => api.post(`/rooms/${id}/start-event`),
  getFeed: () => api.get('/rooms/feed'),
  getMyRooms: () => api.get('/rooms/my-rooms'),
  getUserScheduledRooms: (userId) => api.get(`/rooms/user/${userId}/scheduled`),
  getRoom: (id) => api.get(`/rooms/${id}`),
  join: (id) => api.post(`/rooms/${id}/join`),
  leave: (id) => api.post(`/rooms/${id}/leave`),
  destroy: (id) => api.delete(`/rooms/${id}`),
  getMessages: (id, params) => api.get(`/rooms/${id}/messages`, { params }),
};

export const bookingAPI = {
  createCheckoutSession: (data) => api.post('/bookings/create-checkout-session', data),
};

export const ticketAPI = {
  create: (data) => api.post('/tickets', data),
  getFeed: () => api.get('/tickets/feed'),
  getMyTickets: () => api.get('/tickets/my'),
  getTicket: (id) => api.get(`/tickets/${id}`),
  lock: (id) => api.post(`/tickets/${id}/lock`),
  approve: (id) => api.post(`/tickets/${id}/approve`),
  reject: (id) => api.post(`/tickets/${id}/reject`),
  cancel: (id) => api.post(`/tickets/${id}/cancel`),
  resolve: (id) => api.post(`/tickets/${id}/resolve`),
  refreshPayment: (id) => api.post(`/tickets/${id}/refresh-payment`),
  review: (id, data) => api.post(`/tickets/${id}/review`, data),
};

export const issueAPI = {
  create: (data) => api.post('/issues', data),
  getFeed: () => api.get('/issues/feed'),
  getMyIssues: () => api.get('/issues/my'),
  request: (id, data) => api.post(`/issues/${id}/requests`, data),
  approveRequest: (id, requestId) => api.post(`/issues/${id}/requests/${requestId}/approve`),
  rejectRequest: (id, requestId) => api.post(`/issues/${id}/requests/${requestId}/reject`),
  resolve: (id) => api.post(`/issues/${id}/resolve`),
};

export const activityAPI = {
  getMe: () => api.get('/activity/me'),
};

export default api;
