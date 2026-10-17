"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import RolePermissionsTable from "@/components/RolePermissionsTable";

function RolesPageContent() {
  return (
    <div className="roles-page">
      <div className="roles-page-heading">
        <div>
          <span className="eyebrow">WORKSPACE SETTINGS</span>
          <h1>Roles &amp; permissions</h1>
          <p className="muted">
            A clear reference for the access levels used across TaskFlow.
          </p>
        </div>
      </div>
      <RolePermissionsTable />
    </div>
  );
}

export default function RolesPage() {
  return (
    <ProtectedRoute>
      <RolesPageContent />
    </ProtectedRoute>
  );
}
