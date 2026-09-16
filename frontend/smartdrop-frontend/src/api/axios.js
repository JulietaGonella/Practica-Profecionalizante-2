import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Variables de control para peticiones concurrentes
let isRefreshing = false;
let failedQueue = [];

// Procesa todas las peticiones que quedaron esperando el nuevo token
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

// 1️⃣ Interceptor de Petición: Adjunta el Access Token activo (compatible con 'accessToken' o 'token')
api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Buscamos con cualquiera de las dos keys para evitar errores de nombres
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2️⃣ Interceptor de Respuesta: Refresco automático y transparente con cola
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si la API responde 401 y la petición no se ha reintentado aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Si ya hay una petición renovando el token, encolar esta llamada
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Solicitar nuevo Access Token usando el Refresh Token
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        const newAccessToken = data.accessToken;

        // Guardar el nuevo token en storage
        localStorage.setItem('accessToken', newAccessToken);

        // Actualizar header de la petición original
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Liberar peticiones en cola asignándoles el nuevo token
        processQueue(null, newAccessToken);

        // Reintentar la petición original
        return api(originalRequest);
      } catch (refreshError) {
        // Si el refresh token venció (30 días) o fue revocado, limpiar sesión
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // 🟢 Corregido: Redirección a '/login'
        window.location.href = '/login'; 
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;