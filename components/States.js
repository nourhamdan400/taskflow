import Link from "next/link";

export function Loading({ text = "Loading…" }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="state empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="state error" role="alert">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      <div className="row center">
        {onRetry && <button className="btn" onClick={onRetry}>Retry</button>}
        <Link className="btn btn-secondary" href="/dashboard">Back to dashboard</Link>
      </div>
    </div>
  );
}

export function Alert({ children, kind = "error" }) {
  if (!children) return null;
  return <div className={`alert alert-${kind}`} role="alert">{children}</div>;
}
