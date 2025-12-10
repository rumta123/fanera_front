// src/services/userService.js
import { apiRequest } from '../utils/api';

export const userService = {
  async getAll() {
    return await apiRequest('/auth/users');
  }
};