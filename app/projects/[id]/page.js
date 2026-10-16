"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import FilterBar, { DEFAULT_FILTERS, applyFilters } from "@/components/FilterBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Alert, ErrorState, Loading } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { getProject } from "@/services/projects";
import { createTask, deleteTask, listTasks, updateTask, updateTaskStatus } from "@/services/tasks";
import { getUsersByIds } from "@/services/users";
import { canChangeStatus } from "@/lib/permissions";
import { friendlyError, isOverdue } from "@/lib/utils";

function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [memberMap, setMemberMap] = useState({});
  const [tasks, setTasks] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | denied | notfound | error
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [editing, setEditing] = useState(null); // null | "new" | task
  const [toDelete, setToDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const p = await getProject(id);
      if (!p) return setState("notfound");
      const [t, users] = await Promise.all([listTasks(id), getUsersByIds(p.memberIds)]);
      setProject(p); setTasks(t); setMemberMap(users); setState("ready");
    } catch (err) {
      setState(err?.code === "permission-denied" ? "denied" : "error");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const members = useMemo(() => (project ? project.memberIds.map((m) => memberMap[m] || { id: m, displayName: "Unknown user" }) : []), [project, memberMap]);
  const visible = useMemo(() => applyFilters(tasks, filters, isOverdue), [tasks, filters]);

  if (state === "loading") return <Loading text="Loading project…" />;
  if (state === "notfound") return <ErrorState title="Project not found" message="This project doesn't exist or was deleted." />;
  if (state === "denied") return <ErrorState title="Access denied" message="You are not a member of this project." />;
  if (state === "error") return <ErrorState message="Could not load the project. Check your connection." onRetry={load} />;

  const owner = project.ownerId === user.uid;

  const refreshTasks = async () => setTasks(await listTasks(id));

  const handleSave = async (form) => {
    if (editing === "new") await createTask(id, user.uid, form);
    else await updateTask(id, editing.id, form);
    await refreshTasks();
    setEditing(null);
  };

  const handleStatus = async (task, status) => {
    setActionError(""); setBusyId(task.id);
    try {
      await updateTaskStatus(id, task.id, status);
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status } : t)));
    } catch (err) {
      setActionError(`Could not update status: ${friendlyError(err)}`);
    } finally { setBusyId(null); }
  };

  const confirmDelete = async () => {
    setDeleting(true); setActionError("");
    try {
      await deleteTask(id, toDelete.id);
      setTasks((ts) => ts.filter((t) => t.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setActionError(`Could not delete task: ${friendlyError(err)}`);
      setToDelete(null);
    } finally { setDeleting(false); }
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="crumbs"><Link href="/dashboard">← Dashboard</Link></nav>
      <div className="row between wrap page-head">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <div className="row gap-s wrap">
          {owner && <Link className="btn btn-secondary" href={`/projects/${id}/settings`}>⚙ Settings</Link>}
          {editing === null && <button className="btn" onClick={() => setEditing("new")}>+ New task</button>}
        </div>
      </div>

      <section aria-label="Members" className="members">
        <strong>Members:</strong>{" "}
        {members.map((m) => (
          <span key={m.id} className="badge">{m.displayName}{m.id === project.ownerId ? " (owner)" : ""}</span>
        ))}
      </section>

      {editing !== null && (
        <section className="card" aria-labelledby="tf-h">
          <h2 id="tf-h">{editing === "new" ? "New task" : "Edit task"}</h2>
          <TaskForm
            key={editing === "new" ? "new" : editing.id}
            members={members}
            initial={editing === "new" ? null : editing}
            canChangeStatus={editing === "new" ? true : canChangeStatus(editing, project, user.uid)}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
          />
        </section>
      )}

      <Alert>{actionError}</Alert>
      <FilterBar filters={filters} onChange={setFilters} members={members} />
      <p className="muted" aria-live="polite">Showing {visible.length} of {tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
      <TaskList
        tasks={visible} totalCount={tasks.length} project={project} uid={user.uid}
        memberMap={memberMap} busyId={busyId}
        onStatus={handleStatus} onEdit={setEditing} onDelete={setToDelete}
      />

      <ConfirmDialog
        open={Boolean(toDelete)} busy={deleting}
        title="Delete task?" message={`“${toDelete?.title}” will be permanently deleted.`}
        onConfirm={confirmDelete} onCancel={() => setToDelete(null)}
      />
    </>
  );
}

export default function ProjectPage() {
  return <ProtectedRoute><ProjectDetails /></ProtectedRoute>;
}
