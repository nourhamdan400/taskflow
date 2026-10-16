export default function DashboardStats({ stats }) {
  const items = [
    { label: "Projects", value: stats.projects },
    { label: "Total tasks", value: stats.total },
    { label: "To Do", value: stats.todo },
    { label: "In Progress", value: stats.in_progress },
    { label: "Done", value: stats.done },
    { label: "Overdue", value: stats.overdue, warn: stats.overdue > 0 },
  ];
  return (
    <section aria-label="Summary" className="stats">
      {items.map((i) => (
        <div key={i.label} className={`card stat ${i.warn ? "stat-warn" : ""}`}>
          <span className="stat-value">{i.value}</span>
          <span className="stat-label">{i.warn && "⚠ "}{i.label}</span>
        </div>
      ))}
    </section>
  );
}
