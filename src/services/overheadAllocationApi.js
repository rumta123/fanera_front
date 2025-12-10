// src/services/overheadAllocationApi.js
import { apiRequest } from '../utils/api';

const API = 'overhead-allocations';

export const overheadAllocationApi = {
  getAll: () => apiRequest(`/${API}`),
  getByBatchId: (batchId) => apiRequest(`/${API}/by-batch/${batchId}`),
  create: (data) => apiRequest(`/${API}`, 'POST', data),
  update: (id, data) => apiRequest(`/${API}/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/${API}/${id}`, 'DELETE'),
};