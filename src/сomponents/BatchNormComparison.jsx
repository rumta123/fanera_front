// src/components/BatchNormComparison.jsx
import React, { useState, useEffect, useMemo } from "react";
import { batchFactApi } from "../services/batchFactApi";
import { productionBatchApi } from "../services/productionBatchApi";
import { normApi } from "../services/normApi";
import { productApi } from "../services/productApi";

export default function BatchNormComparison({ batchId, onClose }) {
  const [batch, setBatch] = useState(null);
  const [facts, setFacts] = useState([]);
  const [norms, setNorms] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const id = Number(batchId);
        if (isNaN(id) || id <= 0) throw new Error("Некорректный ID партии");

        const [batchData, factList, normList, prodList] = await Promise.all([
          productionBatchApi.getById(id),
          batchFactApi.getByBatchId(id),
          normApi.getAll(),
          productApi.getAll(),
        ]);

        // 🔑 Приведение ID к числу — КРИТИЧЕСКИ ВАЖНО!
        const batch = {
          ...batchData,
          id: Number(batchData.id),
          product_id: Number(batchData.product_id),
          workshop_id: Number(batchData.workshop_id),
        };

        const facts = factList.map(f => ({
          ...f,
          id: Number(f.id),
          batch_id: Number(f.batch_id),
          product_id: Number(f.product_id),
          actual_quantity: Number(f.actual_quantity),
        }));

        const norms = normList.map(n => ({
          ...n,
          id: Number(n.id),
          product_id: Number(n.product_id),
          input_product_id: Number(n.input_product_id),
          workshop_id: Number(n.workshop_id),
        }));

        setBatch(batch);
        setFacts(facts);
        setNorms(norms);
        setProducts(prodList);
      } catch (err) {
        setError(err.message || "Ошибка загрузки данных");
        console.error("BatchNormComparison error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [batchId]);

  const getProductName = (id) =>
    products.find((p) => p.id === id)?.name || `ID: ${id}`;

  // Сравнение факт vs норма
  const comparisonData = useMemo(() => {
    if (!batch || !facts.length || !norms.length) return [];

    const batchDateStr = batch.start_date; // "2026-01-03"
    const baseQuantity = batch.actual_quantity ?? batch.planned_quantity;

    return facts.map((fact) => {
      // 🔍 Поиск нормы: продукт + сырьё + цех + дата
      const norm = norms.find(n =>
        n.product_id === batch.product_id &&
        n.input_product_id === fact.product_id &&
        n.workshop_id === batch.workshop_id &&
        batchDateStr >= n.period_start &&
        batchDateStr <= n.period_end
      );

      const plannedQty = norm && baseQuantity != null && baseQuantity > 0
        ? baseQuantity * norm.quantity_per_unit
        : null;

      const actualQty = fact.actual_quantity;
      let deviationQty = null;
      let deviationPercent = null;

      if (plannedQty !== null && plannedQty > 0) {
        deviationQty = actualQty - plannedQty;
        deviationPercent = (deviationQty / plannedQty) * 100;
      }

      return {
        fact,
        norm,
        planned_quantity: plannedQty,
        actual_quantity: actualQty,
        deviation_quantity: deviationQty,
        deviation_percent: deviationPercent,
        reason: fact.deviation_reason || null,
      };
    });
  }, [batch, facts, norms]);

  if (loading)
    return <div className="p-4">Загрузка отчёта «Факт vs Норма»...</div>;
  if (error) return <div className="p-4 text-red-600">Ошибка: {error}</div>;
  if (!batch) return <div className="p-4">Партия не найдена</div>;

  return (
    <div className="p-4 border-t border-gray-300 bg-gray-50 rounded-lg mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          Отчёт «Фактический расход vs Норма»
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-4">
        Партия: <strong>{getProductName(batch.product_id)}</strong> | Цех:{" "}
        <strong>{batch.workshop_id}</strong> | Дата:{" "}
        <strong>{batch.start_date}</strong>
      </p>

      {norms.length === 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4 text-yellow-800 text-sm">
          ⚠️ Нормы не найдены. Добавьте нормативы в разделе «Нормативы».
        </div>
      )}

      {facts.length === 0 ? (
        <p className="text-gray-500">Нет данных о фактическом расходе.</p>
      ) : comparisonData.length === 0 ? (
        <div className="text-gray-500">
          <p>Нет данных для сравнения.</p>
          <p className="text-sm text-gray-600 mt-1">
            Убедитесь, что для продукта <strong>{getProductName(batch.product_id)}</strong> 
            в цехе <strong>{batch.workshop_id}</strong> созданы нормы на период, включающий дату {batch.start_date}.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-white rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Сырьё</th>
                <th className="px-3 py-2 text-right">План (норма)</th>
                <th className="px-3 py-2 text-right">Факт</th>
                <th className="px-3 py-2 text-right">Абс. отклонение</th>
                <th className="px-3 py-2 text-right">Отклонение, %</th>
                <th className="px-3 py-2 text-left">Причина</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((item, idx) => {
                const isOverConsumption = item.deviation_percent > 0;
                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {getProductName(item.fact.product_id)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.planned_quantity !== null
                        ? item.planned_quantity.toFixed(3)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {item.actual_quantity !== null
                        ? item.actual_quantity.toFixed(3)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.deviation_quantity !== null
                        ? item.deviation_quantity.toFixed(3)
                        : "—"}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        item.deviation_percent === null
                          ? "text-gray-500"
                          : isOverConsumption
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {item.deviation_percent !== null
                        ? item.deviation_percent.toFixed(1) + "%"
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.reason || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Легенда */}
      <div className="mt-3 text-xs text-gray-500">
        <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-1"></span>
        Перерасход ·
        <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-1"></span>
        Экономия
      </div>
    </div>
  );
}