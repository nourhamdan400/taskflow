"use client";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProjectForm from "@/components/ProjectForm";
import { useAuth } from "@/hooks/useAuth";
import { createProject } from "@/services/projects";

function NewProject() {
  const { user } = useAuth();
  const router = useRouter();
  return (
    <div className="card narrow">
      <h1>Create project</h1>
      <ProjectForm
        submitLabel="Create project"
        onCancel={() => router.push("/dashboard")}
        onSubmit={async (form) => {
          const id = await createProject(user.uid, form);
          router.push(`/projects/${id}`);
        }}
      />
    </div>
  );
}

export default function NewProjectPage() {
  return <ProtectedRoute><NewProject /></ProtectedRoute>;
}
