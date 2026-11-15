import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8001/api",
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("invoicecraft_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let Axios/browser set the correct multipart boundary for FormData.
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }

  return config;
});

export default api;