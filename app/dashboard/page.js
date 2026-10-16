"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardStats from "@/components/DashboardStats";
import ProjectCard from "@/components/ProjectCard";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { listMyProjects } from "@/services/projects";
import { listTasks } from "@/services/tasks";
import { formatDate, friendlyError, isOverdue, priorityInfo } from "@/lib/utils";

function DashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState({ projects: [], tasks: [] });
  const [state, setState] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const projects = await listMyProjects(user.uid);
      const taskLists = await Promise.all(projects.map((p) => listTasks(p.id)));
      setData({ projects, tasks: taskLists.flat() });
      setState("ready");
    } catch (err) {
      setError(friendlyError(err));
      setState("error");
    }
  }, [user.uid]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <Loading text="Loading your dashboard…" />;
  if (state === "error") return <ErrorState message={error} onRetry={load} />;

  const { projects, tasks } = data;
  const overdue = tasks.filter((t) => isOverdue(t));
  const stats = {
    projects: projects.length,
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: overdue.length,
  };
  const countFor = (id) => tasks.filter((t) => t.projectId === id).length;
  const nameFor = (id) => projects.find((p) => p.id === id)?.name;

  return (
    <>
      <div className="row between wrap page-head">
        <h1>Dashboard</h1>
        <Link href="/projects/new" className="btn">+ New project</Link>
      </div>
      <DashboardStats stats={stats} />

      <section aria-labelledby="proj-h">
        <h2 id="proj-h">Your projects</h2>
        {projects.length === 0 ? (
          <EmptyState title="No projects yet">Create your first project to start adding tasks.</EmptyState>
        ) : (
          <div className="grid-cards">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} isOwner={p.ownerId === user.uid} taskCount={countFor(p.id)} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="over-h">
        <h2 id="over-h">Overdue tasks</h2>
        {overdue.length === 0 ? (
          <EmptyState title="Nothing overdue 🎉">You're all caught up.</EmptyState>
        ) : (
          <ul className="task-list">
            {overdue.map((t) => (
              <li key={t.id} className="card task task-overdue">
                <div className="row between wrap">
                  <Link href={`/projects/${t.projectId}`}><strong>{t.title}</strong></Link>
                  <span className="badge badge-overdue">⚠ Due {formatDate(t.dueDate)}</span>
                </div>
                <p className="meta">{nameFor(t.projectId)} · {priorityInfo(t.priority).icon} {priorityInfo(t.priority).label} priority</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function DashboardPage() {
  return <ProtectedRoute><DashboardContent /></ProtectedRoute>;
}
