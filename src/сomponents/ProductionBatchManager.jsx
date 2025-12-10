// src/components/ProductionBatchManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import { productionBatchApi } from "../services/productionBatchApi";
import { productApi } from "../services/productApi";
import { workshopApi } from "../services/workshopApi";
import BatchFactManager from "./BatchFactManager"; // ← импортируем
import BatchNormComparison from "./BatchNormComparison"; // ← новое
import OverheadAllocationManager from "./OverheadAllocationManager"; // ← для накладных расходов
import { useAuth } from "../hooks/useAuth";
export default function ProductionBatchManager() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null); // для BatchFactManager
  const [selectedComparisonBatchId, setSelectedComparisonBatchId] =
    useState(null); // для отчёта
  const [selectedOverheadBatchId, setSelectedOverheadBatchId] = useState(null); // ← для накладных расходов
  const { role } = useAuth();
  const [form, setForm] = useState({
    product_id: "",
    workshop_id: "",
    start_date: "",
    end_date: "",
    planned_quantity: "",
    actual_quantity: "",
    status: "в работе",
    planned_cost: "", // ← новое поле
    actual_cost: "", // ← новое поле
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "id",
    direction: "desc",
  });

  const getCostVariance = (batch) => {
    const { planned_cost, actual_cost } = batch;
    if (planned_cost == null || actual_cost == null) {
      return { variance: null, isProfit: null };
    }
    const variance = Number(actual_cost) - Number(planned_cost);
    return {
      variance,
      isProfit: variance < 0, // true = в плюс (дешевле плана)
    };
  };
  // 🔑 Категории для фильтрации (готовая продукция = 3)
  const FINISHED_CATEGORY_IDS = [3];
  const finishedProducts = useMemo(
    () => products.filter((p) => FINISHED_CATEGORY_IDS.includes(p.category_id)),
    [products]
  );

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        const [batchList, prodList, wsList] = await Promise.all([
          productionBatchApi.getAll(),
          productApi.getAll(),
          workshopApi.getAll(),
        ]);
        setBatches(batchList);
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
      product_id: Number(form.product_id),
      workshop_id: Number(form.workshop_id),
      start_date: form.start_date,
      end_date: form.end_date,
      planned_quantity: Number(form.planned_quantity),
      actual_quantity: form.actual_quantity
        ? Number(form.actual_quantity)
        : null,
      status: form.status,

      // 🔹 Правильная обработка стоимости
      planned_cost: form.planned_cost ? Number(form.planned_cost) : null,
      actual_cost: form.actual_cost ? Number(form.actual_cost) : null,
    };

    // Валидация обязательных полей (без стоимости!)
    if (
      !payload.product_id ||
      !payload.workshop_id ||
      !payload.start_date ||
      !payload.end_date ||
      isNaN(payload.planned_quantity)
    ) {
      alert("Пожалуйста, заполните все обязательные поля.");
      return;
    }

    if (new Date(payload.end_date) < new Date(payload.start_date)) {
      alert("Дата окончания не может быть раньше даты начала");
      return;
    }

    try {
      if (editingId) {
        await productionBatchApi.update(editingId, payload);
      } else {
        await productionBatchApi.create(payload);
      }

      const updated = await productionBatchApi.getAll();
      setBatches(updated);
      resetForm();
    } catch (err) {
      alert(err.message || "Ошибка при сохранении партии");
    }
  };

const handleEdit = (batch) => {
  setForm({
    product_id: batch.product_id?.toString() || "",
    workshop_id: batch.workshop_id?.toString() || "",
    start_date: batch.start_date || "",
    end_date: batch.end_date || "",
    planned_quantity: batch.planned_quantity?.toString() || "",
    actual_quantity: batch.actual_quantity != null ? batch.actual_quantity.toString() : "",
    status: batch.status || "в работе",
    // 🔹 ДОБАВЛЕНЫ поля себестоимости
    planned_cost: batch.planned_cost != null ? batch.planned_cost.toString() : "",
    actual_cost: batch.actual_cost != null ? batch.actual_cost.toString() : "",
  });
  setEditingId(batch.id);
  setIsFormOpen(true);
};

  const handleDelete = async (id) => {
    if (!confirm("Удалить производственную партию?")) return;
    try {
      await productionBatchApi.delete(id);
      setBatches((prev) => prev.filter((b) => b.id !== id));
      if (selectedBatchId === id) {
        setSelectedBatchId(null);
      }
      if (selectedComparisonBatchId === id) {
        setSelectedComparisonBatchId(null);
      }
      if (selectedOverheadBatchId === id) {
        setSelectedOverheadBatchId(null); // ← очистка при удалении
      }
    } catch (err) {
      alert(err.message || "Ошибка при удалении");
    }
  };

  const resetForm = () => {
    setForm({
      product_id: "",
      workshop_id: "",
      start_date: "",
      end_date: "",
      planned_quantity: "",
      actual_quantity: "",
      status: "в работе",
      planned_cost: "", // ← пустые строки — ок для input
      actual_cost: "",
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  // Поиск и сортировка
  const filteredAndSortedBatches = useMemo(() => {
    let result = [...batches];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((b) => {
        const product = products.find((p) => p.id === b.product_id);
        const workshop = workshops.find((w) => w.id === b.workshop_id);
        return (
          product?.name?.toLowerCase().includes(term) ||
          product?.sku?.toLowerCase().includes(term) ||
          workshop?.name?.toLowerCase().includes(term) ||
          b.status?.toLowerCase().includes(term)
        );
      });
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === "start_date" || sortConfig.key === "end_date") {
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
  }, [batches, searchTerm, sortConfig, products, workshops]);

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getProductName = (id) =>
    products.find((p) => p.id === id)?.name || `ID: ${id}`;
  const getWorkshopName = (id) =>
    workshops.find((w) => w.id === id)?.name || `ID: ${id}`;

  if (loading) return <div className="p-6">Загрузка партий...</div>;
  if (error) return <div className="p-6 text-red-600">Ошибка: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Производственные партии
        </h2>
        {["admin", "technolog"].includes(role) && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Создать партию
          </button>
        )}
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Поиск по продукту, цеху или статусу..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Форма создания/редактирования */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-lg shadow mb-8 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Редактировать партию" : "Создать партию"}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Продукт *
              </label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                План. кол-во *
              </label>
              <input
                type="number"
                name="planned_quantity"
                value={form.planned_quantity}
                onChange={handleChange}
                min="0"
                step="1"
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Факт. кол-во
              </label>
              <input
                type="number"
                name="actual_quantity"
                value={form.actual_quantity}
                onChange={handleChange}
                min="0"
                step="0.001"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата начала *
              </label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата окончания *
              </label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Статус
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="в работе">В работе</option>
                <option value="завершена">Завершена</option>
                <option value="отменена">Отменена</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Плановая себестоимость (₽)
              </label>
              <input
                type="number"
                name="planned_cost"
                value={form.planned_cost || ""}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Например: 50000.00"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фактическая себестоимость (₽)
              </label>
              <input
                type="number"
                name="actual_cost"
                value={form.actual_cost || ""}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Например: 48000.00"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {editingId ? "Сохранить" : "Создать"}
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

      {/* Таблица партий */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAndSortedBatches.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Партии не найдены</div>
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
                  onClick={() => requestSort("workshop_id")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Цех
                </th>
                <th
                  onClick={() => requestSort("planned_quantity")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  План
                </th>
                <th
                  onClick={() => requestSort("actual_quantity")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Факт
                </th>
                <th
                  onClick={() => requestSort("start_date")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Период
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Себестоимость
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedBatches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {getProductName(b.product_id)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getWorkshopName(b.workshop_id)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {b.planned_quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {b.actual_quantity || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {b.start_date} — {b.end_date}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        b.status === "завершена"
                          ? "bg-green-100 text-green-800"
                          : b.status === "отменена"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>

                  {/* В TBODY, внутри строки */}
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      const { variance, isProfit } = getCostVariance(b);
                      if (variance === null) {
                        return "—";
                      }
                      const sign = variance >= 0 ? "+" : "";
                      return (
                        <span
                          className={
                            isProfit
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {isProfit ? "в плюс" : "в минус"} ({sign}
                          {variance.toFixed(2)} ₽)
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {["admin", "technolog"].includes(role) && (
                      <button
                        onClick={() => handleEdit(b)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Редактировать
                      </button>
                    )}
                    {["admin", "technolog"].includes(role) && (
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-red-600 hover:text-red-900 mr-3"
                      >
                        Удалить
                      </button>
                    )}
                    {["admin", "technolog", "user"].includes(role) && (
                      <button
                        onClick={() => setSelectedBatchId(b.id)}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                      >
                        Расход
                      </button>
                    )}

                    {/* ✅ КНОПКА "Факт vs Норма" */}

                    <button
                      onClick={() => setSelectedComparisonBatchId(b.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Факт/Норма
                    </button>
                    {/* ✅ КНОПКА "Накладные" */}
                    {["admin", "manager"].includes(role) && (
                      <button
                        onClick={() => setSelectedOverheadBatchId(b.id)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Накладные
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Отображение BatchFactManager */}
      {selectedBatchId && (
        <BatchFactManager
          batchId={selectedBatchId}
          batchName={`${getProductName(
            batches.find((b) => b.id === selectedBatchId)?.product_id
          )} (${
            batches.find((b) => b.id === selectedBatchId)?.planned_quantity ||
            "?"
          })`}
        />
      )}

      {/* Отображение отчёта "Факт vs Норма" */}
      {selectedComparisonBatchId && (
        <BatchNormComparison
          batchId={selectedComparisonBatchId}
          onClose={() => setSelectedComparisonBatchId(null)}
        />
      )}

      {/* ✅ Отображение накладных расходов */}
      {selectedOverheadBatchId && (
        <OverheadAllocationManager
          batchId={selectedOverheadBatchId}
          batchName={`${getProductName(
            batches.find((b) => b.id === selectedOverheadBatchId)?.product_id
          )} (${
            batches.find((b) => b.id === selectedOverheadBatchId)
              ?.planned_quantity || "?"
          })`}
        />
      )}
    </div>
  );
}
