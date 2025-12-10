import React, { useEffect, useState } from "react";
import { apiRequest } from "../utils/api";

// Человекочитаемые названия сущностей
const ENTITY_TYPE_LABELS = {
  car: "Автомобиль",
  deal: "Сделка",
  user: "Пользователь",
  payment: "Платёж",
  request: "заявка",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterEntityId, setFilterEntityId] = useState("");

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем логи и пользователей параллельно
        const [logsData, usersData] = await Promise.all([
          apiRequest("/audit-logs"),
          apiRequest("/auth/users"), // твой эндпоинт для админов
        ]);
        setLogs(Array.isArray(logsData) ? logsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error("Ошибка загрузки аудит-логов:", err);
        setError("Не удалось загрузить журнал действий");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Фильтрация логов
  const filteredLogs = logs.filter((log) => {
    if (filterUserId && log.userId !== Number(filterUserId)) return false;
    if (filterEntityType && log.entityType !== filterEntityType) return false;
    if (filterEntityId && log.entityId !== Number(filterEntityId)) return false;
    return true;
  });

  const getUserName = (userId) => {
    if (userId === null) return "Система";
    const user = users.find((u) => u.id === userId);
    return user ? user.email || `ID: ${userId}` : `ID: ${userId}`;
  };

  const getEntityLabel = (type, id) => {
    const typeName = ENTITY_TYPE_LABELS[type] || type;
    return `${typeName} #${id}`;
  };

  if (loading)
    return <div className="p-6 text-center">Загрузка журнала...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Журнал аудита</h1>

      {/* Фильтры */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Пользователь
          </label>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          >
            <option value="">Все пользователи</option>

            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email} {user.name ? `(${user.name})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Тип сущности
          </label>
          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          >
            <option value="">Все типы</option>
            <option value="car">Автомобиль</option>
            <option value="deal">Сделка</option>
            <option value="user">Пользователь</option>
            <option value="payment">Платёж</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID сущности
          </label>
          <input
            type="number"
            value={filterEntityId}
            onChange={(e) => setFilterEntityId(e.target.value)}
            placeholder="Например: 5"
            className="w-full border rounded p-2 text-sm"
          />
        </div>
      </div>

      {/* Список логов */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <p>Нет записей в журнале</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...filteredLogs]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // новые сверху
            .map((log) => (
              <div
                key={log.id}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      <span className="text-blue-600">
                        {getUserName(log.userId)}
                      </span>{" "}
                      <span className="text-gray-700">{log.action}</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Объект:{" "}
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {getEntityLabel(log.entityType, log.entityId)}
                      </span>
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
