import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const tasksCol = (projectId) => collection(db, "projects", projectId, "tasks");
const activityCol = (projectId) =>
  collection(db, "projects", projectId, "activity");

export async function listTasks(projectId) {
  const snap = await getDocs(tasksCol(projectId));
  return snap.docs.map((d) => ({ id: d.id, projectId, ...d.data() }));
}

export async function listRecentActivity(projectId, count = 8) {
  const snap = await getDocs(
    query(activityCol(projectId), orderBy("createdAt", "desc"), limit(count)),
  );
  return snap.docs.map((d) => ({ id: d.id, projectId, ...d.data() }));
}

export async function createTask(projectId, uid, data) {
  const taskRef = doc(tasksCol(projectId));
  const batch = writeBatch(db);

  // تحويل وتأكيد الأولوية لتبدأ بحرف صغير لتطابق قواعد الفايرستور (low, medium, high)
  const validPriority = ["low", "medium", "high"].includes(
    data.priority?.toLowerCase(),
  )
    ? data.priority.toLowerCase()
    : "medium";

  batch.set(taskRef, {
    title: data.title.trim(),
    description: (data.description || "").trim(),
    status: "todo",
    priority: validPriority,
    assigneeId: data.assigneeId || null,
    createdBy: uid,
    dueDate: data.dueDate || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(activityCol(projectId)), {
    taskId: taskRef.id,
    taskTitle: data.title.trim(),
    action: "created",
    fromStatus: null,
    toStatus: "todo",
    actorId: uid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return taskRef.id;
}

/** Update full editable field set. */
export async function updateTask(projectId, taskId, data, uid, previousStatus) {
  const batch = writeBatch(db);

  const validPriority = ["low", "medium", "high"].includes(
    data.priority?.toLowerCase(),
  )
    ? data.priority.toLowerCase()
    : "medium";

  const validStatus = ["todo", "in_progress", "done"].includes(
    data.status?.toLowerCase(),
  )
    ? data.status.toLowerCase()
    : "todo";

  batch.update(doc(db, "projects", projectId, "tasks", taskId), {
    title: data.title.trim(),
    description: (data.description || "").trim(),
    status: validStatus,
    priority: validPriority,
    assigneeId: data.assigneeId || null,
    dueDate: data.dueDate || null,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(activityCol(projectId)), {
    taskId,
    taskTitle: data.title.trim(),
    action: previousStatus !== validStatus ? "status_changed" : "updated",
    fromStatus: previousStatus || null,
    toStatus: validStatus,
    actorId: uid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function updateTaskStatus(
  projectId,
  taskId,
  status,
  uid,
  previousStatus,
  taskTitle,
) {
  const batch = writeBatch(db);

  const validStatus = ["todo", "in_progress", "done"].includes(
    status?.toLowerCase(),
  )
    ? status.toLowerCase()
    : "todo";

  batch.update(doc(db, "projects", projectId, "tasks", taskId), {
    status: validStatus,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(activityCol(projectId)), {
    taskId,
    taskTitle,
    action: "status_changed",
    fromStatus: previousStatus || null,
    toStatus: validStatus,
    actorId: uid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function deleteTask(projectId, taskId, uid, taskTitle) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "projects", projectId, "tasks", taskId));
  batch.set(doc(activityCol(projectId)), {
    taskId,
    taskTitle,
    action: "deleted",
    fromStatus: null,
    toStatus: null,
    actorId: uid,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}
