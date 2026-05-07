import { prisma } from "@/lib/prisma";
import {
  type ProjectListResponse,
  type ProjectMutationResponse,
  readProjectBody,
  requireUserId,
  serializeProject,
} from "@/lib/project-api";

export async function GET() {
  const userId = await requireUserId();

  if (userId instanceof Response) {
    return userId;
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json({
    projects: projects.map(serializeProject),
  } satisfies ProjectListResponse);
}

export async function POST(request: Request) {
  const userId = await requireUserId();

  if (userId instanceof Response) {
    return userId;
  }

  const projectBody = await readProjectBody(request);

  if (projectBody instanceof Response) {
    return projectBody;
  }

  const project = await prisma.project.create({
    data: {
      ...projectBody,
      ownerId: userId,
    },
  });

  return Response.json(
    { project: serializeProject(project) } satisfies ProjectMutationResponse,
    { status: 201 },
  );
}
