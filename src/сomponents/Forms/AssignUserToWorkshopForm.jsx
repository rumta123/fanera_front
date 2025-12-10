// src/components/AssignUserToWorkshopForm.jsx
import React, { useState } from 'react';
import { userWorkshopApi } from '../../services/userWorkshopApi';

export default function AssignUserToWorkshopForm({ userId, workshops, onAssign }) {
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorkshopId) return;

    setLoading(true);
    setError(null);
    
    try {
      await userWorkshopApi.assign({
        user_id: userId,
        workshop_id: Number(selectedWorkshopId),
      });
      onAssign(); // обновить список
      setSelectedWorkshopId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Если нет цехов — ничего не показываем
  if (workshops.length === 0) {
    return <p className="text-gray-500">Нет доступных цехов</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg">
      <h3 className="font-medium text-gray-800 mb-2">Добавить в цех</h3>
      <div className="flex gap-2">
        <select
          value={selectedWorkshopId}
          onChange={(e) => setSelectedWorkshopId(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-1"
          disabled={loading}
        >
          <option value="">Выберите цех</option>
          {workshops.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          disabled={!selectedWorkshopId || loading}
        >
          {loading ? '...' : 'Добавить'}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </form>
  );
}