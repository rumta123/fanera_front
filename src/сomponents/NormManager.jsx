// src/components/NormManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import { normApi } from "../services/normApi";
import { productApi } from "../services/productApi";
import { workshopApi } from "../services/workshopApi";

export default function NormManager() {
  const [norms, setNorms] = useState([]);
  const [products, setProducts] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    product_id: "",
    input_product_id: "",
    workshop_id: "",
    quantity_per_unit: "",
    period_start: "",
    period_end: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "desc" });

  // 🔑 Укажите правильные category_id для ваших данных
  const FINISHED_CATEGORY_IDS = [3];   // Готовая продукция (фанера и т.п.)
  const INPUT_CATEGORY_IDS = [1, 2];  // Сырьё, полуфабрикаты (шпон, клей и т.п.)

  // Фильтрация продуктов по категориям
  const finishedProducts = useMemo(
    () => products.filter(p => FINISHED_CATEGORY_IDS.includes(p.category_id)),
    [products]
  );

  const inputProducts = useMemo(
    () => products.filter(p => INPUT_CATEGORY_IDS.includes(p.category_id)),
    [products]
  );

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        const [normList, prodList, wsList] = await Promise.all([
          normApi.getAll(),
          productApi.getAll(),
          workshopApi.getAll(),
        ]);
        setNorms(normList);
        setProducts(prodList);
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
      ...form,
      product_id: Number(form.product_id),
      input_product_id: Number(form.input_product_id),
      workshop_id: Number(form.workshop_id),
      quantity_per_unit: Number(form.quantity_per_unit),
    };

    // Проверка на NaN
    if (
      isNaN(payload.product_id) ||
      isNaN(payload.input_product_id) ||
      isNaN(payload.workshop_id) ||
      isNaN(payload.quantity_per_unit)
    ) {
      alert("Пожалуйста, заполните все поля корректно.");
      return;
    }

    // Валидация периода
    const start = new Date(payload.period_start);
    const end = new Date(payload.period_end);
    if (end < start) {
      alert("Дата окончания не может быть раньше даты начала");
      return;
    }

    try {
      if (editingId) {
        await normApi.update(editingId, payload);
      } else {
        await normApi.create(payload);
      }

      const updated = await normApi.getAll();
      setNorms(updated);
      resetForm();
    } catch (err) {
      alert(err.message || "Ошибка при сохранении нормы");
    }
  };

  const handleEdit = (norm) => {
    setForm({
      product_id: norm.product_id?.toString() || "",
      input_product_id: norm.input_product_id?.toString() || "",
      workshop_id: norm.workshop_id?.toString() || "",
      quantity_per_unit: norm.quantity_per_unit?.toString() || "",
      period_start: norm.period_start ? norm.period_start.split("T")[0] : "",
      period_end: norm.period_end ? norm.period_end.split("T")[0] : "",
    });
    setEditingId(norm.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить норму?")) return;
    try {
      await normApi.delete(id);
      setNorms((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      alert(err.message || "Ошибка при удалении");
    }
  };

  const resetForm = () => {
    setForm({
      product_id: "",
      input_product_id: "",
      workshop_id: "",
      quantity_per_unit: "",
      period_start: "",
      period_end: "",
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  // Поиск и сортировка
  const filteredAndSortedNorms = useMemo(() => {
    let result = [...norms];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((n) => {
        const product = products.find(p => p.id === n.product_id);
        const inputProduct = products.find(p => p.id === n.input_product_id);
        const workshop = workshops.find(w => w.id === n.workshop_id);
        return (
          (product?.name?.toLowerCase().includes(term) || product?.sku?.toLowerCase().includes(term)) ||
          (inputProduct?.name?.toLowerCase().includes(term) || inputProduct?.sku?.toLowerCase().includes(term)) ||
          workshop?.name?.toLowerCase().includes(term)
        );
      });
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === "period_start" || sortConfig.key === "period_end") {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        } else if (typeof aVal === "number" || typeof bVal === "number") {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [norms, searchTerm, sortConfig, products, workshops]);

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || `ID: ${id}`;
  const getWorkshopName = (id) => workshops.find(w => w.id === id)?.name || `ID: ${id}`;

  if (loading) return <div className="p-6">Загрузка нормативов...</div>;
  if (error) return <div className="p-6 text-red-600">Ошибка: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Нормативы расхода</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Добавить норму
        </button>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Поиск по продукту, сырью или цеху..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Форма */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-lg shadow mb-8 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Редактировать норму" : "Добавить норму"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Готовый продукт *</label>
              <select
                name="product_id"
                value={form.product_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите продукт</option>
                {finishedProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сырьё / полуфабрикат *</label>
              <select
                name="input_product_id"
                value={form.input_product_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите сырьё</option>
                {inputProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цех *</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Норма на 1 ед. (например: 0.4)
              </label>
              <input
                type="number"
                name="quantity_per_unit"
                value={form.quantity_per_unit}
                onChange={handleChange}
                min="0"
                step="0.001"
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Период: с</label>
              <input
                type="date"
                name="period_start"
                value={form.period_start}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">по</label>
              <input
                type="date"
                name="period_end"
                value={form.period_end}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
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
        {filteredAndSortedNorms.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Нормативы не найдены</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => requestSort("product_id")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Продукт
                </th>
                <th
                  onClick={() => requestSort("input_product_id")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Сырьё
                </th>
                <th
                  onClick={() => requestSort("workshop_id")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Цех
                </th>
                <th
                  onClick={() => requestSort("quantity_per_unit")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Норма
                </th>
                <th
                  onClick={() => requestSort("period_start")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Период
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedNorms.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{getProductName(n.product_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getProductName(n.input_product_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getWorkshopName(n.workshop_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{n.quantity_per_unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {n.period_start?.split("T")[0]} — {n.period_end?.split("T")[0]}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleEdit(n)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
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