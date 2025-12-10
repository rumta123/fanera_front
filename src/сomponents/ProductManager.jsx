// src/components/ProductManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import { productApi } from "../services/productApi";
import { productCategoryApi } from "../services/productCategoryApi";

const UNITS = ["м³", "кг", "лист"];

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // 🔍 Поиск и сортировка
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category_id: "",
    sort: "",
    thickness_mm: "",
    dimensions: "",
    unit: "лист",
  });

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, cats] = await Promise.all([
          productApi.getAll(),
          productCategoryApi.getAll(),
        ]);
        setProducts(prods);
        setCategories(cats);
      } catch (err) {
        setError("Не удалось загрузить данные");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 🔍 Фильтрация и сортировка
  const filteredAndSortedProducts = useMemo(() => {
    let result = products;

    // Поиск
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term)
      );
    }

    // Сортировка
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Обработка чисел
        if (sortConfig.key === "thickness_mm") {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }

        // Обработка строк
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [products, searchTerm, sortConfig]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      category_id: Number(form.category_id),
      thickness_mm: form.thickness_mm ? Number(form.thickness_mm) : undefined,
    };

    if (payload.thickness_mm == null || isNaN(payload.thickness_mm)) {
      delete payload.thickness_mm;
    }

    try {
      if (editingId) {
        await productApi.update(editingId, payload);
      } else {
        await productApi.create(payload);
      }

      const updated = await productApi.getAll();
      setProducts(updated);
      resetForm();
    } catch (err) {
      console.error("Ошибка:", err);
      alert(err.message || "Ошибка при сохранении");
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      category_id: product.category_id?.toString() || "",
      sort: product.sort || "",
      thickness_mm: product.thickness_mm?.toString() || "",
      dimensions: product.dimensions || "",
      unit: product.unit || "лист",
    });
    setEditingId(product.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить номенклатуру?")) return;
    try {
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message || "Ошибка при удалении");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      sku: "",
      category_id: "",
      sort: "",
      thickness_mm: "",
      dimensions: "",
      unit: "лист",
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  // 🔄 Переключение сортировки
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // ↕️ Иконка сортировки
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return "↕️";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  if (loading) return <div className="p-6">Загрузка номенклатуры...</div>;
  if (error) return <div className="p-6 text-red-600">Ошибка: {error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Номенклатура</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Добавить продукт
        </button>
      </div>

      {/* Панель поиска */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Поиск по названию или артикулу..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Форма */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-lg shadow mb-8 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Редактировать продукт" : "Добавить продукт"}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Артикул (SKU) *
              </label>
              <input
                type="text"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Категория *
              </label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите категорию</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сорт (опционально)
              </label>
              <input
                type="text"
                name="sort"
                value={form.sort}
                onChange={handleChange}
                placeholder="A, C, II/III и т.д."
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Толщина, мм
              </label>
              <input
                type="number"
                name="thickness_mm"
                value={form.thickness_mm}
                onChange={handleChange}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Габариты (Д×Ш×В)
              </label>
              <input
                type="text"
                name="dimensions"
                value={form.dimensions}
                onChange={handleChange}
                placeholder="1525×1525×12"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ед. измерения
              </label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
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

      {/* Список продуктов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAndSortedProducts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Номенклатура не найдена
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => requestSort("name")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Название {getSortIcon("name")}
                </th>
                <th
                  onClick={() => requestSort("sku")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Артикул {getSortIcon("sku")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Категория
                </th>
                <th
                  onClick={() => requestSort("sort")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Сорт {getSortIcon("sort")}
                </th>
                <th
                  onClick={() => requestSort("thickness_mm")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Толщина, мм {getSortIcon("thickness_mm")}
                </th>
                <th
                  onClick={() => requestSort("dimensions")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Габариты {getSortIcon("dimensions")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ед.
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {categories.find((c) => c.id === p.category_id)?.name ||
                      "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.sort || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.thickness_mm || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.dimensions || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.unit}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
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
