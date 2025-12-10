// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState("");

  // Восстановление состояния из обычных cookie (UI)
  useEffect(() => {
    const storedIsLoggedIn = Cookies.get("isLoggedIn") === "true";
    const storedUserName = Cookies.get("userName");
    const storedRole = Cookies.get("role");

    if (storedIsLoggedIn) {
      setIsLoggedIn(true);
      setUserName(storedUserName || "");
      setRole(storedRole || "");
    }
  }, []);

  // login обновляет только UI-состояние и обычные cookie
  const login = (name, userRole) => {
    setIsLoggedIn(true);
    setUserName(name);
    setRole(userRole);

    Cookies.set("isLoggedIn", "true", { expires: 365 });
    Cookies.set("userName", name, { expires: 365 });
    Cookies.set("role", userRole, { expires: 365 });
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserName("");
    setRole("");
    Cookies.remove("isLoggedIn");
    Cookies.remove("userName");
    Cookies.remove("role");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userName, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
