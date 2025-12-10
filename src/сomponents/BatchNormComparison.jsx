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

        setBatch(batchData);
        setFacts(factList);
        setNorms(normList);
        setProducts(prodList);
      } catch (err) {
        setError(err.message || "Ошибка загрузки данных");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [batchId]);

  // Вспомогательные функции
  const getProductName = (id) => products.find(p => p.id === id)?.name || `ID: ${id}`;
  const getBatchDate = () => {
    if (!batch) return null;
    // Используем start_date как дату партии
    return new Date(batch.start_date);
  };

  // Сравнение факт vs норма
  const comparisonData = useMemo(() => {
    if (!batch || !facts.length || !norms.length) return [];

    const batchDate = getBatchDate();
    if (!batchDate) return [];

    return facts.map(fact => {
      // Найти норму для этого сырья в этом цехе на дату партии
      const norm = norms.find(n =>
        n.product_id === batch.product_id &&          // готовый продукт
        n.input_product_id === fact.product_id &&     // сырьё
        n.workshop_id === batch.workshop_id &&        // цех
        new Date(n.period_start) <= batchDate &&
        new Date(n.period_end) >= batchDate
      );

      const plannedQty = norm 
        ? (batch.actual_quantity ?? batch.planned_quantity) * norm.quantity_per_unit
        : null;

      const actualQty = fact.actual_quantity;
      let deviationPercent = null;
      if (plannedQty && plannedQty > 0) {
        deviationPercent = ((actualQty - plannedQty) / plannedQty) * 100;
      }

      return {
        fact,
        norm,
        planned_quantity: plannedQty,
        actual_quantity: actualQty,
        deviation_percent: deviationPercent,
        reason: fact.deviation_reason || null,
      };
    });
  }, [batch, facts, norms]);

  if (loading) return <div className="p-4">Загрузка отчёта «Факт vs Норма»...</div>;
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
        Партия: <strong>{getProductName(batch.product_id)}</strong> | 
        Цех: <strong>{batch.workshop_id}</strong> | 
        Дата: <strong>{batch.start_date}</strong>
      </p>

      {comparisonData.length === 0 ? (
        <p className="text-gray-500">Нет данных для сравнения (нет факта или нормы)</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-white rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Сырьё</th>
                <th className="px-3 py-2 text-right">План (норма)</th>
                <th className="px-3 py-2 text-right">Факт</th>
                <th className="px-3 py-2 text-right">Отклонение, %</th>
                <th className="px-3 py-2 text-left">Причина</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((item, idx) => {
                const isOverConsumption = item.deviation_percent > 0;
                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{getProductName(item.fact.product_id)}</td>
                    <td className="px-3 py-2 text-right">
                      {item.planned_quantity !== null 
                        ? item.planned_quantity.toFixed(3) 
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {item.actual_quantity.toFixed(3)}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${
                      item.deviation_percent === null 
                        ? "text-gray-500" 
                        : isOverConsumption ? "text-red-600" : "text-green-600"
                    }`}>
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