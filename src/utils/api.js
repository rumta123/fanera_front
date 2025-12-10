// src/utils/api.js
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
import Cookies from "js-cookie"; // ← добавьте импорт

export async function apiRequest(url, method = "GET", body = null) {
  const token = Cookies.get("token"); // ← получаем токен из cookies

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }), // ← добавляем заголовок
    },
    credentials: "include",
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${url}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Ошибка ${response.status}`);
  }

  return await response.json();
}

