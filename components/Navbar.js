"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };
  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">
        <span className="brand-mark" aria-hidden="true">
          t
        </span>
        <span>
          taskflow<span className="brand-period">.</span>
        </span>
      </Link>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav aria-label="Main" className="nav-links">
        <Link
          href="/dashboard"
          className={pathname === "/dashboard" ? "active" : ""}
        >
          <span className="nav-icon" aria-hidden="true">
            ⌂
          </span>{" "}
          Dashboard
        </Link>
        <Link
          href="/projects/new"
          className={pathname === "/projects/new" ? "active" : ""}
        >
          <span className="nav-icon nav-plus" aria-hidden="true">
            ＋
          </span>{" "}
          New project
        </Link>
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note">
        <span className="sidebar-note-mark" aria-hidden="true">
          ✳
        </span>
        <span>
          <strong>A little progress</strong>
          <small>adds up every day.</small>
        </span>
      </div>
      <div className="nav-user">
        <span className="avatar" aria-hidden="true">
          {(user?.displayName || user?.email || "T").charAt(0).toUpperCase()}
        </span>
        <span className="user-name" title={user?.email}>
          <strong>{user?.displayName || "My account"}</strong>
          <small>{user?.email}</small>
        </span>
        <button
          className="logout-button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
        >
          ↗
        </button>
      </div>
    </aside>
  );
}
