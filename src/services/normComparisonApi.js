// src/services/normComparisonApi.js
import { apiRequest } from '../utils/api';

export const normComparisonApi = {
  // Получить факт + норму по партии
  getComparisonByBatch: (batchId) => 
    apiRequest(`/norm-comparison/batch/${batchId}`),
};