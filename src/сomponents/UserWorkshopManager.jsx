// src/components/UserWorkshopAssignmentManager.jsx
import React, { useState, useEffect } from "react";
import { loadAssignmentData, updateWorkshopAssignment } from "../services/userWorkshopAssignmentApi";

// Справочник должностей
const POSITIONS = [
  { value: "", label: "—" },
  { value: "technologist", label: "Технолог" },
  { value: "operator", label: "Оператор" },
  { value: "electric", label: "Электрик" },
  { value: "engineer", label: "Инженер" },
  { value: "foreman", label: "Начальник цеха" },
];

export default function UserWorkshopManager() {
  const [users, setUsers] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAssignmentData()
      .then(({ users, workshops }) => {
        setUsers(users);
        setWorkshops(workshops);
      })
      .catch((err) => {
        console.error("Ошибка загрузки данных:", err);
        setError(err.message || "Не удалось загрузить данные");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handlePositionChange = async (userId, workshopId, position) => {
    try {
      await updateWorkshopAssignment(userId, workshopId, position);
      // Перезагрузка данных после изменения
      const data = await loadAssignmentData();
      setUsers(data.users);
      setWorkshops(data.workshops);
    } catch (err) {
      alert(err.message || "Ошибка при обновлении назначения");
    }
  };

  if (loading) return <div className="p-6">Загрузка...</div>;
  if (error) return <div className="p-6 text-red-600">Ошибка: {error}</div>;

  const userWorkers = users.filter((u) => u.roles?.includes("user"));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Назначение пользователей на цеха
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left">Пользователь</th>
              <th className="px-4 py-3 text-center">Роль в системе</th>
              {workshops.map((w) => (
                <th
                  key={w.id}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  {w.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {userWorkers.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {user.name || user.email}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {user.roles?.join(", ") || "—"}
                </td>
                {workshops.map((w) => {
                  const currentPosition = user.workshopMap.get(w.id) || "";
                  return (
                    <td key={w.id} className="px-3 py-3 text-center">
                      <select
                        value={currentPosition}
                        onChange={(e) => handlePositionChange(user.id, w.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1 w-32"
                      >
                        {POSITIONS.map((pos) => (
                          <option key={pos.value} value={pos.value}>
                            {pos.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userWorkers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">Нет пользователей для назначения</p>
          <p className="text-sm mt-1 text-gray-400">
            Создайте пользователя с ролью «Пользователь» через раздел «Пользователи»
          </p>
        </div>
      )}
    </div>
  );
}