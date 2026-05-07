import { auth } from "@clerk/nextjs/server";

import { type ProjectModel } from "@/app/generated/prisma/models/Project";

export const DEFAULT_PROJECT_NAME = "Unified Project";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export interface ProjectResponse {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  status: ProjectModel["status"];
  canvasJSONPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
}

export interface ProjectMutationResponse {
  project: ProjectResponse;
}

interface ProjectBody {
  id?: string;
  name: string;
}

export function apiError(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, {
    status,
  });
}

export async function requireUserId(): Promise<string | Response> {
  const { userId } = await auth();

  if (!userId) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  return userId;
}

export async function readProjectName(
  request: Request,
  options: { defaultMissing: boolean },
): Promise<string | Response> {
  const body = await readJsonBody(request, options);

  if (body instanceof Response) {
    return body;
  }

  return parseProjectName(body, options);
}

export async function readProjectBody(
  request: Request,
): Promise<ProjectBody | Response> {
  const body = await readJsonBody(request, { defaultMissing: true });

  if (body instanceof Response) {
    return body;
  }

  const name = parseProjectName(body, { defaultMissing: true });

  if (name instanceof Response) {
    return name;
  }

  const id = parseProjectId(body);

  if (id instanceof Response) {
    return id;
  }

  return id ? { id, name } : { name };
}

export function serializeProject(project: ProjectModel): ProjectResponse {
  return {
    id: project.id,
    ownerId: project.ownerId,
    name: project.name,
    description: project.description,
    status: project.status,
    canvasJSONPath: project.canvasJSONPath,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

async function readJsonBody(
  request: Request,
  options: { defaultMissing: boolean },
): Promise<unknown | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    if (options.defaultMissing) {
      return DEFAULT_PROJECT_NAME;
    }

    return apiError(400, "invalid_request", "A JSON request body is required.");
  }

  return body;
}

function parseProjectName(
  body: unknown,
  options: { defaultMissing: boolean },
): string | Response {
  if (!isRecord(body) || !("name" in body) || body.name === undefined) {
    if (options.defaultMissing) {
      return DEFAULT_PROJECT_NAME;
    }

    return apiError(400, "invalid_name", "Project name is required.");
  }

  if (typeof body.name !== "string") {
    return apiError(400, "invalid_name", "Project name must be a string.");
  }

  const name = body.name.trim();

  if (!name) {
    if (options.defaultMissing) {
      return DEFAULT_PROJECT_NAME;
    }

    return apiError(400, "invalid_name", "Project name is required.");
  }

  return name;
}

function parseProjectId(body: unknown): string | Response | null {
  if (!isRecord(body) || !("id" in body) || body.id === undefined) {
    return null;
  }

  if (typeof body.id !== "string") {
    return apiError(400, "invalid_id", "Project id must be a string.");
  }

  const id = body.id.trim();

  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(id)) {
    return apiError(400, "invalid_id", "Project id is invalid.");
  }

  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
