import axios from 'axios';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios to include credentials (cookies) only in production
// In development/preview, we use JWT tokens instead of cookies
const isDevelopment =
  import.meta.env.VITE_VERCEL_ENV !== 'production' ||
  import.meta.env.DEV ||
  window.location.hostname === 'localhost';
if (!isDevelopment) {
  axios.defaults.withCredentials = true;
}

// JWT token management for development mode - accessor function for fresh reads
const getAuthToken = (): string | null => localStorage.getItem('auth_token');

// Set up axios interceptor to include JWT token in requests
axios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Set up axios interceptor to handle token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

/**
 * Service for user authentication
 */
const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - The username
   * @param {string} userData.email - The email address
   * @param {string} userData.password - The password
   * @returns {Promise} - A promise that resolves to the user data
   */
  register: async (userData: {
    username: string;
    email: string;
    password: string;
  }) => {
    try {
      const response = await axios.post(`${API_URL}/register`, userData);

      // Store JWT token if provided (for development mode)
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }

      return response.data;
    } catch (error: any) {
      console.error(
        'Registration error:',
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Log in a user
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - The username
   * @param {string} credentials.password - The password
   * @returns {Promise} - A promise that resolves to the user data
   */
  login: async (credentials: { username: string; password: string }) => {
    try {
      const response = await axios.post(`${API_URL}/login`, credentials);

      // Store JWT token if provided (for development mode)
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }

      return response.data;
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Log out the current user
   * @returns {Promise} - A promise that resolves when logout is complete
   */
  logout: async () => {
    try {
      const response = await axios.post(`${API_URL}/logout`);

      // Clear JWT token
      localStorage.removeItem('auth_token');

      return response.data;
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  /**
   * Get the current authenticated user
   * @returns {Promise} - A promise that resolves to the user data
   */
  getCurrentUser: async () => {
    try {
      const response = await axios.get(`${API_URL}/user`);
      return response.data;
    } catch (error) {
      // Not logged in
      return { success: false };
    }
  },
};

export default authService;
