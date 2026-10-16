"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  updateProfile,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getUserProfile } from "@/services/users";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const register = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await createUserProfile(cred.user.uid, name, email);
    setUser({ ...cred.user, displayName: name });
    return cred.user;
  };
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);
  const ensureUserProfile = async (user) => {
    if (!user.email || (await getUserProfile(user.uid))) return;
    const displayName = user.displayName || user.email.split("@")[0];
    await createUserProfile(user.uid, displayName, user.email);
  };
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await ensureUserProfile(result.user);
    return result;
  };
  const loginWithFacebook = async () => {
    const provider = new FacebookAuthProvider();
    provider.addScope("email");
    const result = await signInWithPopup(auth, provider);
    await ensureUserProfile(result.user);
    return result;
  };
  const sendPhoneCode = (phoneNumber, verifier) =>
    signInWithPhoneNumber(auth, phoneNumber, verifier);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        loginWithGoogle,
        loginWithFacebook,
        sendPhoneCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
