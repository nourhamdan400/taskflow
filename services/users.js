import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, limit, getDocs, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createUserProfile(uid, displayName, email) {
  await setDoc(doc(db, "users", uid), {
    displayName,
    email: email.toLowerCase(),
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function findUserByEmail(email) {
  const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/** Load profiles for a list of UIDs (Firestore `in` supports 30 ids per query). */
export async function getUsersByIds(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", chunk)));
    snap.forEach((d) => (out[d.id] = { id: d.id, ...d.data() }));
  }
  return out;
}
