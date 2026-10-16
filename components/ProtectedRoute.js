"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "./Navbar";
import { Loading } from "./States";

/** Wraps private pages: redirects visitors to /login, shows the navbar. */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return <Loading text="Checking your session…" />;
  return (
    <div className="app-shell">
      <Navbar />
      <main id="main" className="main-content">
        {children}
      </main>
    </div>
  );
}
