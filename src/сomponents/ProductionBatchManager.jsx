// src/components/ProductionBatchManager.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { productionBatchApi } from "../services/productionBatchApi";
import { productApi } from "../services/productApi";
import { workshopApi } from "../services/workshopApi";
import { batchFactApi } from "../services/batchFactApi";
import { overheadAllocationApi } from "../services/overheadAllocationApi";
import BatchFactManager from "./BatchFactManager";
import BatchNormComparison from "./BatchNormComparison";
import OverheadAllocationManager from "./OverheadAllocationManager";
import { useAuth } from "../hooks/useAuth";

export default function ProductionBatchManager() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [batchCosts, setBatchCosts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [selectedComparisonBatchId, setSelectedComparisonBatchId] =
    useState(null);
  const [selectedOverheadBatchId, setSelectedOverheadBatchId] = useState(null);
  const { role } = useAuth();

  const [dataVersion, setDataVersion] = useState(0);

  const [form, setForm] = useState({
    product_id: "",
    workshop_id: "",
    start_date: "",
    end_date: "",
    planned_quantity: "",
    actual_quantity: "",
    status: "в работе",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "id",
    direction: "desc",
  });

  const FINISHED_CATEGORY_IDS = [3];
  const finishedProducts = useMemo(
    () => products.filter((p) => FINISHED_CATEGORY_IDS.includes(p.category_id)),
    [products]
  );

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [batchList, prodList, wsList] = await Promise.all([
        productionBatchApi.getAll(),
        productApi.getAll(),
        workshopApi.getAll(),
      ]);
      setBatches(batchList);
      setProducts(prodList);
      setWorkshops(wsList);

      const costPromises = batchList.map(async (batch) => {
        try {
          const [facts, overheads] = await Promise.all([
            batchFactApi.getByBatchId(batch.id),
            overheadAllocationApi.getByBatchId(batch.id),
          ]);

          const totalDirect = facts.reduce((sum, fact) => {
            const prod = prodList.find((p) => p.id === fact.product_id);
            const unitCost = prod?.cost_per_unit;
            if (unitCost == null) return sum;
            return sum + fact.actual_quantity * unitCost;
          }, 0);

          const overheadSum = overheads.reduce(
            (s, a) => s + (a.allocated_amount || 0),
            0
          );

          return [
            batch.id,
            { totalDirect, overheadSum, fullCost: totalDirect + overheadSum },
          ];
        } catch (err) {
          return [batch.id, null];
        }
      });

      const resolved = await Promise.all(costPromises);
      const costsMap = Object.fromEntries(
        resolved.filter(([, v]) => v != null)
      );
      setBatchCosts(costsMap);
    } catch (err) {
      setError("Не удалось загрузить данные");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleDataChange = useCallback(() => {
    loadData().then(() => {
      setDataVersion((v) => v + 1);
    });
  }, [loadData]);

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
    };

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
      await loadData();
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
      actual_quantity:
        batch.actual_quantity != null ? batch.actual_quantity.toString() : "",
      status: batch.status || "в работе",
    });
    setEditingId(batch.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить производственную партию?")) return;
    try {
      await productionBatchApi.delete(id);
      await loadData();
      if (selectedBatchId === id) setSelectedBatchId(null);
      if (selectedComparisonBatchId === id) setSelectedComparisonBatchId(null);
      if (selectedOverheadBatchId === id) setSelectedOverheadBatchId(null);
    } catch (err) {
      alert(err.message || "Ошибка при удалении");
      await loadData();
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
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  // 🔥 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: добавлен dataVersion в зависимости
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
    // ⬇️ ДОБАВЛЕНО: dataVersion
  }, [
    batches,
    searchTerm,
    sortConfig,
    products,
    workshops,
    dataVersion,
    batchCosts,
  ]);

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

      <div className="mb-6">
        <input
          type="text"
          placeholder="Поиск по продукту, цеху или статусу..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Форма */}
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
                step="0.001"
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

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAndSortedBatches.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Партии не найдены</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Продукт
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Цех
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  План
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Факт
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
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
              {filteredAndSortedBatches.map((b) => {
                const product = products.find((p) => p.id === b.product_id);
                const unitLabel = product?.unit ? ` ${product.unit}` : "";
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getProductName(b.product_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getWorkshopName(b.workshop_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {b.planned_quantity != null
                        ? `${b.planned_quantity}${unitLabel}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {b.actual_quantity == null ? (
                        "—"
                      ) : (
                        <>
                          {`${b.actual_quantity}${unitLabel}`}
                          {b.planned_quantity != null &&
                            (() => {
                              const diff =
                                Number(b.actual_quantity) -
                                Number(b.planned_quantity);
                              const isPlus = diff >= 0;
                              const sign = isPlus ? "+" : "";
                              const disp = Number.isInteger(diff)
                                ? diff
                                : diff.toFixed(3);
                              return (
                                <span
                                  className={
                                    isPlus
                                      ? "text-green-600 font-medium ml-2"
                                      : "text-red-600 font-medium ml-2"
                                  }
                                >
                                  {isPlus ? "в плюс" : "в минус"} ({sign}
                                  {disp})
                                </span>
                              );
                            })()}
                        </>
                      )}
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

                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const planned = b.planned_cost;
                        // ✅ ИСПОЛЬЗУЕМ fullCost из batchCosts вместо b.actual_cost
                        const batchInfo = batchCosts[b.id];
                        const actual =
                          batchInfo?.fullCost != null
                            ? batchInfo.fullCost
                            : b.actual_cost; // fallback на случай, если нет данных

                        const plannedQty = Number(b.planned_quantity) || 0;
                        const actualQty =
                          b.actual_quantity != null
                            ? Number(b.actual_quantity)
                            : null;
                        const unit = product?.unit || "ед.";
                        const unitSuffix = product?.unit
                          ? ` ₽/${product.unit}`
                          : " ₽/ед.";

                        if (planned == null && actual == null && !product)
                          return "—";

                        const lines = [];

                        // План — без изменений
                        if (planned != null) {
                          const plannedTotal = Number(planned).toFixed(2);
                          const plannedPer =
                            plannedQty > 0
                              ? (Number(planned) / plannedQty).toFixed(2)
                              : "—";
                          lines.push(
                            <div key="planned" className="text-gray-700">
                              План:{" "}
                              <span className="font-medium">
                                {plannedTotal} ₽
                              </span>
                              {plannedPer !== "—" && (
                                <span className="ml-2 text-sm text-gray-500">
                                  ({plannedPer}
                                  {unitSuffix})
                                </span>
                              )}
                            </div>
                          );
                        } else if (
                          product?.cost_per_unit != null &&
                          plannedQty > 0
                        ) {
                          const estPlanned = (
                            product.cost_per_unit * plannedQty
                          ).toFixed(2);
                          lines.push(
                            <div key="planned_est" className="text-gray-600">
                              План (расч.):{" "}
                              <span className="font-medium">
                                {estPlanned} ₽
                              </span>
                              <span className="ml-2 text-sm text-gray-500">
                                ({product.cost_per_unit.toFixed(2)} ₽/{unit})
                              </span>
                            </div>
                          );
                        }

                        // ✅ Факт — теперь с накладными!
                        if (actual != null) {
                          const actualTotal = Number(actual).toFixed(2);
                          const actualPer =
                            actualQty && actualQty > 0
                              ? (Number(actual) / actualQty).toFixed(2)
                              : "—";
                          lines.push(
                            <div key="actual" className="text-gray-700">
                              Факт:{" "}
                              <span className="font-medium">
                                {actualTotal} ₽
                              </span>
                              {actualPer !== "—" && (
                                <span className="ml-2 text-sm text-gray-500">
                                  ({actualPer}
                                  {unitSuffix})
                                </span>
                              )}
                            </div>
                          );
                        } else if (
                          product?.cost_per_unit != null &&
                          actualQty != null
                        ) {
                          // ⚠️ Этот блок теперь почти не нужен, но оставим как fallback
                          const estActual = (
                            product.cost_per_unit * actualQty
                          ).toFixed(2);
                          lines.push(
                            <div key="actual_est" className="text-gray-600">
                              Факт (расч.):{" "}
                              <span className="font-medium">{estActual} ₽</span>
                              <span className="ml-2 text-sm text-gray-500">
                                ({product.cost_per_unit.toFixed(2)} ₽/{unit})
                              </span>
                            </div>
                          );
                        }

                        // Отклонение — уже правильно использует batchCosts, но упростим
                        if (
                          (planned != null || product?.cost_per_unit != null) &&
                          (actual != null || product?.cost_per_unit != null) &&
                          (plannedQty > 0 || actualQty > 0)
                        ) {
                          const totalPlanned =
                            planned != null
                              ? Number(planned)
                              : product
                              ? product.cost_per_unit * plannedQty
                              : null;

                          // ✅ totalActual уже берётся из actual (который = fullCost)
                          const totalActual =
                            actual != null ? Number(actual) : null;

                          if (totalPlanned != null && totalActual != null) {
                            const variance = totalActual - totalPlanned;

                            if (Math.abs(variance) > 0.01) {
                              const isPlus = variance < 0;
                              const sign = variance >= 0 ? "+" : "";
                              lines.push(
                                <div
                                  key="variance"
                                  className={
                                    isPlus
                                      ? "text-green-600 font-medium"
                                      : "text-red-600 font-medium"
                                  }
                                >
                                  {isPlus ? "в плюс" : "в минус"} ({sign}
                                  {Math.abs(variance).toFixed(2)} ₽)
                                </div>
                              );
                            } else {
                              lines.push(
                                <div key="variance" className="text-gray-500">
                                  Без отклонения
                                </div>
                              );
                            }

                            if (plannedQty > 0 && actualQty) {
                              const perPlanned = totalPlanned / plannedQty;
                              const perActual = totalActual / actualQty;
                              const perDiff = perActual - perPlanned;

                              if (Math.abs(perDiff) > 0.001) {
                                const perIsPlus = perDiff < 0;
                                const perSign = perDiff >= 0 ? "+" : "";
                                lines.push(
                                  <div
                                    key="perUnit"
                                    className={
                                      perIsPlus
                                        ? "text-green-600 text-sm"
                                        : "text-red-600 text-sm"
                                    }
                                  >
                                    На ед.: {perIsPlus ? "в плюс" : "в минус"} (
                                    {perSign}
                                    {Math.abs(perDiff).toFixed(2)} ₽/{unit})
                                  </div>
                                );
                              } else {
                                lines.push(
                                  <div
                                    key="perUnit"
                                    className="text-gray-500 text-sm"
                                  >
                                    На ед.: 0.00 ₽/{unit}
                                  </div>
                                );
                              }
                            }
                          }
                        }

                        return <div className="flex flex-col">{lines}</div>;
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
                      <button
                        onClick={() => setSelectedComparisonBatchId(b.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Факт/Норма
                      </button>
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Модальные окна */}
      {selectedBatchId && (
        <BatchFactManager
          key={`batch-fact-${selectedBatchId}-${dataVersion}`}
          batchId={selectedBatchId}
          batchName={`${getProductName(
            batches.find((b) => b.id === selectedBatchId)?.product_id
          )} (${
            batches.find((b) => b.id === selectedBatchId)?.planned_quantity ||
            "?"
          })`}
          onDataChange={handleDataChange}
          dataVersion={dataVersion}
        />
      )}
      {selectedComparisonBatchId && (
        <BatchNormComparison
          batchId={selectedComparisonBatchId}
          onClose={() => setSelectedComparisonBatchId(null)}
        />
      )}
      {selectedOverheadBatchId && (
        <OverheadAllocationManager
          key={`overhead-${selectedOverheadBatchId}-${dataVersion}`}
          batchId={selectedOverheadBatchId}
          batchName={`${getProductName(
            batches.find((b) => b.id === selectedOverheadBatchId)?.product_id
          )} (${
            batches.find((b) => b.id === selectedOverheadBatchId)
              ?.planned_quantity || "?"
          })`}
          onDataChange={handleDataChange}
        />
      )}
    </div>
  );
}
