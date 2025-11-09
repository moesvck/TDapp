import axios from 'axios';

const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Helper functions untuk manage token
export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const getRefreshToken = () => {
  return (
    localStorage.getItem('refreshToken') ||
    sessionStorage.getItem('refreshToken')
  );
};

export const setToken = (token, refreshToken = null, remember = false) => {
  if (remember) {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  } else {
    sessionStorage.setItem('token', token);
    if (refreshToken) sessionStorage.setItem('refreshToken', refreshToken);
  }
};

export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refreshToken');
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor dengan auto refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ JIKA ERROR 401 DAN BELUM PERNAH RETRY
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // ✅ JIKA SEDANG REFRESH, TUNGGU DI QUEUE
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ COBA REFRESH TOKEN
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/token`, {
          refreshToken: refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // ✅ SIMPAN TOKEN BARU
        setToken(accessToken, newRefreshToken, true);

        // ✅ UPDATE HEADER DAN PROCESS QUEUE
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        // ✅ RETRY REQUEST ORIGINAL
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // ✅ JIKA REFRESH GAGAL, LOGOUT
        processQueue(refreshError, null);
        removeToken();

        window.dispatchEvent(
          new CustomEvent('tokenExpired', {
            detail: { message: 'Session expired. Please login again.' },
          })
        );

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const pduService = {
  // ✅ SERVICE UNTUK REFRESH TOKEN
  refreshToken: async (refreshToken) => {
    try {
      const response = await axios.post(`${API_URL}/token`, { refreshToken });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  getPDU: async () => {
    try {
      const response = await api.get('/pdu');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  getAcara: async () => {
    try {
      const response = await api.get('/acara');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // ... lainnya
};
