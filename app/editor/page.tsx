"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import {
  type MockProject,
  useProjectDialogs,
} from "@/components/editor/use-project-dialogs";
import { Button } from "@/components/ui/button";

const mockProjects: readonly MockProject[] = [
  {
    id: "owned-1",
    name: "Payments Platform",
    slug: "payments-platform",
    ownership: "owned",
  },
  {
    id: "owned-2",
    name: "Realtime Chat System",
    slug: "realtime-chat-system",
    ownership: "owned",
  },
  {
    id: "shared-1",
    name: "Analytics Pipeline",
    slug: "analytics-pipeline",
    ownership: "shared",
  },
];

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectDialogs = useProjectDialogs();

  return (
    <main className="min-h-screen bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCreateProject={projectDialogs.openCreateDialog}
        onDeleteProject={projectDialogs.openDeleteDialog}
        onRenameProject={projectDialogs.openRenameDialog}
        projects={mockProjects}
      />
      <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="text-3xl font-semibold text-copy-primary">
            Create a project or open an existing one
          </h1>
          <p className="mt-3 text-sm leading-6 text-copy-muted">
            Start a new arachitecture workspace, or choose a project from the
            sidebar
          </p>
          <Button
            className="mt-6"
            type="button"
            onClick={projectDialogs.openCreateDialog}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </section>
      <ProjectDialogs dialogs={projectDialogs} />
    </main>
  );
}
