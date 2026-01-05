// src/components/OverheadAllocationManager.jsx
import React, { useState, useEffect, useCallback } from "react";
import { overheadAllocationApi } from "../services/overheadAllocationApi";
import { costCenterApi } from "../services/costCenterApi";
import { productionBatchApi } from "../services/productionBatchApi";

export default function OverheadAllocationManager({
  batchId,
  batchName,
  onDataChange,
}) {
  const [allocations, setAllocations] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    cost_center_id: "",
    allocated_amount: "",
  });

  // ✅ Вынесенная функция загрузки
  const loadData = useCallback(async () => {
    if (batchId == null) {
      setLoading(false);
      return;
    }

    const id = Number(batchId);
    if (isNaN(id) || id <= 0) {
      setError("Некорректный ID партии");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // 1. Получаем партию, чтобы узнать её цех
      const batch = await productionBatchApi.getById(id);
      const workshopId = batch.workshop_id;

      // 2. Получаем ВСЕ центры затрат
      const ccList = await costCenterApi.getAll();

      // 3. Фильтруем ТОЛЬКО по цеху партии
      const filteredCostCenters = ccList.filter(
        (cc) => cc.workshop_id === workshopId
      );

      // 4. Получаем уже распределённые накладные для этой партии
      const allocList = await overheadAllocationApi.getByBatchId(id);

      setCostCenters(filteredCostCenters);
      setAllocations(allocList);
    } catch (err) {
      console.error("Ошибка загрузки накладных расходов:", err);
      setError("Не удалось загрузить данные о накладных расходах");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  // Загружаем при монтировании и при изменении batchId
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const id = Number(batchId);
    if (isNaN(id)) {
      alert("Невозможно сохранить: не указана партия");
      return;
    }

    const payload = {
      batch_id: id,
      cost_center_id: Number(form.cost_center_id),
      allocated_amount: Number(form.allocated_amount),
    };

    if (
      !payload.cost_center_id ||
      isNaN(payload.allocated_amount) ||
      payload.allocated_amount <= 0
    ) {
      alert("Заполните корректно центр затрат и сумму.");
      return;
    }

    try {
      if (editingId) {
        await overheadAllocationApi.update(editingId, payload);
      } else {
        await overheadAllocationApi.create(payload);
      }

      await loadData();
      resetForm();
      // ✅ Уведомляем родителя
      if (onDataChange) onDataChange();
    } catch (err) {
      alert(err.message || "Ошибка при сохранении распределения");
    }
  };

  const handleEdit = (alloc) => {
    setForm({
      cost_center_id: alloc.cost_center_id?.toString() || "",
      allocated_amount: alloc.allocated_amount?.toString() || "",
    });
    setEditingId(alloc.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить распределение накладных расходов?")) return;
    try {
      await overheadAllocationApi.delete(id);

      // ✅ Полная перезагрузка (НЕ setAllocations(filter(...)))
      await loadData();
      resetForm();
      // ✅ Уведомляем родителя
      if (onDataChange) onDataChange();
    } catch (err) {
      await loadData();
      resetForm();
      if (onDataChange) onDataChange();

      console.log(err.message || "Ошибка при удалении");
    }
  };

  const resetForm = () => {
    setForm({
      cost_center_id: "",
      allocated_amount: "",
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const getCostCenterName = (id) =>
    costCenters.find((cc) => cc.id === id)?.name || `ID: ${id}`;

  if (batchId === undefined || batchId === null) {
    return (
      <div className="p-4 text-gray-500">
        Не выбрана производственная партия
      </div>
    );
  }

  if (loading) return <div className="p-4">Загрузка накладных расходов...</div>;
  if (error) return <div className="p-4 text-red-600">Ошибка: {error}</div>;

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Накладные расходы по партии:{" "}
          <span className="text-blue-600">{batchName}</span>
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
            {editingId ? "Редактировать распределение" : "Новое распределение"}
          </h4>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Центр затрат *
              </label>
              <select
                name="cost_center_id"
                value={form.cost_center_id}
                onChange={handleChange}
                required
                className="w-full px-2 py-1 border rounded"
              >
                <option value="">Выберите центр затрат</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Сумма *
              </label>
              <input
                type="number"
                name="allocated_amount"
                value={form.allocated_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full px-2 py-1 border rounded"
                placeholder="в рублях, кВт·ч и т.д."
              />
            </div>
            <div className="md:col-span-2 flex gap-2 pt-1">
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

      {/* Таблица */}
      {allocations.length === 0 ? (
        <p className="text-gray-500 text-sm">
          Нет распределённых накладных расходов.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left">Центр затрат</th>
                <th className="px-3 py-2 text-right">Сумма</th>
                <th className="px-3 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => (
                <tr key={alloc.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    {getCostCenterName(alloc.cost_center_id)}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-right">
                    {alloc.allocated_amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleEdit(alloc)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(alloc.id)}
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
