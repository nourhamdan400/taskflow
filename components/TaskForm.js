"use client";
import { useState } from "react";
import { Field } from "./AuthForm";
import { Alert } from "./States";
import { PRIORITIES, STATUSES, friendlyError } from "@/lib/utils";

/**
 * Create / edit task form.
 * props: members [{id, displayName}], initial (task|null), canChangeStatus, onSubmit, onCancel
 */
export default function TaskForm({ members, initial, canChangeStatus = true, onSubmit, onCancel }) {
  const editing = Boolean(initial);
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    status: initial?.status || "todo",
    priority: initial?.priority || "medium",
    assigneeId: initial?.assigneeId || "",
    dueDate: initial?.dueDate || "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    const t = form.title.trim().length;
    if (t < 3 || t > 120) e.title = "Title must be 3–120 characters.";
    if (form.description.length > 1000) e.description = "Description can be at most 1000 characters.";
    if (form.dueDate && Number.isNaN(Date.parse(form.dueDate))) e.dueDate = "Enter a valid date.";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError("");
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setFormError(friendlyError(err) + " Your changes were not saved — please retry.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="task-form">
      <Alert>{formError}</Alert>
      <Field id="t-title" label="Title" error={errors.title}>
        <input id="t-title" value={form.title} maxLength={120} onChange={set("title")} aria-invalid={!!errors.title} aria-describedby={errors.title ? "t-title-err" : undefined} />
      </Field>
      <Field id="t-desc" label="Description (optional)" error={errors.description} hint={`${form.description.length}/1000`}>
        <textarea id="t-desc" rows={3} value={form.description} onChange={set("description")} />
      </Field>
      <div className="grid-2">
        {editing && (
          <Field id="t-status" label="Status" hint={canChangeStatus ? undefined : "Only the assignee or owner can change status."}>
            <select id="t-status" value={form.status} onChange={set("status")} disabled={!canChangeStatus}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        )}
        <Field id="t-priority" label="Priority">
          <select id="t-priority" value={form.priority} onChange={set("priority")}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field id="t-assignee" label="Assignee">
          <select id="t-assignee" value={form.assigneeId} onChange={set("assigneeId")}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.displayName || m.email}</option>)}
          </select>
        </Field>
        <Field id="t-due" label="Due date" error={errors.dueDate}>
          <input id="t-due" type="date" value={form.dueDate} onChange={set("dueDate")} />
        </Field>
      </div>
      <div className="row end">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create task"}</button>
      </div>
    </form>
  );
}
