import { EditorHomeClient } from "@/components/editor/editor-home-client";
import { getEditorProjects } from "@/lib/project-data";
import { notFound } from "next/navigation";

interface EditorWorkspacePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function EditorWorkspacePage({
  params,
}: EditorWorkspacePageProps) {
  const [{ projectId }, { ownedProjects, sharedProjects }] = await Promise.all([
    params,
    getEditorProjects(),
  ]);

  const hasAccess =
    ownedProjects.some((p) => p.id === projectId) ||
    sharedProjects.some((p) => p.id === projectId);

  if (!hasAccess) {
    notFound();
  }

  return (
    <EditorHomeClient
      activeProjectId={projectId}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  );
}
