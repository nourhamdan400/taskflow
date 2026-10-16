"use client";
import { useState } from "react";
import { Field } from "./AuthForm";
import { Alert } from "./States";
import { friendlyError } from "@/lib/utils";

/** Shared create/edit form. `onSubmit` receives {name, description}. */
export default function ProjectForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: initial?.name || "", description: initial?.description || "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    const n = form.name.trim().length;
    if (n < 3 || n > 80) e.name = "Project name must be 3–80 characters.";
    if (form.description.length > 1000) e.description = "Description can be at most 1000 characters.";
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
      setFormError(friendlyError(err) + " Your input was not saved — please retry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Alert>{formError}</Alert>
      <Field id="p-name" label="Project name" error={errors.name}>
        <input id="p-name" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "p-name-err" : undefined} />
      </Field>
      <Field id="p-desc" label="Description (optional)" error={errors.description} hint={`${form.description.length}/1000`}>
        <textarea id="p-desc" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <div className="row end">
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>}
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}
