"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardStats from "@/components/DashboardStats";
import DashboardCharts from "@/components/DashboardCharts";
import ProjectCard from "@/components/ProjectCard";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { listMyProjects } from "@/services/projects";
import {
  listRecentActivity,
  listTasks,
  updateTaskStatus,
} from "@/services/tasks";
import { getUsersByIds } from "@/services/users";
import { canChangeStatus } from "@/lib/permissions";
import {
  PRIORITIES,
  STATUSES,
  formatDate,
  friendlyError,
  isOverdue,
  priorityInfo,
  statusInfo,
} from "@/lib/utils";

function daysUntilDue(date) {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function activityTime(timestamp) {
  const milliseconds =
    timestamp?.toMillis?.() ?? (timestamp?.seconds || 0) * 1000;
  if (!milliseconds) return "Just now";
  const minutes = Math.floor((Date.now() - milliseconds) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(milliseconds).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function activityVerb(activity) {
  if (activity.action === "created") return "created";
  if (activity.action === "deleted") return "deleted";
  if (activity.action === "status_changed") {
    return activity.toStatus === "done"
      ? "completed"
      : `moved to ${statusInfo(activity.toStatus).label}`;
  }
  return "updated";
}

function DashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState({
    projects: [],
    tasks: [],
    activity: [],
    activityUsers: {},
  });
  const [state, setState] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
  });
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const projects = await listMyProjects(user.uid);
      const [taskLists, activityLists] = await Promise.all([
        Promise.all(projects.map((p) => listTasks(p.id))),
        Promise.all(
          projects.map((p) => listRecentActivity(p.id, 8).catch(() => [])),
        ),
      ]);
      const activity = activityLists
        .flat()
        .sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        )
        .slice(0, 12);
      const actorIds = [
        ...new Set(activity.map((item) => item.actorId).filter(Boolean)),
      ];
      const activityUsers = actorIds.length
        ? await getUsersByIds(actorIds)
        : {};
      setData({ projects, tasks: taskLists.flat(), activity, activityUsers });
      setState("ready");
    } catch (err) {
      setError(friendlyError(err));
      setState("error");
    }
  }, [user.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const projectById = Object.fromEntries(
    data.projects.map((project) => [project.id, project]),
  );
  const nameFor = (id) => projectById[id]?.name || "Project";
  const normalizedSearch = filters.search.trim().toLowerCase();
  const visibleProjects = data.projects.filter((project) =>
    `${project.name} ${project.description || ""}`
      .toLowerCase()
      .includes(normalizedSearch),
  );
  const visibleTasks = data.tasks.filter((task) => {
    const searchable =
      `${task.title} ${task.description || ""} ${nameFor(task.projectId)}`.toLowerCase();
    return (
      (!normalizedSearch || searchable.includes(normalizedSearch)) &&
      (!filters.status || task.status === filters.status) &&
      (!filters.priority || task.priority === filters.priority)
    );
  });
  const upcoming = visibleTasks
    .filter(
      (task) =>
        task.status !== "done" &&
        Boolean(task.dueDate) &&
        daysUntilDue(task.dueDate) >= 0 &&
        daysUntilDue(task.dueDate) <= 7,
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);

  const handleQuickStatus = async (task, status) => {
    setActionError("");
    setBusyTaskId(task.id);
    try {
      await updateTaskStatus(
        task.projectId,
        task.id,
        status,
        user.uid,
        task.status,
        task.title,
      );
      const latestActivity = await listRecentActivity(task.projectId, 8).catch(
        () => [],
      );
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, status } : item,
        ),
        activity: [
          ...current.activity.filter(
            (item) => item.projectId !== task.projectId,
          ),
          ...latestActivity,
        ]
          .sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          )
          .slice(0, 12),
        activityUsers: {
          ...current.activityUsers,
          [user.uid]: {
            id: user.uid,
            displayName: user.displayName,
            email: user.email,
          },
        },
      }));
    } catch (err) {
      setActionError(`Could not update status: ${friendlyError(err)}`);
    } finally {
      setBusyTaskId(null);
    }
  };

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

  return (
    <>
      <div className="row between wrap page-head dashboard-heading">
        <div>
          <span className="eyebrow">WORKSPACE OVERVIEW</span>
          <h1>Dashboard</h1>
          <p className="muted">
            Projects, priorities, and deadlines in one place.
          </p>
        </div>
        <Link href="/projects/new" className="btn">
          + New project
        </Link>
      </div>
      <DashboardStats stats={stats} />
      <DashboardCharts tasks={tasks} projects={projects} />

      <div
        className="dashboard-toolbar"
        role="search"
        aria-label="Search projects and tasks"
      >
        <label className="dashboard-search">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Search projects and tasks</span>
          <input
            type="search"
            placeholder="Search projects, tasks, or descriptions"
            value={filters.search}
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value })
            }
          />
        </label>
        <label className="dashboard-filter">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value })
            }
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="dashboard-filter">
          <span>Priority</span>
          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters({ ...filters, priority: event.target.value })
            }
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn btn-secondary dashboard-reset"
          type="button"
          onClick={() => setFilters({ search: "", status: "", priority: "" })}
          disabled={!filters.search && !filters.status && !filters.priority}
        >
          Reset
        </button>
        <span className="dashboard-result-count" aria-live="polite">
          {visibleProjects.length} projects · {visibleTasks.length} tasks
        </span>
      </div>
      {actionError && (
        <div className="alert alert-error" role="alert">
          {actionError}
        </div>
      )}

      <section aria-labelledby="proj-h">
        <div className="section-heading">
          <div>
            <h2 id="proj-h">Your projects</h2>
            <p className="muted">A clear view of every active workspace.</p>
          </div>
          <span className="section-count">{visibleProjects.length} shown</span>
        </div>
        {visibleProjects.length === 0 ? (
          projects.length === 0 && !normalizedSearch ? (
            <EmptyState title="No projects yet">
              Create your first project to start adding tasks.
            </EmptyState>
          ) : (
            <EmptyState title="No matching projects">
              Try a different search term.
            </EmptyState>
          )
        ) : (
          <div className="grid-cards">
            {visibleProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isOwner={p.ownerId === user.uid}
                taskCount={countFor(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="dashboard-lower-grid">
        <section aria-labelledby="deadline-h">
          <div className="section-heading">
            <div>
              <h2 id="deadline-h">Upcoming deadlines</h2>
              <p className="muted">Tasks due within the next seven days.</p>
            </div>
            <span className="section-count">{upcoming.length} tasks</span>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming deadlines">
              Try adjusting your search and filters.
            </EmptyState>
          ) : (
            <ul className="dashboard-task-list">
              {upcoming.map((task) => {
                const daysLeft = daysUntilDue(task.dueDate);
                const canUpdate = canChangeStatus(
                  task,
                  projectById[task.projectId],
                  user.uid,
                );
                return (
                  <li
                    key={task.id}
                    className={`card deadline-item ${daysLeft <= 1 ? "deadline-urgent" : daysLeft <= 3 ? "deadline-soon" : ""}`}
                  >
                    <div className="deadline-copy">
                      <Link
                        href={`/projects/${task.projectId}`}
                        className="deadline-title"
                      >
                        {task.title}
                      </Link>
                      <span className="meta">
                        {nameFor(task.projectId)} ·{" "}
                        {priorityInfo(task.priority).label} priority
                      </span>
                    </div>
                    <div className="deadline-actions">
                      <span
                        className={`badge ${daysLeft <= 1 ? "badge-overdue" : "badge-deadline"}`}
                      >
                        {daysLeft === 0
                          ? "Due today"
                          : daysLeft === 1
                            ? "Due tomorrow"
                            : `Due in ${daysLeft} days`}
                      </span>
                      {canUpdate ? (
                        <label
                          className="sr-only"
                          htmlFor={`quick-status-${task.id}`}
                        >
                          Change status for {task.title}
                        </label>
                      ) : null}
                      {canUpdate ? (
                        <select
                          id={`quick-status-${task.id}`}
                          className="quick-status"
                          value={task.status}
                          disabled={busyTaskId === task.id}
                          onChange={(event) =>
                            handleQuickStatus(task, event.target.value)
                          }
                        >
                          {STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge st-${task.status}`}>
                          {statusInfo(task.status).label}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity-h">
          <div className="section-heading">
            <div>
              <h2 id="activity-h">Recent activity</h2>
              <p className="muted">The latest changes across your projects.</p>
            </div>
            <span className="section-count">{data.activity.length} events</span>
          </div>
          {data.activity.length === 0 ? (
            <EmptyState title="No activity yet">
              Task changes will appear here.
            </EmptyState>
          ) : (
            <ol className="activity-list">
              {data.activity.map((activity) => {
                const actor = data.activityUsers[activity.actorId];
                return (
                  <li key={activity.id} className="activity-item">
                    <span
                      className={`activity-dot activity-${activity.action}`}
                      aria-hidden="true"
                    />
                    <div className="activity-copy">
                      <p>
                        <strong>
                          {actor?.displayName || actor?.email || "A teammate"}
                        </strong>{" "}
                        {activityVerb(activity)}{" "}
                        <Link
                          href={`/projects/${activity.projectId}`}
                          className="activity-task"
                        >
                          {activity.taskTitle}
                        </Link>
                      </p>
                      <span>
                        {nameFor(activity.projectId)} ·{" "}
                        {activityTime(activity.createdAt)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      {overdue.length > 0 && (
        <section aria-labelledby="over-h" className="overdue-strip">
          <div className="section-heading">
            <div>
              <h2 id="over-h">Overdue tasks</h2>
              <p className="muted">Past-due work that still needs attention.</p>
            </div>
            <span className="section-count">{overdue.length} overdue</span>
          </div>
          <ul className="overdue-list">
            {overdue.slice(0, 5).map((task) => (
              <li key={task.id} className="overdue-row">
                <Link href={`/projects/${task.projectId}`}>{task.title}</Link>
                <span className="meta">
                  {nameFor(task.projectId)} · Due {formatDate(task.dueDate)}
                </span>
                <span className="badge badge-overdue">
                  {priorityInfo(task.priority).label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
