import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function AdminSidebar({ activeSection, setActiveSection }) {
  const { userName, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    logout();
    navigate("/login");
  };

  const navItem = (section, icon, label) => (
    <button
      onClick={() => setActiveSection(section)}
      className={`w-full text-left px-6 py-3 flex items-center space-x-3 transition ${
        activeSection === section
          ? "bg-blue-50 text-blue-700 border-r-4 border-blue-500"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="w-64 bg-white shadow-md relative min-h-screen">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">
          Панель администратора
        </h1>
        <p className="text-sm text-gray-600">
          Привет, {userName}!<br />
          <span className="text-gray-400 text-xs">Роль: {role}</span>
        </p>
      </div>

      <nav className="mt-4">
        {/* 👥 Доступно только админам */}
        {["admin"].includes(role) && navItem("users", "👥", "Пользователи")}
        {["admin"].includes(role) && navItem("workshops", "🏭", "Цеха")}
        {["admin"].includes(role) &&
          navItem("user-workshops", "🔗", "Привязки пользователей")}

        {["admin", "technolog"].includes(role) &&
          navItem("products", "🔗", "Номенклатура")}


        {["admin", "technolog"].includes(role) &&
          navItem("norms", "🔗", "Нормативы")}

        {["admin", "manager"].includes(role) &&
          navItem("cost-centers", "🔗", "Центры затрат")}
        {["admin", "manager", "technolog", "user"].includes(role) &&
          navItem("productionbatch", "🔗", "Произв. партии")}
        {/* 🧾 Аудит лог — только для админов */}
        {/* {role === "admin" && navItem("auditlogs", "🧾", "История действий")} */}
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
