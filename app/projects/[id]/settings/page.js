"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProjectForm from "@/components/ProjectForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Alert, ErrorState, Loading } from "@/components/States";
import { Field } from "@/components/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { addMember, deleteProject, getProject, removeMember, updateProject } from "@/services/projects";
import { findUserByEmail, getUsersByIds } from "@/services/users";
import { friendlyError } from "@/lib/utils";

function Settings() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState({});
  const [state, setState] = useState("loading");
  const [email, setEmail] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberOk, setMemberOk] = useState("");
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(null); // {type:"member", uid} | {type:"project"}
  const [busy, setBusy] = useState(false);
  const [dangerError, setDangerError] = useState("");

  const load = useCallback(async () => {
    try {
      const p = await getProject(id);
      if (!p) return setState("notfound");
      setProject(p);
      setUsers(await getUsersByIds(p.memberIds));
      setState(p.ownerId === user.uid ? "ready" : "forbidden");
    } catch (err) {
      setState(err?.code === "permission-denied" ? "denied" : "error");
    }
  }, [id, user.uid]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <Loading />;
  if (state === "notfound") return <ErrorState title="Project not found" />;
  if (state === "denied") return <ErrorState title="Access denied" message="You are not a member of this project." />;
  if (state === "forbidden") return <ErrorState title="Owner only" message="Only the project owner can open settings." />;
  if (state === "error") return <ErrorState message="Could not load the project." onRetry={load} />;

  const onAdd = async (e) => {
    e.preventDefault();
    setMemberError(""); setMemberOk("");
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setMemberError("Enter a valid email address.");
    setAdding(true);
    try {
      const found = await findUserByEmail(em);
      if (!found) setMemberError("No registered user with that email.");
      else if (project.memberIds.includes(found.id)) setMemberError("This user is already a member.");
      else {
        await addMember(id, found.id);
        setMemberOk(`${found.displayName} was added.`);
        setEmail("");
        await load();
      }
    } catch (err) {
      setMemberError(friendlyError(err));
    } finally { setAdding(false); }
  };

  const onConfirm = async () => {
    setBusy(true); setDangerError("");
    try {
      if (confirm.type === "member") {
        await removeMember(id, confirm.uid);
        setConfirm(null);
        await load();
      } else {
        await deleteProject(id);
        router.replace("/dashboard");
      }
    } catch (err) {
      setDangerError(friendlyError(err) + " Please retry.");
      setConfirm(null);
    } finally { setBusy(false); }
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="crumbs"><Link href={`/projects/${id}`}>← Back to project</Link></nav>
      <h1>Project settings</h1>

      <section className="card" aria-labelledby="gen-h">
        <h2 id="gen-h">General</h2>
        <Alert kind="success">{saved ? "Project updated." : ""}</Alert>
        <ProjectForm
          initial={project}
          submitLabel="Save changes"
          onSubmit={async (form) => {
            await updateProject(id, form);
            setSaved(true);
            await load();
          }}
        />
      </section>

      <section className="card" aria-labelledby="mem-h">
        <h2 id="mem-h">Members</h2>
        <ul className="member-list">
          {project.memberIds.map((uid) => (
            <li key={uid} className="row between">
              <span>{users[uid]?.displayName || "Unknown user"} <span className="muted">{users[uid]?.email}</span></span>
              {uid === project.ownerId
                ? <span className="badge badge-owner">Owner</span>
                : <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ type: "member", uid })}>Remove</button>}
            </li>
          ))}
        </ul>
        <form onSubmit={onAdd} noValidate className="row-form">
          <Field id="m-email" label="Add member by email" error={memberError}>
            <input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
          </Field>
          <button className="btn" type="submit" disabled={adding}>{adding ? "Adding…" : "Add member"}</button>
        </form>
        <Alert kind="success">{memberOk}</Alert>
      </section>

      <section className="card danger-zone" aria-labelledby="dz-h">
        <h2 id="dz-h">Danger zone</h2>
        <p className="muted">Deleting the project also deletes all of its tasks. This cannot be undone.</p>
        <Alert>{dangerError}</Alert>
        <button className="btn btn-danger" onClick={() => setConfirm({ type: "project" })}>Delete project</button>
      </section>

      <ConfirmDialog
        open={Boolean(confirm)} busy={busy}
        title={confirm?.type === "member" ? "Remove member?" : "Delete project?"}
        message={confirm?.type === "member"
          ? "They will lose access immediately and their tasks will become unassigned."
          : `“${project.name}” and all its tasks will be permanently deleted.`}
        confirmLabel={confirm?.type === "member" ? "Remove" : "Delete project"}
        onConfirm={onConfirm} onCancel={() => setConfirm(null)}
      />
    </>
  );
}

export default function SettingsPage() {
  return <ProtectedRoute><Settings /></ProtectedRoute>;
}
