import Link from "next/link";

export default function ProjectCard({ project, isOwner, taskCount }) {
  return (
    <Link href={`/projects/${project.id}`} className="card project-card">
      <div className="row between">
        <h3>{project.name}</h3>
        <span className={`badge ${isOwner ? "badge-owner" : ""}`}>{isOwner ? "Owner" : "Member"}</span>
      </div>
      <p className="muted clamp">{project.description || "No description"}</p>
      <p className="meta">
        {project.memberIds.length} member{project.memberIds.length !== 1 ? "s" : ""}
        {typeof taskCount === "number" && <> · {taskCount} task{taskCount !== 1 ? "s" : ""}</>}
      </p>
    </Link>
  );
}
