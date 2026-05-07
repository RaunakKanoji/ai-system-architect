"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { Button } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { EditorProject } from "@/lib/project-data";

interface EditorHomeClientProps {
  activeProjectId?: string;
  ownedProjects: readonly EditorProject[];
  sharedProjects: readonly EditorProject[];
}

export function EditorHomeClient({
  activeProjectId,
  ownedProjects,
  sharedProjects,
}: EditorHomeClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectActions = useProjectActions();

  return (
    <main className="min-h-screen bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
      />
      <ProjectSidebar
        activeProjectId={activeProjectId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCreateProject={projectActions.openCreateDialog}
        onDeleteProject={projectActions.openDeleteDialog}
        onRenameProject={projectActions.openRenameDialog}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
      />
      <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="text-3xl font-semibold text-copy-primary">
            Create a project or open an existing one
          </h1>
          <p className="mt-3 text-sm leading-6 text-copy-muted">
            Start a new architecture workspace, or choose a project from the
            sidebar
          </p>
          <Button
            className="mt-6"
            type="button"
            onClick={projectActions.openCreateDialog}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </section>
      <ProjectDialogs dialogs={projectActions} />
    </main>
  );
}
