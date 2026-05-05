"use client";

import { type FormEvent, useMemo, useState } from "react";

export interface MockProject {
  id: string;
  name: string;
  slug: string;
  ownership: "owned" | "shared";
}

type ProjectDialogType = "create" | "rename" | "delete";

interface ProjectDialogState {
  type: ProjectDialogType | null;
  project: MockProject | null;
}

function createSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "new-project"
  );
}

async function submitProjectAction() {
  await Promise.resolve();
}

export function useProjectDialogs() {
  const [dialogState, setDialogState] = useState<ProjectDialogState>({
    type: null,
    project: null,
  });
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const slugPreview = useMemo(() => createSlug(projectName), [projectName]);

  function closeDialog() {
    setDialogState({ type: null, project: null });
    setProjectName("");
    setIsLoading(false);
  }

  function openCreateDialog() {
    setDialogState({ type: "create", project: null });
    setProjectName("");
  }

  function openRenameDialog(project: MockProject) {
    setDialogState({ type: "rename", project });
    setProjectName(project.name);
  }

  function openDeleteDialog(project: MockProject) {
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

    if (dialogState.type === "delete" && !dialogState.project) {
      return;
    }

    setIsLoading(true);

    try {
      await submitProjectAction();
      closeDialog();
    } catch {
      setIsLoading(false);
    }
  }

  return {
    activeDialog: dialogState.type,
    activeProject: dialogState.project,
    isLoading,
    projectName,
    setProjectName,
    slugPreview,
    closeDialog,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    submitDialog,
  };
}
