import { del, get, put } from "@vercel/blob";

import {
  type CanvasSaveResponse,
  type CanvasSnapshotResponse,
  isCanvasSnapshot,
} from "@/lib/canvas-snapshot";
import { prisma } from "@/lib/prisma";
import { getCurrentProjectIdentity } from "@/lib/project-access";
import { apiError } from "@/lib/project-api";
import { getProjectAccessRole } from "@/lib/project-collaborators";

interface CanvasRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

function getPrismaErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

export async function GET(_request: Request, context: CanvasRouteContext) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  const { projectId } = await context.params;
  const accessRole = await getProjectAccessRole(projectId, identity);

  if (!accessRole) {
    return apiError(403, "forbidden", "You do not have access to this project.");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { canvasJSONPath: true },
  });

  if (!project) {
    return apiError(404, "not_found", "Project not found.");
  }

  if (!project.canvasJSONPath) {
    return Response.json({ canvas: null } satisfies CanvasSnapshotResponse);
  }

  let canvas: unknown;

  try {
    const blob = await get(project.canvasJSONPath, {
      access: "private",
      useCache: false,
    });

    if (!blob || blob.statusCode !== 200) {
      return apiError(
        502,
        "canvas_fetch_failed",
        "Saved canvas could not be loaded.",
      );
    }

    canvas = await new Response(blob.stream).json();
  } catch (error: unknown) {
    console.error("Saved canvas blob read failed", error);
    return apiError(
      502,
      "canvas_fetch_failed",
      "Saved canvas could not be loaded.",
    );
  }

  if (!isCanvasSnapshot(canvas)) {
    return apiError(502, "invalid_canvas", "Saved canvas data is invalid.");
  }

  return Response.json({ canvas } satisfies CanvasSnapshotResponse);
}

export async function PUT(request: Request, context: CanvasRouteContext) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  const { projectId } = await context.params;
  const accessRole = await getProjectAccessRole(projectId, identity);

  if (!accessRole) {
    return apiError(403, "forbidden", "You do not have access to this project.");
  }

  if (accessRole !== "owner") {
    return apiError(
      403,
      "forbidden",
      "Only the project owner can save canvas snapshots.",
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_request", "A JSON request body is required.");
  }

  if (!isCanvasSnapshot(body)) {
    return apiError(400, "invalid_canvas", "Canvas nodes and edges are required.");
  }

  let blob;

  try {
    blob = await put(`canvas/${projectId}.json`, JSON.stringify(body), {
      access: "private",
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: "application/json",
    });
  } catch (error: unknown) {
    console.error("Canvas blob upload failed", error);
    return apiError(
      502,
      "canvas_upload_failed",
      "Canvas could not be saved to Blob storage.",
    );
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { canvasJSONPath: blob.url },
    });
  } catch (error: unknown) {
    console.error("Canvas database update failed after blob upload", error);

    try {
      await del(blob.url);
    } catch (cleanupError: unknown) {
      console.error("Canvas blob cleanup failed after database update error", {
        cleanupError,
        url: blob.url,
      });
    }

    if (getPrismaErrorCode(error) === "P2025") {
      return apiError(404, "project_not_found", "Project not found.");
    }

    return apiError(
      409,
      "canvas_update_failed",
      "Canvas was uploaded but could not be linked to the project.",
    );
  }

  return Response.json({
    canvasJSONPath: blob.url,
  } satisfies CanvasSaveResponse);
}
