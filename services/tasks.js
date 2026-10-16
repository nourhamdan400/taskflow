import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const tasksCol = (projectId) => collection(db, "projects", projectId, "tasks");

export async function listTasks(projectId) {
  const snap = await getDocs(tasksCol(projectId));
  return snap.docs.map((d) => ({ id: d.id, projectId, ...d.data() }));
}

export async function createTask(projectId, uid, data) {
  const ref = await addDoc(tasksCol(projectId), {
    title: data.title.trim(),
    description: (data.description || "").trim(),
    status: "todo",
    priority: data.priority,
    assigneeId: data.assigneeId || null,
    createdBy: uid,
    dueDate: data.dueDate || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update full editable field set. */
export async function updateTask(projectId, taskId, data) {
  await updateDoc(doc(db, "projects", projectId, "tasks", taskId), {
    title: data.title.trim(),
    description: (data.description || "").trim(),
    status: data.status,
    priority: data.priority,
    assigneeId: data.assigneeId || null,
    dueDate: data.dueDate || null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateTaskStatus(projectId, taskId, status) {
  await updateDoc(doc(db, "projects", projectId, "tasks", taskId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(projectId, taskId) {
  await deleteDoc(doc(db, "projects", projectId, "tasks", taskId));
}
