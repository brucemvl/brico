import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // ou l'IP de ton PC si mobile
  timeout: 5000,
});

export default api;