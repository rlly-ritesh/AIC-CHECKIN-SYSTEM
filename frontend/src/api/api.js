import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject the auth token into requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = async (username, password) => {
  try {
    const response = await apiClient.post('/login', { username, password });
    if (response.data && response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user_role', response.data.role);
    }
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
};

export const getStats = async () => {
  try {
    const response = await apiClient.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

export const scanParticipant = async (uid) => {
  try {
    const response = await apiClient.post('/scan', { uid });
    return response.data;
  } catch (error) {
    console.error('Error verifying scan:', error);
    return { valid: false, message: 'Network error or server unavailable' };
  }
};

export const checkinParticipant = async (uid) => {
  try {
    const response = await apiClient.post('/checkin', { uid });
    return response.data;
  } catch (error) {
    console.error('Error confirming checkin:', error);
    if (error.response && error.response.data) {
        return error.response.data;
    }
    return { status: 'error', message: 'Checkin Failed' };
  }
};

export default apiClient;
