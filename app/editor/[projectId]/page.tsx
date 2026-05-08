import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspaceClient } from "@/components/editor/editor-workspace-client";
import { getSignInPath } from "@/lib/auth-paths";
import {
  getAccessibleProject,
  getCurrentProjectIdentity,
} from "@/lib/project-access";
import { getEditorProjects } from "@/lib/project-data";

interface EditorWorkspacePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function EditorWorkspacePage({
  params,
}: EditorWorkspacePageProps) {
  const [{ projectId }, identity] = await Promise.all([
    params,
    getCurrentProjectIdentity(),
  ]);

  if (!identity) {
    redirect(getSignInPath());
  }

  const [project, { ownedProjects, sharedProjects }] = await Promise.all([
    getAccessibleProject(projectId, identity),
    getEditorProjects(),
  ]);

  if (!project) {
    return <AccessDenied />;
  }

  return (
    <EditorWorkspaceClient
      canManageAccess={project.ownerId === identity.userId}
      projectName={project.name}
      roomId={projectId}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  );
}
