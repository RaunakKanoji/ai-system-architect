import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { ProjectIdentity } from "@/lib/project-access";

export interface CollaboratorResponse {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface CollaboratorListResponse {
  collaborators: CollaboratorResponse[];
  canManageAccess: boolean;
}

export function normalizeCollaboratorEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidCollaboratorEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function getProjectAccessRole(
  projectId: string,
  identity: ProjectIdentity,
): Promise<"owner" | "collaborator" | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
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
      ],
    },
    select: {
      ownerId: true,
    },
  });

  if (!project) {
    return null;
  }

  return project.ownerId === identity.userId ? "owner" : "collaborator";
}

export async function listProjectCollaborators(
  projectId: string,
): Promise<CollaboratorResponse[]> {
  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: {
      email: true,
      createdAt: true,
    },
  });

  return enrichCollaborators(collaborators);
}

async function enrichCollaborators(
  collaborators: Array<{ email: string; createdAt: Date }>,
): Promise<CollaboratorResponse[]> {
  if (collaborators.length === 0) {
    return [];
  }

  const emails = collaborators.map((collaborator) => collaborator.email);
  const usersByEmail = new Map<
    string,
    { displayName: string; avatarUrl: string | null }
  >();

  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      emailAddress: emails,
      limit: emails.length,
    });

    for (const user of users.data) {
      const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username ||
        "";

      for (const emailAddress of user.emailAddresses) {
        const email = normalizeCollaboratorEmail(emailAddress.emailAddress);

        if (emails.includes(email)) {
          usersByEmail.set(email, {
            displayName: displayName || email,
            avatarUrl: user.imageUrl || null,
          });
        }
      }
    }
  } catch {
    // Fall back to email-only collaborator rows if Clerk enrichment fails.
  }

  return collaborators.map((collaborator) => {
    const enriched = usersByEmail.get(collaborator.email);

    return {
      email: collaborator.email,
      displayName: enriched?.displayName ?? collaborator.email,
      avatarUrl: enriched?.avatarUrl ?? null,
      createdAt: collaborator.createdAt.toISOString(),
    };
  });
}
