import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

// Intercetta ogni richiesta e aggiunge il token se presente
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("access_token");
  if (t) {
    if (!config.headers) {
      config.headers = {};
    }
    (config.headers as any).Authorization = `Bearer ${t}`;
  }
  return config;
});

export default api;
