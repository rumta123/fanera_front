// src/components/CostCenterManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import { costCenterApi } from "../services/costCenterApi";
import { workshopApi } from "../services/workshopApi";

export default function CostCenterManager() {
  const [costCenters, setCostCenters] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    workshop_id: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "desc" });

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        const [ccList, wsList] = await Promise.all([
          costCenterApi.getAll(),
          workshopApi.getAll(),
        ]);
        setCostCenters(ccList);
        setWorkshops(wsList);
      } catch (err) {
        setError("Не удалось загрузить данные");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name.trim(),
      workshop_id: Number(form.workshop_id),
    };

    if (!payload.name || !payload.workshop_id) {
      alert("Заполните все поля.");
      return;
    }

    try {
      if (editingId) {
        await costCenterApi.update(editingId, payload);
      } else {
        await costCenterApi.create(payload);
      }

      const updated = await costCenterApi.getAll();
      setCostCenters(updated);
      resetForm();
    } catch (err) {
      alert(err.message || "Ошибка при сохранении центра затрат");
    }
  };

  const handleEdit = (cc) => {
    setForm({
      name: cc.name || "",
      workshop_id: cc.workshop_id?.toString() || "",
    });
    setEditingId(cc.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить центр затрат?")) return;
    try {
      await costCenterApi.delete(id);
      setCostCenters((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.message || "Ошибка при удалении");
    }
  };

  const resetForm = () => {
    setForm({ name: "", workshop_id: "" });
    setEditingId(null);
    setIsFormOpen(false);
  };

  // Поиск и сортировка
  const filteredAndSorted = useMemo(() => {
    let result = [...costCenters];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => {
        const workshop = workshops.find(w => w.id === c.workshop_id);
        return (
          c.name?.toLowerCase().includes(term) ||
          workshop?.name?.toLowerCase().includes(term)
        );
      });
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [costCenters, searchTerm, sortConfig, workshops]);

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getWorkshopName = (id) =>
    workshops.find(w => w.id === id)?.name || `ID: ${id}`;

  if (loading) return <div className="p-6">Загрузка центров затрат...</div>;
  if (error) return <div className="p-6 text-red-600">Ошибка: {error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Центры затрат</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Добавить центр затрат
        </button>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Поиск по названию или цеху..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Форма */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-lg shadow mb-8 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Редактировать центр затрат" : "Добавить центр затрат"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Электроэнергия, Амортизация и т.д."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цех *
              </label>
              <select
                name="workshop_id"
                value={form.workshop_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите цех</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {editingId ? "Сохранить" : "Добавить"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Центры затрат не найдены</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => requestSort("name")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Название
                </th>
                <th
                  onClick={() => requestSort("workshop_id")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Цех
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSorted.map((cc) => (
                <tr key={cc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{cc.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getWorkshopName(cc.workshop_id)}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleEdit(cc)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(cc.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}