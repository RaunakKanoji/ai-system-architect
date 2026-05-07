import { prisma } from "@/lib/prisma";
import {
  apiError,
  type ProjectMutationResponse,
  readProjectName,
  requireUserId,
  serializeProject,
} from "@/lib/project-api";

interface ProjectRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export async function PATCH(request: Request, context: ProjectRouteContext) {
  const userId = await requireUserId();

  if (userId instanceof Response) {
    return userId;
  }

  const name = await readProjectName(request, { defaultMissing: false });

  if (name instanceof Response) {
    return name;
  }

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return apiError(404, "not_found", "Project not found.");
  }

  if (project.ownerId !== userId) {
    return apiError(403, "forbidden", "Only the project owner can rename.");
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  });

  return Response.json({
    project: serializeProject(updatedProject),
  } satisfies ProjectMutationResponse);
}

export async function DELETE(_request: Request, context: ProjectRouteContext) {
  const userId = await requireUserId();

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return apiError(404, "not_found", "Project not found.");
  }

  if (project.ownerId !== userId) {
    return apiError(403, "forbidden", "Only the project owner can delete.");
  }

  if (!project || project.ownerId !== userId) {
    return apiError(403, "forbidden", "Only the project owner can delete.");
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  return new Response(null, { status: 204 });
}
