import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export interface EditorProject {
  id: string;
  name: string;
  ownership: "owned" | "shared";
}

export interface EditorProjectLists {
  ownedProjects: EditorProject[];
  sharedProjects: EditorProject[];
}

export async function getEditorProjects(): Promise<EditorProjectLists> {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return { ownedProjects: [], sharedProjects: [] };
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress.toLowerCase();

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
      },
    }),
    primaryEmail
      ? prisma.project.findMany({
          where: {
            ownerId: { not: userId },
            collaborators: {
              some: {
                email: primaryEmail,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    ownedProjects: ownedProjects.map((project) => ({
      ...project,
      ownership: "owned",
    })),
    sharedProjects: sharedProjects.map((project) => ({
      ...project,
      ownership: "shared",
    })),
  };
}
