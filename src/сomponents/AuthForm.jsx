import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint = isLoginMode
      ? "http://localhost:3000/auth/login"
      : "http://localhost:3000/auth/register";

    const data = { email, password }; // ← только email и пароль

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Ошибка сервера";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch {
          errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      if (isLoginMode) {
        const result = await response.json();
        // Убедитесь, что у пользователя есть имя (может быть email, если name не заполнен)
        const name = result.user.name || result.user.email;
        const role = result.user.roles?.[0]?.name || "user"; // или result.user.roles[0]
        const token = result.access_token;
        login(name, role, token);
        navigate("/dashboard");
      } else {
        alert("Регистрация успешна! Теперь вы можете войти.");
      }
    } catch (error) {
      console.error("Ошибка авторизации:", error);

      let userMessage = "Произошла ошибка. Попробуйте позже.";

      if (isLoginMode) {
        userMessage = "Неверный email или пароль.";
      } else {
        const msg = error.message.toLowerCase();
        if (
          msg.includes("email") ||
          msg.includes("conflict") ||
          msg.includes("exists")
        ) {
          userMessage = "Email уже занят.";
        } else {
          userMessage = "Ошибка регистрации. Попробуйте другой email.";
        }
      }

      alert(userMessage);
    }
  };

  return (
    <div style={styles.wrapper}>
      <h2>{isLoginMode ? "Вход" : "Регистрация"}</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          {isLoginMode ? "Войти" : "Зарегистрироваться"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setIsLoginMode(!isLoginMode)}
        style={{
          marginTop: "15px",
          padding: "8px",
          backgroundColor: "#f0f0f0",
          border: "1px solid #ccc",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {isLoginMode
          ? "Нет аккаунта? Зарегистрируйтесь"
          : "Уже есть аккаунт? Войдите"}
      </button>
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "300px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  input: {
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  button: {
    padding: "10px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  },
};
