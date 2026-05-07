"use client";

import { type FormEvent, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type {
  ProjectMutationResponse,
  ProjectResponse,
} from "@/lib/project-api";
import type { EditorProject } from "@/lib/project-data";

type ProjectDialogType = "create" | "rename" | "delete";

interface ProjectDialogState {
  type: ProjectDialogType | null;
  project: EditorProject | null;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unified-project"
  );
}

function createShortSuffix() {
  const bytes = new Uint8Array(2);

  if (globalThis.crypto) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 256);
    bytes[1] = Math.floor(Math.random() * 256);
  }

  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 4);
}

async function readProjectResponse(response: Response): Promise<ProjectResponse> {
  if (!response.ok) {
    throw new Error("Project request failed.");
  }

  const data = (await response.json()) as ProjectMutationResponse;

  return data.project;
}

export function createProjectRoomId(name: string) {
  return createRoomId(name, `-${createShortSuffix()}`);
}

export function previewProjectRoomId(name: string) {
  return createRoomId(name, "-xxxx");
}

function createRoomId(name: string, suffix: string) {
  const maxSlugLength = 80 - suffix.length;
  const slug = slugify(name).slice(0, maxSlugLength);

  return `${slug}${suffix}`;
}

export function useProjectActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [dialogState, setDialogState] = useState<ProjectDialogState>({
    type: null,
    project: null,
  });
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomIdPreview = useMemo(
    () => previewProjectRoomId(projectName),
    [projectName],
  );

  function closeDialog() {
    setDialogState({ type: null, project: null });
    setProjectName("");
    setIsLoading(false);
  }

  function openCreateDialog() {
    setDialogState({ type: "create", project: null });
    setProjectName("");
  }

  function openRenameDialog(project: EditorProject) {
    setDialogState({ type: "rename", project });
    setProjectName(project.name);
  }

  function openDeleteDialog(project: EditorProject) {
    setDialogState({ type: "delete", project });
    setProjectName(project.name);
  }

  async function submitDialog(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (
      (dialogState.type === "create" || dialogState.type === "rename") &&
      !projectName.trim()
    ) {
      return;
    }

    if (
      (dialogState.type === "rename" || dialogState.type === "delete") &&
      !dialogState.project
    ) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      if (dialogState.type === "create") {
        const roomId = createProjectRoomId(projectName);
        const project = await readProjectResponse(
          await fetch("/api/projects", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: roomId,
              name: projectName,
            }),
          }),
        );

        closeDialog();
        router.push(`/editor/${project.id}`);
        return;
      }

      if (dialogState.type === "rename" && dialogState.project) {
        await readProjectResponse(
          await fetch(`/api/projects/${dialogState.project.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: projectName,
            }),
          }),
        );

        closeDialog();
        router.refresh();
        return;
      }

      if (dialogState.type === "delete" && dialogState.project) {
        const projectId = dialogState.project.id;
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Project delete failed.");
        }

        closeDialog();

        if (pathname === `/editor/${projectId}`) {
          router.push("/editor");
        } else {
          router.refresh();
        }
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message =
        err instanceof Error ? err.message : String(err ?? "Unknown error");
      setError(`Project action failed: ${message}`);
    }
  }

  return {
    activeDialog: dialogState.type,
    activeProject: dialogState.project,
    isLoading,
    projectName,
    setProjectName,
    roomIdPreview,
    closeDialog,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    submitDialog,
    error,
    clearError: () => setError(null),
  };
}
