// src/services/userWorkshopApi.js
const API_URL = 'http://localhost:3000/api/user-workshops';

export const userWorkshopApi = {
  // Назначить пользователя в цех
  async assign(dto) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Не удалось назначить пользователя в цех');
    return res.json();
  },

  // Открепить пользователя от цеха
  async remove(userId, workshopId) {
    const res = await fetch(`${API_URL}/${userId}/${workshopId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Не удалось удалить привязку');
  },

  // Получить все цеха пользователя
  async getWorkshopsByUser(userId) {
    const res = await fetch(`${API_URL}/user/${userId}`);
    if (!res.ok) throw new Error('Не удалось загрузить цеха пользователя');
    return res.json();
  },
};