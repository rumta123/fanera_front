// src/components/BatchFactManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import { batchFactApi } from "../services/batchFactApi";
import { productApi } from "../services/productApi";

export default function BatchFactManager({ batchId, batchName }) {
  const [facts, setFacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    product_id: "",
    actual_quantity: "",
    deviation_reason: "",
  });

  // 🔑 Только сырьё и полуфабрикаты
  const INPUT_CATEGORY_IDS = [1, 2];
  const inputProducts = useMemo(
    () => products.filter(p => INPUT_CATEGORY_IDS.includes(p.category_id)),
    [products]
  );

  // ✅ Защита: не грузим данные, если batchId некорректен
  useEffect(() => {
    // Преобразуем в число и проверяем
    const id = Number(batchId);
    if (!batchId || isNaN(id) || id <= 0) {
      setLoading(false);
      setError("Некорректный ID производственной партии");
      return;
    }

    const loadData = async () => {
      try {
        setError(null);
        const [factList, prodList] = await Promise.all([
          batchFactApi.getByBatchId(id), // ← передаём число
          productApi.getAll(),
        ]);
        setFacts(factList);
        setProducts(prodList);
      } catch (err) {
        setError("Не удалось загрузить данные о расходе");
        console.error("BatchFactManager error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [batchId]); // Зависимость от batchId

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const id = Number(batchId);
    if (!batchId || isNaN(id)) {
      alert("Невозможно сохранить: не указана партия");
      return;
    }

    const payload = {
      batch_id: id, // ← число
      product_id: Number(form.product_id),
      actual_quantity: Number(form.actual_quantity),
      deviation_reason: form.deviation_reason || null,
    };

    if (
      !payload.product_id ||
      isNaN(payload.actual_quantity) ||
      payload.actual_quantity <= 0
    ) {
      alert("Заполните корректно продукт и количество.");
      return;
    }

    try {
      if (editingId) {
        await batchFactApi.update(editingId, payload);
      } else {
        await batchFactApi.create(payload);
      }

      const updated = await batchFactApi.getByBatchId(id);
      setFacts(updated);
      resetForm();
    } catch (err) {
      alert(err.message || "Ошибка при сохранении расхода");
    }
  };

  const handleEdit = (fact) => {
    setForm({
      product_id: fact.product_id?.toString() || "",
      actual_quantity: fact.actual_quantity?.toString() || "",
      deviation_reason: fact.deviation_reason || "",
    });
    setEditingId(fact.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить запись о расходе?")) return;
    try {
      await batchFactApi.delete(id);
      setFacts((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert(err.message || "Ошибка при удалении");
    }
  };

  const resetForm = () => {
    setForm({
      product_id: "",
      actual_quantity: "",
      deviation_reason: "",
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || `ID: ${id}`;

  // 🛑 Если batchId не передан — не рендерим ничего или показываем предупреждение
  if (batchId === undefined || batchId === null) {
    return <div className="p-4 text-gray-500">Не выбрана производственная партия</div>;
  }

  if (loading) return <div className="p-4">Загрузка расхода...</div>;
  if (error) return <div className="p-4 text-red-600">Ошибка: {error}</div>;

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Фактический расход по партии: <span className="text-blue-600">{batchName || `ID: ${batchId}`}</span>
        </h3>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          + Добавить расход
        </button>
      </div>

      {/* Форма */}
      {isFormOpen && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 className="font-medium mb-2">
            {editingId ? "Редактировать расход" : "Новый расход"}
          </h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Сырьё *</label>
              <select
                name="product_id"
                value={form.product_id}
                onChange={handleChange}
                required
                className="w-full px-2 py-1 border rounded"
              >
                <option value="">Выберите сырьё</option>
                {inputProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Количество *</label>
              <input
                type="number"
                name="actual_quantity"
                value={form.actual_quantity}
                onChange={handleChange}
                min="0"
                step="0.001"
                required
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Причина отклонения</label>
              <input
                type="text"
                name="deviation_reason"
                value={form.deviation_reason}
                onChange={handleChange}
                placeholder="влага, брак и т.д."
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div className="md:col-span-3 flex gap-2 pt-1">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                {editingId ? "Сохранить" : "Добавить"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Таблица расхода */}
      {facts.length === 0 ? (
        <p className="text-gray-500 text-sm">Нет данных о фактическом расходе.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left">Сырьё</th>
                <th className="px-3 py-2 text-left">Количество</th>
                <th className="px-3 py-2 text-left">Причина отклонения</th>
                <th className="px-3 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {facts.map((fact) => (
                <tr key={fact.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{getProductName(fact.product_id)}</td>
                  <td className="px-3 py-2">{fact.actual_quantity}</td>
                  <td className="px-3 py-2 text-gray-600">{fact.deviation_reason || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleEdit(fact)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(fact.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}