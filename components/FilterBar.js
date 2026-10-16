"use client";
import { PRIORITIES, STATUSES } from "@/lib/utils";

export const DEFAULT_FILTERS = {
  search: "", status: "", priority: "", assignee: "", overdueOnly: false, sort: "created",
};

export default function FilterBar({ filters, onChange, members }) {
  const set = (k) => (e) =>
    onChange({ ...filters, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const active = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  return (
    <form className="filters" role="search" aria-label="Filter tasks" onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label htmlFor="f-search">Search title</label>
        <input id="f-search" type="search" placeholder="e.g. navbar" value={filters.search} onChange={set("search")} />
      </div>
      <div className="field">
        <label htmlFor="f-status">Status</label>
        <select id="f-status" value={filters.status} onChange={set("status")}>
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-priority">Priority</label>
        <select id="f-priority" value={filters.priority} onChange={set("priority")}>
          <option value="">All</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-assignee">Assignee</label>
        <select id="f-assignee" value={filters.assignee} onChange={set("assignee")}>
          <option value="">Anyone</option>
          <option value="__none__">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.displayName || m.email}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-sort">Sort by</label>
        <select id="f-sort" value={filters.sort} onChange={set("sort")}>
          <option value="created">Newest first</option>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
        </select>
      </div>
      <div className="field field-check">
        <label><input type="checkbox" checked={filters.overdueOnly} onChange={set("overdueOnly")} /> Overdue tasks only</label>
        {active && <button type="button" className="btn btn-link" onClick={() => onChange(DEFAULT_FILTERS)}>Clear filters</button>}
      </div>
    </form>
  );
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/** Pure filtering + sorting; exported so it is easy to unit-test. */
export function applyFilters(tasks, f, isOverdueFn) {
  const q = f.search.trim().toLowerCase();
  const out = tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.assignee === "__none__" && t.assigneeId) return false;
    if (f.assignee && f.assignee !== "__none__" && t.assigneeId !== f.assignee) return false;
    if (f.overdueOnly && !isOverdueFn(t)) return false;
    return true;
  });
  const secs = (t) => t.createdAt?.seconds ?? 0;
  if (f.sort === "due") out.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  else if (f.sort === "priority") out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  else out.sort((a, b) => secs(b) - secs(a));
  return out;
}
