// Seeds fictional demo data (Appendix A of the SRS) using the normal client SDK + security rules.
// Usage: copy .env.example -> .env.local, fill it in, then `npm run seed`.
import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { addDoc, arrayUnion, collection, doc, getFirestore, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app); const db = getFirestore(app);
const PASSWORD = "Demo1234!";

async function ensureUser(name, email) {
  try {
    const c = await createUserWithEmailAndPassword(auth, email, PASSWORD);
    await updateProfile(c.user, { displayName: name });
    await setDoc(doc(db, "users", c.user.uid), { displayName: name, email, createdAt: serverTimestamp() });
    return c.user.uid;
  } catch (e) {
    if (e.code !== "auth/email-already-in-use") throw e;
    return (await signInWithEmailAndPassword(auth, email, PASSWORD)).user.uid;
  }
}
const ymd = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toLocaleDateString("en-CA"); };

const memberUid = await ensureUser("Demo Member", "member@example.test");
const ownerUid = await ensureUser("Demo Owner", "owner@example.test"); // leaves owner signed in

const p = await addDoc(collection(db, "projects"), {
  name: "Website Redesign", description: "Fictional demo project.", ownerId: ownerUid,
  memberIds: [ownerUid], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
});
await updateDoc(doc(db, "projects", p.id), { memberIds: arrayUnion(memberUid), updatedAt: serverTimestamp() });

const tasks = [
  ["Build navbar", "in_progress", "high", memberUid, ymd(5)],
  ["Create login page", "todo", "medium", ownerUid, ymd(10)],
  ["Test responsive layout", "done", "low", memberUid, null],
  ["Fix overdue bug", "todo", "high", null, ymd(-1)],
];
for (const [title, status, priority, assigneeId, dueDate] of tasks) {
  // rules require initial status "todo"; create then update to the target status
  const t = await addDoc(collection(db, "projects", p.id, "tasks"), {
    title, description: "", status: "todo", priority, assigneeId, createdBy: ownerUid, dueDate,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  if (status !== "todo") await updateDoc(doc(db, "projects", p.id, "tasks", t.id), { status, updatedAt: serverTimestamp() });
}
console.log(`Seeded. Log in with owner@example.test / member@example.test, password: ${PASSWORD}`);
process.exit(0);
