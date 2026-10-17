"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listMyProjects } from "@/services/projects";

const ROLES = [
  { id: "administrator", name: "Administrator", detail: "Workspace owner" },
  { id: "manager", name: "Project Manager", detail: "Leads delivery" },
  { id: "member", name: "Team Member", detail: "Works on tasks" },
  { id: "viewer", name: "Viewer", detail: "Read-only access" },
];

const FEATURES = [
  {
    id: "projectCrud",
    name: "Project CRUD",
    detail: "Create, read, update, and delete projects",
  },
  {
    id: "taskCreation",
    name: "Task creation",
    detail: "Create and edit project tasks",
  },
  {
    id: "assignMembers",
    name: "Assign members",
    detail: "Invite people and assign work",
  },
  {
    id: "deleteTasks",
    name: "Delete tasks",
    detail: "Remove tasks from a project",
  },
  {
    id: "changeStatus",
    name: "Change task status",
    detail: "Move tasks through the workflow",
  },
  {
    id: "analytics",
    name: "View analytics",
    detail: "See project progress and workload",
  },
];

const DEFAULT_PERMISSIONS = {
  administrator: {
    projectCrud: "allowed",
    taskCreation: "allowed",
    assignMembers: "allowed",
    deleteTasks: "allowed",
    changeStatus: "allowed",
    analytics: "allowed",
  },
  manager: {
    projectCrud: "view",
    taskCreation: "allowed",
    assignMembers: "allowed",
    deleteTasks: "allowed",
    changeStatus: "allowed",
    analytics: "allowed",
  },
  member: {
    projectCrud: "view",
    taskCreation: "allowed",
    assignMembers: "denied",
    deleteTasks: "denied",
    changeStatus: "allowed",
    analytics: "view",
  },
  viewer: {
    projectCrud: "view",
    taskCreation: "denied",
    assignMembers: "denied",
    deleteTasks: "denied",
    changeStatus: "denied",
    analytics: "view",
  },
};

const STATUS_CYCLE = ["allowed", "view", "denied"];

function PermissionIndicator({ value, editable, onClick, label }) {
  const icon = value === "allowed" ? "✓" : value === "denied" ? "×" : "◉";
  const text =
    value === "allowed"
      ? "Allowed"
      : value === "denied"
        ? "Restricted"
        : "View only";

  if (!editable) {
    return (
      <span
        className={`permission-indicator permission-${value}`}
        aria-label={`${label}: ${text}`}
      >
        <span aria-hidden="true">{icon}</span>
        {value === "view" && <span>View only</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`permission-indicator permission-${value}`}
      aria-label={`${label}: ${text}. Click to change.`}
      title={`${text}. Click to cycle permission.`}
      onClick={onClick}
    >
      <span aria-hidden="true">{icon}</span>
      {value === "view" && <span>View only</span>}
    </button>
  );
}

export default function RolePermissionsTable() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadRoleState() {
      try {
        const projects = await listMyProjects(user.uid);
        if (!active) return;
        setIsAdmin(projects.some((project) => project.ownerId === user.uid));
        const saved = localStorage.getItem(`taskflow-role-presets:${user.uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") setPermissions(parsed);
        }
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setReady(true);
      }
    }
    loadRoleState();
    return () => {
      active = false;
    };
  }, [user.uid]);

  useEffect(() => {
    if (ready && isAdmin) {
      localStorage.setItem(
        `taskflow-role-presets:${user.uid}`,
        JSON.stringify(permissions),
      );
    }
  }, [isAdmin, permissions, ready, user.uid]);

  function cyclePermission(roleId, featureId) {
    setPermissions((current) => {
      const currentValue = current[roleId]?.[featureId] || "denied";
      const nextValue =
        STATUS_CYCLE[
          (STATUS_CYCLE.indexOf(currentValue) + 1) % STATUS_CYCLE.length
        ];
      return {
        ...current,
        [roleId]: { ...current[roleId], [featureId]: nextValue },
      };
    });
  }

  return (
    <div className="role-table-section">
      <div
        className={`role-access-banner ${isAdmin ? "role-access-admin" : ""}`}
      >
        <span className="role-access-mark" aria-hidden="true">
          {isAdmin ? "✓" : "◉"}
        </span>
        <div>
          <strong>
            {isAdmin
              ? "Workspace administrator"
              : "Read-only permission reference"}
          </strong>
          <p>
            {isAdmin
              ? "Select a matrix cell to cycle through allowed, view-only, and restricted presets."
              : "Only workspace owners can edit these role presets."}
          </p>
        </div>
        {ready && (
          <span className="role-edit-badge">
            {isAdmin ? "EDIT ACCESS" : "VIEW ONLY"}
          </span>
        )}
      </div>

      <div className="role-security-note">
        These are role presets stored in this browser for reference. Firestore
        rules continue to enforce actual project access.
      </div>

      <div
        className="role-matrix-scroll"
        role="region"
        aria-label="Roles and permissions matrix"
        tabIndex={0}
      >
        <table className="role-matrix">
          <thead>
            <tr>
              <th scope="col" className="feature-column">
                Capability
              </th>
              {ROLES.map((role) => (
                <th key={role.id} scope="col">
                  <span className="role-column-name">{role.name}</span>
                  <span className="role-column-detail">{role.detail}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature.id}>
                <th scope="row" className="feature-column">
                  <span className="feature-name">{feature.name}</span>
                  <span className="feature-detail">{feature.detail}</span>
                </th>
                {ROLES.map((role) => (
                  <td key={role.id}>
                    <PermissionIndicator
                      value={permissions[role.id]?.[feature.id] || "denied"}
                      editable={isAdmin && ready}
                      label={`${role.name}, ${feature.name}`}
                      onClick={() => cyclePermission(role.id, feature.id)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="role-legend" aria-label="Permission status legend">
        <span>
          <i className="permission-dot permission-allowed" aria-hidden="true">
            ✓
          </i>{" "}
          Allowed
        </span>
        <span>
          <i className="permission-dot permission-view" aria-hidden="true">
            ◉
          </i>{" "}
          View only
        </span>
        <span>
          <i className="permission-dot permission-denied" aria-hidden="true">
            ×
          </i>{" "}
          Restricted
        </span>
      </div>
    </div>
  );
}
