// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment 
  ? '/api' // Use proxy in development
  : (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL + '/api' || 'https://your-backend.herokuapp.com/api');

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  WALLET_CONNECT: `${API_BASE_URL}/auth/wallet-connect`,
  ME: `${API_BASE_URL}/auth/me`,

  // KYC
  KYC_SUBMIT: `${API_BASE_URL}/kyc/submit`,
  KYC_STATUS: `${API_BASE_URL}/kyc/status`,

  // Payments
  DEPOSIT: `${API_BASE_URL}/payments/deposit`,

  // Investments
  FIAT_INVESTMENT: `${API_BASE_URL}/investments/fiat`,

  // Users
  USER_WALLET: `${API_BASE_URL}/users/wallet/by-email`,

  // Health
  HEALTH: process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/health` : 'http://localhost:3001/health'
};

// Helper function for making API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: defaultHeaders,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

export default API_ENDPOINTS;
