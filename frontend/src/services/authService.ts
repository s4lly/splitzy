import axios from 'axios';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios to include credentials (cookies)
axios.defaults.withCredentials = true;

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
  register: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/register`, userData);
      return response.data;
    } catch (error) {
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
  login: async (credentials) => {
    try {
      const response = await axios.post(`${API_URL}/login`, credentials);
      return response.data;
    } catch (error) {
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
      return response.data;
    } catch (error) {
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
