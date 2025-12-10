// src/components/PrivateRoute.jsx
import React from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}