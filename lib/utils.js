export const STATUSES = [
  { value: "todo", label: "To Do", icon: "○" },
  { value: "in_progress", label: "In Progress", icon: "◐" },
  { value: "done", label: "Done", icon: "●" },
];
export const PRIORITIES = [
  { value: "low", label: "Low", icon: "▽" },
  { value: "medium", label: "Medium", icon: "◇" },
  { value: "high", label: "High", icon: "△" },
];

export const statusInfo = (v) =>
  STATUSES.find((s) => s.value === v) || STATUSES[0];
export const priorityInfo = (v) =>
  PRIORITIES.find((p) => p.value === v) || PRIORITIES[1];

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayStr(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Overdue = has due date strictly before today AND not done. */
export function isOverdue(task, today = todayStr()) {
  return (
    Boolean(task.dueDate) && task.dueDate < today && task.status !== "done"
  );
}

/** Consistent date format: 16 Oct 2026 */
export function formatDate(str) {
  if (!str) return "No due date";
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function friendlyError(err) {
  const code = err?.code || "";
  const map = {
    "auth/email-already-in-use": "This email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password is too weak (minimum 6 characters).",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/user-not-found": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Check your connection and retry.",
    "auth/invalid-phone-number":
      "Enter a valid phone number with its country code.",
    "auth/missing-phone-number":
      "Enter a phone number before requesting a code.",
    "auth/captcha-check-failed":
      "Phone verification could not be completed. Please retry.",
    "auth/quota-exceeded":
      "SMS quota exceeded. Try again later or use a Firebase test number.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled in Firebase Authentication.",
    "auth/invalid-verification-code":
      "That verification code is incorrect. Check it and try again.",
    "auth/code-expired":
      "That verification code has expired. Request a new code.",
    "auth/session-expired":
      "This verification session expired. Request a new code.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email. Sign in using its original method.",
    "auth/popup-closed-by-user":
      "The sign-in window was closed before finishing.",
    "auth/popup-blocked":
      "The sign-in window was blocked. Allow pop-ups and try again.",
    "auth/unauthorized-domain":
      "This domain is not authorized for Firebase sign-in.",
    "permission-denied":
      "Access denied. You don't have permission for this action.",
    unavailable: "Network error. Check your connection and retry.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
