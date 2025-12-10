import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../utils/api";
import { Users, LogOut, UserPlus, Key } from "lucide-react";

const UserManagement = () => {
  const { role } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false); // 🔑
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    password: "", // используется и для создания, и для смены
    phone: "",
  });
  const [error, setError] = useState("");

  // 🔹 Загрузка пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiRequest("/auth/users");

        if (role === "manager") {
          setUsers(data.filter((u) => u.roles?.includes("user")));
        } else {
          setUsers(data);
        }
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить пользователей");
      }
    };
    fetchUsers();
  }, [role]);

  // 🔹 Фильтрация
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        (user.name &&
          user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole =
        roleFilter === "all" || (user.roles && user.roles.includes(roleFilter));
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  // 🔹 Выбор пользователя
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setIsCreating(false);
    setIsChangingPassword(false); // сброс флага
    setFormData({
      name: user.name || "",
      email: user.email,
      role: user.roles?.[0] || "user",
      password: "", // очищаем пароль при выборе
      phone: user.phone || "",
    });
    setError("");
  };

  // 🔹 Создание нового пользователя
  const handleCreateNew = () => {
    if (!["admin", "manager"].includes(role)) return;
    setSelectedUser(null);
    setIsCreating(true);
    setIsChangingPassword(false);
    setFormData({ name: "", email: "", role: "user", password: "", phone: "" });
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Сохранение
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!["admin", "manager"].includes(role)) {
      return alert("Нет прав на изменение данных.");
    }
    setError("");

    try {
      if (isCreating) {
        const assignedRole = role === "manager" ? "user" : formData.role;
        const newUser = await apiRequest("/auth/register", "POST", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          roles: [assignedRole],
        });
        setUsers((prev) => [...prev, newUser.user]);
        setIsCreating(false);
        setSelectedUser(null);
      } else if (selectedUser) {
        const payload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        };

        // Только админ может менять роль
        if (role === "admin") {
          payload.roles = [formData.role];
        }

        // Если указан новый пароль — добавляем его
        if (isChangingPassword && formData.password) {
          payload.newPassword = formData.password;
        }

        const updated = await apiRequest(
          `/auth/update/${selectedUser.id}`,
          "PUT",
          payload
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? updated.user : u))
        );
        setSelectedUser(updated.user);
        setIsChangingPassword(false); // сброс после сохранения
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка при сохранении");
    }
  };

  // 🔹 Удаление
  const handleDelete = async (id) => {
    if (role !== "admin") return alert("Нет прав на удаление.");
    if (!window.confirm("Удалить пользователя?")) return;
    try {
      await apiRequest(`/auth/delete/${id}`, "DELETE");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      setError("Ошибка при удалении пользователя");
    }
  };

  const canEdit = ["admin", "manager"].includes(role);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <aside className="w-72 bg-white shadow-lg flex flex-col border-r border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="text-blue-600" /> Пользователи
          </h2>
          {canEdit && (
            <button
              onClick={handleCreateNew}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              title="Добавить пользователя"
            >
              <UserPlus size={18} />
            </button>
          )}
        </div>

        <div className="p-4 border-b border-gray-100 space-y-3">
          <input
            type="text"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {role === "admin" && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Все роли</option>
              <option value="user">Рабочий</option>
              <option value="manager">Менеджер</option>
              <option value="technolog">Технолог</option>
              <option value="admin">Администратор</option>
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Нет пользователей
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={`px-4 py-3 cursor-pointer transition border-b border-gray-100 hover:bg-blue-50 ${
                  selectedUser?.id === user.id
                    ? "bg-blue-100 border-l-4 border-blue-500"
                    : ""
                }`}
              >
                <div className="font-medium text-gray-900">
                  {user.name || user.email}
                </div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-400">{user.phone || "—"}</div>
                <div className="text-xs text-gray-400">
                  {user.roles?.join(", ") || "—"}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ПРАВАЯ ПАНЕЛЬ */}
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold mb-6">
          {isCreating
            ? "Создание нового пользователя"
            : selectedUser
            ? `Просмотр: ${selectedUser.name || selectedUser.email}`
            : "Выберите пользователя"}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md shadow-sm">
            {error}
          </div>
        )}

        {(selectedUser || isCreating) && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 bg-white p-6 rounded-xl shadow-md max-w-lg border border-gray-100"
          >
            <div className="grid gap-4">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Имя"
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              {/* Пароль при создании */}
              {isCreating && canEdit && (
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Пароль"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}

              {/* Смена пароля для существующего пользователя */}
              {!isCreating && canEdit && (
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChangingPassword}
                      onChange={(e) => setIsChangingPassword(e.target.checked)}
                      className="mr-2"
                    />
                    <Key size={16} className="mr-1 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      Сменить пароль
                    </span>
                  </label>
                  {isChangingPassword && (
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Новый пароль"
                      required
                      className="mt-2 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              )}

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Телефон"
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              {role === "admin" && !isCreating && (
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">Рабочий</option>
                  <option value="manager">Менеджер</option>
                  <option value="technolog">Технолог</option>
                  <option value="admin">Администратор</option>
                </select>
              )}
            </div>

            {canEdit && (
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  {isCreating ? "Создать" : "Сохранить"}
                </button>
                {role === "admin" && !isCreating && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedUser.id)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Удалить
                  </button>
                )}
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
};

export default UserManagement;