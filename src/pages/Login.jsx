import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth"; // Хук контекста
import { useNavigate } from "react-router-dom";
import AuthForm from "../сomponents/AuthForm";

function Login() {
  const [isLoginMode] = useState(true);
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard");
    }
  }, [isLoggedIn, navigate]);

  const handleAuth = async (email, password, additionalData = {}) => {
    const endpoint = isLoginMode
      ? "http://localhost:3000/auth/login"
      : "http://localhost:3000/auth/register";

    const data = isLoginMode
      ? { email, password }
      : {
          email,
          password,
          name: additionalData.name,
          phone: additionalData.phone,
          role: additionalData.role,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include", // 🔹 важно! для отправки и получения HttpOnly cookie
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();

      if (isLoginMode) {
        // Берем только данные пользователя для UI
        const name = result.user.name || result.user.email;
        const role = result.user.roles?.[0]?.name || "user";

        login(name, role); // 🔹 НЕ передаем токен
        navigate("/dashboard");
      } else {
        alert("Регистрация успешна. Теперь вы можете войти.");
      }
    } catch (error) {
      console.error("Ошибка авторизации:", error.message);
      alert("Ошибка авторизации: " + error.message);
    }
  };

  return (
    <div style={styles.wrapper}>
      <AuthForm isLoginMode={isLoginMode} onSubmit={handleAuth} />
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: "Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    margin: 0,
    backgroundColor: "#f9f9f9",
  },
};

export default Login;
