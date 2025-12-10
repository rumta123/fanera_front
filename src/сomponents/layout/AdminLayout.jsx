import React from "react";
import AdminSidebar from "../dashboard/AdminSidebar";

export default function AdminLayout({ children, activeSection, setActiveSection }) {
  return (
    <div className="flex">
      <AdminSidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
      />
      <div className="flex-1 p-6">
        {children} {/* ← здесь должны рендериться CarManagement или UserManagement */}
      </div>
    </div>
  );
}