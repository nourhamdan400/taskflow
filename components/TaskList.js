"use client";
import { STATUSES, formatDate, isOverdue, priorityInfo, statusInfo } from "@/lib/utils";
import { canChangeStatus, canDeleteTask, canEditTask } from "@/lib/permissions";
import { EmptyState } from "./States";

export default function TaskList({ tasks, project, uid, memberMap, busyId, onStatus, onEdit, onDelete, totalCount }) {
  if (!tasks.length) {
    return totalCount ? (
      <EmptyState title="No tasks match your filters">Try clearing the search or filters.</EmptyState>
    ) : (
      <EmptyState title="No tasks yet">Create the first task for this project.</EmptyState>
    );
  }
  return (
    <ul className="task-list">
      {tasks.map((t) => {
        const pr = priorityInfo(t.priority);
        const st = statusInfo(t.status);
        const overdue = isOverdue(t);
        const assignee = t.assigneeId ? memberMap[t.assigneeId]?.displayName || "Former member" : "Unassigned";
        return (
          <li key={t.id} className={`card task ${t.status === "done" ? "task-done" : ""} ${overdue ? "task-overdue" : ""}`}>
            <div className="row between wrap">
              <h3 className="task-title">{t.title}</h3>
              <div className="row gap-s wrap">
                <span className={`badge prio-${t.priority}`}>{pr.icon} {pr.label}</span>
                <span className={`badge st-${t.status}`}>{st.icon} {st.label}</span>
                {overdue && <span className="badge badge-overdue">⚠ Overdue</span>}
              </div>
            </div>
            {t.description && <p className="muted">{t.description}</p>}
            <p className="meta">
              👤 {assignee} · 📅 {formatDate(t.dueDate)}
            </p>
            <div className="row between wrap task-actions">
              {canChangeStatus(t, project, uid) ? (
                <label className="inline-label">
                  <span className="sr-only">Status for {t.title}</span>
                  <select value={t.status} disabled={busyId === t.id} onChange={(e) => onStatus(t, e.target.value)}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              ) : <span />}
              <div className="row gap-s">
                {canEditTask(t, project, uid) && <button className="btn btn-secondary btn-sm" onClick={() => onEdit(t)}>Edit</button>}
                {canDeleteTask(t, project, uid) && <button className="btn btn-danger btn-sm" onClick={() => onDelete(t)}>Delete</button>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
