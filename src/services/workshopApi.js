// src/services/workshopApi.js
const API_URL = 'http://localhost:3000/workshops';

export const workshopApi = {
  // Получить все цеха
  async getAll() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Не удалось загрузить список цехов');
    return res.json();
  },

  // Получить цех по ID
  async getById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error('Цех не найден');
    return res.json();
  },

  // Создать новый цех
  async create(data) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ошибка создания цеха: ${errorText || res.status}`);
    }
    return res.json();
  },

  // Обновить цех
  async update(id, data) {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ошибка обновления цеха: ${errorText || res.status}`);
    }
    return res.json();
  },

  // Удалить цех
  async delete(id) {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Не удалось удалить цех');
  },
};