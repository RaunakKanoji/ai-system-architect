import { currentUser } from "@clerk/nextjs/server";

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

export async function getCurrentProjectIdentity(): Promise<ProjectIdentity | null> {
  const user = await currentUser();

  if (!user?.id) {
    return null;
  }

  return {
    userId: user.id,
    // Normalize the primary email to a trimmed, lowercase form to match
    // collaborator email normalization used elsewhere.
    primaryEmail: user.primaryEmailAddress?.emailAddress.trim().toLowerCase() ?? null,
    displayName:
      user.fullName ??
      user.username ??
      user.primaryEmailAddress?.emailAddress ??
      "Project collaborator",
    avatarUrl: user.imageUrl || null,
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
