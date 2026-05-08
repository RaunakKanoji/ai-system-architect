"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Share2,
} from "lucide-react";
import Link from "next/link";

import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { EditorProject } from "@/lib/project-data";
import { cn } from "@/lib/utils";

interface EditorWorkspaceClientProps {
  canManageAccess: boolean;
  projectName: string;
  roomId: string;
  ownedProjects: readonly EditorProject[];
  sharedProjects: readonly EditorProject[];
}

export function EditorWorkspaceClient({
  canManageAccess,
  projectName,
  roomId,
  ownedProjects,
  sharedProjects,
}: EditorWorkspaceClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const projectActions = useProjectActions();
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;
  const AiSidebarIcon = isAiSidebarOpen ? PanelRightClose : PanelRightOpen;

  return (
    <main className="flex min-h-screen flex-col bg-base text-copy-primary">
      <header className="grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-border bg-surface px-4">
        <div className="flex items-center gap-2">
          <Link
            aria-label="Back to editor"
            className={cn(buttonVariants({ size: "icon-sm", variant: "ghost" }))}
            href="/editor"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Button
            aria-label={isSidebarOpen ? "Close projects" : "Open projects"}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            <SidebarIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-medium text-copy-primary">
            {projectName}
          </p>
          <p className="truncate font-mono text-xs text-copy-muted">{roomId}</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsShareDialogOpen(true)}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => setIsAiSidebarOpen((current) => !current)}
          >
            <AiSidebarIcon className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ProjectSidebar
        activeProjectId={roomId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCreateProject={projectActions.openCreateDialog}
        onDeleteProject={projectActions.openDeleteDialog}
        onRenameProject={projectActions.openRenameDialog}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1",
          isAiSidebarOpen && "lg:grid-cols-[minmax(0,1fr)_20rem]",
        )}
      >
        <section className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-base px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-surface text-brand">
              <PanelLeftOpen className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-xl font-semibold text-copy-primary">
              Canvas workspace
            </h1>
            <p className="mt-2 text-sm leading-6 text-copy-muted">
              Canvas rendering will appear here in a later feature.
            </p>
          </div>
        </section>

        {isAiSidebarOpen ? (
          <aside className="hidden min-h-0 border-l border-surface-border bg-surface/80 p-4 lg:flex lg:flex-col">
            <div className="flex items-center gap-2 border-b border-surface-border pb-4">
              <Bot className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-medium text-copy-primary">
                AI Assistant
              </h2>
            </div>
            <div className="flex flex-1 items-center justify-center px-4 text-center">
              <p className="text-sm leading-6 text-copy-muted">
                AI chat will be wired into this panel later.
              </p>
            </div>
          </aside>
        ) : null}
      </div>

      <ProjectDialogs dialogs={projectActions} />
      <ShareDialog
        canManageAccess={canManageAccess}
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        projectId={roomId}
        projectName={projectName}
      />
    </main>
  );
}
