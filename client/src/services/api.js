import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  response => response,
  error => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
