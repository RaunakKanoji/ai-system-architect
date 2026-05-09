import { LiveblocksError } from "@liveblocks/node";

import {
  getCursorColorForUser,
  getLiveblocksClient,
  getLiveblocksSecretConfigurationError,
} from "@/lib/liveblocks";
import { apiError } from "@/lib/project-api";
import {
  getAccessibleProject,
  getCurrentProjectIdentity,
} from "@/lib/project-access";

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  const roomId = await readRoomId(request);

  if (roomId instanceof Response) {
    return roomId;
  }

  const project = await getAccessibleProject(roomId, identity);

  if (!project) {
    return apiError(403, "forbidden", "Project access is required.");
  }

  const configurationError = getLiveblocksSecretConfigurationError();

  if (configurationError) {
    console.error(configurationError);

    return apiError(
      503,
      "liveblocks_not_configured",
      "Liveblocks is not configured. Add LIVEBLOCKS_SECRET_KEY to the environment.",
    );
  }

  try {
    const liveblocks = getLiveblocksClient();

    await liveblocks.getOrCreateRoom(roomId, {
      defaultAccesses: [],
      metadata: {
        projectId: project.id,
        projectName: project.name,
      },
    });

    const session = liveblocks.prepareSession(identity.userId, {
      userInfo: {
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        cursorColor: getCursorColorForUser(identity.userId),
      },
    });

    session.allow(roomId, session.FULL_ACCESS);

    const { body, status } = await session.authorize();

    return new Response(body, { status });
  } catch (error) {
    if (error instanceof LiveblocksError) {
      console.error("Liveblocks auth failed", {
        roomId,
        status: error.status,
        message: error.message,
      });

      return apiError(
        error.status,
        "liveblocks_error",
        error.message || "Liveblocks authentication failed.",
      );
    }

    console.error("Liveblocks auth failed", error);

    return apiError(
      500,
      "liveblocks_error",
      "Liveblocks authentication failed.",
    );
  }
}

async function readRoomId(request: Request): Promise<string | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_request", "A JSON request body is required.");
  }

  if (!isRecord(body)) {
    return apiError(400, "invalid_request", "A JSON object is required.");
  }

  const roomId = firstString(body.room, body.roomId, body.projectId);

  if (!roomId) {
    return apiError(400, "invalid_room", "A Liveblocks room ID is required.");
  }

  return roomId;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
