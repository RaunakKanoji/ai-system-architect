import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export interface ProjectIdentity {
  userId: string;
  primaryEmail: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export interface AccessibleProject {
  id: string;
  name: string;
  ownerId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmedValue = value.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  return null;
}

function combineName(firstName: unknown, lastName: unknown): string | null {
  const nameParts = [firstName, lastName].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return firstNonEmptyString(nameParts.join(" "));
}

export async function getCurrentProjectIdentity(): Promise<ProjectIdentity | null> {
  const authState = await auth();

  if (!authState.userId) {
    return null;
  }

  const sessionClaims: Record<string, unknown> = isRecord(authState.sessionClaims)
    ? authState.sessionClaims
    : {};
  let primaryEmail = firstNonEmptyString(
    sessionClaims.email,
    sessionClaims.primary_email_address,
    sessionClaims.primaryEmailAddress,
    sessionClaims.email_address,
  )?.toLowerCase() ?? null;
  let displayName =
    firstNonEmptyString(
      sessionClaims.full_name,
      sessionClaims.name,
      combineName(sessionClaims.first_name, sessionClaims.last_name),
      sessionClaims.username,
      primaryEmail,
    ) ?? "Project collaborator";
  let avatarUrl = firstNonEmptyString(
    sessionClaims.image_url,
    sessionClaims.picture,
    sessionClaims.avatar_url,
  );

  if (!primaryEmail || displayName === "Project collaborator") {
    try {
      const user = await currentUser();

      if (user?.id === authState.userId) {
        primaryEmail ??= user.primaryEmailAddress?.emailAddress.trim().toLowerCase() ?? null;
        displayName =
          displayName === "Project collaborator"
            ? (user.fullName ??
              user.username ??
              user.primaryEmailAddress?.emailAddress ??
              displayName)
            : displayName;
        avatarUrl ??= user.imageUrl || null;
      }
    } catch (error) {
      console.warn("Clerk currentUser fallback failed while resolving project identity.", error);
    }
  }

  return {
    userId: authState.userId,
    // Normalize the primary email to a trimmed, lowercase form to match
    // collaborator email normalization used elsewhere.
    primaryEmail,
    displayName,
    avatarUrl,
  };
}

export async function getAccessibleProject(
  roomId: string,
  identity: ProjectIdentity,
): Promise<AccessibleProject | null> {
  const accessConditions = [
    { ownerId: identity.userId },
    ...(identity.primaryEmail
      ? [
          {
            collaborators: {
              some: {
                email: identity.primaryEmail,
              },
            },
          },
        ]
      : []),
  ];

  const project = await prisma.project.findFirst({
    where: {
      id: roomId,
      OR: accessConditions,
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  return project;
}
