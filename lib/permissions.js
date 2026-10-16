// UI-level mirrors of the Firestore rules (rules are the real enforcement).
export const isOwner = (project, uid) => project?.ownerId === uid;
export const canEditTask = (task, project, uid) =>
  isOwner(project, uid) || task.assigneeId === uid || task.createdBy === uid;
export const canChangeStatus = (task, project, uid) =>
  isOwner(project, uid) || task.assigneeId === uid;
export const canDeleteTask = (task, project, uid) =>
  isOwner(project, uid) || task.createdBy === uid;
