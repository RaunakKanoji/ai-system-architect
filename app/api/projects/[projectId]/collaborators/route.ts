import { prisma } from "@/lib/prisma";
import {
  type CollaboratorListResponse,
  getProjectAccessRole,
  isValidCollaboratorEmail,
  listProjectCollaborators,
  normalizeCollaboratorEmail,
} from "@/lib/project-collaborators";
import { apiError } from "@/lib/project-api";
import { getCurrentProjectIdentity } from "@/lib/project-access";

interface CollaboratorRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export async function GET(_request: Request, context: CollaboratorRouteContext) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  const { projectId } = await context.params;
  const accessRole = await getProjectAccessRole(projectId, identity);

  if (!accessRole) {
    return apiError(403, "forbidden", "You do not have access to this project.");
  }

  const collaborators = await listProjectCollaborators(projectId);

  return Response.json({
    collaborators,
    canManageAccess: accessRole === "owner",
  } satisfies CollaboratorListResponse);
}

export async function POST(request: Request, context: CollaboratorRouteContext) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  const { projectId } = await context.params;
  const accessRole = await getProjectAccessRole(projectId, identity);

  if (accessRole !== "owner") {
    return apiError(403, "forbidden", "Only the project owner can invite.");
  }

  const email = await readCollaboratorEmail(request);

  if (email instanceof Response) {
    return email;
  }

  if (email === identity.primaryEmail) {
    return apiError(400, "invalid_email", "Project owners cannot invite themselves.");
  }

  const existingCollaborator = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_email: {
        projectId,
        email,
      },
    },
  });

  if (!existingCollaborator) {
    await prisma.projectCollaborator.create({
      data: {
        projectId,
        email,
      },
    });
  }

  const collaborators = await listProjectCollaborators(projectId);

  return Response.json({
    collaborators,
    canManageAccess: true,
  } satisfies CollaboratorListResponse);
}

export async function DELETE(request: Request, context: CollaboratorRouteContext) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  const { projectId } = await context.params;
  const accessRole = await getProjectAccessRole(projectId, identity);

  if (accessRole !== "owner") {
    return apiError(403, "forbidden", "Only the project owner can remove collaborators.");
  }

  const email = await readCollaboratorEmail(request);

  if (email instanceof Response) {
    return email;
  }

  await prisma.projectCollaborator.deleteMany({
    where: {
      projectId,
      email,
    },
  });

  const collaborators = await listProjectCollaborators(projectId);

  return Response.json({
    collaborators,
    canManageAccess: true,
  } satisfies CollaboratorListResponse);
}

async function readCollaboratorEmail(request: Request): Promise<string | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_request", "A JSON request body is required.");
  }

  if (!isRecord(body) || typeof body.email !== "string") {
    return apiError(400, "invalid_email", "Collaborator email is required.");
  }

  const email = normalizeCollaboratorEmail(body.email);

  if (!isValidCollaboratorEmail(email)) {
    return apiError(400, "invalid_email", "Collaborator email is invalid.");
  }

  return email;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
