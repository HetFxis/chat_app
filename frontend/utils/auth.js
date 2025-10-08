import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add token
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

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/api/refresh`, {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token, user } = response.data;
        
        // Update stored tokens
        localStorage.setItem('token', access_token);
        localStorage.setItem('refreshToken', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
