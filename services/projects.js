import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs,
  query, serverTimestamp, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createProject(ownerId, { name, description }) {
  const ref = await addDoc(collection(db, "projects"), {
    name: name.trim(),
    description: (description || "").trim(),
    ownerId,
    memberIds: [ownerId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyProjects(uid) {
  const snap = await getDocs(query(collection(db, "projects"), where("memberIds", "array-contains", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Returns project, or null if it does not exist. Throws permission-denied if not a member. */
export async function getProject(id) {
  const snap = await getDoc(doc(db, "projects", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateProject(id, { name, description }) {
  await updateDoc(doc(db, "projects", id), {
    name: name.trim(),
    description: (description || "").trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function addMember(projectId, uid) {
  await updateDoc(doc(db, "projects", projectId), {
    memberIds: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
}

/** Revoke access and unassign the removed member's tasks (owner only). */
export async function removeMember(projectId, uid) {
  const tasksSnap = await getDocs(
    query(collection(db, "projects", projectId, "tasks"), where("assigneeId", "==", uid))
  );
  const batch = writeBatch(db);
  tasksSnap.forEach((t) => batch.update(t.ref, { assigneeId: null, updatedAt: serverTimestamp() }));
  batch.update(doc(db, "projects", projectId), {
    memberIds: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/**
 * Firestore does not cascade-delete subcollections, so we delete all tasks first
 * (in batches of 400) and then the project document. If it fails midway the
 * project still exists and the owner can retry.
 */
export async function deleteProject(projectId) {
  const tasksSnap = await getDocs(collection(db, "projects", projectId, "tasks"));
  const refs = tasksSnap.docs.map((d) => d.ref);
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
  await deleteDoc(doc(db, "projects", projectId));
}
