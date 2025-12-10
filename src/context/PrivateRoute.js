import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // Используем ваш контекст

const PrivateRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();

  // Если пользователь не авторизован, перенаправляем на страницу логина
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Если авторизован, показываем содержимое
  return children;
};

export default PrivateRoute;