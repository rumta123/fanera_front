// src/components/WorkshopManager.jsx
import React, { useState, useEffect } from 'react';
import { workshopApi } from '../services/workshopApi';

export default function WorkshopManager() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      const data = await workshopApi.getAll();
      setWorkshops(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await workshopApi.update(editingId, form);
      } else {
        await workshopApi.create(form);
      }
      resetForm();
      await loadWorkshops();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (workshop) => {
    setForm({
      name: workshop.name || '',
      description: workshop.description || '',
    });
    setEditingId(workshop.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить этот цех?')) return;
    try {
      await workshopApi.delete(id);
      await loadWorkshops();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <span className="text-gray-500">Загрузка цехов...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Ошибка: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🏭</span> Управление цехами
        </h2>
        <p className="text-gray-600 mt-1">Добавляйте и редактируйте цеха (только название и описание)</p>
      </div>

      {/* Форма */}
      {isFormOpen && (
        <div className="bg-white p-5 rounded-xl shadow mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingId ? 'Редактировать цех' : 'Добавить новый цех'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название цеха *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: Цех фанеры №1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание (опционально)
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Дополнительная информация о цехе"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {editingId ? 'Сохранить' : 'Добавить'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Кнопка "Добавить цех" */}
      {!isFormOpen && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="mb-6 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-2"
        >
          <span>+</span> Добавить цех
        </button>
      )}

      {/* Список цехов */}
      <div>
        {workshops.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>Цехов пока нет. Добавьте первый!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workshops.map((w) => (
              <div
                key={w.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <div>
                  <h4 className="font-semibold text-gray-800">{w.name}</h4>
                  {w.description && (
                    <p className="text-gray-600 text-sm mt-1">{w.description}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(w)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}