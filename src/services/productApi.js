// src/services/productApi.js
import { apiRequest } from '../utils/api';

const API = 'products';

export const productApi = {
  getAll: () => apiRequest(`/${API}`),
  getById: (id) => apiRequest(`/${API}/${id}`),
  create: (data) => apiRequest(`/${API}`, 'POST', data),
  update: (id, data) => apiRequest(`/${API}/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/${API}/${id}`, 'DELETE'),
};