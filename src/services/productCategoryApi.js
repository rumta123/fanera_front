// src/services/productCategoryApi.js
import { apiRequest } from '../utils/api';

export const productCategoryApi = {
  getAll: () => apiRequest('/product-categories'),
};
