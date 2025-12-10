// src/pages/Dashboard.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import AdminLayout from "../сomponents/layout/AdminLayout";
import UserDashboardContent from "../сomponents/dashboard/UserDashboardContent";
import UserManagement from "./UserManagement";
import WorkshopManager from "../сomponents/WorkshopManager";
import UserWorkshopManagerPage from "../сomponents/UserWorkshopManager";
import ProductManager from "../сomponents/ProductManager";
import NormManager from "../сomponents/NormManager";
import ProductionBatchManager from "../сomponents/ProductionBatchManager";
import CostCenterManager from "../сomponents/CostCenterManager";
// import AuditLogsPage from "./AuditLogsPage";

export default function Dashboard() {
  const { role } = useAuth();
  const [activeSection, setActiveSection] = useState("users");

  if (role === "admin") {
    return (
      <AdminLayout
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      >
        {activeSection === "users" && <UserManagement />}
        {activeSection === "workshops" && <WorkshopManager />}
        {activeSection === "user-workshops" && <UserWorkshopManagerPage />}
        {activeSection === "products" && <ProductManager />}
        {activeSection === "norms" && <NormManager />}
        {activeSection === "productionbatch" && <ProductionBatchManager />}
        {activeSection === "cost-centers" && <CostCenterManager />}

        {/* {activeSection === "auditlogs" && <AuditLogsPage />} */}
      </AdminLayout>
    );
  }
  if (role === "manager") {
    return (
      <AdminLayout
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      >
        {activeSection === "productionbatch" && <ProductionBatchManager />}
        {activeSection === "cost-centers" && <CostCenterManager />}
      </AdminLayout>
    );
  }
  if (role === "technolog") {
    return (
      <AdminLayout
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      >
        {activeSection === "products" && <ProductManager />}
        {activeSection === "norms" && <NormManager />}
        {activeSection === "productionbatch" && <ProductionBatchManager />}
      </AdminLayout>
    );
  }
  if (role === "user") {
    return (
      <AdminLayout
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      >
        {activeSection === "productionbatch" && <ProductionBatchManager />}
      </AdminLayout>
    );
  }

  return <UserDashboardContent />;
}
